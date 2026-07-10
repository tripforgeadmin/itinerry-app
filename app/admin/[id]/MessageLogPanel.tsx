"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { t, dateLocale, type Lang } from "@/lib/i18n";

const MAX_LEN = 250;

type LogRow = {
  id: string;
  assessment_id: string | null;
  kind: string;
  content: string;
  sent_by: string;
  delivered: boolean;
  created_at: string;
};

const KIND_CLS: Record<string, string> = {
  ticket_received: "bg-blue-100 text-blue-700",
  follow_up: "bg-blue-100 text-blue-700",
  share_card: "bg-purple-100 text-purple-700",
  result: "bg-green-100 text-green-700",
  manual: "bg-gray-100 text-gray-600",
};

function kindBadge(kind: string, lang: Lang): { label: string; cls: string } | undefined {
  const cls = KIND_CLS[kind];
  if (!cls) return undefined;
  const label = {
    ticket_received: t(lang, "รับเรื่อง", "Received"),
    follow_up: t(lang, "ติดตาม", "Follow-up"),
    share_card: t(lang, "การ์ดแชร์", "Share card"),
    result: t(lang, "ส่งผล", "Result"),
    manual: t(lang, "พิมพ์เอง", "Manual"),
  }[kind] ?? kind;
  return { label, cls };
}

function dayLabel(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(dateLocale(lang), {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit",
  });
}

function timeLabel(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleTimeString(dateLocale(lang), {
    timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit",
  });
}

/** Right-column outbound-message history + compose box for the case page. All bubbles are
 * outbound (we can't read LINE inbound history) — newest at the bottom, chat-style. */
export default function MessageLogPanel({ assessmentId, lang = "th" }: { assessmentId: string; lang?: Lang }) {
  const [messages, setMessages] = useState<LogRow[]>([]);
  const [ticketById, setTicketById] = useState<Record<string, string>>({});
  const [canSend, setCanSend] = useState(false);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/messages?assessmentId=${assessmentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setTicketById(data.ticketById ?? {});
      setCanSend(!!data.canSend);
      setIsFriend(data.isFriend ?? null);
    } finally {
      setLoaded(true);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  // keep the newest message in view (chat convention)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_LEN || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, text: trimmed }),
      });
      if (res.ok) {
        setText("");
        await load(); // pick up the logged row (delivered or red-bubble failed)
      } else {
        alert(t(lang, "ส่งไม่สำเร็จ กรุณาลองใหม่", "Send failed. Please try again."));
      }
    } finally {
      setSending(false);
    }
  }

  const remaining = MAX_LEN - text.length;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t(lang, "ข้อความถึงลูกค้า", "Messages to customer")}</span>
        <span className="ml-auto text-[11px] text-gray-300">{messages.length} {t(lang, "รายการ", "items")}</span>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!loaded ? (
          <p className="pt-8 text-center text-xs text-gray-300">{t(lang, "กำลังโหลด…", "Loading…")}</p>
        ) : messages.length === 0 ? (
          <p className="pt-8 text-center text-xs text-gray-300">{t(lang, "ยังไม่เคยส่งข้อความถึงลูกค้าคนนี้", "No messages sent to this customer yet")}</p>
        ) : (
          messages.map((m, i) => {
            const badge = kindBadge(m.kind, lang);
            const newDay = i === 0 || dayLabel(messages[i - 1].created_at, lang) !== dayLabel(m.created_at, lang);
            const ticket = m.assessment_id ? ticketById[m.assessment_id] : "";
            const foreign = m.assessment_id && m.assessment_id !== assessmentId; // another ticket of the same customer
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-2 text-center text-[10px] text-gray-300">{dayLabel(m.created_at, lang)}</div>
                )}
                <div className="flex flex-col items-end">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                    {!m.delivered && <span className="font-bold text-red-500">{t(lang, "ส่งไม่สำเร็จ", "Failed")} ·</span>}
                    <span>{m.sent_by === "admin" ? t(lang, "แอดมิน", "Admin") : t(lang, "ระบบ", "System")} · {timeLabel(m.created_at, lang)}</span>
                    {badge && <span className={`rounded px-1.5 py-px font-medium ${badge.cls}`}>{badge.label}</span>}
                    {foreign && ticket && <span className="rounded bg-gray-100 px-1.5 py-px text-gray-500">{ticket}</span>}
                  </div>
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-xl rounded-br-sm px-3 py-2 text-[13px] leading-relaxed ${
                      !m.delivered
                        ? "bg-red-50 text-red-900 opacity-90"
                        : m.sent_by === "admin"
                          ? "border border-gray-200 bg-gray-50 text-gray-800"
                          : "bg-blue-50 text-blue-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-100 px-3 py-3">
        {loaded && !canSend && (
          <p className="mb-2 text-[11px] text-amber-600">
            {isFriend === false
              ? t(lang, "ลูกค้ายังไม่ได้เพิ่มเพื่อน LINE OA — ส่งข้อความไม่ได้", "Customer hasn't added the LINE OA — can't message")
              : t(lang, "ลูกค้าไม่มีบัญชี LINE ในระบบ — ส่งข้อความไม่ได้", "No LINE account on file — can't message")}
          </p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
          }}
          placeholder={t(lang, "พิมพ์ข้อความถึงลูกค้า…", "Type a message to the customer…")}
          rows={2}
          disabled={!canSend || sending}
          className="w-full resize-none rounded-lg border border-gray-200 p-2.5 text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
        />
        <div className="mt-1.5 flex items-center">
          <span className={`text-[11px] ${remaining <= 20 ? "font-bold text-red-500" : "text-gray-300"}`}>
            {text.length}/{MAX_LEN}
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sending || !text.trim()}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {sending ? t(lang, "กำลังส่ง…", "Sending…") : t(lang, "ส่ง", "Send")}
          </button>
        </div>
      </div>
    </div>
  );
}
