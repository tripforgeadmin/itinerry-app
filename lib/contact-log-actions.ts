import { supabase } from "./supabase";
import { clean } from "./normalize";

/**
 * Append-only outreach log — shared by the admin HTTP route and the MCP
 * add_contact_log tool. Does NOT change the case status.
 */

// Outcome allow-list — validated here, not at the DB (repo convention; see 0026 / 0022).
export const CONTACT_OUTCOMES = new Set([
  "reached",
  "no_answer",
  "callback_requested",
  "line_replied",
  "wrong_number",
  "other",
]);

export interface ContactLogInput {
  assessmentId: string;
  outcome: string;
  note?: unknown;
  staff?: unknown;
}

export type ContactLogResult = { ok: true } | { ok: false; error: string; code: 400 | 500 };

export async function addContactLog(input: ContactLogInput): Promise<ContactLogResult> {
  const assessmentId = clean(input.assessmentId, 100);
  const outcome = clean(input.outcome, 40);
  if (!assessmentId || !CONTACT_OUTCOMES.has(outcome)) {
    return { ok: false, error: "invalid input", code: 400 };
  }
  const { error } = await supabase.from("contact_log").insert({
    assessment_id: assessmentId,
    outcome,
    note: clean(input.note, 500) || null,
    staff: clean(input.staff, 80) || null,
  });
  if (error) {
    console.error("contact-log insert error:", error);
    return { ok: false, error: error.message, code: 500 };
  }
  return { ok: true };
}
