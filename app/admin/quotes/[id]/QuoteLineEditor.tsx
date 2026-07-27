"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteLineItemRow } from "@/lib/quotes";
import { PRODUCT_FAMILIES, familyLabel } from "@/lib/product-families";
import { formatTHB, parseMoneyInput } from "@/lib/money";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export interface SellableProduct {
  id: string;
  name: string;
  family: string | null;
  destination: string | null;
  unit: string | null;
  taxable: boolean;
  unitPrice: number; // for kits: components' sum, display only
  isKit?: boolean;
}

export default function QuoteLineEditor({
  quoteId,
  lines,
  sellable,
  editable,
  caseDestination,
  lang,
}: {
  quoteId: string;
  lines: QuoteLineItemRow[];
  sellable: SellableProduct[];
  editable: boolean;
  caseDestination: string | null;
  lang: Lang;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");

  async function call(body: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, ...body }),
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

  // Kits get their own top group (one pick explodes into component lines);
  // the rest group by family. Inside "fee", float the linked case's country to
  // the top (sort, not filter — other fees stay selectable).
  const kits = sellable
    .filter((p) => p.isKit)
    .sort((a, b) => {
      if (!caseDestination) return 0;
      return (a.destination === caseDestination ? 0 : 1) - (b.destination === caseDestination ? 0 : 1);
    });
  const groups = PRODUCT_FAMILIES.map((f) => ({
    family: f,
    items: sellable
      .filter((p) => !p.isKit && p.family === f.value)
      .sort((a, b) => {
        if (f.value === "fee" && caseDestination) {
          const am = a.destination === caseDestination ? 0 : 1;
          const bm = b.destination === caseDestination ? 0 : 1;
          if (am !== bm) return am - bm;
        }
        return 0;
      }),
  })).filter((g) => g.items.length > 0);

  const saveLineField =
    (lineId: string, field: "quantity" | "unitPrice" | "discountPct", original: number) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      const v = field === "unitPrice" ? parseMoneyInput(raw) : Number(raw);
      if (v === null || !Number.isFinite(v)) {
        setError(t(lang, "ตัวเลขไม่ถูกต้อง", "Invalid number"));
        return;
      }
      if (v !== original) call({ action: "update_line", lineId, [field]: v });
    };

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 uppercase">
              <th className="py-1 pr-3">{t(lang, "รายการ", "Item")}</th>
              <th className="py-1 pr-3 w-20 text-right">{t(lang, "จำนวน", "Qty")}</th>
              <th className="py-1 pr-3 w-28 text-right">{t(lang, "ราคาต่อหน่วย", "Unit price")}</th>
              <th className="py-1 pr-3 w-20 text-right">{t(lang, "ส่วนลด %", "Disc. %")}</th>
              <th className="py-1 pr-3 w-28 text-right">{t(lang, "รวม", "Total")}</th>
              {editable && <th className="py-1 w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={editable ? 6 : 5} className="py-6 text-center text-gray-400">
                  {t(lang, "ยังไม่มีรายการ — เพิ่มจากช่องด้านล่าง", "No items yet — add one below")}
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-gray-50 align-top">
                <td className="py-2 pr-3">
                  <div className="text-gray-800">{l.product_name}</div>
                  <div className="text-[11px] text-gray-400">
                    {l.product_code}
                    {!l.taxable && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">
                        {t(lang, "ไม่มี VAT", "No VAT")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3 text-right">
                  {editable ? (
                    <input
                      defaultValue={String(l.quantity)}
                      onBlur={saveLineField(l.id, "quantity", l.quantity)}
                      inputMode="decimal"
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right focus:border-blue-400 focus:outline-none"
                    />
                  ) : (
                    <span className="tabular-nums">{l.quantity}</span>
                  )}
                  {l.unit && <span className="text-[11px] text-gray-400 ml-1">{l.unit}</span>}
                </td>
                <td className="py-2 pr-3 text-right">
                  {editable ? (
                    <input
                      defaultValue={String(l.unit_price)}
                      onBlur={saveLineField(l.id, "unitPrice", l.unit_price)}
                      inputMode="decimal"
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right focus:border-blue-400 focus:outline-none"
                    />
                  ) : (
                    <span className="tabular-nums">{formatTHB(l.unit_price)}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {editable ? (
                    <input
                      defaultValue={String(l.discount_pct)}
                      onBlur={saveLineField(l.id, "discountPct", l.discount_pct)}
                      inputMode="decimal"
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right focus:border-blue-400 focus:outline-none"
                    />
                  ) : (
                    <span className="tabular-nums">{l.discount_pct > 0 ? `${l.discount_pct}%` : "—"}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums">{formatTHB(l.line_total)}</td>
                {editable && (
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        confirm(t(lang, `ลบ “${l.product_name}”?`, `Remove “${l.product_name}”?`)) &&
                        call({ action: "delete_line", lineId: l.id })
                      }
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="mt-3 flex gap-2 items-center border-t border-gray-100 pt-3">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t(lang, "— เลือกสินค้า/บริการ —", "— choose an item —")}</option>
            {kits.length > 0 && (
              <optgroup label={`📦 ${t(lang, "ชุดแพ็กเกจ (แตกเป็นรายการย่อยอัตโนมัติ)", "Kits (explode into lines)")}`}>
                {kits.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name} — {t(lang, "รวม", "total")} {formatTHB(p.unitPrice)}{p.unit ? `/${p.unit}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {groups.map((g) => (
              <optgroup key={g.family.value} label={familyLabel(g.family.value, lang)}>
                {g.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatTHB(p.unitPrice)}{p.unit ? `/${p.unit}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-400 focus:outline-none"
            aria-label={t(lang, "จำนวน", "Quantity")}
          />
          <button
            type="button"
            disabled={busy || !productId || !(Number(qty) > 0)}
            onClick={async () => {
              const ok = await call({ action: "add_line", productId, quantity: Number(qty) });
              if (ok) {
                setProductId("");
                setQty("1");
              }
            }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {t(lang, "เพิ่ม", "Add")}
          </button>
        </div>
      )}
    </div>
  );
}
