import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusUpdater from "./StatusUpdater";
import AnonymizeButton from "./AnonymizeButton";
import AssessmentResultForm from "./AssessmentResultForm";
import SendResultFlow from "./SendResultFlow";
import CopyLineIdButton from "./CopyLineIdButton";
import MessageLogPanel from "./MessageLogPanel";
import { existsSync } from "node:fs";
import path from "node:path";
import { healthcheckFromDbRow, defaultLangFor } from "@/lib/healthcheck-data";
import { assessmentResultMessage } from "@/lib/line-messaging";
import { STATUS_LABEL, type StatusValue } from "@/lib/status";
import { LABELS, TIES_LABELS, PAST_VISA_LABELS, label, refusedText, overstayText } from "@/lib/answer-labels";
import { displayName } from "@/lib/account-name";

export const dynamic = "force-dynamic";

function fmtDateTime(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "short", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  }) + " น.";
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

function Section({
  title,
  menu,
  children,
}: {
  title: string;
  menu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
        {menu}
      </div>
      {children}
    </div>
  );
}

type Dict = Record<string, unknown>;
function one(v: unknown): Dict {
  return ((Array.isArray(v) ? v[0] : v) ?? {}) as Dict;
}

// Card palettes per benchmark color (g/y/r) — same vocabulary as the worksheet PDF.
const CARD_BG: Record<string, string> = { g: "bg-green-50", y: "bg-amber-50", r: "bg-red-50" };
const CARD_TEXT: Record<string, string> = { g: "text-green-700", y: "text-amber-700", r: "text-red-700" };
const DOT_BG: Record<string, string> = { g: "bg-green-500", y: "bg-amber-500", r: "bg-red-500" };
const STATE_WORD: Record<string, string> = { g: "แข็งแรง", y: "ปานกลาง", r: "ไม่แข็งแรง" };
const HISTORY_WORD: Record<string, string> = { g: "สะอาด", y: "มีจุดต้องตรวจ", r: "มีประวัติ" };
const BAND_WORD: Record<string, string> = { High: "สูง", Med: "ปานกลาง", Low: "น้อย", OVERRIDE: "ต้องรีวิว" };
const BAND_COLOR: Record<string, string> = { High: "g", Med: "y", Low: "r", OVERRIDE: "r" };
const URGENCY_WORD: Record<string, string> = { Low: "ไม่ด่วน", Med: "ปานกลาง", High: "ด่วน" };
const URGENCY_COLOR: Record<string, string> = { Low: "g", Med: "y", High: "r" };

function StateCard({ title, color, word, sub }: { title: string; color: string; word: string; sub?: string }) {
  return (
    <div className={`rounded-xl p-3 ${CARD_BG[color] ?? "bg-gray-50"}`}>
      <div className="text-[11px] text-gray-500">{title}</div>
      <div className={`flex items-center gap-1.5 text-sm font-bold ${CARD_TEXT[color] ?? "text-gray-700"}`}>
        <span className={`h-2 w-2 rounded-full ${DOT_BG[color] ?? "bg-gray-400"}`} />
        {word}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

/** Read-only system evaluation (auto rule-engine). Separate from the human's manual pass/notes.
 * Layout mirrors the internal worksheet PDF: 3 state cards + โอกาสผ่าน/ความด่วน + decision box. */
function AutoAssessment({ evaluation }: { evaluation: Dict }) {
  const result = (evaluation.result ?? {}) as Dict;
  const band = result.approvability_band as string | undefined;
  const colors = (result._colors ?? {}) as Dict;
  const cell = (result.decision_cell ?? {}) as Dict;
  const meta = (result.meta ?? {}) as Dict;
  const flags = (result.consistency_flags ?? []) as string[];
  const dataFlags = (result.data_flags ?? []) as string[];
  const override = result.override_flag === true;
  const urgency = result.urgency as string;

  return (
    <Section title="ผลประเมินอัตโนมัติ (ระบบ)">
      {!band ? (
        <p className="text-sm text-gray-400">ยังไม่มีผลประเมินอัตโนมัติ</p>
      ) : (
        <div className="space-y-3">
          {override && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
              🛑 เคยถูกปฏิเสธวีซ่า / Overstay — ส่ง Senior ตรวจสอบก่อนเสนอราคา
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <StateCard title="ความผูกพันในไทย" color={(colors.ties as string) ?? ""} word={STATE_WORD[colors.ties as string] ?? "—"} />
            <StateCard title="การเงิน" color={(result.pillar_funding as string) ?? ""} word={STATE_WORD[result.pillar_funding as string] ?? "—"} />
            <StateCard title="ประวัติการเดินทาง" color={(result.pillar_risk as string) ?? ""} word={HISTORY_WORD[result.pillar_risk as string] ?? "—"} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StateCard
              title="โอกาสผ่าน (ระบบ)"
              color={BAND_COLOR[band] ?? "y"}
              word={BAND_WORD[band] ?? band}
              sub={`คะแนน ${String(evaluation.score ?? result.approvability_score ?? "—")}/98`}
            />
            <StateCard
              title="ความด่วน"
              color={URGENCY_COLOR[urgency] ?? "y"}
              word={URGENCY_WORD[urgency] ?? urgency}
              sub={result.days_left != null ? `เหลือ ${String(result.days_left)} วันก่อนเดินทาง` : "ไม่ทราบวันเดินทาง"}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-sm font-bold text-gray-800">{cell.name as string}</div>
            <div className="text-sm text-gray-600">{cell.action as string}</div>
            <div className="mt-1 text-xs text-gray-400">
              ราคา: {cell.pricing as string} · งานเอกสาร {result.billable_scope as string} · ความซับซ้อน {result.complexity as string} · เวลา {result.time_feasibility as string}
            </div>
          </div>

          {flags.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs font-bold text-amber-700 mb-1">จุดที่ต้องตรวจ</div>
              <ul className="list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                {flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {dataFlags.length > 0 && (
            <p className="text-[11px] text-gray-400">ข้อมูลไม่ครบ: {dataFlags.join(" · ")}</p>
          )}

          <p className="text-[11px] text-gray-300">
            {(evaluation.evaluated_by as string) ?? "rule-engine"}
            {meta.evaluated_at ? ` · ${new Date(meta.evaluated_at as string).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
      )}
    </Section>
  );
}

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: row, error } = await supabase
    .from("user_assessment")
    .select("*, account:account_id(*), trip:trip_id(*), visa_evaluation(*), status_history(*)")
    .eq("id", id)
    .single();

  if (error || !row) notFound();

  const s = row as Dict;
  const account = one(s.account);
  const trip = one(s.trip);
  const evaluation = one(s.visa_evaluation);
  const b = (s.branch_answers ?? {}) as Record<string, string | string[]>;
  const visaType = trip.visa_type as string;
  const occ = s.occupation as string;
  const phone = account.phone_country_code ? `${account.phone_country_code} ${account.phone}` : (account.phone as string);
  const name = displayName(account);
  const isAnonymized = account.full_name === "[ลบแล้ว]" || account.nickname === "[ลบแล้ว]";

  type StatusHistoryEntry = { id: string; from_status: string | null; to_status: string; changed_at: string };
  const statusHistory = ((s.status_history ?? []) as StatusHistoryEntry[])
    .slice()
    .sort((h1, h2) => new Date(h2.changed_at).getTime() - new Date(h1.changed_at).getTime());

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* two columns on desktop: case detail + sticky outbound-message panel */}
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
      <div className="max-w-2xl mx-auto lg:mx-0 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">{name}</h1>
          {typeof s.ticket_id === "string" && s.ticket_id && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">{s.ticket_id}</span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(s.created_at as string).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
          <a
            href={`/api/admin/assessment-pdf/${s.id}`}
            target="_blank"
            rel="noopener"
            className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
            title="ใบงานประเมิน (PDF ภายใน กรอกได้)"
          >
            🖨️ ใบงาน PDF
          </a>
        </div>

        {/* Status updater */}
        <StatusUpdater id={s.id as string} currentStatus={s.status as string} />

        {/* Status change timeline */}
        <Section title="ประวัติสถานะ">
          {statusHistory.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีการเปลี่ยนสถานะ</p>
          ) : (
            <div>
              {statusHistory.map((h) => (
                <div key={h.id} className="flex gap-3 py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-800 font-medium">
                    {h.from_status ? (STATUS_LABEL[h.from_status as StatusValue] ?? h.from_status) : "—"}
                    {" → "}
                    {STATUS_LABEL[h.to_status as StatusValue] ?? h.to_status}
                  </span>
                  <span className="text-gray-400 ml-auto whitespace-nowrap">
                    {new Date(h.changed_at).toLocaleDateString("th-TH", {
                      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Auto rule-engine evaluation (system, read-only) */}
        <AutoAssessment evaluation={evaluation} />

        {/* Assessment result (agent-filled) */}
        <AssessmentResultForm
          assessmentId={s.id as string}
          status={s.status as string}
          initialPass={(evaluation.pass as boolean | null) ?? null}
          initialNotes={(evaluation.notes as string | null) ?? null}
          initialStrengths={Array.isArray(evaluation.strengths) ? (evaluation.strengths as string[]) : []}
          initialImprovements={Array.isArray(evaluation.improvements) ? (evaluation.improvements as string[]) : []}
        />

        {/* Send result to LINE — healthcheck image + message, 2-step confirm */}
        {(() => {
          const hcTh = healthcheckFromDbRow(s, "th");
          const hcEn = healthcheckFromDbRow(s, "en");
          const ready = evaluation.pass != null && hcTh.strengths.length > 0 && hcTh.improvements.length > 0;
          const flagSrc = existsSync(path.join(process.cwd(), "public", "flags", `${hcTh.destCode}.png`))
            ? `/flags/${hcTh.destCode}.png`
            : null;
          const blockReason = !account.line_user_id
            ? "ลูกค้าไม่มีบัญชี LINE ในระบบ — ส่งไม่ได้"
            : account.is_friend === false
              ? "ลูกค้ายังไม่ได้เพิ่มเพื่อน LINE OA — ส่งไม่ได้"
              : null;
          const prefill = (lang: "th" | "en") =>
            evaluation.pass != null
              ? (assessmentResultMessage(evaluation.pass as boolean, (evaluation.notes as string) ?? "", lang) as { text: string }).text
              : "";
          return (
            <SendResultFlow
              assessmentId={s.id as string}
              status={s.status as string}
              ready={ready}
              resultSentAt={(s.result_sent_at as string | null) ?? null}
              canSend={blockReason === null}
              blockReason={blockReason}
              dataTh={hcTh}
              dataEn={hcEn}
              defaultLang={defaultLangFor(s)}
              flagSrc={flagSrc}
              prefillTh={prefill("th")}
              prefillEn={prefill("en")}
            />
          );
        })()}

        {/* LINE */}
        <Section title="LINE">
          <Row title="Display Name" value={account.line_display_name} />
          <div className="flex gap-3 py-2 border-b border-gray-50 items-center">
            <span className="text-gray-400 text-sm w-48 shrink-0">User ID</span>
            <span className="text-gray-800 text-sm font-medium flex-1">{(account.line_user_id as string) ?? "—"}</span>
            <CopyLineIdButton userId={(account.line_user_id as string) ?? null} />
          </div>
          <Row title="เป็นเพื่อน OA" value={account.is_friend} />
          <Row title="รูปโปรไฟล์" value={account.line_picture_url ? "มี" : null} />
        </Section>

        {/* Personal */}
        <Section
          title="S1 · ข้อมูลส่วนตัว"
          menu={!isAnonymized ? <AnonymizeButton accountId={account.id as string} /> : undefined}
        >
          {isAnonymized && (
            <p className="text-xs text-gray-400 -mt-1 mb-2">ลบข้อมูลส่วนตัวแล้ว (PDPA)</p>
          )}
          <Row title="ชื่อเล่น" value={name} />
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
          {/* prior-visa history — now universal across all visa types (fallback to legacy per-type keys) */}
          {(() => {
            const pv = b.previous_visas ?? b.tourist_previous_visas ?? b.business_previous_visas;
            return Array.isArray(pv) ? (
              <Row title="วีซ่าที่เคยได้รับ (5 ปี)" value={(pv as string[]).map(v => PAST_VISA_LABELS[v] ?? v).join(", ")} />
            ) : null;
          })()}
          {visaType === "visitor" && <Row title="สถานะผู้เชิญ" value={label("visitor_host_status", b.visitor_host_status as string)} />}
          {visaType === "visitor" && <Row title="ความสัมพันธ์" value={label("visitor_relationship", b.visitor_relationship as string)} />}
          {visaType === "visitor" && Array.isArray(b.visitor_host_documents) && (
            <Row title="เอกสารที่ผู้เชิญมี" value={(b.visitor_host_documents as string[]).map(v => LABELS.visitor_host_documents[v] ?? v).join(", ")} />
          )}
          {visaType === "business" && <Row title="Invitation Letter" value={label("business_invitation_letter", b.business_invitation_letter as string)} />}
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
          <Row title="นัดโทรกลับ" value={fmtDateTime(s.callback_datetime)} />
          <Row title="Due date" value={fmtDateTime(s.due_date)} />
          <Row title="ความต้องการ" value={label("intent", s.intent)} />
        </Section>
      </div>

      {/* message log — sticky, panel-internal scroll so it never overflows the screen */}
      <aside className="mt-6 h-[70vh] lg:sticky lg:top-6 lg:mt-0 lg:h-[calc(100vh-3rem)]">
        <MessageLogPanel assessmentId={s.id as string} />
      </aside>
      </div>
    </main>
  );
}
