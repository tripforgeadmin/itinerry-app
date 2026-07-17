-- 0024: Optional "my dates aren't fixed yet" checkbox on the tourist/visitor/business
-- travel-dates screen (arrival + return only — student's single study-start date has no
-- equivalent checkbox). Nullable so existing rows (submitted before this shipped) read as
-- "unknown", not "no".
alter table public.user_trip
  add column if not exists flexible_dates boolean;
