import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { assessmentId, pass, notes, strengths, improvements } = await request.json();
  if (!assessmentId || typeof pass !== "boolean" || typeof notes !== "string" || !notes.trim()) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  // จุดแข็ง / ที่เราจะช่วยเสริม — itemized lines that map 1:1 onto the customer healthcheck
  // PDF, so the caps here (5 items × 150 chars) are layout guarantees, not arbitrary limits.
  const toItems = (v: unknown): string[] | null => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) return null;
    const items = (v as string[]).map((x) => x.trim()).filter(Boolean);
    if (items.length > 5 || items.some((x) => x.length > 150)) return null;
    return items;
  };
  const strengthItems = toItems(strengths);
  const improvementItems = toItems(improvements);
  if (!strengthItems || !improvementItems) {
    return NextResponse.json({ ok: false, error: "invalid strengths/improvements" }, { status: 400 });
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
      {
        assessment_id: assessmentId,
        pass,
        notes: notes.trim(),
        strengths: strengthItems,
        improvements: improvementItems,
        updated_at: new Date().toISOString(),
      },
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

    const { error: historyError } = await supabase
      .from("status_history")
      .insert({ assessment_id: assessmentId, from_status: assessment.status, to_status: nextStatus });
    if (historyError) console.error("status_history insert failed:", historyError);
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
