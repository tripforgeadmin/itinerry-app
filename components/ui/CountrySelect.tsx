"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sortedCountries, flagEmoji, type Country } from "@/lib/countries";

interface CountrySelectProps {
  value: string; // selected country display name
  onChange: (name: string) => void;
  /** Optional: also receive the full Country (for code/flag) on pick. */
  onPickCountry?: (c: Country) => void;
  placeholder?: string;
  lang?: "th" | "en";
}

/**
 * Single type-in country combobox (lib/countries). The field itself is the search input — type
 * directly to filter; the result list renders inline below (so it grows its container, e.g. a
 * RevealBlock, instead of being clipped). Stores the chosen display name.
 */
export function CountrySelect({ value, onChange, onPickCountry, placeholder, lang = "th" }: CountrySelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ph = placeholder ?? (lang === "th" ? "ค้นหาประเทศ..." : "Search country...");
  const nameOf = (c: Country) => (lang === "th" ? c.th : c.en);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const sorted = sortedCountries(lang);
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((c) => `${c.th} ${c.en} ${c.code}`.toLowerCase().includes(q)) : sorted;
  }, [query, lang]);

  function pick(c: Country) {
    onChange(nameOf(c));
    onPickCountry?.(c);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={open ? query : value}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={ph}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 pr-10 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent"
        />
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-soft"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <ul className="mt-2 max-h-[46vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-card">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-soft">{lang === "th" ? "ไม่พบประเทศ" : "No country found"}</li>
          ) : (
            filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-accent-bg"
                >
                  <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                  <span className="font-medium text-primary">{lang === "th" ? c.th : c.en}</span>
                  <span className="truncate text-xs text-muted-soft">{lang === "th" ? c.en : c.th}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
