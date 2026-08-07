import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { deleteCalendarEvent } from "@/lib/google-calendar";

const VALID_STATUS = ["booked", "done", "cancelled", "no_show"];

/** Admin-only booking status updates (mark done / cancelled / no-show from the queue page). */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !VALID_STATUS.includes(status)) {
    return NextResponse.json({ ok: false, error: "id and valid status required" }, { status: 400 });
  }

  // Cancelling frees the slot for others; also drop the synced Google Calendar event (if
  // any) so the team's calendar doesn't show a stale meeting. Best-effort — never blocks
  // the status update itself.
  if (status === "cancelled") {
    const { data: row } = await supabase
      .from("consultation_booking")
      .select("gcal_event_id")
      .eq("id", id)
      .maybeSingle();
    if (row?.gcal_event_id) await deleteCalendarEvent(row.gcal_event_id as string);
  }

  const { error } = await supabase.from("consultation_booking").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
