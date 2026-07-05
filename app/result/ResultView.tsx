"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import { customerStatus } from "@/lib/status";
import { label, refusedText, overstayText, TIES_LABELS, PAST_VISA_LABELS, LABELS } from "@/lib/answer-labels";
import { COUNTRIES } from "@/lib/countries";
import { displayName } from "@/lib/account-name";

type Dict = Record<string, unknown>;

interface Account {
  id: string;
  nickname: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  nationality_other: string | null;
  phone: string | null;
  phone_country_code: string | null;
  email: string | null;
}

export default function ResultView({
  account,
  assessment,
  hasMultiple,
}: {
  account: Account;
  assessment: Dict;
  hasMultiple: boolean;
}) {
  const active = assessment;
  const trip = (active.trip ?? {}) as Dict;
  const visaType = trip.visa_type as string;
  const occ = active.occupation as string;
  const b = (active.branch_answers ?? {}) as Record<string, string | string[]>;

  const name = displayName(account);
  const phone = account.phone_country_code ? `${account.phone_country_code} ${account.phone ?? ""}` : account.phone;
  const destinationName =
    COUNTRIES.find((c) => c.code === (trip.destination as string)?.toUpperCase())?.th ??
    (trip.destination as string)?.toUpperCase();
  const status = (active.status as string) ?? "pending_review";
  const statusDisplay = customerStatus(status);
  const createdAt = new Date(active.created_at as string);
  const callbackDatetime = active.callback_datetime
    ? new Date(active.callback_datetime as string).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        weekday: "short", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
      }) + " น."
    : null;

  return (
    <main className="min-h-screen bg-surface relative overflow-hidden">
      {/* Watermark — public/mascot/itin_main.png, 524×524 RGBA, low-opacity behind content */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/itin_main.png"
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-10 -right-10 w-96 h-96 object-contain opacity-10 z-0"
      />

      <div className="relative z-10 max-w-sm mx-auto w-full px-5 pt-8 pb-12">
        {hasMultiple && (
          <Link href="/result" className="inline-flex items-center gap-1 text-xs text-muted mb-4">
            ← กลับไปที่รายการ
          </Link>
        )}

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-2 mb-6"
        >
          <ItinerryLogo size="md" />
        </motion.div>

        {/* Status banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card rounded-3xl shadow-card p-5 mb-4"
        >
          <p className="text-xs font-bold text-muted-soft uppercase tracking-wider mb-2">สถานะการดำเนินการ</p>
          <span className={`inline-block px-3 py-1.5 rounded-xl text-sm font-bold ${statusDisplay.color}`}>
            {statusDisplay.label}
          </span>
          {typeof active.ticket_id === "string" && active.ticket_id && (
            <p className="text-xs text-muted mt-3">
              หมายเลขอ้างอิง: <span className="font-bold text-primary-mid">{active.ticket_id}</span>
            </p>
          )}
          <p className="text-xs text-muted-soft mt-1">
            ส่งเมื่อ {createdAt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </motion.div>

        <Section title="ข้อมูลผู้สมัคร" delay={0.2}>
          <Row title="ชื่อ-นามสกุล" value={name} />
          <Row title="สัญชาติ" value={account.nationality === "other" ? `อื่นๆ: ${account.nationality_other}` : label("nationality", account.nationality)} />
          <Row title="เบอร์โทร" value={phone} />
          <Row title="อีเมล" value={account.email} />
        </Section>

        <Section title="แผนการเดินทาง" delay={0.25}>
          <Row title="ประเทศปลายทาง" value={destinationName} />
          <Row title="ประเภทวีซ่า" value={label("visa_type", trip.visa_type)} />
          {(visaType === "tourist" || visaType === "visitor" || visaType === "business") && (
            <Row title="วันเดินทาง" value={trip.travel_arrival} />
          )}
          {(visaType === "tourist" || visaType === "business") && <Row title="วันกลับ" value={trip.travel_return} />}
          {visaType === "student" && <Row title="วันเริ่มเรียน" value={trip.study_start} />}
          {(() => {
            const pv = b.previous_visas ?? b.tourist_previous_visas ?? b.business_previous_visas;
            return Array.isArray(pv) ? (
              <Row title="วีซ่าที่เคยได้รับ (5 ปี)" value={(pv as string[]).map((v) => PAST_VISA_LABELS[v] ?? v).join(", ")} />
            ) : null;
          })()}
          {visaType === "visitor" && <Row title="สถานะผู้เชิญ" value={label("visitor_host_status", b.visitor_host_status as string)} />}
          {visaType === "visitor" && <Row title="ความสัมพันธ์" value={label("visitor_relationship", b.visitor_relationship as string)} />}
          {visaType === "visitor" && Array.isArray(b.visitor_host_documents) && (
            <Row title="เอกสารที่ผู้เชิญมี" value={(b.visitor_host_documents as string[]).map((v) => LABELS.visitor_host_documents[v] ?? v).join(", ")} />
          )}
          {visaType === "business" && <Row title="Invitation Letter" value={label("business_invitation_letter", b.business_invitation_letter as string)} />}
          {visaType === "student" && <Row title="Acceptance Letter" value={label("student_acceptance_letter", b.student_acceptance_letter as string)} />}
          {visaType === "student" && <Row title="ผู้รับผิดชอบค่าเรียน" value={label("student_expense_sponsor", b.student_expense_sponsor as string)} />}
        </Section>

        <Section title="อาชีพ" delay={0.3}>
          <Row title="อาชีพ" value={label("occupation", occ)} />
          {(occ === "employee" || occ === "government") && <Row title="หนังสือรับรองงาน" value={label("employee_work_letter", b.employee_work_letter as string)} />}
          {occ === "freelance" && <Row title="เอกสารพิสูจน์รายได้" value={label("freelance_income_proof", b.freelance_income_proof as string)} />}
          {occ === "freelance" && <Row title="เอกสารภาษี 3 ปี" value={label("freelance_tax_history", b.freelance_tax_history as string)} />}
          {occ === "business_owner" && <Row title="หนังสือรับรองบริษัท" value={label("business_registration", b.business_registration as string)} />}
          {(occ === "retired" || occ === "homemaker" || occ === "student_occ") && (
            <Row title="ผู้รับผิดชอบค่าเดินทาง" value={label("dependent_expense_sponsor", b.dependent_expense_sponsor as string)} />
          )}
        </Section>

        <Section title="ข้อมูลสำหรับพิจารณา" delay={0.35}>
          <Row title="ถูกปฏิเสธวีซ่า" value={refusedText(active)} />
          <Row title="Overstay" value={overstayText(active)} />
          <Row title="เงินในบัญชี" value={label("savings_balance", active.savings_balance)} />
          <Row title="ความผูกพันกับไทย" value={(active.ties_thailand as string[])?.map((v) => TIES_LABELS[v] ?? v).join(", ")} />
        </Section>

        <Section title="ช่องทางติดต่อ" delay={0.4}>
          <Row title="ติดต่อผ่าน" value={label("contact_preference", active.contact_preference)} />
          <Row title="นัดโทรกลับ" value={callbackDatetime} />
          <Row title="ความต้องการ" value={label("intent", active.intent)} />
        </Section>
      </div>
    </main>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card rounded-2xl shadow-card p-5 mb-4"
    >
      <h2 className="text-xs font-bold text-muted-soft uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </motion.div>
  );
}

function Row({ title, value }: { title: string; value?: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "ใช่" : "ไม่ใช่") : Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <span className="text-muted-soft text-sm w-40 shrink-0">{title}</span>
      <span className="text-primary text-sm font-medium">{display}</span>
    </div>
  );
}
