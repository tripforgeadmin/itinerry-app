import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isOverdue, isClosed, statusLabel } from "@/lib/status";
import { nextFollowUpDue, followUpReadyToClose } from "@/lib/follow-up";
import { bangkokNow } from "@/lib/holidays";
import { displayName } from "@/lib/account-name";
import { getAdminLang } from "@/lib/admin-lang";
import AdminLangToggle from "../AdminLangToggle";
import { t, dateLocale, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;
function one(v: unknown): Dict {
  return ((Array.isArray(v) ? v[0] : v) ?? {}) as Dict;
}

type StatusHistoryEntry = { changed_at: string; to_status: string };
type TaskItem = { id: string; ticketId: string | null; name: string; detail: string };

function followUpEnteredAt(history: unknown): string | null {
  const arr = Array.isArray(history) ? (history as StatusHistoryEntry[]) : [];
  let max: string | null = null;
  for (const h of arr) {
    if (h.to_status !== "follow_up") continue;
    if (max == null || h.changed_at > max) max = h.changed_at;
  }
  return max;
}

function fmtTime(val: unknown, lang: Lang): string | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(dateLocale(lang), {
    timeZone: "Asia/Bangkok",
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function TaskList({
  title,
  emoji,
  emptyLabel,
  items,
  lang,
}: {
  title: string;
  emoji: string;
  emptyLabel: string;
  items: TaskItem[];
  lang: Lang;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-gray-700">{emoji} {title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/admin/${it.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              {it.ticketId && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 shrink-0">{it.ticketId}</span>
              )}
              <span className="text-sm font-medium text-gray-800 shrink-0">{it.name}</span>
              <span className="text-xs text-gray-400 truncate">{it.detail}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function TodayReportPage() {
  const lang = await getAdminLang();
  const today = bangkokNow().iso; // YYYY-MM-DD, Bangkok-local

  const { data: rows, error } = await supabase
    .from("user_assessment")
    .select(
      "id, ticket_id, created_at, due_date, status, contact_preference, callback_datetime, result_sent_at, follow_up_count, status_history(changed_at, to_status), account:account_id(nickname, full_name, first_name, last_name, line_user_id, is_friend), trip:trip_id(visa_type, destination)"
    )
    .order("created_at", { ascending: false });

  const overdue: TaskItem[] = [];
  const dueToday: TaskItem[] = [];
  const callbackToday: TaskItem[] = [];
  const readyToClose: TaskItem[] = [];
  const followUpStuck: TaskItem[] = [];

  for (const r of ((rows ?? []) as Dict[])) {
    const status = r.status as string;
    if (isClosed(status) || status === "human_error") continue;

    const account = one(r.account);
    const trip = one(r.trip);
    const name = displayName(account);
    const ticketId = (r.ticket_id as string) ?? null;
    const dueDate = r.due_date as string | null;
    const resultSentAt = r.result_sent_at as string | null;

    if (isOverdue(r.created_at as string, status, dueDate, resultSentAt)) {
      overdue.push({ id: r.id as string, ticketId, name, detail: `${statusLabel(status, lang)} · ${t(lang, "ครบกำหนด", "due")} ${fmtTime(dueDate, lang) ?? "—"}` });
    } else if (dueDate && !resultSentAt && dueDate.slice(0, 10) === today) {
      dueToday.push({ id: r.id as string, ticketId, name, detail: `${statusLabel(status, lang)} · ${fmtTime(dueDate, lang) ?? "—"}` });
    }

    if ((r.contact_preference === "call" || r.contact_preference === "online") && typeof r.callback_datetime === "string" && (r.callback_datetime as string).slice(0, 10) === today) {
      callbackToday.push({ id: r.id as string, ticketId, name, detail: fmtTime(r.callback_datetime, lang) ?? "—" });
    }

    if (status === "follow_up") {
      const enteredAt = followUpEnteredAt(r.status_history);
      const count = (r.follow_up_count as number) ?? 0;
      if (followUpReadyToClose(status, count, enteredAt)) {
        readyToClose.push({ id: r.id as string, ticketId, name, detail: t(lang, "ส่งตามครบ 2 ครั้งแล้ว ยังไม่ตอบกลับ", "Both nudges sent, no reply yet") });
      } else {
        const due = nextFollowUpDue(count, enteredAt);
        const lineId = account.line_user_id as string | null;
        const reachable = !!lineId && account.is_friend !== false;
        if (due != null && !reachable) {
          followUpStuck.push({
            id: r.id as string,
            ticketId,
            name,
            detail: !lineId
              ? t(lang, "ไม่มี LINE — โทรติดตามเอง", "No LINE on file — call manually")
              : t(lang, "ยังไม่เพิ่มเพื่อน LINE OA — โทรติดตามเอง", "Hasn't added the LINE OA — call manually"),
          });
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-gray-800">🗓️ {t(lang, "งานวันนี้", "Today's tasks")}</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-medium">📋 {t(lang, "ตารางทั้งหมด", "All cases")}</Link>
          <AdminLangToggle lang={lang} />
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {t(lang, "สรุปเคสที่ต้องทำวันนี้ — คำนวณสดจากฐานข้อมูลทุกครั้งที่เปิดหน้านี้", "Cases needing action today — computed live from the database on every load")}
        </p>

        {error && <p className="text-sm text-red-500 mb-4">{t(lang, "โหลดข้อมูลไม่สำเร็จ", "Failed to load data")}</p>}

        <TaskList
          title={t(lang, "เกินกำหนด SLA แล้ว", "Overdue now")}
          emoji="🔴"
          emptyLabel={t(lang, "ไม่มีเคสเกินกำหนด 🎉", "Nothing overdue 🎉")}
          items={overdue}
          lang={lang}
        />
        <TaskList
          title={t(lang, "ครบกำหนดวันนี้", "Due today")}
          emoji="⏰"
          emptyLabel={t(lang, "ไม่มีเคสครบกำหนดวันนี้", "Nothing due today")}
          items={dueToday}
          lang={lang}
        />
        <TaskList
          title={t(lang, "นัดโทรกลับวันนี้", "Callbacks scheduled today")}
          emoji="📞"
          emptyLabel={t(lang, "ไม่มีนัดโทรกลับวันนี้", "No callbacks scheduled today")}
          items={callbackToday}
          lang={lang}
        />
        <TaskList
          title={t(lang, "Follow-up ครบกำหนด — พิจารณาปิดเคส", "Follow-up done — consider closing")}
          emoji="🔔"
          emptyLabel={t(lang, "ไม่มีเคสครบกำหนดปิด", "None ready to close")}
          items={readyToClose}
          lang={lang}
        />
        <TaskList
          title={t(lang, "Follow-up อัตโนมัติเข้าไม่ถึง — โทรเอง", "Can't auto-nudge — call manually")}
          emoji="📵"
          emptyLabel={t(lang, "ไม่มีเคสที่ติดต่อทาง LINE ไม่ได้", "None stuck")}
          items={followUpStuck}
          lang={lang}
        />
      </div>
    </main>
  );
}
