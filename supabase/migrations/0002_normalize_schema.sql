-- =====================================================================
-- 0002: Normalize schema — replace visa_assessments with 7 tables
-- =====================================================================

-- Drop old table and enum types
drop table if exists public.visa_assessments;
drop type if exists public.nationality_choice;
drop type if exists public.lead_source;
drop type if exists public.destination_country;
drop type if exists public.visa_type;
drop type if exists public.occupation;
drop type if exists public.savings_band;
drop type if exists public.lead_status;

-- ─── 1. account ──────────────────────────────────────────────────────
-- User identity + personal info. Upserted on each submit by line_user_id.
create table public.account (
  id                uuid        primary key default gen_random_uuid(),
  line_user_id      text        unique,          -- "U" + 32 hex; null = anonymous
  line_display_name text,
  line_picture_url  text,
  is_friend         boolean,                     -- added itinerry LINE OA as friend?
  full_name         text,
  phone             text,
  email             text,
  nationality       text,                        -- 'thai' | 'other'
  nationality_other text,
  source            text,                        -- facebook | instagram | tiktok | google | referral | other
  source_other      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint line_user_id_fmt_chk
    check (line_user_id is null or line_user_id ~ '^U[0-9a-f]{32}$')
);

-- ─── 2. visa_questionnaire ───────────────────────────────────────────
-- Question template reference. Frontend uses questions.ts; this is for
-- admin visibility and future DB-driven rendering.
create table public.visa_questionnaire (
  id               uuid        primary key default gen_random_uuid(),
  question_key     text        unique not null,  -- semantic: 'visa_type', 'occupation'
  legacy_id        text,                         -- 'q9', 'q24' — maps to questions.ts
  question_text_th text        not null,
  question_text_en text,
  question_type    text        not null,         -- text|radio|dropdown|date|multiCheckbox|consent|email|tel
  section          text,                         -- S0|S1|S2|S2A|S2B|S2C|S2D|S3|S4A|S4B|S4C|S4D|S5|S6|S7
  display_order    int,
  options          jsonb,                        -- [{value, label_th, label_en, emoji?}]
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- ─── 3. user_trip ────────────────────────────────────────────────────
-- One trip intent (destination + visa type + dates).
-- Separated so one account can have multiple trips in the future.
create table public.user_trip (
  id             uuid        primary key default gen_random_uuid(),
  account_id     uuid        not null references public.account(id),
  destination    text        not null,           -- schengen | uk | usa | ...
  visa_type      text        not null,           -- tourist | visitor | business | student
  travel_arrival date,
  travel_return  date,
  study_start    date,
  created_at     timestamptz not null default now()
);

-- ─── 4. user_assessment ──────────────────────────────────────────────
-- Submitted form answers. Created once per submit (together with user_trip).
-- branch_answers uses semantic question_key (not q-numbers):
-- e.g. {"visitor_host_status":"citizen_pr","tourist_previous_visas":["uk","schengen"]}
create table public.user_assessment (
  id                   uuid        primary key default gen_random_uuid(),
  trip_id              uuid        not null references public.user_trip(id),
  account_id           uuid        not null references public.account(id),
  occupation           text        not null,
  visa_refused         boolean     not null,
  visa_refused_details text,
  overstayed           boolean     not null,
  overstay_details     text,
  savings_balance      text        not null,
  ties_thailand        text[]      not null default '{}',
  contact_preference   text        not null,
  callback_time        text,
  branch_answers       jsonb       not null default '{}'::jsonb,
  status               text        not null default 'new',  -- new|contacted|qualified|won|lost
  created_at           timestamptz not null default now(),
  constraint refused_details_chk
    check (visa_refused = false or visa_refused_details is not null),
  constraint overstay_details_chk
    check (overstayed = false or overstay_details is not null)
);

-- ─── 5. visa_criteria ────────────────────────────────────────────────
-- Evaluation rules/scoring formula per destination + visa type.
-- Populated by team separately.
create table public.visa_criteria (
  id             uuid        primary key default gen_random_uuid(),
  destination    text        not null,
  visa_type      text        not null,
  criteria_name  text        not null,
  criteria_rules jsonb       not null default '{}'::jsonb,
  min_pass_score int,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ─── 6. visa_evaluation ──────────────────────────────────────────────
-- Admin's evaluation result for each assessment.
-- Distinct from user_assessment: this is the admin's judgment, not user's answers.
create table public.visa_evaluation (
  id            uuid        primary key default gen_random_uuid(),
  assessment_id uuid        not null references public.user_assessment(id),
  evaluated_by  text,                            -- admin identifier
  score         int,
  pass          boolean,
  result        jsonb       default '{}'::jsonb,  -- {breakdown: [...], recommendation: "..."}
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─── 7. audit_log ────────────────────────────────────────────────────
create table public.audit_log (
  id         uuid        primary key default gen_random_uuid(),
  table_name text        not null,
  record_id  uuid,
  action     text        not null,               -- INSERT | UPDATE | DELETE
  old_data   jsonb,
  new_data   jsonb,
  actor      text,
  created_at timestamptz not null default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────
create index idx_account_line_user_id      on public.account (line_user_id);
create index idx_user_trip_account_id      on public.user_trip (account_id);
create index idx_user_trip_created_at      on public.user_trip (created_at desc);
create index idx_user_assessment_trip      on public.user_assessment (trip_id);
create index idx_user_assessment_account   on public.user_assessment (account_id);
create index idx_user_assessment_status    on public.user_assessment (status);
create index idx_user_assessment_created   on public.user_assessment (created_at desc);
create index idx_user_assessment_branch    on public.user_assessment using gin (branch_answers);
create index idx_visa_eval_assessment      on public.visa_evaluation (assessment_id);
create index idx_audit_log_table_record    on public.audit_log (table_name, record_id);
create index idx_audit_log_created         on public.audit_log (created_at desc);
create index idx_visa_questionnaire_order  on public.visa_questionnaire (display_order);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────
-- All writes go through SERVICE ROLE (bypasses RLS). anon gets nothing.
alter table public.account           enable row level security;
alter table public.account           force  row level security;
alter table public.visa_questionnaire enable row level security;
alter table public.visa_questionnaire force  row level security;
alter table public.user_trip          enable row level security;
alter table public.user_trip          force  row level security;
alter table public.user_assessment    enable row level security;
alter table public.user_assessment    force  row level security;
alter table public.visa_criteria      enable row level security;
alter table public.visa_criteria      force  row level security;
alter table public.visa_evaluation    enable row level security;
alter table public.visa_evaluation    force  row level security;
alter table public.audit_log          enable row level security;
alter table public.audit_log          force  row level security;
