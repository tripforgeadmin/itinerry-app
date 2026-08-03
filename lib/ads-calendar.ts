import ical, { type VEvent } from "node-ical";
import { supabase } from "./supabase";
import { bangkokNow } from "./holidays";

/**
 * Marketing ad-schedule feed — the team Gmail's primary Google Calendar, read via its
 * "Secret address in iCal format" URL (GOOGLE_CALENDAR_ICS_URL). Zero-GCP setup: the
 * owner copies the secret URL from Calendar settings into the env var.
 *
 * Only events whose title matches the keyword list (app_config `broadcast_ad_keywords`,
 * comma-separated) count as ad days — the same calendar also holds meetings etc. that
 * must NOT block broadcasts. The broadcast cron skips slots on matched days; the admin
 * page shows the upcoming feed (matched rows highlighted) so keywords can be tuned to
 * however marketing actually titles their events.
 *
 * Failure posture: a Google outage or bad URL logs and returns nothing — broadcasts
 * proceed. Never let the calendar integration silently stop all sends.
 */

export const AD_KEYWORDS_CONFIG_KEY = "broadcast_ad_keywords";
export const DEFAULT_AD_KEYWORDS = ["แอด", "ads", "ad", "โฆษณา", "boost"];

export type CalendarEvent = {
  dateIso: string; // first day (Bangkok calendar date)
  endDateIso: string; // last day INCLUSIVE
  summary: string;
  matched: boolean;
};

export function adsCalendarEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_ICS_URL);
}

export async function fetchAdKeywords(): Promise<string[]> {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", AD_KEYWORDS_CONFIG_KEY)
    .maybeSingle();
  const list = (data?.value ?? "")
    .split(",")
    .map((k: string) => k.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : DEFAULT_AD_KEYWORDS;
}

/** A word-ish keyword like "ad" must not match inside "Thailand"; Thai keywords (no word
 * boundaries in Thai) and multi-word ones use plain substring matching. */
function titleMatches(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((k) =>
    /^[a-z0-9]+$/.test(k) ? new RegExp(`\\b${k}\\b`, "i").test(lower) : lower.includes(k)
  );
}

/** Date as Bangkok calendar day. */
function bkkDateIso(d: Date): string {
  return bangkokNow(d).iso;
}

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// Module-level cache — page loads and cron slots within 10 min share one Google fetch.
let cache: { at: number; raw: string } | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function fetchIcs(): Promise<string | null> {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!url) return null;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.raw;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "itinerry-broadcast/1.0" } });
    if (!res.ok) {
      console.error("ads calendar fetch failed:", res.status);
      return cache?.raw ?? null; // stale beats nothing
    }
    const raw = await res.text();
    cache = { at: Date.now(), raw };
    return raw;
  } catch (err) {
    console.error("ads calendar fetch error:", err);
    return cache?.raw ?? null;
  }
}

/** Events within [today - daysBehind, today + daysAhead] Bangkok days, keyword-matched.
 * daysBehind lets the admin calendar view show the current/previous month; the cron
 * keeps the default 0 (future-only). */
export async function fetchCalendarEvents(daysAhead = 14, daysBehind = 0): Promise<CalendarEvent[]> {
  const raw = await fetchIcs();
  if (!raw) return [];

  const todayIso = bangkokNow().iso;
  const windowStartIso = addDaysIso(todayIso, -daysBehind);
  const windowEndIso = addDaysIso(todayIso, daysAhead);
  let keywords: string[];
  try {
    keywords = await fetchAdKeywords();
  } catch {
    keywords = DEFAULT_AD_KEYWORDS;
  }

  const events: CalendarEvent[] = [];
  try {
    const parsed = ical.sync.parseICS(raw);
    const windowStart = new Date(`${windowStartIso}T00:00:00+07:00`);
    const windowEnd = new Date(`${windowEndIso}T23:59:59+07:00`);

    for (const raw of Object.values(parsed)) {
      if (!raw || raw.type !== "VEVENT") continue;
      const item = raw as VEvent;
      const summary = String(item.summary ?? "");
      const durationMs = (item.end?.getTime() ?? item.start?.getTime() ?? 0) - (item.start?.getTime() ?? 0);

      const pushOccurrence = (start: Date) => {
        const startIso = bkkDateIso(start);
        // DTEND is exclusive; subtract a minute so an all-day event's end lands on its last day.
        const endMs = start.getTime() + Math.max(0, durationMs - 60_000);
        const endIso = bkkDateIso(new Date(endMs));
        if (endIso < windowStartIso || startIso > windowEndIso) return;
        events.push({
          dateIso: startIso < windowStartIso ? windowStartIso : startIso,
          endDateIso: endIso > windowEndIso ? windowEndIso : endIso,
          summary,
          matched: titleMatches(summary, keywords),
        });
      };

      if (item.rrule) {
        for (const occ of item.rrule.between(windowStart, windowEnd, true)) pushOccurrence(occ);
      } else if (item.start) {
        pushOccurrence(item.start);
      }
    }
  } catch (err) {
    console.error("ads calendar parse error:", err);
    return [];
  }

  events.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  return events;
}

/** Bangkok date ISOs (within the window) on which broadcasts must be skipped. */
export async function getAdDays(daysAhead = 1): Promise<Set<string>> {
  const days = new Set<string>();
  for (const e of await fetchCalendarEvents(daysAhead)) {
    if (!e.matched) continue;
    for (let iso = e.dateIso; iso <= e.endDateIso; iso = addDaysIso(iso, 1)) days.add(iso);
  }
  return days;
}
