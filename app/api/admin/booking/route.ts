import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

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
  const { error } = await supabase.from("consultation_booking").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
