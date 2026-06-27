# itinerry — Detailed Screen Layout & Logic

> Companion to `itinerry_design_spec.md`. This file documents, **for every screen**: exactly what sits where (ASCII wireframe + ordered element list), and the step‑by‑step logic, conditions, and edge cases. Source of truth: `itinerry_visa_assessment_prototype_v2.html`.

---

## 0. How to read this

Every screen is described with these blocks:

- **TOP BAR** — back button visibility + the 3 progress boxes' state (which phase is active and each box's water fill %).
- **CONTENT (top → bottom)** — the exact vertical order of elements, their alignment and spacing. A wireframe shows position; a table lists each element.
- **FOOTER** — the CTA / hint and its initial enabled/disabled state.
- **ON ENTER** — what runs when the screen becomes active.
- **INTERACTIONS** — numbered user actions → resulting behavior + conditions.
- **GATING** — the exact boolean that enables the footer CTA.
- **EXIT** — what advancing does (loader? which screen next).
- **EDGE CASES**.

### Coordinate regions (all screens share this chrome)

```
        ┌──────────────────────────────────────────┐  ← device viewport (mock 392 × 848)
 44px   │  status bar  09:41 · signal · wifi · batt  │
        ├──────────────────────────────────────────┤
~64px   │  TOP BAR:  (‹)  ⟦box1⟧⟦box2⟧⟦box3⟧         │  ← back 34px left · 3 progress boxes fill the rest
        ├──────────────────────────────────────────┤
        │                                          │
  flex  │  CONTENT  (vertical scroll, hidden bar)   │  ← padding 6px 20px 120px; one .screen active
        │  padding: 6 top / 20 sides / 120 bottom    │     bottom pad clears the floating footer
        │                                          │
        ├──────────────────────────────────────────┤
~90px   │  FOOTER  (absolute, fades in over surface) │  ← sticky CTA pill OR centered hint text
        └──────────────────────────────────────────┘
```

- **Bare screens** (`welcome`, `transition`, `confirm`): the TOP BAR hides the progress boxes and shows the centered wordmark `itinerry` instead. Back button is hidden on `welcome` and `confirm`.
- The active screen fades in (`opacity 0→1`, `translateY 8→0`, 0.28s) and content scroll resets to top on every render.

### Shared logic primitives (referenced by every screen)

```text
render(id):
  1. set the matching <section.screen> to .active (all others inactive)
  2. content.scrollTop = 0
  3. bare = id ∈ {welcome, transition, confirm}
       → topbar.bare toggled, wordmark shown when bare, progress boxes hidden when bare
  4. back button hidden when id ∈ {welcome, confirm}
  5. if id == 'summary' → buildSummary()   (re‑scan all answers into the review list)
  6. updateProgress(id)                      (recompute & animate the 3 water boxes)
  7. footerFor(id)                           (inject the correct footer markup)

next():
  if current screen has data-elephant (phase2|phase3|submit):
      show full‑screen elephant LOADER (2000ms, or 2300ms for submit) → then idx++ → render()
  else: idx++ → render()

back():  idx-- → render()      // selections persist (screens stay in the DOM)
restart(): idx=0; remove every .sel/.selwarn; render()

enableCTA()/disableCTA(): toggle #cta.disabled (only exists on Next‑gated screens)

AUTO‑ADVANCE select (single‑choice cards):
   clear .sel on siblings → add .sel on tapped → wait 360ms → next()

MULTI‑SELECT with an EXCLUSIVE option:
   tap the exclusive item  → clear all others, select only it
   tap any other item      → clear the exclusive item, toggle this one
   then re‑evaluate gating

REVEAL block: a hidden container animates max‑height 0 ↔ open (0.3s) when its trigger is chosen.
```

### Progress fill per screen (reference)
Using `fill = answered/total`, active phase = `(answered+0.45)/total`, complete = 100%.

| idx | screen | Box1 พื้นฐาน | Box2 เดินทาง | Box3 คัดกรอง | active |
|---|---|---|---|---|---|
| 0 | welcome | *(boxes hidden)* | | | — |
| 1 | consent | 0% | 0% | 0% | none |
| 2 | nationality | **15%** | 0% | 0% | 1 |
| 3 | country | **48%** | 0% | 0% | 1 |
| 4 | visatype | **82%** | 0% | 0% | 1 |
| 5 | dates | 100% ✓ | **15%** | 0% | 2 |
| 6 | priorvisas | 100% ✓ | **48%** | 0% | 2 |
| 7 | occupation | 100% ✓ | **82%** | 0% | 2 |
| 8 | empdoc | 100% ✓ | 100% ✓ | **6%** | 3 |
| 9 | refused | ✓ | ✓ | **18%** | 3 |
| 10 | overstay | ✓ | ✓ | **31%** | 3 |
| 11 | savings | ✓ | ✓ | **43%** | 3 |
| 12 | ties | ✓ | ✓ | **56%** | 3 |
| 13 | transition | *(hidden)* | | | — |
| 14 | contact | ✓ | ✓ | **68%** | 3 |
| 15 | found | ✓ | ✓ | **81%** | 3 |
| 16 | summary | ✓ | ✓ | **93%** | 3 |
| 17 | confirm | *(hidden, all full)* | | | — |

---

## Screen 0 · `welcome`  *(bare)*

**TOP BAR:** back hidden · progress hidden · wordmark `itinerry` centered.

**CONTENT** — vertically **centered** in the viewport, text‑align center, side padding 26px:
```
        itinerry                 ← logo, 30px/800, "iti" in cyan
   ┌──────────────────┐
   │ ✨ ฟรี · ใช้เวลา ~2 นาที │   ← pill badge (accent bg), centered
   └──────────────────┘
   เช็คโอกาส[ผ่านวีซ่า]ของคุณ      ← H1 27px/700, "ผ่านวีซ่า" in accent
   ตอบไม่กี่ข้อ ทีมวีซ่า itinerry…  ← sub paragraph, muted
   ┌────┐ ┌────┐ ┌────┐
   │40k+│ │93% │ │15+ │          ← 3 trust cards in a row (flex, equal width)
   │ลูกค้า│ │ผ่าน │ │ปลาย│
   └────┘ └────┘ └────┘
   🛡 ข้อมูลของคุณปลอดภัยและเป็นความลับ  ← privacy line, centered, muted
```
| # | element | detail |
|---|---|---|
| 1 | logo | `itinerry`, 30px/800, margin‑bottom 26px |
| 2 | badge | `✨ ฟรี · ใช้เวลา ~2 นาที`, accent pill |
| 3 | H1 | 2 lines, accent span on "ผ่านวีซ่า" |
| 4 | sub | grey paragraph |
| 5 | trust row | 3 cards: `40,000+`/ลูกค้าที่ไว้ใจเรา · `93%`/ผ่านตั้งแต่รอบแรก · `15+`/ปลายทางทั่วโลก |
| 6 | privacy | shield icon + text |

**FOOTER:** yellow CTA `เริ่มเลย →` (always enabled).
**ON ENTER:** nothing dynamic.
**INTERACTIONS:** tap CTA → `next()` (no loader) → `consent`.
**EDGE CASES:** none.

---

## Screen 1 · `consent`

**TOP BAR:** back shown · progress boxes visible but **all empty** (no active phase).

**CONTENT** (top‑aligned, left):
```
ก่อนเริ่ม                         ← eyebrow (accent, uppercase‑ish)
ความยินยอมการใช้ข้อมูล             ← H2 21/700
itinerry เก็บข้อมูลของคุณเพื่อ…     ← help, muted
┌─────────────────────────────┐
│ 🔒 ข้อมูลที่เราเก็บ            │   ← PDPA card (glass)
│ ชื่อ ช่องทางติดต่อ ข้อมูล…     │
│ อ่านนโยบาย…ฉบับเต็ม (PDPA) → │   ← link (accent)
└─────────────────────────────┘
┌─────────────────────────────┐
│ [▢] ข้าพเจ้าได้อ่านและยินยอม… │   ← consent checkbox row (glass, accent border)
└─────────────────────────────┘
```
| # | element | detail |
|---|---|---|
| 1 | eyebrow | `ก่อนเริ่ม` |
| 2 | H2 | `ความยินยอมการใช้ข้อมูล` |
| 3 | help | one line |
| 4 | PDPA card | heading `🔒 ข้อมูลที่เราเก็บ` + paragraph + link |
| 5 | consent‑check | checkbox (24px rounded) left + label; whole row tappable (`toggleConsent`) |

**FOOTER:** CTA `ยอมรับและไปต่อ`, **disabled on enter**.
**ON ENTER:** checkbox unchecked → CTA disabled.
**INTERACTIONS:**
1. Tap consent row → toggles `.sel` on the checkbox row → `#cta.disabled = !checked`.
2. Tap PDPA link → (prototype: no‑op `javascript:void(0)`; production: open PDPA).
**GATING:** `CTA enabled ⇔ checkbox is checked`.
**EXIT:** CTA → `next()` (no loader) → `nationality`.
**EDGE CASES:** returning via back keeps the checkbox state.

---

## Screen 2 · `nationality`  *(Phase 1 · auto‑advance)*

**TOP BAR:** back shown · Box1 **15%** active, Box2/3 empty.

**CONTENT:**
```
ข้อมูลพื้นฐาน
คุณถือสัญชาติอะไร?
สัญชาติเป็นตัวกำหนดสิทธิ์ยกเว้นวีซ่า…
┌─────────────────────────┐(○)←tick top‑right
│        [ 🐘 image ]      │   card "ไทย"  (image 160px, centered)
│         ไทย · TH         │   title 17.5/800 centered
│       🛂 พาสปอร์ตไทย      │   pill caption (accent)
└─────────────────────────┘
┌─────────────────────────┐(○)
│        [ 🐘 image ]      │   card "สัญชาติอื่น"
│        สัญชาติอื่น        │
│  เลือกประเทศได้ในขั้นถัดไป  │   sub (muted)
└─────────────────────────┘
```
| element | position | detail |
|---|---|---|
| eyebrow/H2/help | top, left | as above |
| card ×2 | stacked, full‑width, gap 12 | flex‑column, **centered**; image on top (160×160, object‑fit contain, transparent), label(s) below; **tick is absolute top‑right** |
| card.thai | 1st | image `itin_thai-passport-cut.png` · title `ไทย ·TH` · caption `🛂 พาสปอร์ตไทย` |
| card.world | 2nd | image `itin-inter-passport-cut.png` · title `สัญชาติอื่น` · sub `เลือกประเทศได้ในขั้นถัดไป` |

**FOOTER:** hint `แตะเพื่อเลือกและไปต่อ` (no button).
**ON ENTER:** nothing.
**INTERACTIONS:**
1. Tap a card → clear `.sel` on the other → add `.sel` (accent border + tick fills) → **wait 380ms → next()**.
**GATING:** none (auto‑advance).
**EXIT:** `next()` (no loader) → `country`. (Both choices go to `country`; the value is read later for the summary. Production may branch the later questions by nationality.)
**EDGE CASES:** re‑entering shows the previously selected card highlighted.

---

## Screen 3 · `country`  *(Phase 1 · auto‑advance)*

**TOP BAR:** back · Box1 **48%** active.

**CONTENT:**
```
ข้อมูลพื้นฐาน
จะยื่นวีซ่าประเทศไหน?
พิมพ์ชื่อประเทศ (ไทย/อังกฤษ) หรือเลือกจากด้านล่าง
┌─────────────────────────────────────┐
│ 🔍 ค้นหา เช่น ญี่ปุ่น · Japan ▌        │  ← search input (typewriter placeholder)
└─────────────────────────────────────┘
┌────────────┐ ┌────────────┐
│   (flag)   │ │   (flag)   │   ← 2‑col grid of square cards
│ สหราชอาณาจักร│ │   ญี่ปุ่น    │      flag circle on top, TH name (bold), EN name (small)
│United Kingdom│ │   Japan    │
└────────────┘ └────────────┘
            … 43 countries …
[ ไม่พบประเทศที่ค้นหา ]                  ← shown only when no match
```
| element | detail |
|---|---|
| search input | id `countrySearch`; `oninput → filterGrid(value)`; placeholder animated by typewriter while idle |
| grid | `#countryGrid`, `grid-template-columns: 1fr 1fr`, gap 10; each card `aspect-ratio 1/1`, centered column: flag (60px circle) → TH name (12.5/700, 2‑line clamp) → EN name (10px muted, ellipsis); **tick not used** (auto‑advance) |
| empty | `#ccEmpty` hidden unless 0 matches |

**FOOTER:** hint `แตะเพื่อเลือกและไปต่อ`.
**ON ENTER:** grid already built (built once at init). Typewriter runs only while this screen is active and the input is empty/unfocused.
**INTERACTIONS:**
1. Type in search → `filterGrid(q)`: for each card show/hide by `card.dataset.s.includes(q.toLowerCase())` where `data-s = (thaiName + " " + englishName + " " + keywords).toLowerCase()`. Update `#ccEmpty` visibility from match count.
2. Tap a country card → clear `.sel`, add `.sel` → wait 300ms → `next()`.
3. Focus/typing → typewriter stops and restores a static placeholder `🔍 ค้นหาประเทศ (ไทย/อังกฤษ)`.
**TYPEWRITER:** cycles examples (ญี่ปุ่น·Japan, เกาหลีใต้·Korea, สหราชอาณาจักร·UK, ยุโรป·Schengen, ดูไบ·Dubai, ออสเตรเลีย·Australia); type→pause 1.3s→erase→next; tick speed type 90ms / erase 40ms; paused (500ms poll) when screen inactive or input focused/non‑empty.
**GATING:** none (auto‑advance).
**EXIT:** `next()` (no loader) → `visatype`.
**EDGE CASES:** flags are local PNGs; if a flag file is missing the tile shows the grey placeholder circle. Search matches keywords too (e.g. "england"→UK, "dubai"→UAE, "ยุโรป"→EU).

---

## Screen 4 · `visatype`  *(Phase 1 · auto‑advance for 4, gated for "อื่นๆ"; loader phase2 on exit)*

**TOP BAR:** back · Box1 **82%** active.

**CONTENT:**
```
ข้อมูลพื้นฐาน
ขอวีซ่าประเภทไหน?
เลือกจุดประสงค์หลักของการเดินทาง
┌────────────────────────────────┐
│ [🐘]  ท่องเที่ยว              (○)│  ← full‑width glass row: icon 56px L · title+sub · tick R
│       ไปเที่ยวเป็นหลัก           │
└────────────────────────────────┘
│ [🐘]  เยี่ยมเยียน …          (○)│
│ [🐘]  ธุรกิจ …               (○)│
│ [🐘]  นักเรียน …             (○)│
│ [🐘]  วีซ่าประเภทอื่นๆ …      (○)│  ← last
┌────────────────────────────────┐
│ โปรดระบุประเภทวีซ่า              │  ← REVEAL (hidden until "อื่นๆ" chosen)
│ [ เช่น วีซ่าทำงาน / แต่งงาน … ] │
└────────────────────────────────┘
```
| element | detail |
|---|---|
| 5 cards `.vopt` | icon (`itin-*-visa-cut.png`, 56px) + body(title 15.5/700 + sub) + tick (right). Glass. |
| reveal `#visaOtherReveal` | input `#visaOtherInput`, label `โปรดระบุประเภทวีซ่า` |

**FOOTER:** initially hint `แตะเพื่อเลือกและไปต่อ`. (Changes to a Next button if "อื่นๆ" is chosen — see below.)
**ON ENTER:** reveal closed.
**INTERACTIONS:**
1. Tap one of the **4 standard** cards → clear `.sel`, add `.sel`, **close reveal** → wait 360ms → `next()`.
2. Tap **วีซ่าประเภทอื่นๆ** → clear `.sel`, add `.sel`, **open reveal**, **replace footer with** `<button#cta disabled>ถัดไป</button>`, focus the specify input. *Does NOT auto‑advance.*
3. Type in specify input → `#cta.disabled = (input is empty)`.
**GATING (only in the "อื่นๆ" path):** `Next enabled ⇔ specify input non‑empty`.
**EXIT:** advancing (auto for std, or Next for "อื่นๆ") → screen carries `data-elephant="phase2"` → **LOADER 2000ms** ("กำลังบันทึกคำตอบของคุณ / เตรียมคำถามเรื่องการเดินทาง…") → `dates`.
**EDGE CASES:** if user picks "อื่นๆ" then a standard card, reveal closes and flow auto‑advances; the specify value is ignored unless "อื่นๆ" is the final selection.

---

## Screen 5 · `dates`  *(Phase 2 · Next‑gated)*

**TOP BAR:** back · Box1 100%✓ · Box2 **15%** active.

**CONTENT:**
```
รายละเอียดการเดินทาง
วางแผนเดินทางวันไหน?
เลือกวันไป–กลับ จากปฏิทินด้านล่าง ระบบจะสรุปให้ด้านบน
┌──────────┬──────────┬──────────┐
│วันเดินทางไป│วันเดินทางกลับ│ จำนวนวัน  │  ← SUMMARY ROW (top), 3 segments + dividers
│   –      │    –     │   –      │     values fill live; days value in accent
└──────────┴──────────┴──────────┘
[ ⚠️ วันกลับต้องหลังวันไป ]              ← warning pill, hidden unless invalid
┌─────────────────────────────────┐
│ วันเดินทางไป      ‹ มิ.ย. 2569 ›  │  ← CALENDAR CARD #1 (depart)
│ อา จ อ พ พฤ ศ ส                 │     weekday header
│  …full month grid of day cells…  │     tap a day → select
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ วันเดินทางกลับ    ‹ ก.ค. 2569 ›  │  ← CALENDAR CARD #2 (return)
│  …grid…                          │
└─────────────────────────────────┘
```
| element | detail |
|---|---|
| summary row `#tripSum` | always visible; 3 `.seg` (`วันเดินทางไป`/`วันเดินทางกลับ`/`จำนวนวัน`) split by 1px dividers |
| warning `#nights` | hidden; shows on invalid range |
| calendar `#cal-go` / `#cal-back` | header (title + `‹ month ›` nav) → weekday row → 7‑col day grid |

**Calendar internals (`CAL = {go:{y,m,sel}, back:{y,m,sel}}`):**
- Initialised to the current month for both.
- Day cell classes: `.off` (blank pad before day 1) · `.dis` (past days, faded, non‑interactive) · `.today` (thin accent ring) · `.sel` (accent fill, white).
- Header shows `THM[month] + (year+543)` → Thai abbrev month + **Buddhist year**.

**FOOTER:** CTA `ถัดไป`, **disabled on enter**.
**ON ENTER:** both calendars rendered; summary shows `–`.
**INTERACTIONS:**
1. `‹` / `›` → `calMove(which, ±1)` → month/year roll over → re‑render that calendar.
2. Tap a (non‑past) day → `pickDay(which, iso)` → set `CAL[which].sel`, re‑render calendar (highlights), then `updateTrip()`.
3. `updateTrip()`:
   - `sumGo` = depart ? formatted(BE) : `–`; `sumBack` likewise.
   - if both set: `days = round((return − depart)/1day)`
     - `days > 0` → `sumDays = "{days} วัน"`, hide warning, **enable CTA**.
     - `days ≤ 0` → `sumDays = –`, show warning `⚠️ วันกลับต้องหลังวันไป`, **disable CTA**.
   - else → `sumDays = –`, hide warning, disable CTA.
**GATING:** `Next enabled ⇔ both dates chosen AND days > 0`.
**EXIT:** `next()` (no loader) → `priorvisas`.
**EDGE CASES:** selecting a return month earlier than depart still allowed in UI but caught by the `days>0` check. Past days cannot be tapped.

---

## Screen 6 · `priorvisas`  *(Phase 2 · Next‑gated · multi‑select)*

**TOP BAR:** back · Box2 **48%** active.

**CONTENT:**
```
รายละเอียดการเดินทาง
เคยได้วีซ่าประเทศเหล่านี้ใน 5 ปีไหม?
UK · Schengen · USA · Canada · Australia · NZ
[ ✓ เลือกที่เคยได้ — ยิ่งมีประวัติยิ่งดีต่อเคส ]   ← positive banner (green pill)
( ไม่เคย )(🇬🇧 UK)(🇪🇺 Schengen)(🇺🇸 USA)
(🇨🇦 Canada)(🇦🇺 Australia)(🇳🇿 NZ)(🇯🇵 Japan)
(🇰🇷 S.Korea)(🇨🇳 China)(🇦🇪 Dubai)            ← chips, wrap, multi‑select
            [ 🐘 itin_main ]                     ← MASCOT, centered in remaining space
```
| element | detail |
|---|---|
| positive banner | green pill, `width: fit-content` |
| chips `#priorChips` | wrapping pills; country chips show a small **CDN** round flag before the label; `ไม่เคย` is index 0 |
| mascot | `.prior-mascot` = `flex:1; center` → fills the gap between chips and footer, elephant `itin_main.png` ~150px |

**FOOTER:** CTA `ถัดไป`, **disabled on enter**.
**INTERACTIONS (multi‑select, `ไม่เคย` exclusive at index 0):**
1. Tap `ไม่เคย` → clear all chips, select only `ไม่เคย` → enable CTA.
2. Tap any country chip → clear `ไม่เคย`, toggle this chip → enable CTA.
**GATING:** `Next enabled ⇔ ≥1 chip selected` (the prototype enables on any tap; a stricter rule is `selectedCount ≥ 1`).
**EXIT:** `next()` (no loader) → `occupation`.
**EDGE CASES:** flags come from jsDelivr (needs internet); on failure each flag falls back to its emoji.

---

## Screen 7 · `occupation`  *(Phase 2 · auto‑advance; loader phase3 on exit)*

**TOP BAR:** back · Box2 **82%** active.

**CONTENT — image side ALTERNATES each row:**
```
รายละเอียดการเดินทาง
อาชีพปัจจุบันของคุณ?
เพื่อเตรียมรายการเอกสารที่เหมาะกับคุณ
┌──────────────────────────────┐
│ [IMG 150]   พนักงานประจำ   (○)│  row1: image LEFT
│             บริษัทเอกชน        │
└──────────────────────────────┘
┌──────────────────────────────┐
│(○) ข้าราชการ      [IMG 150]   │  row2: image RIGHT
│    หน่วยงานรัฐ·รัฐวิสาหกิจ      │
└──────────────────────────────┘
│ [IMG] Freelance / อาชีพอิสระ   │  row3: LEFT
│(○) เจ้าของธุรกิจ      [IMG]    │  row4: RIGHT
│ [IMG] นักเรียน / นักศึกษา       │  row5: LEFT
│(○) เกษียณ/แม่บ้าน/ว่างงาน [IMG] │  row6: RIGHT
```
| element | detail |
|---|---|
| 6 cards `.occ` | `flex-row`; even rows add `.flip` → `flex-direction: row-reverse` (image to the right, text right‑aligned). Image tile **150×150**, `object-fit: cover`, rounded; tick in the outer corner |
| images | `itin-occupation-{office,officer,freelance,business-owner,student,unemploy}-sm.png` |

**FOOTER:** hint `แตะเพื่อเลือกและไปต่อ`.
**INTERACTIONS:** tap a card → clear `.sel`, add `.sel` → wait 360ms → `next()`.
**EXIT:** `data-elephant="phase3"` → **LOADER 2000ms** ("เกือบครบแล้ว! / เตรียมคำถามชุดสุดท้าย…") → `empdoc`.
**EDGE CASES:** images are scene illustrations (not transparent) shown in a rounded tile; that's intentional.

---

## Screen 8 · `empdoc`  *(Phase 3 · auto‑advance)*

**TOP BAR:** back · Box1/2 100%✓ · Box3 **6%** active.

**CONTENT:**
```
เอกสาร
มีหนังสือรับรองงานไหม?
ระบุตำแหน่ง + เงินเดือน + วันลาที่ได้รับอนุมัติ
┌────────┐ ┌────────┐ ┌────────┐
│ มีครบ  │ │มีบางส่วน│ │ ยังไม่มี │   ← segmented 3 cells (equal width)
│พร้อมยื่น│ │ ยังขาด │ │เริ่มเตรียม│      small sub under each
└────────┘ └────────┘ └────────┘
            [ 🐘 itin_main ]          ← MASCOT centered
```
| element | detail |
|---|---|
| segmented `.seg3` | 3 `.s` cells, equal width, gap 9; each = main label + `<small>` sub |
| mascot | centered in remaining space |

**FOOTER:** hint `แตะเพื่อเลือกและไปต่อ`.
**INTERACTIONS:** tap a cell → clear `.sel`, add `.sel` → wait 360ms → `next()`.
**EXIT:** `next()` (no loader) → `refused`.
**PLANNED (not built):** a status icon above each cell — full‑stack+green‑check / one‑sheet+amber‑½ / dashed‑doc+grey‑"?" (complete / partial / none).

---

## Screen 9 · `refused`  *(Phase 3 · Next‑gated · sensitive)*

**TOP BAR:** back · Box3 **18%** active.

**CONTENT:**
```
คัดกรอง
เคยถูกปฏิเสธวีซ่าจากประเทศใดไหม?
┌─────────────────────────────────────┐
│ 💙 ตอบตามจริงช่วยให้เราเตรียมเคส…     │  ← reassurance banner (accent bg)
└─────────────────────────────────────┘
┌──────────────┐ ┌──────────────┐
│   ไม่เคย      │ │     เคย       │   ← Yes/No (2 equal buttons, text only)
└──────────────┘ └──────────────┘
┌──────────────┬──────────────┐
│ ประเทศ        │ ปี            │      ← REVEAL (only when "เคย")
│[เช่น สหรัฐฯ]  │ [2566]       │
└──────────────┴──────────────┘
            [ 🐘 itin_main ]
```
| element | detail |
|---|---|
| reassure | `💙` + text, accent bg |
| Y/N `.yn` | two `.o` buttons; `ไม่เคย` select = accent (`.sel`), `เคย` select = **warning/amber** (`.selwarn`) |
| reveal `#refusedReveal` | a `.daterow`: `ประเทศ` (text, flex 1.4) + `ปี` (number, placeholder 2566) |
| mascot | centered |

**FOOTER:** CTA `ถัดไป`, **disabled on enter**.
**INTERACTIONS (`pickYN`):**
1. Tap `ไม่เคย` → clear both → add `.sel`; close reveal; enable CTA.
2. Tap `เคย` → clear both → add `.selwarn`; **open reveal** (`#refusedReveal`); enable CTA.
**GATING:** `Next enabled ⇔ an answer chosen` (detail fields are NOT required to advance in the prototype).
**EXIT:** `next()` (no loader) → `overstay`.
**EDGE CASES:** switching from เคย→ไม่เคย closes the reveal; entered details persist in the inputs but won't show.

---

## Screen 10 · `overstay`  *(Phase 3 · Next‑gated · sensitive)*

**TOP BAR:** back · Box3 **31%** active.

**CONTENT:** identical pattern to `refused`:
```
คัดกรอง
เคยอยู่เกินกำหนดวีซ่า (Overstay) ไหม?
[ 💙 ข้อมูลนี้ช่วยให้ทีมวางแผน… ]
( ไม่เคย )      ( เคย )
[ ระบุประเทศ ระยะเวลา และปี ]            ← REVEAL single field (only when "เคย")
            [ 🐘 itin_main ]
```
- Reveal `#overstayReveal` = single input `ระบุประเทศ ระยะเวลา และปี` (placeholder "เช่น ญี่ปุ่น 10 วัน ปี 2565").
- Same `pickYN` logic & gating as `refused`.
**EXIT:** `next()` (no loader) → `savings`.

---

## Screen 11 · `savings`  *(Phase 3 · auto‑advance · sensitive)*

**TOP BAR:** back · Box3 **43%** active.

**CONTENT:**
```
คัดกรอง
ยอดเงินออมปัจจุบันประมาณเท่าไหร่?
ของตัวเองหรือผู้รับผิดชอบค่าใช้จ่าย
┌──────────────────────────────┐
│ น้อยกว่า 50,000 บาท        (○)│   ← 4 option rows (glass)
└──────────────────────────────┘
│ 50,000 – 150,000 บาท      (○)│
│ 150,000 – 300,000 บาท     (○)│
│ มากกว่า 300,000 บาท       (○)│
🛡 ข้อมูลการเงินถูกเข้ารหัสและเก็บเป็นความลับ   ← privacy note
            [ 🐘 itin_main ]
```
| element | detail |
|---|---|
| 4 `.opt` rows | title only (no sub), tick right |
| privacy | shield + text, muted |
| mascot | centered |

**FOOTER:** hint `แตะเพื่อเลือกและไปต่อ`.
**INTERACTIONS:** tap a row → clear `.sel`, add `.sel` → wait 360ms → `next()`.
**EXIT:** `next()` (no loader) → `ties`.

---

## Screen 12 · `ties`  *(Phase 3 · Next‑gated · multi‑select)*

**TOP BAR:** back · Box3 **56%** active.

**CONTENT:**
```
คัดกรอง
ความผูกพันกับเมืองไทย
สิ่งที่ทำให้คุณต้องกลับไทย — เป็นสัญญาณบวกสำคัญต่อวีซ่า
[ ✓ เลือกทุกข้อที่ใช่ — ยิ่งมากยิ่งช่วยเคส ]
┌────────────┐ ┌────────────┐
│   [🧳]    (○)│ │   [🏠]   (○)│   ← 2×3 grid (square glass cards)
│งานประจำ/ธุรกิจ│ │บ้าน/คอนโด/ที่ดิน│     icon (contain) centered + label below + tick TR
└────────────┘ └────────────┘
│   [🐘🐘]    │ │   [🐘🐘]    │   คู่สมรส/บุตร · พ่อ–แม่/ผู้ดูแล
│   [🏢]     │ │   [❓]      │   การลงทุน/ทรัพย์สิน · ไม่มีข้อใด
```
| element | detail |
|---|---|
| grid `#tiesList.tie-grid` | 2 cols; cards `.tie` `aspect-ratio 1/1`; icon `.tie-img` (~94px, `object-fit: contain`, transparent cutout) + `.tie-name` (2‑line clamp) + tick `.tk` top‑right |
| images | `itin-obligation-{job,house,wife-child,elder,other-asset,no}-cut.png` |

**FOOTER:** CTA `ถัดไป`, **disabled on enter**.
**INTERACTIONS (multi‑select, "ไม่มีข้อใด" = last index = exclusive):**
1. Tap "ไม่มีข้อใด" → clear all → select only it → enable CTA.
2. Tap any other → clear "ไม่มีข้อใด", toggle this → enable CTA.
**GATING:** `Next enabled ⇔ ≥1 card selected`.
**EXIT:** `next()` (no loader) → `transition`.

---

## Screen 13 · `transition`  *(bare)*

**TOP BAR:** progress hidden · wordmark · **back shown**.
**CONTENT** (centered):
```
        🎉                      ← big emoji 54px
   เกือบเสร็จแล้ว!               ← H2
เหลือแค่บอกเราว่าจะส่งผลประเมิน…   ← paragraph
```
**FOOTER:** CTA `ใส่ข้อมูลติดต่อ →`.
**EXIT:** `next()` (no loader) → `contact`.

---

## Screen 14 · `contact`  *(Phase 3 · Next‑gated · TWO questions merged)*

**TOP BAR:** back · Box3 **68%** active.

**CONTENT (two question blocks stacked):**
```
ช่องทางรับผล
เราจะส่งผลให้คุณที่ไหนดี?           ← Q1
ชื่อ–นามสกุล
[ ชื่อของคุณ ........................ ]
เบอร์โทรศัพท์
[ 08X-XXX-XXXX ..................... ]
อีเมล
[ you@email.com ................... ]
✉️ ใช้ส่งผลประเมินและเอกสาร — ไม่สแปม
─────────────────────────────────────
อยากให้ติดต่อกลับทางไหน?            ← Q2 (margin-top 20)
┌────────────────────────────────┐
│ 💬 Add LINE OA  @itinerry…   (○)│
└────────────────────────────────┘
│ 📞 ให้เราโทรกลับ  เลือกช่วงเวลา (○)│  ← data-call="1"
┌────────────────────────────────┐
│ ช่วงเวลาที่สะดวก                  │  ← REVEAL (only when "โทรกลับ")
│ 🌅เช้า  ☀️บ่าย  🌆เย็น            │     time segmented (3 cells)
└────────────────────────────────┘
            [ 🐘 itin_main ]
```
| element | detail |
|---|---|
| Q1 fields | 3 `.field` inputs (text/tel/email) + hint |
| Q2 header | second `<h2.q-label>` (margin‑top 20) |
| channel `.opt` ×2 | LINE OA (line‑green title) · ให้เราโทรกลับ (`data-call="1"`) |
| reveal `#timeReveal` | segmented `🌅 เช้า 9–12 / ☀️ บ่าย 12–15 / 🌆 เย็น 15–18` |
| mascot | centered |

**FOOTER:** CTA `ถัดไป`, **disabled on enter**.
**INTERACTIONS:**
1. Type any of the 3 fields → `validateContact()`.
2. Tap **LINE OA** → select; close time reveal; `validateContact()`.
3. Tap **ให้เราโทรกลับ** → select; **open time reveal**; `validateContact()`.
4. Tap a time slot → select (clear sibling slots); `validateContact()`.
5. `validateContact()`:
   - `okFields` = all 3 contact inputs `.trim().length > 1`.
   - `okChannel` = a channel selected AND (selected channel is NOT `data-call="1"` OR a time slot is selected).
   - `#cta.disabled = !(okFields && okChannel)`.
**GATING:** `Next ⇔ 3 fields filled AND a channel chosen AND (call → a time chosen)`.
**EXIT:** `next()` (no loader) → `found`.
**EDGE CASES:** switching from "โทรกลับ" to "LINE" hides the time reveal and the time requirement drops (CTA may re‑enable). Validation is non‑empty only — add real phone/email rules in production.

---

## Screen 15 · `found`  *(Phase 3 · optional · multi‑select)*

**TOP BAR:** back · Box3 **81%** active.

**CONTENT:**
```
เกือบเสร็จ
รู้จัก itinerry จากช่องไหน?
ช่วยเราพัฒนาบริการ (ไม่บังคับ · เลือกได้หลายข้อ)
┌────────────┐ ┌────────────┐
│ [logo 16:9](○)│ │ [logo 16:9](○)│   ← 2×3 grid of logo tiles
│  Facebook  │ │ Instagram  │       tile = light bg + isometric logo (cover); label below
└────────────┘ └────────────┘
│  TikTok    │ │  Google    │
│ เพื่อนแนะนำ  │ │   อื่นๆ     │
```
| element | detail |
|---|---|
| grid `#foundGrid.found-grid` | 2 cols; cards `.found` = `.found-img` (full‑width, `aspect-ratio 16/9`, `object-fit: cover`, tile bg `#eef1f5`) + `.found-name` + tick `.tk` top‑right |
| images | `assets/icon-iso/logo-iso-{facebook,instagram,tiktok,google,refer,other}-sm.png` |

**FOOTER:** CTA `ถัดไป →` — **always enabled** (optional question).
**INTERACTIONS:** tap a tile → toggle `.sel` (no exclusivity, no auto‑advance). Multiple allowed.
**GATING:** none (always enabled).
**EXIT:** `next()` (no loader) → `summary`.

---

## Screen 16 · `summary`  *(Phase 3 · Next‑gated; loader submit on exit)*

**TOP BAR:** back · Box3 **93%** active.

**CONTENT:**
```
ตรวจสอบก่อนส่ง
สรุปข้อมูลของคุณ
ตรวจความถูกต้องก่อนส่งให้ทีมวีซ่า
┌─────────────────────────────────┐
│ สัญชาติ                    ไทย    │  ← review card: one "k : v" row per answer
│ ประเทศปลายทาง        สหราชอาณาจักร │     dividers between rows; only answered rows show
│ ประเภทวีซ่า              ท่องเที่ยว  │
│ วันเดินทาง       9 ก.ค. – 17 ก.ค. │
│ จำนวนวัน                   8 วัน    │
│ … (more rows) …                  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ [▢] ข้าพเจ้าขอรับรองว่าข้อมูล…    │  ← certify checkbox (glass)
└─────────────────────────────────┘
```
| element | detail |
|---|---|
| review `#summaryList.sum-card` | rows `.sum-row` = `.k` (label, muted, left) + `.v` (value, primary, right) |
| certify `#certBox` | checkbox row (`toggleCert`) |

**ROW ORDER & SOURCE (built by `buildSummary()`, DOM scan):**
| Label | Source (selected element / input) |
|---|---|
| สัญชาติ | `nationality .nat-card.sel .ttl` (main text) |
| ประเทศปลายทาง | `#countryGrid .cc.sel .cc-name b` |
| ประเภทวีซ่า | `#visaList .vopt.sel .ttl` (if "อื่นๆ" + specify → `อื่นๆ: {input}`) |
| วันเดินทาง | `CAL.go.sel – CAL.back.sel` (formatted) |
| จำนวนวัน | `#sumDays` text |
| ประวัติวีซ่า | `#priorChips .chip.sel` labels, comma‑joined |
| อาชีพ | `#occList .occ.sel .ttl` |
| หนังสือรับรองงาน | `empdoc .seg3 .s.sel` (main text) |
| เคยถูกปฏิเสธวีซ่า | `refused .yn .o.sel/.selwarn`; if เคย → `+ (country year)` |
| Overstay | `overstay .yn .o.sel/.selwarn`; if เคย → `+ (detail)` |
| เงินออม | `savings .opt.sel .ttl` |
| ความผูกพันกับไทย | `#tiesList .tie.sel .tie-name`, comma‑joined |
| ชื่อ / เบอร์โทร / อีเมล | `contact .field input[0..2]` values |
| ติดต่อกลับ | `contact .opt.sel .ttl` + time slot small text |
| รู้จักจาก | `#foundGrid .found.sel .found-name`, comma‑joined |
*Rows with empty values are skipped. If nothing was selected → single row "ยังไม่ได้เลือกข้อมูล".*

**FOOTER:** CTA `ส่งแบบประเมิน →`, **disabled on enter**.
**ON ENTER:** `render()` calls `buildSummary()` (re‑scans every screen's selections, so it's always current even after back‑edits); certify unchecked → CTA disabled.
**INTERACTIONS:** tap certify row → toggle `.sel` → `#cta.disabled = !checked`.
**GATING:** `Submit ⇔ certify checked`.
**EXIT:** Submit → `data-elephant="submit"` → **LOADER 2300ms** ("กำลังส่งแบบประเมิน / ทีมวีซ่ากำลังรับเคสของคุณ…") → `confirm`. *(Production: POST the `answers` object here.)*
**EDGE CASES:** user can `back` to any screen, change an answer, and return — the summary reflects it (re‑scanned on each enter).

---

## Screen 17 · `confirm`  *(bare)*

**TOP BAR:** progress hidden · wordmark · back hidden.
**CONTENT** (centered):
```
        ( ✓ )                    ← success ring (pop animation)
   ส่งแบบประเมินแล้ว!
ทีมวีซ่า itinerry กำลังตรวจเคสของคุณ
และจะติดต่อกลับภายใน 24 ชั่วโมง
┌─────────────────────────────┐
│ ① ทีมวิเคราะห์โอกาสผ่านวีซ่า   │   ← next‑steps card (3 numbered steps)
│ ② เตรียมคำแนะนำ…เฉพาะคุณ     │
│ ③ ติดต่อกลับพร้อมผลประเมิน    │
└─────────────────────────────┘
```
**FOOTER:** primary `💬 Add LINE @itinerry` (LINE green) + ghost `เริ่มประเมินใหม่`.
**INTERACTIONS:**
1. `Add LINE` → (prototype `alert`; production → open LINE OA deep link / QR).
2. `เริ่มประเมินใหม่` → `restart()` → idx 0, clear all `.sel/.selwarn`, render `welcome`.
**EDGE CASES:** the calendar `CAL` object is not reset by `restart()` in the prototype — reset it in production for a clean re‑run.

---

## Appendix · global state at a glance

| Thing | Where it lives (prototype) | Notes for production |
|---|---|---|
| current step | `idx` (int into `flow`) | keep as router state |
| selections | `.sel` / `.selwarn` classes on elements | move to an `answers` object |
| dates | `CAL = {go:{y,m,sel}, back:{y,m,sel}}` | keep, reset on restart |
| "other visa" text | `#visaOtherInput.value` | into `answers.visaTypeOther` |
| contact + channel + time | input values + `.opt.sel` + `#timeReveal .s.sel` | into `answers.*` |
| summary | re‑derived by DOM scan on enter | render from `answers` instead |
| progress | computed from `idx` + `phaseScreens` | unchanged |

*Generated from v2. Update alongside `itinerry_design_spec.md` when screens change.*
