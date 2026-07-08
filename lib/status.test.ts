/**
 * isOverdue tests — the 24h "result SENT" SLA clock. The promise is fulfilled only by
 * result_sent_at (not by leaving pending_review), stops for closed deals, and falls
 * back to created_at + SLA_HOURS for legacy rows without a due_date.
 *
 * Run:  node --test lib/status.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isOverdue, SLA_HOURS } from "./status.ts";

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
