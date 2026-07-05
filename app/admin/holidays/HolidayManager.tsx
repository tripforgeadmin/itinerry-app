"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Holiday = { holiday_date: string; name: string };
const DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function HolidayManager({
  initialHolidays,
  initialWeeklyOff,
}: {
  initialHolidays: Holiday[];
  initialWeeklyOff: number[];
}) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(initialHolidays);
  const [weeklyOff, setWeeklyOff] = useState(new Set(initialWeeklyOff));
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function call(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function addHoliday() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    await call({ action: "add", date, name });
    setHolidays((h) => [...h.filter((x) => x.holiday_date !== date), { holiday_date: date, name }].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)));
    setDate("");
    setName("");
    router.refresh();
  }

  async function deleteHoliday(d: string) {
    await call({ action: "delete", date: d });
    setHolidays((h) => h.filter((x) => x.holiday_date !== d));
    router.refresh();
  }

  async function toggleDow(n: number) {
    const next = new Set(weeklyOff);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setWeeklyOff(next);
    await call({ action: "weeklyOff", weeklyOff: [...next] });
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* edit-mode toggle — read-only until switched to แก้ไข, so nothing changes by accident */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {editing ? "โหมดแก้ไข — เพิ่ม/ลบ/ปรับวันหยุดได้" : "แตะ “แก้ไข” เพื่อปรับวันหยุด"}
        </span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            editing ? "bg-gray-800 text-white" : "border border-blue-500 text-blue-600 hover:bg-blue-50"
          }`}
        >
          {editing ? "เสร็จสิ้น" : "✎ แก้ไข"}
        </button>
      </div>

      {/* weekly days off */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">วันหยุดประจำสัปดาห์</h2>
        <div className="flex flex-wrap gap-2">
          {DOW.map((label, n) => (
            <button
              key={n}
              type="button"
              disabled={busy || !editing}
              onClick={() => toggleDow(n)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-100 ${
                weeklyOff.has(n) ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
              } ${editing ? "" : "opacity-70"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">แดง = หยุด (นัดโทรไม่ได้)</p>
      </div>

      {/* add holiday — edit mode only */}
      {editing && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">เพิ่มวันหยุด</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <input
              type="text"
              value={name}
              placeholder="ชื่อวันหยุด (ไม่บังคับ)"
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(date)}
              onClick={addHoliday}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              เพิ่ม
            </button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">วันหยุดทั้งหมด ({holidays.length})</h2>
        {holidays.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีวันหยุด</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {holidays.map((h) => (
              <div key={h.holiday_date} className="flex items-center justify-between py-2">
                <span className={`text-sm ${h.holiday_date < today ? "text-gray-300" : "text-gray-700"}`}>
                  {fmt(h.holiday_date)}
                  {h.name && <span className="text-gray-400"> · {h.name}</span>}
                </span>
                {editing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deleteHoliday(h.holiday_date)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    ลบ
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
