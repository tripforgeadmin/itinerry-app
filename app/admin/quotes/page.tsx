import Link from "next/link";
import { fetchQuotes } from "@/lib/quotes";
import { QUOTE_STATUS_OPTIONS, QUOTE_STATUS_COLOR, quoteStatusLabel, VALID_QUOTE_STATUSES, type QuoteStatusValue } from "@/lib/quote-status";
import { formatTHB } from "@/lib/money";
import { getAdminLang } from "@/lib/admin-lang";
import { t, dateLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const lang = await getAdminLang();
  const { status } = await searchParams;
  const filter = status && VALID_QUOTE_STATUSES.includes(status) ? status : undefined;
  const quotes = await fetchQuotes({ status: filter });

  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "2-digit" }) : "—";

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← {t(lang, "กลับ", "Back")}</Link>
          <h1 className="text-xl font-bold text-gray-800">🧾 {t(lang, "ใบเสนอราคา", "Quotes")}</h1>
          <div className="flex-1" />
          <Link
            href="/admin/quotes/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            ＋ {t(lang, "สร้างใบเสนอราคา", "New quote")}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href="/admin/quotes"
            className={`rounded-full px-3 py-1 text-xs font-medium ${!filter ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            {t(lang, "ทั้งหมด", "All")}
          </Link>
          {QUOTE_STATUS_OPTIONS.map((s) => (
            <Link
              key={s.value}
              href={`/admin/quotes?status=${s.value}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s.value ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
            >
              {quoteStatusLabel(s.value, lang)}
            </Link>
          ))}
        </div>

        <div className="rounded-2xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 uppercase border-b border-gray-100">
                <th className="px-4 py-3">{t(lang, "เลขที่", "Number")}</th>
                <th className="px-4 py-3">{t(lang, "หัวเรื่อง", "Subject")}</th>
                <th className="px-4 py-3">{t(lang, "ลูกค้า", "Customer")}</th>
                <th className="px-4 py-3">{t(lang, "สถานะ", "Status")}</th>
                <th className="px-4 py-3 text-right">{t(lang, "ยอดรวม", "Total")}</th>
                <th className="px-4 py-3">{t(lang, "ยืนราคาถึง", "Valid until")}</th>
                <th className="px-4 py-3">{t(lang, "เคส", "Case")}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    {t(lang, "ยังไม่มีใบเสนอราคา", "No quotes yet")}
                  </td>
                </tr>
              )}
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/admin/quotes/${q.id}`} className="text-blue-600 hover:underline">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-56 truncate">{q.name}</td>
                  <td className="px-4 py-3 text-gray-600">{q.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${QUOTE_STATUS_COLOR[q.status as QuoteStatusValue] ?? "bg-gray-100 text-gray-600"}`}>
                      {quoteStatusLabel(q.status, lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 tabular-nums">
                    {formatTHB(q.grand_total)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(q.valid_until)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {q.assessment_id && q.ticket_id ? (
                      <Link href={`/admin/${q.assessment_id}`} className="text-blue-600 hover:underline">
                        {q.ticket_id}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
