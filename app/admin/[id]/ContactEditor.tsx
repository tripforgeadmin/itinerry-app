"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnonymizeButton from "./AnonymizeButton";
import { DIAL_CODES, formatPhone } from "@/lib/dialCodes";

const PREF_LABEL: Record<string, string> = { line: "LINE OA", call: "โทรกลับ" };

/** One read-only row — matches the <Row> helper in page.tsx. Hides empty values. */
function ReadRow({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm w-48 shrink-0">{title}</span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  );
}

/** One labelled input in edit mode. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-1.5 items-center">
      <span className="text-gray-400 text-sm w-48 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200";

export interface ContactEditorProps {
  accountId: string;
  assessmentId: string;
  isAnonymized: boolean;
  // editable — account
  nickname: string;
  fullName: string;
  phoneCode: string;
  phoneLocal: string; // stored national number (trunk 0 dropped)
  email: string;
  // editable — user_assessment
  contactPreference: string;
  // read-only extras (already label-resolved server-side)
  nationalityDisplay?: string | null;
  sourceDisplay?: string | null;
  consentedDisplay?: string | null;
}

export default function ContactEditor(props: ContactEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nickname, setNickname] = useState(props.nickname);
  const [fullName, setFullName] = useState(props.fullName);
  const [phoneCode, setPhoneCode] = useState(props.phoneCode || "+66");
  const [phoneLocal, setPhoneLocal] = useState(props.phoneLocal);
  const [email, setEmail] = useState(props.email);
  const [pref, setPref] = useState(props.contactPreference);

  function reset() {
    setNickname(props.nickname);
    setFullName(props.fullName);
    setPhoneCode(props.phoneCode || "+66");
    setPhoneLocal(props.phoneLocal);
    setEmail(props.email);
    setPref(props.contactPreference);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: props.accountId,
          assessmentId: props.assessmentId,
          nickname,
          fullName,
          phoneCountryCode: phoneCode,
          phone: phoneLocal,
          email,
          contactPreference: pref,
        }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      router.refresh();
    } catch {
      alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const phoneShown = formatPhone(props.phoneCode || "+66", props.phoneLocal);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">S1 · ข้อมูลติดต่อ</h2>
        <div className="flex items-center gap-2">
          {!props.isAnonymized && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-blue-500 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              ✎ แก้ไข
            </button>
          )}
          {!props.isAnonymized && <AnonymizeButton accountId={props.accountId} />}
        </div>
      </div>

      {props.isAnonymized && (
        <p className="text-xs text-gray-400 -mt-1 mb-2">ลบข้อมูลส่วนตัวแล้ว (PDPA)</p>
      )}

      {editing ? (
        <div className="space-y-1">
          <Field label="ชื่อเล่น">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputCls} placeholder="ชื่อเล่น (โชว์บนรายงาน)" />
          </Field>
          <Field label="ชื่อ-นามสกุล">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="ชื่อจริง-นามสกุล" />
          </Field>
          <Field label="เบอร์โทร">
            <div className="flex gap-2">
              <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className={`${inputCls} w-32 shrink-0`}>
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>{d.code} {d.th}</option>
                ))}
              </select>
              <input value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} className={inputCls} placeholder="เบอร์ (ใส่ 0 นำหน้าหรือไม่ก็ได้)" inputMode="tel" />
            </div>
          </Field>
          <Field label="อีเมล">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="อีเมล" inputMode="email" />
          </Field>
          <Field label="ติดต่อผ่าน">
            <div className="flex gap-2">
              {(["line", "call"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPref(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${
                    pref === p ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 opacity-60"
                  }`}
                >
                  {PREF_LABEL[p]}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <>
          <ReadRow title="ชื่อเล่น" value={props.nickname} />
          <ReadRow title="ชื่อ-นามสกุล" value={props.fullName} />
          <ReadRow title="เบอร์โทร" value={phoneShown} />
          <ReadRow title="อีเมล" value={props.email} />
          <ReadRow title="ติดต่อผ่าน" value={PREF_LABEL[props.contactPreference] ?? props.contactPreference} />
          <ReadRow title="สัญชาติ" value={props.nationalityDisplay} />
          <ReadRow title="รู้จักจาก" value={props.sourceDisplay} />
          <ReadRow title="ยินยอม PDPA เมื่อ" value={props.consentedDisplay} />
        </>
      )}
    </div>
  );
}
