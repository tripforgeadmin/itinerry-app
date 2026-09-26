// LINE-app-only policy: the customer questionnaire runs ONLY inside the LINE app's in-app/LIFF
// browser. proxy.ts enforces it server-side (non-LINE requests to /q, /done, /result and
// /api/auth/login bounce to /auth); app/auth/page.tsx then shows the hand-off screen — a deep
// link into LINE on mobile (incl. the Facebook/Instagram/TikTok in-app browsers ads open in), a
// QR code on desktop (LINE PC opens links in the system browser, so it counts as desktop).
//
// PURE MODULE — functions over a UA string, no window access at import time, so both the proxy
// and client components can import it, and node --test can too (lib/line-browser.test.ts).

// .ts extension so node --test resolves it without a bundler (see lib/quote-math.ts).
import { LIFF_MAIN_ID } from "./constants.ts";

export type InAppBrowser = "messenger" | "facebook" | "instagram" | "tiktok";

// Production/preview builds always enforce. Local `next dev` stays permissive so the team can
// test /q on desktop; set NEXT_PUBLIC_ENFORCE_LINE_APP=true in .env.local to enforce locally.
export const LINE_APP_ONLY =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENFORCE_LINE_APP === "true";

/** LINE's in-app / LIFF browser — iOS "… Safari Line/13.x", Android "… Line/13.x/IAB". */
export function isLineInAppUA(ua: string): boolean {
  return /\bLine\//i.test(ua);
}

/** Non-LINE in-app browsers that ad clicks open in; null for everything else. Messenger is
 * checked BEFORE Facebook — its UA also carries FBAN (iOS: FBAN/MessengerForiOS) / FB_IAB
 * (Android: FB_IAB/MESSENGER, older FB_IAB/Orca-Android). Instagram too, in case its UA ever
 * picks up an FBAV token. */
export function detectInAppBrowser(ua: string): InAppBrowser | null {
  if (/MessengerForiOS|FB_IAB\/(MESSENGER|Orca-Android)/i.test(ua)) return "messenger";
  if (/Instagram/.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) return "facebook";
  if (/musical_ly|BytedanceWebview|TikTok|trill_/i.test(ua)) return "tiktok";
  return null;
}

/** Phone/tablet by UA alone. iPadOS reports a desktop Mac UA, and Android Chrome's "Desktop site"
 * an X11 Linux one — client code additionally treats those + navigator.maxTouchPoints > 1 as
 * mobile (app/auth/page.tsx). */
export function isMobileUA(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export function isAndroidUA(ua: string): boolean {
  return /Android/i.test(ua);
}

const withQuery = (base: string, qs: string) => (qs ? `${base}?${qs}` : base);

/** https LIFF URL — for the desktop QR code and "copy link" (opens LINE from a chat or camera). */
export function liffHttpsUrl(qs = ""): string {
  return withQuery(`https://liff.line.me/${LIFF_MAIN_ID}`, qs);
}

/** line:// scheme deep link — iOS and generic mobile. */
export function lineSchemeUrl(qs = ""): string {
  return withQuery(`line://app/${LIFF_MAIN_ID}`, qs);
}

/** Android intent:// deep link — Chrome and most Android in-app browsers won't follow a bare
 * line:// link, but do hand an intent URL to the LINE package. */
export function androidIntentUrl(qs = ""): string {
  return `${withQuery(`intent://app/${LIFF_MAIN_ID}`, qs)}#Intent;scheme=line;package=jp.naver.line.android;end`;
}
