"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendResultButton({
  assessmentId,
  status,
  hasEvaluation,
  resultSentAt,
}: {
  assessmentId: string;
  status: string;
  hasEvaluation: boolean;
  resultSentAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "pending_review" || !hasEvaluation) return null;

  async function handleSend() {
    setLoading(true);
    const res = await fetch("/api/admin/send-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert("ส่งไม่สำเร็จ กรุณาลองใหม่");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
      <span className="text-sm text-gray-500 flex-1">ส่งผลการประเมินให้ลูกค้าทาง LINE</span>
      {resultSentAt ? (
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">
          ส่งแล้ว ·{" "}
          {new Date(resultSentAt).toLocaleDateString("th-TH", {
            day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      ) : (
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 transition-opacity disabled:opacity-50"
        >
          {loading ? "กำลังส่ง…" : "ส่งรายงานไปที่ LINE"}
        </button>
      )}
    </div>
  );
}
