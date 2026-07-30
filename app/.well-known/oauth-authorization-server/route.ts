import { NextResponse } from "next/server";
import { MCP_ENABLED, appOrigin } from "@/lib/oauth/clients";

export const dynamic = "force-dynamic";

/** RFC 8414 Authorization Server Metadata. No registration_endpoint — clients are
 * pre-registered in lib/oauth/clients.ts (claude.ai supports this; no DCR). */
export async function GET() {
  if (!MCP_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  const origin = appOrigin();
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
  });
}
