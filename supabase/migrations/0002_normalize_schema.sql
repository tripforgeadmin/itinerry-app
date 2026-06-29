-- =====================================================================
-- 0002 — Normalize the single visa_assessments table into account / user_trip /
--        user_assessment (+ visa_questionnaire catalog, visa_criteria,
--        visa_evaluation, audit_log).
--
-- ⚠️ RECONCILIATION MIGRATION. This schema was applied DIRECTLY to the live
-- Supabase project (itinerry-webapp) on 2026-06-28 by a `normalize_schema`
-- migration that was never committed to git. This file reconstructs that live
-- state into the repo so source ↔ database agree. It is ALREADY APPLIED on the
-- live DB — do NOT re-run it there; it is for fresh environments and as the
-- source of truth. Captured from live via information_schema + pg_catalog.
-- =====================================================================

-- The old denormalized table + its enum types are replaced.
drop table if exists public.visa_assessments cascade;
drop type  if exists public.nationality_choice;
drop type  if exists public.lead_source;
drop type  if exists public.destination_country;
drop type  if exists public.visa_type;
drop type  if exists public.occupation;
drop type  if exists public.savings_band;
drop type  if exists public.lead_status;

-- ---------- account (the person) ----------
create table if not exists public.account (
  id                uuid primary key default gen_random_uuid(),
  line_user_id      text unique,
  line_display_name text,
  line_picture_url  text,
  is_friend         boolean,
  full_name         text,
  phone             text,
  email             text,
  nationality       text,
  nationality_other text,
  source            text,
  source_other      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint line_user_id_fmt_chk check (line_user_id is null or line_user_id ~ '^U[0-9a-f]{32}$')
);
create index if not exists idx_account_line_user_id on public.account (line_user_id);

-- ---------- user_trip (one destination + visa type + dates) ----------
create table if not exists public.user_trip (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.account(id),
  destination    text not null,                 -- ISO-3166 alpha-2 (q8) or legacy slug
  visa_type      text not null,                 -- q9
  travel_arrival date,                           -- q10/q13/q17
  travel_return  date,                           -- q11/q18
  study_start    date,                           -- q21
  created_at     timestamptz not null default now()
);
create index if not exists idx_user_trip_account_id on public.user_trip (account_id);
create index if not exists idx_user_trip_created_at on public.user_trip (created_at desc);

-- ---------- user_assessment (qualification + screening) ----------
create table if not exists public.user_assessment (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references public.user_trip(id),
  account_id           uuid not null references public.account(id),
  occupation           text not null,            -- q24
  visa_refused         boolean not null,         -- q30
  visa_refused_details text,                      -- q31 (readable summary)
  overstayed           boolean not null,         -- q32
  overstay_details     text,                      -- q33 (readable summary)
  savings_balance      text not null,            -- q34
  ties_thailand        text[] not null default '{}',  -- q35
  contact_preference   text not null,            -- q36
  callback_time        text,                      -- q37
  branch_answers       jsonb not null default '{}'::jsonb,
  status               text not null default 'new',
  created_at           timestamptz not null default now(),
  constraint refused_details_chk  check (visa_refused = false or visa_refused_details is not null),
  constraint overstay_details_chk check (overstayed   = false or overstay_details    is not null)
);
create index if not exists idx_user_assessment_trip    on public.user_assessment (trip_id);
create index if not exists idx_user_assessment_account on public.user_assessment (account_id);
create index if not exists idx_user_assessment_status  on public.user_assessment (status);
create index if not exists idx_user_assessment_created on public.user_assessment (created_at desc);
create index if not exists idx_user_assessment_branch  on public.user_assessment using gin (branch_answers);

-- ---------- visa_questionnaire (question catalog; seeded in 0003) ----------
create table if not exists public.visa_questionnaire (
  id               uuid primary key default gen_random_uuid(),
  question_key     text not null unique,
  legacy_id        text,
  question_text_th text not null,
  question_text_en text,
  question_type    text not null,
  section          text,
  display_order    integer,
  options          jsonb,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_visa_questionnaire_order on public.visa_questionnaire (display_order);

-- ---------- visa_criteria (scoring rules per destination/visa type) ----------
create table if not exists public.visa_criteria (
  id             uuid primary key default gen_random_uuid(),
  destination    text not null,
  visa_type      text not null,
  criteria_name  text not null,
  criteria_rules jsonb not null default '{}'::jsonb,
  min_pass_score integer,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- visa_evaluation (team scoring of an assessment) ----------
create table if not exists public.visa_evaluation (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.user_assessment(id),
  evaluated_by  text,
  score         integer,
  pass          boolean,
  result        jsonb default '{}'::jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_visa_eval_assessment on public.visa_evaluation (assessment_id);

-- ---------- audit_log ----------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  uuid,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  actor      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_created      on public.audit_log (created_at desc);
create index if not exists idx_audit_log_table_record on public.audit_log (table_name, record_id);

-- ---------- RLS (deny-by-default; writes use the service role which bypasses RLS) ----------
do $$
declare t text;
begin
  foreach t in array array['account','user_trip','user_assessment','visa_questionnaire','visa_criteria','visa_evaluation','audit_log'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force  row level security;', t);
  end loop;
end $$;
