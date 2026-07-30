import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clean } from "@/lib/normalize";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { MCP_ENABLED, getClient, mcpResource } from "@/lib/oauth/clients";
import { verifyPasscode } from "@/lib/oauth/crypto";
import { issueCode } from "@/lib/oauth/codes";

/**
 * Credential check + authorization-code issue for the /oauth/authorize page.
 * Server-side revalidates everything the page validated (client, redirect, PKCE,
 * resource) — the page is UX, this is the control.
 */
export async function POST(request: NextRequest) {
  if (!MCP_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ip = clientIp(request);
  if (!(await checkRateLimit(`oauth_authorize:${ip}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = clean(body.email, 120).toLowerCase();
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  const clientId = clean(body.clientId, 40);
  const redirectUri = clean(body.redirectUri, 500);
  const codeChallenge = clean(body.codeChallenge, 200);
  const resource = clean(body.resource, 200) || null;
  const state = clean(body.state, 500);

  const client = getClient(clientId);
  if (!client || !client.redirectUris(redirectUri) || !codeChallenge) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (resource && resource !== mcpResource()) {
    return NextResponse.json({ error: "invalid resource" }, { status: 400 });
  }

  const { data: member } = await supabase
    .from("admin_member")
    .select("id, passcode_hash, active")
    .eq("email", email)
    .maybeSingle();
  if (!member || !member.active || !verifyPasscode(passcode, member.passcode_hash)) {
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const code = await issueCode({
    clientId,
    memberId: member.id,
    codeChallenge,
    redirectUri,
    resource,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return NextResponse.json({ redirect: url.toString() });
}
