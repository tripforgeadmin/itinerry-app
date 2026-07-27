import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizePhone, dialCodeOf } from "@/lib/dialCodes";

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ANONYMIZED = "[ลบแล้ว]";

/**
 * Admin edits a customer's contact info. Contact fields straddle two tables:
 * name/phone/email live on `account`, contact_preference on `user_assessment` —
 * so this route writes both. Phone is stored as the E.164 national number (trunk
 * "0" dropped), matching how /api/submit persists it, so formatPhone() reads back
 * correctly. Anonymized (PDPA-erased) accounts are refused server-side.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  const accountId = clean(body.accountId);
  const assessmentId = clean(body.assessmentId);
  if (!accountId) return NextResponse.json({ ok: false, error: "accountId required" }, { status: 400 });

  // Never edit an account whose PII has been erased for PDPA — the UI hides the
  // editor, but this is the real guard.
  const { data: existing } = await supabase
    .from("account")
    .select("full_name, nickname")
    .eq("id", accountId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: "account not found" }, { status: 404 });
  if (existing.full_name === ANONYMIZED || existing.nickname === ANONYMIZED) {
    return NextResponse.json({ ok: false, error: "account anonymized" }, { status: 409 });
  }

  const cc = clean(body.phoneCountryCode);
  const code = dialCodeOf(cc) ? cc : "+66"; // NOT NULL column — fall back to +66 on unknown/empty
  const accountPatch = {
    nickname: clean(body.nickname, 120) || null,
    full_name: clean(body.fullName, 150) || null,
    email: clean(body.email, 200) || null,
    phone: normalizePhone(clean(body.phone, 40)), // national number ("" if cleared)
    phone_country_code: code,
    updated_at: new Date().toISOString(), // no DB trigger — stamp manually
  };
  const { error: aErr } = await supabase.from("account").update(accountPatch).eq("id", accountId);
  if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });

  // contact_preference lives on user_assessment — update only when a valid value is supplied.
  const pref = clean(body.contactPreference);
  if (assessmentId && (pref === "line" || pref === "call")) {
    const { error: uErr } = await supabase
      .from("user_assessment")
      .update({ contact_preference: pref })
      .eq("id", assessmentId);
    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
