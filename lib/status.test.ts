/**
 * SLA tests — the 2-day (48h, calendar time) contact-back promise: slaDueDate (the due_date
 * new cases store) and the isOverdue clock. The clock is fulfilled only by result_sent_at
 * (not by leaving pending_review), stops for closed deals, and falls back to
 * created_at + SLA_HOURS for legacy rows without a due_date.
 *
 * Run:  node --test lib/status.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isOverdue, slaDueDate, SLA_HOURS } from "./status.ts";

const HOUR = 60 * 60 * 1000;
const pastDue = new Date(Date.now() - 2 * HOUR).toISOString();
const futureDue = new Date(Date.now() + 2 * HOUR).toISOString();
const created = new Date(Date.now() - 3 * HOUR).toISOString();

test("pending_review past due → overdue", () => {
  assert.equal(isOverdue(created, "pending_review", pastDue, null), true);
});

test("evaluated past due with UNSENT result → overdue (the fix)", () => {
  assert.equal(isOverdue(created, "evaluated", pastDue, null), true);
  assert.equal(isOverdue(created, "contacted", pastDue, null), true);
  assert.equal(isOverdue(created, "pending_decision", pastDue, null), true);
});

test("result sent → never overdue, even past due", () => {
  const sentAt = new Date().toISOString();
  assert.equal(isOverdue(created, "pending_review", pastDue, sentAt), false);
  assert.equal(isOverdue(created, "evaluated", pastDue, sentAt), false);
});

test("closed deals → never overdue", () => {
  assert.equal(isOverdue(created, "win", pastDue, null), false);
  assert.equal(isOverdue(created, "lost", pastDue, null), false);
});

test("before due → not overdue", () => {
  assert.equal(isOverdue(created, "pending_review", futureDue, null), false);
  assert.equal(isOverdue(created, "evaluated", futureDue, null), false);
});

test("legacy row without due_date falls back to created_at + SLA_HOURS", () => {
  const justOver = new Date(Date.now() - (SLA_HOURS + 1) * HOUR).toISOString();
  const wellUnder = new Date(Date.now() - 1 * HOUR).toISOString();
  assert.equal(isOverdue(justOver, "pending_review", null, null), true);
  assert.equal(isOverdue(wellUnder, "pending_review", null, null), false);
});

test("the promise is 2 days = 48h", () => {
  assert.equal(SLA_HOURS, 48);
});

test("legacy fallback uses the 48h window (30h old → still on time, 49h → overdue)", () => {
  const h30 = new Date(Date.now() - 30 * HOUR).toISOString();
  const h49 = new Date(Date.now() - 49 * HOUR).toISOString();
  assert.equal(isOverdue(h30, "pending_review", null, null), false);
  assert.equal(isOverdue(h49, "pending_review", null, null), true);
});

test("slaDueDate = creation + 48h in calendar time (Friday submit → due Sunday)", () => {
  const friday = new Date("2026-10-02T10:00:00+07:00");
  assert.equal(slaDueDate(friday).toISOString(), new Date("2026-10-04T10:00:00+07:00").toISOString());
  // accepts the ISO string a row's created_at arrives as
  assert.equal(slaDueDate("2026-10-02T03:00:00.000Z").toISOString(), "2026-10-04T03:00:00.000Z");
});

test("slaDueDate() with no argument counts from now", () => {
  const before = Date.now();
  const due = slaDueDate().getTime();
  assert.ok(due >= before + SLA_HOURS * HOUR && due <= Date.now() + SLA_HOURS * HOUR);
});
