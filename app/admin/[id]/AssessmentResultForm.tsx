"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentResultForm({
  assessmentId,
  status,
  initialPass,
  initialNotes,
}: {
  assessmentId: string;
  status: string;
  initialPass: boolean | null;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [pass, setPass] = useState<boolean | null>(initialPass);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  const canSave = pass !== null && notes.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const res = await fetch("/api/admin/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, pass, notes }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ผลการประเมิน (เอเจนต์)</h2>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setPass(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
            pass === true ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 opacity-60"
          }`}
        >
          ผ่านเกณฑ์
        </button>
        <button
          onClick={() => setPass(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
            pass === false ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500 opacity-60"
          }`}
        >
          ไม่ผ่านเกณฑ์
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="รายละเอียด/เหตุผลของการประเมิน…"
        rows={4}
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 transition-opacity disabled:opacity-40"
      >
        {saving ? "กำลังบันทึก…" : status === "pending_review" ? "บันทึกและทำเครื่องหมายว่าประเมินแล้ว" : "บันทึกการประเมิน"}
      </button>
    </div>
  );
}
