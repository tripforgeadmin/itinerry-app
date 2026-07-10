import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusUpdater from "./StatusUpdater";
import ContactEditor from "./ContactEditor";
import AssessmentResultForm from "./AssessmentResultForm";
import SendResultFlow from "./SendResultFlow";
import CopyLineIdButton from "./CopyLineIdButton";
import MessageLogPanel from "./MessageLogPanel";
import TicketWorkspace from "./TicketWorkspace";
import AdminLangToggle from "../AdminLangToggle";
import { existsSync } from "node:fs";
import path from "node:path";
import { healthcheckFromDbRow, defaultLangFor } from "@/lib/healthcheck-data";
import { assessmentResultMessage } from "@/lib/line-messaging";
import { statusLabel, isClosed } from "@/lib/status";
import { LABELS, LABELS_EN, label, tieLabel, pastVisaLabel, refusedText, overstayText } from "@/lib/answer-labels";
import { BAND_COLOR, URGENCY_COLOR, stateWord, historyWord, bandWord, urgencyWord } from "@/lib/assessment-vocab";
import { displayName } from "@/lib/account-name";
import { fetchLostReasonTree, fetchLostReasonLabels } from "@/lib/lost-reasons";
import { bangkokNow } from "@/lib/holidays";
import { getAdminLang } from "@/lib/admin-lang";
import { t, dateLocale, type Lang } from "@/lib/i18n";

function fmtDate(iso: unknown, lang: Lang): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" });
}

export const dynamic = "force-dynamic";

function fmtDateTime(val: unknown, lang: Lang): string | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(dateLocale(lang), {
    timeZone: "Asia/Bangkok",
    weekday: "short", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  }) + t(lang, " น.", "");
}

function Row({ title, value, lang = "th" }: { title: string; value?: unknown; lang?: Lang }) {
  if (value === null || value === undefined || value === "") return null;
  let display: string;
  if (typeof value === "boolean") display = value ? t(lang, "ใช่", "Yes") : t(lang, "ไม่ใช่", "No");
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

/** Read-only system evaluation (auto rule-engine). Separate from the human's manual pass/notes. */
function AutoAssessment({ evaluation, lang }: { evaluation: Dict; lang: Lang }) {
  const result = (evaluation.result ?? {}) as Dict;
  const band = result.approvability_band as string | undefined;
  const colors = (result._colors ?? {}) as Dict;
  const cell = (result.decision_cell ?? {}) as Dict;
  const meta = (result.meta ?? {}) as Dict;
  const flags = (result.consistency_flags ?? []) as string[];
  const dataFlags = (result.data_flags ?? []) as string[];
  const override = result.override_flag === true;
  const urgency = result.urgency as string;

  const autoTies = (colors.ties as string) ?? "";
  const autoFunding = (result.pillar_funding as string) ?? "";
  const autoRisk = (result.pillar_risk as string) ?? "";
  const oTies = evaluation.override_ties as string | null;
  const oFunding = evaluation.override_funding as string | null;
  const oRisk = evaluation.override_risk as string | null;
  const oBand = evaluation.override_band as string | null;
  const tiesColor = oTies ?? autoTies;
  const fundingColor = oFunding ?? autoFunding;
  const riskColor = oRisk ?? autoRisk;
  const bandVal = oBand ?? band;

  return (
    <Section title={t(lang, "ผลประเมินอัตโนมัติ (ระบบ)", "Auto assessment (system)")}>
      {!band ? (
        <p className="text-sm text-gray-400">{t(lang, "ยังไม่มีผลประเมินอัตโนมัติ", "No auto assessment yet")}</p>
      ) : (
        <div className="space-y-3">
          {override && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {t(lang, "🛑 เคยถูกปฏิเสธวีซ่า / Overstay — ส่ง Senior ตรวจสอบก่อนเสนอราคา", "🛑 Prior refusal / Overstay — send to Senior before quoting")}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <StateCard
              title={t(lang, "ความผูกพันในไทย", "Ties in Thailand")}
              color={tiesColor}
              word={stateWord(tiesColor, lang)}
              sub={oTies && oTies !== autoTies ? `auto: ${stateWord(autoTies, lang)}` : undefined}
            />
            <StateCard
              title={t(lang, "การเงิน", "Funding")}
              color={fundingColor}
              word={stateWord(fundingColor, lang)}
              sub={oFunding && oFunding !== autoFunding ? `auto: ${stateWord(autoFunding, lang)}` : undefined}
            />
            <StateCard
              title={t(lang, "ประวัติการเดินทาง", "Travel history")}
              color={riskColor}
              word={historyWord(riskColor, lang)}
              sub={oRisk && oRisk !== autoRisk ? `auto: ${historyWord(autoRisk, lang)}` : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StateCard
              title={t(lang, "โอกาสผ่าน (ระบบ)", "Approval chance (system)")}
              color={BAND_COLOR[bandVal ?? ""] ?? "y"}
              word={bandWord(bandVal ?? "", lang) !== "—" ? bandWord(bandVal ?? "", lang) : bandVal ?? "—"}
              sub={
                oBand && oBand !== band
                  ? `auto: ${bandWord(band ?? "", lang)}`
                  : `${t(lang, "คะแนน", "Score")} ${String(evaluation.score ?? result.approvability_score ?? "—")}/98`
              }
            />
            <StateCard
              title={t(lang, "ความด่วน", "Urgency")}
              color={URGENCY_COLOR[urgency] ?? "y"}
              word={urgencyWord(urgency, lang) !== "—" ? urgencyWord(urgency, lang) : urgency}
              sub={result.days_left != null ? `${t(lang, "เหลือ", "")}${String(result.days_left)} ${t(lang, "วันก่อนเดินทาง", "days before travel")}` : t(lang, "ไม่ทราบวันเดินทาง", "Travel date unknown")}
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-sm font-bold text-gray-800">{cell.name as string}</div>
            <div className="text-sm text-gray-600">{cell.action as string}</div>
            <div className="mt-1 text-xs text-gray-400">
              {t(lang, "ราคา", "Price")}: {cell.pricing as string} · {t(lang, "งานเอกสาร", "Docs")} {result.billable_scope as string} · {t(lang, "ความซับซ้อน", "Complexity")} {result.complexity as string} · {t(lang, "เวลา", "Time")} {result.time_feasibility as string}
            </div>
          </div>

          {flags.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs font-bold text-amber-700 mb-1">{t(lang, "จุดที่ต้องตรวจ", "To check")}</div>
              <ul className="list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                {flags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {dataFlags.length > 0 && (
            <p className="text-[11px] text-gray-400">{t(lang, "ข้อมูลไม่ครบ:", "Missing data:")} {dataFlags.join(" · ")}</p>
          )}

          <p className="text-[11px] text-gray-300">
            {(evaluation.evaluated_by as string) ?? "rule-engine"}
            {meta.evaluated_at ? ` · ${new Date(meta.evaluated_at as string).toLocaleString(dateLocale(lang), { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
        </div>
      )}
    </Section>
  );
}

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getAdminLang();
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
  const name = displayName(account);
  const isAnonymized = account.full_name === "[ลบแล้ว]" || account.nickname === "[ลบแล้ว]";
  const other = t(lang, "อื่นๆ", "Other");

  type StatusHistoryEntry = { id: string; from_status: string | null; to_status: string; changed_at: string; note: string | null };
  const statusHistory = ((s.status_history ?? []) as StatusHistoryEntry[])
    .slice()
    .sort((h1, h2) => new Date(h2.changed_at).getTime() - new Date(h1.changed_at).getTime());

  // Sales-close: reason taxonomy (for the close modal + labels) + current close snapshot.
  const reasons = await fetchLostReasonTree(true);
  const reasonLabels = await fetchLostReasonLabels(lang);
  const todayIso = bangkokNow().iso;
  const closeInfo = {
    close_date: (s.close_date as string | null) ?? null,
    lost_reason_l1: (s.lost_reason_l1 as string | null) ?? null,
    lost_reason_l2: (s.lost_reason_l2 as string | null) ?? null,
    close_notes: (s.close_notes as string | null) ?? null,
    won_service_type: (s.won_service_type as string | null) ?? null,
  };

  // Send-result card (healthcheck image + message, 2-step confirm) — lives in the LEFT column.
  const hcTh = healthcheckFromDbRow(s, "th");
  const hcEn = healthcheckFromDbRow(s, "en");
  const sendReady = evaluation.pass != null && hcTh.strengths.length > 0 && hcTh.improvements.length > 0;
  const flagSrc = existsSync(path.join(process.cwd(), "public", "flags", `${hcTh.destCode}.png`))
    ? `/flags/${hcTh.destCode}.png`
    : null;
  const blockReason = !account.line_user_id
    ? t(lang, "ลูกค้าไม่มีบัญชี LINE ในระบบ — ส่งไม่ได้", "Customer has no LINE account — can't send")
    : account.is_friend === false
      ? t(lang, "ลูกค้ายังไม่ได้เพิ่มเพื่อน LINE OA — ส่งไม่ได้", "Customer hasn't added the LINE OA — can't send")
      : null;
  const prefill = (l: "th" | "en") =>
    evaluation.pass != null
      ? (assessmentResultMessage(evaluation.pass as boolean, (evaluation.notes as string) ?? "", l) as { text: string }).text
      : "";
  const sendResult = (
    <SendResultFlow
      assessmentId={s.id as string}
      status={s.status as string}
      ready={sendReady}
      resultSentAt={(s.result_sent_at as string | null) ?? null}
      canSend={blockReason === null}
      blockReason={blockReason}
      dataTh={hcTh}
      dataEn={hcEn}
      defaultLang={defaultLangFor(s)}
      flagSrc={flagSrc}
      prefillTh={prefill("th")}
      prefillEn={prefill("en")}
      uiLang={lang}
    />
  );

  const header = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← {t(lang, "กลับ", "Back")}</Link>
      <h1 className="text-lg font-bold text-gray-800">{name}</h1>
      {typeof s.ticket_id === "string" && s.ticket_id && (
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">{s.ticket_id}</span>
      )}
      <StatusUpdater id={s.id as string} currentStatus={s.status as string} inline reasons={reasons} todayIso={todayIso} closeInfo={closeInfo} lang={lang} />
      <span className="ml-auto whitespace-nowrap text-xs text-gray-400">
        {new Date(s.created_at as string).toLocaleDateString(dateLocale(lang), { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}{t(lang, " น.", "")}
      </span>
      <a
        href={`/api/admin/assessment-pdf/${s.id}`}
        target="_blank"
        rel="noopener"
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
        title={t(lang, "ใบงานประเมิน (PDF ภายใน กรอกได้)", "Assessment worksheet (internal fillable PDF)")}
      >
        🖨️ {t(lang, "ใบงาน PDF", "Worksheet PDF")}
      </a>
      <AdminLangToggle lang={lang} />
    </div>
  );

  // LEFT column — the evaluation workflow (close summary + status history + agent forms + send result)
  const left = (
    <>
      {isClosed(s.status as string) && (
        <Section title={t(lang, "การปิดดีล", "Deal closing")}>
          <Row lang={lang} title={t(lang, "ผลการปิด", "Outcome")} value={s.status === "win" ? "Closed Won ✅" : "Closed Lost ❌"} />
          <Row lang={lang} title={t(lang, "วันที่ปิดดีล", "Close date")} value={fmtDate(closeInfo.close_date, lang)} />
          {s.status === "win" && (
            <Row lang={lang} title={t(lang, "ประเภทบริการ", "Service type")} value={closeInfo.won_service_type === "diy" ? "DIY" : closeInfo.won_service_type === "full" ? "Full service" : null} />
          )}
          {s.status === "lost" && (
            <Row
              lang={lang}
              title={t(lang, "เหตุผล", "Reason")}
              value={[closeInfo.lost_reason_l1, closeInfo.lost_reason_l2]
                .filter(Boolean)
                .map((k) => reasonLabels[k as string] ?? k)
                .join(" · ")}
            />
          )}
          <Row lang={lang} title={t(lang, "โน้ต", "Notes")} value={closeInfo.close_notes} />
        </Section>
      )}

      <Section title={t(lang, "ประวัติสถานะ", "Status history")}>
        {statusHistory.length === 0 ? (
          <p className="text-sm text-gray-400">{t(lang, "ยังไม่มีการเปลี่ยนสถานะ", "No status changes yet")}</p>
        ) : (
          <div>
            {statusHistory.map((h) => (
              <div key={h.id} className="py-2 border-b border-gray-50 last:border-0 text-sm">
                <div className="flex gap-3">
                  <span className="text-gray-800 font-medium">
                    {h.from_status ? statusLabel(h.from_status, lang) : "—"}
                    {" → "}
                    {statusLabel(h.to_status, lang)}
                  </span>
                  <span className="text-gray-400 ml-auto whitespace-nowrap">
                    {new Date(h.changed_at).toLocaleDateString(dateLocale(lang), {
                      timeZone: "Asia/Bangkok",
                      day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {h.note && <div className="mt-0.5 text-xs text-gray-400">{h.note}</div>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <AssessmentResultForm
        assessmentId={s.id as string}
        status={s.status as string}
        lang={lang}
        initialPass={(evaluation.pass as boolean | null) ?? null}
        initialNotes={(evaluation.notes as string | null) ?? null}
        initialStrengths={Array.isArray(evaluation.strengths) ? (evaluation.strengths as string[]) : []}
        initialImprovements={Array.isArray(evaluation.improvements) ? (evaluation.improvements as string[]) : []}
        autoTies={(((evaluation.result as Dict)?._colors as Dict)?.ties as "g" | "y" | "r" | null) ?? null}
        autoFunding={((evaluation.result as Dict)?.pillar_funding as "g" | "y" | "r" | null) ?? null}
        autoRisk={((evaluation.result as Dict)?.pillar_risk as "g" | "y" | "r" | null) ?? null}
        autoBand={((evaluation.result as Dict)?.approvability_band as "High" | "Med" | "Low" | "OVERRIDE" | null) ?? null}
        initialOverrideTies={(evaluation.override_ties as "g" | "y" | "r" | null) ?? null}
        initialOverrideFunding={(evaluation.override_funding as "g" | "y" | "r" | null) ?? null}
        initialOverrideRisk={(evaluation.override_risk as "g" | "y" | "r" | null) ?? null}
        initialOverrideBand={(evaluation.override_band as "High" | "Med" | "Low" | null) ?? null}
      />

      {sendResult}
    </>
  );

  // CENTER column — case data (S6-S8 first, then the auto assessment, then the rest)
  const center = (
    <>
      <Section title={t(lang, "เวลาตอบกลับ + ความต้องการ", "Response time + intent")}>
        <Row lang={lang} title={t(lang, "นัดโทรกลับ", "Callback slot")} value={fmtDateTime(s.callback_datetime, lang)} />
        <Row lang={lang} title="Due date" value={fmtDateTime(s.due_date, lang)} />
        <Row lang={lang} title={t(lang, "ความต้องการ", "Intent")} value={label("intent", s.intent, lang)} />
      </Section>

      <AutoAssessment evaluation={evaluation} lang={lang} />

      <Section title="LINE">
        <Row lang={lang} title="Display Name" value={account.line_display_name} />
        <div className="flex gap-3 py-2 border-b border-gray-50 items-center">
          <span className="text-gray-400 text-sm w-48 shrink-0">User ID</span>
          <span className="text-gray-800 text-sm font-medium flex-1 break-all">{(account.line_user_id as string) ?? "—"}</span>
          <CopyLineIdButton userId={(account.line_user_id as string) ?? null} lang={lang} />
        </div>
        <Row lang={lang} title={t(lang, "เป็นเพื่อน OA", "OA friend")} value={account.is_friend} />
        <Row lang={lang} title={t(lang, "รูปโปรไฟล์", "Profile picture")} value={account.line_picture_url ? t(lang, "มี", "Yes") : null} />
      </Section>

      <ContactEditor
        accountId={account.id as string}
        assessmentId={s.id as string}
        isAnonymized={isAnonymized}
        lang={lang}
        nickname={(account.nickname as string) ?? ""}
        fullName={(account.full_name as string) ?? ""}
        phoneCode={(account.phone_country_code as string) ?? "+66"}
        phoneLocal={(account.phone as string) ?? ""}
        email={(account.email as string) ?? ""}
        contactPreference={(s.contact_preference as string) ?? ""}
        nationalityDisplay={account.nationality === "other" ? `${other}: ${account.nationality_other}` : label("nationality", account.nationality, lang)}
        sourceDisplay={account.source === "other" ? `${other}: ${account.source_other}` : label("source", account.source, lang)}
        consentedDisplay={account.consented_at ? new Date(account.consented_at as string).toLocaleDateString(dateLocale(lang), { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : null}
      />

      <Section title={t(lang, "S2 · ปลายทาง + วีซ่า", "S2 · Destination + visa")}>
        <Row lang={lang} title={t(lang, "ประเทศปลายทาง", "Destination")} value={(trip.destination as string)?.toUpperCase()} />
        <Row lang={lang} title={t(lang, "ประเภทวีซ่า", "Visa type")} value={label("visa_type", trip.visa_type, lang)} />
        {(visaType === "tourist" || visaType === "visitor" || visaType === "business") && (
          <Row lang={lang} title={t(lang, "วันเดินทาง", "Travel date")} value={trip.travel_arrival} />
        )}
        {(visaType === "tourist" || visaType === "business") && (
          <Row lang={lang} title={t(lang, "วันกลับ", "Return date")} value={trip.travel_return} />
        )}
        {visaType === "student" && (
          <Row lang={lang} title={t(lang, "วันเริ่มเรียน", "Study start")} value={trip.study_start} />
        )}
        {(() => {
          const pv = b.previous_visas ?? b.tourist_previous_visas ?? b.business_previous_visas;
          return Array.isArray(pv) ? (
            <Row lang={lang} title={t(lang, "วีซ่าที่เคยได้รับ (5 ปี)", "Past visas (5y)")} value={(pv as string[]).map((v) => pastVisaLabel(v, lang)).join(", ")} />
          ) : null;
        })()}
        {visaType === "visitor" && <Row lang={lang} title={t(lang, "สถานะผู้เชิญ", "Host status")} value={label("visitor_host_status", b.visitor_host_status as string, lang)} />}
        {visaType === "visitor" && <Row lang={lang} title={t(lang, "ความสัมพันธ์", "Relationship")} value={label("visitor_relationship", b.visitor_relationship as string, lang)} />}
        {visaType === "visitor" && Array.isArray(b.visitor_host_documents) && (
          <Row lang={lang} title={t(lang, "เอกสารที่ผู้เชิญมี", "Host's documents")} value={(b.visitor_host_documents as string[]).map((v) => (lang === "en" ? LABELS_EN.visitor_host_documents?.[v] : undefined) ?? LABELS.visitor_host_documents[v] ?? v).join(", ")} />
        )}
        {visaType === "business" && <Row lang={lang} title="Invitation Letter" value={label("business_invitation_letter", b.business_invitation_letter as string, lang)} />}
        {visaType === "student" && <Row lang={lang} title="Acceptance Letter" value={label("student_acceptance_letter", b.student_acceptance_letter as string, lang)} />}
        {visaType === "student" && <Row lang={lang} title={t(lang, "ผู้รับผิดชอบค่าเรียน", "Tuition sponsor")} value={label("student_expense_sponsor", b.student_expense_sponsor as string, lang)} />}
      </Section>

      <Section title={t(lang, "S3–S4 · อาชีพ", "S3–S4 · Occupation")}>
        <Row lang={lang} title={t(lang, "อาชีพ", "Occupation")} value={label("occupation", occ, lang)} />
        {(occ === "employee" || occ === "government") && <Row lang={lang} title={t(lang, "หนังสือรับรองงาน", "Work certificate")} value={label("employee_work_letter", b.employee_work_letter as string, lang)} />}
        {occ === "freelance" && <Row lang={lang} title={t(lang, "เอกสารพิสูจน์รายได้", "Income proof")} value={label("freelance_income_proof", b.freelance_income_proof as string, lang)} />}
        {occ === "freelance" && <Row lang={lang} title={t(lang, "เอกสารภาษี 3 ปี", "3-year tax docs")} value={label("freelance_tax_history", b.freelance_tax_history as string, lang)} />}
        {occ === "business_owner" && <Row lang={lang} title={t(lang, "หนังสือรับรองบริษัท", "Business registration")} value={label("business_registration", b.business_registration as string, lang)} />}
        {(occ === "retired" || occ === "homemaker" || occ === "student_occ") && (
          <Row lang={lang} title={t(lang, "ผู้รับผิดชอบค่าเดินทาง", "Travel-cost sponsor")} value={label("dependent_expense_sponsor", b.dependent_expense_sponsor as string, lang)} />
        )}
      </Section>

      <Section title={t(lang, "S5 · คัดกรองหลัก", "S5 · Main screening")}>
        <Row lang={lang} title={t(lang, "ถูกปฏิเสธวีซ่า", "Visa refusal")} value={refusedText(s, lang)} />
        <Row lang={lang} title="Overstay" value={overstayText(s, lang)} />
        <Row lang={lang} title={t(lang, "เงินในบัญชี", "Savings balance")} value={label("savings_balance", s.savings_balance, lang)} />
        <Row lang={lang} title={t(lang, "ความผูกพันกับไทย", "Ties to Thailand")} value={(s.ties_thailand as string[])?.map((v) => tieLabel(v, lang)).join(", ")} />
      </Section>
    </>
  );

  return (
    <TicketWorkspace
      header={header}
      left={left}
      center={center}
      right={<MessageLogPanel assessmentId={s.id as string} lang={lang} />}
      lang={lang}
    />
  );
}
