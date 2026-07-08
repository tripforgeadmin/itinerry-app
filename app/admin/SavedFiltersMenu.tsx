"use client";

import { useEffect, useRef, useState } from "react";
import type { FilterCondition } from "@/lib/admin-filters";

type SavedFilter = {
  id: string;
  name: string;
  conditions: FilterCondition[];
  is_favorite: boolean;
};

export default function SavedFiltersMenu({
  refreshKey,
  onApply,
}: {
  refreshKey: number;
  onApply: (conditions: FilterCondition[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/saved-filters");
    if (res.ok) {
      const data = await res.json();
      setFilters(data.filters ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
  }, [open, refreshKey]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function toggleFavorite(id: string, next: boolean) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, is_favorite: next } : f)));
    await fetch(`/api/admin/saved-filters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    load();
  }

  async function remove(id: string) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/admin/saved-filters/${id}`, { method: "DELETE" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
      >
        ⭐ ตัวกรองที่บันทึก
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[240px] max-h-80 overflow-auto">
          {loading && <p className="px-3 py-2 text-xs text-gray-400">กำลังโหลด…</p>}
          {!loading && filters.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">ยังไม่มีตัวกรองที่บันทึกไว้</p>
          )}
          {filters.map((f) => (
            <div key={f.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50 group">
              <button
                onClick={() => toggleFavorite(f.id, !f.is_favorite)}
                className="shrink-0 text-sm"
                aria-label="ปักหมุด"
              >
                {f.is_favorite ? "⭐" : "☆"}
              </button>
              <button
                onClick={() => {
                  onApply(f.conditions);
                  setOpen(false);
                }}
                className="flex-1 text-left text-xs font-medium text-gray-700 truncate"
              >
                {f.name}
              </button>
              <button
                onClick={() => remove(f.id)}
                className="shrink-0 text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 px-1"
                aria-label="ลบตัวกรอง"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
