-- =====================================================================
-- 0010 — Case-status vocabulary reconciliation + assessment-result
--        evaluation support + LINE result-delivery tracking.
--
-- Fixes a LIVE bug: StatusUpdater.tsx/AdminTable.tsx used status values
-- new/contacted/qualified/won/lost, but app/api/admin/status/route.ts's
-- VALID_STATUSES was new/contacted/in_progress/completed/rejected — so
-- most status-change clicks (qualified/won/lost) were silently rejected
-- server-side. This migration + lib/status.ts replace BOTH lists with one
-- shared vocabulary:
--   pending_review (default, automatic) -> evaluated -> contacted
--     -> pending_decision -> win / lost
-- =====================================================================

-- ---------- 1. user_assessment: new delivery-tracking column ----------
-- Mirrors ticket_notified_at's role but for the assessment-result push
-- (kept separate — two independent messages, two independent guards).
alter table public.user_assessment
  add column if not exists result_sent_at timestamptz;

-- ---------- 2. user_assessment: normalize existing status values ----------
-- Conservative and idempotent (safe to re-run): only rows matching a known
-- legacy value are touched; rows already in the new vocabulary are untouched.
update public.user_assessment set status = 'pending_review'   where status = 'new';
update public.user_assessment set status = 'evaluated'        where status = 'qualified';
update public.user_assessment set status = 'win'              where status = 'won';
-- Defensive coverage for the OTHER (mismatched) legacy allow-list that
-- app/api/admin/status/route.ts used to enforce, in case any row was ever
-- set to one of these via direct SQL/backfill rather than the broken UI:
update public.user_assessment set status = 'pending_decision' where status = 'in_progress';
update public.user_assessment set status = 'win'              where status = 'completed';
update public.user_assessment set status = 'lost'             where status = 'rejected';
-- Final safety net: anything still outside the new 6-value vocabulary falls
-- back to pending_review rather than being silently left unrecognized.
update public.user_assessment
  set status = 'pending_review'
  where status not in ('pending_review','evaluated','contacted','pending_decision','win','lost');

-- ---------- 3. user_assessment: flip the default for new submissions ----------
alter table public.user_assessment
  alter column status set default 'pending_review';

-- NOTE: intentionally NOT adding a `check` constraint on status — consistent
-- with this repo's migration-0002 decision to drop DB enum types in favor of
-- plain `text` + app-level validation (see lib/status.ts's VALID_STATUSES,
-- enforced in app/api/admin/status/route.ts and app/api/admin/evaluate/route.ts).

-- ---------- 4. visa_evaluation: make it usable as "current evaluation" ----------
-- One evaluation row per assessment, upserted by app/api/admin/evaluate/route.ts.
alter table public.visa_evaluation
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'visa_evaluation_assessment_id_key'
  ) then
    alter table public.visa_evaluation
      add constraint visa_evaluation_assessment_id_key unique (assessment_id);
  end if;
end $$;
