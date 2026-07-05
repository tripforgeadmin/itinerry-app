-- 0014: human-entered strengths / improvement points for the customer healthcheck report.
-- Manual-family columns on visa_evaluation (same family as pass/notes) — the auto rule-engine
-- never touches these; they map 1:1 onto the "จุดแข็งของคุณ" / "ที่เราจะช่วยเสริม" PDF sections.
alter table public.visa_evaluation
  add column if not exists strengths jsonb not null default '[]'::jsonb,
  add column if not exists improvements jsonb not null default '[]'::jsonb;
