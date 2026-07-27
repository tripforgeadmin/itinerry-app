import { SignJWT, jwtVerify } from "jose";
import { supabase } from "../supabase";
import { sha256, randomToken } from "./crypto";
import { appOrigin, mcpResource } from "./clients";

/**
 * MCP access tokens (1-hour JWTs, MCP_JWT_SECRET — fully separate from the admin
 * secret) + revocable rotating refresh tokens (30 days, stored as SHA-256 hashes).
 * Revocation model: short access life + the MCP auth layer re-checks
 * admin_member.active on every request, so deactivating a member cuts access
 * within one call and refresh is blocked here.
 */

function getMcpSecret(): Uint8Array {
  const s = process.env.MCP_JWT_SECRET;
  if (!s) throw new Error("MCP_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export interface McpTokenClaims {
  memberId: string;
  memberName: string;
  clientId: string;
  jti: string;
}

export async function signAccessToken(member: { id: string; name: string }, clientId: string): Promise<string> {
  return new SignJWT({ name: member.name, client_id: clientId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(member.id)
    .setJti(randomToken(16))
    .setIssuer(appOrigin())
    .setAudience(mcpResource())
    .setExpirationTime("1h")
    .sign(getMcpSecret());
}

export async function verifyAccessToken(token: string): Promise<McpTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getMcpSecret(), {
      issuer: appOrigin(),
      audience: mcpResource(),
    });
    if (!payload.sub) return null;
    return {
      memberId: payload.sub,
      memberName: (payload.name as string) ?? "",
      clientId: (payload.client_id as string) ?? "",
      jti: (payload.jti as string) ?? "",
    };
  } catch {
    return null;
  }
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function issueRefreshToken(memberId: string, clientId: string): Promise<string> {
  const token = randomToken(32);
  await supabase.from("oauth_refresh_token").insert({
    token_hash: sha256(token),
    member_id: memberId,
    client_id: clientId,
    expires_at: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
  });
  return token;
}

export type RefreshResult =
  | { ok: true; memberId: string; clientId: string; newToken: string }
  | { ok: false; error: string };

/** Rotate on every use. Reuse of an already-rotated token ⇒ revoke the whole chain. */
export async function rotateRefreshToken(token: string): Promise<RefreshResult> {
  const hash = sha256(token);
  const { data: row } = await supabase
    .from("oauth_refresh_token")
    .select("*")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!row) return { ok: false, error: "invalid refresh token" };

  if (row.revoked_at || row.replaced_by) {
    // Reuse of a rotated/revoked token — assume theft, kill the member's chain for this client.
    await supabase
      .from("oauth_refresh_token")
      .update({ revoked_at: new Date().toISOString() })
      .eq("member_id", row.member_id)
      .eq("client_id", row.client_id)
      .is("revoked_at", null);
    return { ok: false, error: "refresh token reuse detected" };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "refresh token expired" };
  }

  const { data: member } = await supabase
    .from("admin_member")
    .select("id, active")
    .eq("id", row.member_id)
    .maybeSingle();
  if (!member || !member.active) return { ok: false, error: "member inactive" };

  const newToken = randomToken(32);
  await supabase.from("oauth_refresh_token").insert({
    token_hash: sha256(newToken),
    member_id: row.member_id,
    client_id: row.client_id,
    expires_at: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
  });
  await supabase
    .from("oauth_refresh_token")
    .update({ revoked_at: new Date().toISOString(), replaced_by: sha256(newToken), last_used_at: new Date().toISOString() })
    .eq("token_hash", hash);

  return { ok: true, memberId: row.member_id, clientId: row.client_id, newToken };
}
