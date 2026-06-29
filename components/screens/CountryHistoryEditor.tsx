"use client";

import { useState } from "react";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { TextField } from "@/components/ui/TextField";
import { flagEmoji } from "@/lib/countries";
import type { Lang } from "@/components/ui/LangToggle";

export interface HistoryEntry {
  country: string; // display name
  code: string; // ISO-3166 alpha-2 (lower) — for the flag
  year: string;
  days?: string;
}

interface Props {
  entries: HistoryEntry[];
  onChange: (entries: HistoryEntry[]) => void;
  /** Overstay adds a days field (1–999). */
  withDays?: boolean;
  lang: Lang;
}

/** Add-multiple-countries editor for the refused / overstay history (#7): a list of committed
 * entries (flag · country · year [· days], removable) plus a draft row + "เพิ่มประเทศ" button. */
export function CountryHistoryEditor({ entries, onChange, withDays = false, lang }: Props) {
  const [country, setCountry] = useState("");
  const [code, setCode] = useState("");
  const [year, setYear] = useState("");
  const [days, setDays] = useState("");

  const yearOk = /^\d{4}$/.test(year);
  const daysNum = parseInt(days, 10);
  const daysOk = !withDays || (/^\d+$/.test(days) && daysNum > 0 && daysNum < 1000);
  const canAdd = country.trim().length > 0 && yearOk && daysOk;

  function add() {
    if (!canAdd) return;
    onChange([...entries, { country, code, year, ...(withDays ? { days } : {}) }]);
    setCountry("");
    setCode("");
    setYear("");
    setDays("");
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-base leading-none">{e.code ? flagEmoji(e.code.toUpperCase()) : "🏳️"}</span>
              <span className="font-semibold text-primary">{e.country}</span>
              <span className="text-sm text-muted">
                {e.year}
                {withDays && e.days ? ` · ${e.days} ${lang === "th" ? "วัน" : "days"}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
                aria-label="remove"
                className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted-soft transition-colors hover:bg-surface-soft hover:text-red-alert"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-primary">{lang === "th" ? "ประเทศ" : "Country"}</span>
        <CountrySelect value={country} onChange={setCountry} onPickCountry={(c) => setCode(c.code)} lang={lang} />
      </div>
      <TextField
        label={lang === "th" ? "ปี (ค.ศ.)" : "Year (CE)"}
        value={year}
        onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="2022"
        error={year && !yearOk ? (lang === "th" ? "กรอกปี ค.ศ. 4 หลัก" : "Enter a 4-digit year") : null}
      />
      {withDays && (
        <TextField
          label={lang === "th" ? "จำนวนวันที่อยู่เกิน" : "Days overstayed"}
          value={days}
          onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="10"
          error={days && !daysOk ? (lang === "th" ? "ระบุ 1–999 วัน" : "Must be 1–999 days") : null}
        />
      )}
      <button
        type="button"
        onClick={add}
        disabled={!canAdd}
        className="self-start rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-bg disabled:opacity-40"
      >
        + {lang === "th" ? "เพิ่มประเทศ" : "Add country"}
      </button>
    </div>
  );
}
