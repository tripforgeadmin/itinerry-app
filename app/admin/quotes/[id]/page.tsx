import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchQuoteWithLines } from "@/lib/quotes";
import { fetchProducts, fetchEntriesForBook, fetchPriceBooks, fetchKitItems, resolveKitComponents } from "@/lib/products";
import { round2 } from "@/lib/money";
import { QUOTE_STATUS_COLOR, quoteStatusLabel, isQuoteEditable, type QuoteStatusValue } from "@/lib/quote-status";
import { formatTHB } from "@/lib/money";
import { getAdminLang } from "@/lib/admin-lang";
import { t, dateLocale } from "@/lib/i18n";
import QuoteLineEditor, { type SellableProduct } from "./QuoteLineEditor";
import QuoteStatusActions from "./QuoteStatusActions";
import QuoteHeaderEditor from "./QuoteHeaderEditor";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getAdminLang();
  const result = await fetchQuoteWithLines(id);
  if (!result) notFound();
  const { quote, lines } = result;
  const editable = isQuoteEditable(quote.status);

  const [products, entries, books, kitItems] = await Promise.all([
    fetchProducts(true),
    fetchEntriesForBook(quote.price_book_id),
    fetchPriceBooks(true),
    fetchKitItems(),
  ]);
  const book = books.find((b) => b.id === quote.price_book_id);

  // Only products with an active price in this quote's book are sellable.
  const priceByProduct = new Map(entries.filter((e) => e.active).map((e) => [e.product_id, e.unit_price]));
  const sellable: SellableProduct[] = products
    .filter((p) => priceByProduct.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      family: p.family,
      destination: p.destination,
      unit: p.unit,
      taxable: p.taxable,
      unitPrice: priceByProduct.get(p.id)!,
    }));

  // Kits: sellable when every component is priced in this book; the shown price is
  // the components' sum (display only — the server re-resolves on add).
  const kitParentIds = [...new Set(kitItems.map((k) => k.parent_product_id))];
  for (const kitId of kitParentIds) {
    const parent = products.find((p) => p.id === kitId);
    if (!parent) continue;
    const resolution = await resolveKitComponents(kitId, quote.price_book_id);
    if (!resolution.ok) continue;
    sellable.push({
      id: parent.id,
      name: parent.name,
      family: parent.family,
      destination: parent.destination,
      unit: parent.unit,
      taxable: parent.taxable,
      unitPrice: round2(resolution.components.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0)),
      isKit: true,
    });
  }

  // Linked case (for the back-link and fee-sorting by the case's destination).
  let ticketId: string | null = null;
  let caseDestination: string | null = null;
  if (quote.assessment_id) {
    const { data } = await supabase
      .from("user_assessment")
      .select("ticket_id, trip:trip_id(destination)")
      .eq("id", quote.assessment_id)
      .maybeSingle();
    ticketId = (data?.ticket_id as string) ?? null;
    const trip = data?.trip as { destination: string | null } | { destination: string | null }[] | null;
    caseDestination = (Array.isArray(trip) ? trip[0]?.destination : trip?.destination) ?? null;
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/admin/quotes" className="text-gray-400 hover:text-gray-600 text-sm">← {t(lang, "กลับ", "Back")}</Link>
          <h1 className="text-xl font-bold text-gray-800 font-mono">{quote.quote_number}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLOR[quote.status as QuoteStatusValue] ?? "bg-gray-100 text-gray-600"}`}>
            {quoteStatusLabel(quote.status, lang)}
          </span>
          <div className="flex-1" />
          <a
            href={`/api/admin/quote-pdf/${quote.id}`}
            target="_blank"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            🖨️ PDF
          </a>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-base font-bold text-gray-800">{quote.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {t(lang, "วันที่", "Date")}: {fmtDate(quote.quote_date)}
                {" · "}
                {t(lang, "ยืนราคาถึง", "Valid until")}: {fmtDate(quote.valid_until)}
                {" · "}Price book: {book?.name ?? "—"}
                {quote.credit_days !== null && <>{" · "}{t(lang, "เครดิต", "Credit")}: {quote.credit_days} {t(lang, "วัน", "days")}</>}
                {quote.sales_person && <>{" · "}{t(lang, "ผู้ขาย", "Seller")}: {quote.sales_person}</>}
              </div>
              {ticketId && (
                <div className="text-sm mt-1">
                  {t(lang, "เคส", "Case")}:{" "}
                  <Link href={`/admin/${quote.assessment_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {ticketId}
                  </Link>
                </div>
              )}
            </div>
            <QuoteStatusActions quoteId={quote.id} status={quote.status} lang={lang} />
          </div>
        </div>

        <QuoteHeaderEditor quote={quote} editable={editable} lang={lang} />

        <div className="rounded-2xl bg-white p-5 shadow-sm mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t(lang, "รายการ", "Line items")}
          </h2>
          <QuoteLineEditor
            quoteId={quote.id}
            lines={lines}
            sellable={sellable}
            editable={editable}
            caseDestination={caseDestination}
            lang={lang}
          />

          <div className="mt-4 border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t(lang, "รวมเป็นเงิน", "Subtotal")}</span>
              <span className="tabular-nums">{formatTHB(quote.subtotal)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>{t(lang, "ส่วนลด", "Discount")}</span>
                <span className="tabular-nums">−{formatTHB(quote.discount_amount)}</span>
              </div>
            )}
            {quote.vat_rate > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>
                  {t(lang, `ภาษีมูลค่าเพิ่ม ${quote.vat_rate}%`, `VAT ${quote.vat_rate}%`)}
                  {lines.some((l) => !l.taxable) && (
                    <span className="text-[11px] text-gray-400"> ({t(lang, "เฉพาะค่าบริการ", "services only")})</span>
                  )}
                </span>
                <span className="tabular-nums">{formatTHB(quote.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
              <span>{t(lang, "รวมทั้งสิ้น", "Grand total")}</span>
              <span className="tabular-nums">{formatTHB(quote.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
