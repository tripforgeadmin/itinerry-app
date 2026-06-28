# The itinerry-app as-is map

What already exists and the conventions to match. Read before writing code so you **reuse**
instead of reinventing. (Verify against the live tree — files move.)

## Stack

| | |
|---|---|
| Framework | **Next.js 16.2.9**, App Router (⚠️ modified — read `node_modules/next/dist/docs/`) |
| UI | **React 19** |
| Styling | **Tailwind v4** via `@theme` in `app/globals.css` + `@tailwindcss/postcss` |
| State | **Zustand 5** with `persist` middleware |
| Animation | **framer-motion 12** |
| Data | **Supabase** (`@supabase/supabase-js`) |
| Auth/LINE | `jose` (JWT), LINE OA integration in `lib/line.ts` |
| Dates | `date-fns`, `react-day-picker` |
| Import alias | `@/` → repo root (e.g. `@/lib/questions`, `@/store/formStore`) |

## Directory map

```
app/
  layout.tsx, page.tsx, globals.css   ← root layout + LIVE @theme token block
  q/page.tsx                          ← the questionnaire flow (as-is implementation)
  done/page.tsx                       ← thank-you
  auth/page.tsx                       ← LINE auth entry
  admin/…                             ← admin dashboard (table, [id] detail, login, StatusUpdater)
  api/
    submit/route.ts                   ← form submission → Supabase
    auth/{login,callback}/route.ts    ← LINE OAuth
    admin/{login,status}/route.ts     ← admin auth + status update
components/
  ItinerryLogo.tsx                    ← wordmark ("iti" in --color-logo-primary)
  form/
    QuestionScreen.tsx (~484 lines)   ← renders one question; framer-motion transitions, validation
    ProgressBar.tsx                   ← progress indicator
lib/
  questions.ts (~681 lines)           ← QUESTIONS data model + types + branching (nextId)
  constants.ts, line.ts, supabase.ts  ← config + services
store/
  formStore.ts                        ← Zustand: history[], answers, lineProfile, persist
proxy.ts                              ← (modified Next.js) request proxy
supabase/                             ← migrations / schema
public/                               ← static assets (target for design assets)
```

## Patterns to reuse (don't fork these)

**The form is data-driven.** `lib/questions.ts` exports `QUESTIONS: Question[]`. A `Question`
carries `id`, `type` (`text|email|tel|radio|dropdown|multiCheckbox|date|consent`), bilingual
`question`/`questionEn`, `options` (each with `value/label/labelEn/emoji/nextId`), `required`,
`defaultNextId`, `allowOtherText`, and section metadata. **Branching is per-option `nextId`
with a `defaultNextId` fallback** — the screen graph in the design maps onto this, not onto
hand-written routing. Add/adjust questions here; the renderer follows.

**State is a persisted Zustand store.** `store/formStore.ts`:
- `history: string[]` — the visited-question stack (drives back navigation; init `[FIRST_QUESTION_ID]`)
- `answers: Record<string,string>` — keyed by question id
- `lineProfile: LineProfile | null`
- actions: `pushQuestion`, `popQuestion`, `setAnswer`, `setLineProfile`, `reset`
- persisted under key `itinerry-visa-form-v3`. Bump the key only on a breaking shape change.

**Component conventions** (see `components/form/QuestionScreen.tsx`):
- `"use client"` at top of interactive components.
- framer-motion `AnimatePresence` + `variants` for enter/center/exit transitions.
- Types imported from `@/lib/questions` and `@/store/formStore`.
- Tailwind utilities derived from tokens (`text-accent`, `bg-primary`, `border-border`) —
  prefer the utility over inline `var(--color-*)`. Inline hex (e.g. `stroke="#44a8db"`) exists
  in spots and is a candidate to tokenize during migration.
- Validation lives in helpers like `getValidationError(question, value)`.
- Bilingual: a `Lang = "th" | "en"` toggle is threaded through props.

**Services.** Submission → `app/api/submit/route.ts` → Supabase (`lib/supabase.ts`). LINE OA
routing/profile → `lib/line.ts` + `app/api/auth/*`. The design's "route to LINE / phone
callback" maps onto these — extend, don't replace.

## Reconciliation pointers (feed the Phase 0 gap report)

- **Tokens:** `app/globals.css` `@theme` is the live source; `docs/design/styles/tokens.css` is
  the design source. They've drifted (naming + missing `.dark`). Diff and reconcile in Phase 1.
- **Screens already built:** the `q/` flow + `QuestionScreen` already implement much of the
  questionnaire. The gap report should compare what's there against `screens_detail.md`'s 18
  screens and the prototype, then recommend reuse / migrate / build-fresh per screen — not a
  blanket rewrite.
- **Data model:** compare the Supabase schema in `supabase/` and the `submit` route payload
  against the spec's §9 field map; note missing/renamed fields.
- **`proxy.ts` & modified Next.js:** anything touching routing/rendering must respect the
  modified framework — confirm against `node_modules/next/dist/docs/` before changing.
