-- 0021: Closed Lost — coverage-gap detail (destination country + visa type), shown only when
-- lost_reason_l2 = 'coverage_gap' ("ไม่รองรับประเภทวีซ่า/ประเทศ").

alter table public.user_assessment
  add column if not exists lost_destination_country text,  -- ISO 3166-1 alpha-2 (lib/countries.ts)
  add column if not exists lost_visa_type            text;
