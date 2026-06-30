"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

interface DateCalendarProps {
  value?: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  /** Earliest selectable day (ISO); days before max(today, minDate) are disabled. */
  minDate?: string;
}

/** Inline date picker (design spec §5): Thai month + Gregorian (ค.ศ.) year, both selectable via
 * dropdowns, past days disabled, itin_main mascot below. Wraps react-day-picker, tokenized. */
export function DateCalendar({ value, onChange, minDate }: DateCalendarProps) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const today = new Date();
  // Floor at today; if a minDate (e.g. the arrival date) is later, floor there instead.
  const minD = minDate ? new Date(`${minDate}T00:00:00`) : today;
  const now = minD > today ? minD : today;
  // Rolling forward window so the year dropdown always starts at the floor month.
  const startMonth = new Date(now.getFullYear(), now.getMonth());
  const endMonth = new Date(now.getFullYear() + 4, 11);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-2">
        <style>{`
          .rdp-root { --rdp-accent-color: var(--color-accent); --rdp-accent-background-color: var(--color-accent-bg); --rdp-font-family: inherit; margin: 0; }
          .rdp-month_caption { color: var(--color-primary); font-weight: 700; }
          .rdp-weekday { color: var(--color-muted); font-size: 0.7rem; }
          .rdp-day_button { color: var(--color-primary-mid); }
          .rdp-day_button:hover { background: var(--rdp-accent-background-color); }
          .rdp-nav button { color: var(--color-muted); }
          .rdp-day[data-outside] .rdp-day_button { color: var(--color-muted-soft); }
          .rdp-dropdowns { display: flex; gap: 0.4rem; align-items: center; }
          .rdp-dropdown_root { position: relative; }
          .rdp-dropdown { color: var(--color-primary); font-weight: 700; font-family: inherit; background: var(--color-surface-soft); border: 1px solid var(--color-border); border-radius: 0.6rem; padding: 0.2rem 0.5rem; }
          .rdp-dropdown:focus-visible { outline: 2px solid var(--color-accent); }
        `}</style>
        <DayPicker
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(toISO(d));
          }}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={{ before: now }}
          formatters={{ formatMonthDropdown: (month) => TH_MONTHS[month.getMonth()] }}
        />
      </div>
      <div className="mt-5 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-24 w-24 object-contain" />
      </div>
    </>
  );
}
