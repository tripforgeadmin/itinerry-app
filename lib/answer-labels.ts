// Label lookups for user_assessment / user_trip / account answer values.
//
// Thai is the source map; LABELS_EN holds English only where it differs (brand/country/neutral
// values fall back to Thai). label()/refusedText()/overstayText() take an optional `lang`
// (default "th") so callers that don't pass it keep rendering Thai unchanged.

import type { Lang } from "@/lib/i18n";

export const LABELS: Record<string, Record<string, string>> = {
  visa_type: { tourist: "ท่องเที่ยว", visitor: "เยี่ยมเยียน", business: "ธุรกิจ", student: "นักเรียน" },
  occupation: { employee: "พนักงานประจำ", government: "ข้าราชการ", freelance: "Freelance", business_owner: "เจ้าของธุรกิจ", retired: "เกษียณ", homemaker: "แม่บ้าน", student_occ: "นักเรียน/นักศึกษา" },
  // over300k is legacy — kept only so rows answered before the 300k-500k/500k-1m split still display correctly.
  savings_balance: { under50k: "< 50,000 บาท", "50k_150k": "50,000–150,000 บาท", "150k_300k": "150,000–300,000 บาท", "300k_500k": "300,000–500,000 บาท", "500k_1m": "500,000–1,000,000 บาท", over300k: "> 300,000 บาท" },
  source: { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", google: "Google", referral: "เพื่อนแนะนำ", other: "อื่นๆ" },
  nationality: { thai: "ไทย", other: "อื่นๆ" },
  contact_preference: { line: "LINE OA", call: "โทรกลับ" },
  intent: { explore: "ตรวจความพร้อม / ศึกษาข้อมูล", ready: "เลือกปลายทางแล้ว / หาบริการ", execute: "ช่วยดำเนินการ / เร่งด่วน / แก้เคส" },
  callback_time: { morning: "เช้า 9:00–12:00", afternoon: "บ่าย 12:00–15:00", evening: "เย็น 15:00–18:00" },
  visitor_host_status: { citizen_pr: "Citizen / PR", work_visa: "Work Visa", student_visa: "Student Visa", not_sure: "ไม่แน่ใจ" },
  visitor_relationship: { family: "ครอบครัว", relative: "ญาติ", married: "คู่สมรส (จดทะเบียน)", partner: "แฟน", friend: "เพื่อน" },
  visitor_host_documents: { invitation_letter: "จดหมายเชิญ", house_cert: "หลักฐานที่พัก", job_cert: "จดหมายรับรองงาน", bank_stmt: "รายการเดินบัญชี 6 เดือน", none: "ไม่มีเลย" },
  business_invitation_letter: { yes: "มีแล้ว", requesting: "กำลังจะขอ", not_required: "ไม่ต้องการ" },
  student_acceptance_letter: { received: "ได้รับแล้ว", in_progress: "อยู่ระหว่างสมัคร", not_applied: "ยังไม่ได้สมัคร" },
  student_expense_sponsor: { self: "ตัวเอง", parents: "พ่อแม่", scholarship: "ทุนการศึกษา", other: "อื่นๆ" },
  employee_work_letter: { complete: "มีครบ", partial: "มีแต่ไม่ครบ", none: "ยังไม่มี" },
  freelance_income_proof: { all_three: "มีครบทั้งสามอย่าง", partial: "มีบางส่วน", none: "ไม่มีเลย" },
  freelance_tax_history: { all_3y: "มีครบ 3 ปี", partial: "มีบางส่วน", none: "ไม่มีเลย" },
  business_registration: { yes: "มีแล้ว", no: "ยังไม่มี" },
  dependent_expense_sponsor: { parents: "พ่อแม่", spouse: "คู่สมรส", self_savings: "ตัวเอง (มีเงินออม)", employer: "บริษัท", other: "อื่นๆ" },
};

// English overrides — only entries that differ from Thai; the rest fall back to LABELS.
export const LABELS_EN: Record<string, Record<string, string>> = {
  visa_type: { tourist: "Tourist", visitor: "Visitor", business: "Business", student: "Student" },
  occupation: { employee: "Employee", government: "Government", business_owner: "Business owner", retired: "Retired", homemaker: "Homemaker", student_occ: "Student" },
  savings_balance: { under50k: "< 50,000 THB", "50k_150k": "50,000–150,000 THB", "150k_300k": "150,000–300,000 THB", "300k_500k": "300,000–500,000 THB", "500k_1m": "500,000–1,000,000 THB", over300k: "> 300,000 THB" },
  source: { referral: "Referral", other: "Other" },
  nationality: { thai: "Thai", other: "Other" },
  contact_preference: { call: "Call back" },
  intent: { explore: "Checking readiness / researching", ready: "Destination chosen / finding a service", execute: "Hands-on help / urgent / fix a case" },
  callback_time: { morning: "Morning 9:00–12:00", afternoon: "Afternoon 12:00–15:00", evening: "Evening 15:00–18:00" },
  visitor_host_status: { not_sure: "Not sure" },
  visitor_relationship: { family: "Family", relative: "Relative", married: "Spouse (registered)", partner: "Partner", friend: "Friend" },
  visitor_host_documents: { invitation_letter: "Invitation letter", house_cert: "Proof of accommodation", job_cert: "Employment letter", bank_stmt: "6-month bank statement", none: "None" },
  business_invitation_letter: { yes: "Have it", requesting: "Requesting", not_required: "Not required" },
  student_acceptance_letter: { received: "Received", in_progress: "Applying", not_applied: "Not applied yet" },
  student_expense_sponsor: { self: "Self", parents: "Parents", scholarship: "Scholarship", other: "Other" },
  employee_work_letter: { complete: "Complete", partial: "Partial", none: "None yet" },
  freelance_income_proof: { all_three: "All three", partial: "Partial", none: "None" },
  freelance_tax_history: { all_3y: "All 3 years", partial: "Partial", none: "None" },
  business_registration: { yes: "Registered", no: "Not yet" },
  dependent_expense_sponsor: { parents: "Parents", spouse: "Spouse", self_savings: "Self (savings)", employer: "Employer", other: "Other" },
};

// spouse_children is legacy — kept only so rows answered before the spouse/children split still display correctly.
export const TIES_LABELS: Record<string, string> = {
  job: "งานประจำ/ธุรกิจ", property: "บ้าน/คอนโด/ที่ดิน", spouse: "คู่สมรส", children: "บุตร", spouse_children: "คู่สมรส/บุตร",
  dependents: "พ่อแม่/ผู้ดูแล", investments: "เงินลงทุน/ทรัพย์สิน", none: "ไม่มี",
};
export const TIES_LABELS_EN: Record<string, string> = {
  job: "Job/business", property: "Home/condo/land", spouse: "Spouse", children: "Children", spouse_children: "Spouse/children",
  dependents: "Parents/dependents", investments: "Investments/assets", none: "None",
};

export const PAST_VISA_LABELS: Record<string, string> = {
  never: "ไม่เคย", uk: "UK", schengen: "Schengen", usa: "USA", canada: "Canada",
  australia: "Australia", nz: "New Zealand", japan: "Japan", korea: "S. Korea",
  china: "China", dubai: "Dubai/UAE",
};
export const PAST_VISA_LABELS_EN: Record<string, string> = { never: "Never" };

export function label(group: string, val: unknown, lang: Lang = "th"): string {
  const v = String(val ?? "");
  if (lang === "en") return LABELS_EN[group]?.[v] ?? LABELS[group]?.[v] ?? v;
  return LABELS[group]?.[v] ?? v;
}

/** Ties multi-select label by language. */
export function tieLabel(val: string, lang: Lang = "th"): string {
  return (lang === "en" ? TIES_LABELS_EN[val] : TIES_LABELS[val]) ?? val;
}

/** Past-visa label by language. */
export function pastVisaLabel(val: string, lang: Lang = "th"): string {
  return (lang === "en" ? PAST_VISA_LABELS_EN[val] : PAST_VISA_LABELS[val]) ?? PAST_VISA_LABELS[val] ?? val;
}

type RefusedEntry = { country?: string; year?: string };
type OverstayEntry = { country?: string; year?: string; days?: string };

export function refusedText(s: Record<string, unknown>, lang: Lang = "th"): string {
  const yes = lang === "en" ? "Yes — " : "ใช่ — ";
  const never = lang === "en" ? "Never" : "ไม่เคย";
  const entries = s.visa_refused_entries as RefusedEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return yes + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""}`.trim()).join(", ");
  return s.visa_refused ? `${yes}${s.visa_refused_details ?? ""}` : never;
}

export function overstayText(s: Record<string, unknown>, lang: Lang = "th"): string {
  const yes = lang === "en" ? "Yes — " : "ใช่ — ";
  const never = lang === "en" ? "Never" : "ไม่เคย";
  const days = lang === "en" ? "days" : "วัน";
  const entries = s.overstay_entries as OverstayEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return yes + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""} · ${e.days ?? "?"} ${days}`.trim()).join(", ");
  return s.overstayed ? `${yes}${s.overstay_details ?? ""}` : never;
}
