import { supabase } from "./supabase";

/** A row of the admin-managed 2-level loss-reason taxonomy (lost_reason_option). */
export interface LostReasonRow {
  key: string;
  parent_key: string | null; // null = top-level category (L1)
  label_th: string;
  label_en: string | null;
  sort_order: number;
  active: boolean;
}

export interface LostReasonLeaf {
  key: string;
  label_th: string;
  label_en: string | null;
  active: boolean;
}

export interface LostReasonCategory extends LostReasonLeaf {
  children: LostReasonLeaf[];
}

/** Group flat rows into an L1 → L2 tree, sorted by sort_order. */
function toTree(rows: LostReasonRow[]): LostReasonCategory[] {
  const leaf = (r: LostReasonRow): LostReasonLeaf => ({ key: r.key, label_th: r.label_th, label_en: r.label_en, active: r.active });
  return rows
    .filter((r) => r.parent_key === null)
    .map((c) => ({ ...leaf(c), children: rows.filter((r) => r.parent_key === c.key).map(leaf) }));
}

/** Full taxonomy tree. activeOnly=true (the close modal) hides deactivated options; the admin
 * config page passes false to see everything. */
export async function fetchLostReasonTree(activeOnly = true): Promise<LostReasonCategory[]> {
  let q = supabase.from("lost_reason_option").select("*").order("sort_order");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error || !data) {
    if (error) console.error("lost_reason_option fetch error:", error);
    return [];
  }
  return toTree(data as LostReasonRow[]);
}

/** key → Thai label, for displaying a stored lost_reason (includes inactive rows so historical
 * closes still render). */
export async function fetchLostReasonLabels(): Promise<Record<string, string>> {
  const { data } = await supabase.from("lost_reason_option").select("key, label_th");
  return Object.fromEntries(((data ?? []) as { key: string; label_th: string }[]).map((r) => [r.key, r.label_th]));
}

/** Validate that (l1, l2) is a real, ACTIVE category→sub-reason pair before closing as lost. */
export async function isValidLostReasonPair(l1: string, l2: string): Promise<boolean> {
  const { data } = await supabase
    .from("lost_reason_option")
    .select("key, parent_key, active")
    .in("key", [l1, l2]);
  const rows = (data ?? []) as { key: string; parent_key: string | null; active: boolean }[];
  const cat = rows.find((r) => r.key === l1);
  const sub = rows.find((r) => r.key === l2);
  return !!cat && cat.parent_key === null && cat.active && !!sub && sub.parent_key === l1 && sub.active;
}
