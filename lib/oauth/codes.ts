import { supabase } from "../supabase";
import { sha256, randomToken, verifyPkce } from "./crypto";

/**
 * Authorization codes: 5-minute TTL, single-use, stored as SHA-256 hashes,
 * bound to client + redirect_uri + PKCE challenge. OAuth 2.1: a reused code
 * means the code leaked — the caller should treat it as an attack.
 */

const CODE_TTL_MS = 5 * 60 * 1000;

export async function issueCode(params: {
  clientId: string;
  memberId: string;
  codeChallenge: string;
  redirectUri: string;
  resource: string | null;
}): Promise<string> {
  const code = randomToken(32);
  await supabase.from("oauth_code").insert({
    code_hash: sha256(code),
    client_id: params.clientId,
    member_id: params.memberId,
    code_challenge: params.codeChallenge,
    redirect_uri: params.redirectUri,
    resource: params.resource,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  return code;
}

export type ConsumeResult =
  | { ok: true; memberId: string }
  | { ok: false; error: string; reused?: boolean };

export async function consumeCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ConsumeResult> {
  const hash = sha256(params.code);
  const { data: row } = await supabase.from("oauth_code").select("*").eq("code_hash", hash).maybeSingle();
  if (!row) return { ok: false, error: "invalid code" };
  if (row.used_at) return { ok: false, error: "code already used", reused: true };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "code expired" };
  if (row.client_id !== params.clientId) return { ok: false, error: "client mismatch" };
  if (row.redirect_uri !== params.redirectUri) return { ok: false, error: "redirect_uri mismatch" };
  if (!verifyPkce(params.codeVerifier, row.code_challenge)) return { ok: false, error: "pkce verification failed" };

  await supabase.from("oauth_code").update({ used_at: new Date().toISOString() }).eq("code_hash", hash);
  return { ok: true, memberId: row.member_id };
}
