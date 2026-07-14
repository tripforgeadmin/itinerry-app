import { NextRequest, NextResponse, after } from "next/server";
import { runAssessment } from "@/lib/assessment";
import { supabase } from "@/lib/supabase";
import { generateTicketId } from "@/lib/ticket";
import { normalizePhone } from "@/lib/dialCodes";
import { bangkokDateTimeToUtc } from "@/lib/holidays";
import { SLA_HOURS } from "@/lib/status";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { toNull, toJson, tripFieldsFromAnswers, coreAssessmentFieldsFromAnswers, branchAnswersFromAnswers } from "@/lib/manual-case-mapping";

// Mirrors app/api/submit/route.ts's insert logic (account -> user_trip -> user_assessment,
// same `answers` key vocabulary, same helpers/branch-answer packing, same due-date/SLA and
// ticket_id generation, same post-insert auto rule-engine evaluation) but:
//   - authenticates as an admin (no customer LINE session exists for a phone-first lead)
//   - always a fresh account insert (line_user_id is null — nothing to conflict/upsert on)
//   - tags the row entry_source="manual" + manual_entry_staff
//   - skips the email/PDF/LINE-push side effects entirely (OPS already knows about this
//     lead; those side effects exist to notify people the customer flow doesn't reach)
// The trip/assessment/branch-answers mapping is shared with app/api/admin/edit-case/route.ts
// via lib/manual-case-mapping.ts so create and edit never drift apart.

const REQUIRED_KEYS = ["q3", "q5", "q6", "q8", "q9", "q24", "q30", "q32", "q35"];

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const staffName = typeof body.staffName === "string" ? body.staffName.trim().slice(0, 120) : "";
  const answers = (body.answers ?? {}) as Record<string, string>;

  if (!staffName) {
    return NextResponse.json({ ok: false, error: "staffName required" }, { status: 400 });
  }
  const missing = REQUIRED_KEYS.filter((k) => !answers[k] || answers[k] === "");
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: `missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (answers.q30 === "yes" && !toJson(answers.q31_entries)) {
    return NextResponse.json({ ok: false, error: "visa refusal details required" }, { status: 400 });
  }
  if (answers.q32 === "yes" && !toJson(answers.q33_entries)) {
    return NextResponse.json({ ok: false, error: "overstay details required" }, { status: 400 });
  }
  if (answers.q9 !== "student" && (!answers.q34 || answers.q34 === "")) {
    return NextResponse.json({ ok: false, error: "savings balance required" }, { status: 400 });
  }

  const branchAnswers = branchAnswersFromAnswers(answers);
  const nickname = toNull(answers.q3) ?? "";

  // ===== 1) account — always a fresh insert, no LINE identity yet =====
  const { data: account, error: accountError } = await supabase
    .from("account")
    .insert({
      line_user_id:       null,
      line_display_name:  null,
      line_picture_url:   null,
      is_friend:          null,
      nickname:           nickname,
      phone:              normalizePhone(answers.q5 ?? ""),
      phone_country_code: toNull(answers.q5_cc) ?? "+66",
      email:              toNull(answers.q6),
      nationality:        answers.q4 === "thai" ? "thai" : "other",
      nationality_other:  answers.q4 === "other" ? toNull(answers.q4_other) : null,
      source:             ["facebook","instagram","tiktok","google","referral","other"].includes(answers.q7) ? answers.q7 : "other",
      source_other:       answers.q7 === "other" ? toNull(answers.q7_other) : null,
      consented_at:       new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    .select("id")
    .single();
  if (accountError || !account) {
    console.error("manual-case account insert error:", accountError);
    return NextResponse.json({ ok: false, error: accountError?.message ?? "account failed" }, { status: 500 });
  }

  // ===== 2) user_trip =====
  const { data: trip, error: tripError } = await supabase
    .from("user_trip")
    .insert({
      account_id: account.id,
      ...tripFieldsFromAnswers(answers),
    })
    .select("id")
    .single();
  if (tripError || !trip) {
    console.error("manual-case trip insert error:", tripError);
    return NextResponse.json({ ok: false, error: tripError?.message ?? "trip failed" }, { status: 500 });
  }

  // ---- callback slot + SLA due date (identical to /api/submit) ----
  const isCall = answers.q36 === "call";
  const validSlot = /^\d{1,2}:\d{2}$/.test(answers.q37 ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(answers.q37_date ?? "");
  const rawCb = isCall && validSlot ? bangkokDateTimeToUtc(answers.q37_date, answers.q37) : null;
  const callbackDatetime = rawCb && !isNaN(rawCb.getTime()) ? rawCb : null;
  const dueDate = isCall && callbackDatetime ? callbackDatetime : new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000);

  // ===== 3) user_assessment =====
  const ticketId = await generateTicketId(answers.q8 ?? "");
  const { data: assessment, error: assessError } = await supabase.from("user_assessment").insert({
    trip_id:              trip.id,
    account_id:           account.id,
    ticket_id:            ticketId,
    ...coreAssessmentFieldsFromAnswers(answers),
    intent:               toNull(answers.q38),
    contact_preference:   answers.q36 ?? "",
    callback_time:        callbackDatetime ? `${answers.q37_date} ${answers.q37}` : null,
    callback_datetime:    callbackDatetime ? callbackDatetime.toISOString() : null,
    due_date:             dueDate.toISOString(),
    branch_answers:       branchAnswers,
    entry_source:         "manual",
    manual_entry_staff:   staffName,
  }).select("id").single();
  if (assessError || !assessment) {
    console.error("manual-case assessment insert error:", assessError);
    return NextResponse.json({ ok: false, error: assessError?.message ?? "assessment failed" }, { status: 500 });
  }

  // Auto rule-engine evaluation — same as /api/submit, still valuable for a manually
  // entered case. No email/PDF/LINE-push here — OPS already knows about this lead.
  const assessmentId = assessment.id;
  after(async () => {
    try {
      const { score, result, evaluatedBy } = runAssessment(answers);
      const { error } = await supabase.from("visa_evaluation").upsert(
        {
          assessment_id: assessmentId,
          score,
          result,
          evaluated_by: evaluatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id" },
      );
      if (error) console.error("manual-case auto-assessment upsert error:", error);
    } catch (err) {
      console.error("manual-case auto-assessment error:", err);
    }
  });

  return NextResponse.json({ ok: true, ticketId, id: assessmentId });
}
