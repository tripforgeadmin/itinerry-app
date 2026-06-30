# Reading the design docs

How to extract what you need from each artifact in `docs/design/` — and what to deliberately
ignore. Apply the precedence in SKILL.md when sources disagree.

> **Reference-only for locked surfaces.** Some screens/chrome are pinned to the source code (the
> authoritative list is in `docs/design/DESIGN_RECONCILIATION.md`). For those, read the design
> docs below for context, but **do not implement them over the as-is** — the design is
> reference-only there.

## `itinerry_visa_assessment_prototype_v2.html` — behavior source of truth

A single self-contained vanilla-JS mock. It is the **ground truth for how things behave**, but
its *implementation* is a mock, not a blueprint.

- **Read for:** auto-advance vs Next-gated behavior, loader timing at phase transitions, screen
  transitions (fade + translateY), the exact branching, micro-interactions.
- **Extract, don't copy:** find the `render(id)`, `next()`, `updateProgress()`, gating, and
  branching logic and translate the *behavior* into React + the existing store.
- **Ignore (these are mock shortcuts the spec says to replace):** DOM-scanning to build the
  summary, the fixed `392×848` device frame (production is full-viewport responsive mobile),
  any global mutable state that should become store state.
- The non-`_v2` prototype is superseded — only consult it if `_v2` is silent on something.

## `itinerry_screens_detail.md` — per-screen layout & logic

The most directly actionable file. 18 screens (0 welcome → 17 confirm). Every screen block has a
fixed shape — map each part to code:

| Block | Maps to |
|---|---|
| **TOP BAR** | back-button visibility + the 3 progress boxes' active phase & water-fill % |
| **CONTENT (top→bottom)** | exact vertical element order + spacing (an ASCII wireframe + element table) |
| **FOOTER** | the CTA/hint and its initial enabled/disabled state |
| **ON ENTER** | effect to run when the screen mounts/activates |
| **INTERACTIONS** | numbered user actions → handlers + conditions |
| **GATING** | **the exact boolean that enables the footer CTA** → your `disabled`/validation logic |
| **EXIT** | what advancing does (which loader, next screen) |
| **EDGE CASES** | guards/tests you must not drop (e.g. "returning via back keeps checkbox state") |

The header `## 0. How to read this` defines shared chrome + `render(id)` primitives every screen
reuses — read it once before any screen. "Bare" screens (`welcome`, `transition`, `confirm`)
hide the progress boxes and show the centered wordmark instead.

## `itinerry_design_spec.md` — intent, tokens, production guidance

Sectioned (§1–§11). The high-value sections:

- **§2 Design Tokens** — colors, typography, radius/spacing. Cross-check against `app/globals.css`.
- **§2 Glass recipe** — the frosted-card style shared by all choice/summary cards → a primitive.
- **§3 Global chrome** — top bar, sticky CTA footer, elephant loader overlay.
- **§4 Progress system** — the liquid category boxes + per-phase water gradients.
- **§5 Core interaction patterns** & **§6 Screen flow** — the model behind individual screens.
- **§7 Screen-by-screen** — a terser companion to `screens_detail.md`.
- **§9 State & data model** — has **"Prototype approach (current)" vs "Recommended for
  production."** Always build the production recommendation. This drives Phase 4.
- **§10 Motion & accessibility** — durations/easings + a11y requirements.
- **§11 Implementation notes & open items** — unresolved questions; raise these at a checkpoint.

The doc declares itself framework-agnostic ("rebuildable in React/Vue/Svelte"). It separates
*design intent* from *prototype shortcut* on purpose — respect that separation.

## `ux-ui/design-system.md` — ⚠️ different codebase

Documents the **Astro 6.0 marketing site** (`src/styles/tokens.css`, `src/styles/global.css`,
Sanity CMS, `desktop: 1100px` breakpoint). **Not this Next.js app.**

- **Use for:** authoritative token *values*, color usage intent, typography scale, the
  light-bg/dark-bg mode convention.
- **Never use for:** file paths, the Astro/Sanity stack, or build setup. Mapping its
  `src/styles/...` into this app would be wrong.

## `styles/tokens.css` & `styles/global.css` — design-side tokens

`@theme {}` blocks parallel to `app/globals.css`. Diff them with `scripts/token_diff.py` (see
Phase 0). Notable: `tokens.css` carries a full `.dark` theme and a couple of names that differ
from the app (`--color-logo-primary-color` vs `--color-logo-primary`). Reconcile into
`app/globals.css` as the single source in Phase 1.

## `architecture/itinerry_form_logic_tree.mermaid` — branching

The decision tree for question branching. Cross-check against the `nextId`/`defaultNextId`
wiring in `lib/questions.ts` when reconciling the flow in Phase 0/4.

## `wireframe/01..21.png` & `assets/`

- **Wireframes:** read the relevant PNG when prose is ambiguous about proportion/spacing —
  don't guess. They are not 1:1 numbered to screens; match by content.
- **Assets:** mascot (per visa-type / occupation / obligation), flag-countries, icon-iso
  (social), brand icon. Wire into `public/` and reference per screen. Many have `-cut`/`-sm`
  variants — pick the variant the screen calls for.
