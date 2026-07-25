// .ts extension so node --test resolves it without a bundler (see lib/assessment/engine.ts).
import { round2 } from "./money.ts";

/**
 * Pure quote arithmetic — no I/O. The server recomputes every stored total from
 * the lines through these functions (app/api/admin/quotes); client-side numbers
 * are display-only.
 *
 * Rounding rule: round half-up to 2dp at the LINE level, sum the rounded lines,
 * then round VAT once at the quote level.
 *
 * VAT rule: only `taxable` lines (itinerry service fees) enter the VAT base.
 * Embassy/VAC fees are pass-through disbursements (เงินจ่ายแทน) and carry no VAT.
 * The quote-level discount is treated as a discount on the service (taxable)
 * portion first, so a discount can never shrink the pass-through fees' VAT-free
 * status or produce negative bases.
 */

export interface LineInput {
  quantity: number;
  unitPrice: number;
  /** Per-line discount percent, 0–100 (Salesforce QuoteLineItem.Discount). */
  discountPct: number;
}

export function computeLineTotal({ quantity, unitPrice, discountPct }: LineInput): number {
  return round2(quantity * unitPrice * (1 - discountPct / 100));
}

export interface TotalsInput {
  lines: { lineTotal: number; taxable: boolean }[];
  /** Quote-level discount in THB (≥ 0). */
  discountAmount: number;
  /** VAT percent, e.g. 0 or 7. */
  vatRate: number;
}

export interface QuoteTotals {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
}

export function computeQuoteTotals({ lines, discountAmount, vatRate }: TotalsInput): QuoteTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const taxableSubtotal = round2(
    lines.filter((l) => l.taxable).reduce((sum, l) => sum + l.lineTotal, 0)
  );
  const discount = round2(Math.max(0, discountAmount));
  const taxableBase = Math.max(0, round2(taxableSubtotal - discount));
  const vatAmount = round2((taxableBase * vatRate) / 100);
  const grandTotal = round2(Math.max(0, round2(subtotal - discount)) + vatAmount);
  return { subtotal, discountAmount: discount, vatAmount, grandTotal };
}
