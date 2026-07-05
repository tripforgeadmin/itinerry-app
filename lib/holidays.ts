/**
 * Thai holiday / business-day helpers for callback scheduling — config-driven (holidays + weekly
 * days off come from the DB, editable in admin), with a hardcoded 2569 default as a safe fallback.
 *
 * All calendar logic works on Bangkok-local ISO date strings ("YYYY-MM-DD") to stay timezone-safe
 * (Thailand is a fixed UTC+7, no DST).
 */

export interface CallbackConfig {
  holidays: Set<string>; // ISO dates that are blocked
  weeklyOff: Set<number>; // recurring days off, 0 = Sunday … 6 = Saturday
}

// Fallback used server-side without a DB read, in unit tests, and if the client fetch fails.
export const DEFAULT_HOLIDAYS: string[] = [
  "2026-01-01", "2026-01-02", "2026-03-03", "2026-04-06", "2026-04-13", "2026-04-14", "2026-04-15",
  "2026-05-01", "2026-05-04", "2026-06-01", "2026-06-03", "2026-07-28", "2026-07-29", "2026-07-30",
  "2026-08-12", "2026-10-13", "2026-10-23", "2026-12-07", "2026-12-10", "2026-12-31",
];

export function makeConfig(holidays: string[] = DEFAULT_HOLIDAYS, weeklyOff: number[] = [0]): CallbackConfig {
  return { holidays: new Set(holidays), weeklyOff: new Set(weeklyOff) };
}

export const DEFAULT_CONFIG: CallbackConfig = makeConfig();

export const BUSINESS_OPEN_HOUR = 9; // 09:00
export const BUSINESS_CLOSE_HOUR = 20; // 20:00 (last selectable slot)
export const AFTERNOON_HOUR = 12; // "หลังเที่ยง" cutoff for out-of-hours submissions
export const CALLBACK_WINDOW_DAYS = 14; // date picker: today .. +2 weeks

function dayOfWeek(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function isHoliday(iso: string, cfg: CallbackConfig = DEFAULT_CONFIG): boolean {
  return cfg.holidays.has(iso);
}

export function isBusinessDay(iso: string, cfg: CallbackConfig = DEFAULT_CONFIG): boolean {
  return !cfg.weeklyOff.has(dayOfWeek(iso)) && !cfg.holidays.has(iso);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** First business day strictly after `fromIso`. */
export function nextBusinessDay(fromIso: string, cfg: CallbackConfig = DEFAULT_CONFIG): string {
  let d = addDays(fromIso, 1);
  while (!isBusinessDay(d, cfg)) d = addDays(d, 1);
  return d;
}

/** Current Bangkok-local date (ISO) and hour (0–23), regardless of device timezone. */
export function bangkokNow(now: Date = new Date()): { iso: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) || 0 };
}

/** Team "open" now — a business day within 09:00–20:00 Bangkok time. */
export function inBusinessHours(now: Date = new Date(), cfg: CallbackConfig = DEFAULT_CONFIG): boolean {
  const { iso, hour } = bangkokNow(now);
  return isBusinessDay(iso, cfg) && hour >= BUSINESS_OPEN_HOUR && hour < BUSINESS_CLOSE_HOUR;
}

/** Earliest callback date offered = next business day after today. */
export function earliestCallbackDate(now: Date = new Date(), cfg: CallbackConfig = DEFAULT_CONFIG): string {
  return nextBusinessDay(bangkokNow(now).iso, cfg);
}

/** Latest callback date offered = today + CALLBACK_WINDOW_DAYS (calendar days). */
export function maxCallbackDate(now: Date = new Date()): string {
  return addDays(bangkokNow(now).iso, CALLBACK_WINDOW_DAYS);
}

/** A date is selectable if it's a business day inside [earliest, max]. */
export function isSelectableCallbackDate(iso: string, now: Date = new Date(), cfg: CallbackConfig = DEFAULT_CONFIG): boolean {
  return isBusinessDay(iso, cfg) && iso >= earliestCallbackDate(now, cfg) && iso <= maxCallbackDate(now);
}

/**
 * Hourly slots for a chosen callback date. Full 09:00–20:00, EXCEPT the earliest day when the
 * submission is outside business hours → afternoon only (12:00–20:00). Later dates always full.
 */
export function slotsForDate(dateIso: string, now: Date = new Date(), cfg: CallbackConfig = DEFAULT_CONFIG): number[] {
  const restricted = dateIso === earliestCallbackDate(now, cfg) && !inBusinessHours(now, cfg);
  const start = restricted ? AFTERNOON_HOUR : BUSINESS_OPEN_HOUR;
  const hours: number[] = [];
  for (let h = start; h <= BUSINESS_CLOSE_HOUR; h++) hours.push(h);
  return hours;
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Bangkok-local "YYYY-MM-DD" + "HH:MM" → a UTC Date (Thailand is fixed +07:00). */
export function bangkokDateTimeToUtc(dateIso: string, hhmm: string): Date {
  return new Date(`${dateIso}T${hhmm}:00+07:00`);
}
