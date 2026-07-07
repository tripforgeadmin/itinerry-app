import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AdminTable from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data, error } = await supabase
    .from("user_assessment")
    .select(
      "id, ticket_id, created_at, due_date, status, contact_preference, intent, savings_balance, account:account_id(nickname, full_name, first_name, last_name, line_display_name, phone, phone_country_code, is_friend), trip:trip_id(visa_type, destination, travel_arrival, study_start), visa_evaluation(pass, strengths, improvements)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  const submissions = (data ?? []).map((r) => {
    const account = (Array.isArray(r.account) ? r.account[0] : r.account) ?? null;
    const trip = (Array.isArray(r.trip) ? r.trip[0] : r.trip) ?? null;
    const ev = (Array.isArray(r.visa_evaluation) ? r.visa_evaluation[0] : r.visa_evaluation) ?? null;
    return {
      id: r.id,
      ticket_id: r.ticket_id,
      created_at: r.created_at,
      due_date: r.due_date,
      status: r.status,
      contact_preference: r.contact_preference,
      intent: r.intent,
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/lost-reasons" className="text-sm font-medium text-blue-600 hover:text-blue-800">🏷️ เหตุผลปิดดีล</Link>
            <Link href="/admin/holidays" className="text-sm font-medium text-blue-600 hover:text-blue-800">📅 วันหยุด</Link>
            <span className="text-sm text-gray-500">{submissions?.length ?? 0} รายการ</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AdminTable rows={(submissions ?? []) as any[]} />
        </div>
      </div>
    </main>
  );
}
