import { test } from "node:test";
import assert from "node:assert/strict";
import { maskPhone, maskEmail, maskName, maskFreeName, maskAddress } from "./pii-mask.ts";

// Same regression shape as lib/assessment-draft-prompt.test.ts: serialize a masked
// projection and assert the raw PII strings are NOT in the blob.
test("masked projection carries no raw PII", () => {
  const fixture = {
    nickname: null,
    full_name: "สมชาย ใจดีมาก",
    first_name: "สมชาย",
    last_name: "ใจดีมาก",
    phone: "0812345678",
    email: "somchai.jaidee@gmail.com",
    address: "118/1 อาคารทิปโก้ ถนนพระราม6 กรุงเทพฯ",
  };
  const masked = {
    name: maskName(fixture),
    phone: maskPhone(fixture.phone),
    email: maskEmail(fixture.email),
    address: maskAddress(fixture.address),
  };
  const blob = JSON.stringify(masked);
  assert.ok(!blob.includes("0812345678"), "raw phone leaked");
  assert.ok(!blob.includes("ใจดีมาก"), "surname leaked");
  assert.ok(!blob.includes("somchai.jaidee"), "email local part leaked");
  assert.ok(!blob.includes("118/1"), "street address leaked");
  // Positive shapes
  assert.equal(masked.name, "สมชาย");
  assert.equal(masked.phone, "081-xxx-x678");
  assert.equal(masked.email, "so***@gmail.com");
  assert.equal(masked.address, "…กรุงเทพฯ");
});

test("nickname wins over given name", () => {
  assert.equal(maskName({ nickname: "เอ็ท", full_name: "สมชาย ใจดีมาก" }), "เอ็ท");
});

test("full legal name typed into the nickname field still loses its surname", () => {
  // Real-world case found in prod data during testing: nickname = "ชื่อ นามสกุล".
  const masked = maskName({ nickname: "วีรนุช แสนเสนา" });
  assert.equal(masked, "วีรนุช");
  assert.ok(!masked.includes("แสนเสนา"));
});

test("anonymized sentinel passes through", () => {
  assert.equal(maskName({ full_name: "[ลบแล้ว]" }), "[ลบแล้ว]");
  assert.equal(maskFreeName("[ลบแล้ว]"), "[ลบแล้ว]");
});

test("international phone keeps country code + last 3 only", () => {
  const m = maskPhone("+66812345678");
  assert.equal(m, "+66-xxx-x678");
  assert.ok(!String(m).includes("8123456"));
});

test("free-name mask keeps first token only", () => {
  assert.equal(maskFreeName("คุณทดสอบ ระบบเต็ม"), "คุณทดสอบ");
});

test("null-safety", () => {
  assert.equal(maskPhone(null), null);
  assert.equal(maskEmail(undefined), null);
  assert.equal(maskAddress(""), null);
  assert.equal(maskFreeName(null), "—");
});
