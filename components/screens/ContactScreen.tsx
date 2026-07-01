"use client";

import { TextField } from "@/components/ui/TextField";
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
      <div className="grid grid-cols-2 gap-3">
        {q36.options?.map((o) => {
          const on = channel === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer("q36", o.value)}
              className={
                "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 text-center transition-colors " +
                (on ? "border-accent bg-accent-subtle text-primary" : "border-border bg-card text-muted hover:border-border-mid")
              }
            >
              {CHANNEL_IMG[o.value] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={CHANNEL_IMG[o.value]} alt="" className="h-12 w-12 object-contain" />
              ) : (
                <span className="text-3xl leading-none">{o.emoji ?? "•"}</span>
              )}
              <span className="text-sm font-bold">{lang === "th" ? o.label : o.labelEn ?? o.label}</span>
            </button>
          );
        })}
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
            <div className="pt-3">
              <TextField
                value={timeOther}
                onChange={(e) => onAnswer("q37_other", e.target.value)}
                placeholder={lang === "th" ? q37.otherPlaceholder : q37.otherPlaceholderEn}
              />
            </div>
          </RevealBlock>
        </div>
      </RevealBlock>

      {/* contact details — below */}
      <h3 className="mb-2 mt-7 font-bold text-primary">{lang === "th" ? "ข้อมูลสำหรับติดต่อกลับ" : "Your contact details"}</h3>
      <TextField
        label={lang === "th" ? "ชื่อเล่น" : "Nickname"}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder={lang === "th" ? "ชื่อเล่นของคุณ" : "Your nickname"}
      />

      {/* phone — dial code + local number */}
      <div className="mt-3">
        <span className="mb-1.5 block text-sm font-semibold text-primary">{lang === "th" ? "เบอร์โทรศัพท์" : "Phone"}</span>
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
            placeholder={cc === "+66" ? "08x-xxx-xxxx" : "phone number"}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-primary outline-none transition-colors placeholder:text-muted-soft focus:border-accent"
          />
        </div>
        <p className="mt-1 text-xs text-muted-soft">
          {dialCodeOf(cc)?.[lang === "th" ? "th" : "en"]} ({cc})
        </p>
        {phoneErr && <p className="mt-1 text-xs text-red-alert">{phoneErr}</p>}
      </div>

      {/* email */}
      <div className="mt-3">
        <TextField
          label={lang === "th" ? "อีเมล" : "Email"}
          type="email"
          value={email}
          onChange={(e) => onAnswer("q6", e.target.value)}
          placeholder="example@email.com"
          error={emailErr}
        />
      </div>
      <p className="mt-2 text-xs text-muted-soft">
        {lang === "th" ? "✉️ ใช้ส่งผลประเมินและเอกสาร — ไม่สแปม" : "✉️ Used to send your result — no spam"}
      </p>
    </QuestionShell>
  );
}
