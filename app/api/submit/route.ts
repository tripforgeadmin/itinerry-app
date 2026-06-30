import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/line";
import { supabase } from "@/lib/supabase";
import { sendNewLeadEmail } from "@/lib/email";
import { generateAssessmentPdf } from "@/lib/pdf";

function toNull(v: string | undefined): string | null {
  return v && v !== "" ? v : null;
}

function toDate(v: string | undefined): string | null {
  return v && v !== "" ? v : null;
}

function toArray(v: string | undefined): string[] {
  if (!v || v === "") return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const isFriendCookie = cookieStore.get("isFriend")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  const body = await request.json();
  const { answers } = body as { answers: Record<string, string> };

  // branch_answers uses semantic question_key (not q-numbers)
  const branchAnswers: Record<string, string | string[]> = {};
  const branchMap: Record<string, string> = {
    q13: "visitor_arrival",
    q14: "visitor_host_status",
    q15: "visitor_relationship",
    q16: "visitor_host_documents",
    q17: "business_arrival",
    q18: "business_return",
    q19: "business_invitation_letter",
    q20: "business_previous_visas",
    q22: "student_acceptance_letter",
    q23: "student_expense_sponsor",
    q25: "employee_work_letter",
    q26: "freelance_income_proof",
    q27: "freelance_tax_history",
    q28: "business_registration",
    q29: "dependent_expense_sponsor",
  };
  const multiSelectBranchKeys = new Set(["q12", "q16", "q20"]);

  // tourist_previous_visas (q12) stored separately with semantic key
  if (answers.q12 && answers.q12 !== "") {
    branchAnswers["tourist_previous_visas"] = toArray(answers.q12);
  }

  for (const [qKey, semanticKey] of Object.entries(branchMap)) {
    const val = answers[qKey];
    if (val && val !== "") {
      branchAnswers[semanticKey] = multiSelectBranchKeys.has(qKey) ? toArray(val) : val;
    }
  }

  const isFriend = isFriendCookie === "1" ? true : isFriendCookie === "0" ? false : null;

  // 1. Upsert account (by line_user_id if available, else insert new)
  const accountData = {
    line_display_name: toNull(profile?.displayName),
    line_picture_url:  toNull(profile?.pictureUrl),
    is_friend:         isFriend,
    full_name:         answers.q3 ?? "",
    phone:             answers.q5 ?? "",
    email:             toNull(answers.q6),
    nationality:       answers.q4 === "other" || answers.q4 === "thai" ? answers.q4 : "other",
    nationality_other: answers.q4 === "other" ? toNull(answers.q4_other) : null,
    source:            ["facebook","instagram","tiktok","google","referral","other"].includes(answers.q7) ? answers.q7 : "other",
    source_other:      answers.q7 === "other" ? toNull(answers.q7_other) : null,
    updated_at:        new Date().toISOString(),
  };

  let accountId: string;

  if (profile?.userId) {
    const { data: upserted, error: upsertErr } = await supabase
      .from("account")
      .upsert({ line_user_id: profile.userId, ...accountData }, { onConflict: "line_user_id" })
      .select("id")
      .single();
    if (upsertErr || !upserted) {
      console.error("account upsert error:", upsertErr);
      return NextResponse.json({ ok: false, error: upsertErr?.message }, { status: 500 });
    }
    accountId = upserted.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("account")
      .insert(accountData)
      .select("id")
      .single();
    if (insertErr || !inserted) {
      console.error("account insert error:", insertErr);
      return NextResponse.json({ ok: false, error: insertErr?.message }, { status: 500 });
    }
    accountId = inserted.id;
  }

  // 2. Insert user_trip
  const { data: trip, error: tripErr } = await supabase
    .from("user_trip")
    .insert({
      account_id:     accountId,
      destination:    answers.q8 ?? "",
      visa_type:      answers.q9 ?? "",
      travel_arrival: toDate(answers.q10 ?? answers.q13 ?? answers.q17),
      travel_return:  toDate(answers.q11 ?? answers.q18),
      study_start:    toDate(answers.q21),
    })
    .select("id")
    .single();

  if (tripErr || !trip) {
    console.error("user_trip insert error:", tripErr);
    return NextResponse.json({ ok: false, error: tripErr?.message }, { status: 500 });
  }

  // 3. Insert user_assessment
  const { data: newAssessment, error: assessErr } = await supabase
    .from("user_assessment")
    .insert({
      trip_id:              trip.id,
      account_id:           accountId,
      occupation:           answers.q24 ?? "",
      visa_refused:         answers.q30 === "yes",
      visa_refused_details: answers.q30 === "yes" ? toNull(answers.q31) : null,
      overstayed:           answers.q32 === "yes",
      overstay_details:     answers.q32 === "yes" ? toNull(answers.q33) : null,
      savings_balance:      answers.q34 ?? "",
      ties_thailand:        toArray(answers.q35),
      contact_preference:   answers.q36 ?? "",
      callback_time:        toNull(answers.q37),
      branch_answers:       branchAnswers,
    })
    .select("id")
    .single();

  if (assessErr || !newAssessment) {
    console.error("user_assessment insert error:", assessErr);
    return NextResponse.json({ ok: false, error: assessErr?.message }, { status: 500 });
  }

  if (newAssessment) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const submittedAt = new Date().toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
    (async () => {
      const pdfBuffer = await generateAssessmentPdf(answers, submittedAt).catch((err) => {
        console.error("pdf generation error:", err);
        return undefined;
      });
      await sendNewLeadEmail({
        assessmentId: newAssessment.id,
        fullName: answers.q3 ?? "—",
        phone: answers.q5 ?? "—",
        visaType: answers.q9 ?? "—",
        destination: answers.q8 ?? "—",
        travelArrival: answers.q10 ?? answers.q13 ?? answers.q17 ?? "",
        travelReturn: answers.q11 ?? answers.q18 ?? "",
        contactPreference: answers.q36 ?? "—",
        appUrl,
        pdfBuffer,
      });
    })().catch((err) => console.error("email send error:", err));
  }

  return NextResponse.json({ ok: true });
}
