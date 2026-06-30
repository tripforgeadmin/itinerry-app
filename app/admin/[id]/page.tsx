import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusUpdater from "./StatusUpdater";
import AnonymizeButton from "./AnonymizeButton";

export const dynamic = "force-dynamic";

const LABELS: Record<string, Record<string, string>> = {
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

const TIES_LABELS: Record<string, string> = {
  job: "งานประจำ/ธุรกิจ", property: "บ้าน/คอนโด/ที่ดิน", spouse_children: "คู่สมรส/บุตร",
  dependents: "พ่อแม่/ผู้ดูแล", investments: "เงินลงทุน/ทรัพย์สิน", none: "ไม่มี",
};

const PAST_VISA_LABELS: Record<string, string> = {
  never: "ไม่เคย", uk: "UK", schengen: "Schengen", usa: "USA", canada: "Canada",
  australia: "Australia", nz: "New Zealand", japan: "Japan", korea: "S. Korea",
  china: "China", dubai: "Dubai/UAE",
};

function label(group: string, val: unknown) {
  const v = String(val ?? "");
  return LABELS[group]?.[v] ?? v;
}

function Row({ title, value }: { title: string; value?: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  let display: string;
  if (typeof value === "boolean") display = value ? "ใช่" : "ไม่ใช่";
  else if (Array.isArray(value)) display = value.join(", ");
  else display = String(value);
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm w-48 shrink-0">{title}</span>
      <span className="text-gray-800 text-sm font-medium">{display}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

type Dict = Record<string, unknown>;
function one(v: unknown): Dict {
  return ((Array.isArray(v) ? v[0] : v) ?? {}) as Dict;
}

type RefusedEntry = { country?: string; year?: string };
type OverstayEntry = { country?: string; year?: string; days?: string };

function refusedText(s: Dict): string {
  const entries = s.visa_refused_entries as RefusedEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return "ใช่ — " + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""}`.trim()).join(", ");
  return s.visa_refused ? `ใช่ — ${s.visa_refused_details ?? ""}` : "ไม่เคย";
}
function overstayText(s: Dict): string {
  const entries = s.overstay_entries as OverstayEntry[] | null;
  if (Array.isArray(entries) && entries.length)
    return "ใช่ — " + entries.map((e) => `${e.country ?? ""} ${e.year ?? ""} · ${e.days ?? "?"} วัน`.trim()).join(", ");
  return s.overstayed ? `ใช่ — ${s.overstay_details ?? ""}` : "ไม่เคย";
}

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("*, account:account_id(*), trip:trip_id(*)")
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  const s = row as Dict;
  const account = one(s.account);
  const trip = one(s.trip);
  const b = (s.branch_answers ?? {}) as Record<string, string | string[]>;
  const visaType = trip.visa_type as string;
  const occ = s.occupation as string;
  const phone = account.phone_country_code ? `${account.phone_country_code} ${account.phone}` : (account.phone as string);
  const name = account.first_name || account.last_name
    ? `${account.first_name ?? ""} ${account.last_name ?? ""}`.trim()
    : (account.full_name as string);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">{name}</h1>
          <span className="text-xs text-gray-400">
            {new Date(s.created_at as string).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Status updater */}
        <StatusUpdater id={s.id as string} currentStatus={s.status as string} />

        {/* PDPA anonymize */}
        <AnonymizeButton
          accountId={account.id as string}
          isAnonymized={account.full_name === "[ลบแล้ว]"}
        />

        {/* LINE */}
        <Section title="LINE">
          <Row title="Display Name" value={account.line_display_name} />
          <Row title="User ID" value={account.line_user_id} />
          <Row title="เป็นเพื่อน OA" value={account.is_friend} />
          <Row title="รูปโปรไฟล์" value={account.line_picture_url ? "มี" : null} />
        </Section>

        {/* Personal */}
        <Section title="S1 · ข้อมูลส่วนตัว">
          <Row title="ชื่อ-นามสกุล" value={name} />
          <Row title="สัญชาติ" value={account.nationality === "other" ? `อื่นๆ: ${account.nationality_other}` : label("nationality", account.nationality)} />
          <Row title="เบอร์โทร" value={phone} />
          <Row title="อีเมล" value={account.email} />
          <Row title="รู้จักจาก" value={account.source === "other" ? `อื่นๆ: ${account.source_other}` : label("source", account.source)} />
          <Row title="ยินยอม PDPA เมื่อ" value={account.consented_at ? new Date(account.consented_at as string).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : null} />
        </Section>

        {/* Destination */}
        <Section title="S2 · ปลายทาง + วีซ่า">
          <Row title="ประเทศปลายทาง" value={(trip.destination as string)?.toUpperCase()} />
          <Row title="ประเภทวีซ่า" value={label("visa_type", trip.visa_type)} />
          {(visaType === "tourist" || visaType === "visitor" || visaType === "business") && (
            <Row title="วันเดินทาง" value={trip.travel_arrival} />
          )}
          {(visaType === "tourist" || visaType === "business") && (
            <Row title="วันกลับ" value={trip.travel_return} />
          )}
          {visaType === "student" && (
            <Row title="วันเริ่มเรียน" value={trip.study_start} />
          )}
          {visaType === "tourist" && Array.isArray(b.tourist_previous_visas) && (
            <Row title="วีซ่าที่เคยได้รับ" value={(b.tourist_previous_visas as string[]).map(v => PAST_VISA_LABELS[v] ?? v).join(", ")} />
          )}
          {visaType === "visitor" && <Row title="สถานะผู้เชิญ" value={label("visitor_host_status", b.visitor_host_status as string)} />}
          {visaType === "visitor" && <Row title="ความสัมพันธ์" value={label("visitor_relationship", b.visitor_relationship as string)} />}
          {visaType === "visitor" && Array.isArray(b.visitor_host_documents) && (
            <Row title="เอกสารที่ผู้เชิญมี" value={(b.visitor_host_documents as string[]).map(v => LABELS.visitor_host_documents[v] ?? v).join(", ")} />
          )}
          {visaType === "business" && <Row title="Invitation Letter" value={label("business_invitation_letter", b.business_invitation_letter as string)} />}
          {visaType === "business" && Array.isArray(b.business_previous_visas) && (
            <Row title="วีซ่าที่เคยได้รับ" value={(b.business_previous_visas as string[]).map(v => PAST_VISA_LABELS[v] ?? v).join(", ")} />
          )}
          {visaType === "student" && <Row title="Acceptance Letter" value={label("student_acceptance_letter", b.student_acceptance_letter as string)} />}
          {visaType === "student" && <Row title="ผู้รับผิดชอบค่าเรียน" value={label("student_expense_sponsor", b.student_expense_sponsor as string)} />}
        </Section>

        {/* Occupation */}
        <Section title="S3–S4 · อาชีพ">
          <Row title="อาชีพ" value={label("occupation", occ)} />
          {(occ === "employee" || occ === "government") && <Row title="หนังสือรับรองงาน" value={label("employee_work_letter", b.employee_work_letter as string)} />}
          {occ === "freelance" && <Row title="เอกสารพิสูจน์รายได้" value={label("freelance_income_proof", b.freelance_income_proof as string)} />}
          {occ === "freelance" && <Row title="เอกสารภาษี 3 ปี" value={label("freelance_tax_history", b.freelance_tax_history as string)} />}
          {occ === "business_owner" && <Row title="หนังสือรับรองบริษัท" value={label("business_registration", b.business_registration as string)} />}
          {(occ === "retired" || occ === "homemaker" || occ === "student_occ") && (
            <Row title="ผู้รับผิดชอบค่าเดินทาง" value={label("dependent_expense_sponsor", b.dependent_expense_sponsor as string)} />
          )}
        </Section>

        {/* Core Qualification */}
        <Section title="S5 · คัดกรองหลัก">
          <Row title="ถูกปฏิเสธวีซ่า" value={refusedText(s)} />
          <Row title="Overstay" value={overstayText(s)} />
          <Row title="เงินในบัญชี" value={label("savings_balance", s.savings_balance)} />
          <Row title="ความผูกพันกับไทย" value={(s.ties_thailand as string[])?.map((v) => TIES_LABELS[v] ?? v).join(", ")} />
        </Section>

        {/* Contact */}
        <Section title="S6–S8 · ช่องทางติดต่อ + ความต้องการ">
          <Row title="ติดต่อผ่าน" value={label("contact_preference", s.contact_preference)} />
          <Row title="ช่วงเวลาโทร" value={label("callback_time", s.callback_time)} />
          <Row title="ความต้องการ" value={label("intent", s.intent)} />
        </Section>
      </div>
    </main>
  );
}
