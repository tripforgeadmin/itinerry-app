-- 0025: per-case UTM attribution — capture which ad campaign a customer actually clicked
-- through to reach this specific submission. Stored on user_assessment (not account) because
-- it is insert-only + immutable "how this case originated at submit time" — same shape as
-- entry_source (0022) — and JOINs cleanly to visa_evaluation.assessment_id for
-- campaign -> assessment-result reporting (which campaign brings Group-2 personas).
--
-- These are the REAL click-derived params (utm_*) — distinct from account.source (q7), which is
-- the customer's self-reported "how did you hear about us" (platform-level, often inaccurate).
-- Plain text, nullable, no check constraint — consistent with this repo's convention (see 0022).

alter table public.user_assessment
  add column if not exists utm_source   text;
alter table public.user_assessment
  add column if not exists utm_medium   text;
alter table public.user_assessment
  add column if not exists utm_campaign text;
alter table public.user_assessment
  add column if not exists utm_term     text;
alter table public.user_assessment
  add column if not exists utm_content  text;
alter table public.user_assessment
  add column if not exists referrer     text;
  -- document.referrer / ?ref= at capture time — coarse fallback when no utm_* present.

-- Indexes for future campaign/source reporting (aggregate stays in GA4; these support
-- ad-hoc Supabase queries joining attribution to outcomes).
create index if not exists idx_user_assessment_utm_campaign on public.user_assessment (utm_campaign);
create index if not exists idx_user_assessment_utm_source   on public.user_assessment (utm_source);
