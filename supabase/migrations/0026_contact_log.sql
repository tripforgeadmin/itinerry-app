-- 0026: contact_log — append-only record of each outreach ATTEMPT on a case (called, no answer,
-- asked to be called back, replied on LINE, …). Distinct from status_history (which records status
-- TRANSITIONS): a case can be attempted many times without its status changing — the exact gap that
-- left ~35 cases stuck in "contacted" with no visibility into what had been tried.
--
-- Plain text outcome + optional free-text note + optional staff name (like user_assessment.
-- manual_entry_staff, 0022 — NOT authentication, just a label). Outcome allow-list validated in
-- app/api/admin/contact-log/route.ts, no DB-level enum/check, per this repo's convention.

create table if not exists public.contact_log (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.user_assessment(id),
  outcome        text not null,
    -- reached | no_answer | callback_requested | line_replied | wrong_number | other
  note           text,
  staff          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_contact_log_assessment on public.contact_log (assessment_id, created_at desc);

-- RLS on with no policy, matching every other table in this database. The admin routes reach
-- contact_log only through the service-role key, which bypasses RLS, so this changes nothing for
-- the app — it just keeps the outreach notes off the PostgREST anon surface that Supabase exposes
-- for every table by default.
alter table public.contact_log enable row level security;
