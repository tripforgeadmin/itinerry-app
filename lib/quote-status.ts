import type { Lang } from "@/lib/i18n";

/**
 * Quote lifecycle vocabulary — same shape as lib/status.ts (the repo's canonical
 * pattern): TS union + one ordered options array as source of truth, derived maps,
 * app-level validation only (the DB column is plain text).
 */

export type QuoteStatusValue =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "canceled";

export interface QuoteStatusOption {
  value: QuoteStatusValue;
  label: string;
  color: string;
}

export const QUOTE_STATUS_OPTIONS: QuoteStatusOption[] = [
  { value: "draft", label: "ฉบับร่าง", color: "bg-gray-100 text-gray-700" },
  { value: "sent", label: "ส่งแล้ว", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "ลูกค้าตอบรับ", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "ลูกค้าปฏิเสธ", color: "bg-red-100 text-red-700" },
  { value: "expired", label: "หมดอายุ", color: "bg-amber-100 text-amber-700" },
  { value: "canceled", label: "ยกเลิก", color: "bg-gray-100 text-gray-500" },
];

export const QUOTE_STATUS_LABEL = Object.fromEntries(
  QUOTE_STATUS_OPTIONS.map((s) => [s.value, s.label])
) as Record<QuoteStatusValue, string>;

export const QUOTE_STATUS_COLOR = Object.fromEntries(
  QUOTE_STATUS_OPTIONS.map((s) => [s.value, s.color])
) as Record<QuoteStatusValue, string>;

export const QUOTE_STATUS_LABEL_EN: Record<QuoteStatusValue, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  canceled: "Canceled",
};

export function quoteStatusLabel(value: string, lang: Lang = "th"): string {
  if (lang === "en")
    return (
      QUOTE_STATUS_LABEL_EN[value as QuoteStatusValue] ??
      QUOTE_STATUS_LABEL[value as QuoteStatusValue] ??
      value
    );
  return QUOTE_STATUS_LABEL[value as QuoteStatusValue] ?? value;
}

export const VALID_QUOTE_STATUSES: string[] = QUOTE_STATUS_OPTIONS.map((s) => s.value);

// Allowed transitions. sent→draft / rejected→draft / expired→draft is "revise";
// accepted and canceled are terminal.
const TRANSITIONS: Record<QuoteStatusValue, QuoteStatusValue[]> = {
  draft: ["sent", "canceled"],
  sent: ["accepted", "rejected", "expired", "canceled", "draft"],
  rejected: ["draft"],
  expired: ["draft"],
  accepted: [],
  canceled: [],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from as QuoteStatusValue] ?? []).includes(to as QuoteStatusValue);
}

/** Lines/header/customer are editable only while the quote is a draft. */
export function isQuoteEditable(status: string): boolean {
  return status === "draft";
}

/** Terminal states get a confirm() in the UI — no way back. */
export const TERMINAL_QUOTE_STATUSES: QuoteStatusValue[] = ["accepted", "canceled"];
