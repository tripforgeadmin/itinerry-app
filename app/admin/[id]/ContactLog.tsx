"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

export type ContactLogEntry = {
  id: string;
  outcome: string;
  note: string | null;
  staff: string | null;
  created_at: string;
};

// Outcome vocab — keys mirror the allow-list in app/api/admin/contact-log/route.ts and 0026.
const OUTCOMES: { value: string; th: string; en: string; chip: string }[] = [
  { value: "reached", th: "โทรติด/คุยได้", en: "Reached", chip: "bg-green-100 text-green-700" },
  { value: "no_answer", th: "ไม่รับสาย", en: "No answer", chip: "bg-gray-100 text-gray-600" },
  { value: "callback_requested", th: "ขอให้โทรกลับ", en: "Callback requested", chip: "bg-amber-100 text-amber-700" },
  { value: "line_replied", th: "ตอบทาง LINE", en: "Replied on LINE", chip: "bg-teal-100 text-teal-700" },
  { value: "wrong_number", th: "ติดต่อไม่ได้/เบอร์ผิด", en: "Wrong number", chip: "bg-red-100 text-red-700" },
  { value: "other", th: "อื่นๆ", en: "Other", chip: "bg-blue-100 text-blue-700" },
];
const outcomeMeta = (v: string) => OUTCOMES.find((o) => o.value === v);
const outcomeLabel = (v: string, lang: Lang) => { const o = outcomeMeta(v); return o ? (lang === "en" ? o.en : o.th) : v; };

export default function ContactLog({
  assessmentId,
  entries,
  lang = "th",
}: {
  assessmentId: string;
  entries: ContactLogEntry[];
  lang?: Lang;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [staff, setStaff] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!outcome || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/contact-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, outcome, note, staff }),
      });
      if (res.ok) {
        setOutcome(null);
        setNote("");
        // keep staff — same person usually logs several cases in a row
        router.refresh();
      } else {
        alert(t(lang, "บันทึกไม่สำเร็จ กรุณาลองใหม่", "Save failed. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
      timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
        {t(lang, "บันทึกการติดต่อ", "Contact log")}
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        {t(lang, "บันทึกทุกครั้งที่ติดต่อลูกค้า — เห็นได้ว่าเคสนี้ลองติดต่อไปแล้วกี่ครั้ง ผลเป็นยังไง", "Log every outreach — so anyone can see how many times this case was tried and what happened")}
      </p>

      <div className="flex flex-wrap gap-2 mb-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            onClick={() => setOutcome(o.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-opacity ${o.chip} ${
              outcome === o.value ? "ring-2 ring-offset-1 ring-gray-800" : "opacity-70 hover:opacity-100"
            }`}
          >
            {lang === "en" ? o.en : o.th}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(lang, "โน้ต (ไม่บังคับ) เช่น นัดโทรใหม่พรุ่งนี้บ่าย", "Note (optional) e.g. call again tomorrow PM")}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="text"
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          placeholder={t(lang, "ผู้บันทึก", "Staff")}
          className="w-full sm:w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={save}
          disabled={!outcome || saving}
          className="rounded-lg px-4 py-2 text-xs font-bold bg-gray-800 text-white transition-opacity disabled:opacity-40"
        >
          {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึก", "Log")}
        </button>
      </div>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-gray-50 pt-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${outcomeMeta(e.outcome)?.chip ?? "bg-gray-100 text-gray-600"}`}>
                {outcomeLabel(e.outcome, lang)}
              </span>
              <span className="flex-1 text-gray-700">
                {e.note && <span>{e.note} </span>}
                <span className="text-gray-400">
                  · {fmt(e.created_at)}{e.staff ? ` · ${e.staff}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
