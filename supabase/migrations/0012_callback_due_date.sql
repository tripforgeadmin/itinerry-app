-- 0012: structured callback slot + SLA due date on each assessment.
--  callback_datetime — the exact Bangkok slot the customer chose (call channel only; null for LINE)
--  due_date          — when the team should have responded by:
--                        LINE  → submit time + 24h
--                        call  → the chosen callback slot (already shifted past Sun/holidays)

alter table public.user_assessment
  add column if not exists callback_datetime timestamptz,
  add column if not exists due_date          timestamptz;

comment on column public.user_assessment.due_date is 'SLA deadline: LINE = +24h, call = chosen callback slot';
