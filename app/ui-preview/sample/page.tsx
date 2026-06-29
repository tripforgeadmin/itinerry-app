"use client";

// TEMPORARY dev-only sample screen (visatype) composed from Phase-2 primitives. Delete before merge.

import { useState } from "react";
import { ProgressTopBar, type ProgressBox } from "@/components/ui/ProgressTopBar";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { RevealBlock } from "@/components/ui/RevealBlock";
import { TextField } from "@/components/ui/TextField";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { Button } from "@/components/ui/Button";
import type { Lang } from "@/components/ui/LangToggle";

const OPTIONS = [
  { v: "tourist", img: "/mascot/itin-travel-visa-cut.png", t: "ท่องเที่ยว", s: "Tourist" },
  { v: "visitor", img: "/mascot/itin-visit-visa-cut.png", t: "เยี่ยมเยียน", s: "Visit family / friends" },
  { v: "business", img: "/mascot/itin-business-visa-cut.png", t: "ธุรกิจ", s: "Business" },
  { v: "student", img: "/mascot/itin-student-visa-cut.png", t: "นักเรียน", s: "Student" },
  { v: "other", img: "/mascot/itin-other-visa-cut.png", t: "วีซ่าประเภทอื่นๆ", s: "Other" },
];

const BOXES_3: ProgressBox[] = [
  { label: "พื้นฐาน", fill: 0.82, icon: "passport" },
  { label: "เดินทาง", fill: 0, icon: "plane" },
  { label: "คัดกรอง", fill: 0, icon: "shield" },
];

const BOXES_5: ProgressBox[] = [
  { label: "พื้นฐาน", fill: 0.82, icon: "passport" },
  { label: "เดินทาง", fill: 0, icon: "plane" },
  { label: "อาชีพ", fill: 0, icon: "briefcase" },
  { label: "คุณสมบัติ", fill: 0, icon: "shield" },
  { label: "ติดต่อ", fill: 0, icon: "chat" },
];

export default function SampleVisatype() {
  const [lang, setLang] = useState<Lang>("th");
  const [sel, setSel] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [cats, setCats] = useState<3 | 5>(5);

  const isOther = sel === "other";
  const canNext = other.trim().length > 0;

  return (
    <main className="relative min-h-screen bg-surface">
      {/* preview-only control */}
      <button
        onClick={() => setCats((c) => (c === 3 ? 5 : 3))}
        className="fixed right-3 top-3 z-50 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg"
      >
        หมวด: {cats}
      </button>

      <div className="mx-auto max-w-[480px]">
        <ProgressTopBar
          variant="questions"
          logo
          activeIndex={0}
          boxes={cats === 5 ? BOXES_5 : BOXES_3}
          lang={lang}
          onLangChange={setLang}
          onBack={() => {}}
        />

        <div className="px-5 pb-40 pt-5">
          <h2 className="text-2xl font-extrabold leading-snug text-primary">
            {lang === "th" ? "ขอวีซ่าประเภทไหน?" : "Which visa type?"}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {lang === "th" ? "เลือกประเภทวีซ่าที่ต้องการยื่น" : "Pick the visa you plan to apply for"}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            {OPTIONS.map((o) => (
              <ChoiceRow
                key={o.v}
                selected={sel === o.v}
                onSelect={() => setSel(o.v)}
                icon={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.img} alt="" className="h-full w-full object-contain" />
                }
                title={lang === "th" ? o.t : o.s}
                sub={lang === "th" ? o.s : undefined}
              />
            ))}
            <RevealBlock open={isOther}>
              <div className="pt-1">
                <TextField
                  label={lang === "th" ? "โปรดระบุประเภทวีซ่า" : "Please specify"}
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder={lang === "th" ? "เช่น วีซ่าทำงาน, วีซ่าแต่งงาน" : "e.g. work, marriage"}
                />
              </div>
            </RevealBlock>
          </div>
        </div>
      </div>

      <StickyFooter hint={isOther ? undefined : sel ? "แตะเพื่อเลือกและไปต่อ" : "เลือกประเภทวีซ่าเพื่อไปต่อ"}>
        {isOther ? <Button disabled={!canNext}>ถัดไป</Button> : null}
      </StickyFooter>
    </main>
  );
}
