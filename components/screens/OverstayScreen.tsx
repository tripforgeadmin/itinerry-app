"use client";

import { CountrySelect } from "@/components/ui/CountrySelect";
import { TextField } from "@/components/ui/TextField";
import { SensitiveYesNoFrame } from "@/components/screens/SensitiveYesNoFrame";
import type { ScreenProps } from "@/components/screens/types";

const BANNER = "ข้อมูลนี้ช่วยให้ทีมวางแผนรับมือล่วงหน้าได้ ไม่มีผลต่อการให้บริการของเรา";
const DETAIL = "q33";

/** Overstay (q32) — Y/N; "เคย" reveals country search-dropdown + year (ค.ศ.) + number of days
 * (1–999, must be > 0 and < 1000). Combined "<country> <year> · <days> วัน" stored under q33. */
export function OverstayScreen(p: ScreenProps) {
  const country = p.answers[`${DETAIL}_country`] ?? "";
  const year = p.answers[`${DETAIL}_year`] ?? "";
  const days = p.answers[`${DETAIL}_days`] ?? "";

  function setPart(part: "country" | "year" | "days", v: string) {
    p.onAnswer(`${DETAIL}_${part}`, v);
    const c = part === "country" ? v : country;
    const y = part === "year" ? v : year;
    const d = part === "days" ? v : days;
    const combined = [c, y].filter(Boolean).join(" ") + (d ? ` · ${d} วัน` : "");
    p.onAnswer(DETAIL, combined.trim());
  }

  const yearOk = /^\d{4}$/.test(year);
  const daysNum = parseInt(days, 10);
  const daysOk = /^\d+$/.test(days) && daysNum > 0 && daysNum < 1000;
  const gateOk = !!p.value && (p.value !== "yes" || (country.trim().length > 0 && yearOk && daysOk));

  return (
    <SensitiveYesNoFrame {...p} banner={BANNER} gateOk={gateOk}>
      <div className="flex flex-col gap-3 pt-3">
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-primary">
            {p.lang === "th" ? "ประเทศที่ Overstay" : "Country overstayed"}
          </span>
          <CountrySelect value={country} onChange={(v) => setPart("country", v)} lang={p.lang} />
        </div>
        <TextField
          label={p.lang === "th" ? "ปีที่เกิด (ค.ศ.)" : "Year (CE)"}
          value={year}
          onChange={(e) => setPart("year", e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="2022"
          error={year && !yearOk ? (p.lang === "th" ? "กรอกปี ค.ศ. 4 หลัก" : "Enter a 4-digit year") : null}
        />
        <TextField
          label={p.lang === "th" ? "จำนวนวันที่อยู่เกิน" : "Number of days overstayed"}
          value={days}
          onChange={(e) => setPart("days", e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="10"
          error={days && !daysOk ? (p.lang === "th" ? "ระบุ 1–999 วัน" : "Must be 1–999 days") : null}
        />
      </div>
    </SensitiveYesNoFrame>
  );
}
