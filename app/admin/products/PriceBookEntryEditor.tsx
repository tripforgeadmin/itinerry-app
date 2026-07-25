"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceBookEntryRow, PriceBookRow, ProductRow } from "@/lib/product-families";
import { familyLabel } from "@/lib/product-families";
import { parseMoneyInput, formatTHBCompact } from "@/lib/money";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export default function PriceBookEntryEditor({
  products,
  books,
  entriesByBook,
  lang,
}: {
  products: ProductRow[];
  books: PriceBookRow[];
  entriesByBook: Record<string, PriceBookEntryRow[]>;
  lang: Lang;
}) {
  const router = useRouter();
  const activeBooks = books.filter((b) => b.active);
  const [bookId, setBookId] = useState(activeBooks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const entries = entriesByBook[bookId] ?? [];
  const entryFor = (productId: string) => entries.find((e) => e.product_id === productId);

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
    } catch (e) {
      setError((e as Error).message || t(lang, "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Save failed — try again"));
    } finally {
      setBusy(false);
    }
  }

  const savePrice = (productId: string, current: number | null) => (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (!raw) return; // blank = leave unpriced (not sellable in this book)
    const price = parseMoneyInput(raw);
    if (price === null) {
      setError(t(lang, "รูปแบบราคาไม่ถูกต้อง", "Invalid price format"));
      return;
    }
    if (price !== current) call({ action: "set_entry", productId, priceBookId: bookId, unitPrice: price });
  };

  const activeProducts = products.filter((p) => p.active);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        >
          {activeBooks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.is_standard ? " (Standard)" : ""}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {t(lang, "เว้นว่าง = ไม่ขายใน book นี้", "Blank = not sellable in this book")}
        </span>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 uppercase">
              <th className="py-1 pr-3">{t(lang, "หมวด", "Family")}</th>
              <th className="py-1 pr-3">{t(lang, "รายการ", "Item")}</th>
              <th className="py-1 pr-3 w-36">{t(lang, "ราคา (บาท)", "Price (THB)")}</th>
              <th className="py-1 w-20" />
            </tr>
          </thead>
          <tbody>
            {activeProducts.map((p) => {
              const entry = entryFor(p.id);
              return (
                <tr key={p.id} className="border-t border-gray-50">
                  <td className="py-1.5 pr-3 text-xs text-gray-400">{familyLabel(p.family, lang)}</td>
                  <td className="py-1.5 pr-3 text-gray-800">
                    {p.name}
                    {p.unit && <span className="text-gray-400"> / {p.unit}</span>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      key={`${bookId}-${p.id}-${entry?.unit_price ?? ""}`}
                      defaultValue={entry ? String(entry.unit_price) : ""}
                      onBlur={savePrice(p.id, entry?.unit_price ?? null)}
                      disabled={busy}
                      inputMode="decimal"
                      placeholder="—"
                      className={`w-32 rounded-lg border px-2 py-1 text-right focus:border-blue-400 focus:outline-none ${entry && !entry.active ? "border-gray-100 bg-gray-50 text-gray-400 line-through" : "border-gray-200"}`}
                    />
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    {entry && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          title={entry.active ? t(lang, "พักราคา (ซ่อนจากใบเสนอราคา)", "Suspend price") : t(lang, "ใช้ราคานี้อีกครั้ง", "Reactivate price")}
                          onClick={() => call({ action: "toggle_entry", id: entry.id, active: !entry.active })}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium mr-1 ${entry.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                        >
                          {entry.active ? t(lang, "เปิด", "On") : t(lang, "ปิด", "Off")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm(t(lang, `ลบราคา ${formatTHBCompact(entry.unit_price)} ของ “${p.name}” ออกจาก book นี้?`, `Remove the ${formatTHBCompact(entry.unit_price)} price for “${p.name}” from this book?`)) &&
                            call({ action: "delete_entry", id: entry.id })
                          }
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          {t(lang, "ลบ", "Del")}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
