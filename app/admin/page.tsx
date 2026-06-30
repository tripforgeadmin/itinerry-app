import { supabase } from "@/lib/supabase";
import AdminTable from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data, error } = await supabase
    .from("user_assessment")
    .select(
      "id, created_at, status, contact_preference, savings_balance, account:account_id(full_name, line_display_name, phone, is_friend), trip:trip_id(visa_type, destination)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  const submissions = (data ?? []).map((r) => {
    const account = (Array.isArray(r.account) ? r.account[0] : r.account) ?? null;
    const trip = (Array.isArray(r.trip) ? r.trip[0] : r.trip) ?? null;
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      contact_preference: r.contact_preference,
      account,
      trip,
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
          <span className="text-sm text-gray-500">{submissions?.length ?? 0} รายการ</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <AdminTable rows={(submissions ?? []) as any[]} />
        </div>
      </div>
    </main>
  );
}
