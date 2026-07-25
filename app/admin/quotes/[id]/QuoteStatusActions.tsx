"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUOTE_STATUS_OPTIONS,
  TERMINAL_QUOTE_STATUSES,
  canTransition,
  quoteStatusLabel,
  type QuoteStatusValue,
} from "@/lib/quote-status";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export default function QuoteStatusActions({
  quoteId,
  status,
  lang,
}: {
  quoteId: string;
  status: string;
  lang: Lang;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const targets = QUOTE_STATUS_OPTIONS.filter((s) => canTransition(status, s.value));

  async function setStatus(to: QuoteStatusValue) {
    if (
      TERMINAL_QUOTE_STATUSES.includes(to) &&
      !confirm(t(lang, `ยืนยันเปลี่ยนสถานะเป็น “${quoteStatusLabel(to, lang)}”? ย้อนกลับไม่ได้`, `Set status to “${quoteStatusLabel(to, lang)}”? This cannot be undone.`))
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", quoteId, status: to }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "");
      router.refresh();
    } catch (e) {
      alert((e as Error).message || t(lang, "เปลี่ยนสถานะไม่สำเร็จ", "Status change failed"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft() {
    if (!confirm(t(lang, "ลบใบเสนอราคาฉบับร่างนี้?", "Delete this draft quote?"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", quoteId }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin/quotes");
    } catch {
      alert(t(lang, "ลบไม่สำเร็จ", "Delete failed"));
      setBusy(false);
    }
  }

  if (targets.length === 0 && status !== "draft") return null;

  const styleFor = (v: QuoteStatusValue) =>
    v === "accepted"
      ? "bg-green-600 text-white hover:bg-green-700"
      : v === "sent"
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : v === "rejected" || v === "canceled"
          ? "border border-red-200 text-red-600 hover:bg-red-50"
          : "border border-gray-300 text-gray-600 hover:bg-gray-100";

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {targets.map((s) => (
        <button
          key={s.value}
          type="button"
          disabled={busy}
          onClick={() => setStatus(s.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${styleFor(s.value)}`}
        >
          {s.value === "draft" ? t(lang, "แก้ไขใหม่ (ร่าง)", "Revise (draft)") : quoteStatusLabel(s.value, lang)}
        </button>
      ))}
      {status === "draft" && (
        <button
          type="button"
          disabled={busy}
          onClick={deleteDraft}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700"
        >
          {t(lang, "ลบร่าง", "Delete draft")}
        </button>
      )}
    </div>
  );
}
