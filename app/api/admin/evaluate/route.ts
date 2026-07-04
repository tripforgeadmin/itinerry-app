import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { assessmentId, pass, notes } = await request.json();
  if (!assessmentId || typeof pass !== "boolean" || typeof notes !== "string" || !notes.trim()) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { data: assessment, error: fetchError } = await supabase
    .from("user_assessment")
    .select("status")
    .eq("id", assessmentId)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const { error: upsertError } = await supabase
    .from("visa_evaluation")
    .upsert(
      { assessment_id: assessmentId, pass, notes: notes.trim(), updated_at: new Date().toISOString() },
      { onConflict: "assessment_id" }
    );

  if (upsertError) return NextResponse.json({ ok: false }, { status: 500 });

  // Only advances the funnel the first time — re-saving an already
  // later-stage case (e.g. contacted, win) doesn't regress its status.
  const nextStatus = assessment.status === "pending_review" ? "evaluated" : assessment.status;

  if (nextStatus !== assessment.status) {
    const { error: statusError } = await supabase
      .from("user_assessment")
      .update({ status: nextStatus })
      .eq("id", assessmentId);

    if (statusError) return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
