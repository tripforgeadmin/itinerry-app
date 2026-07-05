"use client";

import { useState } from "react";
import Link from "next/link";
import type { HealthcheckData } from "@/lib/healthcheck-data";
import HealthcheckCard from "./HealthcheckCard";

/** Toolbar (back / language toggle / print) + the card. Screen-only chrome is hidden by
 * the page's print stylesheet, so whatever language is selected is what prints. */
export default function HealthcheckView({
  backHref,
  dataTh,
  dataEn,
  defaultLang,
  flagSrc,
}: {
  backHref: string;
  dataTh: HealthcheckData;
  dataEn: HealthcheckData;
  defaultLang: "th" | "en";
  flagSrc: string | null;
}) {
  const [lang, setLang] = useState<"th" | "en">(defaultLang);
  const data = lang === "th" ? dataTh : dataEn;

  return (
    <>
      <div className="no-print mx-auto mb-4 flex w-full max-w-[1080px] items-center gap-3">
        <Link href={backHref} className="text-sm text-gray-400 hover:text-gray-600">← กลับหน้าเคส</Link>
        <span className="text-sm font-bold text-gray-700">รายงานสุขภาพวีซ่า (ฉบับลูกค้า)</span>

        <div className="ml-auto flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-sm">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                lang === l ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {l === "th" ? "ไทย" : "EN"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          🖨️ พิมพ์ / บันทึก PDF
        </button>
      </div>

      <div className="mx-auto w-fit shadow-lg">
        <HealthcheckCard data={data} flagSrc={flagSrc} />
      </div>
    </>
  );
}
