"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STATUS_OPTIONS, STATUS_COLOR, statusLabel, isOverdue, type StatusValue } from "@/lib/status";
import { staleBadge, DEFAULT_STAGE_HOURS } from "@/lib/sla";
import { label } from "@/lib/answer-labels";
import { t, dateLocale, type Lang } from "@/lib/i18n";
import { displayName } from "@/lib/account-name";
import { formatPhone } from "@/lib/dialCodes";
import { applyConditions, newConditionId, type FilterCondition } from "@/lib/admin-filters";
import FilterBar from "./FilterBar";

const INTENT_SHORT: Record<string, string> = { explore: "ศึกษา", ready: "พร้อม", execute: "เร่งด่วน" };
const INTENT_SHORT_EN: Record<string, string> = { explore: "Explore", ready: "Ready", execute: "Urgent" };
const intentShort = (v: string, lang: Lang) => (lang === "en" ? INTENT_SHORT_EN[v] : INTENT_SHORT[v]) ?? v;
const INTENT_RANK: Record<string, number> = { explore: 0, ready: 1, execute: 2 };
const STATUS_RANK: Record<string, number> = Object.fromEntries(STATUS_OPTIONS.map((o, i) => [o.value, i]));

const PAGE_SIZES = [25, 50, 75, 100, "all"] as const;
type PageSize = (typeof PAGE_SIZES)[number];

type Account = {
  nickname: string | null; full_name: string | null; first_name: string | null; last_name: string | null;
  line_display_name: string | null; phone: string | null; phone_country_code: string | null; is_friend: boolean | null;
  source: string | null;
};
type Trip = { visa_type: string; destination: string; travel_arrival: string | null; study_start: string | null };

type Row = {
  id: string;
  ticket_id: string | null;
  created_at: string;
  due_date: string | null;
  status: string;
  contact_preference: string;
  intent: string | null;
  result_sent_at: string | null;
  status_entered_at: string | null;
  account: Account | null;
  trip: Trip | null;
  printable: boolean;
};

/** Days between today and the trip's arrival (or study start). null when no date on file. */
function daysToTravel(trip: Trip | null, todayIso: string): number | null {
  const iso = (trip?.travel_arrival ?? trip?.study_start)?.slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

type SortKey =
  | "ticket" | "date" | "due" | "name" | "line" | "visa" | "dest" | "intent" | "days" | "phone" | "contact" | "friend" | "status";
type SortEntry = { key: SortKey; dir: "asc" | "desc" };

export default function AdminTable({
  rows,
  slaStageHours = DEFAULT_STAGE_HOURS,
  lang = "th",
}: {
  rows: Row[];
  slaStageHours?: Record<string, number>;
  lang?: Lang;
}) {
  const router = useRouter();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortEntry[]>([{ key: "date", dir: "desc" }]);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  // Default page size: a single "รอประเมิน" status filter shows 100 (matches the old
  // one-click pill habit), everything else shows 25.
  useEffect(() => {
    const soleStatus =
      conditions.length === 1 && conditions[0].field === "status" ? conditions[0].value : null;
    setPageSize(soleStatus?.length === 1 && soleStatus[0] === "pending_review" ? 100 : 25);
  }, [conditions]);
  // any change to what's shown resets to the first page
  useEffect(() => {
    setPage(1);
  }, [conditions, search, sort, pageSize]);

  function addCondition(c: FilterCondition) {
    setConditions((prev) => [...prev, c]);
  }
  function removeCondition(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }
  function applySavedFilter(saved: FilterCondition[]) {
    setConditions(saved.map((c) => ({ ...c, id: c.id || newConditionId() })));
  }

  // Quick status pills — a shorthand for "add/replace/remove a single-value status
  // condition", so they compose with everything else in `conditions` (source/date
  // filters, saved filters) instead of being a second, disconnected filter mechanism.
  const soleStatusCondition = conditions.find((c) => c.field === "status");
  const activeStatusValue =
    soleStatusCondition?.field === "status" && soleStatusCondition.value.length === 1
      ? soleStatusCondition.value[0]
      : null;

  function clickStatusPill(value: StatusValue) {
    setConditions((prev) => {
      const withoutStatus = prev.filter((c) => c.field !== "status");
      if (activeStatusValue === value) return withoutStatus; // toggle off
      return [...withoutStatus, { id: newConditionId(), field: "status", operator: "is_any_of", value: [value] }];
    });
  }
  function clickAllPill() {
    setConditions((prev) => prev.filter((c) => c.field !== "status"));
  }

  // Ticket ID / ชื่อเล่น / LINE display name / phone (digit-only match, so dashes/spaces
  // don't matter). Runs before the status pill filter — search narrows within any status.
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, "");
    return rows.filter((r) => {
      const acc = r.account;
      const haystacks = [r.ticket_id ?? "", displayName(acc), acc?.line_display_name ?? ""];
      if (haystacks.some((h) => h.toLowerCase().includes(q))) return true;
      if (qDigits && (acc?.phone ?? "").replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    });
  }, [rows, search]);

  const sortValue = useMemo(() => {
    const v: Record<SortKey, (r: Row) => string | number> = {
      ticket: (r) => r.ticket_id ?? "",
      date: (r) => Date.parse(r.created_at) || 0,
      due: (r) => (r.due_date ? Date.parse(r.due_date) : Number.POSITIVE_INFINITY),
      name: (r) => displayName(r.account).toLowerCase(),
      line: (r) => (r.account?.line_display_name ?? "").toLowerCase(),
      visa: (r) => r.trip?.visa_type ?? "",
      dest: (r) => r.trip?.destination ?? "",
      intent: (r) => (r.intent ? INTENT_RANK[r.intent] ?? -1 : -1),
      days: (r) => daysToTravel(r.trip, todayIso) ?? Number.POSITIVE_INFINITY,
      phone: (r) => r.account?.phone ?? "",
      contact: (r) => r.contact_preference ?? "",
      friend: (r) => (r.account?.is_friend === true ? 2 : r.account?.is_friend === false ? 1 : 0),
      status: (r) => STATUS_RANK[r.status] ?? 99,
    };
    return v;
  }, [todayIso]);

  const filtered = applyConditions(searchFiltered, conditions);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      for (const { key, dir } of sort) {
        const va = sortValue[key](a);
        const vb = sortValue[key](b);
        const c = va < vb ? -1 : va > vb ? 1 : 0;
        if (c !== 0) return dir === "asc" ? c : -c;
      }
      return 0;
    });
    return arr;
  }, [filtered, sort, sortValue]);

  const total = sorted.length;
  const size = pageSize === "all" ? total || 1 : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  const visible = pageSize === "all" ? sorted : sorted.slice((current - 1) * size, current * size);

  function toggleSort(key: SortKey, additive: boolean) {
    setSort((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      if (additive) {
        if (idx === -1) return [...prev, { key, dir: "asc" }];
        const next = [...prev];
        next[idx] = { key, dir: next[idx].dir === "asc" ? "desc" : "asc" };
        return next;
      }
      if (prev.length === 1 && idx === 0) return [{ key, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
      return [{ key, dir: "asc" }];
    });
  }

  function sortIndicator(key: SortKey) {
    const idx = sort.findIndex((e) => e.key === key);
    if (idx === -1) return <span className="ml-1 text-gray-300">⇅</span>;
    return (
      <span className="ml-1 text-blue-500">
        {sort[idx].dir === "asc" ? "▲" : "▼"}
        {sort.length > 1 && <span className="text-[9px] align-super">{idx + 1}</span>}
      </span>
    );
  }

  const columns: { key: SortKey | null; label: string; align?: "center" }[] = [
    { key: "ticket", label: "Ticket ID" },
    { key: "date", label: t(lang, "วันที่ส่ง", "Submitted") },
    { key: "due", label: t(lang, "กำหนด", "Due Date") },
    { key: "name", label: t(lang, "ชื่อเล่น", "Nickname") },
    { key: "line", label: "LINE" },
    { key: "visa", label: t(lang, "วีซ่า", "Visa") },
    { key: "dest", label: t(lang, "ปลายทาง", "Destination") },
    { key: "intent", label: t(lang, "ความต้องการ", "Intent") },
    { key: "days", label: t(lang, "เหลือ", "Days left") },
    { key: "phone", label: t(lang, "โทร", "Phone") },
    { key: "contact", label: t(lang, "ติดต่อ", "Contact") },
    { key: "friend", label: t(lang, "เพื่อน", "Friend"), align: "center" },
    { key: "status", label: t(lang, "สถานะ", "Status") },
    { key: null, label: t(lang, "ผลประเมิน", "Report"), align: "center" },
  ];

  return (
    <div className="w-full">
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(lang, "ค้นหา: Ticket ID, ชื่อเล่น, LINE, เบอร์โทร…", "Search: Ticket ID, nickname, LINE, phone…")}
          className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            aria-label={t(lang, "ล้างการค้นหา", "Clear search")}
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={clickAllPill}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
            activeStatusValue === null ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {t(lang, "ทั้งหมด", "All")} ({searchFiltered.length})
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => clickStatusPill(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${opt.color} ${
              activeStatusValue === opt.value ? "" : "opacity-50"
            }`}
          >
            {statusLabel(opt.value, lang)} ({searchFiltered.filter((s) => s.status === opt.value).length})
          </button>
        ))}
      </div>
      <FilterBar
        conditions={conditions}
        onAdd={addCondition}
        onRemove={removeCondition}
        onApplySaved={applySavedFilter}
        lang={lang}
      />

      <p className="mb-2 text-[11px] text-gray-400">{t(lang, "คลิกหัวคอลัมน์เพื่อเรียง · Shift-คลิกเพื่อเรียงหลายชั้น", "Click a header to sort · Shift-click for multi-sort")}</p>

      <div
        className="w-full overflow-x-auto overflow-y-auto rounded-xl border border-gray-100"
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        <table className="w-full min-w-[1400px] text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 whitespace-nowrap bg-white ${col.align === "center" ? "text-center" : ""} ${
                    col.key ? "cursor-pointer select-none hover:text-gray-800" : ""
                  }`}
                  onClick={col.key ? (e) => toggleSort(col.key as SortKey, e.shiftKey) : undefined}
                >
                  {col.label}
                  {col.key && sortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const acc = s.account;
              const trip = s.trip;
              const overdue = isOverdue(s.created_at, s.status, s.due_date, s.result_sent_at);
              const days = daysToTravel(trip, todayIso);
              return (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/${s.id}`)}
                  className={`border-b border-gray-50 transition-colors cursor-pointer ${
                    overdue ? "bg-red-100 hover:bg-red-200" : "hover:bg-blue-50"
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-medium text-gray-700">{s.ticket_id ?? "—"}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "text-red-700 font-semibold" : "text-gray-500"}`}>
                    {new Date(s.created_at).toLocaleDateString(dateLocale(lang), {
                      timeZone: "Asia/Bangkok",
                      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "text-red-700 font-semibold" : "text-gray-500"}`}>
                    {s.due_date
                      ? new Date(s.due_date).toLocaleDateString(dateLocale(lang), {
                          timeZone: "Asia/Bangkok",
                          day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{displayName(acc)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{acc?.line_display_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                      {trip ? label("visa_type", trip.visa_type, lang) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 uppercase whitespace-nowrap">{trip?.destination ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.intent ? intentShort(s.intent, lang) : "—"}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${
                    days == null ? "text-gray-300" : days < 30 ? "text-red-600 font-semibold" : days < 45 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    {days == null ? "—" : `${days} ${t(lang, "วัน", "d")}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{acc?.phone ? formatPhone(acc.phone_country_code ?? "+66", acc.phone) : "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {s.contact_preference === "line" ? "💬 LINE" : s.contact_preference === "call" ? t(lang, "📞 โทร", "📞 Call") : s.contact_preference}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc?.is_friend === true ? "✅" : acc?.is_friend === false ? "❌" : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[s.status as StatusValue] ?? ""}`}>
                        {statusLabel(s.status, lang)}
                      </span>
                      {(() => {
                        const stale = staleBadge(s.status, s.status_entered_at, slaStageHours, lang);
                        return stale ? (
                          <span
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700"
                            title={t(lang, "ค้างในสถานะนี้เกิน SLA ที่ตั้งไว้", "Idle in this status past the SLA")}
                          >
                            ⏳ {stale}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.printable ? (
                      <a
                        href={`/admin/healthcheck/${s.id}`}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block rounded-lg border border-gray-200 px-2 py-1 text-sm hover:border-blue-400"
                        title={t(lang, "พิมพ์รายงานสุขภาพวีซ่า (ฉบับลูกค้า)", "Print the visa health-check report (customer copy)")}
                      >
                        🖨️
                      </a>
                    ) : (
                      <span className="cursor-default text-sm opacity-25" title={t(lang, "ยังไม่พร้อม — ต้องประเมิน + กรอกจุดแข็ง/จุดเสริมก่อน", "Not ready — evaluate + fill strengths/improvements first")}>
                        🖨️
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total === 0 && <div className="text-center py-12 text-gray-400">{t(lang, "ยังไม่มี submission", "No submissions yet")}</div>}
      </div>

      {/* pagination */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span>{t(lang, "แสดง", "Show")}</span>
          {PAGE_SIZES.map((ps) => (
            <button
              key={ps}
              onClick={() => setPageSize(ps)}
              className={`rounded-md px-2 py-1 font-medium ${
                pageSize === ps ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ps === "all" ? t(lang, "ทั้งหมด", "All") : ps}
            </button>
          ))}
        </div>

        <span className="text-gray-400">
          {total === 0 ? "0" : `${(current - 1) * size + 1}–${Math.min(current * size, total)}`} {t(lang, "จาก", "of")} {total}
        </span>

        {pageSize !== "all" && pageCount > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="rounded-md border border-gray-200 px-2 py-1 disabled:opacity-30"
            >
              ‹
            </button>
            <span className="px-2">{t(lang, "หน้า", "Page")} {current}/{pageCount}</span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={current >= pageCount}
              className="rounded-md border border-gray-200 px-2 py-1 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
