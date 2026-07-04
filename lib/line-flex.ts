import { APP_URL, LIFF_URL } from "./constants";

/**
 * Post-submit "thank you" Flex card — first of two messages pushed right after a customer
 * completes the assessment (see app/api/submit/route.ts). Distinct from shareCardFlex below,
 * which is the standalone share-loop card re-sent from /share and the follow-webhook.
 */

const RESULT_URL = `${APP_URL}/result`;
const START_URL = APP_URL;

// Button action labels are capped at 20 characters by LINE's Messaging API —
// keep these short even when the source copy is longer.
const RECEIVED_TEXTS = {
  th: {
    alt: "ขอบคุณที่ทำแบบประเมินกับ itinerry",
    thanks: "🙏 ขอขอบคุณที่ทำแบบประเมินกับ itinerry เราได้รับข้อมูลเบื้องต้นแล้ว ✅",
    ticketLabel: "🔖 Ticket ID:",
    shareIntro: "คุณสามารถแชร์แอปการประเมินให้เพื่อนที่เดินทางกับคุณได้ที่",
    viewAnswers: "ดูคำตอบที่ส่งไป",
    share: "แชร์ให้เพื่อน",
  },
  en: {
    alt: "Thank you for completing the itinerry assessment",
    thanks: "🙏 Thank you for completing the itinerry assessment — we have received your information ✅",
    ticketLabel: "🔖 Ticket ID:",
    shareIntro: "You can share the assessment app with friends traveling with you at",
    viewAnswers: "View my answers",
    share: "Share with friends",
  },
} as const;

export function assessmentReceivedFlex(ticketId: string, lang: "th" | "en" = "th") {
  const t = RECEIVED_TEXTS[lang];
  return {
    type: "flex",
    altText: t.alt,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "image",
            url: `${APP_URL}/approve.png`,
            size: "sm",
            aspectRatio: "1:1",
            aspectMode: "fit",
            align: "center",
          },
          { type: "text", text: t.thanks, size: "sm", wrap: true, color: "#1b3d5c" },
          { type: "text", text: `${t.ticketLabel} ${ticketId}`, size: "sm", weight: "bold", color: "#1b3d5c" },
          { type: "text", text: t.shareIntro, size: "xs", color: "#8A94A6", wrap: true, margin: "md" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#44a8db",
            action: { type: "uri", label: t.viewAnswers, uri: RESULT_URL },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "uri", label: t.share, uri: START_URL },
          },
        ],
      },
    },
  };
}

/**
 * Shared Flex share card — sent by the OA (follow-webhook reply) AND re-sent by users via the
 * /share LIFF page's shareTargetPicker, so recipients can keep the loop going.
 *
 * shareTargetPicker constraint: every action MUST be a URI action (postback/message actions are
 * rejected) — so both buttons are links.
 */

const DEFAULT_LIFF_ID = "2010501982-WP4YVZn2"; // original LIFF app whose endpoint is the site root

// Where the "แชร์ให้เพื่อน" button points. Default LIFF app has a root endpoint, so the /share
// path is appended. If the owner creates a DEDICATED LIFF app whose endpoint already IS /share,
// set NEXT_PUBLIC_LIFF_ID to its id — no path is appended then (per LIFF endpoint semantics).
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? DEFAULT_LIFF_ID;
export const SHARE_LIFF_URL =
  LIFF_ID === DEFAULT_LIFF_ID ? `${LIFF_URL}/share` : `https://liff.line.me/${LIFF_ID}`;

// ?ref=line-share → GA (already installed) can segment traffic arriving from shared cards.
const OPEN_APP_URL = `${APP_URL}/?ref=line-share`;

const TEXTS = {
  th: {
    alt: "itinerry — เช็คโอกาสผ่านวีซ่าฟรี ใน 3 นาที",
    title: "เช็คโอกาสผ่านวีซ่าของคุณ ฟรี!",
    subtitle: "ตอบคำถามสั้นๆ 3 นาที ผู้เชี่ยวชาญวิเคราะห์ รู้ผลใน 24 ชม.",
    open: "เปิดแอป",
    share: "แชร์ให้เพื่อน",
  },
  en: {
    alt: "itinerry — free visa eligibility check in 3 minutes",
    title: "Check your visa chances — free!",
    subtitle: "A 3-minute questionnaire, reviewed by experts, results within 24 hours",
    open: "Open app",
    share: "Share with friends",
  },
} as const;

export function shareCardFlex(lang: "th" | "en" = "th") {
  const t = TEXTS[lang];
  return {
    type: "flex",
    altText: t.alt,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: `${APP_URL}/line/share-card.png`,
        size: "full",
        aspectRatio: "16:9",
        aspectMode: "cover",
        action: { type: "uri", uri: OPEN_APP_URL },
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: t.title, weight: "bold", size: "lg", wrap: true, color: "#1b3d5c" },
          { type: "text", text: t.subtitle, size: "sm", color: "#8A94A6", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#44a8db",
            action: { type: "uri", label: t.open, uri: OPEN_APP_URL },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "uri", label: t.share, uri: SHARE_LIFF_URL },
          },
        ],
      },
    },
  };
}
