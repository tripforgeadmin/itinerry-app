"use client";

import { useState } from "react";
import { statusLabel } from "@/lib/status";
import { label } from "@/lib/answer-labels";
import { t, dateLocale, type Lang } from "@/lib/i18n";
import { fieldLabel, type FilterCondition } from "@/lib/admin-filters";
import AddFilterPopover from "./AddFilterPopover";
import SaveFilterModal from "./SaveFilterModal";
import SavedFiltersMenu from "./SavedFiltersMenu";

function fmtDateShort(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "2-digit" });
}

function conditionSummary(c: FilterCondition, lang: Lang): string {
  if (c.field === "status") return c.value.map((v) => statusLabel(v, lang)).join(", ");
  if (c.field === "source") return c.value.map((v) => label("source", v, lang)).join(", ");
  const [from, to] = c.value;
  if (from && to) return `${fmtDateShort(from, lang)} – ${fmtDateShort(to, lang)}`;
  if (from) return `${t(lang, "ตั้งแต่", "from")} ${fmtDateShort(from, lang)}`;
  if (to) return `${t(lang, "ถึง", "to")} ${fmtDateShort(to, lang)}`;
  return "—";
}

export default function FilterBar({
  conditions,
  onAdd,
  onRemove,
  onApplySaved,
  lang = "th",
}: {
  conditions: FilterCondition[];
  onAdd: (c: FilterCondition) => void;
  onRemove: (id: string) => void;
  onApplySaved: (conditions: FilterCondition[]) => void;
  lang?: Lang;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRefresh, setSavedRefresh] = useState(0);

  async function handleSave(name: string) {
    setSaving(true);
    const res = await fetch("/api/admin/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, conditions }),
    });
    setSaving(false);
    if (res.ok) {
      setSaveOpen(false);
      setSavedRefresh((n) => n + 1);
    } else {
      alert(t(lang, "เกิดข้อผิดพลาด กรุณาลองใหม่", "Something went wrong. Please try again."));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {conditions.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700"
        >
          <span className="text-blue-400">{fieldLabel(c.field, lang)}:</span>
          {conditionSummary(c, lang)}
          <button onClick={() => onRemove(c.id)} className="text-blue-300 hover:text-blue-600" aria-label={t(lang, "ลบตัวกรองนี้", "Remove this filter")}>
            ✕
          </button>
        </span>
      ))}

      <AddFilterPopover onAdd={onAdd} lang={lang} />

      {conditions.length > 0 && (
        <button
          onClick={() => setSaveOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          {t(lang, "บันทึกตัวกรอง", "Save filter")}
        </button>
      )}

      <SavedFiltersMenu refreshKey={savedRefresh} onApply={onApplySaved} lang={lang} />

      <SaveFilterModal open={saveOpen} loading={saving} onSave={handleSave} onCancel={() => setSaveOpen(false)} lang={lang} />
    </div>
  );
}
