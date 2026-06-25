export const LINE_OA_ID = "@448yxrvh";
export const LINE_OA_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;
export const LINE_OA_QR = `https://qr-official.line.me/gs/M_448yxrvh_GW.png`;

export const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
export const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
export const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const LINE_CALLBACK_URL = `${APP_URL}/api/auth/callback`;
