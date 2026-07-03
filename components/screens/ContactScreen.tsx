"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { GlassCard } from "@/components/ui/GlassCard";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import { DIAL_CODES, DEFAULT_DIAL_CODE, dialCodeOf, isValidPhone } from "@/lib/dialCodes";
import { flagEmoji } from "@/lib/countries";
import type { ScreenProps } from "@/components/screens/types";

// Standard email, ASCII/English only — rejects Thai and other non-Latin characters.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_ASCII = /[^\x00-\x7F]/;
const CHANNEL_IMG: Record<string, string> = { line: "/icons/line.png", call: "/icons/phone.png" };

// Hourly callback slots 00:00–24:00 for the "ระบุเวลาเอง" picker.
const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string, lang: "th" | "en"): string {
  const d = new Date(`${iso}T00:00:00`);
  return lang === "th"
    ? `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : `${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Contact (rendered at q3) — first/last name (q3_first/q3_last + combined q3), phone with a country
 * dial-code prefix (q5 local + q5_cc), email (q6), 2-col contact channel (q36) and callback time
 * (q37); then `advanceTo("q7")`.
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
  const phone = answers["q5"] ?? "";
  const cc = answers["q5_cc"] ?? DEFAULT_DIAL_CODE;
  const email = answers["q6"] ?? "";
  const channel = answers["q36"] ?? "";
  const time = answers["q37"] ?? "";
  const timeOther = answers["q37_other"] ?? "";
  const isCall = channel === "call";
  // "ระบุเวลาเอง": a calendar date + an hourly time select, composed into q37_other
  // ("YYYY-MM-DD HH:MM") so the summary/submit/DB path stays unchanged.
  const cbDate = answers["q37_date"] ?? "";
  const cbTime = answers["q37_time"] ?? "";
  const [cbDateOpen, setCbDateOpen] = useState(false);

  function setCallbackSlot(date: string, tm: string) {
    onAnswer("q37_date", date);
    onAnswer("q37_time", tm);
    onAnswer("q37_other", date && tm ? `${date} ${tm}` : "");
  }

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
  const timeOk = !isCall || (!!time && (time !== "other" || timeOther.trim().length > 0));
  const gateOk = nameOk && phoneOk && EMAIL_RE.test(email) && !!channel && timeOk;

  const q36 = QUESTIONS_MAP["q36"];
  const q37 = QUESTIONS_MAP["q37"];

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "อยากให้รับผลประเมินวีซ่าทางไหน?" : "How should we send your result?"}
      hideTitleDivider
      footer={
        <Button disabled={!gateOk} onClick={() => advanceTo("q7")}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      {/* channel — the primary choice (the screen header asks it), at the top */}
      <h3 className="mb-2 font-bold text-primary">{lang === "th" ? "เลือกช่องทาง" : "Choose a channel"}</h3>
      {/* frosted GlassCards, same recipe as the Ties-to-Thailand grid */}
      <div className="grid grid-cols-2 gap-4">
        {q36.options?.map((o) => (
          <GlassCard key={o.value} selected={channel === o.value} onSelect={() => onAnswer("q36", o.value)}>
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              {CHANNEL_IMG[o.value] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={CHANNEL_IMG[o.value]} alt="" className="h-20 w-20 object-contain" />
              ) : (
                <span className="text-4xl leading-none">{o.emoji ?? "•"}</span>
              )}
              <p className="line-clamp-2 text-sm font-bold leading-tight text-primary">
                {lang === "th" ? o.label : o.labelEn ?? o.label}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      <RevealBlock open={isCall}>
        <div className="pt-3">
          <SegmentedControl
            columns={2}
            segments={(q37.options ?? []).map((o) => ({ value: o.value, label: lang === "th" ? o.label : o.labelEn ?? o.label }))}
            value={time || null}
            onChange={(v) => onAnswer("q37", v)}
          />
          <RevealBlock open={time === "other"}>
            <div className="space-y-3 pt-3">
              {/* date — calendar dropdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setCbDateOpen((o) => !o)}
                  className={
                    "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors " +
                    (cbDateOpen ? "border-accent" : "border-border")
                  }
                >
                  <span aria-hidden>📅</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-muted">{lang === "th" ? "วันที่สะดวกให้โทร" : "Preferred date"}</span>
                    <span className={"block truncate text-sm font-bold " + (cbDate ? "text-primary" : "text-muted-soft")}>
                      {cbDate ? fmtDate(cbDate, lang) : lang === "th" ? "เลือกวันที่" : "Pick a date"}
                    </span>
                  </span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 text-muted-soft transition-transform ${cbDateOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <RevealBlock open={cbDateOpen}>
                  <div className="pt-3">
                    <DateCalendar
                      value={cbDate || undefined}
                      onChange={(iso) => {
                        setCallbackSlot(iso, cbTime);
                        setCbDateOpen(false);
                      }}
                      hideMascot
                    />
                  </div>
                </RevealBlock>
              </div>

              {/* time — hourly select 00:00–24:00 */}
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-primary">{lang === "th" ? "เวลาที่สะดวก" : "Preferred time"}</span>
                <select
                  value={cbTime}
                  onChange={(e) => setCallbackSlot(cbDate, e.target.value)}
                  className={
                    "w-full rounded-2xl border bg-card px-4 py-3.5 outline-none transition-colors focus:border-accent " +
                    (cbTime ? "border-border text-primary" : "border-border text-muted-soft")
                  }
                >
                  <option value="" disabled>
                    {lang === "th" ? "เลือกเวลา" : "Pick a time"}
                  </option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h} {lang === "th" ? "น." : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </RevealBlock>
        </div>
      </RevealBlock>

      {/* contact details — below */}
      <div className="mb-2 mt-7 flex items-center justify-between">
        <h3 className="font-bold text-primary">{lang === "th" ? "ข้อมูลสำหรับติดต่อกลับ" : "Your contact details"}</h3>
        <span className="text-xs text-muted-soft">
          <span className="text-red-alert">*</span> {lang === "th" ? "จำเป็นต้องกรอก" : "required"}
        </span>
      </div>
      <TextField
        label={lang === "th" ? "ชื่อเล่น" : "Nickname"}
        required
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={lang === "th" ? "ชื่อเล่นของคุณ" : "Your nickname"}
      />

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
