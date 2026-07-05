"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, STATUS_COLOR, MANUAL_STATUS_OPTIONS, type StatusValue } from "@/lib/status";

export default function StatusUpdater({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentLabel = STATUS_LABEL[status as StatusValue] ?? status;
  const currentColor = STATUS_COLOR[status as StatusValue] ?? "";
  const hasPendingChange = pendingStatus !== null && pendingStatus !== status;

  async function handleSave() {
    if (!pendingStatus) return;
    setSaving(true);
    const res = await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: pendingStatus }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus(pendingStatus);
      setPendingStatus(null);
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  function handleDiscard() {
    setPendingStatus(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">สถานะ:</span>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currentColor}`}>{currentLabel}</span>
        <div className="flex gap-2 ml-auto flex-wrap">
          {MANUAL_STATUS_OPTIONS.filter((s) => s.value !== status).map((s) => (
            <button
              key={s.value}
              onClick={() => setPendingStatus(s.value)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50 ${s.color} ${
                pendingStatus === s.value ? "ring-2 ring-offset-1 ring-gray-800" : ""
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {hasPendingChange && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400 mr-auto">
            เปลี่ยนเป็น &quot;{STATUS_LABEL[pendingStatus as StatusValue] ?? pendingStatus}&quot; — ยังไม่บันทึก
          </span>
          <button
            onClick={handleDiscard}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 transition-opacity disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-white transition-opacity disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      )}
    </div>
  );
}
