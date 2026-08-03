import { supabase } from "./supabase";
import { pushMessage } from "./line-messaging";
import { resolveSegment, type BroadcastSegment, type BroadcastCondition, type Recipient } from "./broadcast-segment";

/**
 * Broadcast delivery engine. Sends one-by-one through the push API (not LINE multicast):
 * per-recipient rows in line_message_log are the audit trail, the per-run dedupe, and the
 * per-customer timeline — multicast would lose all three, and segments here are hundreds
 * of people at most.
 *
 * Claim-before-send per recipient: the partial-unique index (broadcast_run_id, account_id)
 * makes the log INSERT the claim, so a resumed 'partial' run — or two overlapping cron
 * invocations racing on the same run — can never double-send to one customer.
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
};

const RECIPIENT_CAP = 300; // stay well inside one function invocation; 'partial' resumes next slot

async function resolveOneToOne(accountId: string): Promise<Recipient[]> {
  const { data } = await supabase
    .from("account")
    .select("id, line_user_id, is_friend, broadcast_opt_out, nationality, nickname, full_name")
    .eq("id", accountId)
    .maybeSingle();
  if (!data?.line_user_id || data.is_friend === false || data.broadcast_opt_out === true) return [];
  return [{
    assessmentId: "",
    accountId: data.id as string,
    lineUserId: data.line_user_id as string,
    lang: data.nationality === "other" ? "en" : "th",
    displayName: (data.nickname as string) || (data.full_name as string) || "—",
  }];
}

export async function runBroadcast(rule: BroadcastRuleRow, runId: string): Promise<{ sent: number; failed: number; total: number }> {
  const recipients = rule.mode === "one_to_one" && rule.target_account_id
    ? await resolveOneToOne(rule.target_account_id)
    : await resolveSegment(rule.segment, rule.condition);

  const capped = recipients.slice(0, RECIPIENT_CAP);
  await supabase.from("broadcast_run").update({ recipients_total: capped.length }).eq("id", runId);

  let sent = 0, failed = 0, backoffs = 0;

  for (const r of capped) {
    const text = (r.lang === "en" ? rule.message_en : rule.message_th) || rule.message_th || rule.message_en;
    if (!text) break; // no message body configured — nothing sensible to send

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
