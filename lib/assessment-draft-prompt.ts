/**
 * Builds the Claude prompt that drafts the visa-assessment prose (จุดแข็ง / ที่เราจะช่วยเสริม /
 * ความเห็น) for a case. Input is the rule engine's PII-free output ONLY — the normalized
 * EngineCase (visa tokens) + EngineResult (pillar colors / band / flags). It deliberately never
 * receives the customer's name, phone, email, or LINE id, so nothing identifying leaves our system.
 *
 * Pure and side-effect-free so it can be unit-tested (incl. a "no PII" assertion) without a
 * network call. The route (app/api/admin/draft-assessment) feeds the result to Claude.
 */
import type { EngineCase, EngineResult } from "./assessment/types.ts";
import { stateWord, historyWord, bandWord, urgencyWord } from "./assessment-vocab.ts";

// Token → Thai readable label maps. Fall back to the raw token for any value not listed
// (new engine buckets still render, just less prettily) so this never throws on unknown input.
const DEST: Record<string, string> = {
  japan: "ญี่ปุ่น", schengen: "เชงเก้น (ยุโรป)", us: "สหรัฐอเมริกา",
  uk: "สหราชอาณาจักร", korea: "เกาหลีใต้", others: "ประเทศอื่น ๆ",
};
const VISA: Record<string, string> = {
  tourist: "ท่องเที่ยว", visitor: "เยี่ยมญาติ/เพื่อน", business: "ธุรกิจ",
  student: "นักเรียน/นักศึกษา", work: "ทำงาน", dependent: "ติดตามครอบครัว",
};
const OCC: Record<string, string> = {
  employee: "พนักงานประจำ", gov: "ข้าราชการ/รัฐวิสาหกิจ", owner: "เจ้าของกิจการ",
  freelance: "ฟรีแลนซ์/อาชีพอิสระ", retired: "เกษียณ", homemaker: "แม่บ้าน/พ่อบ้าน", student: "นักเรียน/นักศึกษา",
};
const SAV: Record<string, string> = {
  ">300K": "มากกว่า 300,000 บาท", "150-300K": "150,000–300,000 บาท",
  "50-150K": "50,000–150,000 บาท", "<50K": "น้อยกว่า 50,000 บาท",
};
const PAY: Record<string, string> = {
  self: "ออกค่าใช้จ่ายเอง", employer: "นายจ้างออกให้", scholarship: "ทุนการศึกษา",
  parents: "พ่อแม่ออกให้", spouse: "คู่สมรสออกให้", other: "ผู้อื่นออกให้",
};
const HIST: Record<string, string> = {
  western: "เคยได้วีซ่าประเทศกลุ่มตะวันตก", other: "เคยได้วีซ่าประเทศอื่น", never: "ยังไม่เคยได้วีซ่าต่างประเทศ",
};
const TIES: Record<string, string> = {
  job: "มีงานประจำในไทย", home: "มีที่อยู่อาศัย/บ้านของตัวเอง", spouse: "มีคู่สมรสในไทย",
  parents: "มีพ่อแม่/ครอบครัวในไทย", investment: "มีเงินลงทุน/ทรัพย์สินในไทย",
};
const label = (map: Record<string, string>, key: string | undefined | null): string | null =>
  key == null || key === "" ? null : map[key] ?? key;

/** A compact, human-readable Thai rendering of the case facts (no PII). */
function renderCase(c: EngineCase): string {
  const lines: string[] = [];
  const push = (k: string, v: string | null) => { if (v) lines.push(`- ${k}: ${v}`); };
  push("ประเทศปลายทาง", label(DEST, c.dest));
  push("ประเภทวีซ่า", label(VISA, c.visa));
  push("วันเดินทาง", c.arrival ?? null);
  push("อาชีพ", label(OCC, c.occ));
  push("เงินออม", label(SAV, c.sav));
  push("ผู้รับผิดชอบค่าใช้จ่าย", label(PAY, c.pay));
  push("ประวัติการเดินทาง", label(HIST, c.hist));
  const ties = (c.ties ?? []).map((t) => TIES[t] ?? t);
  push("ความผูกพันกับไทย", ties.length ? ties.join(", ") : null);
  push("เคยถูกปฏิเสธวีซ่า", c.refused === "yes" ? "เคย" : c.refused === "no" ? "ไม่เคย" : null);
  push("เคยอยู่เกินกำหนด (overstay)", c.overstay === "yes" ? "เคย" : c.overstay === "no" ? "ไม่เคย" : null);
  return lines.join("\n");
}

/** A compact rendering of the engine's classification (the authoritative signal to follow). */
function renderEngine(r: EngineResult): string {
  const lines = [
    `- ความผูกพันกับไทย: ${stateWord(r.pillar_return)}`,
    `- ความพร้อมด้านการเงิน: ${stateWord(r.pillar_funding)}`,
    `- ประวัติ/ความเสี่ยง: ${historyWord(r.pillar_risk)}`,
    `- โอกาสผ่าน (โดยรวม): ${bandWord(r.approvability_band)}`,
    `- ความเร่งด่วน: ${urgencyWord(r.urgency)}`,
    `- จำนวนเอกสารที่ยังขาด: ${r.doc_gaps}`,
    `- ความซับซ้อนของเคส: ${r.complexity}`,
    `- ความทันเวลา: ${r.time_feasibility}`,
  ];
  if (r.consistency_flags.length) lines.push(`- จุดที่ต้องตรวจสอบเพิ่ม: ${r.consistency_flags.join("; ")}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยของทีมที่ปรึกษาวีซ่าไทยชื่อ itinerry ที่ช่วยร่าง "ผลประเมินความพร้อมยื่นวีซ่า" ให้ลูกค้าอ่าน

จุดยืนของแบรนด์: ซื่อสัตย์ ตรงไปตรงมา ให้กำลังใจ — ไม่โอเวอร์เคลม ไม่การันตีผล ไม่ขู่ให้กลัว
เขียนภาษาไทยสุภาพ พูดกับลูกค้าโดยตรง (เช่น "คุณมี…", "เราจะช่วย…") กระชับ อ่านเข้าใจง่าย เป็นประโยคสั้น

หน้าที่ของคุณคือร่าง 4 อย่างจากผลของระบบประเมินอัตโนมัติที่ให้มา:
1. strengths (จุดแข็งของลูกค้า): สูงสุด 5 ข้อ แต่ละข้อเป็นประโยคสั้น ≤200 ตัวอักษร — เฉพาะสิ่งที่ "แข็งแรงจริง" ตามผลระบบ (อย่าเรียกจุดที่ระบบบอกว่าอ่อน/ไม่แข็งแรงว่าเป็นจุดแข็ง)
2. improvements (ที่เราจะช่วยเสริม): สูงสุด 5 ข้อ แต่ละข้อ ≤200 ตัวอักษร — จุดที่ยังต้องเตรียม/เสริม เขียนเชิงสร้างสรรค์ว่า "เราจะช่วยแก้ให้ยังไง" ไม่ใช่ตำหนิ
3. suggestedPass (boolean): เคสนี้ผ่านเกณฑ์พื้นฐานของเราไหม — อิงจากโอกาสผ่านโดยรวมและจุดที่ต้องตรวจสอบ (นี่เป็นแค่คำแนะนำ ทีมงานจะเป็นผู้ตัดสินใจสุดท้าย)
4. notes (ความเห็นเพิ่มเติม): ย่อหน้าสั้นภาษาไทย 2–4 ประโยค สรุปภาพรวมและขั้นถัดไป — แสดงให้ลูกค้าเห็นใต้หัวข้อ "ความเห็นเพิ่มเติม"

ห้ามแต่งข้อมูลที่ไม่มีในผลระบบ ถ้าข้อมูลไม่พอสำหรับข้อไหน ให้ใส่น้อยข้อได้`;

export interface DraftPromptInput {
  system: string;
  user: string;
}

/** Build the {system, user} pair for the draft call. No PII in, no PII out. */
export function buildDraftPrompt(result: EngineResult, engineCase: EngineCase): DraftPromptInput {
  const user = `ข้อมูลเคส (ไม่มีข้อมูลระบุตัวตน):\n${renderCase(engineCase)}\n\nผลจากระบบประเมินอัตโนมัติ (ใช้เป็นแนวทางหลัก):\n${renderEngine(result)}\n\nโปรดร่าง strengths, improvements, suggestedPass และ notes ตามที่กำหนด`;
  return { system: SYSTEM_PROMPT, user };
}
