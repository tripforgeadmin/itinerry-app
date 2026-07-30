import { supabase } from "./supabase";
import { VALID_STATUSES, isClosed } from "./status";
import { bangkokNow } from "./holidays";
import { isValidLostReasonPair, fetchLostReasonLabels } from "./lost-reasons";

/**
 * Case status transition — the single implementation behind both the admin HTTP
 * route (app/api/admin/status) and the MCP set_case_status tool. Closing to
 * win/lost stamps close_date (default = Bangkok today) and, for lost, requires a
 * valid active reason pair; re-opening a closed case clears the close fields.
 * Every real transition is journaled in status_history.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface StatusChangeInput {
  id: string; // user_assessment.id
  status: string;
  closeDate?: unknown;
  lostReasonL1?: unknown;
  lostReasonL2?: unknown;
  closeNotes?: unknown;
  wonServiceType?: unknown;
  lostDestinationCountry?: unknown;
  lostVisaType?: unknown;
  /** Extra text appended to the history note (e.g. "via MCP · สมชาย"). */
  noteSuffix?: string;
}

export type StatusChangeResult = { ok: true } | { ok: false; error: string; code: 400 | 500 };

export async function applyStatusChange(input: StatusChangeInput): Promise<StatusChangeResult> {
  const { id, status } = input;
  if (!id || !VALID_STATUSES.includes(status)) {
    return { ok: false, error: "invalid input", code: 400 };
  }

  const { data: current } = await supabase.from("user_assessment").select("status").eq("id", id).single();
  const reopening = current ? isClosed(current.status) && !isClosed(status) : false;
  const notes =
    typeof input.closeNotes === "string" && input.closeNotes.trim() ? input.closeNotes.trim() : null;
  const closeIso =
    typeof input.closeDate === "string" && DATE_RE.test(input.closeDate) ? input.closeDate : bangkokNow().iso;

  const update: Record<string, unknown> = { status };
  // Any real status transition resets the follow-up cadence: entering follow_up starts fresh
  // at 0, and leaving it clears the counter (see lib/follow-up.ts + the follow-up cron).
  if (!current || current.status !== status) {
    update.follow_up_count = 0;
    update.follow_up_last_at = null;
  }
  let historyNote: string | null = null;

  if (status === "lost") {
    const l1 = input.lostReasonL1;
    const l2 = input.lostReasonL2;
    if (
      typeof l1 !== "string" || typeof l2 !== "string" || !l1 || !l2 ||
      !(await isValidLostReasonPair(l1, l2))
    ) {
      return { ok: false, error: "invalid or missing lost reason", code: 400 };
    }
    const isCoverageGap = l2 === "coverage_gap";
    Object.assign(update, {
      close_date: closeIso,
      lost_reason_l1: l1,
      lost_reason_l2: l2,
      close_notes: notes,
      won_service_type: null,
      lost_destination_country:
        isCoverageGap && typeof input.lostDestinationCountry === "string" && input.lostDestinationCountry
          ? input.lostDestinationCountry
          : null,
      lost_visa_type:
        isCoverageGap && typeof input.lostVisaType === "string" && input.lostVisaType.trim()
          ? input.lostVisaType.trim()
          : null,
    });
    const labels = await fetchLostReasonLabels();
    historyNote = `${labels[l1] ?? l1} · ${labels[l2] ?? l2}`;
  } else if (status === "win") {
    const serviceType = input.wonServiceType === "diy" ? "diy" : "full";
    Object.assign(update, {
      close_date: closeIso,
      won_service_type: serviceType,
      close_notes: notes,
      lost_reason_l1: null,
      lost_reason_l2: null,
      lost_destination_country: null,
      lost_visa_type: null,
    });
    historyNote = serviceType === "diy" ? "DIY" : "Full service";
  } else if (reopening) {
    Object.assign(update, {
      close_date: null,
      lost_reason_l1: null,
      lost_reason_l2: null,
      close_notes: null,
      won_service_type: null,
      lost_destination_country: null,
      lost_visa_type: null,
    });
    historyNote = "เปิดเคสใหม่";
  }

  const { error } = await supabase.from("user_assessment").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message, code: 500 };

  if (current && current.status !== status) {
    const note = [historyNote, input.noteSuffix].filter(Boolean).join(" · ") || null;
    const { error: historyError } = await supabase
      .from("status_history")
      .insert({ assessment_id: id, from_status: current.status, to_status: status, note });
    if (historyError) console.error("status_history insert failed:", historyError);
  }

  return { ok: true };
}
