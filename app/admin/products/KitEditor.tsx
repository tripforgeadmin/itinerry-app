"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KitItemRow, PriceBookEntryRow, ProductRow } from "@/lib/product-families";
import { formatTHBCompact } from "@/lib/money";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

/** Compose kits (Odoo BoM-style): pick a parent product, manage its component rows.
 * Same inline-save idiom as PriceBookEntryEditor. */
export default function KitEditor({
  products,
  kitItems,
  standardEntries,
  lang,
}: {
  products: ProductRow[];
  kitItems: KitItemRow[];
  standardEntries: PriceBookEntryRow[]; // for the indicative total
  lang: Lang;
}) {
  const router = useRouter();
  const kitParentIds = new Set(kitItems.map((k) => k.parent_product_id));
  const componentIds = new Set(kitItems.map((k) => k.component_product_id));
  const existingParents = products.filter((p) => kitParentIds.has(p.id));
  const [parentId, setParentId] = useState(existingParents[0]?.id ?? "");
  const [newComponent, setNewComponent] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const byId = new Map(products.map((p) => [p.id, p]));
  const items = kitItems.filter((k) => k.parent_product_id === parentId);
  const priceOf = (productId: string) =>
    standardEntries.find((e) => e.product_id === productId && e.active)?.unit_price ?? null;
  const indicativeTotal = items.reduce((sum, i) => {
    const price = priceOf(i.component_product_id);
    return price === null ? NaN : sum + price * i.quantity;
  }, 0);

  async function call(body: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products", {
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

  // Parent candidates: active, not a component of another kit (no nesting either way).
  const parentCandidates = products.filter((p) => p.active && !componentIds.has(p.id));
  // Component candidates: active, not a kit, not the parent itself, not already in this kit.
  const componentCandidates = products.filter(
    (p) =>
      p.active &&
      !kitParentIds.has(p.id) &&
      p.id !== parentId &&
      !items.some((i) => i.component_product_id === p.id)
  );

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="">{t(lang, "— เลือกสินค้าแม่ของชุด —", "— choose the kit's parent product —")}</option>
          {parentCandidates.map((p) => (
            <option key={p.id} value={p.id}>
              {kitParentIds.has(p.id) ? "📦 " : ""}{p.name} ({p.code})
            </option>
          ))}
        </select>
        {parentId && items.length > 0 && (
          <span className="text-xs text-gray-400">
            {t(lang, "ราคารวมโดยประมาณ (Standard):", "Indicative total (Standard):")}{" "}
            <span className="font-medium text-gray-600">
              {Number.isNaN(indicativeTotal) ? t(lang, "บางส่วนยังไม่มีราคา", "some parts unpriced") : formatTHBCompact(indicativeTotal)}
            </span>
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {!parentId ? (
        <p className="text-sm text-gray-400">
          {t(
            lang,
            "เลือกสินค้าแม่ แล้วเพิ่มส่วนประกอบ — ตอนทำใบเสนอราคา เลือกชุดตัวเดียวระบบจะแตกเป็นบรรทัดย่อยให้อัตโนมัติ",
            "Pick a parent product and add components — selecting the kit on a quote explodes it into component lines automatically."
          )}
        </p>
      ) : (
        <>
          {items.length > 0 && (
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 uppercase">
                  <th className="py-1 pr-3">{t(lang, "ส่วนประกอบ", "Component")}</th>
                  <th className="py-1 pr-3 w-28 text-right">{t(lang, "จำนวนต่อชุด", "Qty per kit")}</th>
                  <th className="py-1 pr-3 w-28 text-right">{t(lang, "ราคา (Standard)", "Price (Std)")}</th>
                  <th className="py-1 w-12" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const p = byId.get(item.component_product_id);
                  const price = priceOf(item.component_product_id);
                  return (
                    <tr key={item.id} className="border-t border-gray-50">
                      <td className="py-1.5 pr-3 text-gray-800">
                        {p?.name ?? item.component_product_id}
                        {p && !p.taxable && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                            {t(lang, "ไม่มี VAT", "No VAT")}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        <input
                          defaultValue={String(item.quantity)}
                          disabled={busy}
                          inputMode="decimal"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v > 0 && v !== item.quantity) {
                              call({ action: "kit_set", parentId, componentId: item.component_product_id, quantity: v });
                            }
                          }}
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-right text-gray-500 tabular-nums">
                        {price === null ? t(lang, "ยังไม่มีราคา", "unpriced") : formatTHBCompact(price)}
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => call({ action: "kit_delete", id: item.id })}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="flex gap-2 items-center border-t border-gray-100 pt-3">
            <select
              value={newComponent}
              onChange={(e) => setNewComponent(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="">{t(lang, "— เพิ่มส่วนประกอบ —", "— add a component —")}</option>
              {componentCandidates.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
            <input
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              inputMode="decimal"
              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-blue-400 focus:outline-none"
              aria-label={t(lang, "จำนวนต่อชุด", "Qty per kit")}
            />
            <button
              type="button"
              disabled={busy || !newComponent || !(Number(newQty) > 0)}
              onClick={async () => {
                const ok = await call({ action: "kit_set", parentId, componentId: newComponent, quantity: Number(newQty) });
                if (ok) {
                  setNewComponent("");
                  setNewQty("1");
                }
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {t(lang, "เพิ่ม", "Add")}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {t(
              lang,
              "ชุดจะเลือกได้ในใบเสนอราคาเมื่อส่วนประกอบทุกตัวมีราคาใน price book นั้น — ชุดไม่ต้องตั้งราคาเอง",
              "A kit becomes selectable on quotes once every component is priced in that book — the kit itself needs no price."
            )}
          </p>
        </>
      )}
    </div>
  );
}
