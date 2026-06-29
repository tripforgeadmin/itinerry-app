"use client";

import { TextField } from "@/components/ui/TextField";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { Button } from "@/components/ui/Button";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import type { ScreenProps } from "@/components/screens/types";

const PHONE_RE = /^(0[6-9]\d{8}|0[2-8]\d{7,8}|\+?66[6-9]\d{8})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Contact (rendered at q3) — merges name (q3), phone (q5), email (q6), contact channel (q36) and
 * callback time (q37) onto one screen (design), then `advanceTo("q7")` to skip those separate
 * questions while their values are captured for submit.
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
  const name = answers["q3"] ?? "";
  const phone = answers["q5"] ?? "";
  const email = answers["q6"] ?? "";
  const channel = answers["q36"] ?? "";
  const time = answers["q37"] ?? "";
  const isCall = channel === "call";
  const phoneClean = phone.replace(/[\s\-()]/g, "");

  const nameErr = name && words(name) < 2 ? "กรุณากรอกชื่อและนามสกุล" : null;
  const phoneErr = phone && !PHONE_RE.test(phoneClean) ? "รูปแบบเบอร์โทรไม่ถูกต้อง" : null;
  const emailErr = email && !EMAIL_RE.test(email) ? "รูปแบบอีเมลไม่ถูกต้อง" : null;

  const gateOk =
    words(name) >= 2 && PHONE_RE.test(phoneClean) && EMAIL_RE.test(email) && !!channel && (!isCall || !!time);

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
      title={lang === "th" ? "ส่งผลประเมินให้คุณที่ไหนดี?" : "Where should we send your result?"}
      footer={
        <Button disabled={!gateOk} onClick={() => advanceTo("q7")}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label={lang === "th" ? "ชื่อ-นามสกุล" : "Full name"}
          value={name}
          onChange={(e) => onAnswer("q3", e.target.value)}
          placeholder={lang === "th" ? "กรอกชื่อ-นามสกุล" : "Your full name"}
          error={nameErr}
        />
        <TextField
          label={lang === "th" ? "เบอร์โทรศัพท์" : "Phone"}
          type="tel"
          value={phone}
          onChange={(e) => onAnswer("q5", e.target.value)}
          placeholder="08x-xxx-xxxx"
          error={phoneErr}
        />
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

      <h3 className="mb-2 mt-6 font-bold text-primary">
        {lang === "th" ? "อยากให้ติดต่อกลับทางไหน?" : "How should we contact you?"}
      </h3>
      <div className="flex flex-col gap-3">
        {q36.options?.map((o) => (
          <ChoiceRow
            key={o.value}
            selected={channel === o.value}
            onSelect={() => onAnswer("q36", o.value)}
            icon={o.emoji ? <span className="text-2xl">{o.emoji}</span> : undefined}
            title={lang === "th" ? o.label : o.labelEn ?? o.label}
          />
        ))}
      </div>

      <RevealBlock open={isCall}>
        <div className="pt-3">
          <SegmentedControl
            segments={(q37.options ?? []).map((o) => ({ value: o.value, label: lang === "th" ? o.label : o.labelEn ?? o.label }))}
            value={time || null}
            onChange={(v) => onAnswer("q37", v)}
          />
        </div>
      </RevealBlock>
    </QuestionShell>
  );
}
