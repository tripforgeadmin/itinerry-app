"use client";

import { useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { AdEvent } from "./BroadcastManager";

/** Month-grid view of the marketing Google Calendar. Red days are ad days (title matched
 * a keyword) — automatic broadcasts are skipped on those days. Data window comes from the
 * server (page.tsx fetches ~2 months back / ~3 months ahead), so navigation is clamped to
 * -1 … +2 months to never show a month that looks empty just because it wasn't fetched. */

const DAY_HEAD_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_HEAD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const addDaysIso = (iso: string, d: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

// Consultation-booking events (lib/google-calendar.ts) always title themselves
// "HH:MM 📞/💻 นัดคุย — {name}" — spot them by the icon so they stand out from any other
// meeting already on the team calendar, without needing a separate data source.
const isBookingEvent = (summary: string) => summary.includes("📞") || summary.includes("💻");

export default function AdCalendar({ lang, events, todayIso }: {
  lang: Lang;
  events: AdEvent[];
  todayIso: string;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const [ty, tm] = todayIso.split("-").map(Number);
  const monthStart = new Date(Date.UTC(ty, tm - 1 + monthOffset, 1));
  const yy = monthStart.getUTCFullYear();
  const mm = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  const leadingBlanks = monthStart.getUTCDay(); // week starts Sunday
  const monthLabel = monthStart.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", {
    timeZone: "UTC", month: "long", year: "numeric",
  });
  const iso = (day: number) => `${yy}-${String(mm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Expand multi-day events into one entry per calendar day.
  const byDay = useMemo(() => {
    const map = new Map<string, AdEvent[]>();
    for (const e of events) {
      for (let d = e.dateIso; d <= e.endDateIso; d = addDaysIso(d, 1)) {
        map.set(d, [...(map.get(d) ?? []), e]);
      }
    }
    return map;
  }, [events]);

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month header + navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonthOffset((o) => Math.max(-1, o - 1))}
            disabled={monthOffset <= -1}
            className="rounded-lg w-7 h-7 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
            aria-label="previous month"
          >
            ‹
          </button>
          <button
            onClick={() => setMonthOffset((o) => Math.min(2, o + 1))}
            disabled={monthOffset >= 2}
            className="rounded-lg w-7 h-7 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
            aria-label="next month"
          >
            ›
          </button>
          <span className="ml-1 text-sm font-bold text-gray-800">{monthLabel}</span>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)} className="ml-2 text-[11px] text-blue-500 hover:text-blue-700">
              {t(lang, "วันนี้", "Today")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />
            {t(lang, "วันยิงแอด — งดบอดแคสอัตโนมัติ", "Ad day — no auto broadcast")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300" />
            {t(lang, "นัดคุยที่จองไว้", "Booked consultation")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200" />
            {t(lang, "อีเวนต์อื่น", "Other event")}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {(lang === "en" ? DAY_HEAD_EN : DAY_HEAD_TH).map((d, i) => (
          <div key={d} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? "text-red-300" : "text-gray-400"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} className="bg-gray-50/70 min-h-20" />;
          const dayIso = iso(day);
          const dayEvents = byDay.get(dayIso) ?? [];
          const isAdDay = dayEvents.some((e) => e.matched);
          const isToday = dayIso === todayIso;
          const isPast = dayIso < todayIso;
          return (
            <div
              key={i}
              className={`min-h-20 p-1 flex flex-col gap-0.5 ${
                isAdDay ? "bg-red-50" : "bg-white"
              } ${isPast ? "opacity-55" : ""}`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`text-[11px] leading-5 ${
                    isToday
                      ? "w-5 h-5 rounded-full bg-blue-500 text-white font-bold text-center"
                      : isAdDay ? "font-bold text-red-600" : "text-gray-500"
                  }`}
                >
                  {day}
                </span>
                {isAdDay && <span className="text-[10px]" title={t(lang, "งดบอดแคสอัตโนมัติ", "No auto broadcast")}>🚫</span>}
              </div>
              {dayEvents.slice(0, 3).map((e, j) => (
                <div
                  key={j}
                  title={e.summary}
                  className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                    e.matched ? "bg-red-100 text-red-700 font-medium"
                    : isBookingEvent(e.summary) ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {e.summary || t(lang, "(ไม่มีชื่อ)", "(untitled)")}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <span className="px-1 text-[10px] text-gray-400">+{dayEvents.length - 3}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
