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
}

/** Inline month picker (design spec §5): Thai month + Buddhist year caption, past days disabled.
 * Wraps react-day-picker, tokenized to the design palette. */
export function DateCalendar({ value, onChange }: DateCalendarProps) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="rounded-2xl border border-border bg-card p-2">
      <style>{`
        .rdp-root { --rdp-accent-color: var(--color-accent); --rdp-accent-background-color: var(--color-accent-bg); --rdp-font-family: inherit; margin: 0; }
        .rdp-month_caption { color: var(--color-primary); font-weight: 700; }
        .rdp-weekday { color: var(--color-muted); font-size: 0.7rem; }
        .rdp-day_button { color: var(--color-primary-mid); }
        .rdp-day_button:hover { background: var(--rdp-accent-background-color); }
        .rdp-nav button { color: var(--color-muted); }
        .rdp-day[data-outside] .rdp-day_button { color: var(--color-muted-soft); }
      `}</style>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(d) => {
          if (d) onChange(toISO(d));
        }}
        startMonth={new Date(2025, 0)}
        endMonth={new Date(2029, 11)}
        disabled={{ before: new Date() }}
        formatters={{ formatCaption: (m) => `${TH_MONTHS[m.getMonth()]} ${m.getFullYear()}` }}
      />
    </div>
  );
}
