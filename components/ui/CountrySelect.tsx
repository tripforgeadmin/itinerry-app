"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, flagEmoji, type Country } from "@/lib/countries";

interface CountrySelectProps {
  value: string; // selected country name (display string)
  onChange: (name: string) => void;
  placeholder?: string;
  lang?: "th" | "en";
}

/** Search-and-pick country combobox over the full world list (lib/countries). Stores the chosen
 * display name. */
export function CountrySelect({ value, onChange, placeholder, lang = "th" }: CountrySelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ph = placeholder ?? (lang === "th" ? "ค้นหาประเทศ..." : "Search country...");
  const nameOf = (c: Country) => (lang === "th" ? c.th : c.en);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? COUNTRIES.filter((c) => `${c.th} ${c.en} ${c.code}`.toLowerCase().includes(q)) : COUNTRIES;
    return list.slice(0, 80);
  }, [query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors focus:border-accent"
      >
        <span className={value ? "text-primary" : "text-muted-soft"}>{value || ph}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-soft">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ph}
            className="w-full border-b border-border bg-card px-4 py-2.5 text-sm text-primary outline-none placeholder:text-muted-soft"
          />
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-soft">{lang === "th" ? "ไม่พบประเทศ" : "No country found"}</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(nameOf(c));
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-accent-bg"
                  >
                    <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                    <span className="font-medium text-primary">{c.th}</span>
                    <span className="truncate text-xs text-muted-soft">{c.en}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
