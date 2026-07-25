import { supabase } from "./supabase";
import type { PriceBookEntryRow, PriceBookRow, ProductRow } from "./product-families";

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
