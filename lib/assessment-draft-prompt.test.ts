/**
 * Tests for the AI-draft prompt builder. The load-bearing guarantee is that NO personally
 * identifying information can reach the prompt — the builder only ever receives the engine's
 * normalized (PII-free) case + result, and this test pins that by feeding realistic PII-looking
 * strings on fields the builder must ignore and asserting they never appear in the output.
 *
 * Run:  node --test lib/assessment-draft-prompt.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDraftPrompt } from "./assessment-draft-prompt.ts";
import type { EngineResult, EngineCase } from "./assessment/types.ts";

const CASE: EngineCase = {
  dest: "japan",
  visa: "tourist",
  arrival: "2026-09-01",
  occ: "freelance",
  sav: "150-300K",
  pay: "self",
  hist: "western",
  ties: ["job", "home"],
  refused: "no",
  overstay: "no",
};

const RESULT: EngineResult = {
  pillar_return: "g",
  pillar_funding: "y",
  pillar_risk: "g",
  approvability_score: 72,
  approvability_band: "High",
  urgency: "Med",
  days_left: 41,
  decision_cell: { name: "Close" } as EngineResult["decision_cell"],
  override_flag: false,
  consistency_flags: [],
  billable_scope: "Medium",
  sponsor_dependency: false,
  complexity: "Base",
  complexity_score: 1,
  time_feasibility: "On-track",
  doc_gaps: 1,
  data_flags: [],
  _colors: { dest: "g", occ: "y", sav: "y", pay: "g", hist: "g", ties: "g", docs: {} },
};

test("builds a non-trivial Thai prompt from engine output", () => {
  const { system, user } = buildDraftPrompt(RESULT, CASE);
  assert.ok(system.length > 200, "system prompt should be substantial");
  assert.ok(user.length > 100, "user prompt should be substantial");
  // Faithful to the engine classification and case facts.
  assert.match(user, /ญี่ปุ่น/); // dest label
  assert.match(user, /ฟรีแลนซ์/); // occ label
  assert.match(user, /สูง/); // band High -> "สูง"
  assert.match(system, /strengths/);
  assert.match(system, /improvements/);
  assert.match(system, /suggestedPass/);
});

test("prompt carries NO PII even when PII-looking values are attached to ignored fields", () => {
  // The builder's type only exposes normalized tokens, but a stray extra field must never leak.
  const dirty = {
    ...CASE,
    // fields the builder does not read — simulate an upstream mistake that attaches PII:
    name: "สมชาย ใจดี",
    phone: "0812345678",
    email: "somchai@example.com",
    line_user_id: "Uab34cd56ef7890",
  } as EngineCase;
  const { system, user } = buildDraftPrompt(RESULT, dirty);
  const blob = system + "\n" + user;
  for (const pii of ["สมชาย", "ใจดี", "0812345678", "somchai@example.com", "Uab34cd56ef7890"]) {
    assert.ok(!blob.includes(pii), `prompt must not contain PII: ${pii}`);
  }
});
