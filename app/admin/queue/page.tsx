import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";
import { statusLabel } from "@/lib/status";
import { label } from "@/lib/answer-labels";
import { bangkokNow } from "@/lib/holidays";
import { scoreCase, funnelStage } from "@/lib/queue-score";
import { BookingActions } from "./BookingActions";

export const dynamic = "force-dynamic";

/**
 * Work queue — who to handle next.
 *  Lane 1 (Priority): upcoming consultation bookings, ordered by appointment time.
 *  Lane 2: everyone else with an open case, ranked by funnel stage (BOFU→TOFU) +
 *  travel urgency + savings bucket (lib/queue-score.ts).
 */

type Dict = Record<string, unknown>;
const one = (v: unknown): Dict | null => ((Array.isArray(v) ? v[0] : v) ?? null) as Dict | null;
const OPEN_STATUSES = ["new", "evaluated", "contacted", "follow_up", "pending_decision"];

function displayName(acc: Dict | null): string {
  return (
    (acc?.nickname as string) ||
    (acc?.full_name as string) ||
    (acc?.line_display_name as string) ||
    "—"
  );
}

export default async function QueuePage() {
  const lang = await getAdminLang();
  const todayIso = bangkokNow().iso;

  const [bookingsRes, casesRes] = await Promise.all([
    supabase
      .from("consultation_booking")
      .select(
        "id, channel, slot_start, status, assessment_id, meet_link, " +
          "account:account_id(nickname, full_name, line_display_name), " +
          "assessment:assessment_id(id, ticket_id, status)"
      )
      .eq("status", "booked")
      .gte("slot_start", `${todayIso}T00:00:00+07:00`)
      .order("slot_start"),
    supabase
      .from("user_assessment")
      .select(
        "id, ticket_id, status, intent, savings_balance, created_at, account_id, " +
          "account:account_id(nickname, full_name, line_display_name), " +
          "trip:trip_id(destination, visa_type, travel_arrival, study_start)"
      )
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: false }),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as Dict[];

  // Scored queue: latest open case per account, excluding customers already in the
  // priority lane (their appointment IS their place in line).
  const seen = new Set<string>();
  const scored = ((casesRes.data ?? []) as unknown as Dict[])
    .filter((r) => {
      const accId = r.account_id as string;
      if (seen.has(accId)) return false;
      seen.add(accId);
      return true;
    })
    .filter((r) => !bookings.some((b) => (one(b.assessment)?.id ?? "") === r.id))
    .map((r) => {
      const trip = one(r.trip);
      const travel = ((trip?.travel_arrival ?? trip?.study_start) as string | null) ?? null;
      return {
        row: r,
        trip,
        score: scoreCase({
          intent: (r.intent as string) ?? null,
          travelDateIso: travel,
          savings: (r.savings_balance as string) ?? null,
          todayIso,
        }),
      };
    })
    .sort((a, b) => b.score.total - a.score.total);

  const fmtSlot = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
      timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });

  const theadCls = "text-left text-[11px] text-gray-400 uppercase";
  const thCls = "py-1.5 pr-3 font-medium";
  const sectionH = "text-xs font-bold text-gray-400 uppercase tracking-wider";
  const stageChip: Record<string, string> = {
    BOFU: "bg-red-100 text-red-700",
    MOFU: "bg-amber-100 text-amber-700",
    TOFU: "bg-blue-100 text-blue-700",
    "—": "bg-gray-100 text-gray-400",
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">{t(lang, "คิวงาน", "Work Queue")}</h1>
        </div>

        {/* ── Lane 1: appointments ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className={`${sectionH} mb-3`}>
            ⭐ {t(lang, "นัดหมาย (Priority)", "Appointments (Priority)")}
            <span className="ml-2 font-normal normal-case tracking-normal">{bookings.length}</span>
          </h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400">{t(lang, "ยังไม่มีนัดที่กำลังจะถึง", "No upcoming appointments")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theadCls}>
                    <th className={thCls}>{t(lang, "เวลานัด", "Slot")}</th>
                    <th className={thCls}>{t(lang, "ช่องทาง", "Channel")}</th>
                    <th className={thCls}>{t(lang, "ลูกค้า", "Customer")}</th>
                    <th className={thCls}>{t(lang, "เคส", "Case")}</th>
                    <th className={thCls}>{t(lang, "สถานะเคส", "Case status")}</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const acc = one(b.account);
                    const asm = one(b.assessment);
                    return (
                      <tr key={b.id as string} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-bold text-gray-800 whitespace-nowrap">{fmtSlot(b.slot_start as string)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {b.channel === "online" ? t(lang, "💻 ออนไลน์", "💻 Online") : t(lang, "📞 โทร", "📞 Phone")}
                          {b.channel === "online" && typeof b.meet_link === "string" && (
                            <a
                              href={b.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 hover:bg-blue-100"
                            >
                              🎥 {t(lang, "เข้าประชุม", "Join")}
                            </a>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-800">{displayName(acc)}</td>
                        <td className="py-2 pr-3">
                          {asm?.id ? (
                            <Link href={`/admin/${asm.id}`} className="text-blue-500 hover:text-blue-700 font-mono">
                              {(asm.ticket_id as string) || (asm.id as string).slice(0, 8)}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-600">{asm?.status ? statusLabel(asm.status as string, lang) : "—"}</td>
                        <td className="py-2 text-right">
                          <BookingActions lang={lang} bookingId={b.id as string} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Lane 2: scored queue ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className={`${sectionH} mb-1`}>
            {t(lang, "คิวถัดไป (ไม่มีนัด — เรียงตามคะแนน)", "Next up (no appointment — ranked)")}
            <span className="ml-2 font-normal normal-case tracking-normal">{scored.length}</span>
          </h2>
          <p className="text-[11px] text-gray-400 mb-3">
            {t(lang,
              "คะแนน = ระดับความสนใจ (BOFU 30 / MOFU 20 / TOFU 10) + ความเร่งด่วนวันเดินทาง (≤30วัน 30 / ≤60 20 / ≤90 10) + ช่วงเงินออม (สูงสุด 20)",
              "Score = funnel stage (BOFU 30 / MOFU 20 / TOFU 10) + travel urgency (≤30d 30 / ≤60 20 / ≤90 10) + savings bucket (max 20)")}
          </p>
          {scored.length === 0 ? (
            <p className="text-sm text-gray-400">{t(lang, "ไม่มีเคสเปิดค้าง", "No open cases")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theadCls}>
                    <th className={thCls}>#</th>
                    <th className={thCls}>{t(lang, "คะแนน", "Score")}</th>
                    <th className={thCls}>{t(lang, "ลูกค้า", "Customer")}</th>
                    <th className={thCls}>{t(lang, "เคส", "Case")}</th>
                    <th className={thCls}>{t(lang, "ขั้น", "Stage")}</th>
                    <th className={thCls}>{t(lang, "ปลายทาง", "Dest")}</th>
                    <th className={thCls}>{t(lang, "เหลือ (วัน)", "Days left")}</th>
                    <th className={thCls}>{t(lang, "เงินออม", "Savings")}</th>
                    <th className={thCls}>{t(lang, "สถานะ", "Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {scored.slice(0, 50).map(({ row, trip, score }, i) => {
                    const stage = funnelStage((row.intent as string) ?? null);
                    return (
                      <tr key={row.id as string} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                        <td
                          className="py-2 pr-3 font-bold text-gray-800"
                          title={`${t(lang, "ความสนใจ", "stage")} ${score.intentPts} + ${t(lang, "เดินทาง", "travel")} ${score.travelPts} + ${t(lang, "เงิน", "money")} ${score.moneyPts}`}
                        >
                          {score.total}
                        </td>
                        <td className="py-2 pr-3 text-gray-800">{displayName(one(row.account))}</td>
                        <td className="py-2 pr-3">
                          <Link href={`/admin/${row.id}`} className="text-blue-500 hover:text-blue-700 font-mono">
                            {(row.ticket_id as string) || (row.id as string).slice(0, 8)}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${stageChip[stage]}`}>{stage}</span>
                        </td>
                        <td className="py-2 pr-3 font-mono uppercase">{(trip?.destination as string) || "—"}</td>
                        <td className="py-2 pr-3">{score.daysLeft != null && score.daysLeft >= 0 ? score.daysLeft : "—"}</td>
                        <td className="py-2 pr-3 text-gray-600">
                          {row.savings_balance ? label("savings_balance", row.savings_balance as string, lang) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-600">{statusLabel(row.status as string, lang)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
