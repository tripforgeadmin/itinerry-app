import { supabase } from "./supabase";
import { one } from "./normalize";

/**
 * The main case-list query — extracted from app/admin/page.tsx so the admin table,
 * and the MCP search_cases tool share one implementation. Returns rows WITH raw
 * account PII (the admin UI needs it); the MCP layer must project through
 * lib/pii-mask.ts before anything leaves the server.
 */

export interface CaseAccount {
  nickname: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  line_display_name: string | null;
  phone: string | null;
  phone_country_code: string | null;
  is_friend: boolean | null;
  source: string | null;
}

export interface CaseTrip {
  visa_type: string | null;
  destination: string | null;
  travel_arrival: string | null;
  study_start: string | null;
}

export interface CaseListRow {
  id: string;
  ticket_id: string | null;
  created_at: string;
  due_date: string | null;
  status: string;
  contact_preference: string | null;
  intent: string | null;
  savings_balance: string | null;
  result_sent_at: string | null;
  entry_source: string | null;
  status_entered_at: string;
  follow_up_count: number;
  account: CaseAccount | null;
  trip: CaseTrip | null;
  printable: boolean;
}

export async function fetchCases(): Promise<{ rows: CaseListRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_assessment")
    .select(
      "id, ticket_id, created_at, due_date, status, contact_preference, intent, savings_balance, result_sent_at, entry_source, follow_up_count, status_history(changed_at), account:account_id(nickname, full_name, first_name, last_name, line_display_name, phone, phone_country_code, is_friend, source), trip:trip_id(visa_type, destination, travel_arrival, study_start), visa_evaluation(pass, strengths, improvements)"
    )
    .order("created_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []).map((r) => {
    const account = one<CaseAccount>(r.account);
    const trip = one<CaseTrip>(r.trip);
    const ev = one<{ pass: boolean | null; strengths: unknown; improvements: unknown }>(r.visa_evaluation);
    // When the case entered its current status = the latest status_history transition.
    // Falls back to created_at for pending_review (submit inserts no initial history row).
    const history = (Array.isArray(r.status_history) ? r.status_history : []) as { changed_at: string }[];
    const lastChanged = history.reduce<string | null>(
      (max, h) => (max && max >= h.changed_at ? max : h.changed_at),
      null
    );
    return {
      id: r.id as string,
      ticket_id: r.ticket_id as string | null,
      created_at: r.created_at as string,
      due_date: r.due_date as string | null,
      status: r.status as string,
      contact_preference: r.contact_preference as string | null,
      intent: r.intent as string | null,
      savings_balance: r.savings_balance as string | null,
      result_sent_at: r.result_sent_at as string | null,
      entry_source: r.entry_source as string | null,
      status_entered_at: lastChanged ?? (r.created_at as string),
      follow_up_count: (r.follow_up_count as number) ?? 0,
      account,
      trip,
      // healthcheck card is built from the evaluator's lists — printable only when both exist
      printable:
        ev?.pass != null &&
        Array.isArray(ev?.strengths) && (ev.strengths as unknown[]).length > 0 &&
        Array.isArray(ev?.improvements) && (ev.improvements as unknown[]).length > 0,
    };
  });

  return { rows, error: null };
}
