# Product/Service Master + Quotation System (Salesforce-style)

## Context

ปัจจุบัน itinerry-app ไม่มีแนวคิดเรื่องสินค้า/บริการหรือราคาเลย — สิ่งเดียวที่ใกล้เคียงคือ `user_assessment.won_service_type` (text `'full'|'diy'`) ที่บันทึกตอน Closed Won ผู้ใช้ต้องการระบบ **Product/Service Master + Quotation ครบชุดตามโครงสร้าง Salesforce**:

- `Product2 → Pricebook2 → PricebookEntry → Quote → QuoteLineItem` (รองรับหลาย price book: standard / campaign / partner)
- Quote สร้างลอยได้ (standalone) หรือผูกกับเคส (`user_assessment` = "the opportunity") ก็ได้
- ส่งออกเป็น **PDF ใบเสนอราคา** (ไทย, THB) ดาวน์โหลดจาก admin
- Phase 1 เป็นเครื่องมือภายใน admin เท่านั้น (ส่ง LINE / public link ไว้เฟสหลัง)

ก่อนเขียนโค้ด: อ่าน `AGENTS.md` + docs ใน `node_modules/next/dist/docs/` (Next 16.2.9 — `params` เป็น Promise ใน route handlers/pages)

## Conventions ที่ต้องตาม (จากการสำรวจ)

- **ไม่ใช้ Postgres enum / CHECK กับค่า** — เก็บ text, allow-list ในโค้ด (แบบ `lib/status.ts`)
- ทุกตารางใหม่: `enable row level security` + `force row level security`, **ไม่มี policy** (service-role เท่านั้น ผ่าน `lib/supabase.ts`)
- ไม่มี server actions — pattern คือ server page → client component → `fetch("/api/admin/...", POST)` → `router.refresh()`; ทุก route มี `requireAdmin` local helper (`verifyAdminSession`)
- Master-data admin = pattern ของ `lost_reason_option` (`app/admin/lost-reasons/*` + action-dispatch POST `add|update|toggle|delete`, soft-deactivate ด้วย `active`)
- เงิน: greenfield — ใช้ `numeric(12,2)` + `currency text default 'THB'`; ต้องสร้าง formatter เอง
- เลขเอกสาร: ตาม pattern `ticket_counter` + `next_ticket_number()` (migration 0008, `lib/ticket.ts`)
- PDF: `@react-pdf/renderer` + ฟอนต์ Sarabun + Thai hyphenation workaround ใน `lib/worksheet-pdf.tsx`
- i18n: Thai-first, `t(lang, th, en)` + `getAdminLang()`; วันที่ Bangkok ผ่าน `bangkokNow()` (`lib/holidays.ts`)

## Step 1 — Migration `supabase/migrations/0027_product_quote.sql`

7 ตาราง + 1 function (header comment อธิบาย mapping กับ Salesforce ตามธรรมเนียม migration ของ repo):

```sql
create table public.product (            -- ≈ Product2
  id uuid pk default gen_random_uuid(),
  code text not null unique,             -- SKU เช่น 'VISA-FULL'
  name text not null, name_en text, description text,
  family text,                           -- หมวดบริการ (free text)
  active boolean not null default true,  -- soft-deactivate
  sort_order int not null default 0,
  created_at/updated_at timestamptz
);

create table public.price_book (         -- ≈ Pricebook2
  id uuid pk, name text not null, description text,
  is_standard boolean not null default false,
  active boolean not null default true, created_at
);
-- structural invariant (อนุญาตตาม convention เพราะเป็น uniqueness ไม่ใช่ value check):
create unique index price_book_one_standard on price_book (is_standard) where is_standard;

create table public.price_book_entry (   -- ≈ PricebookEntry
  id uuid pk,
  product_id uuid not null references product on delete cascade,
  price_book_id uuid not null references price_book on delete cascade,
  unit_price numeric(12,2) not null, currency text not null default 'THB',
  active boolean not null default true, created_at/updated_at,
  unique (product_id, price_book_id)
);

create table public.quote (               -- ≈ Quote
  id uuid pk,
  quote_number text not null unique,      -- QT-<yymmdd>-<nnn>
  name text not null,                     -- หัวเรื่อง
  status text not null default 'draft',   -- allow-list ใน lib/quote-status.ts
  assessment_id uuid references user_assessment on delete set null,  -- optional Quote↔Opportunity
  account_id uuid references account on delete set null,
  -- customer snapshot (ตัวจริงที่ใช้บน PDF; quote ลอยไม่มี account row):
  customer_name text not null, customer_phone text, customer_email text, customer_address text,
  price_book_id uuid not null references price_book,
  quote_date date not null, valid_until date,
  currency text not null default 'THB',
  -- totals เก็บลง DB (แบบ Salesforce) แต่คำนวณฝั่ง server เสมอ:
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,  -- ส่วนลดระดับใบ (บาท)
  vat_rate numeric(5,2) not null default 0,          -- 0 หรือ 7
  vat_amount numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  notes text, terms text,
  sent_at timestamptz, decided_at timestamptz,
  created_at/updated_at
);
create index quote_assessment_idx on quote (assessment_id);

create table public.quote_line_item (      -- ≈ QuoteLineItem
  id uuid pk,
  quote_id uuid not null references quote on delete cascade,
  product_id uuid references product on delete set null,  -- snapshot อยู่รอดแม้ master ถูกลบ
  product_code text, product_name text not null,          -- snapshot ณ เวลาเสนอราคา
  description text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null,        -- snapshot จาก price_book_entry; แก้ได้ตอน draft
  discount_pct numeric(5,2) not null default 0,
  line_total numeric(12,2) not null,
  sort_order int not null default 0, created_at
);
create index quote_line_item_quote_idx on quote_line_item (quote_id);

create table public.quote_status_history (  -- journal แบบ status_history/contact_log
  id uuid pk, quote_id uuid not null references quote on delete cascade,
  from_status text, to_status text not null, note text, created_at
);

-- counter ตาม 0008 เป๊ะ ๆ:
create table public.quote_counter (day text pk, n integer not null default 0);
create function public.next_quote_number(p_day text) returns integer
  language sql security definer set search_path = public
  -- atomic upsert: insert 1 / on conflict n = n + 1 returning n
revoke all on function next_quote_number(text) from public, anon, authenticated;

-- RLS enable + force ทั้ง 7 ตาราง, zero policies
-- Seed: insert price_book ('Standard', 'ราคามาตรฐาน', is_standard = true) แบบ idempotent
```

**การตัดสินใจสำคัญ:**
- **Snapshot over FK**: line item เก็บ copy ของ code/name/unit_price — แก้ master แล้วใบเสนอราคาเก่าต้องไม่เปลี่ยน; customer เก็บเป็น text snapshot เพราะ quote ลอยอาจไม่มี account
- **ส่วนลด**: per-line เป็น % (`discount_pct` ตาม Salesforce) + ระดับใบเป็นจำนวนเงินบาท (`discount_amount`)
- **VAT**: per-quote `vat_rate` default 0 (ธุรกิจอาจไม่จด VAT), UI มี toggle "VAT 7%"; หัก ณ ที่จ่าย = deferred
- ค่า `numeric` จาก PostgREST ต้อง coerce ด้วย `Number()` ใน row mappers

## Step 2 — Pure logic + tests (ก่อนเขียน route)

- **`lib/money.ts`** (ใหม่): `round2()` (half-up 2dp), `formatTHB()` (`Intl.NumberFormat("th-TH", {style:"currency", currency:"THB"})`), `parseMoneyInput()`. ไม่มี dependency ใช้ได้ทั้ง client/server
- **`lib/quote-math.ts`** (ใหม่, pure): `computeLineTotal({quantity, unitPrice, discountPct})` = `round2(qty × price × (1 − pct/100))`; `computeQuoteTotals({lineTotals, discountAmount, vatRate})` → subtotal = Σ rounded lines, taxable = max(0, subtotal − discount), vat = round2(taxable × rate/100), grand = taxable + vat. **กติกาปัดเศษ: ปัดที่ระดับบรรทัดก่อน แล้วรวม, VAT ปัดครั้งเดียวระดับใบ**
- **`lib/quote-status.ts`** (ใหม่, โครงเดียวกับ `lib/status.ts`): `draft|sent|accepted|rejected|expired|canceled` + `QUOTE_STATUS_OPTIONS {value,label,color}` (Thai labels) + transition map:
  - `draft → sent|canceled`; `sent → accepted|rejected|expired|canceled|draft`; `rejected/expired → draft` (revise); `accepted`, `canceled` = terminal
  - `canTransition(from, to)`, `isQuoteEditable(s)` = `s === "draft"`
- **`lib/quote-math.test.ts`** + แก้ `package.json`: `"test": "node --test lib/*.test.ts lib/assessment/*.test.ts"` — ⚠️ glob ใหม่จะปลุก `lib/sla.test.ts` / `lib/status.test.ts` ที่ไม่เคยรัน — รันและแก้/triage ก่อน commit

## Step 3 — Data-access libs

- **`lib/products.ts`** (สไตล์ `lib/lost-reasons.ts`): interfaces + `fetchProducts(activeOnly)`, `fetchPriceBooks(activeOnly)`, `fetchEntriesForBook(bookId)`, `resolveUnitPrice(productId, bookId)`
- **`lib/quotes.ts`**: `generateQuoteNumber()` ลอก pattern `lib/ticket.ts` (bangkokDay + rpc `next_quote_number` + fail-soft random fallback; ชนกับ unique → retry 1 ครั้ง) → `QT-<yymmdd>-<nnn>`; `fetchQuotes({status?})`; `fetchQuoteWithLines(id)`; `recomputeQuoteTotals(quoteId)` (เรียกทุกครั้งที่ line/header เปลี่ยน)

## Step 4 — API routes (action-dispatch POST ตาม `app/api/admin/lost-reasons/route.ts`)

- **`app/api/admin/products/route.ts`**: GET list; POST `add|update|toggle|delete` (delete ปลอดภัยเพราะ line item เป็น snapshot + set null; UI เน้น toggle)
- **`app/api/admin/price-books/route.ts`**: POST `add_book|update_book|toggle_book|set_standard` (เคลียร์ standard เดิมก่อน set ใหม่ — บังคับใน app code) `|set_entry` (upsert on `(product_id, price_book_id)`) `|toggle_entry|delete_entry`; GET `?book=<id>`
- **`app/api/admin/quotes/route.ts`**: POST actions ทุกตัวเช็ค `isQuoteEditable`/`canTransition`:
  - `create` — mint quote_number, `quote_date` = Bangkok today, status draft, journal `null→draft`, คืน `{ok, id}` ให้ client redirect
  - `update_header` — draft เท่านั้น; **ห้ามเปลี่ยน price_book_id เมื่อมี line แล้ว**; recompute ถ้า vat/discount เปลี่ยน
  - `add_line` — server resolve ราคาผ่าน `resolveUnitPrice` กับ price book ของใบ (400 ถ้าไม่มี entry), snapshot code/name, คำนวณ line_total, recompute totals
  - `update_line` / `delete_line` — draft เท่านั้น, recompute
  - `set_status` — เช็ค transition, journal ลง `quote_status_history`, stamp `sent_at`/`decided_at`; revise → draft เคลียร์ `decided_at`
  - `delete` — draft เท่านั้น
- **`app/api/admin/quote-pdf/[id]/route.ts`**: โคลนจาก `app/api/admin/assessment-pdf/[id]/route.ts` (admin-gated GET, `application/pdf` inline, `params` เป็น Promise)

## Step 5 — Admin pages (server page → client manager, สไตล์ admin เดิม)

**Master data — `/admin/products` (หน้าเดียว 3 ส่วน):**
- `app/admin/products/page.tsx` (`force-dynamic`, `getAdminLang()`)
- `ProductManager.tsx` — CRUD table แบบ `LostReasonManager.tsx` (inline edit, toggle, delete)
- `PriceBookManager.tsx` — เพิ่ม/แก้/toggle/set-standard price books
- `PriceBookEntryEditor.tsx` — เลือก book → ตาราง products พร้อมช่องราคาต่อแถว (upsert `set_entry`; เว้นว่าง = ไม่ขายใน book นั้น)

**Quotes:**
- `app/admin/quotes/page.tsx` — server list: quote_number, name, customer, status badge, `formatTHB(grand_total)`, valid_until, ticket_id ของเคสที่ผูก; filter `?status=`; ปุ่มสร้างใหม่
- `app/admin/quotes/new/page.tsx` + `NewQuoteForm.tsx` — อ่าน `?assessment=<id>` เพื่อ prefill ลูกค้าจากเคส (ชื่อ/เบอร์/อีเมล); เลือก price book; **create-then-edit flow แบบ Salesforce**: สร้าง header ก่อน แล้ว redirect ไปหน้า detail เพื่อเพิ่มบรรทัด
- `app/admin/quotes/[id]/page.tsx` — cards: header/status, ลูกค้า, บรรทัดรายการ, totals, notes/terms; ปุ่ม "🖨️ PDF" → `/api/admin/quote-pdf/<id>` (_blank); ลิงก์กลับเคสถ้าผูก
  - `QuoteLineEditor.tsx` — dropdown product (เฉพาะที่มีราคาใน book นี้) + qty + discount% + override ราคา; read-only เมื่อไม่ใช่ draft
  - `QuoteStatusActions.tsx` — ปุ่มตาม `canTransition` สไตล์ `StatusUpdater.tsx`; confirm ก่อน transition ปลายทาง terminal
  - `QuoteHeaderEditor.tsx` — ลูกค้า/valid_until/VAT toggle/ส่วนลดระดับใบ/notes/terms (draft เท่านั้น)

**Integration (แก้ไฟล์เดิม):**
- `app/admin/[id]/page.tsx` — เพิ่ม section "ใบเสนอราคา" (query quote ด้วย assessment_id, ลิสต์ number/status/grand_total) + ปุ่ม "＋ สร้างใบเสนอราคา" → `/admin/quotes/new?assessment=<id>`
- `app/admin/page.tsx` — เพิ่มลิงก์ header: `🧾 ใบเสนอราคา` → `/admin/quotes`, `📦 สินค้า/ราคา` → `/admin/products`

## Step 6 — PDF

- **`lib/pdf-fonts.ts`** (ใหม่): แยก Sarabun `Font.register` + Thai hyphenation/SARA AM workaround + `stripEmoji` ออกจาก `lib/worksheet-pdf.tsx` (บรรทัด ~24–47) เป็น shared module แล้วให้ worksheet-pdf import กลับ (กัน double-register/drift)
- **`lib/quote-pdf.tsx`** (ใหม่): `renderQuotePdf(data): Promise<Buffer>` — A4, Sarabun, โทน navy `#1b3d5c` เข้าชุด worksheet: บล็อกผู้ขาย (ค่าคงที่ hardcode ใน phase 1), หัว "ใบเสนอราคา / QUOTATION", เลขที่/วันที่/ยืนราคาถึง, บล็อกลูกค้า (จาก snapshot), ตารางรายการ (ลำดับ/รายการ/จำนวน/ราคาต่อหน่วย/ส่วนลด/รวม) ด้วย `formatTHB`, บล็อก totals (แสดงแถว VAT เฉพาะ `vat_rate > 0`), notes/terms, ช่องลายเซ็น; **draft พิมพ์ลายน้ำ "ฉบับร่าง (DRAFT)"**; วันที่ไทยด้วย `toLocaleDateString("th-TH")`

## Step 7 — Verification

- `npm test` (glob ใหม่): `lib/quote-math.test.ts` — ปัดเศษบรรทัด (เช่น 3 × ฿1,033.335), discount 0/100%, ส่วนลดใบ > subtotal → taxable clamp 0, VAT 7% rounding; (option) `lib/quote-status.test.ts` transition matrix
- Manual QA: สร้าง product → ใส่ราคาใน standard + campaign book → quote ลอย → quote จากหน้าเคส → เพิ่ม/แก้/ลบบรรทัด → toggle VAT → sent → PDF ไทยถูกต้อง → accepted แล้วล็อกแก้ไข → **แก้ราคา master แล้วใบที่ sent ต้องไม่เปลี่ยน**
- Apply migration ผ่าน Supabase MCP (`apply_migration`) ตาม workflow เดิมของ repo

## ลำดับการทำ

1. Migration 0027 → 2. `lib/money.ts`, `lib/quote-math.ts` (+tests), `lib/quote-status.ts` → 3. `lib/products.ts`, `lib/quotes.ts` → 4. products/price-books API + หน้า `/admin/products` → 5. quotes API + หน้า quotes → 6. `lib/pdf-fonts.ts` refactor → `lib/quote-pdf.tsx` → PDF route → 7. ผูกหน้าเคส + nav links

## Deferred (นอกขอบเขต phase 1)

ส่ง quote ทาง LINE / public link; accepted → auto-win เคส / sync `won_service_type` (phase 1 **ห้าม**แตะ `user_assessment.status`/`status_history`); quote revision numbering; ข้อมูลผู้ขายใน `app_config`; หัก ณ ที่จ่าย; multi-currency; e-signature
