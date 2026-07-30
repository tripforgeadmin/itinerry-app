import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLineTotal, computeQuoteTotals, expandKit, taxBreakdown } from "./quote-math.ts";
import { round2, parseMoneyInput } from "./money.ts";

test("round2 rounds half-up at 2dp", () => {
  assert.equal(round2(1033.335), 1033.34);
  assert.equal(round2(0.005), 0.01);
  assert.equal(round2(3999), 3999);
});

test("line total rounds at the line level", () => {
  // 3 × 1,033.335 = 3,100.005 → 3,100.01 (rounded once, at the line)
  assert.equal(computeLineTotal({ quantity: 3, unitPrice: 1033.335, discountPct: 0 }), 3100.01);
});

test("line discount 0% and 100%", () => {
  assert.equal(computeLineTotal({ quantity: 2, unitPrice: 3999, discountPct: 0 }), 7998);
  assert.equal(computeLineTotal({ quantity: 2, unitPrice: 3999, discountPct: 100 }), 0);
});

test("VAT applies to taxable lines only (Schengen 2-person example)", () => {
  // ค่าธรรมเนียมวีซ่า 2×3,000 + ค่าธรรมเนียม VAC 2×900 (pass-through, no VAT)
  // + Full Package 2×3,999 (service, VAT 7%)
  const lines = [
    { lineTotal: computeLineTotal({ quantity: 2, unitPrice: 3000, discountPct: 0 }), taxable: false },
    { lineTotal: computeLineTotal({ quantity: 2, unitPrice: 900, discountPct: 0 }), taxable: false },
    { lineTotal: computeLineTotal({ quantity: 2, unitPrice: 3999, discountPct: 0 }), taxable: true },
  ];
  const t = computeQuoteTotals({ lines, discountAmount: 0, vatRate: 7 });
  assert.equal(t.subtotal, 6000 + 1800 + 7998);
  assert.equal(t.vatAmount, round2(7998 * 0.07)); // 559.86 — VAT on the service line only
  assert.equal(t.grandTotal, 15798 + 559.86);
});

test("vatRate 0 yields no VAT", () => {
  const t = computeQuoteTotals({
    lines: [{ lineTotal: 7998, taxable: true }],
    discountAmount: 0,
    vatRate: 0,
  });
  assert.equal(t.vatAmount, 0);
  assert.equal(t.grandTotal, 7998);
});

test("quote-level discount reduces the taxable base first", () => {
  const t = computeQuoteTotals({
    lines: [
      { lineTotal: 6000, taxable: false },
      { lineTotal: 7998, taxable: true },
    ],
    discountAmount: 1000,
    vatRate: 7,
  });
  assert.equal(t.vatAmount, round2((7998 - 1000) * 0.07)); // 489.86
  assert.equal(t.grandTotal, round2(6000 + 7998 - 1000 + 489.86));
});

test("discount larger than taxable subtotal clamps the VAT base to 0", () => {
  const t = computeQuoteTotals({
    lines: [
      { lineTotal: 6000, taxable: false },
      { lineTotal: 500, taxable: true },
    ],
    discountAmount: 2000,
    vatRate: 7,
  });
  assert.equal(t.vatAmount, 0);
  assert.equal(t.grandTotal, 4500); // 6,500 − 2,000
});

test("discount larger than the whole subtotal clamps grand total to ≥ 0", () => {
  const t = computeQuoteTotals({
    lines: [{ lineTotal: 500, taxable: true }],
    discountAmount: 2000,
    vatRate: 7,
  });
  assert.equal(t.grandTotal, 0);
});

test("negative discount input is treated as 0", () => {
  const t = computeQuoteTotals({
    lines: [{ lineTotal: 1000, taxable: true }],
    discountAmount: -50,
    vatRate: 7,
  });
  assert.equal(t.discountAmount, 0);
  assert.equal(t.grandTotal, 1070);
});

test("expandKit multiplies kit qty into component qty", () => {
  assert.equal(expandKit(1, 2), 2); // ชุด ×2 ท่าน, ส่วนประกอบ qty 1 → 2
  assert.equal(expandKit(2.5, 2), 5);
  assert.equal(expandKit(1, 1), 1);
});

test("taxBreakdown matches the example quotation (720 exempt / 3,200 taxable)", () => {
  const lines = [
    { lineTotal: 3200, taxable: true }, // บริการ Full Package
    { lineTotal: 720, taxable: false }, // ค่าธรรมเนียมศูนย์ยื่น VFS
  ];
  const b = taxBreakdown(lines, 0);
  assert.equal(b.nonTaxableSubtotal, 720);
  assert.equal(b.taxableSubtotal, 3200);
  assert.equal(b.taxableBase, 3200);
  // VAT ที่ตามมาต้องเท่าตัวอย่าง: 224.00 และสอดคล้อง computeQuoteTotals
  const t = computeQuoteTotals({ lines, discountAmount: 0, vatRate: 7 });
  assert.equal(t.vatAmount, 224);
  assert.equal(t.grandTotal, 4144);
});

test("taxBreakdown taxableBase clamps under a big quote discount", () => {
  const b = taxBreakdown([{ lineTotal: 500, taxable: true }], 2000);
  assert.equal(b.taxableBase, 0);
});

test("parseMoneyInput accepts ฿/commas, rejects junk", () => {
  assert.equal(parseMoneyInput("3,999.50"), 3999.5);
  assert.equal(parseMoneyInput("฿1200"), 1200);
  assert.equal(parseMoneyInput("1.234"), null); // 3 decimals
  assert.equal(parseMoneyInput("-5"), null);
  assert.equal(parseMoneyInput("abc"), null);
  assert.equal(parseMoneyInput(""), null);
});
