export type StatusValue =
  | "pending_review"
  | "evaluated"
  | "contacted"
  | "pending_decision"
  | "win"
  | "lost";

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
  { value: "win", label: "Win", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
];

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

// Customer-facing status copy. Never expose admin CRM jargon (e.g. raw "win"/"lost")
// to a customer — this is the sanctioned translation, used by app/result/ResultView.tsx.
// Same StatusValue-keyed shape as STATUS_LABEL/STATUS_COLOR above; colocated as its
// natural counterpart. Admin UI keeps using STATUS_LABEL/STATUS_COLOR — do not swap them.
export const CUSTOMER_STATUS_LABEL: Record<StatusValue, string> = {
  pending_review: "กำลังตรวจสอบข้อมูลของคุณ",
  evaluated: "ประเมินผลเสร็จแล้ว",
  contacted: "ทีมงานติดต่อคุณแล้ว",
  pending_decision: "รอการตัดสินใจของคุณ",
  win: "ดำเนินการสำเร็จ 🎉",
  lost: "ไม่สามารถดำเนินการต่อได้ในตอนนี้",
};

// Design-token classes matching app/auth/page.tsx's light palette — deliberately
// NOT admin's raw Tailwind red/green/purple.
export const CUSTOMER_STATUS_COLOR: Record<StatusValue, string> = {
  pending_review: "bg-accent-tint text-accent",
  evaluated: "bg-accent-tint text-accent",
  contacted: "bg-warning/10 text-warning",
  pending_decision: "bg-warning/10 text-warning",
  win: "bg-success-bg text-success-deep",
  lost: "bg-surface text-muted",
};

// The customer-facing "result within 24h" promise (lib/line-messaging.ts's
// assessmentReceivedMessage) is only outstanding while a case is pending_review.
const SLA_PENDING_STATUS: StatusValue = "pending_review";
const SLA_HOURS = 24;

export function isOverdue(createdAt: string, status: string): boolean {
  if (status !== SLA_PENDING_STATUS) return false;
  return Date.now() > new Date(createdAt).getTime() + SLA_HOURS * 60 * 60 * 1000;
}
