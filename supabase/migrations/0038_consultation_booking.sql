-- 0038: Consultation booking — the Q form's contact step becomes a real appointment
-- booking (phone call or online meeting) instead of "receive result via LINE".
--
-- Slots are 30 minutes internally (customer-facing copy says ~20 min; the gap is the
-- team's buffer). Availability = working hours minus timed events on the team Google
-- Calendar (same iCal feed the broadcast page reads) minus rows here with status
-- 'booked'. One live booking per slot is enforced by a partial unique index — the
-- insert either wins the slot or conflicts, no read-then-write race.

create table public.consultation_booking (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.user_assessment(id) on delete set null,
  account_id    uuid references public.account(id) on delete set null,
  channel       text not null check (channel in ('phone', 'online')),
  slot_start    timestamptz not null,
  slot_end      timestamptz not null,
  status        text not null default 'booked'
                check (status in ('booked', 'done', 'cancelled', 'no_show')),
  note          text,
  created_at    timestamptz not null default now()
);

create unique index uq_consultation_booking_slot
  on public.consultation_booking (slot_start)
  where status = 'booked';

create index idx_consultation_booking_upcoming
  on public.consultation_booking (slot_start, status);

alter table public.consultation_booking enable row level security;
alter table public.consultation_booking force  row level security;
-- No policies on purpose: service-role only, same posture as the other tables.
