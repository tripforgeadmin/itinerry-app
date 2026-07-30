import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type Account = { id: string; line_user_id: string | null; is_friend: boolean | null };

function one<T>(v: T | T[] | null): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** Message history for the CUSTOMER behind an assessment — all tickets, oldest first. */
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const assessmentId = request.nextUrl.searchParams.get("assessmentId");
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: "missing assessmentId" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("account:account_id(id, line_user_id, is_friend)")
    .eq("id", assessmentId)
    .single();
  if (error || !row) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const account = one(row.account as Account | Account[] | null);
  if (!account) {
    return NextResponse.json({ ok: false, error: "no account" }, { status: 404 });
  }

  const [{ data: messages }, { data: tickets }] = await Promise.all([
    supabase
      .from("line_message_log")
      .select("id, assessment_id, kind, content, sent_by, delivered, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase
      .from("user_assessment")
      .select("id, ticket_id")
      .eq("account_id", account.id),
  ]);

  const ticketById = Object.fromEntries((tickets ?? []).map((t) => [t.id, t.ticket_id ?? ""]));

  return NextResponse.json({
    ok: true,
    messages: messages ?? [],
    ticketById,
    // compose box needs both to be true — no LINE identity or unfriended → can't push
    canSend: !!account.line_user_id && account.is_friend !== false,
    isFriend: account.is_friend,
  });
}
