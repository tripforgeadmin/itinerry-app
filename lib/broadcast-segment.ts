import { supabase } from "./supabase";
import { bangkokNow } from "./holidays";

/**
 * Broadcast segment + condition resolution — the ONE place that decides who a broadcast
 * reaches. Used by the admin preview (population count), manual "send now", and the cron.
 *
 * Segment = attribute filters (SQL-side where possible). Condition = behavioral filters
 * that need per-row computation (reply recency, pain-point join, days-left thresholds) —
 * applied in code, same style as the follow-up cron's post-filtering.
 *
 * Hard exclusions applied to every broadcast regardless of rule config:
 *  - no line_user_id (can't push), is_friend === false (LINE rejects + they opted out socially)
 *  - broadcast_opt_out (explicit)
 *  - anonymized accounts (PDPA delete leaves '[ลบแล้ว]' rows)
 * One send per CUSTOMER: multiple open assessments collapse to the newest.
 */

export type BroadcastSegment = {
  countries?: string[]; // trip.destination ISO-2
  visaTypes?: string[];
  ageRanges?: string[]; // account.age_range buckets
  statuses?: string[]; // pipeline status
  serviceNeeds?: string[]; // prepare_docs | ready_to_submit | urgent
  journeyStages?: string[]; // maps 1:1 onto user_assessment.intent: explore | ready | execute
};

export type BroadcastConditionItem =
  | { type: "no_reply"; hours?: number } // default 72
  | { type: "pain_point"; keys: string[] }
  | { type: "days_left_by_country" };

export type BroadcastCondition =
  | BroadcastConditionItem
  | { type: "no_reply_72h" } // legacy rows saved before hours were configurable
  | { type: "all"; items: BroadcastConditionItem[] }
  | null;

/** Normalize any stored condition shape (legacy single or new multi) into an item list;
 * items are ANDed together. */
export function conditionItems(condition: BroadcastCondition): BroadcastConditionItem[] {
  if (!condition) return [];
  if (condition.type === "all") return condition.items ?? [];
  if (condition.type === "no_reply_72h") return [{ type: "no_reply", hours: 72 }];
  return [condition];
}

/** Everything the message renderer may reference. The trip fields ride along free — the
 * segment query already joins user_trip for the filters. */
export type Recipient = {
  assessmentId: string;
  accountId: string;
  lineUserId: string;
  lang: "th" | "en";
  displayName: string;
  destination: string | null; // ISO-2 as stored (lowercase in practice)
  visaType: string | null;
  travelDateIso: string | null; // travel_arrival ?? study_start
};

type Dict = Record<string, unknown>;
const one = (v: unknown): Dict | null => ((Array.isArray(v) ? v[0] : v) ?? null) as Dict | null;

function latestStatusChange(history: unknown): number | null {
  const arr = Array.isArray(history) ? (history as { changed_at: string }[]) : [];
  let max: number | null = null;
  for (const h of arr) {
    const ts = Date.parse(h.changed_at);
    if (!Number.isNaN(ts) && (max == null || ts > max)) max = ts;
  }
  return max;
}

/** Days from today (Bangkok) until the trip; null when no usable date. */
function daysLeft(trip: Dict | null, todayIso: string): number | null {
  const iso = ((trip?.travel_arrival ?? trip?.study_start) as string | undefined)?.slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export async function resolveSegment(
  segment: BroadcastSegment | null,
  condition: BroadcastCondition
): Promise<Recipient[]> {
  const seg = segment ?? {};

  let q = supabase
    .from("user_assessment")
    .select(
      "id, account_id, status, intent, service_needs, created_at, " +
        "account:account_id!inner(id, line_user_id, is_friend, broadcast_opt_out, nationality, age_range, last_inbound_at, nickname, full_name, first_name, last_name), " +
        "trip:trip_id!inner(destination, visa_type, travel_arrival, study_start), " +
        "status_history(changed_at)"
    );

  if (seg.statuses?.length) q = q.in("status", seg.statuses);
  if (seg.journeyStages?.length) q = q.in("intent", seg.journeyStages);
  if (seg.serviceNeeds?.length) q = q.in("service_needs", seg.serviceNeeds);
  // trip.destination is stored lowercase but the UI (and lead-time table) use uppercase ISO-2.
  if (seg.countries?.length) {
    q = q.in("trip.destination", [...new Set(seg.countries.flatMap((c) => [c.toLowerCase(), c.toUpperCase()]))]);
  }
  if (seg.visaTypes?.length) q = q.in("trip.visa_type", seg.visaTypes);
  if (seg.ageRanges?.length) q = q.in("account.age_range", seg.ageRanges);

  const { data, error } = await q;
  if (error) {
    console.error("resolveSegment query error:", error);
    return [];
  }

  let rows = (data ?? []) as unknown as Dict[];
  const todayIso = bangkokNow().iso;
  const nowMs = Date.now();

  // Hard exclusions (see header) — always in code so no rule config can bypass them.
  rows = rows.filter((r) => {
    const acc = one(r.account);
    if (!acc) return false;
    if (!acc.line_user_id) return false;
    if (acc.is_friend === false) return false;
    if (acc.broadcast_opt_out === true) return false;
    if (acc.full_name === "[ลบแล้ว]" || acc.nickname === "[ลบแล้ว]") return false;
    return true;
  });

  // Conditions are ANDed — every selected item must pass.
  for (const item of conditionItems(condition)) {
    if (item.type === "no_reply") {
      const windowMs = (item.hours && item.hours > 0 ? item.hours : 72) * 3600 * 1000;
      rows = rows.filter((r) => {
        const acc = one(r.account)!;
        const lastInbound = acc.last_inbound_at ? Date.parse(acc.last_inbound_at as string) : null;
        if (lastInbound != null && nowMs - lastInbound < windowMs) return false;
        const lastChange = latestStatusChange(r.status_history);
        return lastChange == null || nowMs - lastChange >= windowMs;
      });
    } else if (item.type === "pain_point") {
      const keys = item.keys.filter(Boolean);
      if (keys.length) {
        const { data: cc } = await supabase
          .from("case_comment")
          .select("assessment_id")
          .in("problem_category", keys);
        const hit = new Set(((cc ?? []) as { assessment_id: string }[]).map((c) => c.assessment_id));
        rows = rows.filter((r) => hit.has(r.id as string));
      }
    } else if (item.type === "days_left_by_country") {
      const { data: lt } = await supabase.from("country_visa_lead_time").select("*").eq("active", true);
      const thresholds = ((lt ?? []) as Dict[]);
      // Lead-time rows store uppercase ISO-2; trips store lowercase — compare case-insensitively.
      const thresholdFor = (dest: string, visa: string): number | null => {
        const d = (dest ?? "").toUpperCase();
        const v = (visa ?? "").toLowerCase();
        const exact = thresholds.find(
          (t) => (t.destination as string).toUpperCase() === d && (t.visa_type as string).toLowerCase() === v
        );
        const wild = thresholds.find((t) => (t.destination as string).toUpperCase() === d && t.visa_type === "*");
        return ((exact ?? wild)?.trigger_threshold_days as number | undefined) ?? null;
      };
      rows = rows.filter((r) => {
        const trip = one(r.trip);
        if (!trip) return false;
        const th = thresholdFor(trip.destination as string, trip.visa_type as string);
        if (th == null) return false;
        const d = daysLeft(trip, todayIso);
        return d != null && d > 0 && d <= th;
      });
    }
  }

  // One send per customer — keep the newest assessment.
  rows.sort((a, b) => Date.parse(b.created_at as string) - Date.parse(a.created_at as string));
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const r of rows) {
    const accId = r.account_id as string;
    if (seen.has(accId)) continue;
    seen.add(accId);
    const acc = one(r.account)!;
    const trip = one(r.trip);
    recipients.push({
      assessmentId: r.id as string,
      accountId: accId,
      lineUserId: acc.line_user_id as string,
      lang: acc.nationality === "other" ? "en" : "th",
      displayName:
        (acc.nickname as string) ||
        (acc.full_name as string) ||
        [acc.first_name, acc.last_name].filter(Boolean).join(" ") ||
        "—",
      destination: (trip?.destination as string) ?? null,
      visaType: (trip?.visa_type as string) ?? null,
      travelDateIso: ((trip?.travel_arrival ?? trip?.study_start) as string | undefined)?.slice(0, 10) ?? null,
    });
  }
  return recipients;
}

/** Population preview for the rule editor. Counted in code because conditions can't be
 * expressed as a SQL count. */
export async function countSegment(
  segment: BroadcastSegment | null,
  condition: BroadcastCondition
): Promise<{ count: number; sample: string[] }> {
  const recipients = await resolveSegment(segment, condition);
  return { count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.displayName) };
}
