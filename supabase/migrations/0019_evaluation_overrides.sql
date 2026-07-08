-- 0018: agent-overridable strength dropdowns — INTERNAL decision-support only.
-- Never surfaced on the customer healthcheck card: lib/healthcheck-data.ts builds that
-- card from visa_evaluation.strengths/improvements/notes ONLY (see its header comment);
-- these columns must never be read there.
--
-- Nullable = "no override yet" -> the admin UI falls back to displaying the auto
-- rule-engine's computed value (visa_evaluation.result._colors.ties / .pillar_funding /
-- .pillar_risk / .approvability_band). Plain text, no DB enum/check constraint —
-- consistent with migration 0002's removal of enum types and migration 0010's explicit
-- note against adding a status check constraint. Allowed values are enforced in
-- app/api/admin/evaluate/route.ts only:
--   override_ties / override_funding / override_risk : 'g' | 'y' | 'r'
--   override_band                                     : 'High' | 'Med' | 'Low'
alter table public.visa_evaluation
  add column if not exists override_ties    text,
  add column if not exists override_funding text,
  add column if not exists override_risk    text,
  add column if not exists override_band    text;
