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
  /** Latest selectable day (ISO) — caps the forward window (e.g. callback within 2 weeks). */
  maxDate?: string;
  /** Extra per-day disable predicate (e.g. Sundays + holidays) on top of the min/max bounds. */
  isDayDisabled?: (iso: string) => boolean;
  /** Optional 3-state per-day coloring (booking date picker only): "off" = day off/holiday
   * (gray), "full" = open day with nothing left (orange), "available" = bookable (blue).
   * Days with no status are left in the default library styling. */
  dayStatus?: (iso: string) => "off" | "full" | "available" | undefined;
  /** Drop the mascot below the calendar (dropdown/compact contexts). */
  hideMascot?: boolean;
}

/** Inline date picker (design spec §5): Thai month + Gregorian (ค.ศ.) year, both selectable via
 * dropdowns, past days disabled, itin_main mascot below. Wraps react-day-picker, tokenized. */
export function DateCalendar({ value, onChange, minDate, maxDate, isDayDisabled, dayStatus, hideMascot = false }: DateCalendarProps) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const today = new Date();
  // Floor at today; if a minDate (e.g. the arrival date) is later, floor there instead.
  const minD = minDate ? new Date(`${minDate}T00:00:00`) : today;
  const now = minD > today ? minD : today;
  const maxD = maxDate ? new Date(`${maxDate}T00:00:00`) : undefined;
  // Rolling forward window so the year dropdown always starts at the floor month.
  const startMonth = new Date(now.getFullYear(), now.getMonth());
  const endMonth = maxD ? new Date(maxD.getFullYear(), maxD.getMonth()) : new Date(now.getFullYear() + 4, 11);
  const disabled = [
    { before: now },
    ...(maxD ? [{ after: maxD }] : []),
    ...(isDayDisabled ? [(d: Date) => isDayDisabled(toISO(d))] : []),
  ];
  const modifiers = dayStatus
    ? {
        dayOff: (d: Date) => dayStatus(toISO(d)) === "off",
        dayFull: (d: Date) => dayStatus(toISO(d)) === "full",
        dayAvailable: (d: Date) => dayStatus(toISO(d)) === "available",
      }
    : undefined;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-2">
        <style>{`
          .rdp-root { --rdp-accent-color: var(--color-accent); --rdp-accent-background-color: var(--color-accent-bg); --rdp-font-family: inherit; margin: 0; }
          .rdp-month_caption { color: var(--color-primary); font-weight: 700; }
          .rdp-weekday { color: var(--color-muted); font-size: 0.7rem; }
          .rdp-day_button { color: var(--color-primary-mid); }
          .rdp-day_button:hover { background: var(--rdp-accent-background-color); }
          /* selected day — soft yellow fill (design token) instead of the accent blue */
          .rdp-selected .rdp-day_button,
          .rdp-selected .rdp-day_button:hover {
            background: var(--color-yellow-mid);
            color: var(--color-primary);
            border: 1px solid var(--color-yellow-strong);
            font-weight: 700;
          }
          .rdp-nav button { color: var(--color-muted); }
          .rdp-day[data-outside] .rdp-day_button { color: var(--color-muted-soft); }
          /* Booking calendar 3-state legend: gray = day off/holiday, orange = fully booked,
             blue = open — applied as a filled circle behind the day number, same visual
             language as the yellow "selected" fill above (which still wins when both apply,
             via its higher-specificity .rdp-selected .rdp-day_button selector). */
          .day-off .rdp-day_button, .rdp-day_button.day-off {
            background: var(--color-border); color: var(--color-muted); opacity: 1;
          }
          .day-full .rdp-day_button, .rdp-day_button.day-full {
            background: #FFE1C2; color: #9A5B12; opacity: 1;
          }
          .day-available .rdp-day_button, .rdp-day_button.day-available {
            background: var(--color-accent-bg); color: var(--color-accent); font-weight: 700;
          }
          .day-available .rdp-day_button:hover, .rdp-day_button.day-available:hover {
            background: var(--color-accent-bg); filter: brightness(0.97);
          }
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
          disabled={disabled}
          modifiers={modifiers}
          modifiersClassNames={{ dayOff: "day-off", dayFull: "day-full", dayAvailable: "day-available" }}
          formatters={{ formatMonthDropdown: (month) => TH_MONTHS[month.getMonth()] }}
        />
      </div>
      {!hideMascot && (
        <div className="mt-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/itin_main.png" alt="" className="h-24 w-24 object-contain" />
        </div>
      )}
    </>
  );
}
