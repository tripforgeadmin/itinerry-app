import type { ProgressBox, BoxIconName } from "@/components/ui/ProgressTopBar";

// The 5-category progress model (review decision). Order = flow order.
export interface Category {
  label: string;
  labelEn: string;
  icon: BoxIconName;
}

export const CATEGORIES: Category[] = [
  { label: "พื้นฐาน", labelEn: "Basics", icon: "passport" },
  { label: "เดินทาง", labelEn: "Travel", icon: "plane" },
  { label: "อาชีพ", labelEn: "Work", icon: "briefcase" },
  { label: "คุณสมบัติ", labelEn: "Qualification", icon: "shield" },
  { label: "ข้อมูลติดต่อ", labelEn: "Contact", icon: "chat" },
];

// Question id → category index (0–4). Consent (q2) belongs to none → -1.
const CATEGORY_INDEX_BY_ID: Record<string, number> = {
  q4: 0, q8: 0, q9: 0,
  q10: 1, q11: 1, q12: 1, q13: 1, q14: 1, q15: 1, q16: 1, q17: 1, q18: 1, q19: 1, q20: 1, q21: 1, q22: 1, q23: 1,
  q24: 2, q25: 2, q26: 2, q27: 2, q28: 2, q29: 2,
  q30: 3, q31: 3, q32: 3, q33: 3, q34: 3, q35: 3,
  q3: 4, q5: 4, q6: 4, q7: 4, q36: 4, q37: 4, q2: 4,
};

// Screens captured by another screen (contact-merge on q3; advanceTo on refused q30/overstay q32)
// and therefore never rendered as the current screen — excluded so the active box's denominator
// counts only real steps.
const NON_RENDERED = new Set(["q5", "q6", "q36", "q37", "q31", "q33"]);

// Ordered rendered screens per category, derived from CATEGORY_INDEX_BY_ID (single source of truth)
// so EVERY visited screen gets a distinct position → the active box fills gradually in all 5
// categories. Relies on CATEGORY_INDEX_BY_ID keys being in flow order within each category.
const CATEGORY_ORDER: string[][] = CATEGORIES.map((_, ci) =>
  Object.keys(CATEGORY_INDEX_BY_ID).filter((id) => CATEGORY_INDEX_BY_ID[id] === ci && !NON_RENDERED.has(id))
);

export function categoryIndexOf(id: string): number {
  return CATEGORY_INDEX_BY_ID[id] ?? -1;
}

/**
 * Positional progress: categories before the active one read full, the active one fills by the
 * current screen's position within it, later ones read empty. Positional (not answer-scan) so it
 * stays coherent regardless of the as-is flow order — the precise per-branch denominators land in
 * Phase 4.
 */
export function computeBoxes(currentId: string): { boxes: ProgressBox[]; activeIndex: number } {
  const active = categoryIndexOf(currentId);
  const boxes: ProgressBox[] = CATEGORIES.map((c, i) => {
    let fill = 0;
    if (i < active) {
      fill = 1;
    } else if (i === active) {
      const order = CATEGORY_ORDER[i] ?? [];
      const pos = Math.max(order.indexOf(currentId), 0);
      const total = Math.max(order.length, 1);
      fill = Math.min(1, (pos + 0.45) / total);
    }
    return { label: c.label, fill, icon: c.icon };
  });
  return { boxes, activeIndex: active };
}
