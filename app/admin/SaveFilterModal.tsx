"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

export default function SaveFilterModal({
  open,
  loading = false,
  onSave,
  onCancel,
  lang = "th",
}: {
  open: boolean;
  loading?: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  lang?: Lang;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-gray-800 mb-3">{t(lang, "บันทึกตัวกรอง", "Save filter")}</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(lang, "ตั้งชื่อตัวกรอง เช่น รอประเมิน + Facebook", "Name the filter, e.g. Pending + Facebook")}
          maxLength={80}
          autoFocus
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 transition-opacity disabled:opacity-50"
          >
            {t(lang, "ยกเลิก", "Cancel")}
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            disabled={loading || !name.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 transition-opacity disabled:opacity-50"
          >
            {loading ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึก", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
