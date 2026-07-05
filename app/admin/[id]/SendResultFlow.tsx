"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toJpeg } from "html-to-image";
import type { HealthcheckData } from "@/lib/healthcheck-data";
import HealthcheckCard from "@/app/admin/healthcheck/[id]/HealthcheckCard";

const MAX_MESSAGE = 500;

/**
 * "ส่งผลประเมินให้ลูกค้า" — appears once the case is marked evaluated. Opens a modal with
 * a live card preview (language-switchable, defaulting from nationality) + an editable
 * message prefilled with the standard result text, then a second-step confirmation. On
 * confirm the SELECTED-language card DOM is exported to JPEG here in the browser (the
 * only place Thai shapes correctly) and shipped to /api/admin/send-result.
 */
export default function SendResultFlow({
  assessmentId,
  status,
  ready,
  resultSentAt,
  canSend,
  blockReason,
  dataTh,
  dataEn,
  defaultLang,
  flagSrc,
  prefillTh,
  prefillEn,
}: {
  assessmentId: string;
  status: string;
  ready: boolean;
  resultSentAt: string | null;
  canSend: boolean;
  blockReason: string | null;
  dataTh: HealthcheckData;
  dataEn: HealthcheckData;
  defaultLang: "th" | "en";
  flagSrc: string | null;
  prefillTh: string;
  prefillEn: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lang, setLang] = useState<"th" | "en">(defaultLang);
  const [message, setMessage] = useState(defaultLang === "th" ? prefillTh : prefillEn);
  const [messageEdited, setMessageEdited] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // show the card as soon as the case is evaluated (or a result was already sent); the
  // send action itself is gated on `ready` (strengths/improvements filled) + canSend below.
  if (status === "pending_review" && !resultSentAt) return null;

  const data = lang === "th" ? dataTh : dataEn;

  function switchLang(next: "th" | "en") {
    setLang(next);
    // keep the message in sync with the language unless the admin has typed their own
    if (!messageEdited) setMessage(next === "th" ? prefillTh : prefillEn);
  }

  async function handleConfirmedSend() {
    const node = exportRef.current;
    if (!node || sending) return;
    setSending(true);
    setError(null);
    try {
      // full-quality card for the chat + a small preview (LINE caps previews at 1MB)
      const image = await toJpeg(node, { quality: 0.92, pixelRatio: 2, backgroundColor: "#ffffff" });
      const preview = await toJpeg(node, { quality: 0.8, pixelRatio: 0.5, backgroundColor: "#ffffff" });
      const res = await fetch("/api/admin/send-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, message: message.trim(), image, preview }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(body.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่");
        setConfirming(false);
      }
    } catch (err) {
      console.error(err);
      setError("สร้างรูปไม่สำเร็จ กรุณาลองใหม่");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3">
      <span className="text-sm text-gray-500 flex-1">ส่งผลการประเมิน (รูป + ข้อความ) ให้ลูกค้าทาง LINE</span>
      {resultSentAt ? (
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500">
          ส่งแล้ว ·{" "}
          {new Date(resultSentAt).toLocaleDateString("th-TH", {
            timeZone: "Asia/Bangkok",
            day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      ) : !ready ? (
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600" title="กรอกจุดแข็ง/จุดที่ช่วยเสริมอย่างน้อยอย่างละ 1 ข้อก่อน">
          กรอกจุดแข็ง/จุดเสริมก่อนจึงจะส่งได้
        </span>
      ) : !canSend ? (
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600" title={blockReason ?? ""}>
          {blockReason ?? "ส่งไม่ได้"}
        </span>
      ) : (
        <button
          onClick={() => { setOpen(true); setConfirming(false); setError(null); }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700"
        >
          ส่งผลประเมินให้ลูกค้า
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          {/* Prompt face for the card preview + export (this page doesn't load it otherwise) */}
          <style>{`
            @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-Regular.ttf'); font-weight: 400; font-display: swap; }
            @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-SemiBold.ttf'); font-weight: 600; font-display: swap; }
            @font-face { font-family: 'Prompt'; src: url('/fonts/Prompt-Bold.ttf'); font-weight: 700; font-display: swap; }
          `}</style>

          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <span className="text-sm font-bold text-gray-800">ส่งผลประเมินให้ลูกค้า</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{data.ticketId}</span>
              <div className="ml-auto flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                {(["th", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLang(l)}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold ${lang === l ? "bg-blue-600 text-white" : "text-gray-500"}`}
                  >
                    {l === "th" ? "ไทย" : "EN"}
                  </button>
                ))}
              </div>
              <button onClick={() => setOpen(false)} className="px-2 text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* only the card preview scrolls */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-2 text-xs text-gray-400">รูปที่ลูกค้าจะได้รับ ({lang === "th" ? "ภาษาไทย" : "English"})</p>
              <div className="overflow-hidden rounded-xl border border-gray-200" style={{ zoom: 0.52 }}>
                <HealthcheckCard data={data} flagSrc={flagSrc} />
              </div>
            </div>

            {/* sticky message section — always visible while the card scrolls above it */}
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="mb-1 text-xs text-gray-400">ข้อความที่ส่งตามหลังรูป</p>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value.slice(0, MAX_MESSAGE)); setMessageEdited(true); }}
                rows={4}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex items-center">
                <span className="text-[11px] text-gray-300">{message.length}/{MAX_MESSAGE}</span>
                {error && <span className="ml-auto text-xs font-bold text-red-500">{error}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
              {!confirming ? (
                <>
                  <button onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600">
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={!message.trim()}
                    className="ml-auto rounded-lg bg-green-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    ส่ง
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-gray-700">ยืนยันส่งรูป + ข้อความถึงลูกค้าทาง LINE?</span>
                  <button onClick={() => setConfirming(false)} disabled={sending} className="ml-auto rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleConfirmedSend}
                    disabled={sending}
                    className="rounded-lg bg-green-600 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {sending ? "กำลังส่ง…" : "ยืนยันส่ง"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* full-size instance for export — off-screen, never scaled, follows the language */}
          <div style={{ position: "fixed", left: -12000, top: 0 }} aria-hidden>
            <div ref={exportRef}>
              <HealthcheckCard data={data} flagSrc={flagSrc} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
