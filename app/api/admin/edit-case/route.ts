import { NextRequest, NextResponse } from "next/server";
import { runAssessment } from "@/lib/assessment";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { tripFieldsFromAnswers, coreAssessmentFieldsFromAnswers, branchAnswersFromAnswers } from "@/lib/manual-case-mapping";

// Lets admin staff correct S2 (destination/visa) / S3-S4 (occupation) / S5 (core screening)
// data on an already-submitted case — e.g. the customer misspoke on the phone, or a typo
// slipped through. Reuses the exact same answers -> column mapping as
// app/api/admin/manual-case/route.ts (the phone-first creation flow) so the two never
// drift, but only ever UPDATEs the S2-S5 subset of columns: contact_preference/due_date/
// callback_*/intent/ticket_id/entry_source and every manual-evaluation column
// (pass/notes/strengths/improvements/override_*) are untouched by this route.

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : "";
  const answers = (body.answers ?? {}) as Record<string, string>;

  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: "assessmentId required" }, { status: 400 });
  }
  const missing = ["q8", "q9", "q24", "q30", "q32", "q35"].filter((k) => !answers[k] || answers[k] === "");
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: `missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (answers.q30 === "yes" && !answers.q31_entries) {
    return NextResponse.json({ ok: false, error: "visa refusal details required" }, { status: 400 });
  }
  if (answers.q32 === "yes" && !answers.q33_entries) {
    return NextResponse.json({ ok: false, error: "overstay details required" }, { status: 400 });
  }
  if (answers.q9 !== "student" && (!answers.q34 || answers.q34 === "")) {
    return NextResponse.json({ ok: false, error: "savings balance required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("user_assessment")
    .select("trip_id")
    .eq("id", assessmentId)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const { error: tripError } = await supabase
    .from("user_trip")
    .update(tripFieldsFromAnswers(answers))
    .eq("id", existing.trip_id);
  if (tripError) {
    console.error("edit-case trip update error:", tripError);
    return NextResponse.json({ ok: false, error: tripError.message }, { status: 500 });
  }

  const { error: assessError } = await supabase
    .from("user_assessment")
    .update({
      ...coreAssessmentFieldsFromAnswers(answers),
      branch_answers: branchAnswersFromAnswers(answers),
    })
    .eq("id", assessmentId);
  if (assessError) {
    console.error("edit-case assessment update error:", assessError);
    return NextResponse.json({ ok: false, error: assessError.message }, { status: 500 });
  }

  // Re-run the auto rule-engine synchronously — an edit isn't latency-sensitive like a
  // customer-facing submit, and the admin should see the refreshed AutoAssessment block
  // (pillars, band, score, Senior Review flag, pricing/docs/complexity/time, urgency) right
  // after saving. Column-scoped upsert — pass/notes/strengths/improvements/override_* on the
  // same visa_evaluation row are untouched since they're not part of this payload.
  try {
    const { score, result, evaluatedBy } = runAssessment(answers);
    const { error: evalError } = await supabase.from("visa_evaluation").upsert(
      {
        assessment_id: assessmentId,
        score,
        result,
        evaluated_by: evaluatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id" }
    );
    if (evalError) console.error("edit-case auto-assessment upsert error:", evalError);
  } catch (err) {
    console.error("edit-case auto-assessment error:", err);
  }

  return NextResponse.json({ ok: true });
}
