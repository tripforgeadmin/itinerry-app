-- =====================================================================
-- 0007 — PDPA consent timestamp
-- Records when the user gave consent to data collection (form submit).
-- =====================================================================
alter table public.account
  add column if not exists consented_at timestamptz;
