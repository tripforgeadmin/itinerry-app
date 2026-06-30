"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const MIN_YEAR = 1950;

interface YearSelectProps {
  value: string;
  onChange: (year: string) => void;
  label?: string;
  error?: string | null;
  placeholder?: string;
}

/** CE-year combobox: type a 4-digit year OR pick from the dropdown (current year → 1950). The list
 * filters by what's typed and flips above the field when there isn't room below. Validation (real
 * CE year in range) is the caller's job — pass `error` to surface it. */
export function YearSelect({ value, onChange, label, error, placeholder = "2022" }: YearSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const list: string[] = [];
    for (let y = currentYear; y >= MIN_YEAR; y--) list.push(String(y));
    return list;
  }, [currentYear]);

  const filtered = useMemo(() => {
    const q = value.trim();
    return q ? years.filter((y) => y.startsWith(q)) : years;
  }, [value, years]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openList() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < 280 && rect.top > below);
    }
    setOpen(true);
  }

  return (
    <div ref={ref} className="relative">
      {label && <span className="mb-1.5 block text-sm font-semibold text-primary">{label}</span>}
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.replace(/\D/g, "").slice(0, 4));
          setOpen(true);
        }}
        onFocus={openList}
        placeholder={placeholder}
        className={
          "w-full rounded-2xl border bg-card px-4 py-3.5 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent " +
          (error ? "border-red-alert" : "border-border")
        }
      />
      {error && <p className="mt-1 text-xs text-red-alert">{error}</p>}
      {open && filtered.length > 0 && (
        <ul
          className={
            "absolute left-0 z-50 max-h-[40vh] w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-card " +
            (openUp ? "bottom-full mb-1" : "top-full mt-1")
          }
        >
          {filtered.map((y) => (
            <li key={y}>
              <button
                type="button"
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent-bg"
              >
                {y}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
