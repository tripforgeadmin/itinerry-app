const REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const PUSH_URL = "https://api.line.me/v2/bot/message/push";

function getToken() {
  const token = process.env.LINE_MESSAGING_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_MESSAGING_ACCESS_TOKEN is not set");
  return token;
}

export async function replyMessage(replyToken: string, messages: object[]) {
  const res = await fetch(REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    console.error("LINE reply error:", await res.text());
  }
}

/** Proactive push to a user (requires the user to be a friend of the OA — LINE rejects pushes
 * to non-friends, so callers should treat failures as expected/best-effort). Returns whether
 * LINE accepted the message, so callers can record actual delivery. */
export async function pushMessage(to: string, messages: object[]): Promise<boolean> {
  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    console.error("LINE push error:", await res.text());
  }
  return res.ok;
}

// The post-submit promise: our specialist contacts the customer back within 2 days. "2 days"
// is SLA_HOURS (48h, calendar time) in lib/status.ts — the same window the admin due date
// uses; lib/line-messaging.test.ts fails if the two drift apart.
const CONTACT_BACK_TH = "⏱️ ทีมผู้เชี่ยวชาญของเราจะติดต่อกลับภายใน 2 วัน";
const CONTACT_BACK_EN = "⏱️ Our specialist will get back to you within 2 days";

/** Post-submit thank-you note carrying the case ticket id (sent by the follow-webhook to
 * customers who add the OA as a friend only after submitting). English for non-Thai nationals
 * (q4 = "other"), Thai otherwise. `displayName` is the customer's LINE display name — shown
 * in the Thai copy in place of the generic "คุณลูกค้า" when available. */
export function assessmentReceivedMessage(ticketId: string, lang: "th" | "en" = "th", displayName?: string | null) {
  const name = displayName?.trim();
  const addressTh = name ? `คุณ ${name}` : "คุณลูกค้า";
  const text =
    lang === "en"
      ? `🙏 Thank you for completing the itinerry assessment — we have received your information ✅\n\n` +
        `🔖 Your reference number is\n${ticketId}\n\n` +
        `${CONTACT_BACK_EN}\n\n` +
        `💬 If you have any questions or further requests, feel free to chat with us anytime`
      : `🙏 ขอขอบคุณที่ทำแบบประเมินกับ itinerry เราได้รับข้อมูลเบื้องต้นแล้ว ✅\n\n` +
        `🔖 หมายเลขอ้างอิงของคุณคือ\n${ticketId}\n\n` +
        `${CONTACT_BACK_TH}\n\n` +
        `💬 หาก${addressTh}มีข้อสอบถามหรือความต้องการเพิ่มเติม สามารถทักแชทได้เลยครับ`;
  return { type: "text", text };
}

/** Agent-triggered assessment-result push, sent once a case is marked
 * ประเมินแล้ว (evaluated). English for non-Thai nationals, Thai otherwise. */
export function assessmentResultMessage(pass: boolean, notes: string, lang: "th" | "en" = "th") {
  const text =
    lang === "en"
      ? pass
        ? `✅ Good news! Based on our assessment, your visa has a good chance of approval\n\n` +
          `📝 ${notes}\n\n` +
          `💬 Feel free to chat with us if you have any questions or want to proceed`
        : `📋 We've finished assessing your information — there are a few things worth preparing before you apply\n\n` +
          `📝 ${notes}\n\n` +
          `💬 Feel free to chat with us, our team is happy to help improve your chances`
      : pass
        ? `✅ ข่าวดี! จากการประเมินของเรา วีซ่าของคุณมีโอกาสผ่านค่อนข้างสูง\n\n` +
          `📝 ${notes}\n\n` +
          `💬 ทักแชทมาได้เลยหากมีคำถามหรือต้องการดำเนินการต่อ`
        : `📋 เราประเมินข้อมูลของคุณเสร็จแล้ว มีบางจุดที่ควรเตรียมเพิ่มก่อนยื่นวีซ่า\n\n` +
          `📝 ${notes}\n\n` +
          `💬 ทักแชทมาได้เลย ทีมงานยินดีช่วยเพิ่มโอกาสผ่านให้คุณ`;
  return { type: "text", text };
}

/** Second message of the post-submit pair — sent alongside assessmentReceivedFlex (lib/line-flex.ts).
 * The thank-you + ticket id already live in that Flex card, so this is the first-line promise
 * (our specialist contacts you back within 2 days — the customer no longer books a consultation
 * slot), contact info, and a share nudge. `displayName` is the customer's LINE display name —
 * shown in the Thai copy in place of the generic "คุณลูกค้า" when available. */
export function assessmentFollowUpMessage(lang: "th" | "en" = "th", displayName?: string | null) {
  const name = displayName?.trim();
  const addressTh = name ? `คุณ ${name}` : "คุณลูกค้า";
  const text =
    lang === "en"
      ? `${CONTACT_BACK_EN}\n\n` +
        `💬 If you have any questions or further requests, feel free to chat with us anytime\n\n` +
        `📲 You can share the assessment app with fellow travellers or anyone who's interested`
      : `${CONTACT_BACK_TH}\n\n` +
        `💬 หาก${addressTh}มีข้อสอบถามหรือความต้องการเพิ่มเติม สามารถทักแชทได้เลยนะครับ\n\n` +
        `📲 ${addressTh}สามารถแชร์แอปการประเมินให้เพื่อนร่วมเดินทางหรือผู้ที่สนใจได้ครับ`;
  return { type: "text", text };
}

/**
 * Sales follow-up nudge auto-sent by the follow-up cron while a case sits in `follow_up`.
 * attempt 1 = day-3 gentle check-in, attempt 2 = day-5 last nudge. Copy approved by the owner.
 */
export function salesFollowUpMessage(attempt: 1 | 2, lang: "th" | "en" = "th") {
  const text =
    attempt === 1
      ? lang === "en"
        ? "Hi 🙂 The itinerry team is following up on your visa assessment — is there anything else we can help with? If you're ready to start preparing documents or want an in-depth review, just message us back. We'll walk you through it step by step 💙"
        : "สวัสดีครับ 🙂 ทีม itinerry ติดตามผลการประเมินวีซ่าของคุณนะครับ — มีอะไรให้เราช่วยเพิ่มเติมไหมครับ? ถ้าพร้อมเริ่มเตรียมเอกสาร หรืออยากปรึกษาเชิงลึก ทักกลับมาได้เลย ทีมช่วยดูให้ทีละขั้นครับ 💙"
      : lang === "en"
        ? "Hi again from itinerry 🙂 In case you're still considering your visa — we can still help you plan and prepare your documents. If you'd like to continue, just message us back. Happy to help 💙"
        : "itinerry ทักมาอีกครั้งนะครับ 🙂 เผื่อคุณยังสนใจยื่นวีซ่า เรายังช่วยวางแผนเตรียมเอกสารให้ได้อยู่ครับ ถ้าสะดวกคุยต่อ ทักกลับมาได้เลย ยินดีช่วยเต็มที่ครับ 💙";
  return { type: "text", text };
}

export function confirmDeleteMessage() {
  return {
    type: "template",
    altText: "ยืนยันการลบข้อมูลส่วนตัว",
    template: {
      type: "confirm",
      text: "🔐 คำขอลบข้อมูลส่วนบุคคล (PDPA)\n\nเราได้รับคำขอถอนความยินยอมของคุณ\nข้อมูลส่วนบุคคล อาทิ ชื่อ เบอร์โทร อีเมล และบัญชี LINE จะถูกลบออกจากระบบอย่างถาวร\n\nหากยืนยัน คุณจะไม่สามารถรับบริการต่อเนื่องได้ และไม่สามารถกู้คืนข้อมูลได้",
      actions: [
        { type: "postback", label: "ยืนยัน ลบข้อมูล", data: "action=pdpa_delete" },
        { type: "postback", label: "ยกเลิก", data: "action=pdpa_cancel" },
      ],
    },
  };
}
