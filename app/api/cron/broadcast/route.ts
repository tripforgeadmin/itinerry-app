import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runBroadcast, type BroadcastRuleRow } from "@/lib/broadcast-send";
import { getAdDays } from "@/lib/ads-calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Broadcast slot cron — fired by .github/workflows/broadcast-cron.yml at each Bangkok
 * slot (Vercel Hobby can't run 6 precise daily crons, so GitHub Actions curls this
 * instead; same CRON_SECRET bearer pattern as /api/cron/follow-up).
 *
 * GH Actions schedules drift by up to ~30 min, so the endpoint matches "now" to the
 * NEAREST slot within ±45 min rather than requiring an exact hit. The broadcast_run
 * unique(rule_id, slot_date, slot_time) insert is the claim: a duplicate invocation
 * (redelivery, manual workflow_dispatch after a scheduled hit) sees 23505 and skips,
 * so a rule can never double-fire in one slot.
 */

const SLOTS = ["09:00", "11:30", "12:30", "16:00", "16:30", "18:00", "20:00"];
const TOLERANCE_MIN = 45;

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

function nearestSlot(minutes: number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const s of SLOTS) {
    const [h, m] = s.split(":").map(Number);
    const dist = Math.abs(minutes - (h * 60 + m));
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return bestDist <= TOLERANCE_MIN ? best : null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { iso: today, dow, minutes } = bangkokClock();
  const slot = nearestSlot(minutes);
  if (!slot) {
    return NextResponse.json({ ok: true, slot: null, note: "no slot within tolerance" });
  }

  // Marketing ad day (Google Calendar) → claim the slot but send nothing, so broadcasts
  // never compete with paid traffic. Calendar failure = empty set = normal sending.
  const isAdDay = (await getAdDays(1)).has(today);

  const { data: rules, error } = await supabase
    .from("broadcast_rule")
    .select("*, campaign:campaign_id(active, start_date, end_date)")
    .eq("enabled", true)
    .eq("mode", "auto");
  if (error) {
    console.error("broadcast cron query error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }

  const results: { rule: string; status: string; sent?: number; total?: number }[] = [];

  for (const rule of (rules ?? []) as (BroadcastRuleRow & {
    days_of_week: number[]; time_slots: string[];
    campaign: { active: boolean; start_date: string | null; end_date: string | null } | null;
  })[]) {
    if (!rule.days_of_week?.includes(dow)) continue;
    if (!rule.time_slots?.includes(slot)) continue;

    // Campaign window: unlinked rules always run; linked ones only while the campaign
    // is active and today is inside [start_date, end_date] (either end open).
    const c = Array.isArray(rule.campaign) ? rule.campaign[0] : rule.campaign;
    if (c) {
      if (c.active === false) continue;
      if (c.start_date && today < c.start_date) continue;
      if (c.end_date && today > c.end_date) continue;
    }

    // Claim the slot — 23505 means another invocation got here first. On an ad day the
    // claim row itself (status 'skipped_ad') is the audit record of why nothing went out.
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
      results.push({ rule: rule.name, status: runErr.code === "23505" ? "already_fired" : "claim_error" });
      continue;
    }

    if (isAdDay) {
      results.push({ rule: rule.name, status: "skipped_ad" });
      continue;
    }

    const r = await runBroadcast(rule, run.id as string);
    results.push({ rule: rule.name, status: "ran", sent: r.sent, total: r.total });
  }

  return NextResponse.json({ ok: true, slot, results });
}
