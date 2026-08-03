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
      .select("id, assessment_id, kind, direction, content, sent_by, delivered, created_at, media_path, media_type")
      .eq("account_id", account.id)
      // newest 300, reversed below — ascending+limit would drop the LATEST rows once a
      // customer's history (now including the OA-export backfill) exceeds the cap
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("user_assessment")
      .select("id, ticket_id")
      .eq("account_id", account.id),
  ]);

  const ticketById = Object.fromEntries((tickets ?? []).map((t) => [t.id, t.ticket_id ?? ""]));
  messages?.reverse(); // back to chronological for the chat panel

  // Private bucket → short-lived signed URLs, one batch call for every media row.
  const mediaPaths = (messages ?? []).map((m) => m.media_path).filter(Boolean) as string[];
  let signedByPath: Record<string, string> = {};
  if (mediaPaths.length) {
    const { data: signed } = await supabase.storage
      .from("line-media")
      .createSignedUrls(mediaPaths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath[s.path] = s.signedUrl;
    }
  }

  return NextResponse.json({
    ok: true,
    messages: (messages ?? []).map((m) => ({
      ...m,
      media_url: m.media_path ? (signedByPath[m.media_path] ?? null) : null,
      media_path: undefined, // internal detail; the client only needs the signed URL
    })),
    ticketById,
    // compose box needs both to be true — no LINE identity or unfriended → can't push
    canSend: !!account.line_user_id && account.is_friend !== false,
    isFriend: account.is_friend,
  });
}
