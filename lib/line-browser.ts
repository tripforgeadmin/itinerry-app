// Device policy for the customer questionnaire (/q, /done, /result):
//  - Inside the LINE app's in-app/LIFF browser: the normal /auth landing + login.
//  - Phones and tablets OUTSIDE LINE (Safari/Chrome, and the Facebook/Messenger/Instagram/TikTok
//    in-app browsers ads open in) are handed off into the LINE app: /auth shows a line:// /
//    intent:// deep link instead of a login button. proxy.ts enforces it server-side by UA
//    (requiresLineHandoffUA — /q, /done, /result and /api/auth/login bounce to /auth);
//    components/LineHandoffGuard.tsx closes the gap for tablets that send a desktop UA (iPadOS,
//    Android "Desktop site"), which only the client can spot (isMobileDevice).
//  - Desktop (Windows/Mac/Linux, incl. LINE PC, which opens links in the system browser) is
//    allowed: /auth offers a choice — log in with LINE (the standard OAuth web page, QR or email;
//    the session stays in the desktop tab) and do it on this computer, or scan a QR of the LIFF
//    link to continue on the phone in the LINE app.
//
// PURE MODULE — functions over a UA string, no window access at import time, so both the proxy
// and client components can import it, and node --test can too (lib/line-browser.test.ts).

// .ts extension so node --test resolves it without a bundler (see lib/quote-math.ts).
import { LIFF_MAIN_ID } from "./constants.ts";

export type InAppBrowser = "messenger" | "facebook" | "instagram" | "tiktok";

// On/off switch for the phone/tablet → LINE app rule (desktop is allowed either way). Production/
// preview builds always enforce. Local `next dev` stays permissive so the team can test /q in a
// mobile browser or emulator; set NEXT_PUBLIC_ENFORCE_LINE_APP=true in .env.local to enforce locally.
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
 * an X11 Linux one — client code uses isMobileDevice, which also catches those. */
export function isMobileUA(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export function isAndroidUA(ua: string): boolean {
  return /Android/i.test(ua);
}

/** SERVER-side hand-off decision (proxy.ts): a phone/tablet outside the LINE app, by UA tokens.
 * Every in-app browser ads open in carries iPhone/iPad/Android, so those are covered; tablets
 * sending a desktop UA are not — LineHandoffGuard catches them client-side (isMobileDevice). */
export function requiresLineHandoffUA(ua: string): boolean {
  return !isLineInAppUA(ua) && isMobileUA(ua);
}

// Android Chrome's "Desktop site" (the default on large tablets) sends an X11 Linux UA with no
// Android/Mobile token — a touch-capable Linux that isn't ChromeOS is an Android device.
function isAndroidDesktopSite(ua: string, maxTouchPoints: number): boolean {
  return /X11; Linux/.test(ua) && !/CrOS/.test(ua) && maxTouchPoints > 1;
}

/** CLIENT-side phone/tablet check — pass navigator.maxTouchPoints. isMobileUA, plus the tablets
 * that send a desktop UA: iPadOS Safari/Chrome (a touch-capable "Macintosh" — real Macs report 0
 * touch points) and Android "Desktop site". Windows touch laptops and Chromebooks stay desktop. */
export function isMobileDevice(ua: string, maxTouchPoints: number): boolean {
  return (
    isMobileUA(ua) ||
    (/Macintosh/.test(ua) && maxTouchPoints > 1) ||
    isAndroidDesktopSite(ua, maxTouchPoints)
  );
}

/** Android by UA, or Android "Desktop site" — picks the intent:// deep link over line://. */
export function isAndroidDevice(ua: string, maxTouchPoints: number): boolean {
  return isAndroidUA(ua) || isAndroidDesktopSite(ua, maxTouchPoints);
}

const withQuery = (base: string, qs: string) => (qs ? `${base}?${qs}` : base);

/** https LIFF URL — for the desktop "continue on your phone" QR code and "copy link" (opens LINE
 * from a chat or camera). */
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
