"use client";

import Link from "next/link";

/** Screen-only toolbar above the card — hidden by the print stylesheet. */
export default function PrintToolbar({ backHref, ready }: { backHref: string; ready: boolean }) {
  return (
    <div className="no-print mx-auto mb-4 flex w-full max-w-[1080px] items-center gap-3">
      <Link href={backHref} className="text-sm text-gray-400 hover:text-gray-600">← กลับหน้าเคส</Link>
      <span className="text-sm font-bold text-gray-700">รายงานสุขภาพวีซ่า (ฉบับลูกค้า)</span>
      {ready && (
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          🖨️ พิมพ์ / บันทึก PDF
        </button>
      )}
    </div>
  );
}
