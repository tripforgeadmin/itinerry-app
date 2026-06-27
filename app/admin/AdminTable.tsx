"use client";

import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่", contacted: "ติดต่อแล้ว", qualified: "คัดกรองแล้ว", won: "ปิดได้", lost: "ไม่ผ่าน",
};
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700", contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700", won: "bg-green-100 text-green-700", lost: "bg-red-100 text-red-700",
};
const VISA_LABEL: Record<string, string> = {
  tourist: "ท่องเที่ยว", visitor: "เยี่ยมเยียน", business: "ธุรกิจ", student: "นักเรียน",
};

type Row = {
  id: string; created_at: string; full_name: string; line_display_name: string | null;
  visa_type: string; destination: string; phone: string; contact_preference: string;
  is_friend: boolean | null; status: string; savings_balance: string;
};

export default function AdminTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">วันที่</th>
            <th className="px-4 py-3">ชื่อ</th>
            <th className="px-4 py-3">LINE</th>
            <th className="px-4 py-3">วีซ่า</th>
            <th className="px-4 py-3">ปลายทาง</th>
            <th className="px-4 py-3">โทร</th>
            <th className="px-4 py-3">ติดต่อ</th>
            <th className="px-4 py-3">เพื่อน</th>
            <th className="px-4 py-3">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => router.push(`/admin/${s.id}`)}
              className="border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {new Date(s.created_at).toLocaleDateString("th-TH", {
                  day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">{s.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{s.line_display_name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                  {VISA_LABEL[s.visa_type] ?? s.visa_type}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 uppercase">{s.destination}</td>
              <td className="px-4 py-3 text-gray-600">{s.phone}</td>
              <td className="px-4 py-3 text-gray-600">
                {s.contact_preference === "line" ? "💬 LINE" : s.contact_preference === "call" ? "📞 โทร" : s.contact_preference}
              </td>
              <td className="px-4 py-3 text-center">
                {s.is_friend === true ? "✅" : s.is_friend === false ? "❌" : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[s.status] ?? ""}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-center py-12 text-gray-400">ยังไม่มี submission</div>
      )}
    </div>
  );
}
