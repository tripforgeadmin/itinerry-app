"use client";

import { CountryHistoryEditor, type HistoryEntry } from "@/components/screens/CountryHistoryEditor";
import { SensitiveYesNoFrame } from "@/components/screens/SensitiveYesNoFrame";
import type { ScreenProps } from "@/components/screens/types";

const BANNER = "ตอบตามจริงช่วยให้เราเตรียมเคสได้แม่นขึ้น — เราไม่ตัดสิน และทุกอย่างเก็บเป็นความลับ";
const DETAIL = "q31";

function parseEntries(v: string | undefined): HistoryEntry[] {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/** Refused (q30) — "เคย" reveals an add-multiple-countries editor (country + year ค.ศ.). The list is
 * stored as JSON under q31_entries and a readable "<country> <year>, …" summary under q31. */
export function RefusedScreen(p: ScreenProps) {
  const entries = parseEntries(p.answers[`${DETAIL}_entries`]);

  function setEntries(next: HistoryEntry[]) {
    p.onAnswer(`${DETAIL}_entries`, JSON.stringify(next));
    p.onAnswer(DETAIL, next.map((e) => `${e.country} ${e.year}`).join(", "));
  }

  const gateOk = !!p.value && (p.value !== "yes" || entries.length > 0);

  return (
    <SensitiveYesNoFrame {...p} banner={BANNER} gateOk={gateOk} squareOptions>
      <CountryHistoryEditor entries={entries} onChange={setEntries} lang={p.lang} />
    </SensitiveYesNoFrame>
  );
}
