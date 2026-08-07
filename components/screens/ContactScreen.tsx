"use client";

import { useEffect, useMemo, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { GlassCard } from "@/components/ui/GlassCard";
import { DateCalendar } from "@/components/ui/DateCalendar";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QuestionShell } from "@/components/screens/QuestionShell";
import { QUESTIONS_MAP } from "@/lib/questions";
import { DIAL_CODES, DEFAULT_DIAL_CODE, dialCodeOf, isValidPhone } from "@/lib/dialCodes";
import { flagEmoji } from "@/lib/countries";
import type { ScreenProps } from "@/components/screens/types";

// Standard email, ASCII/English only — rejects Thai and other non-Latin characters.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_ASCII = /[^\x00-\x7F]/;

// Consultation availability from /api/booking/slots — the server owns all the rules
// (working hours, holidays, Google-Calendar busy times, already-booked slots).
type DayAvailability = { dateIso: string; free: number };
type SlotInfo = { startIso: string; label: string };

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

const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string, lang: "th" | "en"): string {
  const d = new Date(`${iso}T00:00:00`);
  return lang === "th"
    ? `${TH_DOW[d.getDay()]} ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : `${EN_DOW[d.getDay()]} ${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Contact (rendered at q3) — first/last name (q3_first/q3_last + combined q3), phone with a country
 * dial-code prefix (q5 local + q5_cc), email (q6), and a real consultation booking: channel (q36,
 * phone call / online meeting) + a 30-min slot (q37 "HH:MM" + q37_date) validated against
 * /api/booking/slots. Then `advanceTo("q7")`.
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
  const channel = answers["q36"] ?? "";
  const callTime = answers["q37"] ?? ""; // chosen slot "HH:MM"
  const callDate = answers["q37_date"] ?? ""; // chosen appointment date (ISO)
  const isBooking = channel === "call" || channel === "online";

  // Day-level availability (which dates still have free slots) + per-date slot list.
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [cbDateOpen, setCbDateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/booking/slots")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d?.days)) setDays(d.days);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!callDate) { setSlots(null); return; }
    let cancelled = false;
    setSlotsLoading(true);
    fetch(`/api/booking/slots?date=${callDate}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: SlotInfo[] = Array.isArray(d?.slots) ? d.slots : [];
        setSlots(list);
        // drop a previously-chosen slot that's no longer free on this date
        if (callTime && !list.some((s) => s.label === callTime)) onAnswer("q37", "");
      })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callDate]);

  const freeDates = useMemo(() => new Set(days.filter((d) => d.free > 0).map((d) => d.dateIso)), [days]);
  // Fallback window while availability is loading / on fetch error — the server still
  // validates every slot, so a permissive calendar can never over-book.
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minDate = days[0]?.dateIso ?? todayIso;
  const maxDate = days[days.length - 1]?.dateIso
    ?? new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  function setBookingDate(iso: string) {
    onAnswer("q37_date", iso);
    setCbDateOpen(false);
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
  const timeOk = isBooking && !!callDate && !!callTime;
  const gateOk = nameOk && !!gender && !!age && phoneOk && EMAIL_RE.test(email) && timeOk;

  const q36 = QUESTIONS_MAP["q36"];

  return (
    <QuestionShell
      boxes={boxes}
      activeIndex={activeIndex}
      isFirst={isFirst}
      onBack={onBack}
      lang={lang}
      onLangChange={onLangChange}
      screenKey={question.id}
      title={lang === "th" ? "นัดคุยผลประเมินกับทีมผู้เชี่ยวชาญ" : "Book a call with our specialist"}
      hideTitleDivider
      footer={
        <Button disabled={!gateOk} onClick={() => advanceTo("q7")}>
          {lang === "th" ? "ถัดไป" : "Next"}
        </Button>
      }
    >
      {/* channel — the primary choice (the screen header asks it), at the top */}
      <h3 className="mb-1 font-bold text-primary">{lang === "th" ? "เลือกช่องทางนัดคุย" : "Choose how we talk"}</h3>
      <p className="mb-2 text-xs text-muted-soft">
        {lang === "th" ? "ใช้เวลาประมาณ 20 นาที ไม่มีค่าใช้จ่าย" : "About 20 minutes, free of charge"}
      </p>
      {/* frosted GlassCards, same recipe as the Ties-to-Thailand grid */}
      <div className="grid grid-cols-2 gap-4">
        {q36.options?.map((o) => (
          <GlassCard key={o.value} selected={channel === o.value} onSelect={() => onAnswer("q36", o.value)}>
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              {/* same-size emoji box for every channel so the cards always match */}
              <span className="flex h-20 w-20 items-center justify-center text-[52px] leading-none">
                {o.emoji ?? "•"}
              </span>
              <p className="line-clamp-2 text-sm font-bold leading-tight text-primary">
                {lang === "th" ? o.label : o.labelEn ?? o.label}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      <RevealBlock open={isBooking}>
        <div className="space-y-3 pt-3">
          {/* appointment date — calendar dropdown, within 2 weeks, only days with free slots */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-primary">
              {lang === "th" ? "วันที่สะดวก" : "Preferred date"}
              <span className="text-red-alert"> *</span>
            </span>
            <button
              type="button"
              onClick={() => setCbDateOpen((o) => !o)}
              className={
                "flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors " +
                (cbDateOpen ? "border-accent" : "border-border")
              }
            >
              <span aria-hidden>📅</span>
              <span className={"min-w-0 flex-1 truncate text-sm font-bold " + (callDate ? "text-primary" : "text-muted-soft")}>
                {callDate ? fmtDate(callDate, lang) : lang === "th" ? "เลือกวันที่ (ภายใน 2 สัปดาห์)" : "Pick a date (within 2 weeks)"}
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
                  value={callDate || undefined}
                  onChange={setBookingDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  isDayDisabled={(iso) => days.length > 0 && !freeDates.has(iso)}
                  hideMascot
                />
              </div>
            </RevealBlock>
          </div>

          {/* time — free 30-min slots for the chosen date, checked against the team calendar */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-primary">
              {lang === "th" ? "เวลาที่สะดวก" : "Preferred time"}
              <span className="text-red-alert"> *</span>
            </span>
            {!callDate ? (
              <p className="rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-soft">
                {lang === "th" ? "เลือกวันก่อน" : "Pick a date first"}
              </p>
            ) : slotsLoading || slots === null ? (
              <p className="rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-soft">
                {lang === "th" ? "กำลังเช็คคิวว่าง…" : "Checking availability…"}
              </p>
            ) : slots.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-soft">
                {lang === "th" ? "วันนี้คิวเต็มแล้ว ลองเลือกวันอื่นนะครับ" : "This day is fully booked — please pick another date"}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onAnswer("q37", s.label)}
                    className={
                      "rounded-xl border px-2 py-2.5 text-sm font-bold transition-colors " +
                      (callTime === s.label
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-card text-primary hover:border-accent")
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-soft">
              {channel === "online"
                ? lang === "th"
                  ? "🎥 ทีมจะส่งลิงก์ประชุมออนไลน์ให้ทาง LINE ก่อนถึงเวลานัด"
                  : "🎥 We'll send the meeting link via LINE before your slot"
                : lang === "th"
                  ? "📞 ทีมจะโทรหาคุณตามวัน-เวลาที่เลือก"
                  : "📞 We'll call you at the time you pick"}
            </p>
          </div>
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
