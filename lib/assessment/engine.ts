/**
 * itinerry — Visa Case Evaluator (deterministic engine). Port of §6 of the Build Brief
 * (reference: docs/algorithm/evaluator.py). Follow STEP 0–8 in order; the ORDER matters
 * (esp. OVERRIDE before band).
 *
 * Properties: deterministic · no AI/API · stateless · auditable · config-driven.
 */

import { ENGINE_CONFIG, type Color, type EngineConfig } from "./config.ts";
import type { EngineCase, EngineResult, Band, Urgency } from "./types.ts";

/** Map a raw value to a benchmark color using a {color: [members]} table (§5). */
function color(table: Record<Color, string[]>, value: unknown): Color | null {
  if (value === null || value === undefined) return null;
  const v = String(value).trim().toLowerCase();
  if (v === "") return null;
  for (const c of ["g", "y", "r"] as Color[]) {
    if (table[c].some((m) => String(m).trim().toLowerCase() === v)) return c;
  }
  return null;
}

/** 🟢 has a strong anchor ≥1 · 🟡 only investment money · 🔴 none (§5). */
function tiesColor(ties: string[] | undefined, cfg: EngineConfig): Color {
  const strong = new Set(cfg.ties.strong_anchors.map((a) => a.toLowerCase()));
  const mid = new Set(cfg.ties.mid_anchors.map((a) => a.toLowerCase()));
  const t = new Set((ties ?? []).map((x) => String(x).trim().toLowerCase()).filter(Boolean));
  for (const x of t) if (strong.has(x)) return "g";
  for (const x of t) if (mid.has(x)) return "y";
  return "r";
}

/** Occupation-relevant document colors (Tourist path). Empty for personas with no
 * occupation document (retired/homemaker/student). */
function docColors(c: EngineCase, cfg: EngineConfig): Record<string, Color | undefined> {
  const occ = String(c.occ ?? "").toLowerCase();
  const d = cfg.docs;
  const out: Record<string, Color | undefined> = {};
  if (occ === "employee" || occ === "gov") {
    out.emp = d.emp[String(c.emp ?? "").toLowerCase()];
  } else if (occ === "freelance") {
    out.flinc = d.freelance_income[String(c.flinc ?? "").toLowerCase()];
    out.fltax = d.freelance_tax[String(c.fltax ?? "").toLowerCase()];
  } else if (occ === "owner") {
    out.dbd = d.dbd[String(c.dbd ?? "").toLowerCase()];
  }
  return out;
}

/** Flags that push the RISK pillar to 🟡 (§6). Each flag is a human-readable reason. */
function consistencyChecks(c: EngineCase, savC: Color | null): string[] {
  const flags: string[] = [];
  const occ = String(c.occ ?? "").toLowerCase();
  const pay = String(c.pay ?? "").toLowerCase();
  const ties = new Set((c.ties ?? []).map((x) => String(x).trim().toLowerCase()));

  // 1) no-income persona claims self-funding with <50K
  if (["retired", "homemaker", "student"].includes(occ) && pay === "self" && savC === "r") {
    flags.push("ใครจ่ายจริง? (no-income persona + self-pay + <50K)");
  }
  // 2) business owner without DBD registration
  if (occ === "owner" && String(c.dbd ?? "").toLowerCase() === "notyet") {
    flags.push("ธุรกิจมีจริงไหม? (owner + DBD not yet)");
  }
  // 3) claims a job tie in Thailand but persona is student/homemaker
  if (ties.has("job") && ["student", "homemaker"].includes(occ)) {
    flags.push("ขัดกัน: อ้างมีงานในไทย แต่อาชีพเป็นนักเรียน/แม่บ้าน");
  }
  // 4) (Visitor) weak × weak — partner inviter on a Student visa (§9 hook)
  if (String(c.visa ?? "").toLowerCase() === "visitor") {
    const rel = String(c.relationship ?? "").toLowerCase();
    const inv = String(c.inviter_status ?? "").toLowerCase();
    if (["girlfriend", "boyfriend", "partner", "แฟน"].includes(rel) && inv.includes("student")) {
      flags.push("อ่อนคูณอ่อน: ความสัมพันธ์แฟน + ผู้เชิญถือ Student visa");
    }
  }
  return flags;
}

/** Calendar days between two ISO dates (b − a), matching Python's date subtraction. */
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Evaluate one case. `todayISO` fixes the reference date so urgency/time is deterministic
 * (pass Bangkok-local today in production; a fixed date in tests).
 */
export function evaluate(
  c: EngineCase,
  todayISO: string,
  cfg: EngineConfig = ENGINE_CONFIG,
): EngineResult {
  const L = cfg.lookup;
  const W = cfg.weights;
  const dataFlags: string[] = [];

  // ---- STEP 0  normalize: days_left + map every input to a color (§5) ---- #
  let daysLeft: number | null = null;
  const arrival = c.arrival;
  if (arrival) {
    const arr = String(arrival).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(arr) && !Number.isNaN(Date.parse(`${arr}T00:00:00Z`))) {
      daysLeft = daysBetween(todayISO, arr);
    } else {
      dataFlags.push("arrival date unparseable");
    }
  } else {
    dataFlags.push("arrival date missing");
  }

  const destC = color(L.destination, c.dest);
  const occC = color(L.occupation, c.occ);
  const savC = color(L.savings, c.sav);
  const payC = color(L.pay, c.pay);
  const histC = color(L.history, c.hist);
  const tiesC = tiesColor(c.ties, cfg);

  for (const [label, col] of [["dest", destC], ["occ", occC], ["sav", savC], ["hist", histC]] as const) {
    if (col === null) dataFlags.push(`${label} unknown/blank`);
  }

  const pay = String(c.pay ?? "").toLowerCase();
  const refused = String(c.refused ?? "no").trim().toLowerCase() === "yes";
  const overstay = String(c.overstay ?? "no").trim().toLowerCase() === "yes";

  const flags = consistencyChecks(c, savC);

  // ---- STEP 1  Pillar RETURN ---- #
  let ret: Color;
  if (tiesC === "g" && (occC === "g" || occC === "y")) {
    ret = "g";
  } else if (tiesC === "r" || (occC === "r" && tiesC !== "g")) {
    ret = "r";
  } else {
    ret = "y";
  }
  if (ret === "y" && histC === "g") ret = "g"; // rule 2: western visa lifts y → g

  // ---- STEP 2  Pillar FUNDING ---- #
  let fun: Color;
  if (savC === "g") {
    fun = "g";
  } else if (savC === "r" && (pay === "self" || pay === "other")) {
    fun = "r";
  } else {
    fun = "y"; // rule 3: sponsor → y (await docs)
  }

  // ---- STEP 3  OVERRIDE check (rule 5) — must come before band ---- #
  const override = refused || overstay;

  // ---- STEP 4  Pillar RISK ---- #
  const rsk: Color = override ? "r" : flags.length > 0 ? "y" : "g";

  // ---- STEP 5  Approvability score + band ---- #
  // Deliberate divergence from prototype §6: the band is ALWAYS score-based (3 values,
  // per owner decision 2026-07-06) — override no longer replaces it. Override still wins
  // the DECISION (Senior Review / hold quote via STEP 7) and already tanks the score
  // through the red risk pillar; it surfaces in UI as a red banner, not as a band value.
  const score = W.return[ret] + W.funding[fun] + W.risk[rsk] + (W.dest[destC ?? "y"] ?? W.dest.y);
  let band: Band;
  if (score >= cfg.bands.high) band = "High";
  else if (score >= cfg.bands.med) band = "Med";
  else band = "Low";

  // ---- STEP 6  Urgency ---- #
  let urg: Urgency;
  if (daysLeft === null) urg = "Med"; // unknown date → safe middle, flagged
  else if (daysLeft >= cfg.urgency_days.low) urg = "Low";
  else if (daysLeft >= cfg.urgency_days.med) urg = "Med";
  else urg = "High";

  // ---- STEP 7  Decision cell = MATRIX[band][urgency]; override wins the decision ---- #
  const M = cfg.decision_matrix;
  const cell = override ? M.OVERRIDE["*"] : M[band][urg];

  // ---- STEP 8  Secondary factors ---- #
  const docs = docColors(c, cfg);
  const gaps = Object.values(docs).filter((col) => col === "y" || col === "r").length;
  const scope = gaps === 0 ? "Light" : gaps <= 1 ? "Medium" : "Heavy";
  const sponsor = Boolean(pay) && pay !== "self";

  const cx = cfg.complexity;
  const cscore =
    cx.base +
    cx.per_gap * gaps +
    (override ? cx.override : 0) +
    (destC === "r" ? cx.dest_red : 0) +
    (sponsor ? cx.sponsor : 0);
  const complexity = cscore >= cx.premium ? "Premium" : cscore >= cx.plus ? "Plus" : "Base";

  let timeFeas: "On-track" | "Tight" | "At-risk";
  if (daysLeft !== null && daysLeft < 30 && gaps >= 2) timeFeas = "At-risk";
  else if (daysLeft !== null && daysLeft < 45 && gaps >= 1) timeFeas = "Tight";
  else timeFeas = "On-track";

  return {
    pillar_return: ret,
    pillar_funding: fun,
    pillar_risk: rsk,
    approvability_score: score,
    approvability_band: band,
    urgency: urg,
    days_left: daysLeft,
    decision_cell: { name: cell.name, action: cell.action, pricing: cell.pricing },
    override_flag: override,
    consistency_flags: flags,
    billable_scope: scope,
    sponsor_dependency: sponsor,
    complexity,
    complexity_score: cscore,
    time_feasibility: timeFeas,
    doc_gaps: gaps,
    data_flags: dataFlags,
    _colors: { dest: destC, occ: occC, sav: savC, pay: payC, hist: histC, ties: tiesC, docs },
  };
}
