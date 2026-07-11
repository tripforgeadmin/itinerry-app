"use client";

import { useEffect, useRef, useState } from "react";
import { STATUS_OPTIONS, statusLabel, type StatusValue } from "@/lib/status";
import {
  categoricalOptions,
  fieldLabel,
  newConditionId,
  TEXT_FIELDS,
  CATEGORICAL_FIELDS,
  type FilterCondition,
  type FilterField,
} from "@/lib/admin-filters";
import { t, type Lang } from "@/lib/i18n";

// Presentation-only grouping for the popover's status checklist — NOT the same concept
// as lib/status.ts's isClosed()/CLOSED_STATUSES (which drives SLA-clock-stops-here logic
// and deliberately excludes out_of_scope/human_error). Keep these separate so editing one
// never silently changes the other's behavior.
const OPEN_STATUSES: StatusValue[] = ["pending_review", "evaluated", "contacted", "pending_decision"];
const CLOSED_STATUSES_UI: StatusValue[] = ["win", "lost", "out_of_scope", "human_error"];

const FIELDS: FilterField[] = ["status", "date", "due_date", ...TEXT_FIELDS, ...CATEGORICAL_FIELDS];

function todayIsoLocal(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export default function AddFilterPopover({ onAdd, lang = "th" }: { onAdd: (c: FilterCondition) => void; lang?: Lang }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterField | null>(null);
  const [statusValue, setStatusValue] = useState<StatusValue[]>([]);
  const [categoricalValue, setCategoricalValue] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setField(null);
    setStatusValue([]);
    setCategoricalValue([]);
    setTextValue("");
    setDateFrom("");
    setDateTo("");
  }

  function commit() {
    if (field === "status" && statusValue.length > 0) {
      onAdd({ id: newConditionId(), field: "status", operator: "is_any_of", value: statusValue });
    } else if (field && CATEGORICAL_FIELDS.includes(field as (typeof CATEGORICAL_FIELDS)[number]) && categoricalValue.length > 0) {
      onAdd({
        id: newConditionId(),
        field: field as (typeof CATEGORICAL_FIELDS)[number],
        operator: "is_any_of",
        value: categoricalValue,
      });
    } else if (field && TEXT_FIELDS.includes(field as (typeof TEXT_FIELDS)[number]) && textValue.trim()) {
      onAdd({
        id: newConditionId(),
        field: field as (typeof TEXT_FIELDS)[number],
        operator: "contains",
        value: textValue.trim(),
      });
    } else if ((field === "date" || field === "due_date") && (dateFrom || dateTo)) {
      onAdd({ id: newConditionId(), field, operator: "is_between", value: [dateFrom || null, dateTo || null] });
    }
    close();
  }

  function commitDatePreset(daysBack: number) {
    if (field !== "date" && field !== "due_date") return;
    onAdd({ id: newConditionId(), field, operator: "is_between", value: [daysAgoIso(daysBack), todayIsoLocal()] });
    close();
  }

  const canCommit =
    (field === "status" && statusValue.length > 0) ||
    (field && CATEGORICAL_FIELDS.includes(field as (typeof CATEGORICAL_FIELDS)[number]) && categoricalValue.length > 0) ||
    (field && TEXT_FIELDS.includes(field as (typeof TEXT_FIELDS)[number]) && !!textValue.trim()) ||
    ((field === "date" || field === "due_date") && (dateFrom || dateTo));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
      >
        ＋ {t(lang, "เพิ่มตัวกรอง", "Add filter")}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[260px] max-w-[300px]">
          {!field ? (
            <div className="flex flex-col gap-0.5 max-h-72 overflow-auto">
              {FIELDS.map((f) => (
                <button
                  key={f}
                  onClick={() => setField(f)}
                  className="text-left px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {fieldLabel(f, lang)}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setField(null)}
                className="text-[11px] text-gray-400 hover:text-gray-600 mb-2"
              >
                ← {t(lang, "กลับ", "Back")}
              </button>

              {field === "status" && (
                <div>
                  <div className="flex gap-2 mb-1.5 text-[11px]">
                    <button
                      onClick={() => setStatusValue(STATUS_OPTIONS.map((o) => o.value))}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {t(lang, "เลือกทั้งหมด", "Select all")}
                    </button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setStatusValue([])} className="text-blue-500 hover:text-blue-700">
                      {t(lang, "ล้างทั้งหมด", "Clear all")}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                    {[
                      { title: t(lang, "เปิดอยู่", "Open"), group: OPEN_STATUSES },
                      { title: t(lang, "ปิดแล้ว", "Closed"), group: CLOSED_STATUSES_UI },
                    ].map(({ title, group }) => (
                      <div key={title}>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
                          <button
                            onClick={() =>
                              setStatusValue((prev) => [...new Set([...prev, ...group])])
                            }
                            className="text-[10px] text-blue-500 hover:text-blue-700"
                          >
                            {t(lang, "เลือกกลุ่มนี้", "Select group")}
                          </button>
                        </div>
                        {group.map((value) => {
                          const opt = STATUS_OPTIONS.find((o) => o.value === value)!;
                          return (
                            <label key={opt.value} className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={statusValue.includes(opt.value)}
                                onChange={(e) =>
                                  setStatusValue((prev) =>
                                    e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)
                                  )
                                }
                              />
                              <span className={`px-1.5 py-0.5 rounded ${opt.color}`}>{statusLabel(opt.value, lang)}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {field && CATEGORICAL_FIELDS.includes(field as (typeof CATEGORICAL_FIELDS)[number]) && (
                <div className="flex flex-col gap-1 max-h-56 overflow-auto">
                  {categoricalOptions(field as (typeof CATEGORICAL_FIELDS)[number], lang).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={categoricalValue.includes(opt.value)}
                        onChange={(e) =>
                          setCategoricalValue((prev) =>
                            e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)
                          )
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}

              {field && TEXT_FIELDS.includes(field as (typeof TEXT_FIELDS)[number]) && (
                <input
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder={t(lang, "พิมพ์ข้อความ…", "Type text…")}
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}

              {(field === "date" || field === "due_date") && (
                <div className="flex flex-col gap-2">
                  {field === "date" && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <button onClick={() => commitDatePreset(0)} className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200">
                        {t(lang, "วันนี้", "Today")}
                      </button>
                      <button onClick={() => commitDatePreset(6)} className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200">
                        {t(lang, "7 วันที่ผ่านมา", "Last 7 days")}
                      </button>
                      <button onClick={() => commitDatePreset(29)} className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200">
                        {t(lang, "30 วันที่ผ่านมา", "Last 30 days")}
                      </button>
                    </div>
                  )}
                  <label className="text-[11px] text-gray-400">
                    {t(lang, "ตั้งแต่", "From")}
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="text-[11px] text-gray-400">
                    {t(lang, "ถึง", "To")}
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
              )}

              <button
                onClick={commit}
                disabled={!canCommit}
                className="mt-3 w-full rounded-lg bg-blue-600 text-white text-xs font-medium py-1.5 disabled:opacity-40"
              >
                {t(lang, "เพิ่ม", "Add")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
