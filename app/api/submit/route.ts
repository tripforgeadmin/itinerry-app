import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/line";
import { supabase } from "@/lib/supabase";

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

  const branchAnswers: Record<string, string | string[]> = {};
  const branchKeys = ["q12","q13","q14","q15","q16","q17","q18","q19","q20","q21","q22","q23","q25","q26","q27","q28","q29"];
  for (const key of branchKeys) {
    const val = answers[key];
    if (val && val !== "") {
      // multi-select keys
      if (key === "q12" || key === "q16" || key === "q20") {
        branchAnswers[key] = toArray(val);
      } else {
        branchAnswers[key] = val;
      }
    }
  }

  const row = {
    line_user_id:         toNull(profile?.userId),
    line_display_name:    toNull(profile?.displayName),
    line_picture_url:     toNull(profile?.pictureUrl),
    is_friend:            isFriendCookie === "1" ? true : isFriendCookie === "0" ? false : null,

    full_name:            answers.q3 ?? "",
    nationality:          answers.q4 === "other" || answers.q4 === "thai" ? answers.q4 : "other",
    nationality_other:    answers.q4 === "other" ? toNull(answers.q4_other) : null,
    phone:                answers.q5 ?? "",
    email:                toNull(answers.q6),
    source:               ["facebook","instagram","tiktok","google","referral","other"].includes(answers.q7) ? answers.q7 : "other",
    source_other:         answers.q7 === "other" ? toNull(answers.q7_other) : null,

    destination:          answers.q8 ?? "",
    visa_type:            answers.q9 ?? "",

    travel_arrival:       toDate(answers.q10 ?? answers.q13 ?? answers.q17),
    travel_return:        toDate(answers.q11 ?? answers.q18),
    study_start:          toDate(answers.q21),

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
  };

  const { error } = await supabase.from("visa_assessments").insert(row);

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
