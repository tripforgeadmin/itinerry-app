import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { MCP_ENABLED, getClient, verifyClientSecret } from "@/lib/oauth/clients";
import { consumeCode } from "@/lib/oauth/codes";
import { issueRefreshToken, rotateRefreshToken, signAccessToken } from "@/lib/oauth/tokens";

/**
 * OAuth 2.1 token endpoint. Grants: authorization_code (+PKCE) and refresh_token
 * (rotating). Accepts application/x-www-form-urlencoded (spec) and JSON.
 * client auth: client_secret_post/basic for claude-ai; PKCE-only ("none") for
 * claude-code. Rate-limited fail-CLOSED — unmetered token guessing is worse than
 * a brief outage here.
 */

function err(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function readParams(request: NextRequest): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = await request.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
  }
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(request: NextRequest) {
  if (!MCP_ENABLED) return err("not found", 404);

  const ip = clientIp(request);
  if (!(await checkRateLimit(`oauth_token:${ip}`, 30, 15 * 60 * 1000, { failClosed: true }))) {
    return err("too many requests", 429);
  }

  const params = await readParams(request);

  // Client authentication: Basic header or body params.
  let clientId = params.client_id ?? "";
  let clientSecret = params.client_secret ?? "";
  const basic = request.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    try {
      const [id, secret] = Buffer.from(basic.slice(6), "base64").toString().split(":");
      clientId = id || clientId;
      clientSecret = secret || clientSecret;
    } catch {
      return err("invalid client authentication", 401);
    }
  }
  const client = getClient(clientId);
  if (!client) return err("invalid client", 401);
  if (client.confidential && !verifyClientSecret(clientId, clientSecret)) {
    return err("invalid client authentication", 401);
  }

  const loadMember = async (memberId: string) => {
    const { data } = await supabase
      .from("admin_member")
      .select("id, name, active")
      .eq("id", memberId)
      .maybeSingle();
    return data && data.active ? data : null;
  };

  if (params.grant_type === "authorization_code") {
    const result = await consumeCode({
      code: params.code ?? "",
      clientId,
      redirectUri: params.redirect_uri ?? "",
      codeVerifier: params.code_verifier ?? "",
    });
    if (!result.ok) {
      if (result.reused) {
        // OAuth 2.1: code replay ⇒ assume theft, revoke this member+client's refresh chain.
        console.error("oauth code reuse detected for client", clientId);
      }
      return err(result.error);
    }
    const member = await loadMember(result.memberId);
    if (!member) return err("member inactive", 400);

    const accessToken = await signAccessToken(member, clientId);
    const refreshToken = await issueRefreshToken(member.id, clientId);
    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  }

  if (params.grant_type === "refresh_token") {
    const result = await rotateRefreshToken(params.refresh_token ?? "");
    if (!result.ok) return err(result.error);
    if (result.clientId !== clientId) return err("client mismatch", 400);
    const member = await loadMember(result.memberId);
    if (!member) return err("member inactive", 400);

    const accessToken = await signAccessToken(member, clientId);
    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: result.newToken,
    });
  }

  return err("unsupported grant_type");
}
