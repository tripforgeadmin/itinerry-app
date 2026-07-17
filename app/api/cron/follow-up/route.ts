import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { pushMessageLogged } from "@/lib/message-log";
import { salesFollowUpMessage } from "@/lib/line-messaging";
import { nextFollowUpDue } from "@/lib/follow-up";

export const dynamic = "force-dynamic";

/**
 * Daily cron: auto-send the sales follow-up nudges for cases sitting in `follow_up`.
 *
 * For each follow_up case, timing is measured from when it entered the status (latest
 * status_history transition to 'follow_up'): day 3 → nudge #1, day 5 → nudge #2. Each send
 * bumps follow_up_count so re-runs never double-send. Auto-send only works for LINE-reachable
 * customers (friend of the OA); phone-only leads are skipped here — the admin list's
 * "ready to close" badge covers those. The system never auto-closes: after nudge #2 the admin
 * confirms Closed Lost manually.
 *
 * Auth: Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
type Dict = Record<string, unknown>;
function one(v: unknown): Dict | null {
  return ((Array.isArray(v) ? v[0] : v) ?? null) as Dict | null;
}

/** When the case entered follow_up = latest status_history row with to_status 'follow_up'. */
function followUpEnteredAt(history: unknown): string | null {
  const arr = Array.isArray(history) ? (history as { changed_at: string; to_status: string }[]) : [];
  let max: string | null = null;
  for (const h of arr) {
    if (h.to_status !== "follow_up") continue;
    if (max == null || h.changed_at > max) max = h.changed_at;
  }
  return max;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("user_assessment")
    .select(
      "id, account_id, follow_up_count, account:account_id(line_user_id, is_friend, nationality), status_history(changed_at, to_status)"
    )
    .eq("status", "follow_up");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0, skipped = 0, ready = 0;

  for (const r of (rows ?? []) as Dict[]) {
    const count = (r.follow_up_count as number) ?? 0;
    const enteredAt = followUpEnteredAt(r.status_history);
    const due = nextFollowUpDue(count, enteredAt);

    if (due == null) {
      if (count >= 2) ready++; // both nudges sent — waiting on the admin to close
      continue;
    }

    const account = one(r.account);
    const lineId = account?.line_user_id as string | undefined;
    // Phone-only / unfriended leads can't be pushed — badge reminder handles them.
    if (!lineId || account?.is_friend === false) {
      skipped++;
      continue;
    }

    const lang = account?.nationality === "other" ? "en" : "th";
    const msg = salesFollowUpMessage(due, lang);
    const delivered = await pushMessageLogged({
      to: lineId,
      messages: [msg],
      accountId: r.account_id as string,
      assessmentId: r.id as string,
      kind: "follow_up",
      content: msg.text,
      sentBy: "system",
    });

    if (!delivered) {
      skipped++;
      continue;
    }

    await supabase
      .from("user_assessment")
      .update({ follow_up_count: due, follow_up_last_at: new Date().toISOString() })
      .eq("id", r.id as string);
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped, ready });
}
