/**
 * Adapter — the ONLY translation layer between the questionnaire's raw answers and the
 * engine's vocabulary. Isolating it here means: (a) the engine stays app-agnostic and
 * unit-testable, and (b) if the form's option values change, only this file changes.
 *
 * Every mapping below is traceable to a specific question in lib/questions.ts.
 */

import type { EngineCase } from "./types.ts";

type Answers = Record<string, string | undefined>;

/** Split a comma-joined multi-checkbox answer into trimmed tokens. */
function arr(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── destination (q8, ISO alpha-2) → engine bucket token ───────────────────────
const DEST_GREEN: Record<string, string> = { jp: "japan", kr: "korea", tw: "taiwan", ae: "dubai" };
const DEST_RED: Record<string, string> = { us: "us", gb: "uk", ca: "canada" };
const DEST_YELLOW_NAMED: Record<string, string> = {
  au: "australia", nz: "nz", cn: "china", in: "india", qa: "qatar", sa: "saudi",
};
// Schengen area (incl. non-EU members no/is/ch/li) → the "schengen" yellow bucket.
const SCHENGEN = new Set([
  "at", "be", "bg", "hr", "cz", "dk", "ee", "fi", "fr", "de", "gr", "hu", "is", "it",
  "lv", "li", "lt", "lu", "mt", "nl", "no", "pl", "pt", "ro", "sk", "si", "es", "se", "ch",
]);
function destToken(a2: string): string {
  const c = a2.toLowerCase();
  return DEST_GREEN[c] ?? DEST_RED[c] ?? DEST_YELLOW_NAMED[c] ?? (SCHENGEN.has(c) ? "schengen" : "others");
}

// ── occupation (q24) → engine token ───────────────────────────────────────────
const OCC: Record<string, string> = {
  employee: "employee", government: "gov", freelance: "freelance",
  business_owner: "owner", retired: "retired", homemaker: "homemaker", student_occ: "student",
};

// ── savings (q34) → engine band token ─────────────────────────────────────────
const SAV: Record<string, string> = {
  under50k: "<50K", "50k_150k": "50-150K", "150k_300k": "150-300K", over300k: ">300K",
};

// ── who pays: q29 (travel expenses) → then q23 (study expenses) → else self ────
const PAY_Q29: Record<string, string> = {
  self_savings: "self", parents: "parents", spouse: "spouse", employer: "employer", other: "other",
};
const PAY_Q23: Record<string, string> = {
  self: "self", parents: "parents", scholarship: "scholarship", other: "other",
};
function payToken(a: Answers): string {
  if (a.q29 && PAY_Q29[a.q29]) return PAY_Q29[a.q29];
  if (a.q23 && PAY_Q23[a.q23]) return PAY_Q23[a.q23];
  return "self"; // employee/gov/freelance/owner have no explicit sponsor question → self-funded
}

// ── travel history (q12, multi) → western / other / never ─────────────────────
// q12 holds preset chip tokens (uk/schengen/usa/…) AND individual ISO alpha-2 codes the
// user adds via PriorVisasScreen's country picker — so western detection must cover both.
const WESTERN_VISA = new Set<string>([
  "uk", "schengen", "usa", "canada", "australia", "nz", // preset chips
  "gb", "us", "ca", "au", // same countries as individually-picked alpha-2 codes ("nz" already covered)
  ...SCHENGEN, // every Schengen member state counts as a western track record
]);
function histToken(q12: string | undefined): string {
  const picks = arr(q12).filter((v) => v !== "never");
  if (picks.length === 0) return "never";
  if (picks.some((v) => WESTERN_VISA.has(v))) return "western";
  return "other";
}

// ── ties to Thailand (q35, multi) → engine anchor tokens ──────────────────────
const TIE: Record<string, string> = {
  job: "job", property: "home", spouse_children: "spouse", dependents: "parents", investments: "investment",
};
function tieTokens(q35: string | undefined): string[] {
  return arr(q35).map((v) => TIE[v]).filter(Boolean);
}

// ── occupation documents ──────────────────────────────────────────────────────
const EMP_DOC: Record<string, string> = { complete: "complete", partial: "partial", none: "notyet" };
const FLTAX_DOC: Record<string, string> = { all_3y: "all", partial: "partial", none: "none" };
const DBD_DOC: Record<string, string> = { yes: "yes", no: "notyet" };
/** q26 is a multi-select of income proofs → collapse to all / partial / none. */
function freelanceIncomeToken(q26: string | undefined): string {
  const picks = arr(q26).filter((v) => v !== "none");
  if (picks.length === 0) return "none";
  const proofs = new Set(picks);
  const hasAll = ["contract", "invoice", "bank_transfer"].every((p) => proofs.has(p));
  return hasAll ? "all" : "partial";
}

/** Translate a full questionnaire answer set into the engine's normalized case. */
export function answersToCase(answers: Answers): EngineCase {
  const a = answers;
  return {
    dest: a.q8 ? destToken(a.q8) : undefined,
    visa: a.q9 || undefined,
    arrival: a.q10 || a.q13 || a.q17 || a.q21 || null,
    occ: a.q24 ? OCC[a.q24] ?? a.q24 : undefined,
    sav: a.q34 ? SAV[a.q34] ?? a.q34 : undefined,
    pay: payToken(a),
    hist: histToken(a.q12),
    ties: tieTokens(a.q35),
    refused: a.q30 === "yes" ? "yes" : "no",
    overstay: a.q32 === "yes" ? "yes" : "no",
    emp: a.q25 ? EMP_DOC[a.q25] ?? a.q25 : undefined,
    flinc: a.q26 !== undefined ? freelanceIncomeToken(a.q26) : undefined,
    fltax: a.q27 ? FLTAX_DOC[a.q27] ?? a.q27 : undefined,
    dbd: a.q28 ? DBD_DOC[a.q28] ?? a.q28 : undefined,
    // visitor §9 hooks — passed through; the engine's own substring/equality checks apply.
    relationship: a.q15 || undefined,
    inviter_status: a.q14 || undefined,
  };
}
