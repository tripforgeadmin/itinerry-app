import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { MCP_ENABLED } from "@/lib/oauth/clients";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { registerTools } from "@/lib/mcp/tools";

/**
 * Remote MCP endpoint — https://<host>/api/mcp/mcp (Streamable HTTP), consumed by
 * claude.ai custom connectors and Claude Code. Auth = OAuth bearer (lib/oauth) via
 * withMcpAuth; a 401 carries the WWW-Authenticate resource-metadata pointer that
 * clients use to discover the OAuth flow. Whole surface is gated on MCP_ENABLED.
 */

const handler = createMcpHandler(
  registerTools,
  {},
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  }
);

const authed = withMcpAuth(handler, verifyMcpToken, { required: true });

const gate = (req: Request) => {
  if (!MCP_ENABLED) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  return authed(req);
};

export { gate as GET, gate as POST, gate as DELETE };
