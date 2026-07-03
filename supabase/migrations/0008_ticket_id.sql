-- 0008: case ticket ids — ITN-<CTY>-<yymmdd>-<nnnn>
-- ticket_id stored on the assessment; nnnn comes from an atomic per-day counter
-- (next_ticket_number upserts+increments in one statement, so concurrent submits
-- can never mint the same number).

alter table public.user_assessment
  add column if not exists ticket_id text unique;

create table if not exists public.ticket_counter (
  day text primary key,          -- Bangkok-local yymmdd, e.g. '260703'
  n   integer not null default 0
);
alter table public.ticket_counter enable row level security;
alter table public.ticket_counter force row level security;

create or replace function public.next_ticket_number(p_day text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ticket_counter as tc (day, n) values (p_day, 1)
  on conflict (day) do update set n = tc.n + 1
  returning n;
$$;

revoke all on function public.next_ticket_number(text) from public, anon, authenticated;
