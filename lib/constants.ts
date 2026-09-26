export const LINE_OA_ID = "@448yxrvh";
export const LINE_OA_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
export const LINE_OA_QR = `https://qr-official.line.me/gs/M_448yxrvh_GW.png`;
// Main LIFF app — its endpoint URL is the SITE ROOT (app/page.tsx forwards to /auth). LIFF_URL,
// LIFF_DEEPLINK and the "open in LINE" hand-off links (lib/line-browser.ts) all derive from it.
export const LIFF_MAIN_ID = "2010501982-WP4YVZn2";
export const LIFF_URL = `https://liff.line.me/${LIFF_MAIN_ID}`;
export const LIFF_DEEPLINK = `line://app/${LIFF_MAIN_ID}`;

export const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
export const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
export const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const LINE_CALLBACK_URL = `${APP_URL}/api/auth/callback`;
