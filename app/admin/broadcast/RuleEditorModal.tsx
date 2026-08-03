"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { STATUS_OPTIONS, statusLabel } from "@/lib/status";
import { label } from "@/lib/answer-labels";
import { sortedCountries } from "@/lib/countries";
import type { CampaignRow, PainPointOption, RuleRow } from "./BroadcastManager";

export const SLOT_OPTIONS = ["09:00", "11:30", "12:30", "16:00", "16:30", "18:00", "20:00"];
const AUTO_PRESET = ["09:00", "16:00"];
const VISA_TYPES = ["tourist", "visitor", "business", "student"];
const AGE_RANGES = ["under_18", "18_29", "30_39", "40_49", "50_59", "60_plus"];
const SERVICE_NEEDS: { value: string; th: string; en: string }[] = [
  { value: "prepare_docs", th: "เตรียมเอกสาร", en: "Preparing docs" },
  { value: "ready_to_submit", th: "พร้อมยื่น", en: "Ready to submit" },
  { value: "urgent", th: "เร่งด่วน", en: "Urgent" },
];
// Journey stages ride on the existing intent field (whiteboard: Cold → Consideration → Hot)
const JOURNEY: { value: string; th: string; en: string }[] = [
  { value: "explore", th: "หาข้อมูล (Cold)", en: "Information (Cold)" },
  { value: "ready", th: "พิจารณา (Consideration)", en: "Consideration" },
  { value: "execute", th: "ตัดสินใจ (Hot)", en: "Final decision (Hot)" },
];

export type ConditionItem = { type: string; keys?: string[]; hours?: number };
export type RuleCondition = (ConditionItem & { items?: ConditionItem[] }) | null;

export type RuleDraft = {
  name: string;
  campaignId: string;
  mode: string;
  daysOfWeek: number[];
  timeSlots: string[];
  segment: Record<string, string[]>;
  condition: RuleCondition;
  messageTh: string;
  messageEn: string;
  targetAccountId: string;
};

type AccountHit = {
  id: string; nickname: string | null; full_name: string | null;
  line_display_name: string | null; line_user_id: string | null;
  is_friend: boolean | null; broadcast_opt_out: boolean;
};

const DAYS: { value: number; th: string; en: string }[] = [
  { value: 1, th: "จันทร์", en: "Mon" }, { value: 2, th: "อังคาร", en: "Tue" }, { value: 3, th: "พุธ", en: "Wed" },
  { value: 4, th: "พฤหัส", en: "Thu" }, { value: 5, th: "ศุกร์", en: "Fri" }, { value: 6, th: "เสาร์", en: "Sat" },
  { value: 0, th: "อาทิตย์", en: "Sun" },
];

export default function RuleEditorModal({
  lang, campaigns, painPointOptions, initial, onClose, onSave,
}: {
  lang: Lang;
  campaigns: CampaignRow[];
  painPointOptions: PainPointOption[];
  initial: (RuleRow & { id: string }) | null;
  onClose: () => void;
  onSave: (draft: RuleDraft, id?: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [campaignId, setCampaignId] = useState(initial?.campaign_id ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "group");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]);
  const [timeSlots, setTimeSlots] = useState<string[]>(initial?.time_slots ?? []);
  const [segment, setSegment] = useState<Record<string, string[]>>(initial?.segment ?? {});
  // Stored condition can be legacy single ({type:"no_reply_72h"} etc.) or {type:"all",items:[…]}.
  const initialCondItems = ((): ConditionItem[] => {
    const c = initial?.condition as RuleCondition;
    if (!c) return [];
    if (c.type === "all") return c.items ?? [];
    if (c.type === "no_reply_72h") return [{ type: "no_reply", hours: 72 }];
    return [c];
  })();
  const [condNoReply, setCondNoReply] = useState(initialCondItems.some((i) => i.type === "no_reply"));
  const [noReplyHours, setNoReplyHours] = useState(
    String(initialCondItems.find((i) => i.type === "no_reply")?.hours ?? 72)
  );
  const [condDaysLeft, setCondDaysLeft] = useState(initialCondItems.some((i) => i.type === "days_left_by_country"));
  const [condPain, setCondPain] = useState(initialCondItems.some((i) => i.type === "pain_point"));
  const [painKeys, setPainKeys] = useState<string[]>(
    initialCondItems.find((i) => i.type === "pain_point")?.keys ?? []
  );
  const [messageTh, setMessageTh] = useState(initial?.message_th ?? "");
  const [messageEn, setMessageEn] = useState(initial?.message_en ?? "");
  const [targetAccountId, setTargetAccountId] = useState(initial?.target_account_id ?? "");
  const [targetLabel, setTargetLabel] = useState(initial?.target_account_id ? "…" : "");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<AccountHit[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const countries = useMemo(() => sortedCountries(lang === "en" ? "en" : "th"), [lang]);
  const filteredCountries = useMemo(() => {
    const f = countryFilter.trim().toLowerCase();
    if (!f) return countries;
    return countries.filter((c) =>
      c.code.toLowerCase().includes(f) || c.en.toLowerCase().includes(f) || c.th.includes(countryFilter.trim())
    );
  }, [countries, countryFilter]);

  function toggleSeg(field: string, value: string) {
    setSegment((prev) => {
      const cur = prev[field] ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [field]: next };
    });
    setPreview(null);
  }

  function condition(): RuleCondition {
    const items: ConditionItem[] = [];
    if (condNoReply) {
      const h = Math.round(Number(noReplyHours));
      items.push({ type: "no_reply", hours: Number.isFinite(h) && h >= 1 ? Math.min(h, 720) : 72 });
    }
    if (condDaysLeft) items.push({ type: "days_left_by_country" });
    if (condPain && painKeys.length) items.push({ type: "pain_point", keys: painKeys });
    if (items.length === 0) return null;
    return items.length === 1 ? items[0] : { type: "all", items };
  }

  async function runPreview() {
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", segment, condition: condition() }),
    });
    const json = await res.json().catch(() => null);
    if (json?.ok) setPreview({ count: json.count, sample: json.sample });
  }

  function searchAccounts(term: string) {
    setSearch(term);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!term.trim()) { setHits([]); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "account_search", term }),
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) setHits(json.accounts as AccountHit[]);
    }, 300);
  }

  async function save() {
    if (saving || !name.trim()) return;
    if (mode === "auto" && timeSlots.length === 0) {
      alert(t(lang, "กฎ auto ต้องเลือกเวลาส่งอย่างน้อย 1 ช่วง", "Auto rules need at least one time slot"));
      return;
    }
    if (mode === "one_to_one" && !targetAccountId) {
      alert(t(lang, "โหมด 1-on-1 ต้องเลือกลูกค้าก่อน", "1-on-1 mode needs a target customer"));
      return;
    }
    if (!messageTh.trim() && !messageEn.trim()) {
      alert(t(lang, "ต้องมีข้อความอย่างน้อย 1 ภาษา", "At least one message body is required"));
      return;
    }
    setSaving(true);
    try {
      await onSave(
        { name, campaignId, mode, daysOfWeek, timeSlots, segment, condition: condition(), messageTh, messageEn, targetAccountId },
        initial?.id
      );
    } finally {
      setSaving(false);
    }
  }

  const checkbox = (checked: boolean, onChange: () => void, lab: string) => (
    <label key={lab} className="flex items-center gap-1.5 text-xs text-gray-700 whitespace-nowrap">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {lab}
    </label>
  );
  const sectionLabel = "text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1";
  const hitLabel = (a: AccountHit) => a.nickname || a.full_name || a.line_display_name || a.id.slice(0, 8);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">
          {initial ? t(lang, "แก้ไขกฎ", "Edit rule") : t(lang, "เพิ่มกฎใหม่", "New rule")}
        </h2>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(lang, "ชื่อกฎ เช่น ตาม US ใกล้เดดไลน์", "Rule name")}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            autoFocus
          />
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white">
            <option value="">{t(lang, "— ไม่ผูกแคมเปญ —", "— no campaign —")}</option>
            {campaigns.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={sectionLabel}>{t(lang, "โหมด", "Mode")}</div>
        <div className="flex gap-2">
          {[
            { value: "auto", label: t(lang, "อัตโนมัติ (ตามเวลา+เงื่อนไข)", "Automatic rule") },
            { value: "group", label: t(lang, "Group (กดส่งเอง)", "Group (manual)") },
            { value: "one_to_one", label: "1-on-1" },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                mode === m.value ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 text-gray-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "auto" && (
          <>
            <div className={sectionLabel}>{t(lang, "วันที่ส่ง", "Days")}</div>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d) =>
                checkbox(
                  daysOfWeek.includes(d.value),
                  () => setDaysOfWeek((prev) =>
                    prev.includes(d.value) ? prev.filter((v) => v !== d.value) : [...prev, d.value]
                  ),
                  lang === "en" ? d.en : d.th
                )
              )}
            </div>

            <div className={sectionLabel}>
              {t(lang, "ช่วงเวลา (Bangkok)", "Time slots (Bangkok)")}
              <button onClick={() => setTimeSlots(AUTO_PRESET)} className="ml-2 text-blue-500 normal-case font-medium">
                Auto (9:00, 16:00)
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {SLOT_OPTIONS.map((s) =>
                checkbox(
                  timeSlots.includes(s),
                  () => setTimeSlots((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s])),
                  s
                )
              )}
            </div>
          </>
        )}

        {mode === "one_to_one" ? (
          <>
            <div className={sectionLabel}>{t(lang, "ลูกค้าเป้าหมาย", "Target customer")}</div>
            {targetAccountId && (
              <p className="text-xs text-gray-700 mb-1">
                ✓ {targetLabel}
                <button onClick={() => { setTargetAccountId(""); setTargetLabel(""); }} className="ml-2 text-red-400">
                  {t(lang, "เปลี่ยน", "change")}
                </button>
              </p>
            )}
            {!targetAccountId && (
              <div>
                <input
                  value={search}
                  onChange={(e) => searchAccounts(e.target.value)}
                  placeholder={t(lang, "ค้นหาชื่อ/ชื่อเล่น/ชื่อ LINE…", "Search name / nickname / LINE name…")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                {hits.length > 0 && (
                  <ul className="mt-1 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-40 overflow-auto">
                    {hits.map((a) => {
                      const unreachable = !a.line_user_id || a.is_friend === false || a.broadcast_opt_out;
                      return (
                        <li key={a.id}>
                          <button
                            disabled={unreachable}
                            onClick={() => { setTargetAccountId(a.id); setTargetLabel(hitLabel(a)); setHits([]); setSearch(""); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40"
                          >
                            {hitLabel(a)}
                            {unreachable && <span className="text-red-400 ml-1">({t(lang, "ส่ง LINE ไม่ได้", "unreachable")})</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={sectionLabel}>{t(lang, "กลุ่มเป้าหมาย (Segment) — เว้นว่าง = ทุกคน", "Segment — empty = everyone")}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">{t(lang, "ประเทศ", "Country")}</p>
                <input
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  placeholder={t(lang, "ค้นหาประเทศ…", "Filter countries…")}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs mb-1"
                />
                <div className="max-h-28 overflow-auto border border-gray-100 rounded-lg p-2 flex flex-col gap-1">
                  {(segment.countries ?? []).length > 0 && (
                    <p className="text-[10px] text-gray-400">✓ {(segment.countries ?? []).join(", ")}</p>
                  )}
                  {filteredCountries.slice(0, 50).map((c) =>
                    checkbox(
                      (segment.countries ?? []).includes(c.code),
                      () => toggleSeg("countries", c.code),
                      `${c.code} · ${lang === "en" ? c.en : c.th}`
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">{t(lang, "ประเภทวีซ่า", "Visa type")}</p>
                  <div className="flex flex-wrap gap-2">
                    {VISA_TYPES.map((v) =>
                      checkbox((segment.visaTypes ?? []).includes(v), () => toggleSeg("visaTypes", v), label("visa_type", v, lang))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">{t(lang, "ช่วงอายุ", "Age")}</p>
                  <div className="flex flex-wrap gap-2">
                    {AGE_RANGES.map((v) =>
                      checkbox((segment.ageRanges ?? []).includes(v), () => toggleSeg("ageRanges", v), label("age_range", v, lang))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">{t(lang, "สถานะ", "Status")}</p>
                <div className="flex flex-col gap-1">
                  {STATUS_OPTIONS.map((o) =>
                    checkbox((segment.statuses ?? []).includes(o.value), () => toggleSeg("statuses", o.value), statusLabel(o.value, lang))
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Service needs</p>
                <div className="flex flex-col gap-1">
                  {SERVICE_NEEDS.map((s) =>
                    checkbox((segment.serviceNeeds ?? []).includes(s.value), () => toggleSeg("serviceNeeds", s.value), lang === "en" ? s.en : s.th)
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">{t(lang, "ระดับความสนใจ", "Journey stage")}</p>
                <div className="flex flex-col gap-1">
                  {JOURNEY.map((j) =>
                    checkbox((segment.journeyStages ?? []).includes(j.value), () => toggleSeg("journeyStages", j.value), lang === "en" ? j.en : j.th)
                  )}
                </div>
              </div>
            </div>

            <div className={sectionLabel}>
              {t(lang, "เงื่อนไขเพิ่มเติม — เลือกได้หลายข้อ ต้องเข้าทุกข้อที่เลือก", "Conditions — pick any; all selected must match")}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={condNoReply}
                    onChange={() => { setCondNoReply(!condNoReply); setPreview(null); }}
                  />
                  {t(lang, "ไม่ตอบเกิน", "No reply over")}
                </label>
                <input
                  value={noReplyHours}
                  onChange={(e) => { setNoReplyHours(e.target.value.replace(/[^0-9]/g, "")); setPreview(null); }}
                  disabled={!condNoReply}
                  inputMode="numeric"
                  className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-xs text-center disabled:opacity-40"
                />
                {t(lang, "ชม. + สถานะไม่ขยับ", "hrs + no status change")}
                {["24", "48", "72"].map((h) => (
                  <button
                    key={h}
                    disabled={!condNoReply}
                    onClick={() => { setNoReplyHours(h); setPreview(null); }}
                    className={`rounded px-1.5 py-0.5 text-[11px] border ${
                      noReplyHours === h ? "border-gray-800 bg-gray-800 text-white" : "border-gray-200 text-gray-500"
                    } disabled:opacity-40`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              {checkbox(
                condDaysLeft,
                () => { setCondDaysLeft(!condDaysLeft); setPreview(null); },
                t(lang, "ใกล้เดดไลน์ตามประเทศ (ตารางระยะเวลาวีซ่า)", "Days-left by country (lead-time table)")
              )}

              {checkbox(
                condPain,
                () => { setCondPain(!condPain); setPreview(null); },
                "Pain point"
              )}
              {condPain && (
                <div className="flex flex-wrap gap-2 pl-5">
                  {painPointOptions.map((p) =>
                    checkbox(
                      painKeys.includes(p.key),
                      () => { setPainKeys((prev) => prev.includes(p.key) ? prev.filter((k) => k !== p.key) : [...prev, p.key]); setPreview(null); },
                      lang === "en" ? p.label_en || p.label_th : p.label_th
                    )
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={runPreview}
                className="rounded-lg px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                {t(lang, "นับจำนวนเป้าหมาย", "Count recipients")}
              </button>
              {preview && (
                <span className="text-xs text-gray-600">
                  <b>{preview.count}</b> {t(lang, "คน", "recipients")}
                  {preview.sample.length > 0 && <span className="text-gray-400"> — {preview.sample.join(", ")}…</span>}
                </span>
              )}
            </div>
          </>
        )}

        <div className={sectionLabel}>{t(lang, "ข้อความ (ไทย)", "Message (Thai)")}</div>
        <textarea value={messageTh} onChange={(e) => setMessageTh(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <div className={sectionLabel}>{t(lang, "ข้อความ (อังกฤษ — ลูกค้าต่างชาติ)", "Message (English — foreign customers)")}</div>
        <textarea value={messageEn} onChange={(e) => setMessageEn(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700">
            {t(lang, "ยกเลิก", "Cancel")}
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="rounded-lg px-4 py-2 text-xs font-bold bg-gray-800 text-white disabled:opacity-40"
          >
            {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึกกฎ", "Save rule")}
          </button>
        </div>
      </div>
    </div>
  );
}
