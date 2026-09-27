/**
 * Post-submit LINE copy — the follow-up (sent with the thank-you Flex card) and the
 * follow-webhook thank-you both promise a contact-back within 2 days, pinned to SLA_HOURS so
 * the promise and the admin due date never drift; no leftover 24h or appointment/Meet copy
 * from the retired consultation booking.
 *
 * Run:  node --test lib/line-messaging.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { assessmentFollowUpMessage, assessmentReceivedMessage } from "./line-messaging.ts";
import { SLA_HOURS } from "./status.ts";

const DAYS = SLA_HOURS / 24;
const TICKET = "JP-0001";
// Booking-era wording that must never reach a new customer.
const BOOKING_COPY = [/นัด/, /Meet/i, /appointment/i, /consultation/i, /booked/i, /ตามเวลา/];

function assertNoLegacyCopy(text: string) {
  assert.ok(!text.includes("24"), `unexpected "24" in: ${text}`);
  for (const re of BOOKING_COPY) assert.ok(!re.test(text), `unexpected ${re} in: ${text}`);
}

test("the promised window matches the SLA (2 days)", () => {
  assert.equal(DAYS, 2);
});

test("follow-up (TH): opens with the 2-day contact-back promise", () => {
  const msg = assessmentFollowUpMessage("th");
  assert.equal(msg.type, "text");
  assert.ok(msg.text.startsWith(`⏱️ ทีมผู้เชี่ยวชาญของเราจะติดต่อกลับภายใน ${DAYS} วัน\n\n`));
  assertNoLegacyCopy(msg.text);
});

test("follow-up (EN): opens with the 2-day contact-back promise", () => {
  const msg = assessmentFollowUpMessage("en");
  assert.ok(msg.text.startsWith(`⏱️ Our specialist will get back to you within ${DAYS} days\n\n`));
  assertNoLegacyCopy(msg.text);
});

test("follow-up keeps the chat + share lines and addresses the customer by LINE name", () => {
  const named = assessmentFollowUpMessage("th", "  Ploy ").text;
  assert.ok(named.includes("หากคุณ Ployมีข้อสอบถาม"));
  assert.ok(named.includes("📲 คุณ Ployสามารถแชร์แอปการประเมิน"));
  const anon = assessmentFollowUpMessage("th", null).text;
  assert.ok(anon.includes("หากคุณลูกค้ามีข้อสอบถาม"));
  const en = assessmentFollowUpMessage("en", "Ploy").text;
  assert.ok(en.includes("💬 If you have any questions"));
  assert.ok(en.includes("📲 You can share the assessment app"));
});

test("follow-up defaults to Thai", () => {
  assert.equal(assessmentFollowUpMessage().text, assessmentFollowUpMessage("th").text);
});

test("thank-you (follow-webhook): ticket id + the same 2-day promise, TH and EN", () => {
  const th = assessmentReceivedMessage(TICKET, "th", "Ploy").text;
  assert.ok(th.includes(`\n${TICKET}\n`));
  assert.ok(th.includes(`⏱️ ทีมผู้เชี่ยวชาญของเราจะติดต่อกลับภายใน ${DAYS} วัน`));
  assert.ok(th.includes("หากคุณ Ployมีข้อสอบถาม"));
  assertNoLegacyCopy(th);

  const en = assessmentReceivedMessage(TICKET, "en").text;
  assert.ok(en.includes(`\n${TICKET}\n`));
  assert.ok(en.includes(`⏱️ Our specialist will get back to you within ${DAYS} days`));
  assertNoLegacyCopy(en);
});
