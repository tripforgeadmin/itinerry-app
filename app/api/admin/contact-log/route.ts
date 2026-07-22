import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

// Outcome allow-list — validated here, not at the DB (repo convention; see 0026 / 0022).
const OUTCOMES = new Set(["reached", "no_answer", "callback_requested", "line_replied", "wrong_number", "other"]);

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Log one outreach attempt on a case (append-only). Does NOT change the case status. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const assessmentId = clean(body.assessmentId, 100);
  const outcome = clean(body.outcome, 40);
  if (!assessmentId || !OUTCOMES.has(outcome)) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("contact_log").insert({
    assessment_id: assessmentId,
    outcome,
    note: clean(body.note, 500) || null,
    staff: clean(body.staff, 80) || null,
  });
  if (error) {
    console.error("contact-log insert error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
