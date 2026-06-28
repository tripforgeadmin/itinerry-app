# Phase playbook

Detailed checklist per phase. Read the matching section before starting that phase. Every phase
ends at a **STOP** (see Checkpoint protocol in SKILL.md). Keep
`docs/design/IMPLEMENTATION_PLAN.md` updated as the running ledger.

---

## Phase 0 — Intake & Gap Analysis (no code)

**Goal:** a shared, written understanding of as-is vs to-be, and an agreed plan. No production
code is written in this phase.

1. **Read to-be** (apply precedence): skim `design_spec` §1–§11, `screens_detail` `## 0` + the
   screens in scope, and the relevant parts of `prototype_v2.html`. Note §9 production guidance
   and §11 open items.
2. **Read as-is** ([as-is-map.md](as-is-map.md)): `app/globals.css`, `lib/questions.ts`,
   `store/formStore.ts`, `components/form/`, the `submit`/auth routes, `supabase/` schema.
3. **Token diff:** run `python3 .claude/skills/design-to-frontend/scripts/token_diff.py`. It
   reports tokens missing/added/changed between `docs/design/styles/tokens.css` and
   `app/globals.css`, and flags the missing `.dark` theme.
4. **Write the gap report** in `IMPLEMENTATION_PLAN.md`:
   - **Tokens:** drift list + reconciliation proposal.
   - **Primitives/components:** for each (glass card, footer CTA, top bar + progress boxes,
     loader, transition wrapper, field types) → *reuse / migrate / build-fresh* + why.
   - **Screens:** table of the 18 screens → *exists & ok / exists-needs-migration / missing*,
     judged against `screens_detail.md`.
   - **Data & services:** Supabase columns + submit payload vs §9 field map; LINE/phone routing.
   - **Open questions:** anything from §11 or genuine ambiguities, phrased as decisions.
5. **Propose the phased plan** (which screens per checkpoint, recommended order).
6. **STOP** — get the user to confirm scope, the reuse/migrate/build calls, and any open
   questions before any code.

---

## Phase 1 — Design system

**Goal:** one source of truth for visual foundations in `app/globals.css`. No components.

1. **Reconcile tokens** per the gap report: align names, add missing values, resolve drift.
2. **Add what screens will need** that isn't there yet: the `.dark` theme block, per-phase
   progress water gradients (Phase 1 `#66c1ec→#2b86b5`, Phase 2 `#54ccc6→#1f9aa0`, Phase 3
   `#7ea6f2→#4a63c4`), and the glass recipe values (from `design_spec` §2).
3. **Document** typography (Plus Jakarta Sans + Noto Sans Thai), radius (`--radius-card`,
   `--radius-container`), `--shadow-card`, and motion durations/easings (§10) as tokens/comments.
4. **Don't break the live app:** existing utilities (`text-accent`, `bg-primary`, …) must keep
   resolving. Renames need a migration note (and ideally a follow-up sweep) — call it out.
5. **STOP** — show the token file + a brief rationale; note any rename that will ripple.

---

## Phase 2 — Primitives & shared chrome

**Goal:** the small reusable pieces every screen composes. Each consumes Phase-1 tokens only —
no screen-specific logic, no hardcoded colors.

Build (default location `components/ui/`, matching existing conventions):
- **Glass choice card** — the frosted card shared by all choice/summary cards (§2 glass recipe).
- **Sticky footer / CTA pill** — yellow primary CTA with enabled/disabled states + hint variant.
- **Top bar + 3 liquid progress boxes** — per-phase active state + animated water fill (§3, §4).
- **Elephant loader overlay** — full-screen friendly loader for phase transitions (§3).
- **Screen transition wrapper** — fade + `translateY 8→0`, ~0.28s, scroll-reset on enter (§0 chrome).
- **Form field primitives** — for each `FieldType` in `lib/questions.ts` (text/email/tel/radio/
  dropdown/multiCheckbox/date/consent), bilingual-aware.

Reuse what exists (`ProgressBar`, parts of `QuestionScreen`) — migrate rather than duplicate.
**STOP** — list primitives built + how to preview them.

---

## Phase 3 — Screens

**Goal:** assemble screens from `screens_detail.md`, composing Phase-2 primitives.

Per screen, translate the fixed blocks (see [design-docs-guide.md](design-docs-guide.md)):
- **CONTENT order** → JSX structure (match the element table top→bottom).
- **GATING boolean** → the CTA `disabled` / validation condition, exactly.
- **ON ENTER** → mount effect. **INTERACTIONS** → handlers. **EXIT** → loader + next-screen.
- **EDGE CASES** → explicit guards (back-nav state, returning-checkbox, auto-advance vs gated).
- **Bare screens** (`welcome`, `transition`, `confirm`) → wordmark chrome, no progress boxes.

Wire data through the existing `QUESTIONS` model + store — don't introduce parallel state.
Default to **one logical group per checkpoint**; the user may request a single screen or a whole
flow-phase. **STOP** after each group.

---

## Phase 4 — Flow wiring & services

**Goal:** the flow runs end-to-end on real state and real services.

1. **Navigation/branching:** drive next-screen from `nextId`/`defaultNextId` in `lib/questions.ts`;
   back-nav from the store's `history` stack.
2. **Progress:** compute the 3-box fill from answered questions per phase (§4) — not a hardcoded %.
3. **Summary:** build from store state (§9 production approach), **not** the prototype's DOM-scan.
4. **Submit:** wire to `app/api/submit/route.ts` → Supabase; reconcile payload with the §9 field
   map (fill gaps surfaced in Phase 0).
5. **Handoff:** thank-you → LINE OA / phone callback via `lib/line.ts` + auth routes.
6. **STOP** — demo the full flow path; list any field-map gaps still open.

---

## Phase 5 — Verification

**Goal:** confirm behavior matches the prototype + spec, honestly.

1. Run the app (project run/test tooling). Walk the flow.
2. Check against EDGE CASES + GATING for each in-scope screen: gating correctness, auto-advance
   vs Next-gated, loaders at phase transitions, back-navigation preserving state, summary
   correctness, thank-you → LINE handoff.
3. Check responsiveness (full-viewport mobile, not the mock's fixed frame) and a11y basics (§10).
4. **Report** what you checked and what you observed — with real output. If something fails, say
   so and show it; don't paper over it.
