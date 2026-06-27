"use client";

import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "new", label: "ใหม่", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "ติดต่อแล้ว", color: "bg-yellow-100 text-yellow-700" },
  { value: "qualified", label: "คัดกรองแล้ว", color: "bg-purple-100 text-purple-700" },
  { value: "won", label: "ปิดได้", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "ไม่ผ่าน", color: "bg-red-100 text-red-700" },
];

export default function StatusUpdater({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const current = STATUS_OPTIONS.find((s) => s.value === status);

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
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${current?.color}`}>
        {current?.label}
      </span>
      <div className="flex gap-2 ml-auto flex-wrap">
        {STATUS_OPTIONS.filter((s) => s.value !== status).map((s) => (
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
