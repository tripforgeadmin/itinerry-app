import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AdminTable from "./AdminTable";
import AdminLangToggle from "./AdminLangToggle";
import { SLA_STAGE_HOURS_KEY, parseStageHours } from "@/lib/sla";
import { fetchCases } from "@/lib/cases";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const lang = await getAdminLang();
  // Case-list query lives in lib/cases.ts (shared with the MCP search_cases tool).
  const [{ rows: submissions, error }, { data: slaCfg }] = await Promise.all([
    fetchCases(),
    supabase.from("app_config").select("value").eq("key", SLA_STAGE_HOURS_KEY).maybeSingle(),
  ]);

  if (error) {
    console.error("case list error:", error);
    return <div className="p-8 text-red-500">{t(lang, "โหลดข้อมูลไม่สำเร็จ", "Failed to load cases")}</div>;
  }

  const slaStageHours = parseStageHours(slaCfg?.value as string | undefined);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Submissions</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/today" className="text-sm font-medium text-blue-600 hover:text-blue-800">🗓️ {t(lang, "งานวันนี้", "Today's tasks")}</Link>
            <Link href="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800">📊 Dashboard</Link>
            <Link href="/admin/sla" className="text-sm font-medium text-blue-600 hover:text-blue-800">⏱️ SLA</Link>
            <Link href="/admin/quotes" className="text-sm font-medium text-blue-600 hover:text-blue-800">🧾 {t(lang, "ใบเสนอราคา", "Quotes")}</Link>
            <Link href="/admin/products" className="text-sm font-medium text-blue-600 hover:text-blue-800">📦 {t(lang, "สินค้า/ราคา", "Products")}</Link>
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
