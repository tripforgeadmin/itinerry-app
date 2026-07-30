-- 0029: Product Kit — Odoo-style phantom BoM for the quote builder.
--
-- product_kit_item ≈ Odoo mrp.bom (type=kit) + mrp.bom.line: a parent product that
-- has rows here IS a kit (kit-ness comes from having components, like Odoo, not from
-- a product-type flag). Adding a kit to a quote explodes it into one ordinary line
-- per component (quantity = kit qty × component qty, snapshots taken from the
-- COMPONENT, so pass-through fees stay VAT-free). The kit itself never becomes a
-- line and needs no price_book_entry — it is sellable in a book only when every
-- component has an active price there (app/api/admin/quotes add_line + lib/products
-- resolveKitComponents). Nested kits are rejected in app code, per convention.

create table if not exists public.product_kit_item (
  id                   uuid primary key default gen_random_uuid(),
  parent_product_id    uuid not null references public.product(id) on delete cascade,
  component_product_id uuid not null references public.product(id) on delete cascade,
  quantity             numeric(10,2) not null default 1,  -- per 1 unit of the kit
  sort_order           int not null default 0,
  created_at           timestamptz not null default now(),
  unique (parent_product_id, component_product_id)
);
create index if not exists product_kit_item_parent_idx on public.product_kit_item (parent_product_id);

alter table public.product_kit_item enable row level security;
alter table public.product_kit_item force row level security;

-- Seed the example kit matching the France fee products from 0028. It stays out of
-- the quote builder until admins price FEE-EMB-FR-TOURIST / FEE-VAC-FR (by design).
insert into public.product (code, name, name_en, family, destination, visa_type, unit, taxable, sort_order)
values ('KIT-FR-TOURIST', 'ชุดบริการวีซ่าฝรั่งเศสครบวงจร (ท่องเที่ยว)', 'France tourist visa bundle', 'core', 'FR', 'tourist', 'ท่าน', true, 15)
on conflict (code) do nothing;

insert into public.product_kit_item (parent_product_id, component_product_id, quantity, sort_order)
select parent.id, comp.id, 1, v.sort_order
from (values
  ('FULL-PACKAGE',       10),
  ('FEE-EMB-FR-TOURIST', 20),
  ('FEE-VAC-FR',         30)
) as v(code, sort_order)
join public.product comp on comp.code = v.code
join public.product parent on parent.code = 'KIT-FR-TOURIST'
on conflict (parent_product_id, component_product_id) do nothing;
