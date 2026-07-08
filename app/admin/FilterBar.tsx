"use client";

import { useState } from "react";
import { STATUS_LABEL, type StatusValue } from "@/lib/status";
import { SOURCE_OPTIONS, fieldLabel, type FilterCondition } from "@/lib/admin-filters";
import AddFilterPopover from "./AddFilterPopover";
import SaveFilterModal from "./SaveFilterModal";
import SavedFiltersMenu from "./SavedFiltersMenu";

const SOURCE_LABEL = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));

function fmtDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function conditionSummary(c: FilterCondition): string {
  if (c.field === "status") return c.value.map((v) => STATUS_LABEL[v as StatusValue] ?? v).join(", ");
  if (c.field === "source") return c.value.map((v) => SOURCE_LABEL[v] ?? v).join(", ");
  const [from, to] = c.value;
  if (from && to) return `${fmtDateShort(from)} – ${fmtDateShort(to)}`;
  if (from) return `ตั้งแต่ ${fmtDateShort(from)}`;
  if (to) return `ถึง ${fmtDateShort(to)}`;
  return "—";
}

export default function FilterBar({
  conditions,
  onAdd,
  onRemove,
  onApplySaved,
}: {
  conditions: FilterCondition[];
  onAdd: (c: FilterCondition) => void;
  onRemove: (id: string) => void;
  onApplySaved: (conditions: FilterCondition[]) => void;
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
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {conditions.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700"
        >
          <span className="text-blue-400">{fieldLabel(c.field)}:</span>
          {conditionSummary(c)}
          <button onClick={() => onRemove(c.id)} className="text-blue-300 hover:text-blue-600" aria-label="ลบตัวกรองนี้">
            ✕
          </button>
        </span>
      ))}

      <AddFilterPopover onAdd={onAdd} />

      {conditions.length > 0 && (
        <button
          onClick={() => setSaveOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          บันทึกตัวกรอง
        </button>
      )}

      <SavedFiltersMenu refreshKey={savedRefresh} onApply={onApplySaved} />

      <SaveFilterModal open={saveOpen} loading={saving} onSave={handleSave} onCancel={() => setSaveOpen(false)} />
    </div>
  );
}
