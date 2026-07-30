/**
 * PII masking for the MCP tool-response boundary. Server-side operations always
 * use real data; ONLY what Claude sees passes through these. External keys are
 * ticket_id / quote_number / product code — never UUIDs, never full names.
 * Pure + dependency-free; regression-tested in lib/pii-mask.test.ts using the
 * "!blob.includes(pii)" shape from lib/assessment-draft-prompt.test.ts.
 */

// .ts extension so node --test resolves it without a bundler (repo test convention).
import { ANONYMIZED_SENTINEL } from "./pii-constants.ts";

/** Thai local "0812345678" → "081-xxx-x678"; "+66812345678" → "+66-xxx-x678";
 * anything else keeps last 3 digits only. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "xxx";
  const last3 = digits.slice(-3);
  if (phone.startsWith("+")) {
    const cc = phone.slice(0, 3);
    return `${cc}-xxx-x${last3}`;
  }
  return `${digits.slice(0, 3)}-xxx-x${last3}`;
}

/** "somchai@gmail.com" → "so***@gmail.com" */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return email ? "***" : null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Nickname if present, else the given name — but ALWAYS first whitespace token
 * only, whatever the source (customers sometimes type their full legal name into
 * the nickname field, which must not leak a surname). The PDPA tombstone sentinel
 * passes through untouched. */
export function maskName(fields: {
  nickname?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const source = fields.nickname?.trim() || fields.first_name?.trim() || fields.full_name?.trim();
  if (!source) return "—";
  if (source === ANONYMIZED_SENTINEL) return source;
  return source.split(/\s+/)[0] ?? "—";
}

/** Free-form customer name (quote snapshots): first token only. */
export function maskFreeName(name: string | null | undefined): string {
  if (!name) return "—";
  const trimmed = name.trim();
  if (trimmed === ANONYMIZED_SENTINEL) return trimmed;
  return trimmed.split(/\s+/)[0] ?? "—";
}

/** Address → last token (province heuristic) or omit. */
export function maskAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const tokens = address.trim().split(/\s+/);
  return tokens.length > 0 ? `…${tokens[tokens.length - 1]}` : null;
}
