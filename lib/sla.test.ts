/**
 * SLA stage-aging tests — parseStageHours (config merge + validation) and staleBadge
 * (age vs. per-stage threshold, label format).
 *
 * Run:  node --test lib/sla.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStageHours, staleBadge, DEFAULT_STAGE_HOURS } from "./sla.ts";

const HOUR = 60 * 60 * 1000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

test("parseStageHours: empty/null → defaults", () => {
  assert.deepEqual(parseStageHours(null), DEFAULT_STAGE_HOURS);
  assert.deepEqual(parseStageHours(""), DEFAULT_STAGE_HOURS);
  assert.deepEqual(parseStageHours("not json"), DEFAULT_STAGE_HOURS);
});

test("parseStageHours: merges partial + ignores unknown/invalid", () => {
  const r = parseStageHours('{"evaluated": 6, "contacted": -4, "bogus": 99}');
  assert.equal(r.evaluated, 6); // overridden
  assert.equal(r.contacted, DEFAULT_STAGE_HOURS.contacted); // negative rejected → default
  assert.equal(r.pending_decision, DEFAULT_STAGE_HOURS.pending_decision); // untouched
  assert.equal((r as Record<string, number>).bogus, undefined); // unknown stage dropped
});

test("parseStageHours: 0 is allowed (stage off)", () => {
  assert.equal(parseStageHours('{"contacted": 0}').contacted, 0);
});

test("staleBadge: not stale before threshold", () => {
  assert.equal(staleBadge("evaluated", ago(6), DEFAULT_STAGE_HOURS), null); // 6h < 12h
});

test("staleBadge: stale past threshold, hours label under 48h", () => {
  assert.equal(staleBadge("evaluated", ago(20), DEFAULT_STAGE_HOURS), "ค้าง 20 ชม."); // 20h > 12h
});

test("staleBadge: days label at/after 48h", () => {
  assert.equal(staleBadge("pending_decision", ago(24 * 8), DEFAULT_STAGE_HOURS), "ค้าง 8 วัน"); // 8d > 7d
  assert.equal(staleBadge("contacted", ago(72), DEFAULT_STAGE_HOURS), "ค้าง 3 วัน"); // 72h > 48h
});

test("staleBadge: statuses without a threshold never stale", () => {
  assert.equal(staleBadge("pending_review", ago(999), DEFAULT_STAGE_HOURS), null);
  assert.equal(staleBadge("win", ago(999), DEFAULT_STAGE_HOURS), null);
  assert.equal(staleBadge("lost", ago(999), DEFAULT_STAGE_HOURS), null);
});

test("staleBadge: threshold 0 disables the stage", () => {
  assert.equal(staleBadge("contacted", ago(999), { contacted: 0 }), null);
});

test("staleBadge: missing enteredAt → null", () => {
  assert.equal(staleBadge("evaluated", null, DEFAULT_STAGE_HOURS), null);
});
