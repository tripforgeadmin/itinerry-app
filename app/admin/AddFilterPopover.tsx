"use client";

import { useEffect, useRef, useState } from "react";
import { STATUS_OPTIONS, type StatusValue } from "@/lib/status";
import { SOURCE_OPTIONS, newConditionId, type FilterCondition, type FilterField } from "@/lib/admin-filters";

// Presentation-only grouping for the popover's status checklist — NOT the same concept
// as lib/status.ts's isClosed()/CLOSED_STATUSES (which drives SLA-clock-stops-here logic
// and deliberately excludes out_of_scope/human_error). Keep these separate so editing one
// never silently changes the other's behavior.
const OPEN_STATUSES: StatusValue[] = ["pending_review", "evaluated", "contacted", "pending_decision"];
const CLOSED_STATUSES_UI: StatusValue[] = ["win", "lost", "out_of_scope", "human_error"];

const FIELDS: { field: FilterField; label: string }[] = [
  { field: "status", label: "สถานะ" },
  { field: "source", label: "แหล่งที่มา" },
  { field: "date", label: "วันที่ส่ง" },
];

export default function AddFilterPopover({ onAdd }: { onAdd: (c: FilterCondition) => void }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterField | null>(null);
  const [statusValue, setStatusValue] = useState<StatusValue[]>([]);
  const [sourceValue, setSourceValue] = useState<string[]>([]);
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
    setSourceValue([]);
    setDateFrom("");
    setDateTo("");
  }

  function commit() {
    if (field === "status" && statusValue.length > 0) {
      onAdd({ id: newConditionId(), field: "status", operator: "is_any_of", value: statusValue });
    } else if (field === "source" && sourceValue.length > 0) {
      onAdd({ id: newConditionId(), field: "source", operator: "is_any_of", value: sourceValue });
    } else if (field === "date" && (dateFrom || dateTo)) {
      onAdd({ id: newConditionId(), field: "date", operator: "is_between", value: [dateFrom || null, dateTo || null] });
    }
    close();
  }

  const canCommit =
    (field === "status" && statusValue.length > 0) ||
    (field === "source" && sourceValue.length > 0) ||
    (field === "date" && (dateFrom || dateTo));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
      >
        ＋ เพิ่มตัวกรอง
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[260px]">
          {!field ? (
            <div className="flex flex-col gap-1">
              {FIELDS.map((f) => (
                <button
                  key={f.field}
                  onClick={() => setField(f.field)}
                  className="text-left px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setField(null)}
                className="text-[11px] text-gray-400 hover:text-gray-600 mb-2"
              >
                ← กลับ
              </button>

              {field === "status" && (
                <div>
                  <div className="flex gap-2 mb-1.5 text-[11px]">
                    <button
                      onClick={() => setStatusValue(STATUS_OPTIONS.map((o) => o.value))}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setStatusValue([])} className="text-blue-500 hover:text-blue-700">
                      ล้างทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                    {[
                      { title: "เปิดอยู่", group: OPEN_STATUSES },
                      { title: "ปิดแล้ว", group: CLOSED_STATUSES_UI },
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
                            เลือกกลุ่มนี้
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
                              <span className={`px-1.5 py-0.5 rounded ${opt.color}`}>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {field === "source" && (
                <div className="flex flex-col gap-1 max-h-56 overflow-auto">
                  {SOURCE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={sourceValue.includes(opt.value)}
                        onChange={(e) =>
                          setSourceValue((prev) =>
                            e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value)
                          )
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}

              {field === "date" && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-gray-400">
                    ตั้งแต่
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="text-[11px] text-gray-400">
                    ถึง
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
                เพิ่ม
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
