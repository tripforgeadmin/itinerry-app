/**
 * Thai public-holiday calendar + business-day / callback-slot helpers, shared by the client
 * (ContactScreen slot picker) and the server (submit route due-date computation).
 *
 * All calendar logic works on Bangkok-local ISO date strings ("YYYY-MM-DD") to stay timezone-safe
 * (Thailand is a fixed UTC+7, no DST). "Business day" = any day that is NOT a Sunday and NOT a
 * public holiday — Saturdays count, since the team offers callback slots then.
 */

// วันหยุดราชการ/นักขัตฤกษ์ (รวมวันหยุดชดเชย). Extend each year. Source: สลค. announcement.
const HOLIDAYS = new Set<string>([
  // 2569 (2026)
  "2026-01-01", // วันขึ้นปีใหม่
  "2026-01-02", // วันหยุดพิเศษ
  "2026-03-03", // วันมาฆบูชา
  "2026-04-06", // วันจักรี
  "2026-04-13", // สงกรานต์
  "2026-04-14", // สงกรานต์
  "2026-04-15", // สงกรานต์
  "2026-05-01", // วันแรงงาน
  "2026-05-04", // วันฉัตรมงคล
  "2026-06-01", // ชดเชยวันวิสาขบูชา
  "2026-06-03", // วันเฉลิมฯ สมเด็จพระนางเจ้าฯ พระบรมราชินี
  "2026-07-28", // วันเฉลิมฯ ในหลวง ร.10
  "2026-07-29", // วันอาสาฬหบูชา
  "2026-07-30", // วันเข้าพรรษา
  "2026-08-12", // วันแม่แห่งชาติ
  "2026-10-13", // วันนวมินทรมหาราช
  "2026-10-23", // วันปิยมหาราช
  "2026-12-07", // ชดเชยวันชาติ/วันพ่อ
  "2026-12-10", // วันรัฐธรรมนูญ
  "2026-12-31", // วันสิ้นปี
]);

export const BUSINESS_OPEN_HOUR = 9; // 09:00
export const BUSINESS_CLOSE_HOUR = 20; // 20:00 (last selectable callback slot)
export const AFTERNOON_HOUR = 12; // "หลังเที่ยง" cutoff for out-of-hours submissions

export function isHoliday(iso: string): boolean {
  return HOLIDAYS.has(iso);
}

/** Day of week for an ISO date (0 = Sunday), computed via a UTC anchor to avoid tz drift. */
function dayOfWeek(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function isBusinessDay(iso: string): boolean {
  return dayOfWeek(iso) !== 0 && !isHoliday(iso);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** First business day strictly after `fromIso` (skips Sundays + holidays). */
export function nextBusinessDay(fromIso: string): string {
  let d = addDays(fromIso, 1);
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** Current Bangkok-local date (ISO) and hour (0–23), regardless of the device timezone. */
export function bangkokNow(now: Date = new Date()): { iso: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) || 0 };
}

/** Is the team "open" right now — a business day within 09:00–20:00 Bangkok time? */
export function inBusinessHours(now: Date = new Date()): boolean {
  const { iso, hour } = bangkokNow(now);
  return isBusinessDay(iso) && hour >= BUSINESS_OPEN_HOUR && hour < BUSINESS_CLOSE_HOUR;
}

/**
 * Callback-slot offer for a submission happening `now`:
 *  - date  = next business day
 *  - hours = 09:00–20:00 if submitted in business hours, else 12:00–20:00 (afternoon only)
 */
export function callbackSlots(now: Date = new Date()): { date: string; hours: number[] } {
  const { iso } = bangkokNow(now);
  const date = nextBusinessDay(iso);
  const start = inBusinessHours(now) ? BUSINESS_OPEN_HOUR : AFTERNOON_HOUR;
  const hours: number[] = [];
  for (let h = start; h <= BUSINESS_CLOSE_HOUR; h++) hours.push(h);
  return { date, hours };
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Bangkok-local "YYYY-MM-DD" + "HH:MM" → a UTC Date (Thailand is fixed +07:00). */
export function bangkokDateTimeToUtc(dateIso: string, hhmm: string): Date {
  return new Date(`${dateIso}T${hhmm}:00+07:00`);
}
