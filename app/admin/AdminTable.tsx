"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_OPTIONS, STATUS_LABEL, STATUS_COLOR, isOverdue, type StatusValue } from "@/lib/status";

const VISA_LABEL: Record<string, string> = {
  tourist: "ท่องเที่ยว", visitor: "เยี่ยมเยียน", business: "ธุรกิจ", student: "นักเรียน",
};

type Account = { full_name: string | null; line_display_name: string | null; phone: string | null; is_friend: boolean | null };
type Trip = { visa_type: string; destination: string };

type Row = {
  id: string;
  created_at: string;
  occupation: string;
  status: string;
  contact_preference: string;
  account: Account | null;
  trip: Trip | null;
};

export default function AdminTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusValue | "all">("all");

  const filteredRows = filter === "all" ? rows : rows.filter((s) => s.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
            filter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          ทั้งหมด ({rows.length})
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${opt.color} ${
              filter === opt.value ? "" : "opacity-50"
            }`}
          >
            {opt.label} ({rows.filter((s) => s.status === opt.value).length})
          </button>
        ))}
      </div>
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
          {filteredRows.map((s) => {
            const acc = s.account;
            const trip = s.trip;
            const overdue = isOverdue(s.created_at, s.status);
            return (
              <tr
                key={s.id}
                onClick={() => router.push(`/admin/${s.id}`)}
                className={`border-b border-gray-50 transition-colors cursor-pointer ${
                  overdue ? "bg-red-100 hover:bg-red-200" : "hover:bg-blue-50"
                }`}
              >
                <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "text-red-700 font-semibold" : "text-gray-500"}`}>
                  {new Date(s.created_at).toLocaleDateString("th-TH", {
                    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{acc?.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{acc?.line_display_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                    {trip ? (VISA_LABEL[trip.visa_type] ?? trip.visa_type) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 uppercase">{trip?.destination ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{acc?.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {s.contact_preference === "line" ? "💬 LINE" : s.contact_preference === "call" ? "📞 โทร" : s.contact_preference}
                </td>
                <td className="px-4 py-3 text-center">
                  {acc?.is_friend === true ? "✅" : acc?.is_friend === false ? "❌" : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[s.status as StatusValue] ?? ""}`}>
                    {STATUS_LABEL[s.status as StatusValue] ?? s.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredRows.length === 0 && (
        <div className="text-center py-12 text-gray-400">ยังไม่มี submission</div>
      )}
      </div>
    </div>
  );
}
