import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runBroadcast, type BroadcastRuleRow } from "@/lib/broadcast-send";
import { getAdDays } from "@/lib/ads-calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Broadcast slot cron — ticked every 5 minutes by .github/workflows/broadcast-cron.yml
 * (Vercel Hobby can't run precise sub-daily crons, so GitHub Actions curls this instead;
 * same CRON_SECRET bearer pattern as /api/cron/follow-up).
 *
 * Rules pick their own free-form "HH:MM" send times. A slot is due when the Bangkok clock
 * has REACHED it and is still inside the catch window — never before, so a rule set to
 * 16:19 can't go out at 16:15. GitHub schedules routinely run several minutes late (and
 * occasionally skip), hence a window generous enough to survive that.
 *
 * The broadcast_run unique(rule_id, slot_date, slot_time) insert is the claim: the later
 * ticks inside the same window (plus redeliveries and manual workflow_dispatch) see 23505
 * and skip, so a rule can never double-fire in one slot.
 *
 * Ad days: the claim row is still written (status 'skipped_ad') as the audit record, and
 * the CATCH-UP pass below re-fires those rules on the next non-ad day at the same slot —
 * an ad day defers a send, it doesn't delete it.
 */

const CATCH_WINDOW_MIN = 20;
const CATCHUP_LOOKBACK_DAYS = 3;

/** Bangkok wall clock: ISO date, day-of-week (0=Sun), minutes since midnight. */
function bangkokClock(now = new Date()): { iso: string; dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    dow: dowMap[get("weekday")] ?? 0,
    minutes: (parseInt(get("hour"), 10) || 0) * 60 + (parseInt(get("minute"), 10) || 0),
  };
}

const slotMinutes = (s: string): number => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** The rule's own slot that is due right now, or null. Due = the clock has passed the
 * slot by no more than CATCH_WINDOW_MIN; the latest such slot wins. */
function dueSlot(slots: string[] | null | undefined, minutes: number): string | null {
  let best: string | null = null;
  let bestLag = Infinity;
  for (const s of slots ?? []) {
    const lag = minutes - slotMinutes(s);
    if (lag >= 0 && lag <= CATCH_WINDOW_MIN && lag < bestLag) { bestLag = lag; best = s; }
  }
  return best;
}

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { iso: today, dow, minutes } = bangkokClock();

  const { data: rules, error } = await supabase
    .from("broadcast_rule")
    .select("*, campaign:campaign_id(active, start_date, end_date)")
    .eq("enabled", true)
    .eq("mode", "auto");
  if (error) {
    console.error("broadcast cron query error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }

  type CronRule = BroadcastRuleRow & {
    days_of_week: number[]; time_slots: string[];
    campaign: { active: boolean; start_date: string | null; end_date: string | null } | null;
  };
  const allRules = (rules ?? []) as CronRule[];
  const results: { rule: string; slot: string; status: string; sent?: number; total?: number }[] = [];

  // Runs an ad day swallowed, still owed at this time of day (see pass 2).
  const since = addDaysIso(today, -CATCHUP_LOOKBACK_DAYS);
  const { data: recentRuns } = await supabase
    .from("broadcast_run")
    .select("rule_id, slot_date, slot_time, status")
    .gte("slot_date", since)
    .lt("slot_date", today)
    .in("status", ["skipped_ad", "done", "partial"]);
  const recent = (recentRuns ?? []) as { rule_id: string; slot_date: string; slot_time: string; status: string }[];

  // Nothing to do at this minute → return before touching Google Calendar. With a tick
  // every 5 minutes that is the overwhelmingly common case.
  const anyScheduled = allRules.some((r) => r.days_of_week?.includes(dow) && dueSlot(r.time_slots, minutes));
  const anyOwed = recent.some((r) => r.status === "skipped_ad" && dueSlot([r.slot_time], minutes));
  if (!anyScheduled && !anyOwed) {
    return NextResponse.json({ ok: true, minutes, note: "nothing due" });
  }

  // Marketing ad day (Google Calendar) → claim the slot but send nothing, so broadcasts
  // never compete with paid traffic. Calendar failure = empty set = normal sending.
  const isAdDay = (await getAdDays(1)).has(today);

  /** Campaign window: unlinked rules always run; linked ones only while the campaign is
   * active and today is inside [start_date, end_date] (either end open). */
  const campaignOpen = (rule: CronRule): boolean => {
    const c = Array.isArray(rule.campaign) ? rule.campaign[0] : rule.campaign;
    if (!c) return true;
    if (c.active === false) return false;
    if (c.start_date && today < c.start_date) return false;
    if (c.end_date && today > c.end_date) return false;
    return true;
  };

  /** Claim + send one (rule, slot) for today. */
  async function fire(rule: CronRule, slot: string, reason: "scheduled" | "catch_up") {
    const { data: run, error: runErr } = await supabase
      .from("broadcast_run")
      .insert({
        rule_id: rule.id,
        slot_date: today,
        slot_time: slot,
        ...(isAdDay ? { status: "skipped_ad", recipients_total: 0, finished_at: new Date().toISOString() } : {}),
      })
      .select("id")
      .single();
    if (runErr) {
      if (runErr.code !== "23505") console.error("broadcast run claim error:", runErr);
      results.push({ rule: rule.name, slot, status: runErr.code === "23505" ? "already_fired" : "claim_error" });
      return;
    }
    if (isAdDay) {
      results.push({ rule: rule.name, slot, status: "skipped_ad" });
      return;
    }
    const r = await runBroadcast(rule, run.id as string);
    results.push({ rule: rule.name, slot, status: reason === "catch_up" ? "ran_catch_up" : "ran", sent: r.sent, total: r.total });
  }

  // ── Pass 1: rules scheduled for this day + slot ───────────────────────────
  const firedNow = new Set<string>(); // `${ruleId}:${slot}` — keeps pass 2 from re-firing
  for (const rule of allRules) {
    if (!rule.days_of_week?.includes(dow)) continue;
    const slot = dueSlot(rule.time_slots, minutes);
    if (!slot) continue;
    if (!campaignOpen(rule)) continue;
    firedNow.add(`${rule.id}:${slot}`);
    await fire(rule, slot, "scheduled");
  }

  // ── Pass 2: catch up sends an ad day swallowed ────────────────────────────
  // A slot skipped for ads in the last few days is re-run at the same time-of-day on the
  // next non-ad day, even if that weekday isn't in days_of_week — the send was owed, not
  // cancelled. Rules with per_customer_days are safe from double-hitting the same person.
  let caughtUp = 0;
  if (!isAdDay) {
    for (const row of recent) {
      if (row.status !== "skipped_ad") continue;
      const rule = allRules.find((r) => r.id === row.rule_id);
      if (!rule || !campaignOpen(rule)) continue;
      if (dueSlot([row.slot_time], minutes) == null) continue; // wrong time of day
      if (firedNow.has(`${rule.id}:${row.slot_time}`)) continue; // already handled by pass 1
      // Skip if a later run of that same slot already succeeded (the debt was settled).
      const settled = recent.some(
        (o) => o.rule_id === row.rule_id && o.slot_time === row.slot_time &&
               o.slot_date > row.slot_date && o.status !== "skipped_ad"
      );
      if (settled) continue;
      firedNow.add(`${rule.id}:${row.slot_time}`);
      caughtUp++;
      await fire(rule, row.slot_time, "catch_up");
    }
  }

  return NextResponse.json({ ok: true, minutes, adDay: isAdDay, caughtUp, results });
}
