const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

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
