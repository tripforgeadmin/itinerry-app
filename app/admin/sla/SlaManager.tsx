"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SLA_STAGES } from "@/lib/sla";
import { STATUS_LABEL, STATUS_COLOR, type StatusValue } from "@/lib/status";

/** Friendly "≈ N วัน" hint for an hours value (only once it's a clean multiple worth showing). */
function dayHint(hours: number): string {
  if (hours <= 0) return "ปิดการเตือน";
  if (hours < 24) return `${hours} ชม.`;
  const days = hours / 24;
  const rounded = Math.round(days * 10) / 10;
  return `≈ ${rounded} วัน`;
}

export default function SlaManager({ initial }: { initial: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(SLA_STAGES.map((s) => [s, String(initial[s] ?? 0)]))
  );

  function reset() {
    setHours(Object.fromEntries(SLA_STAGES.map((s) => [s, String(initial[s] ?? 0)])));
    setEditing(false);
  }

  async function save() {
    const stageHours: Record<string, number> = {};
    for (const s of SLA_STAGES) {
      const n = Number(hours[s]);
      if (!Number.isFinite(n) || n < 0) {
        alert("กรอกเป็นจำนวนชั่วโมง (0 ขึ้นไป)");
        return;
      }
      stageHours[s] = Math.floor(n);
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageHours }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {editing ? "โหมดแก้ไข — หน่วยเป็นชั่วโมง" : "แตะ “แก้ไข” เพื่อปรับเวลา"}
        </span>
        <button
          type="button"
          onClick={() => (editing ? reset() : setEditing(true))}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            editing ? "bg-gray-100 text-gray-600" : "border border-blue-500 text-blue-600 hover:bg-blue-50"
          }`}
        >
          {editing ? "ยกเลิก" : "✎ แก้ไข"}
        </button>
      </div>

      <div className="space-y-2">
        {SLA_STAGES.map((s) => {
          const n = Number(hours[s]);
          return (
            <div key={s} className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0">
              <span className={`rounded-lg px-2 py-1 text-xs font-medium ${STATUS_COLOR[s as StatusValue] ?? ""}`}>
                {STATUS_LABEL[s as StatusValue] ?? s}
              </span>
              <span className="flex-1 text-sm text-gray-400">ค้างได้ไม่เกิน</span>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  value={hours[s]}
                  onChange={(e) => setHours((p) => ({ ...p, [s]: e.target.value }))}
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
                />
              ) : (
                <span className="w-24 text-right text-sm font-semibold text-gray-800">{initial[s] ?? 0}</span>
              )}
              <span className="w-24 text-right text-xs text-gray-400">
                ชม. · {dayHint(Number.isFinite(n) ? n : 0)}
              </span>
            </div>
          );
        })}
      </div>

      {editing && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      )}
    </div>
  );
}
