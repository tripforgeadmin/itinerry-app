/**
 * Public entry point for the auto visa-assessment engine.
 *
 * `runAssessment(answers)` turns a raw questionnaire answer set into a row ready to be
 * written to the AUTO columns of `visa_evaluation` (`score`, `result`, `evaluated_by`) —
 * kept separate from the human's manual `pass`/`notes`.
 *
 * The returned `result` reserves a `narrative` slot (currently null / "pending") so a
 * later LLM stage can fill in a Thai narrative WITHOUT any schema or wiring change.
 */

import { evaluate } from "./engine.ts";
import { answersToCase } from "./adapter.ts";
import { ENGINE_VERSION, CONFIG_VERSION } from "./config.ts";
import type { EngineCase, EngineResult } from "./types.ts";
import { bangkokNow } from "../holidays.ts";

export { ENGINE_VERSION, CONFIG_VERSION } from "./config.ts";
export type { EngineResult, EngineCase } from "./types.ts";

/** The exact object stored per evaluation — engine output + reserved narrative + audit meta. */
export interface StoredEvaluation extends EngineResult {
  /** Reserved for the future LLM stage; null until generated. */
  narrative: string | null;
  narrative_status: "pending" | "generated" | "skipped";
  meta: {
    engine_version: string;
    config_version: string;
    evaluated_at: string; // ISO timestamp
    today: string; // Bangkok-local reference date used for urgency
    input_snapshot: EngineCase; // normalized case, for audit / re-run
  };
}

export interface AssessmentUpsert {
  score: number;
  evaluatedBy: string;
  result: StoredEvaluation;
}

/**
 * Evaluate a questionnaire submission. Deterministic given `todayISO`; defaults to the
 * current Bangkok-local date. `nowMs` overrides the evaluated_at timestamp (tests).
 */
export function runAssessment(
  answers: Record<string, string | undefined>,
  opts: { todayISO?: string; nowMs?: number } = {},
): AssessmentUpsert {
  const todayISO = opts.todayISO ?? bangkokNow().iso;
  const evaluatedAt = new Date(opts.nowMs ?? Date.now()).toISOString();
  const engineCase = answersToCase(answers);
  const result = evaluate(engineCase, todayISO);

  return {
    score: result.approvability_score,
    evaluatedBy: ENGINE_VERSION,
    result: {
      ...result,
      narrative: null,
      narrative_status: "pending",
      meta: {
        engine_version: ENGINE_VERSION,
        config_version: CONFIG_VERSION,
        evaluated_at: evaluatedAt,
        today: todayISO,
        input_snapshot: engineCase,
      },
    },
  };
}
