"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnonymizeButton({
  accountId,
  isAnonymized,
}: {
  accountId: string;
  isAnonymized: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isAnonymized) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">
          ลบข้อมูลส่วนตัวแล้ว (PDPA)
        </span>
      </div>
    );
  }

  async function handleAnonymize() {
    const confirmed = window.confirm(
      "ยืนยันการลบข้อมูลส่วนตัวของลูกค้ารายนี้?\n\nชื่อ, เบอร์, อีเมล และข้อมูล LINE จะถูกลบถาวร ไม่สามารถย้อนกลับได้"
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch("/api/admin/anonymize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
      <span className="text-sm text-gray-500 flex-1">PDPA — ลูกค้าขอถอนความยินยอม</span>
      <button
        onClick={handleAnonymize}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 transition-opacity disabled:opacity-50"
      >
        {loading ? "กำลังลบ…" : "ลบข้อมูลส่วนตัว"}
      </button>
    </div>
  );
}
