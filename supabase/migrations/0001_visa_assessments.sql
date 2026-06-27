-- =====================================================================
-- Itinerry Visa Assessment — Supabase schema
-- Source of truth for values: lib/questions.ts (the strings the app submits),
-- cross-checked against the Google Forms PDF and the form logic tree.
--
-- ⚠️ PREREQUISITE: The app currently POSTs to Google Apps Script
-- (app/api/submit/route.ts -> APPS_SCRIPT_URL), NOT Supabase, and it sends a
-- FLAT, RENAMED payload with "" for unanswered fields and comma-joined strings
-- for multi-selects. To populate this table the submit route must be rewritten
-- to insert via the SERVICE ROLE key and to:
--   1) coerce "" -> NULL,
--   2) split multi-select strings -> arrays,
--   3) send q4/q4_other and q7/q7_other separately (don't pre-resolve),
--   4) build `branch_answers` as a JSON object keyed by question id,
--   5) forward pictureUrl (session) and isFriend (cookie).
-- See "Prerequisite route changes" in the chat summary.
-- =====================================================================

-- ---------- ENUM TYPES (closed-choice questions) ----------
create type public.nationality_choice  as enum ('thai', 'other');
create type public.lead_source         as enum ('facebook','instagram','tiktok','google','referral','other');
create type public.destination_country as enum ('schengen','uk','usa','canada','australia','nz','japan','korea','china','taiwan','india','dubai','saudi','qatar','other');
create type public.visa_type           as enum ('tourist','visitor','business','student');
create type public.occupation          as enum ('employee','government','freelance','business_owner','retired','homemaker','student_occ');
create type public.savings_band        as enum ('under50k','50k_150k','150k_300k','over300k');
-- Sales follow-up lifecycle (for the team, not from the form)
create type public.lead_status         as enum ('new','contacted','qualified','won','lost');
-- NOTE: q36 contact_preference & q37 callback_time are kept as TEXT (not enum):
-- the LIVE Google Form has a stray "Option 3" on q36 and an "Other:" write-in on
-- q37 that the Next.js app does not, so an enum would reject real form data.

-- ---------- MAIN TABLE ----------
create table public.visa_assessments (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),

  -- ===== LINE identity (from session JWT / cookie) =====
  line_user_id         text,        -- "U" + 32 hex; nullable (anonymous submit possible)
  line_display_name    text,
  line_picture_url     text,        -- available in session JWT; route must forward it
  is_friend            boolean,     -- from isFriend cookie; route must forward it (nullable = unknown)

  -- ===== S1 · Personal (q3–q7) — everyone =====
  full_name            text not null,                        -- q3
  nationality          public.nationality_choice not null,   -- q4  (route must send 'thai'/'other', not resolved text)
  nationality_other    text,                                 -- q4_other (when nationality='other')
  phone                text not null,                        -- q5
  email                text,                                 -- q6 (nullable; trust client validation)
  source               public.lead_source not null,          -- q7
  source_other         text,                                 -- q7_other (when source='other')

  -- ===== S2 · Destination + Visa type (q8–q9) — everyone =====
  destination          public.destination_country not null,  -- q8
  visa_type            public.visa_type not null,            -- q9  (BRANCH selector 1)

  -- ===== Travel dates — promoted to typed columns (only one branch applies) =====
  travel_arrival       date,   -- q10 tourist / q13 visitor / q17 business
  travel_return        date,   -- q11 tourist / q18 business
  study_start          date,   -- q21 student

  -- ===== S3 · Occupation (q24) — everyone =====
  occupation           public.occupation not null,           -- q24 (BRANCH selector 2)

  -- ===== S5 · Core qualification (q30–q35) — everyone =====
  visa_refused         boolean not null,                     -- q30
  visa_refused_details text,                                 -- q31 (only when visa_refused)
  overstayed           boolean not null,                     -- q32
  overstay_details     text,                                 -- q33 (only when overstayed)
  savings_balance      public.savings_band not null,         -- q34
  ties_thailand        text[] not null default '{}',         -- q35 multi-select (array of codes)

  -- ===== S6/S7 · Contact (q36–q37) — TEXT, see enum note above =====
  contact_preference   text not null,                        -- q36 ('line' | 'call' | stray)
  callback_time        text,                                 -- q37 ('morning'|'afternoon'|'evening'|free text)

  -- ===== Sparse categorical branch answers, keyed by question id =====
  -- e.g. {"q14":"citizen_pr","q15":"family","q16":["passport","bank"],"q19":"yes",
  --       "q12":["uk","schengen"],"q22":"received","q25":"complete","q29":"parents"}
  branch_answers       jsonb not null default '{}'::jsonb,

  -- ===== Sales follow-up =====
  status               public.lead_status not null default 'new',

  -- ---------- integrity guards (conditional fields) ----------
  constraint nationality_other_chk check (nationality <> 'other'  or nationality_other  is not null),
  constraint source_other_chk      check (source      <> 'other'  or source_other       is not null),
  constraint refused_details_chk   check (visa_refused = false     or visa_refused_details is not null),
  constraint overstay_details_chk  check (overstayed   = false     or overstay_details    is not null),
  constraint line_user_id_fmt_chk  check (line_user_id is null     or line_user_id ~ '^U[0-9a-f]{32}$')
);

-- ---------- INDEXES ----------
create index idx_va_line_user_id on public.visa_assessments (line_user_id);
create index idx_va_created_at   on public.visa_assessments (created_at desc);
create index idx_va_status       on public.visa_assessments (status);
create index idx_va_visa_type    on public.visa_assessments (visa_type);
create index idx_va_destination  on public.visa_assessments (destination);
create index idx_va_branch_gin   on public.visa_assessments using gin (branch_answers);

-- ---------- ROW LEVEL SECURITY ----------
-- Writes happen server-side in /api/submit using the SERVICE ROLE (bypasses RLS).
-- anon/authenticated get NOTHING (deny-by-default): RLS on + no permissive policy.
alter table public.visa_assessments enable row level security;
alter table public.visa_assessments force  row level security;

-- (Optional) staff dashboard read via Supabase Auth — enable when needed:
-- create policy "staff can read assessments"
--   on public.visa_assessments for select to authenticated
--   using ((auth.jwt() ->> 'role') = 'itinerry_staff');
