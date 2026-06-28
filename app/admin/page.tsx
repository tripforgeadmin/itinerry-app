import { supabase } from "@/lib/supabase";
import AdminTable from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { data: submissions, error } = await supabase
    .from("visa_assessments")
    .select("id, created_at, full_name, line_display_name, visa_type, destination, occupation, is_friend, status, phone, contact_preference, savings_balance")
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

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
