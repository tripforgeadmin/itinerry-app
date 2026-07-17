-- 0023: Follow-up cadence tracking for the `follow_up` pipeline status.
--
-- A daily cron (/api/cron/follow-up) auto-sends up to 2 LINE nudges to the customer —
-- at day 3 and day 5 after the case entered `follow_up` — and bumps follow_up_count each
-- time. After the 2nd nudge the admin list/ticket shows a "ready to close" badge; the admin
-- confirms the Closed Lost manually (system never auto-closes). Counters reset to 0 on any
-- manual status change (see app/api/admin/status/route.ts) so a re-entry starts fresh.
--
-- Plain columns, no enum/check — consistent with this repo's status-column convention.
alter table public.user_assessment
  add column if not exists follow_up_count   int not null default 0,
  add column if not exists follow_up_last_at timestamptz;
