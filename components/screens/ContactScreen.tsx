"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { DIAL_CODES, DEFAULT_DIAL_CODE, dialCodeOf, isValidPhone } from "@/lib/dialCodes";
import { flagEmoji } from "@/lib/countries";
import type { ScreenProps } from "@/components/screens/types";

// Standard email, ASCII/English only — rejects Thai and other non-Latin characters.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_ASCII = /[^\x00-\x7F]/;

// Personal-info companions of q3 (like q3_first/q3_last) — stored as synthetic answer keys
// q3_gender / q3_age, mapped to account.gender / account.age_range in the submit route.
const GENDER_OPTIONS = [
  { value: "male", label: "ชาย", labelEn: "Male" },
  { value: "female", label: "หญิง", labelEn: "Female" },
  { value: "other", label: "อื่นๆ", labelEn: "Other" },
];
const AGE_OPTIONS = [
  { value: "under_18", label: "ต่ำกว่า 18 ปี", labelEn: "Under 18" },
  { value: "18_29", label: "18–29 ปี", labelEn: "18–29" },
  { value: "30_39", label: "30–39 ปี", labelEn: "30–39" },
  { value: "40_49", label: "40–49 ปี", labelEn: "40–49" },
  { value: "50_59", label: "50–59 ปี", labelEn: "50–59" },
  { value: "60_plus", label: "60 ปีขึ้นไป", labelEn: "60+" },
];

/**
 * Contact (rendered at q3) — contact info only: nickname (q3, mirrored into q3_first/q3_last),
 * gender (q3_gender), age range (q3_age), phone with a country dial-code prefix (q5 local +
 * q5_cc) and email (q6). No channel or appointment slot — the team contacts every customer back
 * within 2 days (SLA_HOURS in lib/status.ts). Then `advanceTo("q7")`.
 */
export function ContactScreen({
  question,
  answers,
  onAnswer,
  advanceTo,
  onBack,
  isFirst,
  lang,
  onLangChange,
  boxes,
  activeIndex,
}: ScreenProps) {
  const nickname = answers["q3"] ?? "";
  const gender = answers["q3_gender"] ?? "";
  const age = answers["q3_age"] ?? "";
  const phone = answers["q5"] ?? "";
  const cc = answers["q5_cc"] ?? DEFAULT_DIAL_CODE;
  const email = answers["q6"] ?? "";

  // Errors only surface once a field has been blurred — no red flash while the user is still typing.
  const [touched, setTouched] = useState<{ q5?: boolean; q6?: boolean }>({});

  function setNickname(v: string) {
    onAnswer("q3", v);
    onAnswer("q3_first", v); // maps to first_name in the DB — the nickname is the contact name
    onAnswer("q3_last", "");
  }

  const nameOk = nickname.trim().length > 0;
  const phoneOk = isValidPhone(cc, phone);
  const phoneErr = phone && !phoneOk ? (lang === "th" ? "รูปแบบเบอร์โทรไม่ถูกต้อง" : "Invalid phone number") : null;
  const emailErr = !email
    ? null
    : NON_ASCII.test(email)
      ? lang === "th"
        ? "อีเมลต้องเป็นตัวอักษรภาษาอังกฤษเท่านั้น"
        : "Email must use English letters only"
      : !EMAIL_RE.test(email)
        ? lang === "th"
          ? "รูปแบบอีเมลไม่ถูกต้อง"
          : "Invalid email"
        : null;
  const gateOk = nameOk && !!gender && !!age && phoneOk && EMAIL_RE.test(email);

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "ข้อมูลสำหรับติดต่อกลับ" : "Your contact details"}
      subtitle={
        lang === "th"
          ? "ทีมผู้เชี่ยวชาญของเราจะติดต่อกลับภายใน 2 วัน"
          : "Our specialist will get back to you within 2 days"
      }
      hideTitleDivider
      footer={
        <Button disabled={!gateOk} onClick={() => advanceTo("q7")}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <p className="mb-2 text-right text-xs text-muted-soft">
        <span className="text-red-alert">*</span> {lang === "th" ? "จำเป็นต้องกรอก" : "required"}
      </p>
      <TextField
        label={lang === "th" ? "ชื่อเล่น" : "Nickname"}
        required
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={lang === "th" ? "ชื่อเล่นของคุณ" : "Your nickname"}
      />

      {/* gender */}
      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-semibold text-primary">
          {lang === "th" ? "เพศ" : "Gender"}
          <span className="text-red-alert"> *</span>
        </span>
        <SegmentedControl
          segments={GENDER_OPTIONS.map((o) => ({ value: o.value, label: lang === "th" ? o.label : o.labelEn }))}
          value={gender || null}
          onChange={(v) => onAnswer("q3_gender", v)}
        />
      </div>

      {/* age range */}
      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-semibold text-primary">
          {lang === "th" ? "ช่วงอายุ" : "Age range"}
          <span className="text-red-alert"> *</span>
        </span>
        <select
          value={age}
          onChange={(e) => onAnswer("q3_age", e.target.value)}
          aria-label={lang === "th" ? "ช่วงอายุ" : "Age range"}
          className={
            "w-full rounded-2xl border border-border bg-card px-4 py-3.5 outline-none transition-colors focus:border-accent " +
            (age ? "text-primary" : "text-muted-soft")
          }
        >
          <option value="" disabled>
            {lang === "th" ? "เลือกช่วงอายุ" : "Select age range"}
          </option>
          {AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="text-primary">
              {lang === "th" ? o.label : o.labelEn}
            </option>
          ))}
        </select>
      </div>

      {/* phone — dial code + local number */}
      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-semibold text-primary">
          {lang === "th" ? "เบอร์โทรศัพท์" : "Phone"}
          <span className="text-red-alert"> *</span>
        </span>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <select
            value={cc}
            onChange={(e) => onAnswer("q5_cc", e.target.value)}
            aria-label="country code"
            className="rounded-2xl border border-border bg-card px-3 py-3.5 text-primary outline-none transition-colors focus:border-accent"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {flagEmoji(d.iso)} {d.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onAnswer("q5", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, q5: true }))}
            placeholder={cc === "+66" ? "08x-xxx-xxxx" : "phone number"}
            className={
              "w-full rounded-2xl border bg-card px-4 py-3.5 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent " +
              (touched.q5 && phoneErr ? "border-red-alert" : "border-border")
            }
          />
        </div>
        <p className="mt-1 text-xs text-muted-soft">
          {dialCodeOf(cc)?.[lang === "th" ? "th" : "en"]} ({cc})
        </p>
        {touched.q5 && phoneErr && <p className="mt-1 text-xs text-red-alert">{phoneErr}</p>}
      </div>

      {/* email */}
      <div className="mt-3">
        <TextField
          label={lang === "th" ? "อีเมล" : "Email"}
          required
          type="email"
          value={email}
          onChange={(e) => onAnswer("q6", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, q6: true }))}
          placeholder="example@email.com"
          error={touched.q6 ? emailErr : null}
        />
      </div>
      <p className="mt-2 text-xs text-muted-soft">
        {lang === "th" ? "✉️ ใช้ส่งผลประเมินและเอกสาร — ไม่สแปม" : "✉️ Used to send your result — no spam"}
      </p>
    </QuestionShell>
  );
}
