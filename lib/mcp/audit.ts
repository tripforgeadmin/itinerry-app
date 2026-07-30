import { supabase } from "../supabase";
import type { McpMember } from "./auth";

/** Append-only journal of every MCP tool call (migration 0034). Fire-and-log —
 * an audit-insert failure must not fail the tool, but it is loudly logged. */
export async function logMcpCall(params: {
  member: McpMember;
  tool: string;
  args: unknown;
  outcome: "ok" | "error" | "denied" | "preview";
  detail?: string;
}): Promise<void> {
  const { error } = await supabase.from("mcp_audit_log").insert({
    member_id: params.member.id,
    member_name: params.member.name,
    tool: params.tool,
    args: params.args ?? null,
    outcome: params.outcome,
    detail: params.detail ?? null,
  });
  if (error) console.error("mcp_audit_log insert failed:", error);
}
