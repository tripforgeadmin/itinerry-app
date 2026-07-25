-- 0028: Salesforce-style product/service master + quotations.
-- (Applied to the live DB as "product_quote" on 2026-07-25, same day 0027_add_gender_age_range
-- landed from main — renumbered here to keep the sequence linear.)
--
--   product           ≈ Product2          (one row per sellable item; fee variants are
--                                          separate products carrying destination/visa_type,
--                                          the vanilla-Salesforce answer to per-country fees)
--   price_book        ≈ Pricebook2        (Standard + e.g. "กลุ่ม 4+ ท่าน" for the 4+-person tier)
--   price_book_entry  ≈ PricebookEntry    (product × book → unit price)
--   quote             ≈ Quote             (assessment_id = optional Quote↔Opportunity link;
--                                          customer_* are snapshots so standalone quotes work)
--   quote_line_item   ≈ QuoteLineItem     (snapshots product name/price/unit/taxable — master
--                                          edits must never mutate an issued quote)
--
-- Status/family/etc. are plain text with allow-lists in lib/quote-status.ts and
-- lib/products.ts — no DB-level enum/check, per this repo's convention (see 0010/0026).
-- VAT: line items snapshot product.taxable; VAT is computed on taxable lines only
-- (itinerry service fees), never on pass-through embassy/VAC fees (lib/quote-math.ts).

create table if not exists public.product (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,           -- SKU, e.g. 'FULL-PACKAGE', 'FEE-EMB-FR-TOURIST'
  name        text not null,                  -- Thai display name (quote/PDF-facing)
  name_en     text,
  description text,
  family      text,                           -- 'core' | 'addon' | 'fee' (lib/products.ts)
  destination text,                           -- ISO alpha-2, only for country-bound fees
  visa_type   text,                           -- e.g. 'tourist', only for visa-type-bound fees
  unit        text,                           -- 'ท่าน' / 'ครั้ง' / 'ฉบับ' … (≈ QuantityUnitOfMeasure)
  taxable     boolean not null default true,  -- false = pass-through fee, excluded from VAT
  active      boolean not null default true,  -- soft-deactivate; history keeps resolving
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.price_book (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_standard boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
-- Exactly one standard book. A partial unique index is a structural invariant
-- (like the (product, book) uniqueness below), not a value constraint.
create unique index if not exists price_book_one_standard
  on public.price_book (is_standard) where is_standard;

create table if not exists public.price_book_entry (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.product(id) on delete cascade,
  price_book_id uuid not null references public.price_book(id) on delete cascade,
  unit_price    numeric(12,2) not null,
  currency      text not null default 'THB',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, price_book_id)
);

create table if not exists public.quote (
  id               uuid primary key default gen_random_uuid(),
  quote_number     text not null unique,           -- QT-<yymmdd>-<nnn>, next_quote_number()
  name             text not null,                  -- subject line
  status           text not null default 'draft',  -- lib/quote-status.ts
  assessment_id    uuid references public.user_assessment(id) on delete set null,
  account_id       uuid references public.account(id) on delete set null,
  customer_name    text not null,
  customer_phone   text,
  customer_email   text,
  customer_address text,
  price_book_id    uuid not null references public.price_book(id),
  quote_date       date not null,
  valid_until      date,
  currency         text not null default 'THB',
  -- Stored totals (Salesforce stores them too). Always recomputed server-side from the
  -- lines by lib/quotes.ts recomputeQuoteTotals(); never trusted from the client.
  subtotal         numeric(12,2) not null default 0,
  discount_amount  numeric(12,2) not null default 0,  -- quote-level discount, THB
  vat_rate         numeric(5,2)  not null default 0,  -- 0 or 7
  vat_amount       numeric(12,2) not null default 0,
  grand_total      numeric(12,2) not null default 0,
  notes            text,
  terms            text,
  sent_at          timestamptz,
  decided_at       timestamptz,                       -- accepted/rejected/expired/canceled at
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists quote_assessment_idx on public.quote (assessment_id);

create table if not exists public.quote_line_item (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quote(id) on delete cascade,
  product_id   uuid references public.product(id) on delete set null,
  product_code text,
  product_name text not null,
  description  text,
  quantity     numeric(10,2) not null default 1,
  unit         text,
  unit_price   numeric(12,2) not null,
  discount_pct numeric(5,2) not null default 0,       -- per-line %, Salesforce Discount parity
  taxable      boolean not null default true,
  line_total   numeric(12,2) not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists quote_line_item_quote_idx on public.quote_line_item (quote_id);

-- Append-only transition journal, same shape as status_history / contact_log.
create table if not exists public.quote_status_history (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quote(id) on delete cascade,
  from_status text,
  to_status   text not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Per-day quote-number counter; mirrors 0008 ticket_counter / next_ticket_number.
create table if not exists public.quote_counter (
  day text primary key,          -- Bangkok-local yymmdd
  n   integer not null default 0
);

create or replace function public.next_quote_number(p_day text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.quote_counter as qc (day, n) values (p_day, 1)
  on conflict (day) do update set n = qc.n + 1
  returning n;
$$;

revoke all on function public.next_quote_number(text) from public, anon, authenticated;

-- RLS: enable + force everywhere, zero policies — all access is service-role (repo convention).
alter table public.product enable row level security;
alter table public.product force row level security;
alter table public.price_book enable row level security;
alter table public.price_book force row level security;
alter table public.price_book_entry enable row level security;
alter table public.price_book_entry force row level security;
alter table public.quote enable row level security;
alter table public.quote force row level security;
alter table public.quote_line_item enable row level security;
alter table public.quote_line_item force row level security;
alter table public.quote_status_history enable row level security;
alter table public.quote_status_history force row level security;
alter table public.quote_counter enable row level security;
alter table public.quote_counter force row level security;

-- ── Seed ──────────────────────────────────────────────────────────────────────
-- Catalog mirrors www.itinerry.com as of 2026-07-25. Fee products are examples of
-- the FEE-EMB-<CC>-<TYPE> / FEE-VAC-<CC> convention and are seeded WITHOUT prices
-- (no price_book_entry → not selectable on a quote until admin sets a price).

insert into public.price_book (name, description, is_standard)
select 'Standard', 'ราคามาตรฐาน', true
where not exists (select 1 from public.price_book where is_standard);

insert into public.price_book (name, description)
select 'กลุ่ม 4+ ท่าน', 'ราคาพิเศษเมื่อยื่นพร้อมกันตั้งแต่ 4 ท่านขึ้นไป'
where not exists (select 1 from public.price_book where name = 'กลุ่ม 4+ ท่าน');

insert into public.product (code, name, name_en, family, unit, taxable, sort_order) values
  ('FULL-PACKAGE',    'บริการให้คำปรึกษาและยื่นวีซ่าครบวงจร', 'Full-package visa service',      'core',  'ท่าน',     true,  10),
  ('QUEUE-FASTTRACK', 'บริการจองคิวด่วน (Appointment Sniper)', 'Fast-track queue booking',       'core',  'ครั้ง',    true,  20),
  ('PREMIUM-LOUNGE',  'บริการจองคิว Premium Lounge',           'Premium lounge reservation',     'core',  'ครั้ง',    true,  30),
  ('DUMMY-TICKET',    'จองตั๋วเครื่องบิน PNR',                 'Flight reservation (PNR)',       'addon', 'ฉบับ',     true,  40),
  ('HOTEL-CONFIRM',   'แผนเดินทางและใบจองโรงแรม',              'Itinerary & hotel confirmation', 'addon', 'ชุด',      true,  50),
  ('INSURANCE',       'ประกันเดินทาง',                          'Travel insurance',               'addon', 'กรมธรรม์', true,  60),
  ('DOC-TRANSLATE',   'แปลเอกสารรับรอง',                        'Certified translation',          'addon', 'ฉบับ',     true,  70),
  ('VAC-TRANSFER',    'รถรับ-ส่งศูนย์ยื่น/สถานทูต',            'VAC/embassy transfer',           'addon', 'เที่ยว',   true,  80)
on conflict (code) do nothing;

insert into public.product (code, name, name_en, family, destination, visa_type, unit, taxable, sort_order) values
  ('FEE-EMB-FR-TOURIST', 'ค่าธรรมเนียมวีซ่าเชงเก้น ฝรั่งเศส (ท่องเที่ยว)', 'Embassy visa fee — France (tourist)', 'fee', 'FR', 'tourist', 'ท่าน', false, 110),
  ('FEE-VAC-FR',         'ค่าธรรมเนียมศูนย์ยื่นวีซ่า TLScontact ฝรั่งเศส',  'VAC fee — TLScontact France',         'fee', 'FR', null,      'ท่าน', false, 120)
on conflict (code) do nothing;

-- Standard prices from the website (services with variable/unpublished prices get none).
insert into public.price_book_entry (product_id, price_book_id, unit_price)
select p.id, b.id, v.price
from (values
  ('FULL-PACKAGE',    3999.00),
  ('QUEUE-FASTTRACK',  590.00),
  ('PREMIUM-LOUNGE',  2500.00),
  ('DUMMY-TICKET',     500.00),
  ('HOTEL-CONFIRM',   1200.00),
  ('DOC-TRANSLATE',    400.00),
  ('VAC-TRANSFER',    1500.00)
) as v(code, price)
join public.product p on p.code = v.code
join public.price_book b on b.is_standard
on conflict (product_id, price_book_id) do nothing;

-- 4+-person tier: the two-price-book answer to the website's 3,999/3,499 split.
insert into public.price_book_entry (product_id, price_book_id, unit_price)
select p.id, b.id, 3499.00
from public.product p, public.price_book b
where p.code = 'FULL-PACKAGE' and b.name = 'กลุ่ม 4+ ท่าน'
on conflict (product_id, price_book_id) do nothing;
