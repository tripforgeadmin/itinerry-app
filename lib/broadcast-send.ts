import { supabase } from "./supabase";
import { pushMessage } from "./line-messaging";
import { resolveSegment, type BroadcastSegment, type BroadcastCondition, type Recipient } from "./broadcast-segment";
import { COUNTRIES } from "./countries";
import { label } from "./answer-labels";

/**
 * Broadcast delivery engine. Sends one-by-one through the push API (not LINE multicast):
 * per-recipient rows in line_message_log are the audit trail, the per-run dedupe, and the
 * per-customer timeline — multicast would lose all three, and segments here are hundreds
 * of people at most.
 *
 * Claim-before-send per recipient: the partial-unique index (broadcast_run_id, account_id)
 * makes the log INSERT the claim, so a resumed 'partial' run — or two overlapping cron
 * invocations racing on the same run — can never double-send to one customer.
 *
 * Across runs, rule.per_customer_days (0039) is the suppression: a daily rule can fire
 * every day yet reach each person only once.
 */

export type BroadcastRuleRow = {
  id: string;
  name: string;
  mode: "auto" | "group" | "one_to_one";
  segment: BroadcastSegment | null;
  condition: BroadcastCondition;
  message_th: string | null;
  message_en: string | null;
  target_account_id: string | null;
  per_customer_days?: number | null;
};

const RECIPIENT_CAP = 300; // stay well inside one function invocation; 'partial' resumes next slot

async function resolveOneToOne(accountId: string): Promise<Recipient[]> {
  const { data } = await supabase
    .from("account")
    .select("id, line_user_id, is_friend, broadcast_opt_out, nationality, nickname, full_name")
    .eq("id", accountId)
    .maybeSingle();
  if (!data?.line_user_id || data.is_friend === false || data.broadcast_opt_out === true) return [];

  // Newest trip of this customer — only used to fill message placeholders, so a miss is fine.
  const { data: asm } = await supabase
    .from("user_assessment")
    .select("id, created_at, trip:trip_id(destination, visa_type, travel_arrival, study_start)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const trip = (Array.isArray(asm?.trip) ? asm?.trip[0] : asm?.trip) as Record<string, unknown> | undefined;

  return [{
    assessmentId: (asm?.id as string) ?? "",
    accountId: data.id as string,
    lineUserId: data.line_user_id as string,
    lang: data.nationality === "other" ? "en" : "th",
    displayName: (data.nickname as string) || (data.full_name as string) || "—",
    destination: (trip?.destination as string) ?? null,
    visaType: (trip?.visa_type as string) ?? null,
    travelDateIso: ((trip?.travel_arrival ?? trip?.study_start) as string | undefined)?.slice(0, 10) ?? null,
  }];
}

/**
 * Message placeholders. Both Thai and English token spellings are accepted regardless of
 * the recipient's language, so one rule body can be written either way. A token with no
 * data resolves to an empty string — never the literal "{ชื่อ}" in a customer's chat.
 */
const TOKEN_ALIASES: Record<string, "name" | "country" | "visa" | "daysLeft"> = {
  "ชื่อ": "name", name: "name",
  "ประเทศ": "country", country: "country",
  "วีซ่า": "visa", visa: "visa",
  "เหลือวัน": "daysLeft", days_left: "daysLeft", daysleft: "daysLeft",
};

export function renderTemplate(text: string, r: Recipient, todayIso: string): string {
  const values: Record<string, string> = {
    name: r.displayName && r.displayName !== "—" ? r.displayName : r.lang === "en" ? "there" : "คุณลูกค้า",
    country: (() => {
      if (!r.destination) return "";
      const c = COUNTRIES.find((x) => x.code.toUpperCase() === r.destination!.toUpperCase());
      return c ? (r.lang === "en" ? c.en : c.th) : r.destination.toUpperCase();
    })(),
    visa: r.visaType ? label("visa_type", r.visaType, r.lang) : "",
    daysLeft: (() => {
      if (!r.travelDateIso) return "";
      const d = Math.round((Date.parse(`${r.travelDateIso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
      return d >= 0 ? String(d) : "";
    })(),
  };
  return text.replace(/\{([^{}]{1,20})\}/g, (whole, rawKey: string) => {
    const key = TOKEN_ALIASES[rawKey.trim()] ?? TOKEN_ALIASES[rawKey.trim().toLowerCase()];
    return key ? values[key] : whole; // unknown braces stay as typed
  });
}

/** Account IDs this rule already reached inside its per-customer window. */
async function suppressedAccountIds(ruleId: string, perCustomerDays: number): Promise<Set<string>> {
  const { data: runs } = await supabase.from("broadcast_run").select("id").eq("rule_id", ruleId);
  const runIds = ((runs ?? []) as { id: string }[]).map((r) => r.id);
  if (runIds.length === 0) return new Set();

  let q = supabase.from("line_message_log").select("account_id").in("broadcast_run_id", runIds);
  if (perCustomerDays > 0) {
    q = q.gte("created_at", new Date(Date.now() - perCustomerDays * 86_400_000).toISOString());
  }
  const { data } = await q;
  return new Set(((data ?? []) as { account_id: string }[]).map((r) => r.account_id));
}

export async function runBroadcast(rule: BroadcastRuleRow, runId: string): Promise<{ sent: number; failed: number; total: number }> {
  let recipients = rule.mode === "one_to_one" && rule.target_account_id
    ? await resolveOneToOne(rule.target_account_id)
    : await resolveSegment(rule.segment, rule.condition);

  // Cross-run suppression (null = off, i.e. pre-0039 behaviour).
  if (rule.per_customer_days != null) {
    const skip = await suppressedAccountIds(rule.id, rule.per_customer_days);
    if (skip.size) recipients = recipients.filter((r) => !skip.has(r.accountId));
  }

  const capped = recipients.slice(0, RECIPIENT_CAP);
  await supabase.from("broadcast_run").update({ recipients_total: capped.length }).eq("id", runId);

  let sent = 0, failed = 0, backoffs = 0;
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  for (const r of capped) {
    const body = (r.lang === "en" ? rule.message_en : rule.message_th) || rule.message_th || rule.message_en;
    if (!body) break; // no message body configured — nothing sensible to send
    const text = renderTemplate(body, r, todayIso);

    // Claim first: insert the log row before pushing. A conflict (23505) means this run
    // already reached this customer — skip silently.
    const { error: claimErr } = await supabase.from("line_message_log").insert({
      account_id: r.accountId,
      assessment_id: r.assessmentId || null,
      kind: "broadcast",
      direction: "outbound",
      content: text.slice(0, 500),
      payload: null,
      sent_by: "system",
      delivered: false,
      broadcast_run_id: runId,
    });
    if (claimErr) {
      if (claimErr.code !== "23505") console.error("broadcast claim error:", claimErr);
      continue;
    }

    let delivered = false;
    try {
      delivered = await pushMessage(r.lineUserId, [{ type: "text", text }]);
    } catch (err) {
      // 429 / network — back off briefly; after 2 strikes stop and let the run stay partial.
      console.error("broadcast push threw:", err);
      backoffs++;
      if (backoffs > 2) break;
      await new Promise((res) => setTimeout(res, 1000));
    }

    await supabase
      .from("line_message_log")
      .update({ delivered, payload: [{ type: "text", text }] })
      .eq("broadcast_run_id", runId)
      .eq("account_id", r.accountId);

    if (delivered) sent++;
    else failed++;
  }

  const finished = sent + failed >= capped.length;
  await supabase
    .from("broadcast_run")
    .update({
      sent,
      failed,
      status: finished ? "done" : "partial",
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return { sent, failed, total: capped.length };
}
