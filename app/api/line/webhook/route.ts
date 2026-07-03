import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  return NextResponse.json({ ok: true });
}
import { supabase } from "@/lib/supabase";
import { replyMessage, confirmDeleteMessage, assessmentReceivedMessage } from "@/lib/line-messaging";
import { anonymizeAccount } from "@/lib/anonymize";

/** Follow (add friend / unblock): freshen is_friend, then deliver the ticket thank-you message the
 * submit-time push couldn't send (LINE rejects pushes to non-friends). Claim-before-send on
 * ticket_notified_at keeps this idempotent across repeated follow events. */
async function handleFollow(userId: string, replyToken?: string) {
  await supabase.from("account").update({ is_friend: true }).eq("line_user_id", userId);

  const { data: account } = await supabase
    .from("account")
    .select("id")
    .eq("line_user_id", userId)
    .maybeSingle();
  if (!account) return;

  const { data: pending } = await supabase
    .from("user_assessment")
    .select("id, ticket_id")
    .eq("account_id", account.id)
    .not("ticket_id", "is", null)
    .is("ticket_notified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pending?.ticket_id || !replyToken) return;

  // atomic claim — only the first follow event for this assessment gets to send
  const { data: claimed } = await supabase
    .from("user_assessment")
    .update({ ticket_notified_at: new Date().toISOString() })
    .eq("id", pending.id)
    .is("ticket_notified_at", null)
    .select("id");
  if (!claimed?.length) return;

  await replyMessage(replyToken, [assessmentReceivedMessage(pending.ticket_id as string)]);
}

const TRIGGER_KEYWORDS = ["ยกเลิกข้อมูล", "ลบข้อมูล", "pdpa", "ถอนความยินยอม"];

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET ?? "";
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

    // User added the OA as a friend (or unblocked) — deliver any pending ticket message
    if (event.type === "follow") {
      try {
        await handleFollow(userId, event.replyToken);
      } catch (err) {
        console.error("follow handler error:", err);
      }
      continue;
    }

    // User blocked/removed the OA — keep is_friend accurate for the team
    if (event.type === "unfollow") {
      try {
        await supabase.from("account").update({ is_friend: false }).eq("line_user_id", userId);
      } catch (err) {
        console.error("unfollow handler error:", err);
      }
      continue;
    }

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
