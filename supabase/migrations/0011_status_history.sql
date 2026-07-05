-- =====================================================================
-- 0011: Status history — timeline of user_assessment.status transitions
-- =====================================================================
-- Dedicated, purpose-built table (NOT the generic audit_log trigger target):
-- audit_log fires unconditionally on every INSERT/UPDATE/DELETE of
-- account/user_trip/user_assessment, including unrelated field writes
-- (ticket_notified_at, result_sent_at, evaluate upserts, etc.), and its
-- `actor` column is always the literal 'system' — not useful for rendering
-- a clean, human-readable "status changed from X to Y at T" timeline in
-- the admin UI. status_history rows are inserted explicitly, only when
-- user_assessment.status actually changes, by:
--   - app/api/admin/status/route.ts   (manual StatusUpdater changes)
--   - app/api/admin/evaluate/route.ts (automatic pending_review -> evaluated)
-- =====================================================================

create table public.status_history (
  id            uuid        primary key default gen_random_uuid(),
  assessment_id uuid        not null references public.user_assessment(id) on delete cascade,
  from_status   text,
  to_status     text        not null,
  changed_at    timestamptz not null default now()
);

create index idx_status_history_assessment
  on public.status_history (assessment_id, changed_at desc);

-- Only service-role can read (bypasses RLS); anon/authenticated cannot —
-- consistent with 0006_audit_log.sql's approach.
alter table public.status_history enable row level security;
