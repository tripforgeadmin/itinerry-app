import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/line";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  const body = await request.json();
  const { answers } = body;

  const payload = {
    timestamp: new Date().toISOString(),
    lineUserId: profile?.userId ?? "",
    lineDisplayName: profile?.displayName ?? "",
    // Personal info
    fullName: answers.fullName ?? "",
    nationality: answers.nationality ?? "",
    phone: answers.phone ?? "",
    email: answers.email ?? "",
    source: answers.source ?? "",
    // Branching
    occupation: answers.occupation ?? "",
    visaType: answers.visaType ?? "",
    destination: answers.destination === "other"
      ? (answers.destination_other ?? "อื่นๆ")
      : (answers.destination ?? ""),
    // Financial
    monthlyIncome: answers.monthlyIncome ?? "",
    bankBalance: answers.bankBalance ?? "",
    hasProperty: answers.hasProperty ?? "",
    // Travel history
    prevVisaRefusal: answers.prevVisaRefusal ?? "",
    prevTravel: answers.prevTravel ?? "",
    // Visa-specific
    tripDuration: answers.tripDuration ?? "",
    travelPurpose: answers.travelPurpose ?? "",
    hasAcceptanceLetter: answers.hasAcceptanceLetter ?? "",
    studyDuration: answers.studyDuration ?? "",
    hasJobOffer: answers.hasJobOffer ?? "",
    englishLevel: answers.englishLevel ?? "",
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
