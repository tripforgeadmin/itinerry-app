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
  { label: "สรุป", labelEn: "Summary", icon: "summary" },
];

// Question id → category index (0–4). Consent (q2) belongs to none → -1.
const CATEGORY_INDEX_BY_ID: Record<string, number> = {
  q4: 0, q8: 0, q9: 0,
  q10: 1, q11: 1, q12: 1, q13: 1, q39: 1, q14: 1, q15: 1, q16: 1, q17: 1, q18: 1, q19: 1, q21: 1, q22: 1, q23: 1,
  q24: 2, q25: 2, q26: 2, q27: 2, q28: 2, q29: 2,
  q30: 3, q31: 3, q32: 3, q33: 3, q34: 3, q35: 3,
  q3: 4, q5: 4, q6: 4, q7: 4, q36: 4, q37: 4, q38: 4,
  q2: 5, // สรุป — its own category
};

// Screens captured by another screen (contact-merge on q3; advanceTo on refused q30/overstay q32)
// and therefore never rendered as the current screen — excluded so the active box's denominator
// counts only real steps.
const NON_RENDERED = new Set(["q5", "q6", "q36", "q37", "q31", "q33", "q38"]);

// Ordered rendered screens per category, derived from CATEGORY_INDEX_BY_ID (single source of truth)
// so EVERY visited screen gets a distinct position → the active box fills gradually in all 5
// categories. Relies on CATEGORY_INDEX_BY_ID keys being in flow order within each category.
const CATEGORY_ORDER: string[][] = CATEGORIES.map((_, ci) =>
  Object.keys(CATEGORY_INDEX_BY_ID).filter((id) => CATEGORY_INDEX_BY_ID[id] === ci && !NON_RENDERED.has(id))
);

export function categoryIndexOf(id: string): number {
  return CATEGORY_INDEX_BY_ID[id] ?? -1;
}

/** True for questions that live on only one branch — travel (cat 1: q10–q23, q39, EXCEPT the
 * prior-visa q12 which now converges from every visa branch) and the occupation-document branches
 * (cat 2 except the occupation question q24). Convergence questions (q12, q24) are always on-path,
 * so their answers are never scoped out by isOnCurrentPath. */
export function isBranchQuestion(id: string): boolean {
  const c = categoryIndexOf(id);
  return (c === 1 && id !== "q12") || (c === 2 && id !== "q24");
}

/** A branch question counts only when it's on the user's current trail; everything else always does.
 * Filters out stale answers left behind when the user switches visa type / occupation. */
export function isOnCurrentPath(id: string, history: string[]): boolean {
  return !isBranchQuestion(id) || history.includes(id);
}

/** Conditionally-revealed detail questions → the parent answer that unlocks them. */
const REVEAL_IF: Record<string, [string, string]> = {
  q31: ["q30", "yes"], // refusal detail — only when "เคยถูกปฏิเสธ" = yes
  q33: ["q32", "yes"], // overstay detail — only when "เคย overstay" = yes
  q37: ["q36", "call"], // callback time — only when contact channel = call
};

/** False when a conditional detail question's parent no longer unlocks it — so a stale answer left
 * behind after toggling the parent (e.g. refused yes→no) is dropped from the summary + submit. */
export function isRevealed(id: string, answers: Record<string, string>): boolean {
  const g = REVEAL_IF[id];
  return !g || answers[g[0]] === g[1];
}

/** First question of a category that the user actually visited (scans real history, so it skips
 * merged/advanceTo-captured ids and returns the branch-correct entry). undefined if not reached. */
export function firstVisitedIdOfCategory(categoryIndex: number, history: string[]): string | undefined {
  return history.find((id) => categoryIndexOf(id) === categoryIndex);
}

/**
 * Cached progress: each category fills by the FURTHEST question of that category the user has
 * reached in the `history` trail — so the water level reflects real answered progress and never
 * drops on step-back (popQuestion keeps history; only a real branch truncates it). `activeIndex`
 * is the cursor's category (drives the highlighted node only).
 */
export function computeBoxes(
  currentId: string,
  history: string[] = []
): { boxes: ProgressBox[]; activeIndex: number } {
  const active = categoryIndexOf(currentId);
  const visited = new Set(history);
  // Furthest category reached across the whole trail — monotonic, since popQuestion keeps history
  // and only a real branch truncates it. (CATEGORY_ORDER mixes all visa branches, so we tier by
  // category reached rather than by index-within-order, which would undercount a passed category.)
  let maxCat = -1;
  for (const id of history) {
    const ci = categoryIndexOf(id);
    if (ci > maxCat) maxCat = ci;
  }
  const boxes: ProgressBox[] = CATEGORIES.map((c, i) => {
    let fill = 0;
    if (i < maxCat) {
      fill = 1; // passed → the user reached a later category
    } else if (i === maxCat) {
      const answered = (CATEGORY_ORDER[i] ?? []).filter((id) => visited.has(id)).length;
      fill = answered > 0 ? answered / (answered + 1) : 0; // rises with each answered question
    }
    return { label: c.label, fill, icon: c.icon };
  });
  return { boxes, activeIndex: active };
}
