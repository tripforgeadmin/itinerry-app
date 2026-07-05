/**
 * Adapter tests — verify the app-vocabulary → engine-vocabulary translation, including
 * the mappings that silently break scoring if wrong (dest buckets, savings bands,
 * doc-token renames like none→notyet, multi-select collapse, pay precedence).
 *
 * Run:  node --test lib/assessment/adapter.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { answersToCase } from "./adapter.ts";
import { evaluate } from "./engine.ts";

const TODAY = "2026-06-29";

// End-to-end: T1 expressed in RAW app answers must reproduce the engine's T1 result.
test("app answers reproduce T1 strong tourist", () => {
  const answers = {
    q8: "jp", q9: "tourist", q10: "2026-09-01",
    q24: "employee", q25: "complete",
    q12: "uk", // a western prior visa
    q35: "job,property", // → job + home (both strong anchors)
    q34: "over300k",
    q30: "never", q32: "never",
  };
  const c = answersToCase(answers);
  assert.equal(c.dest, "japan");
  assert.equal(c.hist, "western");
  assert.equal(c.pay, "self"); // employee → no sponsor question → self
  assert.deepEqual(c.ties, ["job", "home"]);

  const r = evaluate(c, TODAY);
  assert.equal(r.approvability_score, 98);
  assert.equal(r.approvability_band, "High");
  assert.equal(r.decision_cell.name, "Nurture");
  assert.equal(r.pillar_risk, "g");
});

test("destination buckets", () => {
  const dest = (q8: string) => answersToCase({ q8 }).dest;
  assert.equal(dest("kr"), "korea"); // green
  assert.equal(dest("ae"), "dubai"); // green (UAE)
  assert.equal(dest("us"), "us"); // red
  assert.equal(dest("gb"), "uk"); // red
  assert.equal(dest("gr"), "schengen"); // Greece → schengen area
  assert.equal(dest("ch"), "schengen"); // Switzerland (non-EU schengen)
  assert.equal(dest("au"), "australia"); // named yellow
  assert.equal(dest("bt"), "others"); // Bhutan → catch-all yellow
});

test("savings bands", () => {
  const sav = (q34: string) => answersToCase({ q34 }).sav;
  assert.equal(sav("under50k"), "<50K");
  assert.equal(sav("50k_150k"), "50-150K");
  assert.equal(sav("150k_300k"), "150-300K");
  assert.equal(sav("over300k"), ">300K");
});

test("occupation-doc token renames", () => {
  assert.equal(answersToCase({ q24: "employee", q25: "none" }).emp, "notyet");
  assert.equal(answersToCase({ q24: "business_owner", q28: "no" }).dbd, "notyet");
  assert.equal(answersToCase({ q24: "business_owner", q28: "yes" }).dbd, "yes");
  assert.equal(answersToCase({ q27: "all_3y" }).fltax, "all");
});

test("freelance income multi-select collapses to all/partial/none", () => {
  const flinc = (q26: string) => answersToCase({ q26 }).flinc;
  assert.equal(flinc("contract,invoice,bank_transfer"), "all");
  assert.equal(flinc("contract,invoice"), "partial");
  assert.equal(flinc("contract"), "partial");
  assert.equal(flinc("none"), "none");
  assert.equal(flinc(""), "none");
});

test("travel history from prior visas", () => {
  const hist = (q12: string) => answersToCase({ q12 }).hist;
  assert.equal(hist("never"), "never");
  assert.equal(hist(""), "never");
  assert.equal(hist("japan,korea"), "other"); // only non-western
  assert.equal(hist("canada"), "western");
  assert.equal(hist("japan,schengen"), "western"); // mixed → western wins
  // individually-picked country codes (PriorVisasScreen "add another country") must count too
  assert.equal(hist("de"), "western"); // Germany (Schengen) alpha-2
  assert.equal(hist("gb"), "western"); // UK alpha-2
  assert.equal(hist("jp,kr"), "other"); // individual non-western codes
  assert.equal(hist("uk, de"), "western"); // ", "-joined (PriorVisasScreen delimiter) still parses
});

test("pay precedence: q29 (travel) over q23 (study), else self", () => {
  assert.equal(answersToCase({ q29: "self_savings" }).pay, "self");
  assert.equal(answersToCase({ q29: "spouse" }).pay, "spouse");
  assert.equal(answersToCase({ q23: "scholarship" }).pay, "scholarship"); // student visa, no q29
  assert.equal(answersToCase({ q29: "parents", q23: "scholarship" }).pay, "parents"); // q29 wins
  assert.equal(answersToCase({ q24: "employee" }).pay, "self"); // neither → self
});

test("ties mapping drops 'none' and renames anchors", () => {
  assert.deepEqual(answersToCase({ q35: "job,property,spouse_children,dependents,investments" }).ties,
    ["job", "home", "spouse", "parents", "investment"]);
  assert.deepEqual(answersToCase({ q35: "none" }).ties, []);
});

test("refused / overstay flags", () => {
  assert.equal(answersToCase({ q30: "yes" }).refused, "yes");
  assert.equal(answersToCase({ q30: "never" }).refused, "no");
  assert.equal(answersToCase({ q32: "yes" }).overstay, "yes");
  assert.equal(answersToCase({}).overstay, "no");
});
