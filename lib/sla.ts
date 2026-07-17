// Internal stage-aging SLA: how long a case may sit in a mid-pipeline status before
// it's flagged "stale" in the admin list. This is separate from the customer-facing
// 24h result-send SLA (lib/status.ts isOverdue) — pending_review has that one, and
// win/lost are closed, so neither appears here. Thresholds are admin-editable at
// /admin/sla (stored in app_config key `sla_stage_hours`); the values below are the
// fallbacks used when nothing is configured.
//
// PURE MODULE — no supabase import, so the client AdminTable can import staleBadge().
// Server readers do the app_config query themselves and pass the value to parseStageHours.

import type { Lang } from "@/lib/i18n";

export const SLA_STAGE_HOURS_KEY = "sla_stage_hours";

// Keyed by StatusValue; only the active mid-pipeline statuses.
export const DEFAULT_STAGE_HOURS: Record<string, number> = {
  evaluated: 12,
  contacted: 48,
  follow_up: 72, // 3 days → first follow-up nudge (team cadence: chase at day 3, again at day 5)
  pending_decision: 168, // 7 days
};

export const SLA_STAGES = ["evaluated", "contacted", "follow_up", "pending_decision"] as const;

/** Merge a stored JSON value over the defaults — keep only known stages with a finite
 * value >= 0 (0 turns that stage's aging check off). Bad JSON → defaults. */
export function parseStageHours(value: string | null | undefined): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_STAGE_HOURS };
  if (!value) return out;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      for (const s of SLA_STAGES) {
        const n = Number((parsed as Record<string, unknown>)[s]);
        if (Number.isFinite(n) && n >= 0) out[s] = n;
      }
    }
  } catch {
    /* keep defaults */
  }
  return out;
}

const HOUR_MS = 60 * 60 * 1000;

/** Badge label when the case has sat in its current status longer than the stage
 * threshold, else null. `enteredAt` = when it entered the current status (latest
 * status_history.changed_at, fallback created_at). Evaluated against Date.now() at
 * render time, like isOverdue. */
export function staleBadge(
  status: string,
  enteredAt: string | null | undefined,
  thresholds: Record<string, number>,
  lang: Lang = "th"
): string | null {
  const limit = thresholds[status];
  if (!limit || limit <= 0 || !enteredAt) return null;
  const enteredMs = new Date(enteredAt).getTime();
  if (!Number.isFinite(enteredMs)) return null;
  const ageMs = Date.now() - enteredMs;
  if (ageMs <= limit * HOUR_MS) return null;
  const hours = Math.floor(ageMs / HOUR_MS);
  if (hours >= 48) {
    const d = Math.floor(hours / 24);
    return lang === "en" ? `idle ${d}d` : `ค้าง ${d} วัน`;
  }
  return lang === "en" ? `idle ${hours}h` : `ค้าง ${hours} ชม.`;
}
