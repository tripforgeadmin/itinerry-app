-- 0040: Google Calendar linkage for consultation bookings. Booked slots can now push a
-- real event (with a Google Meet link for online meetings) to the team's Google Calendar
-- (lib/google-calendar.ts) — nullable because the push is best-effort and gated on service
-- account env vars; a booking is always valid with these columns empty.

alter table public.consultation_booking
  add column if not exists gcal_event_id text,
  add column if not exists meet_link text;
