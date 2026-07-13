import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AdminTable from "./AdminTable";
import AdminLangToggle from "./AdminLangToggle";
import { SLA_STAGE_HOURS_KEY, parseStageHours } from "@/lib/sla";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const lang = await getAdminLang();
  const [{ data, error }, { data: slaCfg }] = await Promise.all([
    supabase
      .from("user_assessment")
      .select(
        "id, ticket_id, created_at, due_date, status, contact_preference, intent, savings_balance, result_sent_at, entry_source, status_history(changed_at), account:account_id(nickname, full_name, first_name, last_name, line_display_name, phone, phone_country_code, is_friend, source), trip:trip_id(visa_type, destination, travel_arrival, study_start), visa_evaluation(pass, strengths, improvements)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("app_config").select("value").eq("key", SLA_STAGE_HOURS_KEY).maybeSingle(),
  ]);

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  const slaStageHours = parseStageHours(slaCfg?.value as string | undefined);

  const submissions = (data ?? []).map((r) => {
    const account = (Array.isArray(r.account) ? r.account[0] : r.account) ?? null;
    const trip = (Array.isArray(r.trip) ? r.trip[0] : r.trip) ?? null;
    const ev = (Array.isArray(r.visa_evaluation) ? r.visa_evaluation[0] : r.visa_evaluation) ?? null;
    // When the case entered its current status = the latest status_history transition.
    // Falls back to created_at for pending_review (submit inserts no initial history row).
    const history = (Array.isArray(r.status_history) ? r.status_history : []) as { changed_at: string }[];
    const lastChanged = history.reduce<string | null>(
      (max, h) => (max && max >= h.changed_at ? max : h.changed_at),
      null
    );
    return {
      id: r.id,
      ticket_id: r.ticket_id,
      created_at: r.created_at,
      due_date: r.due_date,
      status: r.status,
      contact_preference: r.contact_preference,
      intent: r.intent,
      result_sent_at: r.result_sent_at,
      entry_source: r.entry_source,
      status_entered_at: lastChanged ?? r.created_at,
      account,
      trip,
      // healthcheck card is built from the evaluator's lists — printable only when both exist
      printable:
        ev?.pass != null &&
        Array.isArray(ev?.strengths) && ev.strengths.length > 0 &&
        Array.isArray(ev?.improvements) && ev.improvements.length > 0,
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800">📊 Dashboard</Link>
            <Link href="/admin/sla" className="text-sm font-medium text-blue-600 hover:text-blue-800">⏱️ SLA</Link>
            <Link href="/admin/lost-reasons" className="text-sm font-medium text-blue-600 hover:text-blue-800">🏷️ {t(lang, "เหตุผลปิดดีล", "Lost reasons")}</Link>
            <Link href="/admin/holidays" className="text-sm font-medium text-blue-600 hover:text-blue-800">📅 {t(lang, "วันหยุด", "Holidays")}</Link>
            <Link href="/admin/manual-case" className="text-sm font-medium text-blue-600 hover:text-blue-800">✍️ {t(lang, "เพิ่มเคสด้วยตนเอง", "New manual case")}</Link>
            <span className="text-sm text-gray-500">{submissions?.length ?? 0} {t(lang, "รายการ", "items")}</span>
            <AdminLangToggle lang={lang} />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AdminTable rows={(submissions ?? []) as any[]} slaStageHours={slaStageHours} lang={lang} />
        </div>
      </div>
    </main>
  );
}
