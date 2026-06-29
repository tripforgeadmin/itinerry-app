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

  // Flatten the normalized join into the flat row shape AdminTable expects.
  const submissions = (data ?? []).map((r) => {
    const account = (Array.isArray(r.account) ? r.account[0] : r.account) ?? {};
    const trip = (Array.isArray(r.trip) ? r.trip[0] : r.trip) ?? {};
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      contact_preference: r.contact_preference,
      savings_balance: r.savings_balance,
      full_name: account.full_name ?? "",
      line_display_name: account.line_display_name ?? null,
      phone: account.phone ?? "",
      is_friend: account.is_friend ?? null,
      visa_type: trip.visa_type ?? "",
      destination: trip.destination ?? "",
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
          <AdminTable rows={submissions ?? []} />
        </div>
      </div>
    </main>
  );
}
