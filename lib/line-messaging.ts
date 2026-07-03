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

/** Post-submit thank-you note carrying the case ticket id. */
export function assessmentReceivedMessage(ticketId: string) {
  return {
    type: "text",
    text:
      `🙏 ขอขอบคุณที่ทำแบบประเมินกับ itinerry เราได้รับข้อมูลเบื้องต้นแล้ว ✅\n\n` +
      `🔖 หมายเลขอ้างอิงของคุณคือ\n${ticketId}\n\n` +
      `⏱️ เราจะส่งผลประเมินให้คุณภายใน 24 ชั่วโมง\n\n` +
      `💬 หากคุณลูกค้ามีข้อสอบถามหรือความต้องการเพิ่มเติม สามารถทักแชทได้เลยครับ`,
  };
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
