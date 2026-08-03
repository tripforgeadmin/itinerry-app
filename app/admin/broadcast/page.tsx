import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAdminLang } from "@/lib/admin-lang";
import { adsCalendarEnabled, fetchAdKeywords, fetchCalendarEvents } from "@/lib/ads-calendar";
import BroadcastManager from "./BroadcastManager";

export const dynamic = "force-dynamic";

/** Broadcast System — manage LINE campaign/rule sends (whiteboard: "Broadcast System").
 * Data loads server-side once; all mutations go through /api/admin/broadcast and refresh. */
export default async function BroadcastAdminPage() {
  const lang = await getAdminLang();
  const [campaigns, rules, painPoints, runs, adEvents, adKeywords] = await Promise.all([
    supabase.from("broadcast_campaign").select("*").order("created_at", { ascending: false }),
    supabase.from("broadcast_rule").select("*").order("created_at", { ascending: false }),
    supabase.from("comment_category").select("*").eq("kind", "problem").eq("active", true).order("sort_order"),
    supabase.from("broadcast_run").select("*").order("created_at", { ascending: false }).limit(30),
    // Wide window for the month-grid calendar: previous month through +2 months.
    fetchCalendarEvents(92, 62),
    fetchAdKeywords(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">Broadcast System</h1>
        </div>
        <BroadcastManager
          lang={lang}
          campaigns={campaigns.data ?? []}
          rules={rules.data ?? []}
          painPointOptions={painPoints.data ?? []}
          runs={runs.data ?? []}
          calendarEnabled={adsCalendarEnabled()}
          adEvents={adEvents}
          adKeywords={adKeywords}
        />
      </div>
    </main>
  );
}
