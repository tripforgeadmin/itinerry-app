-- 0039: Per-customer send frequency on broadcast rules.
--
-- Until now the only dedupe was per RUN (line_message_log unique on broadcast_run_id +
-- account_id), so a daily rule re-sent the same text to the same customer every single
-- day they stayed in the segment. Rules like "trip deadline approaching" need to fire
-- daily (so each customer is caught on the day they enter the window) while reaching any
-- one person only once — that is exactly what this column expresses.
--
--   null  → no suppression, send every run (the pre-0039 behaviour; existing rows keep it)
--   0     → once per customer, ever, for this rule
--   N > 0 → skip a customer who already got this rule's message within the last N days
--
-- Also note: 0035's schema comment still describes the fixed seven time_slots. As of this
-- change time_slots accepts any "HH:00"/"HH:30" (validated in /api/admin/broadcast), and
-- the GitHub Actions cron runs every 30 minutes instead of seven fixed times.

alter table public.broadcast_rule
  add column if not exists per_customer_days integer;

comment on column public.broadcast_rule.per_customer_days is
  'null = send every run; 0 = once per customer ever; N = once per customer per N days';
