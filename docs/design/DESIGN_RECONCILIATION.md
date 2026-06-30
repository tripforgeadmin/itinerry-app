# itinerry — Design ↔ Source Reconciliation

> **What this is.** The canonical record of how the design in `docs/design/` maps onto the
> **actual** itinerry-app source code: which surfaces follow the design, which are pinned to the
> source code, and the key as-is↔to-be decisions. This is the *project data* layer. The
> `design-to-frontend` skill reads this in its Phase 0 gap analysis so the skill itself can stay a
> general transformation process and not hardcode project specifics.
>
> Keep this file current as decisions are made. It does **not** edit the prototype/spec — those
> stay as the design source of truth; this records how we *apply* them here.

---

## 1. Stack reality

| | As-is (this app) | Note |
|---|---|---|
| Framework | Next.js 16 (App Router, modified — read `node_modules/next/dist/docs/`) | not stock Next |
| UI / styling | React 19 · Tailwind v4 (`@theme` in `app/globals.css`) | tokens live here |
| State | Zustand + `persist` (`store/formStore.ts`) | data-driven form |
| Data / services | Supabase (`lib/supabase.ts`, `supabase/migrations/`), LINE OA (`lib/line.ts`) | |

⚠️ **`docs/design/ux-ui/design-system.md` describes the Astro marketing site** (`src/styles/…`,
Sanity CMS) — **not** this app. Mine it for token values/intent only; never for paths or stack.

---

## 2. As-is locked surfaces — **source code wins, do NOT reskin to the design**

These are working, LINE/Supabase-integrated, and pinned by the product owner. The design's
corresponding screens are **reference-only**. In a build, mark these **as-is locked (keep)**.

| Locked surface | As-is files (keep these) | Design = reference-only |
|---|---|---|
| Entry / "เริ่มประเมิน" landing | `app/page.tsx` → `app/auth/page.tsx` (keep the auth-first entry; do **not** insert the design's welcome screen) | screen 0 `welcome` |
| Auth / LINE login | `app/auth/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/callback/route.ts`, `lib/line.ts` | (design has no auth screen) |
| Final / thank-you page | `app/done/page.tsx` (LINE QR / add-friend, `isFriend` cookie, next steps) | screen 17 `confirm` |
| Top bar — **logo + language toggle only** | the wordmark `components/ItinerryLogo.tsx` + the TH/EN switch (`lang`/`onLangChange` in `components/form/QuestionScreen.tsx`) | design wordmark treatment / restyled language control |

**Top-bar lock is narrow:** only the **wordmark** and the **TH/EN toggle** are locked. The
progress indicator may be reskinned to the design's liquid boxes — but reuse `ItinerryLogo` and
the existing toggle inside any rebuilt top bar rather than re-creating them.

---

## 3. Reskin scope — what the design **does** drive

- **In-flow question screens** — their content (choice cards, per-question layout, copy) per
  `itinerry_screens_detail.md` (Screens 1–16) + the `transition` interstitial.
- **Shared visual foundations** — tokens, glass recipe, cards, motion (spec §2, §3, §10).
- **Top-bar progress visual** — the liquid progress boxes (spec §3/§4), keeping the locked
  logo + toggle.

Everything in §2 above is **out of scope** for the reskin.

---

## 4. Tokens — single source of truth = `app/globals.css`

`app/globals.css` `@theme` is the live source; `docs/design/styles/tokens.css` is the design
copy. Reconcile **into globals.css**. Known drift (re-check with the skill's `token_diff.py`):

- naming: `--color-logo-primary` (app) vs `--color-logo-primary-color` (design)
- value case: `--color-line` `#06c755` (app) vs `#06C755` (design)
- the `.dark {}` theme block exists in the design copy but is **missing** from `app/globals.css`

Renames must not break existing utilities (`text-accent`, `bg-primary`, …); grep for consumers
before renaming, and any change that would alter a **locked surface** must be flagged first.

---

## 5. Flow shape & data model

- **Flow is branching, not linear.** The as-is form is data-driven with per-option `nextId` /
  `defaultNextId` branching in `lib/questions.ts` (entry `FIRST_QUESTION_ID = "q3"`). The design
  prototype is *linear*; the spec frames linear as a simplification. **Decision: keep the
  branching engine**, apply the design's visual/interaction intent on top. Do not fork a parallel
  linear flow or a parallel state system — extend `QUESTIONS` + `store/formStore.ts`.
- **Submission already follows the spec's §9 "production" approach.** `app/api/submit/route.ts`
  posts the `answers` map (with JSONB branch keys) to Supabase after verifying the LINE session;
  the summary should be derived from store state, **not** the prototype's DOM-scan.

### Open items — confirm during Phase 0 of a build (not yet decided)

- **Field map delta:** compare `supabase/migrations/0001_visa_assessments.sql` + the `submit`
  payload against `itinerry_design_spec.md` §9 field map; note any missing/renamed fields.
- **Contact-field ordering:** as-is vs the design's ordering (design collects contact later, with
  consent first) — confirm desired order.
- **Design open items:** anything flagged in spec §11.

---

## 6. How a build should use this doc

1. Read this file first, then run the design-side gap analysis (per the `design-to-frontend`
   skill's Phase 0) to pick up anything not captured here.
2. Treat §2 as **keep / do-not-touch**; treat §3 as the reskin scope.
3. Resolve the §5 open items with the user before wiring data/services.
