import { timingSafeEqualStr } from "./crypto";

/**
 * Pre-registered OAuth clients — a code-level registry (no DCR, no client table;
 * claude.ai supports pre-registered client_id/secret). The whole MCP surface is
 * gated on MCP_ENABLED (same idiom as AI_DRAFT_ENABLED).
 */

export const MCP_ENABLED = Boolean(process.env.MCP_ENABLED);

/** Canonical public origin. NEXT_PUBLIC_APP_URL in prod; localhost fallback for dev. */
export function appOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function mcpResource(): string {
  return `${appOrigin()}/api/mcp/mcp`;
}

export interface OAuthClient {
  clientId: string;
  /** confidential clients authenticate with a secret; public clients use PKCE only */
  confidential: boolean;
  redirectUris: (uri: string) => boolean;
}

const CLAUDE_AI_REDIRECTS = new Set([
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
]);

/** Loopback redirect per RFC 8252 §7.3: any port, fixed host+scheme, path /callback. */
function isLoopback(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

const CLIENTS: Record<string, OAuthClient> = {
  "claude-ai": {
    clientId: "claude-ai",
    confidential: true,
    redirectUris: (uri) => CLAUDE_AI_REDIRECTS.has(uri),
  },
  "claude-code": {
    clientId: "claude-code",
    confidential: false,
    redirectUris: isLoopback,
  },
};

export function getClient(clientId: string): OAuthClient | null {
  return CLIENTS[clientId] ?? null;
}

/** Confidential-client secret check (claude-ai only). Fail closed if env unset. */
export function verifyClientSecret(clientId: string, secret: string): boolean {
  if (clientId !== "claude-ai") return false;
  const expected = process.env.OAUTH_CLAUDE_AI_CLIENT_SECRET;
  if (!expected || !secret) return false;
  return timingSafeEqualStr(secret, expected);
}
