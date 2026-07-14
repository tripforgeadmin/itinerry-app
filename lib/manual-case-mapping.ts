/**
 * Shared answers <-> DB-column mapping for manually-entered / manually-edited cases.
 * Forward (*FromAnswers) is used by both app/api/admin/manual-case/route.ts (create) and
 * app/api/admin/edit-case/route.ts (edit) so the mapping only exists in one place.
 * Reverse (rowToAnswers) seeds an edit form from an existing case's stored columns.
 */

export function toNull(v: string | undefined): string | null {
  return v && v !== "" ? v : null;
}
export function toDate(v: string | undefined): string | null {
  return v && v !== "" ? v : null;
}
export function toArray(v: string | undefined): string[] {
  if (!v || v === "") return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
export function toJson(v: string | undefined): unknown | null {
  if (!v || v === "") return null;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

// qKey -> semantic branch_answers key (S2B/S2C/S2D + S4A-D branch fields).
const BRANCH_MAP: Record<string, string> = {
  q13: "visitor_arrival",
  q14: "visitor_host_status",
  q15: "visitor_relationship",
  q16: "visitor_host_documents",
  q17: "business_arrival",
  q18: "business_return",
  q19: "business_invitation_letter",
  q22: "student_acceptance_letter",
  q23: "student_expense_sponsor",
  q25: "employee_work_letter",
  q26: "freelance_income_proof",
  q27: "freelance_tax_history",
  q28: "business_registration",
  q29: "dependent_expense_sponsor",
};
const MULTI_SELECT_BRANCH_KEYS = new Set(["q12", "q16", "q26"]);
const REVERSE_BRANCH_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(BRANCH_MAP).map(([qKey, semanticKey]) => [semanticKey, qKey])
);

export function branchAnswersFromAnswers(
  answers: Record<string, string | undefined>
): Record<string, string | string[]> {
  const branchAnswers: Record<string, string | string[]> = {};
  if (answers.q12 && answers.q12 !== "") {
    branchAnswers["previous_visas"] = toArray(answers.q12);
  }
  for (const [qKey, semanticKey] of Object.entries(BRANCH_MAP)) {
    const val = answers[qKey];
    if (val && val !== "") {
      branchAnswers[semanticKey] = MULTI_SELECT_BRANCH_KEYS.has(qKey) ? toArray(val) : val;
    }
  }
  return branchAnswers;
}

export function tripFieldsFromAnswers(answers: Record<string, string | undefined>) {
  return {
    destination: answers.q8 ?? "",
    visa_type: answers.q9 ?? "",
    travel_arrival: toDate(answers.q10 ?? answers.q13 ?? answers.q17),
    travel_return: toDate(answers.q11 ?? answers.q39 ?? answers.q18),
    study_start: toDate(answers.q21),
  };
}

/** S2/S3-S4/S5 subset of user_assessment fields — deliberately excludes intent, contact
 *  preference, callback slot, and due date, which are separate concerns not part of this feature. */
export function coreAssessmentFieldsFromAnswers(answers: Record<string, string | undefined>) {
  return {
    occupation: answers.q24 ?? "",
    visa_refused: answers.q30 === "yes",
    visa_refused_details: answers.q30 === "yes" ? toNull(answers.q31) : null,
    visa_refused_entries: answers.q30 === "yes" ? toJson(answers.q31_entries) : null,
    overstayed: answers.q32 === "yes",
    overstay_details: answers.q32 === "yes" ? toNull(answers.q33) : null,
    overstay_entries: answers.q32 === "yes" ? toJson(answers.q33_entries) : null,
    savings_balance: answers.q34 ?? "",
    ties_thailand: toArray(answers.q35),
  };
}

export interface EditableRow {
  occupation: string | null;
  visa_refused: boolean | null;
  visa_refused_details: string | null;
  visa_refused_entries: unknown;
  overstayed: boolean | null;
  overstay_details: string | null;
  overstay_entries: unknown;
  savings_balance: string | null;
  ties_thailand: string[] | null;
  branch_answers: Record<string, string | string[]> | null;
}
export interface EditableTrip {
  destination: string | null;
  visa_type: string | null;
  travel_arrival: string | null;
  travel_return: string | null;
  study_start: string | null;
}

/** Reverse of tripFieldsFromAnswers/coreAssessmentFieldsFromAnswers/branchAnswersFromAnswers —
 *  reconstructs a flat answers set from a case's stored DB columns, to seed the edit form. */
export function rowToAnswers(row: EditableRow, trip: EditableTrip): Record<string, string> {
  const answers: Record<string, string> = {};
  const set = (k: string, v: string | null | undefined) => {
    if (v !== null && v !== undefined && v !== "") answers[k] = v;
  };

  set("q8", trip.destination);
  set("q9", trip.visa_type);
  const visaType = trip.visa_type ?? "";
  if (visaType === "tourist") {
    set("q10", trip.travel_arrival);
    set("q11", trip.travel_return);
  } else if (visaType === "visitor") {
    set("q13", trip.travel_arrival);
    set("q39", trip.travel_return);
  } else if (visaType === "business") {
    set("q17", trip.travel_arrival);
    set("q18", trip.travel_return);
  } else if (visaType === "student") {
    set("q21", trip.study_start);
  }

  const b = row.branch_answers ?? {};
  const prevVisas = b["previous_visas"];
  if (Array.isArray(prevVisas)) answers.q12 = prevVisas.join(", ");
  for (const [semanticKey, val] of Object.entries(b)) {
    if (semanticKey === "previous_visas") continue;
    const qKey = REVERSE_BRANCH_MAP[semanticKey];
    if (!qKey) continue;
    answers[qKey] = Array.isArray(val) ? val.join(", ") : String(val);
  }

  set("q24", row.occupation);
  answers.q30 = row.visa_refused ? "yes" : "never";
  if (row.visa_refused) {
    set("q31", row.visa_refused_details);
    if (Array.isArray(row.visa_refused_entries)) answers.q31_entries = JSON.stringify(row.visa_refused_entries);
  }
  answers.q32 = row.overstayed ? "yes" : "never";
  if (row.overstayed) {
    set("q33", row.overstay_details);
    if (Array.isArray(row.overstay_entries)) answers.q33_entries = JSON.stringify(row.overstay_entries);
  }
  set("q34", row.savings_balance);
  if (Array.isArray(row.ties_thailand) && row.ties_thailand.length > 0) answers.q35 = row.ties_thailand.join(", ");

  return answers;
}
