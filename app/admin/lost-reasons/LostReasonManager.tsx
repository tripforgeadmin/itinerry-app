"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LostReasonCategory } from "@/lib/lost-reasons";

export default function LostReasonManager({ initialTree }: { initialTree: LostReasonCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  async function call(body: object) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lost-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const saveLabel = (key: string, original: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    if (v && v !== original) call({ action: "update", key, labelTh: v });
  };

  function Toggle({ k, active }: { k: string; active: boolean }) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => call({ action: "toggle", key: k, active: !active })}
        className={`rounded px-2 py-0.5 text-[11px] font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
      >
        {active ? "เปิด" : "ปิด"}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{editing ? "โหมดแก้ไข — เพิ่ม/แก้/ลบ/ปิดใช้งานได้" : "แตะ “แก้ไข” เพื่อปรับรายการ"}</span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${editing ? "bg-gray-800 text-white" : "border border-blue-500 text-blue-600 hover:bg-blue-50"}`}
        >
          {editing ? "เสร็จสิ้น" : "✎ แก้ไข"}
        </button>
      </div>

      {initialTree.map((cat) => (
        <div key={cat.key} className={`rounded-2xl bg-white p-4 shadow-sm ${cat.active ? "" : "opacity-60"}`}>
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                defaultValue={cat.label_th}
                onBlur={saveLabel(cat.key, cat.label_th)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-800 focus:border-blue-400 focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-sm font-bold text-gray-800">{cat.label_th}</span>
            )}
            {editing && (
              <>
                <Toggle k={cat.key} active={cat.active} />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirm(`ลบหมวด “${cat.label_th}” และเหตุผลย่อยทั้งหมด?`) && call({ action: "delete", key: cat.key })}
                  className="text-xs font-medium text-red-500 hover:text-red-700"
                >
                  ลบ
                </button>
              </>
            )}
          </div>

          <div className="mt-2 space-y-1 pl-3">
            {cat.children.map((sub) => (
              <div key={sub.key} className={`flex items-center gap-2 ${sub.active ? "" : "opacity-60"}`}>
                <span className="text-gray-300">•</span>
                {editing ? (
                  <input
                    defaultValue={sub.label_th}
                    onBlur={saveLabel(sub.key, sub.label_th)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-700">{sub.label_th}</span>
                )}
                {editing && (
                  <>
                    <Toggle k={sub.key} active={sub.active} />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => call({ action: "delete", key: sub.key })}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      ลบ
                    </button>
                  </>
                )}
              </div>
            ))}

            {editing && (
              <div className="flex gap-2 pt-1">
                <input
                  value={newSub[cat.key] ?? ""}
                  onChange={(e) => setNewSub((p) => ({ ...p, [cat.key]: e.target.value }))}
                  placeholder="เพิ่มเหตุผลย่อย…"
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={busy || !(newSub[cat.key] ?? "").trim()}
                  onClick={() => {
                    call({ action: "add", parentKey: cat.key, labelTh: newSub[cat.key] });
                    setNewSub((p) => ({ ...p, [cat.key]: "" }));
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
                >
                  เพิ่ม
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {editing && (
        <div className="flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="เพิ่มหมวดหลักใหม่…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !newCat.trim()}
            onClick={() => { call({ action: "add", labelTh: newCat }); setNewCat(""); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            เพิ่มหมวด
          </button>
        </div>
      )}
    </div>
  );
}
