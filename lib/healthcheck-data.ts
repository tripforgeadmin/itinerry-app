import { COUNTRIES } from "./countries";
import { bangkokNow } from "./holidays";

/**
 * Data + copy for the customer-facing "ผลตรวจสุขภาพวีซ่า" (Visa Health Check) card.
 *
 * The card itself renders in the ADMIN'S BROWSER (app/admin/healthcheck/[id]) — not
 * server-side: satori/ImageResponse cannot stack Thai tone marks over upper vowels
 * (ที่→ที, ตั๋ว→ตัว — verified empirically), and only a real browser shapes Thai
 * flawlessly. Printing uses the browser dialog; the LINE image (send flow) is produced
 * client-side from the same DOM and uploaded.
 *
 * Tone contract (owner decision): NO verdict, score, band, pricing, or internal decision
 * labels on the card — it's shareable and persistent. The verdict lives in the admin's
 * chat message that accompanies it. Countdown copy adapts to the days-left window,
 * computed fresh at render time (not from the stale submit-time engine run).
 */

export interface HealthcheckData {
  ticketId: string;
  lang: "th" | "en";
  customerName: string; // already prefixed: "คุณ Ploy" / "Khun Ploy"
  destCode: string; // alpha-2 lower, for the flag chip
  destName: string;
  visaLabel: string;
  slot3Label: string;
  slot3Value: string;
  travelLabel: string; // "ต.ค. 2569 · อีก ~3 เดือน"
  daysLeft: number | null;
  strengths: string[];
  improvements: string[];
  notes: string;
  evaluatedAt: string | null; // ISO — the badge shows date AND time of evaluation
}

export function t(lang: "th" | "en", th: string, en: string): string {
  return lang === "th" ? th : en;
}

export function countdownCopy(lang: "th" | "en", daysLeft: number | null) {
  if (daysLeft === null || daysLeft < 0) {
    return {
      pill: t(lang, "เริ่มเตรียมได้เลย", "Start preparing now"),
      pillBg: "#e8f5ee", pillColor: "#1c7a4b",
      copy: t(
        lang,
        "ยังไม่ระบุวันเดินทางชัดเจน — เริ่มเตรียมเอกสารหลักไว้ก่อนได้เลย พร้อมเมื่อไหร่ก็ยื่นได้ทันที",
        "No fixed travel date yet — start preparing the core documents now so you can apply as soon as you're ready.",
      ),
    };
  }
  if (daysLeft >= 45) {
    return {
      pill: t(lang, "ช่วงเวลาดีสำหรับเริ่มเตรียม", "Great time to start"),
      pillBg: "#e8f5ee", pillColor: "#1c7a4b",
      copy: t(
        lang,
        "ช่วงเวลากำลังเหมาะ — เริ่มเตรียมเอกสารตอนนี้ ได้ครบแบบสบาย ๆ ไม่ต้องรีบ ยิ่งเริ่มไว ยิ่งมีเวลาทำเอกสารให้แน่น",
        "Perfect timing — start now and you can prepare everything comfortably. The earlier you start, the stronger your file gets.",
      ),
    };
  }
  if (daysLeft >= 30) {
    return {
      pill: t(lang, "ควรเริ่มเตรียมตอนนี้", "Start now"),
      pillBg: "#fdf3d7", pillColor: "#9a6a00",
      copy: t(
        lang,
        "เวลายังพอ แต่ไม่ควรรอ — เริ่มจัดเอกสารตอนนี้จะทันแบบไม่เหนื่อย ทีมช่วยเรียงลำดับให้ได้ว่าอะไรต้องทำก่อน",
        "There's still time, but don't wait — starting now keeps things stress-free. Our team can help you prioritise.",
      ),
    };
  }
  return {
    pill: t(lang, "เวลากระชั้น — ทีมช่วยเร่งได้", "Tight timeline — we can help"),
    pillBg: "#fdeae3", pillColor: "#b4451f",
    copy: t(
      lang,
      "เหลือเวลาไม่มาก — ต้องจัดลำดับเอกสารให้ถูกตั้งแต่วันแรก ทีมของเราเคยช่วยเคสเร่งแบบนี้มาแล้ว รีบทักมาคุยกัน",
      "Not much time left — the order you prepare documents in matters from day one. We've handled rush cases like this before.",
    ),
  };
}

// ------------------------------------------------------------------------ builder --

type Dict = Record<string, unknown>;
function one(v: unknown): Dict | null {
  return ((Array.isArray(v) ? v[0] : v) ?? null) as Dict | null;
}

const VISA_LABEL: Record<string, { th: string; en: string }> = {
  tourist: { th: "วีซ่าท่องเที่ยว", en: "Tourist visa" },
  visitor: { th: "วีซ่าเยี่ยมเยียน", en: "Visitor visa" },
  business: { th: "วีซ่าธุรกิจ", en: "Business visa" },
  student: { th: "วีซ่านักเรียน", en: "Student visa" },
  other: { th: "วีซ่าอื่น ๆ", en: "Other visa" },
};
const REL_LABEL: Record<string, { th: string; en: string }> = {
  family: { th: "ครอบครัว", en: "Family" }, relative: { th: "ญาติ", en: "Relative" },
  married: { th: "คู่สมรส", en: "Spouse" }, partner: { th: "แฟน", en: "Partner" },
  friend: { th: "เพื่อน", en: "Friend" },
};
const HOST_LABEL: Record<string, { th: string; en: string }> = {
  citizen_pr: { th: "Citizen / PR", en: "Citizen / PR" }, work_visa: { th: "Work Visa", en: "Work Visa" },
  student_visa: { th: "Student Visa", en: "Student Visa" }, not_sure: { th: "ไม่แน่ใจ", en: "Not sure" },
};
const INVITE_LABEL: Record<string, { th: string; en: string }> = {
  yes: { th: "มีแล้ว", en: "Received" }, requesting: { th: "กำลังจะขอ", en: "Being requested" },
  not_required: { th: "ไม่ต้องใช้", en: "Not required" },
};
const ACCEPT_LABEL: Record<string, { th: string; en: string }> = {
  received: { th: "ได้รับแล้ว", en: "Received" }, in_progress: { th: "อยู่ระหว่างสมัคร", en: "In progress" },
  not_applied: { th: "ยังไม่ได้สมัคร", en: "Not yet applied" },
};
const PAST_VISA_SHORT: Record<string, string> = {
  uk: "UK", schengen: "Schengen", usa: "USA", canada: "Canada", australia: "Australia",
  nz: "NZ", japan: "Japan", korea: "Korea", china: "China", dubai: "UAE",
};

/** Default report language: Thai nationals → Thai, everyone else → English. */
export function defaultLangFor(row: Dict): "th" | "en" {
  const account = one(row.account) ?? {};
  return account.nationality === "other" ? "en" : "th";
}

/**
 * Build from: select("*, account:account_id(full_name, nationality), trip:trip_id(*), visa_evaluation(*)").
 * `langOverride` forces the report language; without it, it follows nationality. Note the
 * admin-entered strengths/improvements/notes render as-typed — only the template copy translates.
 */
export function healthcheckFromDbRow(row: Dict, langOverride?: "th" | "en"): HealthcheckData {
  const account = one(row.account) ?? {};
  const trip = one(row.trip) ?? {};
  const ev = one(row.visa_evaluation) ?? {};
  const b = (row.branch_answers ?? {}) as Record<string, string | string[]>;

  const lang: "th" | "en" = langOverride ?? (account.nationality === "other" ? "en" : "th");
  const destCode = ((trip.destination as string) ?? "").toLowerCase();
  const country = COUNTRIES.find((c) => c.code.toLowerCase() === destCode);
  const destName = country ? (lang === "th" ? country.th : country.en) : destCode.toUpperCase();

  const visaType = (trip.visa_type as string) ?? "";
  const visa = VISA_LABEL[visaType] ?? { th: visaType, en: visaType };

  // customer display name — nickname-style: first token of what they typed, คุณ/Khun prefix
  const rawName = ((account.full_name as string) ?? "").trim();
  const firstName = rawName.split(/\s+/)[0] || "-";
  const customerName = lang === "th" ? `คุณ ${firstName}` : `Khun ${firstName}`;

  // per-visa-type third info cell
  let slot3Label = t(lang, "ประวัติวีซ่า 10 ปี", "Visa history (10y)");
  let slot3Value = t(lang, "ยังไม่เคยมี — เริ่มเคสแรกด้วยกัน", "First application — we'll build it together");
  const prior = Array.isArray(b.previous_visas) ? (b.previous_visas as string[]).filter((v) => v !== "never") : [];
  if (visaType === "visitor") {
    slot3Label = t(lang, "ผู้เชิญปลายทาง", "Your host");
    const rel = REL_LABEL[(b.visitor_relationship as string) ?? ""]?.[lang] ?? "-";
    const host = HOST_LABEL[(b.visitor_host_status as string) ?? ""]?.[lang] ?? "-";
    slot3Value = `${rel} · ${host}`;
  } else if (visaType === "business") {
    slot3Label = t(lang, "หนังสือเชิญ (Invitation)", "Invitation letter");
    slot3Value = INVITE_LABEL[(b.business_invitation_letter as string) ?? ""]?.[lang] ?? "-";
  } else if (visaType === "student") {
    slot3Label = "Acceptance Letter";
    slot3Value = ACCEPT_LABEL[(b.student_acceptance_letter as string) ?? ""]?.[lang] ?? "-";
  } else if (prior.length) {
    slot3Value = prior.map((v) => PAST_VISA_SHORT[v] ?? v.toUpperCase()).slice(0, 4).join(", ");
  }

  // travel window — computed fresh at render time (Bangkok), not from the submit-time run
  const arrivalIso = ((trip.travel_arrival ?? trip.study_start) as string | null)?.slice(0, 10) ?? null;
  let daysLeft: number | null = null;
  let travelLabel = t(lang, "ยังไม่ระบุ", "Not set yet");
  if (arrivalIso) {
    const today = bangkokNow().iso;
    daysLeft = Math.round((Date.parse(`${arrivalIso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    const monthLabel = new Date(`${arrivalIso}T00:00:00`).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { month: "short", year: "numeric" });
    const rel =
      daysLeft < 0
        ? t(lang, "ผ่านมาแล้ว", "passed")
        : daysLeft < 45
          ? t(lang, `อีก ${daysLeft} วัน`, `in ${daysLeft} days`)
          : t(lang, `อีก ~${Math.round(daysLeft / 30)} เดือน`, `in ~${Math.round(daysLeft / 30)} months`);
    travelLabel = `${monthLabel} · ${rel}`;
  }

  return {
    ticketId: (row.ticket_id as string) || "—",
    lang,
    customerName,
    destCode,
    destName,
    visaLabel: visa[lang],
    slot3Label,
    slot3Value,
    travelLabel,
    daysLeft,
    strengths: Array.isArray(ev.strengths) ? (ev.strengths as string[]) : [],
    improvements: Array.isArray(ev.improvements) ? (ev.improvements as string[]) : [],
    notes: ((ev.notes as string) ?? "").trim(),
    evaluatedAt: (ev.updated_at as string) ?? null,
  };
}
