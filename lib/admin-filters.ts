import type { StatusValue } from "./status";
import { LABELS, label } from "./answer-labels";
import type { Lang } from "@/lib/i18n";

export type FilterField = "status" | "source" | "date";
export type FilterOperator = "is_any_of" | "is_between";

export type FilterCondition =
  | { id: string; field: "status"; operator: "is_any_of"; value: StatusValue[] }
  | { id: string; field: "source"; operator: "is_any_of"; value: string[] }
  | { id: string; field: "date"; operator: "is_between"; value: [string | null, string | null] }; // [fromISO date, toISO date], either end open

export const SOURCE_OPTIONS = Object.entries(LABELS.source).map(([value, lab]) => ({ value, label: lab }));

/** Source filter options in the active language. */
export function sourceOptions(lang: Lang = "th") {
  return Object.keys(LABELS.source).map((value) => ({ value, label: label("source", value, lang) }));
}

type MatchRow = { status: string; created_at: string; account: { source: string | null } | null };

// AND across conditions; within a condition, OR across its value list. An empty
// `value` array for is_any_of means "match all" (not "match nothing") — a defensive
// default so an accidentally-emptied condition doesn't silently hide every row.
export function matchesCondition(row: MatchRow, c: FilterCondition): boolean {
  switch (c.field) {
    case "status":
      return c.value.length === 0 || c.value.includes(row.status as StatusValue);
    case "source":
      return c.value.length === 0 || c.value.includes(row.account?.source ?? "other");
    case "date": {
      const [from, to] = c.value;
      const t = Date.parse(row.created_at);
      if (from && t < Date.parse(`${from}T00:00:00`)) return false;
      if (to && t > Date.parse(`${to}T23:59:59.999`)) return false;
      return true;
    }
  }
}

export function applyConditions<T extends MatchRow>(rows: T[], conditions: FilterCondition[]): T[] {
  return conditions.length === 0 ? rows : rows.filter((r) => conditions.every((c) => matchesCondition(r, c)));
}

export function newConditionId(): string {
  return Math.random().toString(36).slice(2);
}

export function fieldLabel(field: FilterField, lang: Lang = "th"): string {
  if (lang === "en") return field === "status" ? "Status" : field === "source" ? "Source" : "Submitted date";
  return field === "status" ? "สถานะ" : field === "source" ? "แหล่งที่มา" : "วันที่ส่ง";
}
