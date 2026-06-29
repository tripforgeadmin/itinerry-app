"use client";

// TEMPORARY dev-only preview of the Phase-2 primitives. Delete before merge.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { ProgressTopBar } from "@/components/ui/ProgressTopBar";
import { ElephantLoader } from "@/components/ui/ElephantLoader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { TextField } from "@/components/ui/TextField";
import { ConsentCheck } from "@/components/ui/ConsentCheck";
import { ChoiceRow } from "@/components/ui/ChoiceRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { RevealBlock } from "@/components/ui/RevealBlock";
import type { Lang } from "@/components/ui/LangToggle";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="px-1 pt-7 pb-2 text-xs font-bold uppercase tracking-wider text-muted-soft">{children}</p>;
}

export default function UiPreview() {
  const [lang, setLang] = useState<Lang>("th");
  const [selected, setSelected] = useState("tourist");
  const [multi, setMulti] = useState<string[]>(["uk"]);
  const [consent, setConsent] = useState(false);
  const [yn, setYn] = useState<string | null>(null);
  const [seg3, setSeg3] = useState<string | null>("full");
  const [phone, setPhone] = useState("12");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const toggleMulti = (v: string) =>
    setMulti((m) => (m.includes(v) ? m.filter((x) => x !== v) : [...m, v]));

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-[420px] pb-28">
        <ProgressTopBar
          variant="questions"
          activeIndex={1}
          boxes={[
            { label: "พื้นฐาน", fill: 1 },
            { label: "เดินทาง", fill: 0.48 },
            { label: "คัดกรอง", fill: 0 },
          ]}
          lang={lang}
          onLangChange={setLang}
          onBack={() => {}}
        />

        <div className="px-5">
          <Label>ProgressTopBar · bare</Label>
          <ProgressTopBar variant="bare" showBack lang={lang} onLangChange={setLang} onBack={() => {}} />

          <Label>ChoiceRow (single-select)</Label>
          <div className="flex flex-col gap-3">
            <ChoiceRow selected={selected === "tourist"} onSelect={() => setSelected("tourist")} icon="🏖️" title="ท่องเที่ยว" sub="Tourist" />
            <ChoiceRow selected={selected === "business"} onSelect={() => setSelected("business")} icon="💼" title="ธุรกิจ" sub="Business" />
            <ChoiceRow selected={selected === "student"} onSelect={() => setSelected("student")} icon="🎓" title="นักเรียน" sub="Student" />
          </div>

          <Label>ChoiceRow (multi-select)</Label>
          <div className="flex flex-col gap-3">
            {[
              { v: "uk", t: "สหราชอาณาจักร" },
              { v: "us", t: "สหรัฐอเมริกา" },
              { v: "jp", t: "ญี่ปุ่น" },
            ].map((o) => (
              <ChoiceRow key={o.v} selected={multi.includes(o.v)} onSelect={() => toggleMulti(o.v)} icon="🛂" title={o.t} />
            ))}
          </div>

          <Label>SegmentedControl (3-cell)</Label>
          <SegmentedControl
            value={seg3}
            onChange={setSeg3}
            segments={[
              { value: "full", label: "มีครบ", sub: "พร้อมยื่น" },
              { value: "partial", label: "มีบางส่วน", sub: "ยังขาด" },
              { value: "none", label: "ยังไม่มี", sub: "เริ่มเตรียม" },
            ]}
          />

          <Label>SegmentedControl (Y/N · warning) + RevealBlock</Label>
          <SegmentedControl
            value={yn}
            onChange={setYn}
            tone="warning"
            segments={[
              { value: "no", label: "ไม่เคย" },
              { value: "yes", label: "เคย" },
            ]}
          />
          <RevealBlock open={yn === "yes"}>
            <div className="pt-3">
              <TextField label="ประเทศและปีที่ถูกปฏิเสธ" placeholder="เช่น สหรัฐฯ 2566" />
            </div>
          </RevealBlock>

          <Label>TextField (with validation error)</Label>
          <div className="flex flex-col gap-3">
            <TextField
              label="เบอร์โทรศัพท์"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08x-xxx-xxxx"
              error={phone.length > 0 && phone.length < 9 ? "รูปแบบเบอร์โทรไม่ถูกต้อง" : null}
            />
          </div>

          <Label>ConsentCheck</Label>
          <ConsentCheck checked={consent} onToggle={() => setConsent((c) => !c)}>
            ข้าพเจ้ายินยอมให้ itinerry เก็บและใช้ข้อมูลเพื่อประเมินโอกาสวีซ่า ตามนโยบายความเป็นส่วนตัว
          </ConsentCheck>

          <Label>Button variants</Label>
          <div className="flex flex-col gap-3">
            <Button>ส่งแบบประเมิน →</Button>
            <Button disabled>ถัดไป (disabled)</Button>
            <Button variant="line">💬 Add LINE</Button>
            <Button variant="ghost" fullWidth={false}>เริ่มประเมินใหม่</Button>
          </div>

          <Label>ElephantLoader · ScreenTransition</Label>
          <div className="flex flex-col gap-3">
            <Button variant="line" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }}>
              เล่น loader 2 วิ
            </Button>
            <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>retrigger transition ↻</Button>
            <ScreenTransition screenKey={String(step)}>
              <GlassCard>
                <div className="p-4 text-center text-sm text-muted">transition #{step} — fade + translateY</div>
              </GlassCard>
            </ScreenTransition>
          </div>
        </div>
      </div>

      <StickyFooter>
        <Button disabled={!consent}>ยอมรับและไปต่อ</Button>
      </StickyFooter>

      <ElephantLoader show={loading} caption="กำลังบันทึกคำตอบของคุณ" sub="เตรียมคำถามเรื่องการเดินทาง…" />
    </main>
  );
}
