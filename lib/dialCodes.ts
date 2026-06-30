// Curated international dial codes for the contact phone field. `min`/`max` bound the number of
// LOCAL digits (national number, leading trunk "0" stripped) for a light per-country length check.
export interface DialCode {
  code: string; // e.g. "+66"
  iso: string; // ISO-3166 alpha-2 (upper) — for flagEmoji
  th: string;
  en: string;
  min: number;
  max: number;
}

export const DIAL_CODES: DialCode[] = [
  { code: "+66", iso: "TH", th: "ไทย", en: "Thailand", min: 9, max: 9 },
  { code: "+1", iso: "US", th: "สหรัฐฯ / แคนาดา", en: "USA / Canada", min: 10, max: 10 },
  { code: "+44", iso: "GB", th: "สหราชอาณาจักร", en: "United Kingdom", min: 9, max: 10 },
  { code: "+61", iso: "AU", th: "ออสเตรเลีย", en: "Australia", min: 9, max: 9 },
  { code: "+64", iso: "NZ", th: "นิวซีแลนด์", en: "New Zealand", min: 8, max: 10 },
  { code: "+65", iso: "SG", th: "สิงคโปร์", en: "Singapore", min: 8, max: 8 },
  { code: "+81", iso: "JP", th: "ญี่ปุ่น", en: "Japan", min: 9, max: 10 },
  { code: "+82", iso: "KR", th: "เกาหลีใต้", en: "South Korea", min: 9, max: 10 },
  { code: "+86", iso: "CN", th: "จีน", en: "China", min: 11, max: 11 },
  { code: "+91", iso: "IN", th: "อินเดีย", en: "India", min: 10, max: 10 },
  { code: "+49", iso: "DE", th: "เยอรมนี", en: "Germany", min: 10, max: 11 },
  { code: "+33", iso: "FR", th: "ฝรั่งเศส", en: "France", min: 9, max: 9 },
  { code: "+971", iso: "AE", th: "สหรัฐอาหรับเอมิเรตส์", en: "UAE", min: 8, max: 9 },
  { code: "+852", iso: "HK", th: "ฮ่องกง", en: "Hong Kong", min: 8, max: 8 },
  { code: "+886", iso: "TW", th: "ไต้หวัน", en: "Taiwan", min: 9, max: 9 },
];

export const DEFAULT_DIAL_CODE = "+66";

export function dialCodeOf(code: string): DialCode | undefined {
  return DIAL_CODES.find((d) => d.code === code);
}

/** Validate the LOCAL part for a dial code. Strips spaces/dashes and a single leading trunk "0",
 * then checks the digit count against the code's range (generic 7–14 when unknown). */
export function isValidPhone(code: string, local: string): boolean {
  const digits = local.replace(/[\s\-()]/g, "").replace(/^0/, "");
  if (!/^\d+$/.test(digits)) return false;
  const d = dialCodeOf(code);
  const min = d?.min ?? 7;
  const max = d?.max ?? 14;
  return digits.length >= min && digits.length <= max;
}
