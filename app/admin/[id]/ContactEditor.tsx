"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnonymizeButton from "./AnonymizeButton";
import { DIAL_CODES, formatPhone } from "@/lib/dialCodes";
import { t, type Lang } from "@/lib/i18n";

const prefLabel = (p: string, lang: Lang) => (p === "line" ? "LINE OA" : p === "call" ? t(lang, "โทรกลับ", "Call back") : p);

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
  lang?: Lang;
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
  const lang = props.lang ?? "th";
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
      alert(t(lang, "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Save failed. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const phoneShown = formatPhone(props.phoneCode || "+66", props.phoneLocal);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t(lang, "S1 · ข้อมูลติดต่อ", "S1 · Contact info")}</h2>
        <div className="flex items-center gap-2">
          {!props.isAnonymized && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-blue-500 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              ✎ {t(lang, "แก้ไข", "Edit")}
            </button>
          )}
          {!props.isAnonymized && <AnonymizeButton accountId={props.accountId} lang={lang} />}
        </div>
      </div>

      {props.isAnonymized && (
        <p className="text-xs text-gray-400 -mt-1 mb-2">{t(lang, "ลบข้อมูลส่วนตัวแล้ว (PDPA)", "Personal data deleted (PDPA)")}</p>
      )}

      {editing ? (
        <div className="space-y-1">
          <Field label={t(lang, "ชื่อเล่น", "Nickname")}>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputCls} placeholder={t(lang, "ชื่อเล่น (โชว์บนรายงาน)", "Nickname (shown on the report)")} />
          </Field>
          <Field label={t(lang, "ชื่อ-นามสกุล", "Full name")}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder={t(lang, "ชื่อจริง-นามสกุล", "First and last name")} />
          </Field>
          <Field label={t(lang, "เบอร์โทร", "Phone")}>
            <div className="flex gap-2">
              <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className={`${inputCls} w-32 shrink-0`}>
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>{d.code} {d.th}</option>
                ))}
              </select>
              <input value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} className={inputCls} placeholder={t(lang, "เบอร์ (ใส่ 0 นำหน้าหรือไม่ก็ได้)", "Phone (with or without leading 0)")} inputMode="tel" />
            </div>
          </Field>
          <Field label={t(lang, "อีเมล", "Email")}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder={t(lang, "อีเมล", "Email")} inputMode="email" />
          </Field>
          <Field label={t(lang, "ติดต่อผ่าน", "Contact via")}>
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
                  {prefLabel(p, lang)}
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
              {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึก", "Save")}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-40"
            >
              {t(lang, "ยกเลิก", "Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <ReadRow title={t(lang, "ชื่อเล่น", "Nickname")} value={props.nickname} />
          <ReadRow title={t(lang, "ชื่อ-นามสกุล", "Full name")} value={props.fullName} />
          <ReadRow title={t(lang, "เบอร์โทร", "Phone")} value={phoneShown} />
          <ReadRow title={t(lang, "อีเมล", "Email")} value={props.email} />
          <ReadRow title={t(lang, "ติดต่อผ่าน", "Contact via")} value={prefLabel(props.contactPreference, lang)} />
          <ReadRow title={t(lang, "สัญชาติ", "Nationality")} value={props.nationalityDisplay} />
          <ReadRow title={t(lang, "รู้จักจาก", "Found via")} value={props.sourceDisplay} />
          <ReadRow title={t(lang, "ยินยอม PDPA เมื่อ", "PDPA consent at")} value={props.consentedDisplay} />
        </>
      )}
    </div>
  );
}
