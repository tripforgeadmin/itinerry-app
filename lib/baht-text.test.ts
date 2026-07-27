import { test } from "node:test";
import assert from "node:assert/strict";
import { bahtText } from "./baht-text.ts";

test("whole-baht amounts end ถ้วน", () => {
  assert.equal(bahtText(0), "ศูนย์บาทถ้วน");
  assert.equal(bahtText(1), "หนึ่งบาทถ้วน");
  assert.equal(bahtText(100), "หนึ่งร้อยบาทถ้วน");
  assert.equal(bahtText(3999), "สามพันเก้าร้อยเก้าสิบเก้าบาทถ้วน");
});

test("เอ็ด for a trailing 1 after a higher digit", () => {
  assert.equal(bahtText(11), "สิบเอ็ดบาทถ้วน");
  assert.equal(bahtText(21), "ยี่สิบเอ็ดบาทถ้วน");
  assert.equal(bahtText(101), "หนึ่งร้อยเอ็ดบาทถ้วน");
});

test("ยี่สิบ for 2 in the tens place, bare สิบ for 1", () => {
  assert.equal(bahtText(20), "ยี่สิบบาทถ้วน");
  assert.equal(bahtText(15), "สิบห้าบาทถ้วน");
});

test("the example quotation's grand total", () => {
  assert.equal(bahtText(4144), "สี่พันหนึ่งร้อยสี่สิบสี่บาทถ้วน");
});

test("millions recurse", () => {
  assert.equal(bahtText(1_000_000), "หนึ่งล้านบาทถ้วน");
  assert.equal(bahtText(1_000_001), "หนึ่งล้านเอ็ดบาทถ้วน");
  assert.equal(bahtText(2_500_000), "สองล้านห้าแสนบาทถ้วน");
  assert.equal(bahtText(12_000_000), "สิบสองล้านบาทถ้วน");
});

test("satang from the 2-decimal fraction", () => {
  assert.equal(bahtText(16357.86), "หนึ่งหมื่นหกพันสามร้อยห้าสิบเจ็ดบาทแปดสิบหกสตางค์");
  assert.equal(bahtText(0.25), "ศูนย์บาทยี่สิบห้าสตางค์");
  assert.equal(bahtText(559.86), "ห้าร้อยห้าสิบเก้าบาทแปดสิบหกสตางค์");
});

test("floating-point stored amounts don't drift a satang", () => {
  assert.equal(bahtText(1.1), "หนึ่งบาทสิบสตางค์");
  assert.equal(bahtText(0.07 * 3200), "สองร้อยยี่สิบสี่บาทถ้วน"); // 224.00000000000003 in FP
  assert.equal(bahtText(999999.99), "เก้าแสนเก้าหมื่นเก้าพันเก้าร้อยเก้าสิบเก้าบาทเก้าสิบเก้าสตางค์");
});
