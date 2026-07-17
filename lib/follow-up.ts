// Follow-up cadence for the `follow_up` pipeline status. Single source of truth shared by
// the cron (app/api/cron/follow-up) and the admin UI badges (AdminTable + ticket detail).
//
// Cadence, measured from when the case ENTERED follow_up (latest status_history transition
// to 'follow_up'): day 3 → auto-send LINE nudge #1, day 5 → nudge #2. After #2, once a short
// grace passes, the admin sees a "ready to close" badge and closes Closed Lost manually — the
// system never auto-closes. follow_up_count (0/1/2) gates the sends so the cron is idempotent.
//
// PURE MODULE — no supabase/next import, so the client AdminTable can import the badge helper.

import type { Lang } from "@/lib/i18n";

/** Days after entering follow_up when each auto-nudge is due. Index 0 = nudge #1, 1 = #2. */
export const FOLLOW_UP_SEND_DAYS = [3, 5] as const;
/** Extra days to wait after nudge #2 before flagging the case "ready to close". */
export const FOLLOW_UP_CLOSE_GRACE_DAYS = 2;
export const FOLLOW_UP_MAX_SENDS = FOLLOW_UP_SEND_DAYS.length;

const DAY_MS = 86_400_000;

function daysSince(enteredAt: string | null | undefined): number | null {
  if (!enteredAt) return null;
  const ms = new Date(enteredAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return (Date.now() - ms) / DAY_MS;
}

/**
 * Which auto-nudge is due right now (1 or 2), or null if none. `count` = follow_up_count so
 * far, `enteredAt` = when it entered follow_up. Pure timing decision — the caller checks LINE
 * reachability and does the send.
 */
export function nextFollowUpDue(count: number, enteredAt: string | null | undefined): 1 | 2 | null {
  const days = daysSince(enteredAt);
  if (days == null) return null;
  if (count <= 0 && days >= FOLLOW_UP_SEND_DAYS[0]) return 1;
  if (count === 1 && days >= FOLLOW_UP_SEND_DAYS[1]) return 2;
  return null;
}

/** True once both nudges are sent and the post-#2 grace has elapsed — admin should close. */
export function followUpReadyToClose(
  status: string,
  count: number,
  enteredAt: string | null | undefined
): boolean {
  if (status !== "follow_up" || count < FOLLOW_UP_MAX_SENDS) return false;
  const days = daysSince(enteredAt);
  return days != null && days >= FOLLOW_UP_SEND_DAYS[FOLLOW_UP_MAX_SENDS - 1] + FOLLOW_UP_CLOSE_GRACE_DAYS;
}

/** Admin badge label when the case is ready to close, else null. */
export function followUpCloseBadge(
  status: string,
  count: number,
  enteredAt: string | null | undefined,
  lang: Lang = "th"
): string | null {
  if (!followUpReadyToClose(status, count, enteredAt)) return null;
  return lang === "en" ? "ready to close" : "ครบกำหนดปิด";
}
