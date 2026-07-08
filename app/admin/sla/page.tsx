import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SLA_STAGE_HOURS_KEY, parseStageHours } from "@/lib/sla";
import SlaManager from "./SlaManager";

export const dynamic = "force-dynamic";

export default async function SlaAdminPage() {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", SLA_STAGE_HOURS_KEY)
    .maybeSingle();
  const stageHours = parseStageHours(data?.value as string | undefined);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">SLA เวลาค้างแต่ละสถานะ</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          กำหนดว่าเคสค้างในแต่ละสถานะได้นานกี่ชั่วโมงก่อนขึ้นป้าย “⏳ ค้าง…” สีส้มในหน้า Submissions —
          ไว้เตือนให้ติดตามก่อนดีลจะเงียบหาย (คนละอย่างกับแถวแดง = เลยกำหนดส่งผล 24 ชม.) ตั้ง 0 = ปิดการเตือนของสถานะนั้น
        </p>
        <SlaManager initial={stageHours} />
      </div>
    </main>
  );
}
