# itinerry Design System

Token and component reference for the itinerry Astro/React codebase. All content is derived from actual source files — no invented patterns.

---

## Quick Reference

| Item | Value |
|---|---|
| Framework | Astro 6.0 + React 19 + Tailwind CSS v4 |
| Token file | `src/styles/tokens.css` |
| Global CSS | `src/styles/global.css` |
| Custom breakpoint | `desktop: 1100px` (see [Custom Breakpoint](#custom-breakpoint)) |
| Primary font | Plus Jakarta Sans (UI/headings) |
| Thai font | Noto Sans Thai (body text, set globally) |
| CMS | Sanity (schemas in `sanity/schemas/`) |
| Deployment | Vercel (SSR via `@astrojs/vercel`) |

---

## Design Tokens

All tokens are defined in `src/styles/tokens.css` as a Tailwind v4 `@theme {}` block.
They are consumed as standard Tailwind utility classes: `bg-primary`, `text-accent`, `border-accent-light`, etc.
No need to write `var(--color-*)` in component class names — use the utility class directly.

### Color Tokens

#### 1. Primary Blues

| Class suffix | Hex | Usage |
|---|---|---|
| `primary` | `#1b3d5c` | Headings, hero backgrounds, footer, nav text on light bg |
| `primary-mid` | `#2e5573` | Body descriptions, secondary headings, supporting text |

#### 2. Accent Blues

| Class suffix | Hex | Usage |
|---|---|---|
| `accent` | `#44a8db` | Links, interactive borders, step indicators, active states |
| `accent-hover` | `#2b86b5` | Hover state for accent-colored elements |
| `accent-light` | `#d6effa` | Subtle card borders, dividers |
| `accent-bg` | `#f0f8fd` | Light card/tile backgrounds, info sections |
| `accent-subtle` | `#e8f5fc` | Comparison card backgrounds, alternate accent surfaces |

> **Context note:** Components switch between a dark-background mode (`bg-primary`, `bg-dark`) and a light-background mode (`bg-white`, `bg-accent-bg`). On dark backgrounds, text switches to `text-white`, `text-white/80`, and `text-yellow` for CTA links.

#### 3. CTA / Yellow

| Class suffix | Hex | Usage |
|---|---|---|
| `yellow` | `#ffd166` | Primary CTA buttons (LINE contact, pricing actions) |
| `yellow-hover` | `#f5c842` | Hover state for yellow buttons |
| `yellow-strong` | `#ffc533` | Deeper yellow hover (used in CtaSection) |
| `yellow-mid` | `#fed984` | Medium yellow, badge accents |
| `yellow-light` | `#fff8e1` | Tips panel backgrounds (ServiceTips) |

> CTA yellow is reserved for conversion-driving elements only. See [Brand Guidelines](./brand-guidelines.md#cta-yellow).

#### 4. Neutral / Surface

| Class suffix | Hex | Usage |
|---|---|---|
| `card` | `#fdfeff` | Card backgrounds |
| `surface` | `#f8fafc` | Lightest page surface, fade overlays |
| `surface-soft` | `#f3f4f6` | Soft gray sections, dividers |
| `dark` | `#0f172a` | Dark navy (BottomNav, dark section BGs) |
| `muted` | `#64748b` | Primary secondary text, metadata |
| `muted-light` | `#94a3b8` | Lighter secondary text, disabled states |
| `muted-mid` | `#6b7280` | Mid-weight supporting text |
| `muted-dark` | `#475569` | Darker muted text, nav items |
| `slate-dark` | `#334155` | Dark slate, deep supporting text |
| `border` | `#e2e8f0` | Default subtle borders |
| `border-mid` | `#cbd5e1` | Medium weight borders, tab underlines |

#### 5. Status / Feedback

| Class suffix | Hex | Usage |
|---|---|---|
| `red-alert` | `#e32c2c` | Error states, caution flags |
| `success` | `#4ade80` | Success confirmations |
| `success-mid` | `#2d7a5a` | Success body text |
| `success-dark` | `#1a6b47` | Success heading text |
| `success-bg` | `#e6f7f0` | Success info card background |
| `warning` | `#f59e0b` | Warnings, "impact" labels |
| `warning-dark` | `#b8860b` | Dark warning text (category badge: facts) |
| `blue-light` | `#dbeafe` | Blue-100 info card borders |
| `sky-bg` | `#f0f9ff` | Very light sky blue backgrounds |
| `sky-border` | `#bae6fd` | Sky blue borders, hover borders in Header dropdown |

#### 6. Brand / Partner

| Class suffix | Hex | Usage |
|---|---|---|
| `logo-primary-color` | `#00c3ff` | Logo "iti" wordmark, pricing highlight text (e.g. ฿3,499) |
| `line` | `#06C755` | LINE app CTAs only |

#### 7. UI Variety (Tags / Icons / Category Pills)

| Class suffix | Hex | Usage |
|---|---|---|
| `pink` | `#ec4899` | Tab accent — category pill |
| `emerald` | `#10b981` | Tab accent |
| `purple` | `#8b5cf6` | Tab accent |
| `orange` | `#f97316` | Tab accent |
| `mint` | `#a3e0c6` | Light green decorative, success badges |

---

### Typography Tokens

| Token | Value | Usage |
|---|---|---|
| `font-sans` | `"Plus Jakarta Sans", sans-serif` | Headings, nav, button labels, UI text |
| `font-thai` | `"Noto Sans Thai", sans-serif` | Thai body copy (applied globally on `<html>`) |

**Note:** Noto Sans Thai is set globally in `src/layouts/Layout.astro`. Plus Jakarta Sans is loaded via Google Fonts in the same layout's `<head>`. No class name is needed for Thai text — it inherits the global font. Specify `font-[family-name:'Plus_Jakarta_Sans']` only when you need to explicitly force the Latin font inside a Thai-dominant context.

#### Type Scale in Practice

| Level | Context | Classes |
|---|---|---|
| Hero H1 (desktop) | ServiceHero, BlogHero | `text-4xl font-bold text-white` |
| Hero H1 (mobile) | ServiceHero responsive | `text-base font-bold text-white` |
| Section H2 | Standard section header | `text-2xl md:text-3xl font-bold text-primary` |
| Section H2 (embedded) | Inside sidebar/card container | `text-xl md:text-2xl font-bold text-primary` |
| Card H3 | Card title | `text-base font-bold text-primary` |
| Card H3 (mobile) | Card title responsive | `text-xs md:text-base font-bold text-primary` |
| Body | Section descriptions | `text-base text-muted` |
| Body (responsive) | Card body, mobile | `text-xs md:text-base text-muted` |
| Caption / label | Date, badge, metadata | `text-xs text-muted` |
| CTA button | Primary action | `text-xs md:text-base font-bold` |

---

### Border Radius Tokens

| Token | Value | Class | Usage |
|---|---|---|---|
| `radius-card` | `1rem` | `rounded-card` | Cards, individual tile items, info panels |
| `radius-container` | `1.5rem` | `rounded-container` | Outer container wrappers (WhyItinerry, ServiceFAQ, KeyTakeaways) |

Other radius values used in the codebase:
- `rounded-full` — pills only (CTA buttons, badge chips, step number circles)
- `rounded-2xl` — BlogCard, some section cards (pre-token usage, prefer `rounded-card`)
- `rounded-3xl` — CtaSection outer wrapper, some hero containers
- `rounded-xl` — Dropdown items, smaller UI panels

---

### Shadow Token

| Token | Value | Class |
|---|---|---|
| `shadow-card` | `0px 2px 12px 0px rgba(68, 168, 219, 0.1)` | `shadow-card` |

Used on card wrappers (`bg-card border border-accent-light rounded-container shadow-card`).

CTA glow shadow (inline, not a token): `shadow-[0_8px_24px_rgba(255,209,102,0.4)]`

---

### Custom Breakpoint

```css
/* global.css */
@theme {
  --breakpoint-desktop: 1100px;
}
```

**Use `desktop:` prefix for primary layout changes** (e.g. switching from single-column to multi-column). Do **not** use `lg:` (1024px) for layout-critical breakpoints — the project's layout grid is designed around `1100px`.

Use `md:` (768px) for general mobile-to-desktop transitions within components.

---

## Common Patterns

Copy-paste starting points. Every pattern below comes from an actual component file.

### CTA Button (Yellow)

Source: `src/components/CtaSection.tsx` line 67

```
bg-yellow text-primary font-bold
text-xs md:text-base
px-5 md:px-8 py-3
rounded-full
shadow-[0_8px_24px_rgba(255,209,102,0.4)]
hover:bg-yellow-strong hover:shadow-[0_12px_32px_rgba(255,209,102,0.55)] hover:scale-105
transition-all duration-200
```

Sidebar/inline variant (from `src/components/service/BofuCta.tsx`):
```
bg-yellow text-primary font-bold text-sm
px-4 py-4 rounded-xl shadow-md
hover:scale-[1.04] hover:shadow-xl hover:bg-yellow-strong
active:scale-[0.98]
```

---

### Standard Card

Source: `src/components/blog/BlogCard.tsx` (icon variant)

```
bg-white border border-accent-light rounded-2xl p-5
hover:shadow-card transition-shadow
```

---

### Info / USP Tile

Source: `src/components/service/WhyItinerry.tsx` line 26

```
bg-accent-bg rounded-card p-3 md:p-4
flex gap-3 items-start
border border-transparent
hover:scale-[1.02] hover:shadow-lg hover:border-accent/50
transition-all duration-300
```

---

### Card Wrapper (Outer Container)

Source: `src/components/service/WhyItinerry.tsx` line 21

```
bg-card border border-accent-light rounded-container shadow-card
p-4 md:p-8
```

Used by: WhyItinerry, ServiceFAQ, KeyTakeaways, ServiceProcess

---

### Section Container

Source: `src/components/service/WhyItinerry.tsx` line 55

```
w-full px-4 md:px-8 py-3
opacity-0 translate-y-6 transition-all duration-700 ease-out
```

Inner wrapper: `max-w-[1280px] mx-auto`

Larger vertical padding variant: `py-[30px] md:py-[50px]`

---

### Scroll Fade-In Animation

Applied on every major section wrapper. The `data-fade` attribute or `useFadeIn()` hook initialises the animation.

```
opacity-0 translate-y-6 transition-all duration-700 ease-out
```

Activated by `IntersectionObserver` adding `opacity-100 translate-y-0`.
Hook: `src/hooks/useFadeIn.ts`

---

### Tips Panel (Yellow)

Source: `src/components/service/ServiceTips.tsx`

```
bg-yellow-light border border-yellow rounded-card p-4
```

---

### Dark Strip / Banner

Source: `src/components/DidYouKnowStrip.tsx`

```
w-full bg-primary py-5 px-4
```

Pill item inside dark strip:
```
bg-white/10 text-white text-sm px-4 py-2 rounded-full border border-white/15
```

---

### Key Takeaway Item

Source: `src/components/service/KeyTakeaways.tsx`

```
bg-accent-bg border-l-[3px] border-accent rounded-r-lg
px-3 py-2 md:px-4 md:py-3
hover:shadow-lg transition-all duration-300
```

---

## Component Inventory

**81 components total** across 5 domains. All files are under `src/components/`.

The **`embedded` prop** pattern appears on WhyItinerry, ServiceFAQ, ServiceProcess, KeyTakeaways, ServicePricing, and ServiceTips. When `embedded={true}`, the component renders without its outer `<section>` wrapper and adjusts heading sizes — use it when placing inside a sidebar or another layout container.

---

### Root / Shared

| Component | File | Purpose |
|---|---|---|
| `AboutUs` | `AboutUs.tsx` | About Us full-page section with video, team, values |
| `BackToHomeButton` | `BackToHomeButton.tsx` | Yellow pill link back to homepage |
| `BottomNav` | `BottomNav.tsx` | Mobile-only fixed bottom navigation (replaces Header on mobile) |
| `CtaSection` | `CtaSection.tsx` | Reusable dark-bg CTA block. Props: `title?`, `subtitle?`, `buttonText?`, `buttonUrl?` — all optional with Thai defaults |
| `DestinationIndex` | `DestinationIndex.tsx` | Destination grid with country filter. Props: `destinations: DestinationGridItem[]` |
| `Footer` | `Footer.tsx` | Site-wide footer — contact info, LINE QR, DBD badge, legal entity name |
| `Header` | `Header.tsx` | Main top navigation. Prop: `isTransparent?: boolean` — switches between transparent hero overlay and solid scroll state |
| `HomePage` | `HomePage.tsx` | Full homepage composition. Props: `destinations: DestinationGridItem[]` |
| `NotFoundPage` | `NotFoundPage.tsx` | 404 page with animated counter |
| `ReadMore` | `ReadMore.tsx` | Fade-out text expander. Prop: `fadeColor` (CSS color string for bottom gradient) |
| `ShareSocialMedia` | `ShareSocialMedia.tsx` | Social share buttons (LINE, Facebook, copy link) |
| `TracingBeam` | `TracingBeam.tsx` | Animated vertical progress beam for long-form pages |
| `Welcome` | `Welcome.astro` | Default Astro starter page (not used in production routes) |

---

### Blog (17 components)

| Component | File | Purpose |
|---|---|---|
| `BlogArticleHero` | `blog/BlogArticleHero.tsx` | Full-width hero for individual blog articles |
| `BlogAuthorSection` | `blog/BlogAuthorSection.tsx` | Author bio with avatar, name, role, quote |
| `BlogBody` | `blog/BlogBody.tsx` | Renders Sanity Portable Text as React (handles proTip, comparisonTable, templateDownload custom blocks) |
| `BlogCard` | `blog/BlogCard.tsx` | Multi-variant card. `variant`: `standard` (white), `featured` (dark navy), `featured-horizontal` (half-image), `icon` (emoji-led). `compact?: boolean` |
| `BlogCategorySection` | `blog/BlogCategorySection.tsx` | Category-grouped post grid for blog index |
| `BlogCategoryTabs` | `blog/BlogCategoryTabs.tsx` | Tab bar for filtering blog categories |
| `BlogFAQ` | `blog/BlogFAQ.tsx` | Accordion FAQ section for blog articles |
| `BlogHero` | `blog/BlogHero.tsx` | Hero header for blog index. Props: `title?`, `subtitle?` |
| `BlogIndexPage` | `blog/BlogIndexPage.tsx` | Full blog index page layout. Props: `posts: BlogCardData[]`, `didYouKnowFacts?: string[]` |
| `BlogReferences` | `blog/BlogReferences.tsx` | External sources / citations section |
| `BlogSearchResults` | `blog/BlogSearchResults.tsx` | Search results display |
| `BlogSidebar` | `blog/BlogSidebar.tsx` | Sticky desktop sidebar (hidden on mobile). Composes ToC + Share + DestinationInfoCard |
| `BlogTableOfContents` | `blog/BlogTableOfContents.tsx` | Auto-generated ToC from Portable Text headings |
| `CategoryBadge` | `blog/CategoryBadge.tsx` | Category pill badge. Exports `CATEGORY_CONFIG` — the canonical color/label map for all 4 blog categories |
| `DestinationInfoCard` | `blog/DestinationInfoCard.tsx` | Sidebar info card for visa-related blog posts |
| `DidYouKnowStrip` | `blog/DidYouKnowStrip.tsx` | Dark navy fact strip (from `didYouKnowFacts` Sanity field) |
| `RelatedPosts` | `blog/RelatedPosts.tsx` | "อ่านบทความอื่น" related articles section (up to 3) |

**Category config** (source of truth for blog category colors/labels):

```ts
// src/components/blog/CategoryBadge.tsx
{
  'visa-docs':   { label: 'เตรียมเอกสาร',       color: accent,        bg: accent/12%  },
  'visa-info':   { label: 'วีซ่าและสถานทูต',     color: primary,       bg: primary/10% },
  'travel-info': { label: 'ท่องเที่ยว',           color: primary-mid,   bg: primary-mid/10% },
  'facts':       { label: 'เกร็ดน่ารู้',           color: warning-dark,  bg: yellow/25%  },
}
```

---

### Service (16 components)

| Component | File | Purpose | `embedded` prop |
|---|---|---|---|
| `AccordionItem` | `service/AccordionItem.tsx` | Single expandable Q&A row | — |
| `BodySections` | `service/BodySections.tsx` | Renders array of `bodySections` from Sanity | — |
| `BofuCta` | `service/BofuCta.tsx` | Bottom-of-funnel yellow LINE CTA (sidebar) | — |
| `KeyTakeaways` | `service/KeyTakeaways.tsx` | Highlighted key points list | ✓ |
| `PortableTextRenderer` | `service/PortableTextRenderer.tsx` | Converts Sanity Portable Text to JSX | — |
| `ServiceFAQ` | `service/ServiceFAQ.tsx` | Accordion FAQ. Props: `items?`, `embedded?`, `maxWidth?` | ✓ |
| `ServiceHero` | `service/ServiceHero.tsx` | Service page hero. Props: `title`, `subtitle?`, `serviceIcon?`, `heroImageUrl?` | — |
| `ServiceIndex` | `service/ServiceIndex.tsx` | Listing of all services with cards | — |
| `ServicePricing` | `service/ServicePricing.tsx` | Pricing table with 5 layout types (see below) | ✓ |
| `ServiceProcess` | `service/ServiceProcess.tsx` | Step-by-step process flow | ✓ |
| `ServiceReferences` | `service/ServiceReferences.tsx` | External citations/sources | — |
| `ServiceSubNav` | `service/ServiceSubNav.tsx` | Sticky anchor nav with IntersectionObserver active highlighting | — |
| `ServiceTips` | `service/ServiceTips.tsx` | Yellow tips panel | ✓ |
| `ServiceToS` | `service/ServiceToS.tsx` | Terms of Service content from Portable Text | — |
| `TracingBeam` | `service/TracingBeam.tsx` | Animated vertical beam for service process sidebar | — |
| `WhyItinerry` | `service/WhyItinerry.tsx` | USP tile grid ("ทำไมต้องเลือก Itinerry?") | ✓ |

**ServicePricing `pricingType` values:**

| Value | Layout |
|---|---|
| `simple-tiers` | Row list with highlighted tier |
| `matrix-table` | Column-header × row-label grid |
| `affiliate-links` | Partner logo + description cards |
| `flat-rate` | Single price block |
| `custom` | Free-form Portable Text |

---

### Consent / Legal (6 components)

| Component | File | Purpose |
|---|---|---|
| `CookieBanner` | `consent/CookieBanner.tsx` | Bottom cookie consent bar. Props: `onAcceptAll`, `onRejectAll`, `onOpenSettings` |
| `CookieConsent` | `consent/CookieConsent.tsx` | Orchestrator — manages consent state, shows Banner or Modal. Mounted in `Layout.astro` |
| `CookieSettingsModal` | `consent/CookieSettingsModal.tsx` | Granular cookie preference modal |
| `CookiesPolicyPage` | `legal/CookiesPolicyPage.tsx` | Full cookies policy content page |
| `PrivacyPolicyPage` | `legal/PrivacyPolicyPage.tsx` | Privacy policy content page |
| `TermsOfServicePage` | `legal/TermsOfServicePage.tsx` | Terms of service content page |

---

### Visa / Destination (5 components)

| Component | File | Purpose |
|---|---|---|
| `CautionRootCauseSection` | `visa/shared/CautionRootCauseSection.tsx` | Warning/caution items with root cause analysis |
| `DocumentCarousel` | `visa/shared/DocumentCarousel.tsx` | Image carousel for required visa documents |
| `HolidayLocation` | `visa/shared/HolidayLocation.tsx` | Holiday destination display with details |
| `StaticBottom` | `visa/shared/StaticBottom.tsx` | Bottom fixed section for visa pages |
| `StaticTop` | `visa/shared/StaticTop.tsx` | Sticky top nav + overview card for visa pages |

---

## File Structure Reference

```
src/
├── assets/
│   ├── figma/          ← logo SVGs, country flags/photos, service icons, UI icons
│   └── *.png / *.mp4   ← hero videos, feature images
├── components/
│   ├── blog/           ← 17 blog-domain components
│   ├── consent/        ← cookie consent UI (3 components)
│   ├── legal/          ← legal pages (3 components)
│   ├── service/        ← 16 service-domain components
│   ├── visa/shared/    ← 5 visa-domain components
│   └── *.tsx           ← 13 root/shared components
├── hooks/
│   └── useFadeIn.ts    ← IntersectionObserver scroll-fade hook
├── layouts/
│   └── Layout.astro    ← HTML shell: font loading, SEO meta, CookieConsent mount
├── pages/
│   ├── index.astro
│   ├── about.astro
│   ├── blog/index.astro, [category]/index.astro, [category]/[slug].astro
│   ├── service/[slug].astro
│   ├── visa/index.astro, [slug].astro
│   └── (legal pages)
└── styles/
    ├── tokens.css      ← ALL design tokens (single source of truth)
    └── global.css      ← Tailwind import + breakpoint + minor globals
```

---

## Conventions & Caveats

- **`desktop:` vs `md:` vs `lg:`** — Use `desktop:` (1100px) for grid layout shifts (1-col → multi-col). Use `md:` (768px) for intra-component responsive changes (text size, padding). Do NOT use `lg:` (1024px) for layout decisions — the design grid is calibrated for 1100px.

- **Mobile type scale** — Body text inside cards uses `text-xs md:text-base` consistently. This is intentional. Do not "upgrade" mobile to `text-sm` without checking across all card types.

- **LINE URL** — Canonical: `line.me/R/ti/p/@448yxrvh`. This is stored in Sanity per-service and per-visa document. Never hardcode in component files. `CtaSection` falls back to this URL only if Sanity provides none.

- **Thai + Latin text mixing** — `ServiceHero` detects Thai Unicode range `[\u0E00-\u0E7F]` to insert word breaks before Latin segments. Avoid mixing Thai and English in the same heading string unless testing the rendering output.

- **`embedded` prop** — When placing service components inside a sidebar column or another section container, always pass `embedded={true}`. This suppresses the outer `<section>` wrapper and adjusts heading scale. Without it, the component adds its own section padding that doubles up with the parent.

- **`data-fade` attribute** — Sections using `data-fade` are wired to an IntersectionObserver in `Layout.astro` that adds the transition classes. The manual hook version (`useFadeIn`) is used in components that need ref-based control. Both result in the same animation: `opacity-0 translate-y-6` → `opacity-100 translate-y-0`.
