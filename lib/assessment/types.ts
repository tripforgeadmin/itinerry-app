import type { Color, DecisionCell } from "./config.ts";

/**
 * A normalized case in the engine's own vocabulary. The adapter (adapter.ts) is the
 * ONLY place that translates raw questionnaire answers into these tokens — the engine
 * never sees app-specific values like "over300k" or "jp".
 */
export interface EngineCase {
  dest?: string; // destination bucket token: "japan" | "schengen" | "us" | "others" | …
  visa?: string; // "tourist" | "visitor" | "business" | "student" | …
  arrival?: string | null; // ISO date "YYYY-MM-DD" (drives urgency)
  occ?: string; // "employee" | "gov" | "owner" | "freelance" | "retired" | "homemaker" | "student"
  sav?: string; // ">300K" | "150-300K" | "50-150K" | "<50K"
  pay?: string; // "self" | "employer" | "scholarship" | "parents" | "spouse" | "other"
  hist?: string; // "western" | "other" | "never"
  ties?: string[]; // anchors: "job" | "home" | "spouse" | "parents" | "investment"
  refused?: "yes" | "no";
  overstay?: "yes" | "no";
  // occupation documents (only the one relevant to `occ` is read)
  emp?: string; // "complete" | "partial" | "notyet"
  flinc?: string; // "all" | "partial" | "none"
  fltax?: string; // "all" | "partial" | "none"
  dbd?: string; // "yes" | "notyet"
  // visitor §9 hooks (consistency check #4)
  relationship?: string;
  inviter_status?: string;
}

// "OVERRIDE" is legacy — kept only so stored rows evaluated before 2026-07-06 still
// type-check; the engine now always emits a score-based band and signals refused/overstay
// via override_flag + the Senior-Review decision cell instead.
export type Band = "High" | "Med" | "Low" | "OVERRIDE";
export type Urgency = "High" | "Med" | "Low";

/** The full, auditable engine output (§4). Every color/pillar is returned for inspection. */
export interface EngineResult {
  pillar_return: Color;
  pillar_funding: Color;
  pillar_risk: Color;
  approvability_score: number;
  approvability_band: Band;
  urgency: Urgency;
  days_left: number | null;
  decision_cell: DecisionCell;
  override_flag: boolean;
  consistency_flags: string[];
  billable_scope: "Light" | "Medium" | "Heavy";
  sponsor_dependency: boolean;
  complexity: "Base" | "Plus" | "Premium";
  complexity_score: number;
  time_feasibility: "On-track" | "Tight" | "At-risk";
  doc_gaps: number;
  data_flags: string[];
  _colors: {
    dest: Color | null;
    occ: Color | null;
    sav: Color | null;
    pay: Color | null;
    hist: Color | null;
    ties: Color;
    docs: Record<string, Color | undefined>;
  };
}
