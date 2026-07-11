import type { StatusValue } from "./status";
import { LABELS, label } from "./answer-labels";
import { displayName } from "./account-name";
import { t, type Lang } from "@/lib/i18n";

// Categorical fields (checkbox multi-select, "is_any_of") vs. text fields (free-text
// substring match, "contains") vs. date-range fields ("is_between"). status keeps its
// own StatusValue-typed variant since it has a dedicated grouped UI in AddFilterPopover.
type CategoricalField = "source" | "visa_type" | "intent" | "contact_preference" | "is_friend" | "printable" | "days_left";
type TextField = "ticket_id" | "name" | "line" | "phone" | "destination";
type DateField = "date" | "due_date";

export type FilterField = "status" | CategoricalField | TextField | DateField;
export type FilterOperator = "is_any_of" | "is_between" | "contains";

export type FilterCondition =
  | { id: string; field: "status"; operator: "is_any_of"; value: StatusValue[] }
  | { id: string; field: CategoricalField; operator: "is_any_of"; value: string[] }
  | { id: string; field: DateField; operator: "is_between"; value: [string | null, string | null] } // [fromISO date, toISO date], either end open
  | { id: string; field: TextField; operator: "contains"; value: string };

export const TEXT_FIELDS: TextField[] = ["ticket_id", "name", "line", "phone", "destination"];
export const CATEGORICAL_FIELDS: CategoricalField[] = [
  "source", "visa_type", "intent", "contact_preference", "is_friend", "printable", "days_left",
];
export const DATE_FIELDS: DateField[] = ["date", "due_date"];
export const ALL_FIELDS: FilterField[] = ["status", "date", "due_date", ...TEXT_FIELDS, ...CATEGORICAL_FIELDS];

export const SOURCE_OPTIONS = Object.entries(LABELS.source).map(([value, lab]) => ({ value, label: lab }));

/** Source filter options in the active language. */
export function sourceOptions(lang: Lang = "th") {
  return Object.keys(LABELS.source).map((value) => ({ value, label: label("source", value, lang) }));
}
export function visaTypeOptions(lang: Lang = "th") {
  return Object.keys(LABELS.visa_type).map((value) => ({ value, label: label("visa_type", value, lang) }));
}
export function intentOptions(lang: Lang = "th") {
  return Object.keys(LABELS.intent).map((value) => ({ value, label: label("intent", value, lang) }));
}
export function contactOptions(lang: Lang = "th") {
  return Object.keys(LABELS.contact_preference).map((value) => ({ value, label: label("contact_preference", value, lang) }));
}
export function friendOptions(lang: Lang = "th") {
  return [
    { value: "yes", label: t(lang, "เป็นเพื่อน", "Friend") },
    { value: "no", label: t(lang, "ไม่เป็นเพื่อน", "Not friend") },
    { value: "unknown", label: t(lang, "ไม่ทราบ", "Unknown") },
  ];
}
export function printableOptions(lang: Lang = "th") {
  return [
    { value: "yes", label: t(lang, "พร้อมส่ง", "Ready") },
    { value: "no", label: t(lang, "ยังไม่พร้อม", "Not ready") },
  ];
}
export function daysLeftOptions(lang: Lang = "th") {
  return [
    { value: "urgent", label: t(lang, `ด่วน (< ${DAYS_LEFT_URGENT_MAX} วัน)`, `Urgent (< ${DAYS_LEFT_URGENT_MAX}d)`) },
    { value: "soon", label: t(lang, `ใกล้ (${DAYS_LEFT_URGENT_MAX}–${DAYS_LEFT_SOON_MAX} วัน)`, `Soon (${DAYS_LEFT_URGENT_MAX}–${DAYS_LEFT_SOON_MAX}d)`) },
    { value: "plenty", label: t(lang, `ยังไม่ด่วน (≥ ${DAYS_LEFT_SOON_MAX} วัน)`, `Plenty (≥ ${DAYS_LEFT_SOON_MAX}d)`) },
  ];
}

/** Single dispatcher so AddFilterPopover can render any categorical field generically. */
export function categoricalOptions(field: CategoricalField, lang: Lang = "th"): { value: string; label: string }[] {
  switch (field) {
    case "source": return sourceOptions(lang);
    case "visa_type": return visaTypeOptions(lang);
    case "intent": return intentOptions(lang);
    case "contact_preference": return contactOptions(lang);
    case "is_friend": return friendOptions(lang);
    case "printable": return printableOptions(lang);
    case "days_left": return daysLeftOptions(lang);
  }
}

const FIELD_LABEL_TH: Record<FilterField, string> = {
  status: "สถานะ", source: "แหล่งที่มา", visa_type: "วีซ่า", intent: "ความต้องการ",
  contact_preference: "ติดต่อ", is_friend: "เพื่อน", printable: "ผลประเมิน", days_left: "เหลือ",
  date: "วันที่ส่ง", due_date: "กำหนด",
  ticket_id: "Ticket ID", name: "ชื่อเล่น", line: "LINE", phone: "โทร", destination: "ปลายทาง",
};
const FIELD_LABEL_EN: Record<FilterField, string> = {
  status: "Status", source: "Source", visa_type: "Visa", intent: "Intent",
  contact_preference: "Contact", is_friend: "Friend", printable: "Report", days_left: "Days left",
  date: "Submitted date", due_date: "Due date",
  ticket_id: "Ticket ID", name: "Nickname", line: "LINE", phone: "Phone", destination: "Destination",
};
export function fieldLabel(field: FilterField, lang: Lang = "th"): string {
  return lang === "en" ? FIELD_LABEL_EN[field] : FIELD_LABEL_TH[field];
}

export type MatchRow = {
  status: string;
  created_at: string;
  due_date: string | null;
  ticket_id: string | null;
  intent: string | null;
  contact_preference: string;
  printable: boolean;
  account: {
    source: string | null;
    nickname: string | null; full_name: string | null; first_name: string | null; last_name: string | null;
    line_display_name: string | null; phone: string | null; is_friend: boolean | null;
  } | null;
  trip: { visa_type: string; destination: string; travel_arrival: string | null; study_start: string | null } | null;
};

export const DAYS_LEFT_URGENT_MAX = 30;
export const DAYS_LEFT_SOON_MAX = 45;

/** Days between today and the trip's arrival (or study start). null when no date on file.
 * Single source of truth for both the table's "เหลือ" column/sort AND the days_left filter,
 * so the red/amber/gray thresholds shown in the UI always match what the filter buckets. */
export function daysToTravel(trip: MatchRow["trip"], todayIso: string): number | null {
  const iso = (trip?.travel_arrival ?? trip?.study_start)?.slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function daysLeftBucket(days: number | null): "urgent" | "soon" | "plenty" | null {
  if (days == null) return null;
  if (days < DAYS_LEFT_URGENT_MAX) return "urgent";
  if (days < DAYS_LEFT_SOON_MAX) return "soon";
  return "plenty";
}

function inRange(iso: string, from: string | null, to: string | null): boolean {
  const ts = Date.parse(iso);
  if (from && ts < Date.parse(`${from}T00:00:00`)) return false;
  if (to && ts > Date.parse(`${to}T23:59:59.999`)) return false;
  return true;
}

// AND across conditions; within a condition, OR across its value list. An empty
// `value` array for is_any_of means "match all" (not "match nothing") — a defensive
// default so an accidentally-emptied condition doesn't silently hide every row.
export function matchesCondition(row: MatchRow, c: FilterCondition, todayIso: string): boolean {
  switch (c.field) {
    case "status":
      return c.value.length === 0 || c.value.includes(row.status as StatusValue);
    case "source":
      return c.value.length === 0 || c.value.includes(row.account?.source ?? "other");
    case "visa_type":
      return c.value.length === 0 || c.value.includes(row.trip?.visa_type ?? "");
    case "intent":
      return c.value.length === 0 || c.value.includes(row.intent ?? "");
    case "contact_preference":
      return c.value.length === 0 || c.value.includes(row.contact_preference ?? "");
    case "is_friend": {
      const token = row.account?.is_friend === true ? "yes" : row.account?.is_friend === false ? "no" : "unknown";
      return c.value.length === 0 || c.value.includes(token);
    }
    case "printable": {
      const token = row.printable ? "yes" : "no";
      return c.value.length === 0 || c.value.includes(token);
    }
    case "days_left": {
      const bucket = daysLeftBucket(daysToTravel(row.trip, todayIso));
      return c.value.length === 0 || (bucket !== null && c.value.includes(bucket));
    }
    case "date":
      return inRange(row.created_at, c.value[0], c.value[1]);
    case "due_date":
      return row.due_date != null && inRange(row.due_date, c.value[0], c.value[1]);
    case "ticket_id":
      return !c.value || (row.ticket_id ?? "").toLowerCase().includes(c.value.toLowerCase());
    case "name":
      return !c.value || displayName(row.account).toLowerCase().includes(c.value.toLowerCase());
    case "line":
      return !c.value || (row.account?.line_display_name ?? "").toLowerCase().includes(c.value.toLowerCase());
    case "phone": {
      const qDigits = c.value.replace(/\D/g, "");
      return !qDigits || (row.account?.phone ?? "").replace(/\D/g, "").includes(qDigits);
    }
    case "destination":
      return !c.value || (row.trip?.destination ?? "").toLowerCase().includes(c.value.toLowerCase());
  }
}

export function applyConditions<T extends MatchRow>(rows: T[], conditions: FilterCondition[], todayIso: string): T[] {
  return conditions.length === 0 ? rows : rows.filter((r) => conditions.every((c) => matchesCondition(r, c, todayIso)));
}

export function newConditionId(): string {
  return Math.random().toString(36).slice(2);
}
