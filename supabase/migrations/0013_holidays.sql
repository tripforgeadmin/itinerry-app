-- 0013: admin-manageable holiday calendar for callback scheduling.
--   holiday                       — specific blocked dates (public holidays + ad-hoc team days off)
--   app_config.callback_weekly_off — recurring weekly days off (JSON array of 0=Sun..6=Sat; default [0])

create table if not exists public.holiday (
  holiday_date date primary key,
  name         text not null default '',
  created_at   timestamptz not null default now()
);
alter table public.holiday enable row level security;
alter table public.holiday force row level security;

-- seed 2569 (2026) — สลค. announcement (incl. substitution days)
insert into public.holiday (holiday_date, name) values
  ('2026-01-01','วันขึ้นปีใหม่'),
  ('2026-01-02','วันหยุดพิเศษ'),
  ('2026-03-03','วันมาฆบูชา'),
  ('2026-04-06','วันจักรี'),
  ('2026-04-13','สงกรานต์'),
  ('2026-04-14','สงกรานต์'),
  ('2026-04-15','สงกรานต์'),
  ('2026-05-01','วันแรงงาน'),
  ('2026-05-04','วันฉัตรมงคล'),
  ('2026-06-01','ชดเชยวันวิสาขบูชา'),
  ('2026-06-03','วันเฉลิมฯ พระบรมราชินี'),
  ('2026-07-28','วันเฉลิมฯ ในหลวง ร.10'),
  ('2026-07-29','วันอาสาฬหบูชา'),
  ('2026-07-30','วันเข้าพรรษา'),
  ('2026-08-12','วันแม่แห่งชาติ'),
  ('2026-10-13','วันนวมินทรมหาราช'),
  ('2026-10-23','วันปิยมหาราช'),
  ('2026-12-07','ชดเชยวันชาติ/วันพ่อ'),
  ('2026-12-10','วันรัฐธรรมนูญ'),
  ('2026-12-31','วันสิ้นปี')
on conflict (holiday_date) do nothing;

-- recurring weekly days off (default Sunday only)
insert into public.app_config (key, value) values ('callback_weekly_off', '[0]')
on conflict (key) do nothing;
