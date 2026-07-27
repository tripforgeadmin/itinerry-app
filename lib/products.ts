import { supabase } from "./supabase";
import type { KitItemRow, PriceBookEntryRow, PriceBookRow, ProductRow } from "./product-families";

/**
 * Product/service master data access (Salesforce-style Product2 / Pricebook2 /
 * PricebookEntry). Server-only — imports the service-role client. Row shapes and
 * the family vocabulary live in lib/product-families.ts (client-safe) and are
 * re-exported here so server code keeps a single import site.
 */

export * from "./product-families";

/** PostgREST returns numeric columns as strings — coerce once, here. */
function toEntry(r: Record<string, unknown>): PriceBookEntryRow {
  return { ...(r as unknown as PriceBookEntryRow), unit_price: Number(r.unit_price) };
}

/** All products, family-then-sort_order ordered. activeOnly=true for pickers; the
 * admin master page passes false to manage deactivated rows too. */
export async function fetchProducts(activeOnly = true): Promise<ProductRow[]> {
  let q = supabase.from("product").select("*").order("sort_order").order("code");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) {
    console.error("product fetch error:", error);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

export async function fetchPriceBooks(activeOnly = true): Promise<PriceBookRow[]> {
  let q = supabase
    .from("price_book")
    .select("*")
    .order("is_standard", { ascending: false })
    .order("created_at");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) {
    console.error("price_book fetch error:", error);
    return [];
  }
  return (data ?? []) as PriceBookRow[];
}

export async function fetchEntriesForBook(priceBookId: string): Promise<PriceBookEntryRow[]> {
  const { data, error } = await supabase
    .from("price_book_entry")
    .select("*")
    .eq("price_book_id", priceBookId);
  if (error) {
    console.error("price_book_entry fetch error:", error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map(toEntry);
}

/** Kit rows (≈ Odoo BoM lines), all of them or one parent's, in display order.
 * PostgREST numeric → coerce quantity. */
export async function fetchKitItems(parentId?: string): Promise<KitItemRow[]> {
  let q = supabase.from("product_kit_item").select("*").order("sort_order");
  if (parentId) q = q.eq("parent_product_id", parentId);
  const { data, error } = await q;
  if (error) {
    console.error("product_kit_item fetch error:", error);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as KitItemRow),
    quantity: Number(r.quantity),
  }));
}

/** Product ids that ARE kits (have components) — marks dropdowns, blocks nesting. */
export async function fetchKitParents(): Promise<Set<string>> {
  const { data } = await supabase.from("product_kit_item").select("parent_product_id");
  return new Set(((data ?? []) as { parent_product_id: string }[]).map((r) => r.parent_product_id));
}

export type KitResolution =
  | { ok: true; components: { product: ProductRow; quantity: number; unitPrice: number }[] }
  | { ok: false; missing: string[] };

/** A kit is sellable in a book only when EVERY active component has an active price
 * there. Returns the priced component list (explode order) or the missing names. */
export async function resolveKitComponents(
  parentId: string,
  priceBookId: string
): Promise<KitResolution> {
  const items = await fetchKitItems(parentId);
  if (items.length === 0) return { ok: false, missing: [] };
  const ids = items.map((i) => i.component_product_id);
  const [{ data: productRows }, { data: entryRows }] = await Promise.all([
    supabase.from("product").select("*").in("id", ids),
    supabase
      .from("price_book_entry")
      .select("product_id, unit_price, active")
      .eq("price_book_id", priceBookId)
      .in("product_id", ids),
  ]);
  const products = new Map(((productRows ?? []) as ProductRow[]).map((p) => [p.id, p]));
  const prices = new Map(
    ((entryRows ?? []) as { product_id: string; unit_price: unknown; active: boolean }[])
      .filter((e) => e.active)
      .map((e) => [e.product_id, Number(e.unit_price)])
  );
  const missing: string[] = [];
  const components: { product: ProductRow; quantity: number; unitPrice: number }[] = [];
  for (const item of items) {
    const product = products.get(item.component_product_id);
    if (!product || !product.active) {
      missing.push(product?.name ?? item.component_product_id);
      continue;
    }
    const unitPrice = prices.get(item.component_product_id);
    if (unitPrice === undefined) {
      missing.push(product.name);
      continue;
    }
    components.push({ product, quantity: item.quantity, unitPrice });
  }
  return missing.length > 0 ? { ok: false, missing } : { ok: true, components };
}

/** Active price of a product in a book, or null when it isn't sellable there. */
export async function resolveUnitPrice(
  productId: string,
  priceBookId: string
): Promise<number | null> {
  const { data } = await supabase
    .from("price_book_entry")
    .select("unit_price, active")
    .eq("product_id", productId)
    .eq("price_book_id", priceBookId)
    .maybeSingle();
  if (!data || !(data as { active: boolean }).active) return null;
  return Number((data as { unit_price: unknown }).unit_price);
}
