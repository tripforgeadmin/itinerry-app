"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceBookRow } from "@/lib/products";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface Prefill {
  assessmentId: string;
  accountId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

export default function NewQuoteForm({
  books,
  prefill,
  lang,
}: {
  books: PriceBookRow[];
  prefill: Prefill | null;
  lang: Lang;
}) {
  const router = useRouter();
  const standard = books.find((b) => b.is_standard) ?? books[0];
  const [form, setForm] = useState({
    name: "",
    customerName: prefill?.customerName ?? "",
    customerPhone: prefill?.customerPhone ?? "",
    customerEmail: prefill?.customerEmail ?? "",
    customerAddress: "",
    priceBookId: standard?.id ?? "",
    validUntil: "",
    vat: false,
    creditDays: "",
    salesPerson: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: form.name,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          customerAddress: form.customerAddress,
          priceBookId: form.priceBookId,
          validUntil: form.validUntil || undefined,
          vatRate: form.vat ? 7 : 0,
          creditDays: form.creditDays.trim() !== "" && Number.isInteger(Number(form.creditDays)) ? Number(form.creditDays) : undefined,
          salesPerson: form.salesPerson || undefined,
          assessmentId: prefill?.assessmentId,
          accountId: prefill?.accountId ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.id) throw new Error(json.error || "");
      // Create-then-edit (Salesforce flow): lines are added on the detail page.
      router.push(`/admin/quotes/${json.id}`);
    } catch (e) {
      setError((e as Error).message || t(lang, "สร้างไม่สำเร็จ ลองใหม่อีกครั้ง", "Create failed — try again"));
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none";
  const label = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t(lang, "ใบเสนอราคา", "Quote")}</h2>
        <div>
          <label className={label}>{t(lang, "หัวเรื่อง *", "Subject *")}</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder={t(lang, "เช่น ใบเสนอราคาบริการวีซ่าเชงเก้น (ฝรั่งเศส) 2 ท่าน", "e.g. Schengen visa service (France), 2 persons")}
            className={input}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Price book</label>
            <select value={form.priceBookId} onChange={set("priceBookId")} className={input}>
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.is_standard ? " (Standard)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{t(lang, "ยืนราคาถึง", "Valid until")}</label>
            <input type="date" value={form.validUntil} onChange={set("validUntil")} className={input} />
          </div>
          <div>
            <label className={label}>{t(lang, "เครดิต (วัน)", "Credit (days)")}</label>
            <input value={form.creditDays} onChange={set("creditDays")} inputMode="numeric" placeholder={t(lang, "เช่น 4", "e.g. 4")} className={input} />
          </div>
          <div>
            <label className={label}>{t(lang, "ผู้ขาย", "Salesperson")}</label>
            <input value={form.salesPerson} onChange={set("salesPerson")} placeholder={t(lang, "เช่น คุณเอ็ท", "e.g. K. Ait")} className={input} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.vat} onChange={(e) => setForm((f) => ({ ...f, vat: e.target.checked }))} />
          {t(lang, "คิด VAT 7% (เฉพาะค่าบริการ — ค่าธรรมเนียมไม่ถูกคิด VAT)", "Apply 7% VAT (services only — pass-through fees are excluded)")}
        </label>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t(lang, "ลูกค้า", "Customer")}</h2>
        <div>
          <label className={label}>{t(lang, "ชื่อลูกค้า *", "Customer name *")}</label>
          <input value={form.customerName} onChange={set("customerName")} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>{t(lang, "เบอร์โทร", "Phone")}</label>
            <input value={form.customerPhone} onChange={set("customerPhone")} className={input} />
          </div>
          <div>
            <label className={label}>{t(lang, "อีเมล", "Email")}</label>
            <input value={form.customerEmail} onChange={set("customerEmail")} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>{t(lang, "ที่อยู่ (สำหรับ PDF)", "Address (for the PDF)")}</label>
          <input value={form.customerAddress} onChange={set("customerAddress")} className={input} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={busy || !form.name.trim() || !form.customerName.trim() || !form.priceBookId}
        onClick={submit}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {busy ? t(lang, "กำลังสร้าง…", "Creating…") : t(lang, "สร้างและไปเพิ่มรายการ →", "Create & add items →")}
      </button>
    </div>
  );
}
