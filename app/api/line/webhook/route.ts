import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json({ ok: true });
}
import { supabase } from "@/lib/supabase";
import { replyMessage, confirmDeleteMessage } from "@/lib/line-messaging";
import { anonymizeAccount } from "@/lib/anonymize";

const TRIGGER_KEYWORDS = ["ยกเลิกข้อมูล", "ลบข้อมูล", "pdpa", "ถอนความยินยอม"];

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET ?? "";
  const hash = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { events = [] } = JSON.parse(rawBody);

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    // User sent a message — check for trigger keywords
    if (event.type === "message" && event.message?.type === "text") {
      const text = (event.message.text as string).toLowerCase().trim();
      const isDeleteRequest = TRIGGER_KEYWORDS.some((k) => text.includes(k));
      if (isDeleteRequest) {
        await replyMessage(event.replyToken, [confirmDeleteMessage()]);
      }
    }

    // User tapped a button (postback)
    if (event.type === "postback") {
      const action = new URLSearchParams(event.postback?.data ?? "").get("action");

      if (action === "pdpa_delete") {
        const { data: account } = await supabase
          .from("account")
          .select("id")
          .eq("line_user_id", userId)
          .single();

        if (!account) {
          await replyMessage(event.replyToken, [{
            type: "text",
            text: "ไม่พบข้อมูลของคุณในระบบ หรืออาจถูกลบไปแล้วครับ",
          }]);
          continue;
        }

        await anonymizeAccount(account.id);

        await replyMessage(event.replyToken, [{
          type: "text",
          text: "✅ ลบข้อมูลส่วนตัวของคุณออกจากระบบเรียบร้อยแล้วครับ\n\nหากต้องการใช้บริการอีกครั้ง สามารถกรอกแบบฟอร์มใหม่ได้เลย",
        }]);
      }

      if (action === "pdpa_cancel") {
        await replyMessage(event.replyToken, [{
          type: "text",
          text: "ยกเลิกแล้วครับ ข้อมูลของคุณยังคงอยู่ในระบบ 😊",
        }]);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
