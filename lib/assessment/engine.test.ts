/**
 * Verification suite for the visa evaluator — port of docs/algorithm/test_evaluator.py.
 * Every expected value was hand-traced from §6 of the Build Brief. `today` is fixed so
 * days_left (and therefore urgency/time) is deterministic.
 *
 * Run:  node --test lib/assessment/engine.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./engine.ts";
import type { EngineCase } from "./types.ts";

const TODAY = "2026-06-29";

function check(title: string, inp: EngineCase, expect: Record<string, unknown>) {
  test(title, () => {
    const res = evaluate(inp, TODAY) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(expect)) {
      assert.deepEqual(res[k], v, `${title} · ${k}: got ${JSON.stringify(res[k])} exp ${JSON.stringify(v)}`);
    }
  });
}

// T1 — strong tourist, far date → High / Low / Nurture, perfect score 98
check("T1 strong tourist", {
  dest: "japan", arrival: "2026-09-01", occ: "employee", emp: "complete",
  ties: ["job", "home"], hist: "western", sav: ">300K", pay: "self",
  refused: "no", overstay: "no", visa: "tourist",
}, {
  pillar_return: "g", pillar_funding: "g", pillar_risk: "g",
  approvability_score: 98, approvability_band: "High",
  urgency: "Low", billable_scope: "Light", complexity: "Base",
  time_feasibility: "On-track", override_flag: false,
});

// T2 — overstay → OVERRIDE regardless of score; heavy docs; premium; at-risk
check("T2 override (overstay)", {
  dest: "korea", arrival: "2026-07-19", occ: "freelance",
  flinc: "partial", fltax: "none", ties: ["investment"], hist: "other",
  sav: "50-150K", pay: "self", refused: "no", overstay: "yes", visa: "tourist",
}, {
  approvability_band: "OVERRIDE", override_flag: true, pillar_risk: "r",
  approvability_score: 54, urgency: "High", billable_scope: "Heavy",
  complexity: "Premium", time_feasibility: "At-risk",
});

// T3 — homemaker self-pay <50K → consistency flag, Low band, Reality-check
check("T3 consistency flag", {
  dest: "schengen", arrival: "2026-08-08", occ: "homemaker",
  ties: [], hist: "never", sav: "<50K", pay: "self",
  refused: "no", overstay: "no", visa: "tourist",
}, {
  pillar_return: "r", pillar_funding: "r", pillar_risk: "y",
  approvability_score: 28, approvability_band: "Low",
  urgency: "Med", billable_scope: "Light", complexity: "Base",
});

// T4 — band boundary exactly 70 → High; partial emp → Medium scope; sponsor → Plus; Tight
check("T4 band boundary 70", {
  dest: "uk", arrival: "2026-07-29", occ: "employee", emp: "partial",
  ties: ["home"], hist: "never", sav: "150-300K", pay: "parents",
  refused: "no", overstay: "no", visa: "tourist",
}, {
  approvability_score: 70, approvability_band: "High", urgency: "Med",
  billable_scope: "Medium", sponsor_dependency: true,
  complexity: "Plus", time_feasibility: "Tight",
});

// T5 — owner without DBD → flag pushes risk to y; still High(77); Close
check("T5 owner no DBD", {
  dest: "korea", arrival: "2026-07-29", occ: "owner", dbd: "notyet",
  ties: ["home"], hist: "other", sav: "150-300K", pay: "parents",
  refused: "no", overstay: "no", visa: "tourist",
}, {
  pillar_risk: "y", approvability_score: 77, approvability_band: "High",
  urgency: "Med", complexity: "Plus",
});

// T6 — red destination (Canada) but strong profile, far date
check("T6 red destination", {
  dest: "canada", arrival: "2026-12-01", occ: "gov", emp: "complete",
  ties: ["job", "spouse"], hist: "western", sav: ">300K", pay: "employer",
  refused: "no", overstay: "no", visa: "tourist",
}, {
  approvability_score: 83, approvability_band: "High", urgency: "Low",
  complexity: "Plus", sponsor_dependency: true,
});

// T7 — determinism + decision-cell name
test("T7 determinism + decision cell", () => {
  const inp: EngineCase = {
    dest: "japan", arrival: "2026-09-01", occ: "employee", emp: "complete",
    ties: ["job"], hist: "western", sav: ">300K", pay: "self",
    refused: "no", overstay: "no", visa: "tourist",
  };
  const r1 = evaluate(inp, TODAY);
  const r2 = evaluate(inp, TODAY);
  assert.deepEqual(r1, r2, "deterministic (two runs equal)");
  assert.equal(r1.decision_cell.name, "Nurture", "T1 decision cell name");
});
