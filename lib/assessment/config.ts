/**
 * itinerry — Visa Case Evaluation engine config (§5/§6/§8 of the Build Brief).
 *
 * This is a faithful TypeScript port of the reference `docs/algorithm/config.json`.
 * ALL weights/thresholds here are STARTING POINTS — calibrate against real win/loss
 * data. Tune this file, not the engine code (the engine reads every rule from here).
 *
 * Scope: the Tourist path is fully specified. Visitor/Business/Student reuse the same
 * pillars; their extra §9 inputs feed the consistency checks only (see engine.ts).
 */

export type Color = "g" | "y" | "r";

/** Stamped onto every stored evaluation so a re-run / recalibration is traceable. */
export const ENGINE_VERSION = "rule-engine@1";
export const CONFIG_VERSION = "1.0";

export interface EngineConfig {
  lookup: {
    destination: Record<Color, string[]>;
    occupation: Record<Color, string[]>;
    savings: Record<Color, string[]>;
    pay: Record<Color, string[]>;
    history: Record<Color, string[]>;
  };
  ties: { strong_anchors: string[]; mid_anchors: string[] };
  docs: {
    emp: Record<string, Color>;
    freelance_income: Record<string, Color>;
    freelance_tax: Record<string, Color>;
    dbd: Record<string, Color>;
  };
  weights: {
    return: Record<Color, number>;
    funding: Record<Color, number>;
    risk: Record<Color, number>;
    dest: Record<Color, number>;
  };
  bands: { high: number; med: number };
  urgency_days: { low: number; med: number };
  complexity: {
    base: number;
    per_gap: number;
    override: number;
    dest_red: number;
    sponsor: number;
    premium: number;
    plus: number;
  };
  decision_matrix: Record<string, Record<string, DecisionCell>>;
}

export interface DecisionCell {
  name: string;
  action: string;
  pricing: string;
}

export const ENGINE_CONFIG: EngineConfig = {
  lookup: {
    destination: {
      g: ["japan", "korea", "taiwan", "dubai"],
      y: ["schengen", "australia", "nz", "china", "india", "qatar", "saudi", "others"],
      r: ["us", "uk", "canada"],
    },
    occupation: {
      g: ["employee", "gov", "owner"],
      y: ["freelance", "retired"],
      r: ["homemaker", "student"],
    },
    savings: {
      g: [">300K"],
      y: ["150-300K", "50-150K"],
      r: ["<50K"],
    },
    pay: {
      g: ["self", "employer", "scholarship"],
      y: ["parents", "spouse"],
      r: ["other"],
    },
    history: {
      g: ["western"],
      y: ["other"],
      r: ["never"],
    },
  },

  ties: {
    strong_anchors: ["job", "home", "spouse", "parents"],
    mid_anchors: ["investment"],
  },

  docs: {
    emp: { complete: "g", partial: "y", notyet: "r" },
    freelance_income: { all: "g", partial: "y", none: "r" },
    freelance_tax: { all: "g", partial: "y", none: "r" },
    dbd: { yes: "g", notyet: "r" },
  },

  weights: {
    return: { g: 38, y: 22, r: 8 },
    funding: { g: 30, y: 17, r: 5 },
    risk: { g: 15, y: 7, r: 0 },
    dest: { g: 15, y: 8, r: 0 },
  },

  bands: { high: 70, med: 45 },

  urgency_days: { low: 45, med: 30 },

  complexity: {
    base: 0,
    per_gap: 1,
    override: 2,
    dest_red: 1,
    sponsor: 1,
    premium: 4,
    plus: 2,
  },

  decision_matrix: {
    High: {
      Low: { name: "Nurture", action: "ดูแลต่อ — เคสแข็ง ไม่ด่วน ค่อย ๆ ปิด", pricing: "standard" },
      Med: { name: "Close", action: "ปิดเลย — เคสดี เวลาพอ", pricing: "standard" },
      High: { name: "Hot-Close", action: "ปิดด่วน — เคสดีแต่เวลาบีบ", pricing: "+rush fee" },
    },
    Med: {
      Low: { name: "Build", action: "พัฒนาเคส — เติมจุดอ่อนก่อนยื่น", pricing: "standard" },
      Med: { name: "Develop", action: "ช่วยจัดเคส — มีงานให้ทำ เวลาจำกัด", pricing: "service fee 💰" },
      High: { name: "Rush-Fix", action: "รีบช่วยจัดเคส — งานเยอะ เวลาน้อย", pricing: "+rush fee" },
    },
    Low: {
      Low: { name: "Advise", action: "ให้คำปรึกษา — โอกาสต่ำ ตั้งความคาดหวังให้ตรง", pricing: "consult" },
      Med: { name: "Reality-check", action: "เช็กความจริง — บอกความเสี่ยงตรง ๆ", pricing: "consult" },
      High: { name: "Honest", action: "ตรงไปตรงมา — เวลาไม่พอ + โอกาสต่ำ", pricing: "consult" },
    },
    OVERRIDE: {
      "*": { name: "Senior Review", action: "🛑 ส่ง Senior + สอบประวัติก่อน quote", pricing: "hold quote" },
    },
  },
};
