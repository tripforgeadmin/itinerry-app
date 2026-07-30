"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteRow } from "@/lib/quotes";
import { parseMoneyInput, formatTHB } from "@/lib/money";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

/** Customer + terms card. Inline onBlur saves while the quote is a draft;
 * read-only display otherwise (same idiom as LostReasonManager). */
export default function QuoteHeaderEditor({
  quote,
  editable,
  lang,
}: {
  quote: QuoteRow;
  editable: boolean;
  lang: Lang;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(patch: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_header", quoteId: quote.id, ...patch }),
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

  const onBlurText =
    (field: string, original: string | null) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value.trim();
      if (v !== (original ?? "")) save({ [field]: v });
    };

  const input = "w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500";
  const label = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm mb-4 space-y-3">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
        {t(lang, "ลูกค้าและเงื่อนไข", "Customer & terms")}
        {!editable && (
          <span className="ml-2 normal-case font-normal text-gray-400">
            ({t(lang, "ล็อกแล้ว — แก้ได้เฉพาะฉบับร่าง", "locked — editable in draft only")})
          </span>
        )}
      </h2>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>{t(lang, "หัวเรื่อง", "Subject")}</label>
          <input defaultValue={quote.name} disabled={!editable || busy} onBlur={onBlurText("name", quote.name)} className={input} />
        </div>
        <div>
          <label className={label}>{t(lang, "ชื่อลูกค้า", "Customer name")}</label>
          <input defaultValue={quote.customer_name} disabled={!editable || busy} onBlur={onBlurText("customerName", quote.customer_name)} className={input} />
        </div>
        <div>
          <label className={label}>{t(lang, "เบอร์โทร", "Phone")}</label>
          <input defaultValue={quote.customer_phone ?? ""} disabled={!editable || busy} onBlur={onBlurText("customerPhone", quote.customer_phone)} className={input} />
        </div>
        <div>
          <label className={label}>{t(lang, "อีเมล", "Email")}</label>
          <input defaultValue={quote.customer_email ?? ""} disabled={!editable || busy} onBlur={onBlurText("customerEmail", quote.customer_email)} className={input} />
        </div>
        <div className="col-span-2">
          <label className={label}>{t(lang, "ที่อยู่", "Address")}</label>
          <input defaultValue={quote.customer_address ?? ""} disabled={!editable || busy} onBlur={onBlurText("customerAddress", quote.customer_address)} className={input} />
        </div>
        <div>
          <label className={label}>{t(lang, "ยืนราคาถึง", "Valid until")}</label>
          <input
            type="date"
            defaultValue={quote.valid_until ?? ""}
            disabled={!editable || busy}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (quote.valid_until ?? "")) save({ validUntil: v || null });
            }}
            className={input}
          />
        </div>
        <div>
          <label className={label}>{t(lang, "เครดิต (วัน)", "Credit (days)")}</label>
          <input
            defaultValue={quote.credit_days ?? ""}
            disabled={!editable || busy}
            inputMode="numeric"
            placeholder="—"
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const v = raw === "" ? null : Number(raw);
              if (v !== null && (!Number.isInteger(v) || v < 0 || v > 365)) {
                setError(t(lang, "เครดิตต้องเป็นจำนวนวัน 0–365", "Credit must be 0–365 days"));
                return;
              }
              if (v !== quote.credit_days) save({ creditDays: v });
            }}
            className={input}
          />
        </div>
        <div>
          <label className={label}>{t(lang, "ผู้ขาย", "Salesperson")}</label>
          <input
            defaultValue={quote.sales_person ?? ""}
            disabled={!editable || busy}
            onBlur={onBlurText("salesPerson", quote.sales_person)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>{t(lang, "ส่วนลดท้ายใบ (บาท)", "Quote discount (THB)")}</label>
          <input
            defaultValue={quote.discount_amount > 0 ? String(quote.discount_amount) : ""}
            disabled={!editable || busy}
            inputMode="decimal"
            placeholder="0"
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const v = raw ? parseMoneyInput(raw) : 0;
              if (v === null) {
                setError(t(lang, "รูปแบบส่วนลดไม่ถูกต้อง", "Invalid discount format"));
                return;
              }
              if (v !== quote.discount_amount) save({ discountAmount: v });
            }}
            className={input}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={quote.vat_rate > 0}
          disabled={!editable || busy}
          onChange={(e) => save({ vatRate: e.target.checked ? 7 : 0 })}
        />
        {t(lang, "คิด VAT 7% (เฉพาะรายการค่าบริการ)", "Apply 7% VAT (service lines only)")}
        {quote.vat_rate > 0 && quote.vat_amount > 0 && (
          <span className="text-xs text-gray-400">= {formatTHB(quote.vat_amount)}</span>
        )}
      </label>

      <div>
        <label className={label}>{t(lang, "หมายเหตุ (แสดงบน PDF)", "Notes (shown on the PDF)")}</label>
        <textarea
          defaultValue={quote.notes ?? ""}
          disabled={!editable || busy}
          onBlur={onBlurText("notes", quote.notes)}
          rows={2}
          className={input}
        />
      </div>
      <div>
        <label className={label}>{t(lang, "เงื่อนไข (แสดงบน PDF)", "Terms (shown on the PDF)")}</label>
        <textarea
          defaultValue={quote.terms ?? ""}
          disabled={!editable || busy}
          onBlur={onBlurText("terms", quote.terms)}
          rows={2}
          className={input}
        />
      </div>
    </div>
  );
}
