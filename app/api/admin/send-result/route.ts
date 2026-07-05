import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { pushMessageLogged } from "@/lib/message-log";

/**
 * Send the evaluation result to the customer over LINE: the Visa Health Check card as an
 * image (exported client-side from the card DOM — the browser is the only renderer that
 * shapes Thai correctly) followed by the admin's message. On delivery the case advances
 * evaluated → contacted automatically.
 */

const MAX_MESSAGE = 500;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel request budget; LINE allows 10MB
const MAX_PREVIEW_BYTES = 1 * 1024 * 1024; // LINE previewImageUrl hard limit

type Account = { id: string; line_user_id: string | null; nationality: string | null };
type Evaluation = { pass: boolean | null; strengths: unknown; improvements: unknown };

function one<T>(v: T | T[] | null): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

function decodeDataUrl(v: unknown, maxBytes: number): Buffer | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  return buf.length > 0 && buf.length <= maxBytes ? buf : null;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { assessmentId, message, image, preview } = await request.json();
  const text = typeof message === "string" ? message.trim() : "";
  const imageBuf = decodeDataUrl(image, MAX_IMAGE_BYTES);
  const previewBuf = decodeDataUrl(preview, MAX_PREVIEW_BYTES);
  if (!assessmentId || !text || text.length > MAX_MESSAGE || !imageBuf || !previewBuf) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("user_assessment")
    .select("status, result_sent_at, ticket_id, account:account_id(id, line_user_id, nationality), visa_evaluation(pass, strengths, improvements)")
    .eq("id", assessmentId)
    .single();
  if (fetchError || !row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const account = one(row.account as Account | Account[] | null);
  const evaluation = one(row.visa_evaluation as Evaluation | Evaluation[] | null);
  const evaluated =
    evaluation?.pass != null &&
    Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 &&
    Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0;

  if (row.status === "pending_review" || !evaluated) {
    return NextResponse.json({ ok: false, error: "not evaluated yet" }, { status: 400 });
  }
  if (row.result_sent_at) {
    return NextResponse.json({ ok: true, alreadySent: true, resultSentAt: row.result_sent_at });
  }
  if (!account?.line_user_id) {
    return NextResponse.json({ ok: false, error: "no line user id on file" }, { status: 400 });
  }

  // host the card image publicly — LINE fetches image messages by URL, not by upload
  const stamp = Date.now();
  const base = `${row.ticket_id ?? assessmentId}-${stamp}`;
  const bucket = supabase.storage.from("result-images");
  const [up1, up2] = await Promise.all([
    bucket.upload(`${base}.jpg`, imageBuf, { contentType: "image/jpeg", upsert: true }),
    bucket.upload(`${base}-preview.jpg`, previewBuf, { contentType: "image/jpeg", upsert: true }),
  ]);
  if (up1.error || up2.error) {
    console.error("result image upload error:", up1.error ?? up2.error);
    return NextResponse.json({ ok: false, error: "image upload failed" }, { status: 500 });
  }
  const originalContentUrl = bucket.getPublicUrl(`${base}.jpg`).data.publicUrl;
  const previewImageUrl = bucket.getPublicUrl(`${base}-preview.jpg`).data.publicUrl;

  const delivered = await pushMessageLogged({
    to: account.line_user_id,
    messages: [
      { type: "image", originalContentUrl, previewImageUrl },
      { type: "text", text },
    ],
    accountId: account.id,
    assessmentId,
    kind: "result",
    content: `[รูป] ผลตรวจสุขภาพวีซ่า · ${row.ticket_id ?? ""}\n${text}`,
    sentBy: "admin",
    logFailed: true,
  });

  if (!delivered) {
    return NextResponse.json(
      { ok: false, error: "ส่งไม่สำเร็จ — ลูกค้าอาจยังไม่ได้เพิ่มเพื่อน LINE OA" },
      { status: 502 },
    );
  }

  // atomic once-only claim, same guard as before
  const resultSentAt = new Date().toISOString();
  const { data: claimed, error: updateError } = await supabase
    .from("user_assessment")
    .update({ result_sent_at: resultSentAt })
    .eq("id", assessmentId)
    .is("result_sent_at", null)
    .select("id");
  if (updateError) return NextResponse.json({ ok: false }, { status: 500 });
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true, alreadySent: true });
  }

  // advance the funnel: only evaluated → contacted (never regress later stages)
  if (row.status === "evaluated") {
    const { error: statusError } = await supabase
      .from("user_assessment")
      .update({ status: "contacted" })
      .eq("id", assessmentId)
      .eq("status", "evaluated");
    if (!statusError) {
      const { error: historyError } = await supabase
        .from("status_history")
        .insert({ assessment_id: assessmentId, from_status: "evaluated", to_status: "contacted" });
      if (historyError) console.error("status_history insert failed:", historyError);
    }
  }

  return NextResponse.json({ ok: true, alreadySent: false, resultSentAt });
}
