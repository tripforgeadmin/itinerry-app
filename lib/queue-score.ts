/**
 * Work-queue priority for customers WITHOUT an appointment (booked customers always
 * outrank the scored queue). Three transparent signals, higher = handle sooner:
 *  - funnel stage (intent): BOFU/execute 30 · MOFU/ready 20 · TOFU/explore 10
 *  - travel urgency: days until the trip — ≤30d 30 · ≤60d 20 · ≤90d 10 · else 0
 *  - buying power (savings_balance bucket): ≥300k 20 · 150–300k 15 · 50–150k 10 · <50k 5
 * Max 80. Weights are deliberate: stage and urgency dominate; money breaks ties.
 */

export type QueueScore = {
  total: number;
  intentPts: number;
  travelPts: number;
  moneyPts: number;
  daysLeft: number | null;
};

const INTENT_PTS: Record<string, number> = { execute: 30, ready: 20, explore: 10 };
const MONEY_PTS: Record<string, number> = {
  "500k_1m": 20, over300k: 20, "300k_500k": 20,
  "150k_300k": 15, "50k_150k": 10, under50k: 5,
};

export function daysUntil(dateIso: string | null | undefined, todayIso: string): number | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}/.test(dateIso)) return null;
  return Math.round((Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function scoreCase(args: {
  intent: string | null;
  travelDateIso: string | null; // travel_arrival ?? study_start
  savings: string | null;
  todayIso: string;
}): QueueScore {
  const intentPts = INTENT_PTS[args.intent ?? ""] ?? 0;
  const daysLeft = daysUntil(args.travelDateIso, args.todayIso);
  const travelPts =
    daysLeft == null || daysLeft < 0 ? 0
    : daysLeft <= 30 ? 30
    : daysLeft <= 60 ? 20
    : daysLeft <= 90 ? 10
    : 0;
  const moneyPts = MONEY_PTS[args.savings ?? ""] ?? 0;
  return { total: intentPts + travelPts + moneyPts, intentPts, travelPts, moneyPts, daysLeft };
}

/** TOFU/MOFU/BOFU chip for the queue UI (intent is the journey-stage source of truth). */
export function funnelStage(intent: string | null): "BOFU" | "MOFU" | "TOFU" | "—" {
  if (intent === "execute") return "BOFU";
  if (intent === "ready") return "MOFU";
  if (intent === "explore") return "TOFU";
  return "—";
}
