"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  STATE_WORD,
  HISTORY_WORD,
  BAND_WORD,
  TIES_FUNDING_SELECT_OPTIONS,
  RISK_SELECT_OPTIONS,
  BAND_SELECT_OPTIONS,
} from "@/lib/assessment-vocab";

// Layout guarantees for the customer healthcheck PDF — the itemized lines map 1:1
// onto its "จุดแข็งของคุณ" / "ที่เราจะช่วยเสริม" columns, so these caps keep that
// layout unbreakable. Enforced here AND in /api/admin/evaluate.
const MAX_ITEMS = 5;
const MAX_ITEM_LEN = 150;

function ItemListCard({
  title,
  hint,
  items,
  onChange,
  accent,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
  accent: "green" | "amber";
}) {
  const chip = accent === "green" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700";
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip}`}>{items.length}/{MAX_ITEMS}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{hint}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-300 w-4 text-right shrink-0">{i + 1}.</span>
            <input
              type="text"
              value={item}
              maxLength={MAX_ITEM_LEN}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="พิมพ์เป็นประโยคสั้น 1 ข้อ…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <span className={`text-[10px] w-9 text-right shrink-0 ${item.length >= MAX_ITEM_LEN ? "text-red-500 font-bold" : "text-gray-300"}`}>
              {item.length}/{MAX_ITEM_LEN}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-gray-300 hover:text-red-500 text-sm px-1"
              aria-label="ลบข้อนี้"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {items.length < MAX_ITEMS && (
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          ＋ เพิ่มข้อ
        </button>
      )}
    </div>
  );
}

function PillarSelect({
  label,
  value,
  onChange,
  options,
  autoValue,
  autoWord,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  autoValue: string | null;
  autoWord: string | null;
}) {
  const isOverridden = autoValue != null && value !== "" && value !== autoValue;
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="" disabled>— เลือก —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {isOverridden && autoWord && (
        <p className="mt-1 text-[10px] text-gray-400">แก้ไขจากระบบ (auto: {autoWord})</p>
      )}
    </div>
  );
}

export default function AssessmentResultForm({
  assessmentId,
  status,
  initialPass,
  initialNotes,
  initialStrengths,
  initialImprovements,
  autoTies,
  autoFunding,
  autoRisk,
  autoBand,
  initialOverrideTies,
  initialOverrideFunding,
  initialOverrideRisk,
  initialOverrideBand,
}: {
  assessmentId: string;
  status: string;
  initialPass: boolean | null;
  initialNotes: string | null;
  initialStrengths: string[];
  initialImprovements: string[];
  autoTies: "g" | "y" | "r" | null;
  autoFunding: "g" | "y" | "r" | null;
  autoRisk: "g" | "y" | "r" | null;
  autoBand: "High" | "Med" | "Low" | "OVERRIDE" | null;
  initialOverrideTies: "g" | "y" | "r" | null;
  initialOverrideFunding: "g" | "y" | "r" | null;
  initialOverrideRisk: "g" | "y" | "r" | null;
  initialOverrideBand: "High" | "Med" | "Low" | null;
}) {
  const router = useRouter();
  const [pass, setPass] = useState<boolean | null>(initialPass);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [strengths, setStrengths] = useState<string[]>(initialStrengths.length ? initialStrengths : [""]);
  const [improvements, setImprovements] = useState<string[]>(initialImprovements.length ? initialImprovements : [""]);
  const [saving, setSaving] = useState(false);

  // g/y/r selects: previously-saved override wins, else fall back to the auto value,
  // else unset. Band's legacy "OVERRIDE" auto value has no honest High/Med/Low mapping
  // (see lib/assessment/types.ts), so it's never defaulted into the select.
  const [ties, setTies] = useState(initialOverrideTies ?? autoTies ?? "");
  const [funding, setFunding] = useState(initialOverrideFunding ?? autoFunding ?? "");
  const [risk, setRisk] = useState(initialOverrideRisk ?? autoRisk ?? "");
  const [band, setBand] = useState(
    initialOverrideBand ?? (autoBand && autoBand !== "OVERRIDE" ? autoBand : "")
  );

  const canSave = pass !== null && notes.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const res = await fetch("/api/admin/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId,
        pass,
        notes,
        strengths: strengths.map((s) => s.trim()).filter(Boolean),
        improvements: improvements.map((s) => s.trim()).filter(Boolean),
        overrideTies: ties || null,
        overrideFunding: funding || null,
        overrideRisk: risk || null,
        overrideBand: band || null,
      }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setSaving(false);
  }

  return (
    <>
      <ItemListCard
        title="จุดแข็งของคุณ (ลง PDF ลูกค้า)"
        hint="ใส่ทีละข้อ — แสดงเป็นรายการติ๊กถูกในรายงานสุขภาพวีซ่าของลูกค้า"
        items={strengths}
        onChange={setStrengths}
        accent="green"
      />
      <ItemListCard
        title="ที่เราจะช่วยเสริม (ลง PDF ลูกค้า)"
        hint="ใส่ทีละข้อ — แสดงเป็นรายการเครื่องหมายบวกในรายงานสุขภาพวีซ่าของลูกค้า"
        items={improvements}
        onChange={setImprovements}
        accent="amber"
      />
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          ระดับความแข็งแรง (ภายใน — เอเจนต์ปรับได้)
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          ค่าเริ่มต้นมาจากระบบประเมินอัตโนมัติ ปรับได้ก่อนส่งผลให้ลูกค้า — ไม่แสดงในรายงานลูกค้า
        </p>
        <div className="grid grid-cols-2 gap-3">
          <PillarSelect
            label="ผูกพันไทย"
            value={ties}
            onChange={setTies}
            options={TIES_FUNDING_SELECT_OPTIONS}
            autoValue={autoTies}
            autoWord={autoTies ? STATE_WORD[autoTies] : null}
          />
          <PillarSelect
            label="การเงิน"
            value={funding}
            onChange={setFunding}
            options={TIES_FUNDING_SELECT_OPTIONS}
            autoValue={autoFunding}
            autoWord={autoFunding ? STATE_WORD[autoFunding] : null}
          />
          <PillarSelect
            label="ประวัติเดินทาง"
            value={risk}
            onChange={setRisk}
            options={RISK_SELECT_OPTIONS}
            autoValue={autoRisk}
            autoWord={autoRisk ? HISTORY_WORD[autoRisk] : null}
          />
          <PillarSelect
            label="โอกาสผ่าน"
            value={band}
            onChange={setBand}
            options={BAND_SELECT_OPTIONS}
            autoValue={autoBand !== "OVERRIDE" ? autoBand : null}
            autoWord={autoBand && autoBand !== "OVERRIDE" ? BAND_WORD[autoBand] : null}
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ผลการประเมิน (เอเจนต์)</h2>
        <p className="text-xs text-gray-400 mb-3">ข้อความในช่องนี้แสดงในรายงานลูกค้าใต้หัวข้อ “ความเห็นเพิ่มเติม”</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setPass(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
              pass === true ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 opacity-60"
            }`}
          >
            ผ่านเกณฑ์
          </button>
          <button
            onClick={() => setPass(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
              pass === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500 opacity-60"
            }`}
          >
            ไม่ผ่านเกณฑ์
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="รายละเอียด/เหตุผลของการประเมิน…"
          rows={4}
          className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 transition-opacity disabled:opacity-40"
        >
          {saving ? "กำลังบันทึก…" : status === "pending_review" ? "บันทึกและทำเครื่องหมายว่าประเมินแล้ว" : "แก้ไขการประเมิน"}
        </button>
      </div>
    </>
  );
}
