export type StatusValue =
  | "pending_review"
  | "evaluated"
  | "contacted"
  | "pending_decision"
  | "win"
  | "lost"
  | "out_of_scope"
  | "human_error";

export interface StatusOption {
  value: StatusValue;
  label: string;
  color: string;
}

// Canonical order used everywhere: list badges, filter bar, StatusUpdater buttons.
export const STATUS_OPTIONS: StatusOption[] = [
  { value: "pending_review", label: "รอประเมิน", color: "bg-blue-100 text-blue-700" },
  { value: "evaluated", label: "ประเมินแล้ว", color: "bg-purple-100 text-purple-700" },
  { value: "contacted", label: "ติดต่อแล้ว", color: "bg-yellow-100 text-yellow-700" },
  { value: "pending_decision", label: "รอตัดสินใจ", color: "bg-orange-100 text-orange-700" },
  { value: "win", label: "Closed Won", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Closed Lost", color: "bg-red-100 text-red-700" },
  { value: "out_of_scope", label: "นอกขอบเขตงาน", color: "bg-gray-200 text-gray-700" },
  { value: "human_error", label: "ผิดพลาดจากเจ้าหน้าที่", color: "bg-pink-100 text-pink-700" },
];

// The two Salesforce-style closing statuses. A close stamps close_date + (for lost) a reason;
// re-opening one clears those and returns the case to REOPEN_TARGET.
export const CLOSED_STATUSES: StatusValue[] = ["win", "lost"];
export const REOPEN_TARGET: StatusValue = "pending_decision";
export function isClosed(status: string): boolean {
  return status === "win" || status === "lost";
}

export const STATUS_LABEL = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
) as Record<StatusValue, string>;

export const STATUS_COLOR = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.color])
) as Record<StatusValue, string>;

export const VALID_STATUSES: string[] = STATUS_OPTIONS.map((s) => s.value);

// pending_review is automatic (set on submit) and evaluated is only reachable
// via the evaluate-and-save flow — exclude both from the manual button row.
export const MANUAL_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (s) => s.value !== "pending_review" && s.value !== "evaluated"
);

// Customer-facing status — deliberately collapsed to just two states. Everything
// past pending_review (evaluated/contacted/pending_decision/win/lost) is internal
// sales-pipeline detail the customer doesn't need to see; from their perspective
// the evaluation is either still in progress or it's done. Used by
// app/result/ResultView.tsx and app/result/ResultList.tsx. Admin UI keeps using
// STATUS_LABEL/STATUS_COLOR (the full vocabulary) — do not swap them.
export function customerStatus(status: string): { label: string; color: string } {
  if (status === "pending_review") {
    return { label: "รอประเมิน", color: "bg-accent-tint text-accent" };
  }
  return { label: "ประเมินแล้ว", color: "bg-success-bg text-success-deep" };
}

// The customer-facing promise (lib/line-messaging.ts's assessmentReceivedMessage) is
// "result SENT within 24h" — so the clock runs until result_sent_at is stamped, whatever
// the pipeline status. It only stops early for closed (win/lost) cases: the deal is over,
// flagging them forever would be noise. The submit route derives due_date from this same
// constant (LINE = submit + SLA_HOURS, call = the chosen callback slot).
export const SLA_HOURS = 24;

export function isOverdue(
  createdAt: string,
  status: string,
  dueDate?: string | null,
  resultSentAt?: string | null
): boolean {
  if (resultSentAt) return false; // promise fulfilled
  if (isClosed(status)) return false;
  // Prefer the stored SLA due date (LINE = +24h, call = chosen slot). Fall back to created+24h
  // for rows written before due_date existed.
  const deadline = dueDate
    ? new Date(dueDate).getTime()
    : new Date(createdAt).getTime() + SLA_HOURS * 60 * 60 * 1000;
  return Date.now() > deadline;
}
