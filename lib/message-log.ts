import { supabase } from "./supabase";
import { pushMessage } from "./line-messaging";

/**
 * Outbound LINE message log (line_message_log) — the single funnel every customer-bound
 * message goes through, so the admin ticket page can show a complete history.
 *
 * Rules of the funnel:
 *  - System best-effort pushes (submit thank-you) log only when DELIVERED — a failed push
 *    to a not-yet-friend is routine and gets re-sent (and logged) by the follow webhook.
 *  - Manual admin messages log even on failure (delivered=false) so the admin sees the
 *    red "ส่งไม่สำเร็จ" bubble instead of a silent drop.
 *  - Logging never throws — a log failure must not break the send it describes.
 */

export type MessageKind = "ticket_received" | "follow_up" | "share_card" | "result" | "manual";

export interface MessageLogEntry {
  accountId: string;
  assessmentId?: string | null;
  kind: MessageKind;
  content: string; // human-readable summary of what was sent
  payload?: unknown; // raw LINE message array (audit)
  sentBy?: "system" | "admin";
  delivered: boolean;
}

export async function logLineMessage(e: MessageLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from("line_message_log").insert({
      account_id: e.accountId,
      assessment_id: e.assessmentId ?? null,
      kind: e.kind,
      content: e.content,
      payload: e.payload ?? null,
      sent_by: e.sentBy ?? "system",
      delivered: e.delivered,
    });
    if (error) console.error("message log error:", error);
  } catch (err) {
    console.error("message log error:", err);
  }
}

/** Push to LINE and record the attempt in one call. Returns pushMessage's delivered flag. */
export async function pushMessageLogged(args: {
  to: string; // LINE userId
  messages: object[];
  accountId: string;
  assessmentId?: string | null;
  kind: MessageKind;
  content: string;
  sentBy?: "system" | "admin";
  /** Log the entry even when the push fails (manual sends want the red bubble). */
  logFailed?: boolean;
}): Promise<boolean> {
  // pushMessage returns false when LINE rejects, but THROWS on config/network errors —
  // normalize both to delivered=false so callers get a red-bubble log, never a 500.
  let delivered = false;
  try {
    delivered = await pushMessage(args.to, args.messages);
  } catch (err) {
    console.error("LINE push threw:", err);
  }
  if (delivered || args.logFailed) {
    await logLineMessage({
      accountId: args.accountId,
      assessmentId: args.assessmentId,
      kind: args.kind,
      content: args.content,
      payload: args.messages,
      sentBy: args.sentBy,
      delivered,
    });
  }
  return delivered;
}
