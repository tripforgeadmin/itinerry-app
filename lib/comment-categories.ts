import { supabase } from "./supabase";

/** A row of the admin-managed flat Problem/Solution comment taxonomy (comment_category, 0035).
 * Unlike lost_reason_option this is single-level; `kind` splits it into the two dropdowns. */
export interface CommentCategoryRow {
  key: string;
  kind: "problem" | "solution";
  label_th: string;
  label_en: string | null;
  sort_order: number;
  active: boolean;
}

/** All categories, sorted. activeOnly=true (case-page dropdowns) hides deactivated options;
 * the admin config page passes false to see everything. */
export async function fetchCommentCategories(activeOnly = true): Promise<CommentCategoryRow[]> {
  let q = supabase.from("comment_category").select("*").order("kind").order("sort_order");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) {
    console.error("comment_category fetch error:", error);
    return [];
  }
  return (data ?? []) as CommentCategoryRow[];
}

/** Validate a picked key: must exist, be active, and be of the expected kind. */
export async function isValidCommentCategory(key: string, kind: "problem" | "solution"): Promise<boolean> {
  const { data } = await supabase
    .from("comment_category")
    .select("kind, active")
    .eq("key", key)
    .maybeSingle();
  return !!data && data.kind === kind && data.active === true;
}
