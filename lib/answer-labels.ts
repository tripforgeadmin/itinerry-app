// Thai label lookups for user_assessment / user_trip / account answer values.
//
// Extracted from app/admin/[id]/page.tsx so the admin case-detail view and the
// customer-facing /result page always render identical Thai copy for the same
// underlying stored values — avoids the two views drifting out of sync.

export const LABELS: Record<string, Record<string, string>> = {
  visa_type: { tourist: "ท่องเที่ยว", visitor: "เยี่ยมเยียน", business: "ธุรกิจ", student: "นักเรียน" },
  occupation: { employee: "พนักงานประจำ", government: "ข้าราชการ", freelance: "Freelance", business_owner: "เจ้าของธุรกิจ", retired: "เกษียณ", homemaker: "แม่บ้าน", student_occ: "นักเรียน/นักศึกษา" },
  savings_balance: { under50k: "< 50,000 บาท", "50k_150k": "50,000–150,000 บาท", "150k_300k": "150,000–300,000 บาท", over300k: "> 300,000 บาท" },
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

export const TIES_LABELS: Record<string, string> = {
  job: "งานประจำ/ธุรกิจ", property: "บ้าน/คอนโด/ที่ดิน", spouse_children: "คู่สมรส/บุตร",
  dependents: "พ่อแม่/ผู้ดูแล", investments: "เงินลงทุน/ทรัพย์สิน", none: "ไม่มี",
};

export const PAST_VISA_LABELS: Record<string, string> = {
  never: "ไม่เคย", uk: "UK", schengen: "Schengen", usa: "USA", canada: "Canada",
  australia: "Australia", nz: "New Zealand", japan: "Japan", korea: "S. Korea",
  china: "China", dubai: "Dubai/UAE",
};

export function label(group: string, val: unknown): string {
  const v = String(val ?? "");
  return LABELS[group]?.[v] ?? v;
}

type RefusedEntry = { country?: string; year?: string };
type OverstayEntry = { country?: string; year?: string; days?: string };

export function refusedText(s: Record<string, unknown>): string {
  const entries = s.visa_refused_entries as RefusedEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return "ใช่ — " + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""}`.trim()).join(", ");
  return s.visa_refused ? `ใช่ — ${s.visa_refused_details ?? ""}` : "ไม่เคย";
}

export function overstayText(s: Record<string, unknown>): string {
  const entries = s.overstay_entries as OverstayEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return "ใช่ — " + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""} · ${e.days ?? "?"} วัน`.trim()).join(", ");
  return s.overstayed ? `ใช่ — ${s.overstay_details ?? ""}` : "ไม่เคย";
}
