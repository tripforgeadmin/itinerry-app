-- 0035: Broadcast System — LINE campaign/rule manager + inbound message logging +
-- structured Problem/Solution case comments.
--
-- Three feature groups land together because they share schema:
--  (a) broadcast_campaign / broadcast_rule / broadcast_run — admin-managed targeted sends,
--      scheduled in Bangkok-time slots by a GitHub Actions cron (Vercel Hobby can't run
--      6 precise daily crons) hitting /api/cron/broadcast.
--  (b) inbound logging — line_message_log grows a `direction` column so customer replies
--      finally land in the same per-customer timeline; unlocks the "no reply in 72h"
--      broadcast condition and future reply-rate / time-to-reply metrics.
--  (c) comment_category / case_comment — staff pick Problem/Solution categories instead of
--      free text, making "Pain Point = เงินไม่พอ" a queryable broadcast condition.
--
-- Enum-ish text columns are allow-list validated in the API routes, no DB enums/checks,
-- per this repo's convention (see 0026).

-- ── (a) Broadcast core ──────────────────────────────────────────────────────────

create table if not exists public.broadcast_campaign (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_date date,
  end_date   date,
  channel    text not null default 'line',  -- LINE-only this phase; column reserved for SMS/email later
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.broadcast_campaign enable row level security;
alter table public.broadcast_campaign force row level security;

create table if not exists public.broadcast_rule (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid references public.broadcast_campaign(id) on delete set null,
  name              text not null,
  mode              text not null,           -- auto | group | one_to_one
  enabled           boolean not null default false,
  days_of_week      int[] not null default '{0,1,2,3,4,5,6}',  -- 0=Sunday, JS getDay() convention
  time_slots        text[] not null default '{}',
    -- subset of {'09:00','11:30','12:30','16:00','16:30','18:00','20:00'} (Asia/Bangkok wall clock);
    -- the "Auto" preset in the UI writes {'09:00','16:00'}
  segment           jsonb,                   -- {countries, visaTypes, ageRanges, statuses, serviceNeeds, journeyStages}
  condition         jsonb,                   -- {type:'no_reply_72h'} | {type:'pain_point', keys:[...]} | {type:'days_left_by_country'}
  message_th        text,
  message_en        text,
  target_account_id uuid references public.account(id),  -- one_to_one mode only
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.broadcast_rule enable row level security;
alter table public.broadcast_rule force row level security;

-- One row per (rule, slot) firing. The unique constraint IS the double-fire guard: the cron
-- inserts first and treats a 23505 as "another invocation already claimed this slot".
-- Manual/1-on-1 triggers use slot_time 'manual:<iso>' so they never collide with cron slots.
create table if not exists public.broadcast_run (
  id               uuid primary key default gen_random_uuid(),
  rule_id          uuid not null references public.broadcast_rule(id) on delete cascade,
  slot_date        date not null,
  slot_time        text not null,
  status           text not null default 'running',  -- running | done | partial | failed
  recipients_total int,
  sent             int not null default 0,
  failed           int not null default 0,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz,
  unique (rule_id, slot_date, slot_time)
);
alter table public.broadcast_run enable row level security;
alter table public.broadcast_run force row level security;

-- Country → visa processing lead time → "days left" trigger threshold, e.g. US takes ~60 days
-- to process so nudge when the trip is ≤75 days out; UK ~14 days → nudge at ≤30.
-- visa_type '*' = applies to every visa type for that destination.
create table if not exists public.country_visa_lead_time (
  destination            text not null,  -- ISO-3166 alpha-2, matches trip.destination
  visa_type              text not null default '*',
  processing_days        int not null,
  trigger_threshold_days int not null,
  active                 boolean not null default true,
  primary key (destination, visa_type)
);
alter table public.country_visa_lead_time enable row level security;
alter table public.country_visa_lead_time force row level security;

insert into public.country_visa_lead_time (destination, visa_type, processing_days, trigger_threshold_days) values
  ('US', '*', 60, 75),
  ('GB', '*', 14, 30),
  ('AU', '*', 30, 45)
on conflict (destination, visa_type) do nothing;

-- ── (b) Inbound logging ─────────────────────────────────────────────────────────

-- direction turns the outbound-only log into the full conversation timeline.
-- Inbound rows: kind='inbound', sent_by='customer', delivered=true.
alter table public.line_message_log
  add column if not exists direction        text not null default 'outbound',  -- outbound | inbound
  add column if not exists broadcast_run_id uuid references public.broadcast_run(id);

create index if not exists line_message_log_direction_idx
  on public.line_message_log (account_id, direction, created_at desc);

-- Per-recipient dedupe inside one broadcast run: a resumed 'partial' run re-resolves the
-- segment but insert-conflicts on customers it already reached.
create unique index if not exists line_message_log_run_recipient_uniq
  on public.line_message_log (broadcast_run_id, account_id)
  where broadcast_run_id is not null;

alter table public.account
  add column if not exists last_inbound_at   timestamptz,                        -- denormalized copy of the latest inbound row, for cheap 72h checks
  add column if not exists broadcast_opt_out boolean not null default false;     -- excluded from every broadcast; PDPA-adjacent but distinct from anonymize

-- ── (c) Structured case comments ────────────────────────────────────────────────

-- Flat taxonomy (no parent_key), admin-managed like lost_reason_option (0018).
create table if not exists public.comment_category (
  key        text primary key,
  kind       text not null,  -- problem | solution
  label_th   text not null,
  label_en   text,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.comment_category enable row level security;
alter table public.comment_category force row level security;

insert into public.comment_category (key, kind, label_th, label_en, sort_order) values
  ('not_enough_money',     'problem',  'เงินไม่พอ',                 'Not enough money',        10),
  ('documents_incomplete', 'problem',  'เอกสารไม่ครบ',              'Documents incomplete',    20),
  ('timing_too_tight',     'problem',  'เวลากระชั้นเกินไป',          'Timing too tight',        30),
  ('history_issue',        'problem',  'ประวัติการเดินทาง/วีซ่า',     'Travel/visa history',     40),
  ('undecided',            'problem',  'ยังไม่ตัดสินใจ/เทียบเจ้าอื่น', 'Undecided/comparing',     50),
  ('other_problem',        'problem',  'อื่นๆ',                     'Other',                   90),
  ('advise_savings_plan',  'solution', 'แนะนำแผนการเงิน/เงินเข้าบัญชี', 'Advise savings plan',     10),
  ('document_checklist',   'solution', 'ให้เช็กลิสต์เอกสาร',          'Document checklist',      20),
  ('expedite_plan',        'solution', 'วางแผนยื่นแบบเร่งด่วน',       'Expedite plan',           30),
  ('offer_promotion',      'solution', 'เสนอโปรโมชั่น/ส่วนลด',        'Offer promotion',         40),
  ('other_solution',       'solution', 'อื่นๆ',                     'Other',                   90)
on conflict (key) do nothing;

-- One row per staff comment entry: Problem [category + note] + Solution [category + note].
-- Either half may be empty; category keys validated against comment_category in the route.
create table if not exists public.case_comment (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.user_assessment(id),
  problem_category  text references public.comment_category(key),
  problem_note      text,
  solution_category text references public.comment_category(key),
  solution_note     text,
  staff             text,  -- label only, not authentication (same as contact_log.staff)
  created_at        timestamptz not null default now()
);
create index if not exists idx_case_comment_assessment on public.case_comment (assessment_id, created_at desc);
alter table public.case_comment enable row level security;
alter table public.case_comment force row level security;

-- Service-needs stage for segment targeting (เตรียมเอกสาร / พร้อมยื่น / เร่งด่วน).
alter table public.user_assessment
  add column if not exists service_needs text;  -- prepare_docs | ready_to_submit | urgent
