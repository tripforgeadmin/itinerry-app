import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/app/api/admin/login/route";
import { assessmentResultMessage } from "@/lib/line-messaging";
import { pushMessageLogged } from "@/lib/message-log";

type Account = { id: string; line_user_id: string | null; nationality: string | null };
type Evaluation = { pass: boolean | null; notes: string | null };

function one<T>(v: T | T[] | null): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (!token || !(await verifyAdminSession(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { assessmentId } = await request.json();
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: "missing assessmentId" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("user_assessment")
    .select("status, result_sent_at, account:account_id(id, line_user_id, nationality), visa_evaluation(pass, notes)")
    .eq("id", assessmentId)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const account = one(row.account as Account | Account[] | null);
  const evaluation = one(row.visa_evaluation as Evaluation | Evaluation[] | null);

  if (row.status === "pending_review" || evaluation?.pass == null) {
    return NextResponse.json({ ok: false, error: "not evaluated yet" }, { status: 400 });
  }

  if (row.result_sent_at) {
    return NextResponse.json({ ok: true, alreadySent: true, resultSentAt: row.result_sent_at });
  }

  if (!account?.line_user_id) {
    return NextResponse.json({ ok: false, error: "no line user id on file" }, { status: 400 });
  }

  const lang = account.nationality === "other" ? "en" : "th";
  const message = assessmentResultMessage(evaluation.pass, evaluation.notes ?? "", lang);
  const delivered = await pushMessageLogged({
    to: account.line_user_id,
    messages: [message],
    accountId: account.id,
    assessmentId,
    kind: "result",
    content: `ส่งผลการประเมิน (${evaluation.pass ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์"})`,
    sentBy: "admin",
    logFailed: true,
  });

  if (!delivered) {
    return NextResponse.json({ ok: false, error: "line push failed" }, { status: 500 });
  }

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

  return NextResponse.json({ ok: true, alreadySent: false, resultSentAt });
}
