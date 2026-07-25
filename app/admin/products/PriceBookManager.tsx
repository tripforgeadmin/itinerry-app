"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceBookRow } from "@/lib/product-families";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export default function PriceBookManager({ books, lang }: { books: PriceBookRow[]; lang: Lang }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  async function call(body: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/price-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "");
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message || t(lang, "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Save failed — try again"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {books.map((b) => (
        <div key={b.id} className={`flex items-center gap-2 py-1 ${b.active ? "" : "opacity-50"}`}>
          <input
            defaultValue={b.name}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== b.name) call({ action: "update_book", id: b.id, name: v });
            }}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
          />
          {b.is_standard ? (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">Standard</span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                confirm(t(lang, `ตั้ง “${b.name}” เป็น price book มาตรฐาน?`, `Make “${b.name}” the standard book?`)) &&
                call({ action: "set_standard", id: b.id })
              }
              className="rounded px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
            >
              {t(lang, "ตั้งเป็นมาตรฐาน", "Set standard")}
            </button>
          )}
          {!b.is_standard && (
            <button
              type="button"
              disabled={busy}
              onClick={() => call({ action: "toggle_book", id: b.id, active: !b.active })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${b.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
            >
              {b.active ? t(lang, "เปิด", "On") : t(lang, "ปิด", "Off")}
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-2 border-t border-gray-50">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t(lang, "เพิ่ม price book ใหม่ เช่น ราคา partner…", "New price book, e.g. partner pricing…")}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !newName.trim()}
          onClick={async () => {
            const ok = await call({ action: "add_book", name: newName });
            if (ok) setNewName("");
          }}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {t(lang, "เพิ่ม", "Add")}
        </button>
      </div>
    </div>
  );
}
