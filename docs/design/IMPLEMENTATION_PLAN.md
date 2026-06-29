# itinerry — Design → Frontend · Implementation Plan

> **Running ledger** for the design-to-frontend reskin (the `design-to-frontend` skill drives this).
> **Authority:** `DESIGN_RECONCILIATION.md` is read first and overrides the raw design.
> **Branch policy:** backend / admin / services **follow `main`** — not edited on `ruth` (this branch
> does frontend/design transformation only).
> **Status:** ✅ Phase 0 · ✅ Phase 1 · ✅ Phase 2 · 🟡 **Phase 3 — Group A (พื้นฐาน q4·q8·q9) ✅ · Group B (เดินทาง q10–q23) ✅ via generic-by-type screens (DateScreen·ChoiceScreen·MultiSelectScreen + DateCalendar). Group C (อาชีพ·คุณสมบัติ·ข้อมูลติดต่อ) next — mostly registration on the generics + bespoke summary/contact.** Dark mode skipped. Temp `app/ui-preview/` to delete before merge.
>
> **Generic screens** (`components/screens/{DateScreen,ChoiceScreen,MultiSelectScreen,SegmentedScreen}.tsx`) render any date/radio/multiCheckbox question from data; bespoke screens (nationality, country, visatype, priorvisas, occupation) override in the registry. Note: design's combined depart+return "dates" screen is kept as separate per-question screens for now (cross-field return>arrival validation deferred to Phase 4).
>
> **Group C progress:** ✅ C1 อาชีพ (q24–q29) · ✅ C2 คุณสมบัติ (q30 refused + q32 overstay via combined Y/N+reveal using `advanceTo` to skip the detail step q31/q33; q34 savings; q35 ties 2-col cards). ScreenProps gained `answers` + `advanceTo`. **Next: C3 ข้อมูลติดต่อ — blocked on 3 decisions:** (1) contact-field ordering — name/phone/email (q3/q5/q6) are early in the as-is flow but the design merges them on a late contact screen; re-sequence or keep? (2) found q7 single-radio (data) vs design multi-select; (3) add the design's bare `transition` interstitial (not in as-is data) or skip. Phase-transition elephant loaders still deferred to Phase 4.
>
> **Phase 3 architecture:** screen registry in `app/q/page.tsx` (`RESKINNED_SCREENS`) routes reskinned ids to presentational screen components (`components/screens/*`) that compose `QuestionShell`; unlisted ids fall back to the legacy `QuestionScreen`, so migration is screen-by-screen and the flow never breaks. Progress fills via `lib/categories.ts` `computeBoxes` (positional Goal-Gradient).
>
> **Locked design decisions (from review):**
> - **Top bar = Logo ON** (two-row: wordmark + TH/EN toggle, then progress boxes).
> - **No section eyebrow** on screens (the progress boxes already show the category).
> - **Footer = `fixed`**, content reserves ~120px bottom padding so cards never hide behind it.
> - **Progress = 5 categories** (was 3): 1 พื้นฐาน (nationality·country·visatype) · 2 เดินทาง (dates·priorvisas) · 3 อาชีพ (occupation·empdoc) · 4 คุณสมบัติ (refused·overstay·savings·ties) · 5 ข้อมูลติดต่อ (contact·found·summary). Elephant loaders stay at the 2 existing points (visatype→dates, occupation→empdoc).
> - **Mascot assets**: use light `-cut`/`-sm` variants into `/public` per screen (not the multi-MB originals).

---

## 0. Scope & approach

Reskin the **in-flow question screens** + **shared visual foundations** + **the top-bar progress
visual** to the design, on top of the **existing data-driven form engine** (`lib/questions.ts` +
`store/formStore.ts` + `app/q/page.tsx`). This is a **reskin, not a rewrite**: the question
content, branching graph, validation, submit route, and Supabase schema already work and are kept.

Foundations → features, with a STOP between phases: **Phase 1** tokens → **Phase 2** primitives →
**Phase 3** screens → **Phase 4** wiring → **Phase 5** verify.

---

## 1. As-is locked surfaces — KEEP (out of reskin scope)

Per `DESIGN_RECONCILIATION.md §2` — source code wins, design = reference-only.

| Locked surface | As-is file(s) | Design (reference-only) |
|---|---|---|
| Entry / "เริ่มประเมิน" | `app/page.tsx` → `app/auth/page.tsx` (auth-first landing: taglines, 3-step card, LINE login) | screen 0 `welcome` — do **not** insert |
| Auth / LINE login | `app/auth/page.tsx`, `app/api/auth/{login,callback}/route.ts`, `lib/line.ts` | — |
| Final / thank-you | `app/done/page.tsx` (LINE QR/add-friend, `isFriend` cookie, next steps) | screen 17 `confirm` |
| Top-bar **logo + TH/EN toggle** | `components/ItinerryLogo.tsx`; `lang`/`onLangChange` in `components/form/QuestionScreen.tsx` | wordmark restyle / any toggle restyle |

⚠️ The top-bar lock is **narrow**: only the wordmark + language toggle. The **progress indicator
itself is in scope** (may become the design's liquid boxes), but must reuse `ItinerryLogo` + the
existing toggle. Backend/admin/Supabase = follow-main, analyzed but not modified here.

---

## 2. Tokens (Phase 1) — reconcile into `app/globals.css`

`token_diff.py`: design vs app each define the same **46 `@theme` tokens**; only 3 differences.
Ripple check (grepped `app/ components/ lib/`): both drifting tokens have **zero utility
consumers** → safe, no locked-surface impact.

| Item | Finding | Proposal |
|---|---|---|
| Logo token name | app `--color-logo-primary` vs design `--color-logo-primary-color` (same `#00c3ff`) | **Keep the app name** (globals.css is authoritative). Fix the design *copy*, not globals.css. No app change. |
| LINE green case | app `#06c755` vs design/spec `#06C755` | Cosmetic (hex case-insensitive). Optional normalize to `#06C755`. |
| `.dark` theme | full `.dark{}` block in design `tokens.css`, **missing** in globals.css | **Add** (append after `@theme`). Purely additive — dormant until a `.dark` ancestor exists. **Confirm dark mode is wanted** (no toggler exists yet) before adding. |
| Glass recipe | spec §2, **not in any file yet** | **Net-new** → introduce as `@theme` tokens (`--glass-bg/-blur/-border/-shadow`) in Phase 1, build the `.glass` primitive in Phase 2. |
| Progress water gradients | Phase1 `#66c1ec→#2b86b5`, Phase2 `#54ccc6→#1f9aa0`, Phase3 `#7ea6f2→#4a63c4` (spec §2) | **Net-new** → add gradient tokens in Phase 1; consumed by the progress primitive in Phase 2. |

Also worth doing in Phase 1: the question UI currently **hardcodes** `#44a8db / #00c3ff / #ffd166 /
#1b3d5c` inline (esp. the yellow CTA on every button) — tokenize so Phase 2 primitives consume
utilities, not literals.

---

## 3. Primitives & components (Phase 2)

| Piece | Verdict | Note |
|---|---|---|
| `lib/questions.ts` (QUESTIONS + branching graph + types) | **Reuse as-is** | content/branching data — don't touch; only consumers change |
| `store/formStore.ts` (Zustand+persist `itinerry-visa-form-v3`) | **Reuse as-is** | history stack + answers map + lineProfile |
| `ItinerryLogo.tsx` | **Reuse as-is (locked)** | inline SVG, token-free brand mark |
| TH/EN language toggle | **Reuse as-is (locked)** | currently inline in QuestionScreen; lift into shared header but keep behavior (`lang` is local `useState`, **not** persisted) |
| `app/q/page.tsx` orchestration (`getNextId`, handleNext/Back, submit→`/api/submit`→`/done`, qIndex) | **Reuse (engine)** | keep logic; only spinner markup/classes are cosmetic |
| `QuestionScreen.tsx` chrome (header row, section line, back bar) | **Migrate/reskin** | extract a shared header; this is the bulk of visual work |
| 8 field-type render blocks (text/email/tel · radio/dropdown · multiCheckbox · date DayPicker · consent) | **Migrate** → per-field components | consume glass card + tokens; preserve `getValidationError`/`isAnswered` behavior |
| Yellow CTA (inline style, repeated) | **Build-fresh** → `Button` primitive | + disabled/hint variants |
| Glass choice card | **Build-fresh** | spec §2 recipe; no consumer exists to break |
| Sticky footer / CTA pill + hint | **Build-fresh** | auto-advance screens show a hint, not a button |
| Top-bar **progress** (3 liquid boxes + water/foam) | **Build-fresh** | replaces the current bespoke `CircularProgress`; reuse logo+toggle |
| Elephant loader overlay | **Build-fresh** | fires on phase-transition exits (see §5) |
| Screen-transition wrapper | **Migrate** | reuse framer-motion fade + `translateY 8→0`, 0.28s |
| `components/form/ProgressBar.tsx` | **Decide** | linear bar, **currently unused** by the q flow — likely delete (verify no importer) |
| Reveal block + exclusive multi-select | **Build-fresh (small)** | max-height reveal; exclusive items (`ไม่เคย`/`ไม่มีข้อใด`) |

Default location for new primitives: `components/ui/`.

---

## 4. Screens (Phase 3) — design ↔ as-is

18 design screens. **Skip 0 + 17 (locked).** Build the in-flow question screens + `transition`.
Gating maps to the existing `isAnswered`/`getValidationError` engine.

| # | Screen | Pattern | Gating (CTA enable) | Exit |
|---|---|---|---|---|
| 0 | welcome | — | — | **LOCKED** → `app/auth/page.tsx` |
| 1 | consent | gated | checkbox checked | → nationality (no loader) |
| 2 | nationality | auto-advance | — | → country |
| 3 | country | auto-advance | — (search + grid) | → visatype |
| 4 | visatype | auto / gated on "อื่นๆ" | specify non-empty (other path) | → dates · **loader phase2** |
| 5 | dates | gated | both dates + days>0 | → priorvisas |
| 6 | priorvisas | gated multi (excl. `ไม่เคย`) | ≥1 chip | → occupation |
| 7 | occupation | auto-advance | — | → empdoc · **loader phase3** |
| 8 | empdoc | auto-advance | — | → refused |
| 9 | refused | gated Y/N (reveal) | an answer chosen | → overstay |
| 10 | overstay | gated Y/N (reveal) | an answer chosen | → savings |
| 11 | savings | auto-advance | — | → ties |
| 12 | ties | gated multi (excl. `ไม่มีข้อใด`) | ≥1 card | → transition |
| 13 | transition | bare (in scope) | — | → contact |
| 14 | contact | gated (2 Qs merged) | 3 fields valid + channel (+time if callback) | → found |
| 15 | found | optional | always enabled | → summary |
| 16 | summary | gated | certify checked | → confirm · **loader submit** |
| 17 | confirm | — | — | **LOCKED** → `app/done/page.tsx` |

Loaders: 3 elephant overlays only — leaving **visatype** (→ "เตรียมคำถามเรื่องการเดินทาง", 2.0s),
leaving **occupation** (→ "เตรียมคำถามชุดสุดท้าย", 2.0s), leaving **summary** (→ submit, 2.3s).
Chrome: drop the prototype's 392×848 device frame → full-viewport mobile, content ~480px max on
larger screens. Reduced-motion: disable wave/fill/elephant.

---

## 5. Flow wiring & services (Phase 4)

- **Navigation/branching:** reuse `getNextId()` (reads fresh answer → option `nextId` → `defaultNextId`);
  entry `FIRST_QUESTION_ID="q3"`; terminal node is consent `q2` (reached last) → submit. **No change.**
- **Progress math:** recompute per-phase fill from the **branching** question set (the spec's fixed
  15/48/82% denominators assume the linear prototype — don't hardcode them).
- **Summary:** derive from `store.answers` (NOT the prototype's DOM-scan).
- **Submit + services:** `app/api/submit/route.ts` → Supabase `visa_assessments` already implements
  spec §9's production approach (answers map + `branch_answers` JSONB + LINE session). **Follow-main —
  not edited on ruth.** Frontend just keeps POSTing the answers map.

---

## 6. Open questions (resolve before the relevant phase)

1. **Dark mode** — add the `.dark` block now (dormant) or skip until a toggle is actually planned?
2. **Contact-field ordering** (`DESIGN_RECONCILIATION §5`) — design merges name/phone/email + channel
   on one late screen (screen 14); as-is collects name/phone/email early (q3/q5/q6) and contact pref
   late (q36/q37). Keep as-is order, or re-sequence to the design? (Affects screen 14 + branching.)
3. **`found` multi-select** — design allows multiple acquisition channels; as-is `source` is a single
   enum (`lead_source`). Keep single, or make multi? (Multi needs a backend column change → goes via
   `main`, not ruth.)
4. **`ProgressBar.tsx`** — confirm it's unused, then delete vs keep.
5. **Prior-visa chip flags** — prototype loads from a CDN (jsDelivr); reuse the local
   `docs/design/assets/flag-countries` set instead (offline-safe). Assets need wiring into `public/`.

> Backend-only notes (follow-main, not for this branch): submit route has no `state` CSRF check; JWT
> dev-fallback secret; stale migration header comment. Flagged for awareness, not action here.

---

## 7. Proposed phased plan

1. **Phase 1 — Design system** (`app/globals.css`): add glass + progress-gradient tokens, tokenize the
   hardcoded literals, and (pending Q1) the `.dark` block. No components. → STOP.
2. **Phase 2 — Primitives** (`components/ui/`): Button, glass card, sticky footer/hint, progress top-bar
   (reusing logo+toggle), elephant loader, transition wrapper, per-field components. → STOP.
3. **Phase 3 — Screens**: reskin screens 1–16 + transition in logical groups (suggest: Phase-1 group
   2–4, Phase-2 group 5–7, Phase-3 group 8–16), each composing Phase-2 primitives. → STOP per group.
4. **Phase 4 — Wiring**: progress math on the branching set, store-derived summary, confirm submit path.
5. **Phase 5 — Verify**: gating, auto-advance vs gated, loaders, back-nav state, summary, →LINE handoff.

**Recommended first build step:** Phase 1 (tokens) — smallest, zero-ripple, unblocks everything.
