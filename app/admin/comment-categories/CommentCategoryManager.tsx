"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentCategoryRow } from "@/lib/comment-categories";

/** Flat two-kind taxonomy manager — inline-edit style copied from the products admin
 * (ProductManager) rather than the 2-level lost-reasons tree, since kinds don't nest. */
export default function CommentCategoryManager({ initial }: { initial: CommentCategoryRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [addKind, setAddKind] = useState<"problem" | "solution">("problem");
  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");

  async function call(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/comment-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error === "in_use" ? "หมวดนี้ถูกใช้ในเคสแล้ว — ปิดใช้งานแทนการลบ" : "ทำรายการไม่สำเร็จ");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!labelTh.trim()) return;
    await call({ action: "add", kind: addKind, labelTh, labelEn });
    setLabelTh("");
    setLabelEn("");
  }

  const section = (kind: "problem" | "solution", title: string, chip: string) => (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <ul className="space-y-1.5">
        {initial.filter((c) => c.kind === kind).map((c) => (
          <li key={c.key} className={`flex items-center gap-2 text-sm ${c.active ? "" : "opacity-50"}`}>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${chip}`}>{c.label_th}</span>
            {c.label_en && <span className="text-xs text-gray-400">{c.label_en}</span>}
            <span className="flex-1" />
            <button
              onClick={() => call({ action: "toggle", key: c.key, active: !c.active })}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {c.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </button>
            <button
              onClick={() => confirm(`ลบ "${c.label_th}"?`) && call({ action: "delete", key: c.key })}
              className="text-xs text-red-400 hover:text-red-600"
            >
              ลบ
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      {section("problem", "หมวดปัญหา (Pain Point)", "bg-red-50 text-red-600")}
      {section("solution", "หมวดแนวทางแก้ (Solution)", "bg-green-50 text-green-700")}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">เพิ่มหมวดใหม่</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={addKind}
            onChange={(e) => setAddKind(e.target.value as "problem" | "solution")}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white"
          >
            <option value="problem">ปัญหา</option>
            <option value="solution">แนวทางแก้</option>
          </select>
          <input
            type="text"
            value={labelTh}
            onChange={(e) => setLabelTh(e.target.value)}
            placeholder="ชื่อหมวด (ไทย)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            placeholder="English (optional)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !labelTh.trim()}
            className="rounded-lg px-4 py-2 text-xs font-bold bg-gray-800 text-white disabled:opacity-40"
          >
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  );
}
