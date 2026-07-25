import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchPriceBooks } from "@/lib/products";
import { displayName, type NameFields } from "@/lib/account-name";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";
import NewQuoteForm from "./NewQuoteForm";

export const dynamic = "force-dynamic";

interface Prefill {
  assessmentId: string;
  accountId: string | null;
  ticketId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  destination: string | null;
}

/** Prefill the customer snapshot from a case (?assessment=<id>). */
async function loadPrefill(assessmentId: string): Promise<Prefill | null> {
  const { data } = await supabase
    .from("user_assessment")
    .select(
      "id, ticket_id, account_id, account:account_id(nickname, full_name, first_name, last_name, phone, phone_country_code, email), trip:trip_id(destination)"
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!data) return null;
  // PostgREST embeds come back object-or-array depending on the relationship shape.
  const one = <T,>(v: unknown): T | null => ((Array.isArray(v) ? v[0] : v) ?? null) as T | null;
  const account = one<NameFields & { phone: string | null; phone_country_code: string | null; email: string | null }>(data.account);
  const trip = one<{ destination: string | null }>(data.trip);
  const name = displayName(account);
  return {
    assessmentId: data.id as string,
    accountId: (data.account_id as string) ?? null,
    ticketId: (data.ticket_id as string) ?? null,
    customerName: name === "—" ? "" : name,
    customerPhone: account?.phone ? `${account.phone_country_code ?? ""}${account.phone}` : "",
    customerEmail: account?.email ?? "",
    destination: trip?.destination ?? null,
  };
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const lang = await getAdminLang();
  const { assessment } = await searchParams;
  const [books, prefill] = await Promise.all([
    fetchPriceBooks(true),
    assessment ? loadPrefill(assessment) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/quotes" className="text-gray-400 hover:text-gray-600 text-sm">← {t(lang, "กลับ", "Back")}</Link>
          <h1 className="text-xl font-bold text-gray-800">{t(lang, "สร้างใบเสนอราคา", "New quote")}</h1>
        </div>
        {prefill?.ticketId && (
          <p className="text-sm text-gray-500 mb-4">
            {t(lang, "ผูกกับเคส", "Linked to case")}{" "}
            <span className="font-mono text-xs">{prefill.ticketId}</span>
          </p>
        )}
        <NewQuoteForm books={books} prefill={prefill} lang={lang} />
      </div>
    </main>
  );
}
