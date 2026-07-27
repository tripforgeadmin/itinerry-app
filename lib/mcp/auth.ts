import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { supabase } from "../supabase";
import { verifyAccessToken } from "../oauth/tokens";

/**
 * Bearer verification for the MCP endpoint (plugged into mcp-handler's
 * withMcpAuth). Validates the 1-hour JWT (MCP_JWT_SECRET, iss+aud pinned) AND
 * re-checks admin_member.active on every request — deactivating a member cuts
 * MCP access within one call, which is the revocation model (no jti denylist).
 * Returning undefined ⇒ mcp-handler answers 401 with the WWW-Authenticate
 * resource-metadata header that claude.ai needs to bootstrap OAuth.
 */
export interface McpMember {
  id: string;
  name: string;
}

export async function verifyMcpToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const claims = await verifyAccessToken(bearerToken);
  if (!claims) return undefined;

  const { data: member } = await supabase
    .from("admin_member")
    .select("id, name, active")
    .eq("id", claims.memberId)
    .maybeSingle();
  if (!member || !member.active) return undefined;

  return {
    token: bearerToken,
    clientId: claims.clientId,
    scopes: [],
    extra: { memberId: member.id, memberName: member.name },
  };
}

export function memberFromAuthInfo(authInfo: AuthInfo | undefined): McpMember | null {
  const extra = authInfo?.extra as { memberId?: string; memberName?: string } | undefined;
  if (!extra?.memberId) return null;
  return { id: extra.memberId, name: extra.memberName ?? "" };
}
