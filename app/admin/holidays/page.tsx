import { supabase } from "@/lib/supabase";
import Link from "next/link";
import HolidayManager from "./HolidayManager";

export const dynamic = "force-dynamic";

export default async function HolidaysAdminPage() {
  const [{ data: hol }, { data: cfg }] = await Promise.all([
    supabase.from("holiday").select("holiday_date, name").order("holiday_date"),
    supabase.from("app_config").select("value").eq("key", "callback_weekly_off").maybeSingle(),
  ]);
  let weeklyOff: number[] = [0];
  try {
    const parsed = cfg?.value ? JSON.parse(cfg.value as string) : null;
    if (Array.isArray(parsed)) weeklyOff = parsed.map(Number).filter((n: number) => n >= 0 && n <= 6);
  } catch {
    /* default */
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">วันหยุด / นัดโทรกลับ</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          กำหนดวันที่และวันประจำสัปดาห์ที่ลูกค้าจะเลือกนัดโทรกลับไม่ได้ (มีผลกับ date picker ในแบบฟอร์มทันที)
        </p>
        <HolidayManager
          initialHolidays={(hol ?? []) as { holiday_date: string; name: string }[]}
          initialWeeklyOff={weeklyOff}
        />
      </div>
    </main>
  );
}
