"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

/** Inline done / no-show / cancel buttons on a priority-lane booking row. */
export function BookingActions({ lang, bookingId }: { lang: Lang; bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(status: string, confirmMsg?: string) {
    if (busy) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, status }),
      });
      if (!res.ok) alert(t(lang, "ทำรายการไม่สำเร็จ", "Action failed"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="whitespace-nowrap">
      <button onClick={() => set("done")} disabled={busy} className="text-green-600 hover:text-green-800 mr-3 disabled:opacity-40">
        ✓ {t(lang, "คุยแล้ว", "Done")}
      </button>
      <button onClick={() => set("no_show")} disabled={busy} className="text-amber-600 hover:text-amber-800 mr-3 disabled:opacity-40">
        {t(lang, "ไม่มา", "No-show")}
      </button>
      <button
        onClick={() => set("cancelled", t(lang, "ยกเลิกนัดนี้?", "Cancel this booking?"))}
        disabled={busy}
        className="text-red-300 hover:text-red-500 disabled:opacity-40"
      >
        {t(lang, "ยกเลิก", "Cancel")}
      </button>
    </span>
  );
}
