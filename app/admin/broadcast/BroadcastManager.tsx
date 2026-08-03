"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { statusLabel } from "@/lib/status";
import RuleEditorModal from "./RuleEditorModal";
import AdCalendar from "./AdCalendar";

export type CampaignRow = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  channel: string; active: boolean; created_at: string;
};
export type RuleRow = {
  id: string; campaign_id: string | null; name: string; mode: string; enabled: boolean;
  days_of_week: number[]; time_slots: string[]; segment: Record<string, string[]> | null;
  condition: { type: string; keys?: string[]; hours?: number; items?: { type: string; keys?: string[]; hours?: number }[] } | null;
  message_th: string | null; message_en: string | null; target_account_id: string | null;
  created_at: string;
};
export type PainPointOption = { key: string; label_th: string; label_en: string | null };
export type RunRow = {
  id: string; rule_id: string; slot_date: string; slot_time: string; status: string;
  recipients_total: number | null; sent: number; failed: number; created_at: string;
};
export type AdEvent = { dateIso: string; endDateIso: string; summary: string; matched: boolean };

const DAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function BroadcastManager({
  lang, campaigns, rules, painPointOptions, runs, calendarEnabled, adEvents, adKeywords,
}: {
  lang: Lang;
  campaigns: CampaignRow[];
  rules: RuleRow[];
  painPointOptions: PainPointOption[];
  runs: RunRow[];
  calendarEnabled: boolean;
  adEvents: AdEvent[];
  adKeywords: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"rules" | "runs">("rules");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<RuleRow | "new" | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [keywordsDraft, setKeywordsDraft] = useState(adKeywords.join(", "));

  async function call(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (busy) return null;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) alert((json.error as string) || t(lang, "ทำรายการไม่สำเร็จ", "Action failed"));
      router.refresh();
      return json;
    } finally {
      setBusy(false);
    }
  }

  function describeTrigger(r: RuleRow): string {
    if (r.mode !== "auto") return "—";
    const days = r.days_of_week.length === 7
      ? t(lang, "ทุกวัน", "Daily")
      : r.days_of_week.map((d) => (lang === "en" ? DAY_EN[d] : DAY_TH[d])).join(",");
    return `${days} · ${r.time_slots.join(", ")}`;
  }

  function describeCondition(r: RuleRow): string {
    const c = r.condition;
    if (!c) return "—";
    const items = c.type === "all" ? c.items ?? [] : [c];
    const parts = items.map((item) => {
      if (item.type === "no_reply" || item.type === "no_reply_72h") {
        const h = item.hours ?? 72;
        return t(lang, `ไม่ตอบเกิน ${h} ชม.`, `No reply ${h} hrs`);
      }
      if (item.type === "days_left_by_country") return t(lang, "ใกล้เดดไลน์ตามประเทศ", "Days-left by country");
      if (item.type === "pain_point") {
        const labels = (item.keys ?? []).map((k) => {
          const o = painPointOptions.find((p) => p.key === k);
          return o ? (lang === "en" ? o.label_en || o.label_th : o.label_th) : k;
        });
        return `Pain: ${labels.join(", ")}`;
      }
      return item.type;
    });
    return parts.join(" + ") || "—";
  }

  function describeSegment(r: RuleRow): string {
    const s = r.segment;
    if (!s) return t(lang, "ทุกคน", "Everyone");
    const parts: string[] = [];
    if (s.countries?.length) parts.push(s.countries.join("/"));
    if (s.visaTypes?.length) parts.push(s.visaTypes.join("/"));
    if (s.ageRanges?.length) parts.push(`${t(lang, "อายุ", "age")} ${s.ageRanges.length}`);
    if (s.statuses?.length) parts.push(s.statuses.map((v) => statusLabel(v, lang)).join("/"));
    if (s.serviceNeeds?.length) parts.push(`${t(lang, "ความต้องการ", "needs")} ${s.serviceNeeds.length}`);
    if (s.journeyStages?.length) parts.push(s.journeyStages.join("/"));
    return parts.join(" · ") || t(lang, "ทุกคน", "Everyone");
  }

  const campaignNameOf = (id: string | null) =>
    id ? campaigns.find((c) => c.id === id)?.name ?? "—" : "—";
  const ruleName = (id: string) => rules.find((r) => r.id === id)?.name ?? id.slice(0, 8);
  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
      timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  const latestRun = (ruleId: string) => runs.find((run) => run.rule_id === ruleId); // runs come newest-first
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const todayIsAdDay = adEvents.some((e) => e.matched && e.dateIso <= todayIso && todayIso <= e.endDateIso);

  const inputCls = "rounded-lg border border-gray-200 px-2 py-1.5 text-xs";
  const btnDark = "rounded-lg px-3 py-1.5 text-xs font-bold bg-gray-800 text-white disabled:opacity-40";
  const theadCls = "text-left text-[11px] text-gray-400 uppercase";
  const thCls = "py-1.5 pr-3 font-medium";
  const sectionH = "text-xs font-bold text-gray-400 uppercase tracking-wider";

  return (
    <div>
      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4">
        {([
          ["rules", t(lang, "กฎการส่ง", "Rules")],
          ["runs", t(lang, "ประวัติการส่ง", "Run history")],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              tab === key ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:text-gray-800 shadow-sm"
            }`}
          >
            {label}
            {key === "runs" && <span className="ml-1.5 font-normal opacity-60">{runs.length}</span>}
          </button>
        ))}
      </div>

      {todayIsAdDay && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          📣 {t(lang,
            "วันนี้เป็นวันยิงแอดตามปฏิทิน marketing — บอดแคสอัตโนมัติทุกกฎจะถูกข้าม (กดส่งเองยังส่งได้)",
            "Today is an ad day on the marketing calendar — all automatic broadcasts are skipped (manual sends still work)")}
        </div>
      )}

      {tab === "rules" ? (
        /* ── One box: rules table + ad calendar + campaigns ─────────── */
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {/* Rules */}
          <div className="flex items-center justify-between mb-3">
            <h2 className={sectionH}>
              {t(lang, "กฎการส่ง (Rules)", "Rules")}
              <span className="ml-2 font-normal normal-case tracking-normal">{rules.length}</span>
            </h2>
            <button onClick={() => setEditing("new")} className={btnDark}>
              ＋ {t(lang, "เพิ่มกฎ", "Add rule")}
            </button>
          </div>
          {rules.length === 0 ? (
            <p className="text-sm text-gray-400">{t(lang, "ยังไม่มีกฎ — กด “เพิ่มกฎ” เพื่อเริ่ม", "No rules yet — add one to start")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theadCls}>
                    <th className={thCls}>{t(lang, "สถานะ", "Status")}</th>
                    <th className={thCls}>{t(lang, "ชื่อกฎ", "Name")}</th>
                    <th className={thCls}>{t(lang, "โหมด", "Mode")}</th>
                    <th className={thCls}>{t(lang, "เวลาส่ง", "Schedule")}</th>
                    <th className={thCls}>{t(lang, "กลุ่มเป้าหมาย", "Segment")}</th>
                    <th className={thCls}>{t(lang, "เงื่อนไข", "Condition")}</th>
                    <th className={thCls}>{t(lang, "แคมเปญ", "Campaign")}</th>
                    <th className={thCls}>{t(lang, "ส่งล่าสุด", "Last run")}</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => {
                    const run = latestRun(r.id);
                    return (
                      <tr key={r.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${r.enabled ? "" : "opacity-50"}`}>
                        <td className="py-2 pr-3">
                          <button
                            onClick={() => call({ action: "rule_toggle", id: r.id, enabled: !r.enabled })}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              r.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {r.enabled ? "ON" : "OFF"}
                          </button>
                        </td>
                        <td className="py-2 pr-3 font-medium text-gray-800 max-w-45 truncate" title={r.name}>{r.name}</td>
                        <td className="py-2 pr-3 text-gray-600">
                          {r.mode === "auto" ? "Auto" : r.mode === "group" ? t(lang, "กดส่งเอง", "Manual") : "1-on-1"}
                        </td>
                        <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{describeTrigger(r)}</td>
                        <td className="py-2 pr-3 text-gray-600 max-w-45 truncate" title={describeSegment(r)}>{describeSegment(r)}</td>
                        <td className="py-2 pr-3 text-gray-600 max-w-40 truncate" title={describeCondition(r)}>{describeCondition(r)}</td>
                        <td className="py-2 pr-3 text-gray-600 max-w-30 truncate" title={campaignNameOf(r.campaign_id)}>{campaignNameOf(r.campaign_id)}</td>
                        <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                          {run
                            ? <>
                                {fmtDT(run.created_at)}
                                {run.status === "skipped_ad"
                                  ? ` · ${t(lang, "ข้ามวันแอด", "skipped")}`
                                  : ` · ${run.sent}/${run.recipients_total ?? "?"}`}
                              </>
                            : "—"}
                        </td>
                        <td className="py-2 whitespace-nowrap text-right">
                          {r.mode !== "auto" && (
                            <button
                              onClick={() =>
                                confirm(t(lang, `ส่ง "${r.name}" ตอนนี้เลย?`, `Send "${r.name}" now?`)) &&
                                call({ action: "send_now", ruleId: r.id }).then((j) => {
                                  if (j?.ok) alert(t(lang, `ส่งแล้ว ${j.sent}/${j.total} คน`, `Sent ${j.sent}/${j.total}`));
                                })
                              }
                              className="text-blue-500 hover:text-blue-700 mr-3"
                            >
                              {t(lang, "ส่งเลย", "Send now")}
                            </button>
                          )}
                          <button onClick={() => setEditing(r)} className="text-gray-400 hover:text-gray-600 mr-3">
                            {t(lang, "แก้ไข", "Edit")}
                          </button>
                          <button
                            onClick={() =>
                              confirm(t(lang, `ลบกฎ "${r.name}"?`, `Delete rule "${r.name}"?`)) &&
                              call({ action: "rule_delete", id: r.id })
                            }
                            className="text-red-300 hover:text-red-500"
                          >
                            {t(lang, "ลบ", "Del")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Ad calendar */}
          <hr className="my-5 border-gray-100" />
          <h2 className={`${sectionH} mb-3`}>📆 {t(lang, "ตารางยิงแอด (Google Calendar)", "Ad schedule (Google Calendar)")}</h2>
          {!calendarEnabled ? (
            <p className="text-xs text-gray-400">
              {t(lang,
                "ยังไม่ได้เชื่อมปฏิทิน — ไปที่ Google Calendar ของทีม → Settings → \"Secret address in iCal format\" แล้วคัดลอก URL มาใส่ env ชื่อ GOOGLE_CALENDAR_ICS_URL (ทั้งใน Vercel และ .env.local)",
                "Calendar not connected — in the team Google Calendar go to Settings → \"Secret address in iCal format\", copy the URL into the GOOGLE_CALENDAR_ICS_URL env var (Vercel + .env.local)")}
            </p>
          ) : (
            <>
              <AdCalendar lang={lang} events={adEvents} todayIso={todayIso} />
              <div className="flex gap-2 mt-3">
                <input
                  value={keywordsDraft}
                  onChange={(e) => setKeywordsDraft(e.target.value)}
                  placeholder={t(lang, "คีย์เวิร์ดวันยิงแอด คั่นด้วย ,", "Ad-day keywords, comma-separated")}
                  className={`${inputCls} flex-1`}
                />
                <button onClick={() => call({ action: "ad_keywords_set", keywords: keywordsDraft })} disabled={busy} className={btnDark}>
                  {t(lang, "บันทึกคีย์เวิร์ด", "Save keywords")}
                </button>
              </div>
            </>
          )}

          {/* Campaigns */}
          <hr className="my-5 border-gray-100" />
          <h2 className={`${sectionH} mb-3`}>
            {t(lang, "แคมเปญ", "Campaigns")}
            <span className="ml-2 font-normal normal-case tracking-normal">{campaigns.length}</span>
          </h2>
          {campaigns.length > 0 && (
            <table className="w-full text-xs mb-3">
              <thead>
                <tr className={theadCls}>
                  <th className={thCls}>{t(lang, "ชื่อ", "Name")}</th>
                  <th className={thCls}>{t(lang, "ช่วงเวลา", "Period")}</th>
                  <th className={thCls}>{t(lang, "ช่องทาง", "Channel")}</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className={`border-t border-gray-100 ${c.active ? "" : "opacity-50"}`}>
                    <td className="py-1.5 pr-3 font-medium text-gray-800">{c.name}</td>
                    <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                      {c.start_date ?? "…"} → {c.end_date ?? "…"}
                      {c.start_date && c.end_date &&
                        ` (${Math.max(0, Math.round((Date.parse(c.end_date) - Date.parse(c.start_date)) / 86_400_000))} ${t(lang, "วัน", "days")})`}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 uppercase">{c.channel}</span>
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => call({ action: "campaign_update", id: c.id, active: !c.active })}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        {c.active ? t(lang, "ปิดใช้งาน", "Deactivate") : t(lang, "เปิดใช้งาน", "Activate")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex flex-wrap gap-2">
            <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t(lang, "ชื่อแคมเปญ", "Campaign name")} className={`${inputCls} flex-1 min-w-40`} />
            <input type="date" value={campaignStart} onChange={(e) => setCampaignStart(e.target.value)} className={inputCls} />
            <input type="date" value={campaignEnd} onChange={(e) => setCampaignEnd(e.target.value)} className={inputCls} />
            <button
              onClick={() =>
                campaignName.trim() &&
                call({ action: "campaign_add", name: campaignName, startDate: campaignStart, endDate: campaignEnd }).then(() => {
                  setCampaignName(""); setCampaignStart(""); setCampaignEnd("");
                })
              }
              disabled={busy || !campaignName.trim()}
              className={btnDark}
            >
              {t(lang, "เพิ่ม", "Add")}
            </button>
          </div>
        </div>
      ) : (
        /* ── Run history tab ─────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className={`${sectionH} mb-3`}>
            {t(lang, "ประวัติการส่งล่าสุด", "Recent runs")}
            <span className="ml-2 font-normal normal-case tracking-normal">{runs.length}</span>
          </h2>
          {runs.length === 0 ? (
            <p className="text-xs text-gray-400">{t(lang, "ยังไม่เคยส่ง", "No runs yet")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theadCls}>
                    <th className={thCls}>{t(lang, "กฎ", "Rule")}</th>
                    <th className={thCls}>{t(lang, "รอบส่ง", "Slot")}</th>
                    <th className={thCls}>{t(lang, "เวลา", "Time")}</th>
                    <th className={thCls}>{t(lang, "สถานะ", "Status")}</th>
                    <th className={thCls}>{t(lang, "ผลลัพธ์", "Result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 font-medium text-gray-800">{ruleName(run.rule_id)}</td>
                      <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                        {run.slot_time.startsWith("manual:") ? t(lang, "กดส่งเอง", "manual") : `${run.slot_date} ${run.slot_time}`}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{fmtDT(run.created_at)}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          run.status === "done" ? "bg-green-100 text-green-700"
                          : run.status === "partial" || run.status === "skipped_ad" ? "bg-amber-100 text-amber-700"
                          : run.status === "failed" ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                        }`}>
                          {run.status === "skipped_ad" ? t(lang, "ข้ามวันยิงแอด", "skipped (ad day)") : run.status}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-500 whitespace-nowrap">
                        {run.status !== "skipped_ad" && (
                          <>
                            {run.sent}/{run.recipients_total ?? "?"} {t(lang, "ส่งสำเร็จ", "sent")}
                            {run.failed > 0 && ` · ${run.failed} ${t(lang, "ล้มเหลว", "failed")}`}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <RuleEditorModal
          lang={lang}
          campaigns={campaigns}
          painPointOptions={painPointOptions}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft, id) => {
            await call({ action: id ? "rule_update" : "rule_add", id, ...draft });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
