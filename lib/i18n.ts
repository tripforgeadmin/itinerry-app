// Shared, dependency-free i18n primitives for the admin area. Client- AND server-safe
// (no next/headers import here — that lives in lib/admin-lang.ts).

export type Lang = "th" | "en";

export const ADMIN_LANG_COOKIE = "admin_lang";

/** Pick a string by language. Mirrors t() in lib/healthcheck-data.ts. */
export function t(lang: Lang, th: string, en: string): string {
  return lang === "th" ? th : en;
}

/** toLocaleDateString/String locale for the active language. */
export function dateLocale(lang: Lang): string {
  return lang === "th" ? "th-TH" : "en-GB";
}
