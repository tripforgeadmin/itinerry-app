---
name: design-to-frontend
description: >-
  Transform itinerry's UX/UI design artifacts in docs/design/ (the prototype HTML,
  itinerry_design_spec.md, itinerry_screens_detail.md, ux-ui/design-system.md,
  styles/tokens.css, and the wireframe PNGs) into production Next.js 16 + Tailwind v4
  frontend — built incrementally in frontend-best-practice order: reconcile the design
  system & tokens first, then shared primitives, then components, then screens, then
  state/service wiring, then verification. Always start with a written as-is↔to-be gap
  analysis and STOP for the user to review between every phase. Use this whenever the
  user wants to implement, build, convert, port, redo, or "turn the design into frontend"
  for the itinerry visa pre-screen UI — whether one screen/flow or the whole questionnaire
  — reconcile existing code (app/q, components/form, store, lib) against the prototype/spec,
  or fix token drift between docs/design/styles/tokens.css and app/globals.css. Trigger even
  if the user only names a screen (welcome, consent, summary, …) or just says "build the UI
  from docs/design" without saying the word "skill".
---

# Design → Frontend (itinerry)

Turn the design folder into real Next.js code **the way a careful frontend team would**:
foundations before features, smallest reusable piece before the screen that uses it, and a
reconciliation of what already exists against what the design asks for — never a blind
rewrite. The user has explicitly asked to build **gradually, in order, with a checkpoint
between each layer**. Honor that. Do not sprint to "the whole thing."

## Why this skill exists (read this first)

A naïve "implement the design" run fails in three predictable ways. This workflow exists to
prevent each one:

1. **Copying the prototype instead of its intent.** The prototype is a single self-contained
   vanilla-JS mock. It uses shortcuts a production app should not (e.g. DOM-scanning to build
   the summary). The spec itself flags these and names the production approach. Build the
   *intent*, not the mock's implementation.
2. **Building screens before foundations.** Tokens and primitives are shared by every screen.
   If you build screens first, you bake in ad-hoc colors and one-off components, then fight
   drift forever. Foundations first is not bureaucracy — it's what makes later screens cheap.
3. **Ignoring what's already here.** This app already has a working data-driven form
   (`lib/questions.ts` + `store/formStore.ts` + `components/form/`), real services
   (`lib/supabase.ts`, `lib/line.ts`), and a live token block in `app/globals.css`. The design
   is a *to-be* that must be reconciled against this *as-is*, reusing what fits and migrating
   what doesn't. Decide that explicitly, per the gap analysis — don't discover it mid-build.

## Source-of-truth precedence

When two design files disagree, resolve in this order. State which source you followed when it
matters.

1. **`itinerry_visa_assessment_prototype_v2.html`** — source of truth for **behavior &
   interaction** (gating, auto-advance, loaders, transitions). The `_v2` file supersedes the
   non-v2 prototype.
2. **`itinerry_screens_detail.md`** — source of truth for **per-screen layout, element order,
   GATING booleans, ON ENTER / INTERACTIONS / EXIT / EDGE CASES**. Use this to turn behavior
   into precise component logic.
3. **`itinerry_design_spec.md`** — source of truth for **design intent, tokens, global chrome,
   motion, and the production-vs-prototype guidance** (esp. §9 state & data model). When it
   says "recommended for production," prefer that over the prototype's shortcut.
4. **`docs/design/wireframe/*.png`** — visual reference for proportions/spacing when prose is
   ambiguous. Read the relevant PNG; don't guess.
5. **`docs/design/ux-ui/design-system.md` & `styles/tokens.css`** — token/brand reference.
   ⚠️ `design-system.md` documents the **Astro marketing site** (`src/styles/...`, Sanity CMS),
   **not this Next.js app**. Mine it for token *values & intent*, never for file paths or stack.

> If the user points you at a specific file, that's the lead — but still apply precedence to
> resolve conflicts, and say so.

## Inputs at a glance

| File | Role |
|---|---|
| `docs/design/itinerry_visa_assessment_prototype_v2.html` | Behavior source of truth (vanilla-JS mock) |
| `docs/design/itinerry_screens_detail.md` | Per-screen layout + GATING/INTERACTIONS/EDGE CASES (18 screens) |
| `docs/design/itinerry_design_spec.md` | Intent, tokens, chrome, motion, §9 prod-vs-prototype |
| `docs/design/ux-ui/design-system.md` | Brand/token reference (⚠️ Astro site, not this app) |
| `docs/design/ux-ui/itinerry_design_principles.md`, `itinerry_visa_form_ux_spec.md` | UX rationale & form spec |
| `docs/design/styles/tokens.css`, `global.css` | Design-side `@theme` tokens (compare vs `app/globals.css`) |
| `docs/design/wireframe/01..21.png` | Visual proportions |
| `docs/design/assets/{mascot,flag-countries,icon-iso}/` | Images to wire into `public/` |

For **how to read each file** (what to extract, what to ignore), see
[references/design-docs-guide.md](references/design-docs-guide.md).

## The as-is you build into

itinerry-app is **Next.js 16.2.9 (App Router) · React 19 · Tailwind v4 · Supabase · Zustand ·
framer-motion**. Tokens live in `app/globals.css` (`@theme`). The form is already data-driven.
Before writing code, read [references/as-is-map.md](references/as-is-map.md) — it maps every
relevant directory, the existing patterns to reuse (`@/` alias, `"use client"`, the QUESTIONS
data model, the persisted Zustand store), and the conventions to match.

> **Modified Next.js.** Per `AGENTS.md`, this is **not** stock Next — APIs/conventions may
> differ from training data. Before writing anything that touches routing, rendering, server
> components, or config, read the relevant guide in `node_modules/next/dist/docs/`. Heed
> deprecation notices. This overrides your assumptions.

## The pipeline

Six phases, foundations → features. **After each phase you STOP and hand control back** (see
Checkpoint protocol). Each phase's detailed checklist lives in
[references/phase-playbook.md](references/phase-playbook.md) — read the matching section before
starting that phase. Keep a short `docs/design/IMPLEMENTATION_PLAN.md` as the running ledger so
work survives across sessions and checkpoints.

**Phase 0 — Intake & Gap Analysis (no code yet).**
Read the design docs (per precedence) and the as-is code/DB/services. Produce a written
**as-is ↔ to-be gap report** + a phased plan. Cover: token drift (run
`scripts/token_diff.py`), components that can be reused vs need building vs need migrating,
screens already implemented vs missing, data-model/service deltas (Supabase columns vs the
spec's field map, LINE routing). Recommend **reuse / migrate / build-fresh per item** and let
the user confirm scope before any code. → **STOP.**

**Phase 1 — Design system.**
Make tokens a single source of truth in `app/globals.css`: reconcile the drift the gap report
found, add what's missing (e.g. the `.dark` theme, per-phase progress gradients, glass recipe),
and document typography, spacing, radius, shadow, and motion durations. No components yet —
just the foundation everything else consumes via Tailwind utilities. → **STOP.**

**Phase 2 — Primitives & shared chrome.**
Build the small reusable pieces every screen needs: the glass choice card, sticky CTA / footer,
top bar with the 3 liquid progress boxes, the elephant loader overlay, screen-transition
wrapper, form field primitives. Each consumes Phase-1 tokens only. → **STOP.**

**Phase 3 — Screens.**
Build screens from `itinerry_screens_detail.md`, composing Phase-2 primitives. Translate each
screen's **GATING boolean → enable logic**, **INTERACTIONS → handlers**, **EDGE CASES → guards**.
Default to one logical group per checkpoint (the user may ask for one screen at a time, or a
whole phase of the flow). Don't invent state here — wire to the model decided in Phase 0. → **STOP.**

**Phase 4 — Flow wiring & services.**
Connect navigation/branching (reuse the `nextId` model in `lib/questions.ts`), the persisted
store, progress computation, and the real services (Supabase submit, LINE routing) per the
spec's §9 production approach — not the prototype's DOM-scan. → **STOP.**

**Phase 5 — Verification.**
Verify against the prototype's behavior and the EDGE CASES list: gating, auto-advance vs
Next-gated, loaders at phase transitions, back-navigation state, summary correctness, the
thank-you → LINE handoff. Use the project's run/test tooling. Report what you checked and what
you saw — honestly, with output.

## Checkpoint protocol

The "stop between phases" rule is the heart of this skill. At each STOP:

- **Summarize** what you built/changed (files touched, decisions made, sources followed).
- **Surface decisions & risks** — anything ambiguous, any place you chose intent over the
  prototype, any reuse-vs-migrate call worth a second look.
- **Show how to see it** (the run command, the screen/route) when there's something visual.
- **Name the next phase** and what it will do — then **wait**. Do not roll into the next phase
  unprompted. Update `IMPLEMENTATION_PLAN.md` so the next session can resume cleanly.

Going slowly with checkpoints is the requested behavior, not a limitation. A correct foundation
the user has eyeballed beats a fast full build they have to unwind.

## Critical gotchas

- **`design-system.md` is the Astro marketing site, not this app.** Use it for token values and
  brand intent only — never copy its `src/styles/...` paths, Sanity references, or Astro stack.
- **Prototype shortcuts ≠ production.** The summary is DOM-scanned in the mock; the spec's §9
  says derive it from state. Always prefer the spec's production guidance.
- **Token drift is real.** e.g. `--color-logo-primary-color` (tokens.css) vs `--color-logo-primary`
  (globals.css); the `.dark` theme exists in tokens.css but not yet in globals.css. Reconcile in
  Phase 1; don't let both drift further.
- **Reuse the existing form engine.** `lib/questions.ts` (QUESTIONS + `nextId` branching) and
  `store/formStore.ts` (Zustand + persist) already model the flow. Extend them; don't fork a
  parallel state system.
- **Thai-first, mobile-first, high-anxiety audience.** Keep copy/tone from the spec. Country
  names show TH + EN. Don't drop the reassurance banners / privacy notes — they're load-bearing UX.
- **Modified Next.js.** Read `node_modules/next/dist/docs/` before routing/rendering/config work.

## Where things go

Match the existing layout (full detail in [references/as-is-map.md](references/as-is-map.md)):
`app/` routes · `components/` (with `components/form/` for the questionnaire) · `lib/` for
data & services · `store/` for Zustand · tokens in `app/globals.css` · images in `public/`.
New shared primitives belong in `components/ui/` unless the user prefers otherwise.
