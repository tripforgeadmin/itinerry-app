"use client";

import { CountrySelect } from "@/components/ui/CountrySelect";
import { TextField } from "@/components/ui/TextField";
import { SensitiveYesNoFrame } from "@/components/screens/SensitiveYesNoFrame";
import type { ScreenProps } from "@/components/screens/types";

const BANNER = "ตอบตามจริงช่วยให้เราเตรียมเคสได้แม่นขึ้น — เราไม่ตัดสิน และทุกอย่างเก็บเป็นความลับ";
const DETAIL = "q31";

/** Refused (q30) — Y/N; "เคย" reveals a country search-dropdown + a year (ค.ศ.) field. The combined
 * "<country> <year>" string is stored under q31 for submit. */
export function RefusedScreen(p: ScreenProps) {
  const country = p.answers[`${DETAIL}_country`] ?? "";
  const year = p.answers[`${DETAIL}_year`] ?? "";

  function setPart(part: "country" | "year", v: string) {
    p.onAnswer(`${DETAIL}_${part}`, v);
    const c = part === "country" ? v : country;
    const y = part === "year" ? v : year;
    p.onAnswer(DETAIL, [c, y].filter(Boolean).join(" "));
  }

  const yearOk = /^\d{4}$/.test(year);
  const gateOk = !!p.value && (p.value !== "yes" || (country.trim().length > 0 && yearOk));

  return (
    <SensitiveYesNoFrame {...p} banner={BANNER} gateOk={gateOk} squareOptions>
      <div className="flex flex-col gap-3 pt-3">
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-primary">
            {p.lang === "th" ? "ประเทศที่ถูกปฏิเสธ" : "Country that refused"}
          </span>
          <CountrySelect value={country} onChange={(v) => setPart("country", v)} lang={p.lang} />
        </div>
        <TextField
          label={p.lang === "th" ? "ปีที่ถูกปฏิเสธ (ค.ศ.)" : "Year refused (CE)"}
          value={year}
          onChange={(e) => setPart("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="2023"
          error={year && !yearOk ? (p.lang === "th" ? "กรอกปี ค.ศ. 4 หลัก" : "Enter a 4-digit year") : null}
        />
      </div>
    </SensitiveYesNoFrame>
  );
}
