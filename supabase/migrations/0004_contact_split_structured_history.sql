-- =====================================================================
-- 0004 — Contact split, phone country code, structured visa history.
--
-- Follows 0002_normalize_schema (tables account / user_trip / user_assessment).
-- NOT YET APPLIED to the live DB — apply via Supabase MCP after the normalized
-- submit route + admin wiring is ready and a data backup is taken.
--
-- Supports frontend changes on branch ruth:
--   #9  full name split into first/last; phone gains a dial-code prefix → account
--   #7  refused / overstay multi-country list (JSONB), keeping the readable
--       *_details text summary → user_assessment
--   #3  destination already TEXT on user_trip → NO migration needed.
-- Additive only (nullable / defaulted columns).
-- =====================================================================

-- ---------- #9 · name split (account) ----------
alter table public.account add column if not exists first_name text;
alter table public.account add column if not exists last_name  text;

update public.account
   set first_name = split_part(full_name, ' ', 1),
       last_name  = nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 2)), '')
 where full_name is not null and first_name is null;

-- ---------- #9 · phone country code (account) ----------
alter table public.account
  add column if not exists phone_country_code text not null default '+66';

-- ---------- #7 · structured refused / overstay history (user_assessment) ----------
-- visa_refused_entries: [{ "country": "fr", "year": "2022" }, ...]
-- overstay_entries:     [{ "country": "jp", "year": "2021", "days": "12" }, ...]
alter table public.user_assessment add column if not exists visa_refused_entries jsonb;
alter table public.user_assessment add column if not exists overstay_entries     jsonb;
