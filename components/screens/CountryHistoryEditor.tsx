"use client";

import { useEffect, useRef, useState } from "react";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { TextField } from "@/components/ui/TextField";
import { flagEmoji } from "@/lib/countries";
import type { Lang } from "@/components/ui/LangToggle";

export interface HistoryEntry {
  country: string; // display name
  code: string; // ISO-3166 alpha-2 (lower)
  year: string;
  days?: string;
}

interface Row {
  country: string;
  code: string;
  year: string;
  days: string;
}
const blank = (): Row => ({ country: "", code: "", year: "", days: "" });

function rowValid(r: Row, withDays: boolean): boolean {
  const yearOk = /^\d{4}$/.test(r.year);
  const d = parseInt(r.days, 10);
  const daysOk = !withDays || (/^\d+$/.test(r.days) && d > 0 && d < 1000);
  return r.country.trim().length > 0 && yearOk && daysOk;
}

interface Props {
  entries: HistoryEntry[];
  onChange: (entries: HistoryEntry[]) => void;
  /** Overstay adds a days field (1–999). */
  withDays?: boolean;
  lang: Lang;
}

/** Add-countries editor (#7) for the refused/overstay history: one editable row per country (flag +
 * country + year [+days]); each VALID row auto-counts (no commit step needed — a single country is
 * enough to proceed). "+ เพิ่มประเทศ" appends another row; rows persist as a HistoryEntry[] JSON. */
export function CountryHistoryEditor({ entries, onChange, withDays = false, lang }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    entries.length
      ? entries.map((e) => ({ country: e.country, code: e.code, year: e.year, days: e.days ?? "" }))
      : [blank()]
  );

  // Persist valid rows whenever they change. Functional setRows (below) avoids stale-closure
  // clobbering when several fields update in the same tick (e.g. pick country + type year).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const valid: HistoryEntry[] = rows
      .filter((r) => rowValid(r, withDays))
      .map((r) => ({ country: r.country, code: r.code, year: r.year, ...(withDays ? { days: r.days } : {}) }));
    onChangeRef.current(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, withDays]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, blank()]);
  const removeRow = (i: number) => setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [blank()]));

  return (
    <div className="flex flex-col gap-3 pt-3">
      {rows.map((r, i) => {
        const yearErr = r.year && !/^\d{4}$/.test(r.year);
        const dNum = parseInt(r.days, 10);
        const daysErr = withDays && r.days && !(/^\d+$/.test(r.days) && dNum > 0 && dNum < 1000);
        return (
          <div key={i} className="rounded-2xl border border-border bg-surface-soft/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                {r.code && <span className="text-base leading-none">{flagEmoji(r.code.toUpperCase())}</span>}
                {lang === "th" ? `ประเทศที่ ${i + 1}` : `Country ${i + 1}`}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="remove"
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-soft transition-colors hover:bg-surface-soft hover:text-red-alert"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <CountrySelect
                value={r.country}
                onChange={(name) => setRow(i, { country: name })}
                onPickCountry={(c) => setRow(i, { country: lang === "th" ? c.th : c.en, code: c.code })}
                lang={lang}
              />
              <TextField
                label={lang === "th" ? "ปี (ค.ศ.)" : "Year (CE)"}
                value={r.year}
                onChange={(e) => setRow(i, { year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="2022"
                error={yearErr ? (lang === "th" ? "กรอกปี ค.ศ. 4 หลัก" : "Enter a 4-digit year") : null}
              />
              {withDays && (
                <TextField
                  label={lang === "th" ? "จำนวนวันที่อยู่เกิน" : "Days overstayed"}
                  value={r.days}
                  onChange={(e) => setRow(i, { days: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder="10"
                  error={daysErr ? (lang === "th" ? "ระบุ 1–999 วัน" : "Must be 1–999 days") : null}
                />
              )}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-bg"
      >
        + {lang === "th" ? "เพิ่มประเทศ" : "Add country"}
      </button>
    </div>
  );
}
