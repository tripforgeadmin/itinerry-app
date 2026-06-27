import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/line";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  const body = await request.json();
  const { answers } = body as { answers: Record<string, string> };

  const nationality =
    answers.q4 === "other"
      ? (answers.q4_other ?? "อื่นๆ")
      : (answers.q4 ?? "");

  const source =
    answers.q7 === "other"
      ? (answers.q7_other ?? "อื่นๆ")
      : (answers.q7 ?? "");

  const payload = {
    timestamp: new Date().toISOString(),
    lineUserId: profile?.userId ?? "",
    lineDisplayName: profile?.displayName ?? "",

    // Personal
    fullName: answers.q3 ?? "",
    nationality,
    phone: answers.q5 ?? "",
    email: answers.q6 ?? "",
    source,

    // Destination + Visa
    destination: answers.q8 ?? "",
    visaType: answers.q9 ?? "",

    // Tourist
    touristArrival: answers.q10 ?? "",
    touristReturn: answers.q11 ?? "",
    pastVisasTourist: answers.q12 ?? "",

    // Visitor
    visitorArrival: answers.q13 ?? "",
    visitorHostStatus: answers.q14 ?? "",
    visitorRelationship: answers.q15 ?? "",
    visitorDocs: answers.q16 ?? "",

    // Business
    businessArrival: answers.q17 ?? "",
    businessReturn: answers.q18 ?? "",
    businessInvitationLetter: answers.q19 ?? "",
    pastVisasBusiness: answers.q20 ?? "",

    // Student
    studentStartDate: answers.q21 ?? "",
    acceptanceLetter: answers.q22 ?? "",
    studentExpenses: answers.q23 ?? "",

    // Occupation
    occupation: answers.q24 ?? "",

    // Employee / Gov
    employmentLetter: answers.q25 ?? "",

    // Freelance
    incomeProof: answers.q26 ?? "",
    taxDocs: answers.q27 ?? "",

    // Business Owner
    companyRegistration: answers.q28 ?? "",

    // Retired / Homemaker / Student Occ
    travelExpenses: answers.q29 ?? "",

    // Core Qualification
    visaRefusal: answers.q30 ?? "",
    visaRefusalDetails: answers.q31 ?? "",
    overstay: answers.q32 ?? "",
    overstayDetails: answers.q33 ?? "",
    bankBalance: answers.q34 ?? "",
    tiesThailand: answers.q35 ?? "",

    // Contact
    contactPreference: answers.q36 ?? "",
    callbackTime: answers.q37 ?? "",
  };

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    console.error("APPS_SCRIPT_URL not set");
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Apps Script returned ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
