"use client";

import { useState } from "react";
import { STATUS_LABEL, STATUS_COLOR, MANUAL_STATUS_OPTIONS, type StatusValue } from "@/lib/status";

export default function StatusUpdater({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const currentLabel = STATUS_LABEL[status as StatusValue] ?? status;
  const currentColor = STATUS_COLOR[status as StatusValue] ?? "";

  async function handleChange(newStatus: string) {
    setSaving(true);
    await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
      <span className="text-sm text-gray-500">สถานะ:</span>
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currentColor}`}>
        {currentLabel}
      </span>
      <div className="flex gap-2 ml-auto flex-wrap">
        {MANUAL_STATUS_OPTIONS.filter((s) => s.value !== status).map((s) => (
          <button
            key={s.value}
            onClick={() => handleChange(s.value)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50 ${s.color}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
