"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STATUS_OPTIONS, STATUS_LABEL, STATUS_COLOR, isOverdue, type StatusValue } from "@/lib/status";
import { staleBadge, DEFAULT_STAGE_HOURS } from "@/lib/sla";
import { displayName } from "@/lib/account-name";
import { formatPhone } from "@/lib/dialCodes";

const VISA_LABEL: Record<string, string> = {
  tourist: "ท่องเที่ยว", visitor: "เยี่ยมเยียน", business: "ธุรกิจ", student: "นักเรียน",
};
const INTENT_SHORT: Record<string, string> = { explore: "ศึกษา", ready: "พร้อม", execute: "เร่งด่วน" };
const INTENT_RANK: Record<string, number> = { explore: 0, ready: 1, execute: 2 };
const STATUS_RANK: Record<string, number> = Object.fromEntries(STATUS_OPTIONS.map((o, i) => [o.value, i]));

const PAGE_SIZES = [25, 50, 75, 100, "all"] as const;
type PageSize = (typeof PAGE_SIZES)[number];

type Account = {
  nickname: string | null; full_name: string | null; first_name: string | null; last_name: string | null;
  line_display_name: string | null; phone: string | null; phone_country_code: string | null; is_friend: boolean | null;
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
}: {
  rows: Row[];
  slaStageHours?: Record<string, number>;
}) {
  const router = useRouter();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [filter, setFilter] = useState<StatusValue | "all">("all");
  const [sort, setSort] = useState<SortEntry[]>([{ key: "date", dir: "desc" }]);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  // per-filter default page size: รอประเมิน shows 100, everything else 25
  useEffect(() => {
    setPageSize(filter === "pending_review" ? 100 : 25);
  }, [filter]);
  // any change to what's shown resets to the first page
  useEffect(() => {
    setPage(1);
  }, [filter, sort, pageSize]);

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

  const filtered = filter === "all" ? rows : rows.filter((s) => s.status === filter);

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
    if (idx === -1) return null;
    return (
      <span className="ml-1 text-blue-500">
        {sort[idx].dir === "asc" ? "▲" : "▼"}
        {sort.length > 1 && <span className="text-[9px] align-super">{idx + 1}</span>}
      </span>
    );
  }

  const columns: { key: SortKey | null; label: string; align?: "center" }[] = [
    { key: "ticket", label: "Ticket ID" },
    { key: "date", label: "Submitted Date" },
    { key: "due", label: "Due Date" },
    { key: "name", label: "ชื่อเล่น" },
    { key: "line", label: "LINE" },
    { key: "visa", label: "วีซ่า" },
    { key: "dest", label: "ปลายทาง" },
    { key: "intent", label: "ความต้องการ" },
    { key: "days", label: "เหลือ" },
    { key: "phone", label: "โทร" },
    { key: "contact", label: "ติดต่อ" },
    { key: "friend", label: "เพื่อน", align: "center" },
    { key: "status", label: "สถานะ" },
    { key: null, label: "ผลประเมิน", align: "center" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
            filter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          ทั้งหมด ({rows.length})
        </button>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${opt.color} ${
              filter === opt.value ? "" : "opacity-50"
            }`}
          >
            {opt.label} ({rows.filter((s) => s.status === opt.value).length})
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] text-gray-400">คลิกหัวคอลัมน์เพื่อเรียง · Shift-คลิกเพื่อเรียงหลายชั้น</p>

      <div className="overflow-auto rounded-xl border border-gray-100" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <table className="w-full text-sm">
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
                    {new Date(s.created_at).toLocaleDateString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "text-red-700 font-semibold" : "text-gray-500"}`}>
                    {s.due_date
                      ? new Date(s.due_date).toLocaleDateString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{displayName(acc)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{acc?.line_display_name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                      {trip ? (VISA_LABEL[trip.visa_type] ?? trip.visa_type) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 uppercase whitespace-nowrap">{trip?.destination ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.intent ? INTENT_SHORT[s.intent] ?? s.intent : "—"}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${
                    days == null ? "text-gray-300" : days < 30 ? "text-red-600 font-semibold" : days < 45 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    {days == null ? "—" : `${days} วัน`}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{acc?.phone ? formatPhone(acc.phone_country_code ?? "+66", acc.phone) : "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {s.contact_preference === "line" ? "💬 LINE" : s.contact_preference === "call" ? "📞 โทร" : s.contact_preference}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc?.is_friend === true ? "✅" : acc?.is_friend === false ? "❌" : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[s.status as StatusValue] ?? ""}`}>
                        {STATUS_LABEL[s.status as StatusValue] ?? s.status}
                      </span>
                      {(() => {
                        const stale = staleBadge(s.status, s.status_entered_at, slaStageHours);
                        return stale ? (
                          <span
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700"
                            title="ค้างในสถานะนี้เกิน SLA ที่ตั้งไว้"
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
                        title="พิมพ์รายงานสุขภาพวีซ่า (ฉบับลูกค้า)"
                      >
                        🖨️
                      </a>
                    ) : (
                      <span className="cursor-default text-sm opacity-25" title="ยังไม่พร้อม — ต้องประเมิน + กรอกจุดแข็ง/จุดเสริมก่อน">
                        🖨️
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {total === 0 && <div className="text-center py-12 text-gray-400">ยังไม่มี submission</div>}
      </div>

      {/* pagination */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span>แสดง</span>
          {PAGE_SIZES.map((ps) => (
            <button
              key={ps}
              onClick={() => setPageSize(ps)}
              className={`rounded-md px-2 py-1 font-medium ${
                pageSize === ps ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ps === "all" ? "ทั้งหมด" : ps}
            </button>
          ))}
        </div>

        <span className="text-gray-400">
          {total === 0 ? "0" : `${(current - 1) * size + 1}–${Math.min(current * size, total)}`} จาก {total}
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
            <span className="px-2">หน้า {current}/{pageCount}</span>
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
