/**
 * Customer display name. `nickname` is the field collected from 2026-07-06 on (q3 = ชื่อเล่น);
 * older rows only have full_name / first_name / last_name, so those are the fallback chain.
 * Anonymized rows store "[ลบแล้ว]" and pass straight through.
 */
export interface NameFields {
  nickname?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export function displayName(a: NameFields | null | undefined): string {
  if (!a) return "—";
  const nick = a.nickname?.trim();
  if (nick) return nick;
  const full = a.full_name?.trim();
  if (full) return full;
  const parts = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
  return parts || "—";
}
