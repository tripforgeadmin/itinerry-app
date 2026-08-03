import { supabase } from "./supabase";

/**
 * Inbound LINE media capture — download customer-sent image/video/audio/file binaries
 * the moment the webhook sees them (LINE's content API is the ONLY window; there is no
 * retroactive fetch) and park them in the private `line-media` bucket.
 *
 * Failure posture mirrors message-log: never throw. A failed download degrades to a
 * text-only log row (`[รูป]` etc.) — losing a preview must not 500 the webhook, which
 * would make LINE mark the endpoint unhealthy.
 */

const CONTENT_URL = (id: string) => `https://api-data.line.me/v2/bot/message/${id}/content`;
const TRANSCODING_URL = (id: string) =>
  `https://api-data.line.me/v2/bot/message/${id}/content/transcoding`;

export const LINE_MEDIA_BUCKET = "line-media";
const MAX_BYTES = 25 * 1024 * 1024; // keep the webhook invocation lean; larger files log text-only

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "video/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

function extFor(contentType: string, fileName?: string): string {
  const fromName = fileName?.includes(".") ? fileName.split(".").pop() : undefined;
  return EXT_BY_MIME[contentType] ?? (fromName || "bin").toLowerCase().slice(0, 8);
}

function getToken() {
  const token = process.env.LINE_MESSAGING_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_MESSAGING_ACCESS_TOKEN is not set");
  return token;
}

/** Video/audio go through LINE-side transcoding before the binary is downloadable;
 * poll briefly instead of failing on the race. Images/files skip this entirely. */
async function waitForTranscoding(messageId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(TRANSCODING_URL(messageId), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return false;
    const { status } = (await res.json()) as { status?: string };
    if (status === "succeeded") return true;
    if (status === "failed") return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false; // still processing after ~6s — give up, keep the webhook fast
}

/**
 * Download one message's binary from LINE and store it at
 * `{accountId}/{messageId}.{ext}` in the line-media bucket.
 * Returns the stored path + MIME type, or null when anything prevented capture.
 */
export async function storeInboundMedia(args: {
  accountId: string;
  messageId: string;
  messageType: string; // image | video | audio | file
  fileName?: string;
}): Promise<{ path: string; contentType: string } | null> {
  try {
    if (args.messageType === "video" || args.messageType === "audio") {
      const ready = await waitForTranscoding(args.messageId);
      if (!ready) return null;
    }

    const res = await fetch(CONTENT_URL(args.messageId), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      console.error("line content fetch failed:", res.status, await res.text());
      return null;
    }

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      console.error(`line media too large (${declared} bytes), skipping:`, args.messageId);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      console.error(`line media too large (${buf.byteLength} bytes), skipping:`, args.messageId);
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const path = `${args.accountId}/${args.messageId}.${extFor(contentType, args.fileName)}`;

    const { error } = await supabase.storage
      .from(LINE_MEDIA_BUCKET)
      .upload(path, buf, { contentType, upsert: true }); // webhook redelivery re-uploads the same path
    if (error) {
      console.error("line media upload error:", error);
      return null;
    }
    return { path, contentType };
  } catch (err) {
    console.error("storeInboundMedia error:", err);
    return null;
  }
}
