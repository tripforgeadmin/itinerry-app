"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { shareCardFlex } from "@/lib/line-flex";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "2010501982-WP4YVZn2";

/**
 * LIFF /share — opens the shareTargetPicker immediately with the same Flex card the OA sends,
 * so recipients can keep sharing (viral loop). Closes itself inside LINE when done. Anything
 * that goes wrong (picker not enabled, opened outside LINE without SSO, old LINE version)
 * lands on the "unavailable" state instead of crashing.
 */
export default function SharePage() {
  const [status, setStatus] = useState<"loading" | "unavailable" | "done">("loading");

  useEffect(() => {
    (async () => {
      try {
        await liff.init({
          liffId: LIFF_ID,
          withLoginOnExternalBrowser: true,
        });

        if (!liff.isApiAvailable("shareTargetPicker")) {
          setStatus("unavailable");
          return;
        }

        // Best-effort: show the sharer's own nationality-matched card. Any failure
        // here (no profile scope, network error, unknown account) falls back to Thai
        // rather than blocking the share.
        let lang: "th" | "en" = "th";
        try {
          const profile = await liff.getProfile();
          const res = await fetch(`/api/share-lang?lineUserId=${profile.userId}`);
          const data = await res.json();
          if (data.lang === "en") lang = "en";
        } catch (err) {
          console.error("share-lang lookup error:", err);
        }

        await liff.shareTargetPicker(
          // cast: the SDK wants its literal message types; our builder returns plain JSON
          [shareCardFlex(lang)] as Parameters<typeof liff.shareTargetPicker>[0],
          { isMultiple: true }
        );
        setStatus("done");
        if (liff.isInClient()) liff.closeWindow();
      } catch (err) {
        console.error("share page error:", err);
        setStatus("unavailable");
      }
    })();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/itin_main.png" alt="" className="h-28 w-28 object-contain" />
        {status === "loading" && (
          <>
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm font-semibold text-muted">กำลังเปิดหน้าแชร์…</p>
          </>
        )}
        {status === "done" && (
          <p className="text-base font-bold text-primary">แชร์เรียบร้อย ขอบคุณที่บอกต่อ 💙</p>
        )}
        {status === "unavailable" && (
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            เปิดหน้านี้ในแอป LINE แล้วลองอีกครั้ง
            <br />
            หรืออัปเดตแอป LINE เป็นเวอร์ชันล่าสุด
          </p>
        )}
      </div>
    </main>
  );
}
