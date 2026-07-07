"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, STATUS_COLOR, MANUAL_STATUS_OPTIONS, REOPEN_TARGET, isClosed, type StatusValue } from "@/lib/status";
import type { LostReasonCategory } from "@/lib/lost-reasons";

type CloseInfo = {
  close_date: string | null;
  lost_reason_l1: string | null;
  lost_reason_l2: string | null;
  close_notes: string | null;
  won_service_type: string | null;
};

export default function StatusUpdater({
  id,
  currentStatus,
  inline = false,
  reasons,
  todayIso,
  closeInfo,
}: {
  id: string;
  currentStatus: string;
  inline?: boolean;
  reasons: LostReasonCategory[];
  todayIso: string;
  closeInfo?: CloseInfo | null;
}) {
  const router = useRouter();
  const [status] = useState(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null); // simple statuses (contacted/pending_decision)
  const [closeModal, setCloseModal] = useState<null | "win" | "lost">(null);
  const [saving, setSaving] = useState(false);

  // close-form state (prefilled from the existing close when re-editing)
  const [closeDate, setCloseDate] = useState(closeInfo?.close_date ?? todayIso);
  const [l1, setL1] = useState(closeInfo?.lost_reason_l1 ?? "");
  const [l2, setL2] = useState(closeInfo?.lost_reason_l2 ?? "");
  const [notes, setNotes] = useState(closeInfo?.close_notes ?? "");
  const [serviceType, setServiceType] = useState<"full" | "diy">(closeInfo?.won_service_type === "diy" ? "diy" : "full");

  const currentClosed = isClosed(status);
  const hasPendingChange = pendingStatus !== null && pendingStatus !== status;

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.refresh();
        return true;
      }
      alert(data.error === "invalid or missing lost reason" ? "กรุณาเลือกเหตุผลให้ครบทั้ง 2 ระดับ" : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function onStatusButton(v: StatusValue) {
    if (v === "win" || v === "lost") {
      setCloseModal(v);
    } else {
      setPendingStatus(v);
    }
  }

  async function saveSimple() {
    if (!pendingStatus) return;
    if (await post({ id, status: pendingStatus })) setPendingStatus(null);
  }

  async function saveClose() {
    if (!closeModal) return;
    if (closeModal === "lost" && (!l1 || !l2)) return;
    const ok = await post({
      id,
      status: closeModal,
      closeDate,
      lostReasonL1: closeModal === "lost" ? l1 : undefined,
      lostReasonL2: closeModal === "lost" ? l2 : undefined,
      closeNotes: notes,
      wonServiceType: closeModal === "win" ? serviceType : undefined,
    });
    if (ok) setCloseModal(null);
  }

  const statusButtons = MANUAL_STATUS_OPTIONS.filter((s) => s.value !== status).map((s) => (
    <button
      key={s.value}
      onClick={() => onStatusButton(s.value)}
      disabled={saving}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50 ${s.color} ${
        pendingStatus === s.value ? "ring-2 ring-offset-1 ring-gray-800" : ""
      }`}
    >
      {s.label}
    </button>
  ));

  const reopenButton = currentClosed && (
    <button
      onClick={() => post({ id, status: REOPEN_TARGET })}
      disabled={saving}
      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-white transition-opacity disabled:opacity-50"
      title="ย้ายกลับเป็น รอตัดสินใจ (ล้างข้อมูลการปิด)"
    >
      🔄 เปิดเคสใหม่
    </button>
  );

  const confirmButtons = hasPendingChange && (
    <>
      <button onClick={() => setPendingStatus(null)} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 transition-opacity disabled:opacity-50">
        ยกเลิก
      </button>
      <button onClick={saveSimple} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-white transition-opacity disabled:opacity-50">
        {saving ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </>
  );

  const currentColor = STATUS_COLOR[status as StatusValue] ?? "";
  const currentLabel = STATUS_LABEL[status as StatusValue] ?? status;

  const body = (
    <>
      {inline ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">สถานะ:</span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currentColor}`}>{currentLabel}</span>
          {statusButtons}
          {reopenButton}
          {confirmButtons}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500">สถานะ:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currentColor}`}>{currentLabel}</span>
            <div className="flex gap-2 ml-auto flex-wrap">{statusButtons}{reopenButton}</div>
          </div>
          {hasPendingChange && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400 mr-auto">เปลี่ยนเป็น &quot;{STATUS_LABEL[pendingStatus as StatusValue] ?? pendingStatus}&quot; — ยังไม่บันทึก</span>
              {confirmButtons}
            </div>
          )}
        </div>
      )}

      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setCloseModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">
              {closeModal === "win" ? "ปิดดีล — Closed Won" : "ปิดดีล — Closed Lost"}
            </h3>

            {closeModal === "lost" && (
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-xs text-gray-400">เหตุผลหลัก *</label>
                  <select value={l1} onChange={(e) => { setL1(e.target.value); setL2(""); }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">— เลือก —</option>
                    {reasons.map((c) => <option key={c.key} value={c.key}>{c.label_th}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">เหตุผลย่อย *</label>
                  <select value={l2} onChange={(e) => setL2(e.target.value)} disabled={!l1} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50">
                    <option value="">— เลือก —</option>
                    {reasons.find((c) => c.key === l1)?.children.map((s) => <option key={s.key} value={s.key}>{s.label_th}</option>)}
                  </select>
                </div>
              </div>
            )}

            {closeModal === "win" && (
              <div className="mb-3">
                <label className="text-xs text-gray-400">ประเภทบริการ</label>
                <div className="mt-1 flex gap-2">
                  {(["full", "diy"] as const).map((t) => (
                    <button key={t} onClick={() => setServiceType(t)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${serviceType === t ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {t === "full" ? "Full service" : "DIY"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="text-xs text-gray-400">วันที่ปิดดีล</label>
              <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400">โน้ตเพิ่มเติม (ไม่บังคับ)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setCloseModal(null)} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600">ยกเลิก</button>
              <button
                onClick={saveClose}
                disabled={saving || (closeModal === "lost" && (!l1 || !l2))}
                className={`rounded-lg px-5 py-2 text-xs font-bold text-white disabled:opacity-40 ${closeModal === "win" ? "bg-green-600" : "bg-red-600"}`}
              >
                {saving ? "กำลังบันทึก…" : "ยืนยันปิดดีล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return body;
}
