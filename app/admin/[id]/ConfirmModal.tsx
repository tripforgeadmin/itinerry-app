"use client";

import { useEffect } from "react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
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
        {title && <h3 className="text-sm font-bold text-gray-800 mb-2">{title}</h3>}
        <p className="text-sm text-gray-600 whitespace-pre-line mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 transition-opacity disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50 ${
              danger ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {loading ? "กำลังลบ…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
