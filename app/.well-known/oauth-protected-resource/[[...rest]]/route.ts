import { NextResponse } from "next/server";
import { MCP_ENABLED, appOrigin, mcpResource } from "@/lib/oauth/clients";

export const dynamic = "force-dynamic";

/**
 * RFC 9728 Protected Resource Metadata. Catch-all: MCP clients probe both
 * /.well-known/oauth-protected-resource and the path-inserted variant
 * /.well-known/oauth-protected-resource/api/mcp/mcp — both answer identically.
 */
export async function GET() {
  if (!MCP_ENABLED) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    resource: mcpResource(),
    authorization_servers: [appOrigin()],
    bearer_methods_supported: ["header"],
  });
}
