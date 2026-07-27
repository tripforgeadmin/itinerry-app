-- 0030: Quote credit terms + salesperson — fields from the company's real quotation
-- form (examquotation.pdf): "เครดิต: N วัน" and "ผู้ขาย: <ชื่อ>". credit_days drives
-- the "โปรดชำระเงินภายในวันที่ …" line on the PDF (quote_date + credit_days).
-- sales_person is free text, same convention as user_assessment.manual_entry_staff
-- (no per-admin accounts exist).

alter table public.quote
  add column if not exists credit_days  int,
  add column if not exists sales_person text;
