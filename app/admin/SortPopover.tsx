"use client";

import { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { SortKey, SortEntry } from "./AdminTable";

export default function SortPopover({
  sort,
  fields,
  onChange,
  lang = "th",
}: {
  sort: SortEntry[];
  fields: { key: SortKey; label: string }[];
  onChange: (next: SortEntry[]) => void;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const labelOf = (key: SortKey) => fields.find((f) => f.key === key)?.label ?? key;
  const unusedFields = fields.filter((f) => !sort.some((s) => s.key === f.key));

  function addSort(key: SortKey) {
    onChange([...sort, { key, dir: "asc" }]);
  }
  function toggleDir(idx: number) {
    onChange(sort.map((s, i) => (i === idx ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : s)));
  }
  function removeSort(idx: number) {
    onChange(sort.filter((_, i) => i !== idx));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
      >
        ⇅ {t(lang, "เรียงลำดับ", "Sort")}
        {sort.length > 0 && <span className="ml-1 text-blue-500 font-bold">{sort.length}</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[260px] max-w-[300px]">
          {sort.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {sort.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700">
                  <span className="w-4 text-[10px] text-gray-300">{i + 1}</span>
                  <span className="flex-1 truncate">{labelOf(s.key)}</span>
                  <button
                    onClick={() => toggleDir(i)}
                    className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-[11px]"
                    title={t(lang, "สลับทิศทาง", "Toggle direction")}
                  >
                    {s.dir === "asc" ? "▲ A→Z" : "▼ Z→A"}
                  </button>
                  <button
                    onClick={() => removeSort(i)}
                    className="text-gray-300 hover:text-red-500 px-1"
                    aria-label={t(lang, "ลบการเรียงลำดับนี้", "Remove this sort")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {unusedFields.length > 0 && (
            <div>
              {sort.length > 0 && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mb-1">
                  {t(lang, "เพิ่มการเรียงลำดับ", "Add sort field")}
                </div>
              )}
              <div className="flex flex-col gap-0.5 max-h-56 overflow-auto">
                {unusedFields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => addSort(f.key)}
                    className="text-left px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sort.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mt-2 w-full text-center text-[11px] text-gray-400 hover:text-gray-600"
            >
              {t(lang, "ล้างการเรียงลำดับทั้งหมด", "Clear all sorting")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
