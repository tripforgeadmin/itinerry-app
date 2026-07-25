"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductRow } from "@/lib/product-families";
import { PRODUCT_FAMILIES, familyLabel } from "@/lib/product-families";
import { sortedCountries } from "@/lib/countries";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const VISA_TYPES = [
  { value: "tourist", th: "ท่องเที่ยว" },
  { value: "visitor", th: "เยี่ยมเยียน" },
  { value: "business", th: "ธุรกิจ" },
  { value: "student", th: "นักเรียน" },
];

const EMPTY = { code: "", name: "", family: "core", destination: "", visaType: "", unit: "", taxable: true };

export default function ProductManager({ products, lang }: { products: ProductRow[]; lang: Lang }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(EMPTY);

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

  const saveField = (id: string, field: string, original: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    if (v !== original) call({ action: "update", id, [field]: v });
  };

  const grouped = PRODUCT_FAMILIES.map((f) => ({
    family: f,
    items: products.filter((p) => p.family === f.value),
  })).filter((g) => g.items.length > 0 || editing);
  const orphans = products.filter((p) => !PRODUCT_FAMILIES.some((f) => f.value === p.family));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {editing
            ? t(lang, "โหมดแก้ไข — เพิ่ม/แก้/ปิดใช้งานได้", "Edit mode — add, edit, deactivate")
            : t(lang, "แตะ “แก้ไข” เพื่อปรับรายการ", "Tap “Edit” to change items")}
        </span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${editing ? "bg-gray-800 text-white" : "border border-blue-500 text-blue-600 hover:bg-blue-50"}`}
        >
          {editing ? t(lang, "เสร็จสิ้น", "Done") : `✎ ${t(lang, "แก้ไข", "Edit")}`}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {grouped.map(({ family, items }) => (
        <div key={family.value} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-2">{familyLabel(family.value, lang)}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 uppercase">
                  <th className="py-1 pr-3">Code</th>
                  <th className="py-1 pr-3">{t(lang, "ชื่อ", "Name")}</th>
                  <th className="py-1 pr-3">{t(lang, "ประเทศ", "Country")}</th>
                  <th className="py-1 pr-3">{t(lang, "วีซ่า", "Visa")}</th>
                  <th className="py-1 pr-3">{t(lang, "หน่วย", "Unit")}</th>
                  <th className="py-1 pr-3">VAT</th>
                  {editing && <th className="py-1" />}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className={`border-t border-gray-50 ${p.active ? "" : "opacity-50"}`}>
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="py-1.5 pr-3">
                      {editing ? (
                        <input
                          defaultValue={p.name}
                          onBlur={saveField(p.id, "name", p.name)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-800">{p.name}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-500">{p.destination ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-500">
                      {p.visa_type ? VISA_TYPES.find((v) => v.value === p.visa_type)?.th ?? p.visa_type : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {editing ? (
                        <input
                          defaultValue={p.unit ?? ""}
                          onBlur={saveField(p.id, "unit", p.unit ?? "")}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 focus:border-blue-400 focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-500">{p.unit ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">
                      {editing ? (
                        <input
                          type="checkbox"
                          checked={p.taxable}
                          disabled={busy}
                          onChange={(e) => call({ action: "update", id: p.id, taxable: e.target.checked })}
                        />
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${p.taxable ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                          {p.taxable ? "VAT" : t(lang, "ไม่มี VAT", "No VAT")}
                        </span>
                      )}
                    </td>
                    {editing && (
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => call({ action: "toggle", id: p.id, active: !p.active })}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium mr-2 ${p.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                        >
                          {p.active ? t(lang, "เปิด", "On") : t(lang, "ปิด", "Off")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirm(t(lang, `ลบ “${p.name}”? (ใบเสนอราคาเก่าไม่กระทบ)`, `Delete “${p.name}”? (issued quotes keep their snapshot)`)) &&
                            call({ action: "delete", id: p.id })
                          }
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          {t(lang, "ลบ", "Delete")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {orphans.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-2">{t(lang, "ไม่ระบุหมวด", "Uncategorized")}</div>
          {orphans.map((p) => (
            <div key={p.id} className="text-sm text-gray-600 py-0.5">{p.code} — {p.name}</div>
          ))}
        </div>
      )}

      {editing && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">{t(lang, "เพิ่มสินค้า/บริการใหม่", "Add product")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <input
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="CODE (เช่น FEE-EMB-JP-TOURIST)"
              className="rounded-lg border border-gray-200 px-2 py-1.5 font-mono text-xs focus:border-blue-400 focus:outline-none col-span-2"
            />
            <select
              value={draft.family}
              onChange={(e) => setDraft((d) => ({ ...d, family: e.target.value }))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-blue-400 focus:outline-none"
            >
              {PRODUCT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{lang === "en" ? f.label_en : f.label_th}</option>
              ))}
            </select>
            <input
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              placeholder={t(lang, "หน่วย เช่น ท่าน", "Unit e.g. person")}
              className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-blue-400 focus:outline-none"
            />
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={t(lang, "ชื่อที่แสดงบนใบเสนอราคา", "Name shown on quotes")}
              className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-blue-400 focus:outline-none col-span-2 md:col-span-4"
            />
            {draft.family === "fee" && (
              <>
                <select
                  value={draft.destination}
                  onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">{t(lang, "— ประเทศ (ถ้ามี) —", "— country (optional) —")}</option>
                  {sortedCountries(lang).map((c) => (
                    <option key={c.code} value={c.code}>{lang === "en" ? c.en : c.th}</option>
                  ))}
                </select>
                <select
                  value={draft.visaType}
                  onChange={(e) => setDraft((d) => ({ ...d, visaType: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">{t(lang, "— ประเภทวีซ่า (ถ้ามี) —", "— visa type (optional) —")}</option>
                  {VISA_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>{v.th}</option>
                  ))}
                </select>
              </>
            )}
            <label className="flex items-center gap-2 text-gray-600">
              <input
                type="checkbox"
                checked={draft.taxable}
                onChange={(e) => setDraft((d) => ({ ...d, taxable: e.target.checked }))}
              />
              {t(lang, "คิด VAT", "VAT applies")}
            </label>
            <button
              type="button"
              disabled={busy || !draft.code.trim() || !draft.name.trim()}
              onClick={async () => {
                const ok = await call({ action: "add", ...draft });
                if (ok) setDraft(EMPTY);
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {t(lang, "เพิ่ม", "Add")}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {t(
              lang,
              "ค่าธรรมเนียมที่ต่างตามประเทศ/วีซ่า ให้สร้างเป็นรายการแยก เช่น FEE-EMB-JP-TOURIST แล้วไปตั้งราคาในหัวข้อถัดไป — รายการที่ยังไม่มีราคาจะไม่ขึ้นให้เลือกในใบเสนอราคา",
              "Country/visa-specific fees are separate items (e.g. FEE-EMB-JP-TOURIST); set prices below — items without a price don't appear in the quote builder."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
