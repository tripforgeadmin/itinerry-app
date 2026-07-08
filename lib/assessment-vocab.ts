// Shared g/y/r + band/urgency label vocabulary for the auto rule-engine's output.
// Single source of truth for: app/admin/[id]/page.tsx's AutoAssessment, lib/worksheet-pdf.tsx's
// Worksheet, and app/admin/[id]/AssessmentResultForm.tsx's override dropdowns. Keep these three
// in sync by construction (import from here) rather than by discipline.
export const STATE_WORD: Record<string, string> = { g: "แข็งแรง", y: "ปานกลาง", r: "ไม่แข็งแรง" };
export const HISTORY_WORD: Record<string, string> = { g: "สะอาด", y: "มีจุดต้องตรวจ", r: "มีประวัติ" };
export const BAND_WORD: Record<string, string> = { High: "สูง", Med: "ปานกลาง", Low: "น้อย", OVERRIDE: "ต้องรีวิว" };
export const BAND_COLOR: Record<string, string> = { High: "g", Med: "y", Low: "r", OVERRIDE: "r" };
export const URGENCY_WORD: Record<string, string> = { Low: "ไม่ด่วน", Med: "ปานกลาง", High: "ด่วน" };
export const URGENCY_COLOR: Record<string, string> = { Low: "g", Med: "y", High: "r" };

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
