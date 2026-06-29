"use client";

import { CountryHistoryEditor, type HistoryEntry } from "@/components/screens/CountryHistoryEditor";
import { SensitiveYesNoFrame } from "@/components/screens/SensitiveYesNoFrame";
import type { ScreenProps } from "@/components/screens/types";

const BANNER = "ข้อมูลนี้ช่วยให้ทีมวางแผนรับมือล่วงหน้าได้ ไม่มีผลต่อการให้บริการของเรา";
const DETAIL = "q33";

function parseEntries(v: string | undefined): HistoryEntry[] {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/** Overstay (q32) — "เคย" reveals an add-multiple-countries editor (country + year ค.ศ. + days,
 * 1–999). Stored as JSON under q33_entries and a "<country> <year> · <days> วัน, …" summary under q33. */
export function OverstayScreen(p: ScreenProps) {
  const entries = parseEntries(p.answers[`${DETAIL}_entries`]);

  function setEntries(next: HistoryEntry[]) {
    p.onAnswer(`${DETAIL}_entries`, JSON.stringify(next));
    p.onAnswer(DETAIL, next.map((e) => `${e.country} ${e.year} · ${e.days} วัน`).join(", "));
  }

  const gateOk = !!p.value && (p.value !== "yes" || entries.length > 0);

  return (
    <SensitiveYesNoFrame {...p} banner={BANNER} gateOk={gateOk}>
      <CountryHistoryEditor entries={entries} onChange={setEntries} withDays lang={p.lang} />
    </SensitiveYesNoFrame>
  );
}
