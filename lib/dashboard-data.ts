import { supabase } from "@/lib/supabase";
import { fetchLostReasonLabels } from "@/lib/lost-reasons";
import type { Lang } from "@/lib/i18n";

// The analytics dashboard (app/admin/dashboard) is a port of a self-contained mockup whose
// chart engine computes everything from three arrays. These are those arrays, sourced live:
//   ACC   — one row per account (user)         → account
//   ASS   — one row per assessment (case)       → user_assessment (+ trip, evaluation)
//   TRANS — one row per status change           → status_history
// Field names (c/st/occ/…/tc, ac/f/t) match the mockup's contract exactly so the ported
// engine (app/admin/dashboard/engine.ts) runs unchanged.

export interface DashAcc {
  c: string; // created_at (ISO)
  src: string | null; // acquisition source
  f: boolean | null; // is LINE friend
}
export interface DashAss {
  c: string; // created_at (ISO)
  st: string; // pipeline status
  occ: string | null; // occupation
  int: string | null; // intent/readiness
  cp: string | null; // contact preference
  rs: boolean; // result sent to customer
  l1: string | null; // lost reason (L1)
  won: string | null; // won service type
  ties: string[]; // ties to Thailand
  dest: string | null; // destination ISO code
  vt: string | null; // visa type
  score: number | null; // assessment score (0–98)
  pass: boolean | null; // manual pass/fail
  tc: number | null; // hours from creation to first "contacted"
}
export interface DashTrans {
  ac: string; // changed_at (ISO)
  f: string | null; // from_status
  t: string; // to_status
}
export interface DashboardData {
  acc: DashAcc[];
  ass: DashAss[];
  trans: DashTrans[];
  now: number; // server "now" epoch ms — drives the range presets + the "as of" pill
  lostLabels: Record<string, string>; // lost_reason key → Thai label (DB-driven)
}

/** Aliased FK embeds come back as an object OR a single-element array — normalize. */
function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export async function fetchDashboardData(lang: Lang = "th"): Promise<DashboardData> {
  const [accRes, assRes, transRes, lostLabels] = await Promise.all([
    supabase.from("account").select("created_at, source, is_friend"),
    supabase
      .from("user_assessment")
      .select(
        "id, created_at, status, occupation, intent, contact_preference, result_sent_at, lost_reason_l1, won_service_type, ties_thailand, trip:trip_id(destination, visa_type), visa_evaluation(score, pass)"
      ),
    supabase.from("status_history").select("assessment_id, changed_at, from_status, to_status"),
    fetchLostReasonLabels(lang),
  ]);

  const acc: DashAcc[] = (accRes.data ?? []).map((a) => ({
    c: a.created_at as string,
    src: (a.source as string) ?? null,
    f: (a.is_friend as boolean) ?? null,
  }));

  // Earliest "→ contacted" transition per assessment → time-to-contact.
  const contactedAt = new Map<string, number>();
  const trans: DashTrans[] = [];
  for (const t of transRes.data ?? []) {
    trans.push({ ac: t.changed_at as string, f: (t.from_status as string) ?? null, t: t.to_status as string });
    if (t.to_status === "contacted") {
      const ms = Date.parse(t.changed_at as string);
      const cur = contactedAt.get(t.assessment_id as string);
      if (cur == null || ms < cur) contactedAt.set(t.assessment_id as string, ms);
    }
  }

  const ass: DashAss[] = (assRes.data ?? []).map((r) => {
    const trip = one(r.trip as Record<string, unknown> | Record<string, unknown>[]);
    const ev = one(r.visa_evaluation as Record<string, unknown> | Record<string, unknown>[]);
    const created = Date.parse(r.created_at as string);
    const ct = contactedAt.get(r.id as string);
    const tc = ct != null && Number.isFinite(created) ? Math.round(((ct - created) / 3_600_000) * 10) / 10 : null;
    return {
      c: r.created_at as string,
      st: r.status as string,
      occ: (r.occupation as string) ?? null,
      int: (r.intent as string) ?? null,
      cp: (r.contact_preference as string) ?? null,
      rs: r.result_sent_at != null,
      l1: (r.lost_reason_l1 as string) ?? null,
      won: (r.won_service_type as string) ?? null,
      ties: Array.isArray(r.ties_thailand) ? (r.ties_thailand as string[]) : [],
      dest: (trip?.destination as string) ?? null,
      vt: (trip?.visa_type as string) ?? null,
      score: ev?.score != null ? (ev.score as number) : null,
      pass: ev?.pass != null ? (ev.pass as boolean) : null,
      tc,
    };
  });

  return { acc, ass, trans, now: Date.now(), lostLabels };
}
