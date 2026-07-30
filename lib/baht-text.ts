/**
 * Thai amount-in-words (บาทไทย) for the quotation PDF, e.g. 4144 →
 * "สี่พันหนึ่งร้อยสี่สิบสี่บาทถ้วน", 16357.86 → "…แปดสิบหกสตางค์".
 *
 * Rules implemented (standard Thai cheque wording):
 *  - 1 in the units place reads "เอ็ด" when preceded by a higher digit (11 → สิบเอ็ด),
 *    plain "หนึ่ง" when alone (1 → หนึ่งบาท)
 *  - 2 in the tens place reads "ยี่" (20 → ยี่สิบ); 1 in the tens place has no digit word
 *  - numbers ≥ 1M recurse in millions groups (1,234,567 → หนึ่งล้าน…)
 *  - satang from the 2-decimal fraction; whole amounts end "ถ้วน"
 * Pure and dependency-free; client- and server-safe.
 */

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** Read a 0..999,999 group. Empty string for 0. `hasPreceding` = a higher group
 * (…ล้าน) was already read, so a lone units-1 still reads เอ็ด (1,000,001 → หนึ่งล้านเอ็ด). */
function readGroup(n: number, hasPreceding = false): string {
  let out = "";
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    const digit = Number(s[i]);
    const place = s.length - i - 1;
    if (digit === 0) continue;
    if (place === 0 && digit === 1 && (s.length > 1 || hasPreceding)) out += "เอ็ด";
    else if (place === 1 && digit === 2) out += "ยี่" + PLACES[1];
    else if (place === 1 && digit === 1) out += PLACES[1];
    else out += DIGITS[digit] + PLACES[place];
  }
  return out;
}

/** Read any non-negative integer, recursing in millions ("ล้าน") groups. */
function readInt(n: number): string {
  if (n === 0) return DIGITS[0];
  if (n < 1_000_000) return readGroup(n);
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  return readInt(millions) + "ล้าน" + (rest > 0 ? readGroup(rest, true) : "");
}

/** Amount in Thai words. Negative amounts get a "ลบ" prefix (shouldn't appear on quotes). */
export function bahtText(amount: number): string {
  const sign = amount < 0 ? "ลบ" : "";
  const abs = Math.abs(amount);
  const satang = Math.round(abs * 100) % 100;
  const baht = Math.floor(Math.round(abs * 100) / 100);
  let out = sign + readInt(baht) + "บาท";
  out += satang === 0 ? "ถ้วน" : readGroup(satang) + "สตางค์";
  return out;
}
