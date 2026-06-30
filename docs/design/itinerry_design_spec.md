# itinerry — Visa Pre‑screen Flow · Frontend Design Spec (v2)

> Handoff document for frontend implementation. Source of truth: `itinerry_visa_assessment_prototype_v2.html`.
> The prototype is a single self‑contained HTML mock (vanilla JS). This spec describes the **design intent + behavior** so it can be rebuilt in any framework (React/Vue/Svelte/etc.). Where the prototype uses a shortcut (e.g. DOM‑scan for the summary), the recommended production approach is called out.

---

## 1. Overview

| | |
|---|---|
| **Product** | itinerry visa eligibility pre‑screen — a short, friendly questionnaire that captures a lead, qualifies the case, and routes the user to LINE OA / phone callback. |
| **Goal** | User completes in ~2 minutes, seeing only ~11–12 questions relevant to them. After submit → thank‑you + LINE OA link. |
| **Audience** | Thai users, mobile‑first, low domain knowledge, **high anxiety** (visa = irreversible/life‑affecting). Tone: warm, reassuring, non‑judgmental. |
| **Language** | Thai primary. Country names show TH + EN. |
| **Platform** | Mobile web, single column, thumb‑zone CTA at bottom. (Prototype is shown inside a fixed 392×848 device frame — that frame is mock chrome only; production should be full‑viewport responsive mobile.) |
| **Backend mapping** | Field/route logic lives in `Itinerry_GoogleForm_Logic_ApproachB.md` (Google Form/Sheet). See §9 for the field map. |

**Design principles applied** (annotate in code comments where useful):
- *Goal Gradient / Endowed Progress* — the top progress never reads 0%; it fills as questions are answered.
- *Glassmorphism* — unified frosted‑card style across all choice cards.
- *Peak‑End / Wait psychology* — friendly elephant "saving your answers" loaders at phase transitions; celebratory transition + confirm screens.
- *Single‑Option Aversion / chunking* — always ≥2 clear options; questions grouped into 3 phases.
- *Trust at decision points* — reassurance banners on sensitive questions, privacy notes near financial questions, social proof on the welcome screen.

---

## 2. Design Tokens

### Colors (CSS variables)
| Token | Hex | Use |
|---|---|---|
| `--primary` | `#1b3d5c` | Primary text, headings, dark UI |
| `--primary-mid` | `#2e5573` | Secondary dark text |
| `--accent` | `#44a8db` | Brand blue — selected state, links, progress water |
| `--accent-hover` | `#2b86b5` | Accent pressed/darker |
| `--accent-light` | `#d6effa` | Light accent border |
| `--accent-bg` | `#f0f8fd` | Light accent fill (info banners) |
| `--accent-subtle` | `#e8f5fc` | Subtle accent tint |
| `--card` | `#fdfeff` | Solid card bg (pre‑glass) |
| `--surface` | `#f8fafc` | **App background** |
| `--surface-soft` | `#f3f4f6` | Disabled button bg |
| `--muted` | `#64748b` | Muted text / labels |
| `--muted-light` | `#94a3b8` | Hint text, empty ticks |
| `--border` | `#e2e8f0` | Default border |
| `--border-mid` | `#cbd5e1` | Stronger border / unselected tick ring |
| `--yellow` | `#ffd166` | **Primary CTA** background |
| `--yellow-hover` | `#f5c842` | CTA pressed |
| `--line` | `#06C755` | LINE green (LINE buttons/labels) |
| `--success` / `--success-dark` | `#4ade80` / `#1a6b47` | Confirmation success |
| `--success-bg` | `#e6f7f0` | "positive" banners |
| `--warning` | `#f59e0b` | Warnings, "เคย" (yes) selected on sensitive Y/N |
| `--logo` | `#00c3ff` | The "iti" in the wordmark |

**Per‑phase progress water colors** (gradient top→bottom):
- Phase 1: `#66c1ec → #2b86b5`
- Phase 2: `#54ccc6 → #1f9aa0`
- Phase 3: `#7ea6f2 → #4a63c4`

**Glass recipe** (applied to all choice/summary cards):
```css
background: rgba(255,255,255,.55);
backdrop-filter: blur(11px) saturate(1.4);
border: 1px solid rgba(255,255,255,.7);
box-shadow: 0 4px 16px rgba(27,61,92,.08);
/* selected */
border-color: var(--accent);
background: rgba(214,239,250,.66);
box-shadow: 0 0 0 3px rgba(68,168,219,.18), 0 6px 18px rgba(27,61,92,.1);
```
> Note: glass reads best over color/texture. The current app background is flat `--surface`, so glass is intentionally subtle. If a screen needs the glass to "pop", place a soft gradient behind the cards.

### Typography
| Font | Var | Where |
|---|---|---|
| Noto Sans Thai (400/500/600/700) | `--thai` | Default / all Thai text |
| Plus Jakarta Sans (500/600/700/800) | `--sans` | Latin numerals, logo, CTA labels, English |

Type scale (px): screen title `q-label` 21/700 · eyebrow 11/700 uppercase letter‑spaced (accent) · help 13.5 (muted) · option title 15.5–17.5/700–800 · option sub 11.5–12.5 (muted) · CTA 16/800.

### Radius & spacing
`--r-card: 1rem` (16px) cards · pills 99px · grid card radius 16px · device frame 46px.
Vertical rhythm in rem (1/1.5/2rem); component gaps in px (8/10/12/14).

---

## 3. Global Chrome

```
┌─────────────────────────────┐
│ status bar (mock: 9:41 …)    │
│ [‹ back]  [progress boxes]   │  ← top bar
│ ───────────────────────────  │
│                              │
│   scrollable .content        │  ← active screen renders here
│                              │
│   (sticky footer CTA)        │  ← floats at bottom
└─────────────────────────────┘
```

### Top bar
- **Back button** (circle, 34px, top‑left). Hidden on `welcome` and `confirm`.
- **Progress boxes** (see §4). Hidden on "bare" screens (`welcome`, `transition`, `confirm`) — on those screens the centered **wordmark** `itinerry` (the "iti" in `--logo` cyan) shows instead.

### Footer (sticky CTA)
- Fixed to bottom, with a fade gradient from transparent → `--surface`.
- Primary CTA = yellow pill (`--yellow`, glow shadow, `--sans` 800). Disabled = `--surface-soft` grey.
- **Auto‑advance screens show no button** — instead a centered hint `แตะเพื่อเลือกและไปต่อ`.
- Footer content is configured per screen (see §6 footer map).

### Elephant loader (full‑screen overlay)
- Cute SVG elephant "writing on a tablet" (floats, blinks, ink strokes animate). Shown over the viewport while transitioning between phases.
- Duration: **2000ms** normal, **2300ms** for submit.
- Triggered by screens carrying a `data-elephant` type; captions:
  - `phase2` → "กำลังบันทึกคำตอบของคุณ" / "เตรียมคำถามเรื่องการเดินทาง…"
  - `phase3` → "เกือบครบแล้ว!" / "เตรียมคำถามชุดสุดท้าย…"
  - `submit` → "กำลังส่งแบบประเมิน" / "ทีมวีซ่ากำลังรับเคสของคุณ…"

---

## 4. Progress System — liquid category boxes

Three boxes across the top bar, one per phase, each with an icon and **water that fills based on how many questions in that category have been answered.**

| Box | Caption | Icon | Water color |
|---|---|---|---|
| 1 | `พื้นฐาน` | passport/ID | blue |
| 2 | `เดินทาง` | airplane | teal |
| 3 | `คัดกรอง` | shield‑check | indigo |

**Visual states**
- Water rises from the bottom; a white "foam" wave animates on the surface (two layered SVG waves, ~2–3s loop).
- **Active** category: accent ring + colored caption.
- **Done** (full): a small ✓ badge appears top‑right; icon turns white; caption darkens.
- Boxes hide entirely on bare screens.

**Fill algorithm** (per phase `p`):
```
ids       = the screen ids that count as "questions" in phase p (see §6)
positions = ids mapped to their index in `flow`
answered  = count(positions where position < currentIndex)   // already passed
total     = ids.length

if answered >= total:            fill = 1.0          // category complete
else if current screen ∈ ids:    fill = min(1, (answered + 0.45) / total)  // on a question now → partial (never 0)
else:                            fill = answered / total      // not reached yet
```
This yields, e.g. Phase 1 (3 questions): 15% → 48% → 82% → 100%.

`prefers-reduced-motion`: disable wave + fill transitions.

---

## 5. Core interaction patterns

| Pattern | Behavior |
|---|---|
| **Auto‑advance (single‑select)** | Tapping an option marks it selected, then auto‑advances after ~360ms. No Next button (footer hint shown). Used by: nationality, country, visatype (std options), occupation, empdoc, savings. |
| **Next‑gated (multi‑select / forms)** | User selects, then taps **ถัดไป**. Next is disabled until valid. Used by: consent, dates, priorvisas, refused, overstay, ties, contact, summary. |
| **Optional Next** | found — Next always enabled (question is optional). |
| **Reveal field** | A hidden block expands (max‑height transition) when a trigger is chosen (e.g. "เคย" → detail inputs; "โทรกลับ" → time slots; "วีซ่าอื่นๆ" → specify input). |
| **Glass card grids** | 2‑column grids (country square, ties 2×3, found 2×3) and full‑width rows (visa, occupation). |
| **Inline calendar** | Full month shown (not a native picker). Tap a day to select; ‹ › to change month; past days disabled; today outlined. |
| **Typewriter placeholder** | Search field placeholder types/erases example queries while idle on the country screen; stops on focus/typing. |
| **Mascot filler** | `itin_main.png` elephant, centered (flex‑grow) in the empty space between content and the footer. Used on: priorvisas, empdoc, refused, overstay, savings, contact. |

---

## 6. Screen flow

**18 screens, linear (no per‑answer branching in this prototype).**

```
0 welcome → 1 consent → 2 nationality → 3 country → 4 visatype ⟿(loader phase2)
→ 5 dates → 6 priorvisas → 7 occupation ⟿(loader phase3)
→ 8 empdoc → 9 refused → 10 overstay → 11 savings → 12 ties
→ 13 transition → 14 contact(merged) → 15 found → 16 summary ⟿(loader submit) → 17 confirm
```

**Phases** (drives the progress boxes):
- **Phase 1 · พื้นฐาน:** nationality, country, visatype
- **Phase 2 · เดินทาง:** dates, priorvisas, occupation
- **Phase 3 · คัดกรอง:** empdoc, refused, overstay, savings, ties, contact, found, summary
- *No phase:* welcome, consent, transition, confirm.

**Loaders** (`data-elephant`): visatype→`phase2`, occupation→`phase3`, summary→`submit`.

**Footer config map**
| Screen | Footer |
|---|---|
| welcome | `เริ่มเลย →` |
| consent | `ยอมรับและไปต่อ` (disabled until checkbox) |
| nationality/country/visatype(std)/occupation/empdoc/savings | *hint:* `แตะเพื่อเลือกและไปต่อ` (auto‑advance) |
| visatype(other) | `ถัดไป` (disabled until specify filled) |
| dates | `ถัดไป` (disabled until valid date range) |
| priorvisas | `ถัดไป` (disabled until ≥1 chip) |
| refused / overstay | `ถัดไป` (disabled until answered) |
| ties | `ถัดไป` (disabled until ≥1 card) |
| transition | `ใส่ข้อมูลติดต่อ →` |
| contact | `ถัดไป` (disabled until fields + channel valid) |
| found | `ถัดไป →` (always enabled) |
| summary | `ส่งแบบประเมิน →` (disabled until certify checked) |
| confirm | `💬 Add LINE @itinerry` (LINE green) + ghost `เริ่มประเมินใหม่` |

---

## 7. Screen‑by‑screen

> Format: **purpose → eyebrow / title (Thai) / help → body → interaction/gating → assets**.

### 0 · welcome  *(bare)*
- Wordmark logo `itinerry`. Badge `✨ ฟรี · ใช้เวลา ~2 นาที`.
- H1: **เช็คโอกาส<span accent>ผ่านวีซ่า</span>ของคุณ**
- Sub: "ตอบไม่กี่ข้อ ทีมวีซ่า itinerry จะประเมินเคสและเตรียมคำแนะนำเฉพาะคุณ ส่งกลับให้ทาง LINE หรือโทรหาคุณ"
- **Trust stats** (3 cards): `40,000+` ลูกค้าที่ไว้ใจเรา · `93%` ผ่านตั้งแต่รอบแรก · `15+` ปลายทางทั่วโลก.
- Privacy line: 🛡 "ข้อมูลของคุณปลอดภัยและเป็นความลับ".
- CTA: `เริ่มเลย →`.

### 1 · consent
- Eyebrow `ก่อนเริ่ม` · Title **ความยินยอมการใช้ข้อมูล** · Help "itinerry เก็บข้อมูลของคุณเพื่อประเมินและให้บริการยื่นวีซ่าเท่านั้น".
- **PDPA card:** `🔒 ข้อมูลที่เราเก็บ` + paragraph + link `อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม (PDPA) →`.
- **Consent checkbox** (accent box): "ข้าพเจ้าได้อ่านและยินยอมให้ itinerry เก็บและใช้ข้อมูลตามวัตถุประสงค์ข้างต้น".
- Gating: CTA enabled only when checkbox ticked.

### 2 · nationality  *(Phase 1, auto‑advance)*
- Title **คุณถือสัญชาติอะไร?** · Help "สัญชาติเป็นตัวกำหนดสิทธิ์ยกเว้นวีซ่าและชุดเอกสารที่คุณต้องใช้".
- **Two stacked cards** (image on top ~160px, label below, tick top‑right):
  - **ไทย** ·TH — `🛂 พาสปอร์ตไทย` — `assets/mascot/itin_thai-passport-cut.png`
  - **สัญชาติอื่น** — "เลือกประเทศได้ในขั้นถัดไป" — `assets/mascot/itin-inter-passport-cut.png`
- Tap → auto‑advance. (Both go to `country`; nationality value is recorded for the summary.)

### 3 · country  *(Phase 1, auto‑advance)*
- Title **จะยื่นวีซ่าประเทศไหน?** · Help "พิมพ์ชื่อประเทศ (ไทย/อังกฤษ) หรือเลือกจากด้านล่าง".
- **Search input** with typewriter placeholder (`🔍 ค้นหา เช่น ญี่ปุ่น · Japan…` cycling).
- **2‑column square grid** of 43 country cards: round flag (top) + Thai name (bold) + English name (small).
  - Flags: local `assets/flag-countries/Flag_of_<slug>_Flat_Round_Corner-512x512.png`, rendered circular (border‑radius 50%, object‑fit cover).
  - Countries (order = popular first): UK, Japan, S.Korea, USA, Canada, Australia, New Zealand, China, Taiwan, India, UAE/Dubai, Saudi Arabia, Qatar, then France, Germany, Italy, Spain, Portugal, Netherlands, Belgium, Switzerland, Austria, Greece, Sweden, Norway, Denmark, Finland, Iceland, Poland, Hungary, Slovakia, Slovenia, Estonia, Lithuania, Luxembourg, Malta, Bhutan, Mexico, Egypt, Morocco, Kenya, Ethiopia, Oman.
- **Search filter:** case‑insensitive substring match over `thaiName + englishName + keywords` (keywords include iso code + city aliases, e.g. `dubai`, `england`, `seoul`). Non‑matches hidden; if none → `ไม่พบประเทศที่ค้นหา`.
- Tap a card → auto‑advance.

### 4 · visatype  *(Phase 1, mostly auto‑advance; loader phase2 on leave)*
- Title **ขอวีซ่าประเภทไหน?** · Help "เลือกจุดประสงค์หลักของการเดินทาง".
- **5 full‑width glass cards** (elephant icon left ~56px, title + sub, tick right):
  | Card | Sub | Image |
  |---|---|---|
  | ท่องเที่ยว | ไปเที่ยวเป็นหลัก | `itin-travel-visa-cut.png` |
  | เยี่ยมเยียน | ไปหาครอบครัว / แฟน / เพื่อน | `itin-visit-visa-cut.png` |
  | ธุรกิจ | ประชุม / งาน / อบรม | `itin-business-visa-cut.png` |
  | นักเรียน | ไปเรียนต่อ | `itin-student-visa-cut.png` |
  | วีซ่าประเภทอื่นๆ | เลือกแล้วระบุประเภทด้านล่าง | `itin-other-visa-cut.png` |
- Std 4 → auto‑advance. **อื่นๆ** → reveals input `โปรดระบุประเภทวีซ่า` and shows a `ถัดไป` button disabled until the input has text.
- On advancing → loader (`phase2`).

### 5 · dates  *(Phase 2, Next‑gated)*
- Title **วางแผนเดินทางวันไหน?** · Help "เลือกวันไป–กลับ จากปฏิทินด้านล่าง ระบบจะสรุปให้ด้านบน".
- **Summary row (top):** 3 segments separated by dividers — `วันเดินทางไป` | `วันเดินทางกลับ` | `จำนวนวัน` (values update live; the days value is in accent).
- **Two inline calendar cards** (stacked): `วันเดินทางไป`, `วันเดินทางกลับ`.
  - Header: title + `‹ <เดือน พ.ศ.> ›` nav. Weekday row `อา จ อ พ พฤ ศ ส`. Day grid.
  - Selected day = accent fill/white text. Today = thin accent ring. **Past days disabled** (faded, non‑interactive).
  - Month/year shown in **Buddhist year (พ.ศ. = year+543)**, Thai month abbreviations.
- **Validation:** days = round((return − depart)/1day). If both set & days>0 → enable Next. If return ≤ depart → show warning pill `⚠️ วันกลับต้องหลังวันไป` and disable Next.

### 6 · priorvisas  *(Phase 2, Next‑gated, multi‑select)*
- Title **เคยได้วีซ่าประเทศเหล่านี้ใน 5 ปีไหม?** · Help "UK · Schengen · USA · Canada · Australia · NZ".
- Positive banner: `✓ เลือกที่เคยได้ — ยิ่งมีประวัติยิ่งดีต่อเคส`.
- **Chips (pills, multi‑select):** `ไม่เคย` (index 0, **exclusive** — selecting it clears the rest; selecting any other clears it), UK, Schengen, USA, Canada, Australia, NZ, Japan, S.Korea, China, Dubai.
  - Country chips show a small round flag from **Circle Flags CDN** `https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/<code>.svg` (EU tries `european_union.svg` → `eu.svg`; on failure falls back to the emoji flag).
- **Mascot** `itin_main.png` centered below.
- Gating: Next enabled when ≥1 chip selected.

### 7 · occupation  *(Phase 2, auto‑advance; loader phase3 on leave)*
- Title **อาชีพปัจจุบันของคุณ?** · Help "เพื่อเตรียมรายการเอกสารที่เหมาะกับคุณ".
- **6 full‑width image cards, image alternates left/right per row** (image tile 150×150 `object-fit:cover`, scene illustration; title + sub on the opposite side; tick in the outer corner):
  | Row | Title | Sub | Image |
  |---|---|---|---|
  | 1 (img left) | พนักงานประจำ | บริษัทเอกชน | `itin-occupation-office-sm.png` |
  | 2 (img right) | ข้าราชการ | หน่วยงานรัฐ · รัฐวิสาหกิจ | `itin-occupation-officer-sm.png` |
  | 3 (img left) | Freelance | อาชีพอิสระ | `itin-occupation-freelance-sm.png` |
  | 4 (img right) | เจ้าของธุรกิจ | กิจการส่วนตัว | `itin-occupation-business-owner-sm.png` |
  | 5 (img left) | นักเรียน / นักศึกษา | กำลังศึกษา | `itin-occupation-student-sm.png` |
  | 6 (img right) | เกษียณ / แม่บ้าน / ว่างงาน | ไม่มีรายได้ประจำ | `itin-occupation-unemploy-sm.png` |
- Tap → auto‑advance → loader (`phase3`).

### 8 · empdoc  *(Phase 3, auto‑advance)*
- Eyebrow `เอกสาร` · Title **มีหนังสือรับรองงานไหม?** · Help "ระบุตำแหน่ง + เงินเดือน + วันลาที่ได้รับอนุมัติ".
- **Segmented (3 cells):** `มีครบ`/พร้อมยื่น · `มีบางส่วน`/ยังขาด · `ยังไม่มี`/เริ่มเตรียม.
- **Mascot** `itin_main.png` centered.
- Tap → auto‑advance.
- *Planned enhancement (not yet built):* add "document stack" status icons above each cell — full docs + green check / single doc + amber ½ / dashed doc + grey "?" (green/amber/grey = complete/partial/none).

### 9 · refused  *(Phase 3, Next‑gated, sensitive)*
- Eyebrow `คัดกรอง` · Title **เคยถูกปฏิเสธวีซ่าจากประเทศใดไหม?**
- **Reassurance banner:** `💙 ตอบตามจริงช่วยให้เราเตรียมเคสได้แม่นขึ้น — เราไม่ตัดสิน และทุกอย่างเก็บเป็นความลับ`.
- **Yes/No buttons (text only, no icons):** `ไม่เคย` (select = accent) · `เคย` (select = **warning** style/amber).
- "เคย" → reveals a row: `ประเทศ` (text) + `ปี` (number, placeholder 2566).
- **Mascot** centered. Gating: Next enabled once an answer is chosen.

### 10 · overstay  *(Phase 3, Next‑gated, sensitive)*
- Title **เคยอยู่เกินกำหนดวีซ่า (Overstay) ไหม?**
- Reassurance: `💙 ข้อมูลนี้ช่วยให้ทีมวางแผนรับมือล่วงหน้าได้ ไม่มีผลต่อการให้บริการของเรา`.
- Yes/No (same as refused). "เคย" → reveals single field `ระบุประเทศ ระยะเวลา และปี` (placeholder "เช่น ญี่ปุ่น 10 วัน ปี 2565").
- Mascot centered.

### 11 · savings  *(Phase 3, auto‑advance, sensitive)*
- Title **ยอดเงินออมปัจจุบันประมาณเท่าไหร่?** · Help "ของตัวเองหรือผู้รับผิดชอบค่าใช้จ่าย".
- **4 option rows:** น้อยกว่า 50,000 บาท · 50,000–150,000 บาท · 150,000–300,000 บาท · มากกว่า 300,000 บาท.
- Privacy note: 🛡 "ข้อมูลการเงินถูกเข้ารหัสและเก็บเป็นความลับ".
- **Mascot** centered. Tap → auto‑advance.

### 12 · ties  *(Phase 3, Next‑gated, multi‑select)*
- Title **ความผูกพันกับเมืองไทย** · Help "สิ่งที่ทำให้คุณต้องกลับไทย — เป็นสัญญาณบวกสำคัญต่อวีซ่า".
- Positive banner: `✓ เลือกทุกข้อที่ใช่ — ยิ่งมากยิ่งช่วยเคส`.
- **2×3 image grid** (transparent‑cutout icon `object-fit:contain` + centered label + tick top‑right):
  | Card | Image |
  |---|---|
  | งานประจำ / ธุรกิจ ในไทย | `itin-obligation-job-cut.png` |
  | บ้าน / คอนโด / ที่ดิน ในไทย | `itin-obligation-house-cut.png` |
  | คู่สมรส / บุตร ในไทย | `itin-obligation-wife-child-cut.png` |
  | พ่อ–แม่ / ผู้ที่ต้องดูแล ในไทย | `itin-obligation-elder-cut.png` |
  | การลงทุน / ทรัพย์สินอื่น | `itin-obligation-other-asset-cut.png` |
  | ไม่มีข้อใดข้างต้น | `itin-obligation-no-cut.png` |
- Multi‑select; **"ไม่มีข้อใด" is exclusive.** Gating: Next enabled once ≥1 selected.

### 13 · transition  *(bare)*
- 🎉 · **เกือบเสร็จแล้ว!** · "เหลือแค่บอกเราว่าจะส่งผลประเมินให้คุณยังไง แล้วทีมวีซ่าจะติดต่อกลับ".
- CTA: `ใส่ข้อมูลติดต่อ →`.

### 14 · contact  *(Phase 3, Next‑gated — TWO questions on one page)*
- **Q1** — Eyebrow `ช่องทางรับผล` · Title **เราจะส่งผลให้คุณที่ไหนดี?**
  - Fields: `ชื่อ–นามสกุล`, `เบอร์โทรศัพท์` (tel), `อีเมล` (email) + hint "✉️ ใช้ส่งผลประเมินและเอกสาร — ไม่สแปม".
- **Q2** — Title **อยากให้ติดต่อกลับทางไหน?**
  - Two option rows: **Add LINE OA** (`@itinerry — คุยกับทีมได้เลย`, LINE‑green title) · **ให้เราโทรกลับ** (`เลือกช่วงเวลาที่สะดวก`, carries a "call" flag).
  - "โทรกลับ" → reveals time segmented `🌅 เช้า 9–12 · ☀️ บ่าย 12–15 · 🌆 เย็น 15–18`.
- **Mascot** centered.
- **Gating (combined):** Next enabled only when **all 3 contact fields filled** AND **a channel selected** AND (if "โทรกลับ" → a time slot selected).

### 15 · found  *(Phase 3, optional, multi‑select)*
- Eyebrow `เกือบเสร็จ` · Title **รู้จัก itinerry จากช่องไหน?** · Help "ช่วยเราพัฒนาบริการ (ไม่บังคับ · เลือกได้หลายข้อ)".
- **2×3 logo‑tile grid** (landscape isometric logo in a 16:9 tile `object-fit:cover` over a light tile bg + label + tick):
  | Card | Image |
  |---|---|
  | Facebook | `assets/icon-iso/logo-iso-facebook-sm.png` |
  | Instagram | `logo-iso-instagram-sm.png` |
  | TikTok | `logo-iso-tiktok-sm.png` |
  | Google | `logo-iso-google-sm.png` |
  | เพื่อนแนะนำ | `logo-iso-refer-sm.png` |
  | อื่นๆ | `logo-iso-other-sm.png` |
- Multi‑select, **optional** → Next always enabled.
- *Note:* these logos sit on a light background (used as logo tiles); the tile bg `#eef1f5` matches so it reads seamless. (Transparent versions not used because the light‑colored logos didn't cut cleanly.)

### 16 · summary  *(Phase 3, Next‑gated; loader submit on leave)*
- Eyebrow `ตรวจสอบก่อนส่ง` · Title **สรุปข้อมูลของคุณ** · Help "ตรวจความถูกต้องก่อนส่งให้ทีมวีซ่า".
- **Review card** — auto‑generated list of `label : value` rows for every answer the user gave (see §9). Only answered fields appear. Multi‑selects are comma‑joined; "เคย" answers append the detail in parentheses.
  - Row order: สัญชาติ, ประเทศปลายทาง, ประเภทวีซ่า, วันเดินทาง, จำนวนวัน, ประวัติวีซ่า, อาชีพ, หนังสือรับรองงาน, เคยถูกปฏิเสธวีซ่า, Overstay, เงินออม, ความผูกพันกับไทย, ชื่อ, เบอร์โทร, อีเมล, ติดต่อกลับ, รู้จักจาก.
- **Certify checkbox:** "ข้าพเจ้าขอรับรองว่าข้อมูลทั้งหมดเป็นความจริงและถูกต้อง".
- Gating: `ส่งแบบประเมิน →` disabled until certify checked. On submit → loader (`submit`) → confirm.

### 17 · confirm  *(bare)*
- Success ring ✓ (pop animation) · **ส่งแบบประเมินแล้ว!** · "ทีมวีซ่า itinerry กำลังตรวจเคสของคุณ และจะติดต่อกลับภายใน 24 ชั่วโมง".
- **Next‑steps card** (3 numbered steps): 1 ทีมวิเคราะห์โอกาสผ่านวีซ่าของคุณ · 2 เตรียมคำแนะนำและรายการเอกสารเฉพาะคุณ · 3 ติดต่อกลับพร้อมผลประเมิน.
- CTA: `💬 Add LINE @itinerry` (LINE green) + ghost `เริ่มประเมินใหม่` (resets the flow).

---

## 8. Assets

```
assets/
├─ mascot/
│   ├─ itin_thai-passport-cut.png        (nationality · Thai)        transparent
│   ├─ itin-inter-passport-cut.png       (nationality · other)       transparent
│   ├─ itin_main.png                      (filler mascot, 6 screens)  transparent
│   ├─ itin-travel-visa-cut.png … itin-other-visa-cut.png  (5 visa icons)   transparent
│   ├─ itin-occupation-*-sm.png           (6 occupation scenes, 384px) with scene bg
│   └─ itin-obligation-*-cut.png          (6 ties icons)              transparent
├─ flag-countries/
│   └─ Flag_of_<Country>_Flat_Round_Corner-512x512.png   (43 country flags, local)
└─ icon-iso/
    └─ logo-iso-{facebook,instagram,tiktok,google,refer,other}-sm.png  (6, light bg)
```
- **Naming:** `-cut` = white/scene background removed → transparent PNG. `-sm` = downscaled (originals were 2–8MB; keep large originals out of the shipped build).
- **Prior‑visa chips** use remote SVG flags (Circle Flags via jsDelivr) — needs internet; emoji fallback if blocked. Consider self‑hosting for production/offline.
- Image display sizes: nationality ~160px · visa icon 56px · occupation tile 150px · ties icon ~94px · country flag ~60px circle · found tile full‑width 16:9.

---

## 9. State & data model

### Prototype approach (current)
The prototype keeps **no central state** — each selection is just a `.sel` (or `.selwarn`) CSS class on the chosen element, and the **summary screen scans the DOM** for selected elements/inputs to build its list (calendar state is the only JS object: `{go:{y,m,sel}, back:{…}}`).

### Recommended for production
Use a single reactive `answers` object updated by each handler; render the summary from it; POST it on submit. Suggested shape (maps to the backend in `Itinerry_GoogleForm_Logic_ApproachB.md`):

| `answers` key | From screen | Backend field (Sheet col) | Notes |
|---|---|---|---|
| `nationality` | nationality | *(new)* | "ไทย" / "สัญชาติอื่น" |
| `destination` | country | Destination (E) | |
| `visaType` (+ `visaTypeOther`) | visatype | Visa_Type (F) | |
| `travelDepart`, `travelReturn`, `travelDays` | dates | Travel_Date (G) → Days_Left/Timeline_Flag computed server‑side | ISO dates; days = return−depart |
| `visaHistory[]` | priorvisas | Visa_History (J) | multi |
| `occupation` | occupation | Occupation (O) | |
| `empLetter` | empdoc | Emp_Letter (P) | มีครบ/มีบางส่วน/ยังไม่มี |
| `refused` (+ `refusedCountry`, `refusedYear`) | refused | Refusal_History (T) | |
| `overstay` (+ `overstayDetail`) | overstay | Overstay_History (U) | flag red if "เคย" |
| `savings` | savings | Savings_Range (V) | |
| `ties[]` | ties | *(new — positive signals)* | multi, "ไม่มี" exclusive |
| `name` | contact | Full Name (B) | |
| `phone` | contact | Contact (C) | |
| `email` | contact | *(email)* | |
| `contactPref` (+ `preferredTime`) | contact | Contact_Pref (W) / Preferred_Time (X) | LINE OA / โทรกลับ |
| `found[]` | found | Channel (D) | multi |

> The prototype is a **simplified linear flow.** The full form logic (`ApproachB`) branches by visa type (S2A–D) and occupation (S4A–D) to ask different follow‑ups. If/when that branching is added, insert the per‑type screens after `visatype` and `occupation` respectively and update `flow`, `phaseOf`, `phaseScreens`, and the progress denominators accordingly.

---

## 10. Motion & accessibility

- **Durations:** auto‑advance delay ~360ms · screen fade‑in 0.28s · water fill 0.75s (spring) · reveal max‑height 0.3s · loaders 2.0s / 2.3s.
- **Reduced motion** (`prefers-reduced-motion: reduce`): stop the progress wave + fill transitions, the loader elephant animation, and any decorative shimmer. Keep functional state changes instant.
- **Tap targets:** options ≥ 44px tall; calendar days ~44px.
- **Contrast:** body text `--primary` on light cards passes AA. Avoid relying on color alone — selected states also use a ring + tick.
- **Inputs:** use proper `type`/`inputmode` (tel/email/number) and labels. Date selection is a custom calendar (ensure keyboard/AT access in production — the prototype is pointer‑only).
- **Back navigation** preserves selections (screens persist in the DOM in the prototype).

---

## 11. Implementation notes & open items

- **Device frame** (392×848, rounded) is prototype chrome — drop it for production; make the layout full‑viewport, single column, max content width ~ 480px centered on larger screens.
- **Glass over flat bg** is subtle by design. If a screen should feel more "glassy", add a soft gradient/illustration behind that card group.
- **CDN dependency:** prior‑visa chip flags load from jsDelivr. Self‑host (or reuse the local `flag-countries` set) to avoid an external dependency.
- **Heavy source images:** ship only the `-cut` / `-sm` variants; keep multi‑MB originals out of the bundle. Consider WebP.
- **Summary = DOM scan** in the prototype → replace with the `answers` state model (§9) in production.
- **Pending visual enhancement:** document‑stack status icons on `empdoc` (see §7‑8).
- **Validation** in the prototype is light (non‑empty checks). Add real phone/email validation for production.
- **Two versions exist:** `itinerry_visa_assessment_prototype.html` (v1 checkpoint) and **`…_v2.html` (current, source of truth for this spec).**

---

*Spec generated from the v2 prototype. Keep this file in sync when screens change.*
