import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { VALID_STATUSES, isClosed } from "@/lib/status";
import { bangkokNow } from "@/lib/holidays";
import { isValidLostReasonPair, fetchLostReasonLabels } from "@/lib/lost-reasons";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Change a case's pipeline status. Closing to win/lost stamps close_date (default = today
 * Bangkok, editable) and, for lost, requires a valid active reason pair; re-opening a closed
 * case clears the close fields. Every transition is recorded in status_history with a note.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id, status, closeDate, lostReasonL1, lostReasonL2, closeNotes, wonServiceType } = await request.json();
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { data: current } = await supabase.from("user_assessment").select("status").eq("id", id).single();
  const reopening = current ? isClosed(current.status) && !isClosed(status) : false;
  const notes = typeof closeNotes === "string" && closeNotes.trim() ? closeNotes.trim() : null;
  const closeIso = typeof closeDate === "string" && DATE_RE.test(closeDate) ? closeDate : bangkokNow().iso;

  const update: Record<string, unknown> = { status };
  let historyNote: string | null = null;

  if (status === "lost") {
    if (!lostReasonL1 || !lostReasonL2 || !(await isValidLostReasonPair(lostReasonL1, lostReasonL2))) {
      return NextResponse.json({ ok: false, error: "invalid or missing lost reason" }, { status: 400 });
    }
    Object.assign(update, {
      close_date: closeIso,
      lost_reason_l1: lostReasonL1,
      lost_reason_l2: lostReasonL2,
      close_notes: notes,
      won_service_type: null,
    });
    const labels = await fetchLostReasonLabels();
    historyNote = `${labels[lostReasonL1] ?? lostReasonL1} · ${labels[lostReasonL2] ?? lostReasonL2}`;
  } else if (status === "win") {
    const serviceType = wonServiceType === "diy" ? "diy" : "full";
    Object.assign(update, {
      close_date: closeIso,
      won_service_type: serviceType,
      close_notes: notes,
      lost_reason_l1: null,
      lost_reason_l2: null,
    });
    historyNote = serviceType === "diy" ? "DIY" : "Full service";
  } else if (reopening) {
    Object.assign(update, {
      close_date: null,
      lost_reason_l1: null,
      lost_reason_l2: null,
      close_notes: null,
      won_service_type: null,
    });
    historyNote = "เปิดเคสใหม่";
  }

  const { error } = await supabase.from("user_assessment").update(update).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (current && current.status !== status) {
    const { error: historyError } = await supabase
      .from("status_history")
      .insert({ assessment_id: id, from_status: current.status, to_status: status, note: historyNote });
    if (historyError) console.error("status_history insert failed:", historyError);
  }

  return NextResponse.json({ ok: true });
}
