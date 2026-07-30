import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { pushMessageLogged } from "@/lib/message-log";

export const dynamic = "force-dynamic";

const MAX_LEN = 250;

type Account = { id: string; line_user_id: string | null };

function one<T>(v: T | T[] | null): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** Free-text admin message to the customer over LINE — logged win or lose, never
 * touches case status (unlike the send-result flow). */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { assessmentId, text } = await request.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!assessmentId || !trimmed || trimmed.length > MAX_LEN) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("account:account_id(id, line_user_id)")
    .eq("id", assessmentId)
    .single();
  if (error || !row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const account = one(row.account as Account | Account[] | null);
  if (!account?.line_user_id) {
    return NextResponse.json({ ok: false, error: "no line user id on file" }, { status: 400 });
  }

  const delivered = await pushMessageLogged({
    to: account.line_user_id,
    messages: [{ type: "text", text: trimmed }],
    accountId: account.id,
    assessmentId,
    kind: "manual",
    content: trimmed,
    sentBy: "admin",
    logFailed: true, // failed sends show as red bubbles, not silent drops
  });

  return NextResponse.json({ ok: true, delivered });
}
