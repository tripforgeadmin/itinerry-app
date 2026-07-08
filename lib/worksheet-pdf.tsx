import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, Font,
  TextInput, Checkbox, renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import { COUNTRIES } from "./countries";
import { LABELS, TIES_LABELS, PAST_VISA_LABELS, label } from "./answer-labels";
import type { StoredEvaluation } from "./assessment";
import { STATE_WORD, HISTORY_WORD, BAND_WORD, BAND_COLOR, URGENCY_WORD, URGENCY_COLOR } from "./assessment-vocab";

/**
 * Internal case worksheet (ใบงานประเมินวีซ่า) — the PDF the evaluation team works from.
 *
 * Deliberately PII-free: no name / phone / email / LINE identity — the Ticket ID is the
 * case key, so the sheet can circulate in the team without PDPA exposure. Two sources
 * feed the same template: the admin print route (from DB rows) and the new-lead email
 * (from raw submit answers + an inline engine run, before the DB write even lands).
 *
 * The "ส่วนผู้ประเมินกรอก" block is real AcroForm fields (TextInput/Checkbox) mirroring
 * the admin form 1:1 — fill digitally in a PDF viewer, or print and write by hand.
 */

Font.register({
  family: "Sarabun",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Bold.ttf"), fontWeight: 700 },
  ],
});

// Two Thai text fixes in one callback:
// 1. SARA AM (ำ) pre-decomposed to NIKHAHIT+SARA AA — fontkit decomposes it during shaping
//    anyway, but doing it up-front keeps char count == glyph count; otherwise react-pdf
//    truncates one glyph off the end of the text per ำ it contains (verified empirically).
// 2. Thai has no inter-word spaces, so long runs are split at dictionary word boundaries
//    (Intl.Segmenter keeps combining vowels/tone marks intact) to allow wrapping.
Font.registerHyphenationCallback((word) => {
  const w = word.replace(/ำ/g, "ํา");
  if (!/[฀-๿]/.test(w) || w.length < 12) return [w];
  return [...new Intl.Segmenter("th", { granularity: "word" }).segment(w)].map((s) => s.segment);
});

/** Sarabun has no emoji glyphs — strip pictographs (e.g. the 🛑 in config action strings). */
function stripEmoji(t: string): string {
  return t.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();
}

// ---------------------------------------------------------------------------- data --

export interface WorksheetData {
  ticketId: string;
  statusLabel: "รอประเมิน" | "ประเมินแล้ว"; // collapsed per spec
  createdAt: string | null; // ISO
  dueDate: string | null; // ISO
  trip: {
    destination: string; // alpha-2 lower
    visaType: string;
    visaTypeOther: string | null;
    arrival: string | null;
    return: string | null;
    studyStart: string | null;
  };
  previousVisas: string[]; // q12 tokens and/or alpha-2 codes
  branch: Record<string, string | string[]>; // semantic branch_answers keys
  occupation: string;
  screening: {
    refused: string; // preformatted Thai line
    overstay: string;
    savings: string; // token
    ties: string[]; // tokens
  };
  contact: {
    preference: string; // token
    callback: string | null; // preformatted
    intent: string | null; // token
  };
  auto: StoredEvaluation | null;
  manual: {
    pass: boolean | null; notes: string; strengths: string[]; improvements: string[];
    overrideTies: "g" | "y" | "r" | null;
    overrideFunding: "g" | "y" | "r" | null;
    overrideRisk: "g" | "y" | "r" | null;
    overrideBand: "High" | "Med" | "Low" | null;
  } | null;
}

const FREELANCE_PROOF: Record<string, string> = {
  contract: "สัญญารับจ้าง", invoice: "ใบแจ้งหนี้ (invoice)", bank_transfer: "ยอดเงินโอนรายได้", none: "ไม่มีเลย",
};

function countryTh(codeOrToken: string): string {
  const c = COUNTRIES.find((x) => x.code.toLowerCase() === codeOrToken.toLowerCase());
  return c ? `${c.th} (${c.code})` : codeOrToken.toUpperCase();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  }) + " น.";
}

// ---------------------------------------------------------------------- styling --

const NAVY = "#1b3d5c";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const DOT: Record<string, string> = { g: "#16a34a", y: "#d97706", r: "#dc2626" };
const DOT_BG: Record<string, string> = { g: "#dcfce7", y: "#fef3c7", r: "#fee2e2" };


const s = StyleSheet.create({
  page: { fontFamily: "Sarabun", padding: 36, paddingBottom: 52, fontSize: 9.5, color: "#1e293b", lineHeight: 1.55 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  logo: { width: 22, height: 22, marginRight: 8 },
  title: { fontSize: 15, fontWeight: 700, color: NAVY },
  chipRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, marginTop: 2 },
  ticket: { fontSize: 11, fontWeight: 700, color: NAVY, backgroundColor: "#e6f1fb", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  statusChip: { fontSize: 9, fontWeight: 700, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6 },
  meta: { fontSize: 8.5, color: MUTED, marginLeft: "auto", textAlign: "right" },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: NAVY, marginTop: 12, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: LINE },
  row: { flexDirection: "row", marginBottom: 2.5, alignItems: "flex-start" },
  label: { width: 150, color: MUTED, paddingRight: 10 },
  value: { flex: 1 },
  cardsRow: { flexDirection: "row", marginTop: 4, marginBottom: 6 },
  card: { flex: 1, borderRadius: 6, padding: 7, marginRight: 6 },
  cardLast: { flex: 1, borderRadius: 6, padding: 7 },
  cardLabel: { fontSize: 8, color: MUTED },
  cardValue: { fontSize: 11, fontWeight: 700 },
  cardSub: { fontSize: 8, color: MUTED },
  dotRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
  banner: { backgroundColor: "#fee2e2", borderRadius: 6, padding: 7, marginBottom: 6 },
  bannerText: { color: "#991b1b", fontWeight: 700, fontSize: 9.5 },
  flagList: { backgroundColor: "#fef3c7", borderRadius: 6, padding: 7, marginBottom: 4 },
  flagText: { color: "#92400e", fontSize: 9 },
  fillBox: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10, marginTop: 6 },
  fillLabel: { fontSize: 9, fontWeight: 700, color: NAVY, marginBottom: 3 },
  input: { height: 17, borderWidth: 0.75, borderColor: "#cbd5e1", borderRadius: 3, marginBottom: 4, fontSize: 9, padding: 2 },
  inputML: { height: 58, borderWidth: 0.75, borderColor: "#cbd5e1", borderRadius: 3, fontSize: 9, padding: 2 },
  filledLine: { backgroundColor: "#f8fafc", borderRadius: 3, marginBottom: 4, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 9 },
  notesFilled: { backgroundColor: "#f8fafc", borderRadius: 3, padding: 6, fontSize: 9 },
  fillArea: { height: 88, borderWidth: 0.75, borderColor: "#cbd5e1", borderRadius: 3, fontSize: 9, padding: 4 },
  filledArea: { minHeight: 88, backgroundColor: "#f8fafc", borderRadius: 3, padding: 6, fontSize: 9, lineHeight: 1.5 },
  checkbox: { width: 11, height: 11, borderWidth: 0.75, borderColor: "#64748b", marginRight: 4 },
  checkRow: { flexDirection: "row", alignItems: "center", marginRight: 18 },
  footerLeft: { position: "absolute", bottom: 24, left: 36, fontSize: 7.5, color: MUTED },
  footerRight: { position: "absolute", bottom: 24, right: 36, fontSize: 7.5, color: MUTED },
});

function Row({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={s.row}>
      <Text style={s.label}>{title}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function StateCard({ title, color, word, sub, last }: { title: string; color: string; word: string; sub?: string; last?: boolean }) {
  return (
    <View style={[last ? s.cardLast : s.card, { backgroundColor: DOT_BG[color] ?? "#f1f5f9" }]}>
      <Text style={s.cardLabel}>{title}</Text>
      <View style={s.dotRow}>
        <View style={[s.dot, { backgroundColor: DOT[color] ?? "#94a3b8" }]} />
        <Text style={s.cardValue}>{word}</Text>
      </View>
      {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
    </View>
  );
}


// ---------------------------------------------------------------------- document --

function Worksheet({ d }: { d: WorksheetData }) {
  const visaType = d.trip.visaType;
  const b = d.branch;
  const auto = d.auto;
  const m = d.manual;
  const pending = d.statusLabel === "รอประเมิน";
  const strengths = m?.strengths ?? [];
  const improvements = m?.improvements ?? [];

  return (
    <Document title={`${d.ticketId} — ใบงานประเมินวีซ่า`} author="itinerry (internal)">
      <Page size="A4" style={s.page}>
        {/* header */}
        <View style={s.headerRow}>
          <Image src={path.join(process.cwd(), "public/itinfav.png")} style={s.logo} />
          <Text style={s.title}>ใบงานประเมินวีซ่า</Text>
          <Text style={{ fontSize: 9, color: MUTED, marginLeft: 6 }}>(เอกสารภายใน)</Text>
        </View>
        <View style={s.chipRow}>
          <Text style={s.ticket}>{d.ticketId}</Text>
          <Text style={[s.statusChip, pending
            ? { backgroundColor: "#e6f1fb", color: "#185fa5" }
            : { backgroundColor: "#dcfce7", color: "#166534" }]}>
            {d.statusLabel}
          </Text>
          <Text style={s.meta}>
            รับเรื่อง {fmtDateTime(d.createdAt)}{"\n"}กำหนดติดต่อกลับ {fmtDateTime(d.dueDate)}
          </Text>
        </View>

        {/* S2 destination + visa */}
        <Text style={s.sectionTitle}>ปลายทาง + วีซ่า</Text>
        <Row title="ประเทศปลายทาง" value={countryTh(d.trip.destination)} />
        <Row title="ประเภทวีซ่า" value={label("visa_type", visaType) + (d.trip.visaTypeOther ? ` — ${d.trip.visaTypeOther}` : "")} />
        <Row title="วันเดินทางไป" value={d.trip.arrival ? fmtDate(d.trip.arrival) : null} />
        <Row title="วันเดินทางกลับ" value={d.trip.return ? fmtDate(d.trip.return) : null} />
        <Row title="วันเริ่มเรียน" value={d.trip.studyStart ? fmtDate(d.trip.studyStart) : null} />
        <Row title="วีซ่าที่เคยได้ (10 ปี)" value={d.previousVisas.length
          ? d.previousVisas.map((v) => PAST_VISA_LABELS[v] ?? countryTh(v)).join(", ") : null} />
        {visaType === "visitor" && (
          <>
            <Row title="สถานะผู้เชิญ" value={label("visitor_host_status", b.visitor_host_status as string)} />
            <Row title="ความสัมพันธ์กับผู้เชิญ" value={label("visitor_relationship", b.visitor_relationship as string)} />
            {Array.isArray(b.visitor_host_documents) && (
              <Row title="เอกสารจากผู้เชิญ" value={(b.visitor_host_documents as string[])
                .map((v) => LABELS.visitor_host_documents[v] ?? v).join(", ")} />
            )}
          </>
        )}
        {visaType === "business" && (
          <Row title="หนังสือเชิญ (Invitation)" value={label("business_invitation_letter", b.business_invitation_letter as string)} />
        )}
        {visaType === "student" && (
          <>
            <Row title="Acceptance Letter" value={label("student_acceptance_letter", b.student_acceptance_letter as string)} />
            <Row title="ผู้รับผิดชอบค่าเรียน" value={label("student_expense_sponsor", b.student_expense_sponsor as string)} />
          </>
        )}

        {/* S3-S4 occupation */}
        <Text style={s.sectionTitle}>อาชีพ + เอกสาร</Text>
        <Row title="อาชีพ" value={label("occupation", d.occupation)} />
        <Row title="หนังสือรับรองงาน" value={b.employee_work_letter ? label("employee_work_letter", b.employee_work_letter as string) : null} />
        {Array.isArray(b.freelance_income_proof) && (
          <Row title="เอกสารพิสูจน์รายได้" value={(b.freelance_income_proof as string[])
            .map((v) => FREELANCE_PROOF[v] ?? v).join(", ")} />
        )}
        <Row title="เอกสารภาษี 3 ปี" value={b.freelance_tax_history ? label("freelance_tax_history", b.freelance_tax_history as string) : null} />
        <Row title="หนังสือรับรองบริษัท (DBD)" value={b.business_registration ? label("business_registration", b.business_registration as string) : null} />
        <Row title="ผู้รับผิดชอบค่าเดินทาง" value={b.dependent_expense_sponsor ? label("dependent_expense_sponsor", b.dependent_expense_sponsor as string) : null} />

        {/* S5 screening */}
        <Text style={s.sectionTitle}>คัดกรองหลัก</Text>
        <Row title="เคยถูกปฏิเสธวีซ่า" value={d.screening.refused} />
        <Row title="เคย Overstay" value={d.screening.overstay} />
        <Row title="เงินในบัญชี" value={label("savings_balance", d.screening.savings)} />
        <Row title="ความผูกพันกับไทย" value={d.screening.ties.length
          ? d.screening.ties.map((v) => TIES_LABELS[v] ?? v).join(", ") : "ไม่มี"} />

        {/* S6 contact (no PII — channel + slot only) */}
        <Text style={s.sectionTitle}>การติดต่อ + ความต้องการ</Text>
        <Row title="ช่องทางติดต่อกลับ" value={label("contact_preference", d.contact.preference)} />
        <Row title="นัดโทรกลับ" value={d.contact.callback} />
        <Row title="ความต้องการ" value={d.contact.intent ? label("intent", d.contact.intent) : null} />

        {/* auto assessment */}
        <Text style={s.sectionTitle}>ผลประเมินอัตโนมัติ (ระบบ)</Text>
        {!auto ? (
          <Text style={{ color: MUTED }}>ยังไม่มีผลประเมินอัตโนมัติ</Text>
        ) : (
          <>
            {auto.override_flag && (
              <View style={s.banner}>
                <Text style={s.bannerText}>
                  เคยถูกปฏิเสธวีซ่า / Overstay — ส่ง Senior ตรวจสอบก่อนเสนอราคา (hold quote)
                </Text>
              </View>
            )}
            {(() => {
              const oTies = d.manual?.overrideTies ?? null;
              const oFunding = d.manual?.overrideFunding ?? null;
              const oRisk = d.manual?.overrideRisk ?? null;
              const oBand = d.manual?.overrideBand ?? null;
              const tiesColor = oTies ?? auto._colors.ties;
              const fundingColor = oFunding ?? auto.pillar_funding;
              const riskColor = oRisk ?? auto.pillar_risk;
              const bandVal = oBand ?? auto.approvability_band;
              return (
                <>
                  <View style={s.cardsRow}>
                    <StateCard
                      title="ความผูกพันในไทย" color={tiesColor} word={STATE_WORD[tiesColor] ?? "—"}
                      sub={oTies && oTies !== auto._colors.ties ? `auto: ${STATE_WORD[auto._colors.ties] ?? "—"}` : undefined}
                    />
                    <StateCard
                      title="การเงิน" color={fundingColor} word={STATE_WORD[fundingColor] ?? "—"}
                      sub={oFunding && oFunding !== auto.pillar_funding ? `auto: ${STATE_WORD[auto.pillar_funding] ?? "—"}` : undefined}
                    />
                    <StateCard
                      title="ประวัติการเดินทาง" color={riskColor} word={HISTORY_WORD[riskColor] ?? "—"} last
                      sub={oRisk && oRisk !== auto.pillar_risk ? `auto: ${HISTORY_WORD[auto.pillar_risk] ?? "—"}` : undefined}
                    />
                  </View>
                  <View style={s.cardsRow}>
                    <StateCard
                      title="โอกาสผ่าน (ระบบ)"
                      color={BAND_COLOR[bandVal] ?? "y"}
                      word={BAND_WORD[bandVal] ?? bandVal}
                      sub={oBand && oBand !== auto.approvability_band ? `auto: ${BAND_WORD[auto.approvability_band] ?? auto.approvability_band}` : `คะแนน ${auto.approvability_score}/98`}
                    />
              <StateCard
                title="ความด่วน"
                color={URGENCY_COLOR[auto.urgency] ?? "y"}
                word={URGENCY_WORD[auto.urgency] ?? auto.urgency}
                sub={auto.days_left != null ? `เหลือ ${auto.days_left} วันก่อนเดินทาง` : "ไม่ทราบวันเดินทาง"}
              />
                    <StateCard
                      title="แนวทางการทำงาน"
                      color={auto.override_flag ? "r" : BAND_COLOR[auto.approvability_band] ?? "y"}
                      word={auto.decision_cell.name}
                      sub={`${stripEmoji(auto.decision_cell.action)} · ราคา: ${stripEmoji(auto.decision_cell.pricing)}`}
                      last
                    />
                  </View>
                </>
              );
            })()}
            {auto.consistency_flags.length > 0 && (
              <View style={s.flagList}>
                {auto.consistency_flags.map((f, i) => (
                  <Text key={i} style={s.flagText}>• {f}</Text>
                ))}
              </View>
            )}
            <Text style={{ fontSize: 7.5, color: "#94a3b8" }}>
              {auto.meta.engine_version} · ประเมิน {fmtDateTime(auto.meta.evaluated_at)}
              {auto.data_flags.length ? ` · ข้อมูลไม่ครบ: ${auto.data_flags.join(", ")}` : ""}
              {` · งานเอกสาร ${auto.billable_scope} · ความซับซ้อน ${auto.complexity} · เวลา ${auto.time_feasibility}`}
            </Text>
          </>
        )}

        {/* evaluator fill section — real AcroForm fields, mirrors the admin form 1:1 */}
        <View style={s.fillBox} wrap={false}>
          <Text style={[s.fillLabel, { fontSize: 10.5 }]}>ส่วนผู้ประเมินกรอก</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 2 }}>
            <View style={s.checkRow}>
              <Checkbox name="pass_yes" checked={m?.pass === true} xMark style={s.checkbox} />
              <Text>ผ่านเกณฑ์</Text>
            </View>
            <View style={s.checkRow}>
              <Checkbox name="pass_no" checked={m?.pass === false} xMark style={s.checkbox} />
              <Text>ไม่ผ่านเกณฑ์</Text>
            </View>
          </View>
          {/* One long fillable box per side. Recorded values print as regular Text (embedded
              Sarabun) — pdfkit's AcroForm appearance can't encode Thai, so prefilled values
              in a TextInput would render as garbage glyphs; only EMPTY boxes are fields. */}
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={s.fillLabel}>จุดแข็งของลูกค้า (ลง PDF ลูกค้า)</Text>
              {strengths.length ? (
                <Text style={s.filledArea}>{strengths.map((x) => `• ${x}`).join("\n")}</Text>
              ) : (
                <TextInput name="strengths" multiline style={s.fillArea} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fillLabel}>ที่เราจะช่วยเสริม (ลง PDF ลูกค้า)</Text>
              {improvements.length ? (
                <Text style={s.filledArea}>{improvements.map((x) => `• ${x}`).join("\n")}</Text>
              ) : (
                <TextInput name="improvements" multiline style={s.fillArea} />
              )}
            </View>
          </View>
          <Text style={[s.fillLabel, { marginTop: 6 }]}>ความเห็นเพิ่มเติม (แสดงในรายงานลูกค้า)</Text>
          {m?.notes ? (
            <Text style={s.notesFilled}>{m.notes}</Text>
          ) : (
            <TextInput name="notes" multiline style={s.inputML} />
          )}
          <View style={{ flexDirection: "row", marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: MUTED, marginRight: 4 }}>ผู้ประเมิน:</Text>
            <TextInput name="evaluator" style={[s.input, { width: 150, marginBottom: 0, marginRight: 14 }]} />
            <Text style={{ color: MUTED, marginRight: 4 }}>วันที่/เวลา:</Text>
            <TextInput name="evaluated_at" style={[s.input, { width: 130, marginBottom: 0 }]} />
          </View>
        </View>

        {/* footer — direct fixed absolute Texts (a fixed wrapper View silently drops them) */}
        <Text fixed style={s.footerLeft}>เอกสารภายใน — ห้ามส่งต่อให้ลูกค้า · {d.ticketId}</Text>
        <Text
          fixed
          style={s.footerRight}
          render={({ pageNumber, totalPages }) => `พิมพ์ ${fmtDateTime(new Date().toISOString())} · หน้า ${pageNumber}/${totalPages}`}
        />
      </Page>
    </Document>
  );
}

export async function renderWorksheetPdf(d: WorksheetData): Promise<Buffer> {
  return renderToBuffer(<Worksheet d={d} />);
}

// -------------------------------------------------------------------- builders --

type Dict = Record<string, unknown>;
function one(v: unknown): Dict | null {
  return ((Array.isArray(v) ? v[0] : v) ?? null) as Dict | null;
}

function refusedLine(refused: boolean, details: string | null, entries: unknown): string {
  if (Array.isArray(entries) && entries.length) {
    return "ใช่ — " + (entries as { country?: string; year?: string }[])
      .map((e) => `${e.country ?? ""} ${e.year ?? ""}`.trim()).join(", ");
  }
  return refused ? `ใช่ — ${details ?? ""}` : "ไม่เคย";
}

function overstayLine(overstayed: boolean, details: string | null, entries: unknown): string {
  if (Array.isArray(entries) && entries.length) {
    return "ใช่ — " + (entries as { country?: string; year?: string; days?: string }[])
      .map((e) => `${e.country ?? ""} ${e.year ?? ""}${e.days ? ` · ${e.days} วัน` : ""}`.trim()).join(", ");
  }
  return overstayed ? `ใช่ — ${details ?? ""}` : "ไม่เคย";
}

/** Build from a DB row: select("*, trip:trip_id(*), visa_evaluation(*)") — account not needed (PII-free). */
export function worksheetFromDbRow(row: Dict): WorksheetData {
  const trip = one(row.trip) ?? {};
  const ev = one(row.visa_evaluation);
  const b = (row.branch_answers ?? {}) as Record<string, string | string[]>;
  const result = (ev?.result ?? null) as StoredEvaluation | null;
  const hasAuto = !!result && typeof result === "object" && "approvability_band" in result;

  return {
    ticketId: (row.ticket_id as string) || "—",
    statusLabel: row.status === "pending_review" ? "รอประเมิน" : "ประเมินแล้ว",
    createdAt: (row.created_at as string) ?? null,
    dueDate: (row.due_date as string) ?? null,
    trip: {
      destination: (trip.destination as string) ?? "",
      visaType: (trip.visa_type as string) ?? "",
      visaTypeOther: (b.visa_type_other as string) ?? null,
      arrival: (trip.travel_arrival as string) ?? null,
      return: (trip.travel_return as string) ?? null,
      studyStart: (trip.study_start as string) ?? null,
    },
    previousVisas: Array.isArray(b.previous_visas) ? (b.previous_visas as string[]) : [],
    branch: b,
    occupation: (row.occupation as string) ?? "",
    screening: {
      refused: refusedLine(!!row.visa_refused, (row.visa_refused_details as string) ?? null, row.visa_refused_entries),
      overstay: overstayLine(!!row.overstayed, (row.overstay_details as string) ?? null, row.overstay_entries),
      savings: (row.savings_balance as string) ?? "",
      ties: Array.isArray(row.ties_thailand) ? (row.ties_thailand as string[]) : [],
    },
    contact: {
      preference: (row.contact_preference as string) ?? "",
      callback: row.callback_datetime ? fmtDateTime(row.callback_datetime as string) : null,
      intent: (row.intent as string) ?? null,
    },
    auto: hasAuto ? result : null,
    manual: ev
      ? {
          pass: (ev.pass as boolean | null) ?? null,
          notes: (ev.notes as string) ?? "",
          strengths: Array.isArray(ev.strengths) ? (ev.strengths as string[]) : [],
          improvements: Array.isArray(ev.improvements) ? (ev.improvements as string[]) : [],
          overrideTies: (ev.override_ties as "g" | "y" | "r" | null) ?? null,
          overrideFunding: (ev.override_funding as "g" | "y" | "r" | null) ?? null,
          overrideRisk: (ev.override_risk as "g" | "y" | "r" | null) ?? null,
          overrideBand: (ev.override_band as "High" | "Med" | "Low" | null) ?? null,
        }
      : null,
  };
}

/** Build at submit time from raw answers (email path) — before the DB write lands. */
export function worksheetFromSubmission(args: {
  answers: Record<string, string | undefined>;
  branchAnswers: Record<string, string | string[]>;
  ticketId: string;
  dueDate: Date;
  callbackDatetime: Date | null;
  auto: StoredEvaluation;
}): WorksheetData {
  const { answers: a, branchAnswers: b, ticketId, dueDate, callbackDatetime, auto } = args;
  return {
    ticketId,
    statusLabel: "รอประเมิน",
    createdAt: new Date().toISOString(),
    dueDate: dueDate.toISOString(),
    trip: {
      destination: a.q8 ?? "",
      visaType: a.q9 ?? "",
      visaTypeOther: a.q9_other || null,
      arrival: a.q10 ?? a.q13 ?? a.q17 ?? null,
      return: a.q11 ?? a.q39 ?? a.q18 ?? null,
      studyStart: a.q21 ?? null,
    },
    previousVisas: Array.isArray(b.previous_visas) ? (b.previous_visas as string[]) : [],
    branch: b,
    occupation: a.q24 ?? "",
    screening: {
      refused: a.q30 === "yes" ? `ใช่ — ${a.q31 ?? ""}` : "ไม่เคย",
      overstay: a.q32 === "yes" ? `ใช่ — ${a.q33 ?? ""}` : "ไม่เคย",
      savings: a.q34 ?? "",
      ties: (a.q35 ?? "").split(",").map((x) => x.trim()).filter(Boolean),
    },
    contact: {
      preference: a.q36 ?? "",
      callback: callbackDatetime ? fmtDateTime(callbackDatetime.toISOString()) : null,
      intent: a.q38 ?? null,
    },
    auto,
    manual: null, // fresh case — evaluator fields stay blank for filling
  };
}
