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

/** Parse a JSON entries string (refused/overstay multi-country); null if absent/invalid. */
function toJson(v: string | undefined): unknown | null {
  if (!v || v === "") return null;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Split a combined "First Last" name into parts (fallback when q3_first/q3_last are absent). */
function splitName(full: string | undefined): { first: string | null; last: string | null } {
  const f = (full ?? "").trim();
  if (!f) return { first: null, last: null };
  const i = f.indexOf(" ");
  return i === -1 ? { first: f, last: null } : { first: f.slice(0, i), last: f.slice(i + 1).trim() || null };
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const isFriendCookie = cookieStore.get("isFriend")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  if (!profile) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { answers } = body as { answers: Record<string, string> };

  // ---- sparse categorical branch answers, keyed by question id ----
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

  // ---- name + phone (accept split keys, else derive) ----
  const split = splitName(answers.q3);
  const firstName = toNull(answers.q3_first) ?? split.first;
  const lastName = toNull(answers.q3_last) ?? split.last;
  const fullName = toNull(answers.q3) ?? ([firstName, lastName].filter(Boolean).join(" ") || "");

  // ===== 1) account (upsert by line_user_id; anonymous → fresh insert) =====
  const accountData = {
    line_user_id:       toNull(profile?.userId),
    line_display_name:  toNull(profile?.displayName),
    line_picture_url:   toNull(profile?.pictureUrl),
    is_friend:          isFriendCookie === "1" ? true : isFriendCookie === "0" ? false : null,
    full_name:          fullName,
    first_name:         firstName,
    last_name:          lastName,
    phone:              answers.q5 ?? "",
    phone_country_code: toNull(answers.q5_cc) ?? "+66",
    email:              toNull(answers.q6),
    nationality:        answers.q4 === "thai" ? "thai" : "other",
    nationality_other:  answers.q4 === "other" ? toNull(answers.q4_other) : null,
    source:             ["facebook","instagram","tiktok","google","referral","other"].includes(answers.q7) ? answers.q7 : "other",
    source_other:       answers.q7 === "other" ? toNull(answers.q7_other) : null,
    consented_at:       new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  };

  const accountQuery = profile?.userId
    ? supabase.from("account").upsert(accountData, { onConflict: "line_user_id" })
    : supabase.from("account").insert(accountData);
  const { data: account, error: accountError } = await accountQuery.select("id").single();
  if (accountError || !account) {
    console.error("account upsert error:", accountError);
    return NextResponse.json({ ok: false, error: accountError?.message ?? "account failed" }, { status: 500 });
  }

  // ===== 2) user_trip (destination + visa type + dates) =====
  const { data: trip, error: tripError } = await supabase
    .from("user_trip")
    .insert({
      account_id:     account.id,
      destination:    answers.q8 ?? "",
      visa_type:      answers.q9 ?? "",
      travel_arrival: toDate(answers.q10 ?? answers.q13 ?? answers.q17),
      travel_return:  toDate(answers.q11 ?? answers.q18),
      study_start:    toDate(answers.q21),
    })
    .select("id")
    .single();
  if (tripError || !trip) {
    console.error("trip insert error:", tripError);
    return NextResponse.json({ ok: false, error: tripError?.message ?? "trip failed" }, { status: 500 });
  }

  // ===== 3) user_assessment (qualification + screening) =====
  const { error: assessError } = await supabase.from("user_assessment").insert({
    trip_id:              trip.id,
    account_id:           account.id,
    occupation:           answers.q24 ?? "",
    intent:               toNull(answers.q38),
    visa_refused:         answers.q30 === "yes",
    visa_refused_details: answers.q30 === "yes" ? toNull(answers.q31) : null,
    visa_refused_entries: answers.q30 === "yes" ? toJson(answers.q31_entries) : null,
    overstayed:           answers.q32 === "yes",
    overstay_details:     answers.q32 === "yes" ? toNull(answers.q33) : null,
    overstay_entries:     answers.q32 === "yes" ? toJson(answers.q33_entries) : null,
    savings_balance:      answers.q34 ?? "",
    ties_thailand:        toArray(answers.q35),
    contact_preference:   answers.q36 ?? "",
    callback_time:        answers.q37 === "other" ? toNull(answers.q37_other) : toNull(answers.q37),
    branch_answers:       branchAnswers,
  });
  if (assessError) {
    console.error("assessment insert error:", assessError);
    return NextResponse.json({ ok: false, error: assessError.message }, { status: 500 });
  }

  // Send email notification (PDF is optional — email sends even if PDF fails)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = await generateAssessmentPdf(answers, new Date().toISOString());
  } catch (err) {
    console.error("pdf error:", err);
  }
  try {
    await sendNewLeadEmail({
      assessmentId: trip.id,
      fullName: fullName ?? "",
      phone: answers.q5 ?? "",
      visaType: answers.q9 ?? "",
      destination: answers.q8 ?? "",
      travelArrival: answers.q10 ?? answers.q13 ?? answers.q17 ?? "",
      travelReturn: answers.q11 ?? answers.q18 ?? "",
      contactPreference: answers.q36 ?? "",
      appUrl,
      pdfBuffer,
    });
  } catch (err) {
    console.error("email error:", err);
  }

  return NextResponse.json({ ok: true });
}
