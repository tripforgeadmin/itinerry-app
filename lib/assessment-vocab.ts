// Shared g/y/r + band/urgency label vocabulary for the auto rule-engine's output.
// Single source of truth for: app/admin/[id]/page.tsx's AutoAssessment, lib/worksheet-pdf.tsx's
// Worksheet, and app/admin/[id]/AssessmentResultForm.tsx's override dropdowns. Keep these three
// in sync by construction (import from here) rather than by discipline.
import type { Lang } from "@/lib/i18n";

export const STATE_WORD: Record<string, string> = { g: "แข็งแรง", y: "ปานกลาง", r: "ไม่แข็งแรง" };
export const HISTORY_WORD: Record<string, string> = { g: "สะอาด", y: "มีจุดต้องตรวจ", r: "มีประวัติ" };
export const BAND_WORD: Record<string, string> = { High: "สูง", Med: "ปานกลาง", Low: "น้อย", OVERRIDE: "ต้องรีวิว" };
export const BAND_COLOR: Record<string, string> = { High: "g", Med: "y", Low: "r", OVERRIDE: "r" };
export const URGENCY_WORD: Record<string, string> = { Low: "ไม่ด่วน", Med: "ปานกลาง", High: "ด่วน" };
export const URGENCY_COLOR: Record<string, string> = { Low: "g", Med: "y", High: "r" };

export const STATE_WORD_EN: Record<string, string> = { g: "Strong", y: "Moderate", r: "Weak" };
export const HISTORY_WORD_EN: Record<string, string> = { g: "Clean", y: "Needs review", r: "Has history" };
export const BAND_WORD_EN: Record<string, string> = { High: "High", Med: "Medium", Low: "Low", OVERRIDE: "Needs review" };
export const URGENCY_WORD_EN: Record<string, string> = { Low: "Low", Med: "Medium", High: "High" };

const pick = (th: Record<string, string>, en: Record<string, string>, code: string, lang: Lang) =>
  (lang === "en" ? en[code] ?? th[code] : th[code]) ?? "—";
export const stateWord = (code: string, lang: Lang = "th") => pick(STATE_WORD, STATE_WORD_EN, code, lang);
export const historyWord = (code: string, lang: Lang = "th") => pick(HISTORY_WORD, HISTORY_WORD_EN, code, lang);
export const bandWord = (code: string, lang: Lang = "th") => pick(BAND_WORD, BAND_WORD_EN, code, lang);
export const urgencyWord = (code: string, lang: Lang = "th") => pick(URGENCY_WORD, URGENCY_WORD_EN, code, lang);

export const TIES_FUNDING_SELECT_OPTIONS = [
  { value: "g", label: STATE_WORD.g },
  { value: "y", label: STATE_WORD.y },
  { value: "r", label: STATE_WORD.r },
] as const;

export const RISK_SELECT_OPTIONS = [
  { value: "g", label: HISTORY_WORD.g },
  { value: "y", label: HISTORY_WORD.y },
  { value: "r", label: HISTORY_WORD.r },
] as const;

export const BAND_SELECT_OPTIONS = [
  { value: "High", label: BAND_WORD.High },
  { value: "Med", label: BAND_WORD.Med },
  { value: "Low", label: BAND_WORD.Low },
] as const;

// Lang-aware option builders (for the AssessmentResultForm override dropdowns).
export const tiesFundingOptions = (lang: Lang = "th") => (["g", "y", "r"] as const).map((v) => ({ value: v, label: stateWord(v, lang) }));
export const riskOptions = (lang: Lang = "th") => (["g", "y", "r"] as const).map((v) => ({ value: v, label: historyWord(v, lang) }));
export const bandOptions = (lang: Lang = "th") => (["High", "Med", "Low"] as const).map((v) => ({ value: v, label: bandWord(v, lang) }));
