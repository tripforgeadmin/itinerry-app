-- Capture two demographic fields on the contact step (ContactScreen): gender + age range.
-- Written by app/api/submit/route.ts from synthetic answer keys q3_gender / q3_age.
-- Stored (not scored): the visa rule engine does not read these. Free-text (no enum/check)
-- so the app's option set can evolve without a schema change.

alter table public.account add column if not exists gender text;
alter table public.account add column if not exists age_range text;
