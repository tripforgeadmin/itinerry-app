import type { Lang } from "@/lib/i18n";

/**
 * Product vocabulary + row shapes — client-safe (no supabase import), so "use client"
 * components can use the family list without dragging the server-only service-role
 * client into the browser bundle. Data-access lives in lib/products.ts, which
 * re-exports everything here for server code.
 */

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  family: string | null; // 'core' | 'addon' | 'fee' — PRODUCT_FAMILIES
  destination: string | null;
  visa_type: string | null;
  unit: string | null;
  taxable: boolean;
  active: boolean;
  sort_order: number;
}

export interface PriceBookRow {
  id: string;
  name: string;
  description: string | null;
  is_standard: boolean;
  active: boolean;
}

export interface PriceBookEntryRow {
  id: string;
  product_id: string;
  price_book_id: string;
  unit_price: number;
  currency: string;
  active: boolean;
}

export interface ProductFamilyOption {
  value: "core" | "addon" | "fee";
  label_th: string;
  label_en: string;
}

// ≈ Product2.Family picklist. Ordered as shown in dropdowns and on the PDF.
export const PRODUCT_FAMILIES: ProductFamilyOption[] = [
  { value: "core", label_th: "บริการหลัก", label_en: "Core services" },
  { value: "addon", label_th: "บริการเสริม", label_en: "Add-on services" },
  { value: "fee", label_th: "ค่าธรรมเนียม", label_en: "Fees (pass-through)" },
];

export const VALID_FAMILIES: string[] = PRODUCT_FAMILIES.map((f) => f.value);

export function familyLabel(value: string | null, lang: Lang = "th"): string {
  const f = PRODUCT_FAMILIES.find((x) => x.value === value);
  if (!f) return value ?? "";
  return lang === "en" ? f.label_en : f.label_th;
}
