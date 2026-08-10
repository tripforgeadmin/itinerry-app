import { supabase } from "./supabase";
import { fetchBusyIntervals, type BusyInterval } from "./ads-calendar";
import { bangkokNow, makeConfig, type CallbackConfig } from "./holidays";
import { createCalendarEvent } from "./google-calendar";

/**
 * Consultation-slot rules (single source of truth for the Q form, the public slots API
 * and the admin queue):
 *  - 30-minute slots, 09:00–18:00 Bangkok (last start 17:30). Customer-facing copy says
 *    "~20 นาที" — the extra 10 min is the team's buffer, never shown.
 *  - Days off follow the same admin-editable calendar config as the old callback picker
 *    (holiday table + app_config callback_weekly_off; default Sundays).
 *  - Bookable horizon: today + 14 days; a slot must start ≥ 3 hours from now so the
 *    team is never surprised by an instant meeting.
 *  - Busy = timed events on the team Google Calendar (same iCal feed as the broadcast
 *    page; all-day markers like ad days do NOT block) + consultation_booking rows with
 *    status 'booked'.
 */
export const SLOT_MINUTES = 30;
export const DISPLAY_MINUTES = 20;
export const BOOKING_HORIZON_DAYS = 14;
export const MIN_LEAD_HOURS = 3;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;

/** Calendar event title for a consultation booking. `ticketId` is minted after the
 * booking (it needs the assessment's destination) — callers pass it once known, patching
 * the title in via updateCalendarEventTitle; the event is created without it first. */
export function bookingEventTitle(args: {
  channel: "phone" | "online";
  startMs: number;
  customerName?: string;
  ticketId?: string;
}): string {
  // startMs comes from a UTC epoch — format in Asia/Bangkok explicitly so e.g. a 10:30
  // Bangkok slot doesn't show as "03:30".
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(args.startMs));
  const icon = args.channel === "online" ? "💻" : "📞";
  const name = args.customerName?.trim() || "—";
  const base = `${timeLabel} ${icon} นัดคุย — ${name}`;
  return args.ticketId ? `${base} -- (${args.ticketId})` : base;
}

export type SlotInfo = { startIso: string; label: string };
/** status: "off" = weekly day off or holiday (never bookable); "full" = a normal working
 * day with zero slots left right now (busy calendar + existing bookings); "available" =
 * at least one slot open. Powers the 3-color date picker (gray / orange / blue). */
export type DayAvailability = { dateIso: string; free: number; status: "off" | "full" | "available" };

const pad = (n: number) => String(n).padStart(2, "0");

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function bangkokDow(dateIso: string): number {
  // Noon Bangkok is 05:00 UTC the same calendar day, so the UTC weekday is safe to use.
  return new Date(`${dateIso}T12:00:00+07:00`).getUTCDay();
}

/** All slot start times of one Bangkok day as ISO strings with explicit +07:00. */
function daySlotIsos(dateIso: string): string[] {
  const out: string[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      out.push(`${dateIso}T${pad(h)}:${pad(m)}:00+07:00`);
    }
  }
  return out;
}

async function loadDayOffConfig(): Promise<CallbackConfig> {
  try {
    const [{ data: hol }, { data: cfg }] = await Promise.all([
      supabase.from("holiday").select("holiday_date"),
      supabase.from("app_config").select("value").eq("key", "callback_weekly_off").maybeSingle(),
    ]);
    const holidays = (hol ?? []).map((r) => r.holiday_date as string);
    let weeklyOff: number[] = [0];
    try {
      const parsed = cfg?.value ? JSON.parse(cfg.value as string) : null;
      if (Array.isArray(parsed)) weeklyOff = parsed.map(Number).filter((n) => n >= 0 && n <= 6);
    } catch { /* keep default */ }
    return makeConfig(holidays.length ? holidays : undefined, weeklyOff);
  } catch {
    return makeConfig();
  }
}

type SlotContext = {
  cfg: CallbackConfig;
  busy: BusyInterval[];
  bookedMs: Set<number>;
  minStartMs: number;
  todayIso: string;
  maxIso: string;
};

async function buildContext(): Promise<SlotContext> {
  const todayIso = bangkokNow().iso;
  const maxIso = addDaysIso(todayIso, BOOKING_HORIZON_DAYS);
  const [cfg, busy, booked] = await Promise.all([
    loadDayOffConfig(),
    fetchBusyIntervals(BOOKING_HORIZON_DAYS + 1),
    supabase
      .from("consultation_booking")
      .select("slot_start")
      .eq("status", "booked")
      .gte("slot_start", `${todayIso}T00:00:00+07:00`),
  ]);
  return {
    cfg,
    busy,
    bookedMs: new Set(((booked.data ?? []) as { slot_start: string }[]).map((b) => Date.parse(b.slot_start))),
    minStartMs: Date.now() + MIN_LEAD_HOURS * 3_600_000,
    todayIso,
    maxIso,
  };
}

function isDayOff(dateIso: string, cfg: CallbackConfig): boolean {
  return cfg.weeklyOff.has(bangkokDow(dateIso)) || cfg.holidays.has(dateIso);
}

function freeSlotsInContext(dateIso: string, ctx: SlotContext): SlotInfo[] {
  if (dateIso < ctx.todayIso || dateIso > ctx.maxIso) return [];
  if (isDayOff(dateIso, ctx.cfg)) return [];

  const out: SlotInfo[] = [];
  for (const startIso of daySlotIsos(dateIso)) {
    const startMs = Date.parse(startIso);
    const endMs = startMs + SLOT_MINUTES * 60_000;
    if (startMs < ctx.minStartMs) continue;
    if (ctx.bookedMs.has(startMs)) continue;
    if (ctx.busy.some((b) => b.startMs < endMs && b.endMs > startMs)) continue;
    out.push({ startIso, label: startIso.slice(11, 16) });
  }
  return out;
}

/** Free slot starts for one date. */
export async function freeSlotsForDate(dateIso: string): Promise<SlotInfo[]> {
  return freeSlotsInContext(dateIso, await buildContext());
}

/** Per-day free-slot counts + status across the horizon — powers the date picker. */
export async function availabilityByDay(): Promise<DayAvailability[]> {
  const ctx = await buildContext();
  const days: DayAvailability[] = [];
  for (let i = 0; i <= BOOKING_HORIZON_DAYS; i++) {
    const dateIso = addDaysIso(ctx.todayIso, i);
    const free = freeSlotsInContext(dateIso, ctx).length;
    const status = isDayOff(dateIso, ctx.cfg) ? "off" : free > 0 ? "available" : "full";
    days.push({ dateIso, free, status });
  }
  return days;
}

/** Claim a slot. The partial unique index on (slot_start where status='booked') makes
 * this race-safe: either the insert wins or we get a conflict.
 *
 * `customerName`/`phone` are optional purely for the Google Calendar event title/description
 * (lib/google-calendar.ts) — the booking itself never depends on them. A calendar-push
 * failure never fails the booking: the row is already committed by the time it's attempted,
 * and the push is wrapped so it can only leave gcal_event_id/meet_link null on error. */
export async function createBooking(args: {
  assessmentId: string | null;
  accountId: string | null;
  channel: "phone" | "online";
  slotStartIso: string;
  customerName?: string;
  phone?: string;
}): Promise<
  | { ok: true; id: string; meetLink: string | null; gcalEventId: string | null }
  | { ok: false; reason: "taken" | "invalid" | "error" }
> {
  const startMs = Date.parse(args.slotStartIso);
  if (Number.isNaN(startMs)) return { ok: false, reason: "invalid" };

  const dateIso = args.slotStartIso.slice(0, 10);
  const valid = (await freeSlotsForDate(dateIso)).some((s) => Date.parse(s.startIso) === startMs);
  if (!valid) return { ok: false, reason: "taken" };

  const endMs = startMs + SLOT_MINUTES * 60_000;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  const { data, error } = await supabase
    .from("consultation_booking")
    .insert({
      assessment_id: args.assessmentId,
      account_id: args.accountId,
      channel: args.channel,
      slot_start: startIso,
      slot_end: endIso,
    })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique violation: someone else won the slot between check and insert.
    if (error.code === "23505") return { ok: false, reason: "taken" };
    console.error("createBooking error:", error);
    return { ok: false, reason: "error" };
  }
  const bookingId = data.id as string;
  let meetLink: string | null = null;
  let gcalEventId: string | null = null;

  try {
    const event = await createCalendarEvent({
      channel: args.channel,
      startIso,
      endIso,
      title: bookingEventTitle({ channel: args.channel, startMs, customerName: args.customerName }),
      description: [
        "จองผ่านแบบประเมิน itinerry",
        args.phone ? `โทร ${args.phone}` : null,
      ].filter(Boolean).join(" · "),
    });
    if (event) {
      meetLink = event.meetLink;
      gcalEventId = event.eventId;
      await supabase
        .from("consultation_booking")
        .update({ gcal_event_id: event.eventId, meet_link: event.meetLink })
        .eq("id", bookingId);
    }
  } catch (err) {
    // Never let a calendar-side failure undo an already-committed booking.
    console.error("booking calendar push error:", err);
  }

  return { ok: true, id: bookingId, meetLink, gcalEventId };
}
