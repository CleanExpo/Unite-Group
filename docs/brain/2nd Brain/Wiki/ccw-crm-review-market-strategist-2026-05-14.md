---
type: wiki
updated: 2026-05-14
---

# CCW-CRM Review — Market Strategist — 2026-05-14

Reviewer: Market Strategist persona ([[pi-ceo-architecture]] Board). Source audit: [[ccw-crm-discovery-audit-2026-05-14]]. Scope: CCW-CRM is a white-label ERP/CRM for Toby Carstairs at [[ccw]] — not a multi-tenant acquisition product. The public surface exists to (a) give Toby's team and sub-users a credible front door, (b) accept new staff sign-ups into the workspace, (c) hold contact / demo intake for inbound inquiries. Conversion strategy is read through that lens.

## 1. Public-facing surface audit

The audit counted 91 of 223 API routes without auth gates. Most are correct (auth flows, cron, public stats, telemetry stubs). Below is the **user-facing page surface** (`src/app/`), split by intent.

### Marketing / public web (legit unauthed, intentional)

| Route | File | Purpose | Conversion goal | Critical flaws |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` → `MarketingLanding` | Homepage; problem→solution→features→steps→testimonials→FAQ→sign-in card | Drive existing users to `/login`; secondary `/register` | Hero CTA "Start with your team" → `/login` (mismatch — copy implies start fresh, link goes to existing-user sign-in); testimonials labelled "Illustrative quotes…not attributed to specific named customers" — soft proof, soft trust; no embedded contact/demo form despite DemoRequest API + Prisma table existing |
| `/product` | `(marketing-pages)/product` | Long-form product page | Educate → /pricing or /contact | Generic copy ("one operational spine"), no SKU/branch counts, no screenshots-with-real-data |
| `/features` | `(marketing-pages)/features` | Capability deep-dive | Educate → /pricing | OK metadata; no anchored sub-routes for individual capabilities (poor for SEO long-tail) |
| `/how-it-works` | `(marketing-pages)/how-it-works` | Phased rollout pitch | Educate → /contact | No timeline, no $ anchor, no implementation case study |
| `/pricing` | `(marketing-pages)/pricing` | Pricing | Convert → /contact or /register | Metadata says "Packaging aligned to branches, SKUs, integrations" but no actual price points visible in the route description — needs verification but the framing ("scoped honestly") suggests no public prices, which kills self-serve and forces every prospect through a manual sales conversation |
| `/contact` | `(marketing)/contact` | Marketing contact | Convert → email sales | **Broken: `mailto:sales@ccwequipment.com.au`** but site domain is `ccwonline.com.au` and layout JSON-LD declares `sales@ccwonline.com.au` — 3 different email/domain identities; mailto won't deliver. Also: no form, no embedded fields → DemoRequest + ContactSubmission DB tables sit idle |
| `/privacy`, `/terms` | `(marketing-pages)/{privacy,terms}` | Legal | Trust | Fine; standard |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/onboarding` | `(auth)/*` | Auth flows | Activate → /dashboard | `/register` is **open self-serve** (`src/app/api/auth/register/route.ts:34` — `const isFirst = (await countAppUsers()) === 0; const defaultRole = isFirst ? 'owner' : 'admin';`) — anyone who hits the public homepage and clicks "Sign up" gets an `admin` AppUser. For a white-label single-tenant CRM that is a security and commercial leak (see Section 5 unblocker U-1) |
| `/order/[token]` | `(guest)/order/[token]` | Token-gated guest order view | Self-serve order status | OK — token-gated; legitimate B2C surface |
| `/order/new` | `(mobile)/order/new` | Mobile order intake | Capture | Verify whether this is staff-only or genuinely public — currently no auth gate visible |

### Accidentally-unauthed admin / data surfaces (flagged)

The audit flagged the following routes as "no auth gate found, likely unintentional". From a market-conversion standpoint these are not conversion surfaces but they are **brand-damage vectors** — anyone discovering them can scrape competitive intel:

- `api/ccw/products` — proxies a Shopify product feed; **public CCW catalog data exposed** without rate limit. SEO risk if Google indexes it as duplicate of `ccwonline.com.au` Shopify catalog.
- `api/ccw/summary` — business summary.
- `api/dashboard/metrics-stream` — Edge SSE stream of dashboard metrics (no auth).
- `api/inventory-stream` — Edge SSE stream of inventory state (no auth).
- `api/monitoring/{health,metrics,range,alerts}` — internal health metrics.
- `api/autonomy/{health,metrics,anomalies}` — autonomy ops state.
- `api/public/stats` — intentional (used by homepage `LiveStatsBar`); OK but verify what numbers it returns (revenue? order counts?) — these become public competitive intel.

**Top brand-damage public leaks**: `ccw/products`, `ccw/summary`, `inventory-stream`, `dashboard/metrics-stream`, `public/stats`. Triage these in the security review, not here, but flag in P0.

### Duplicated IA (kills SEO + activation)

The audit observed two parallel dashboard trees: top-level (`/inventory/page`, `/products`, `/invoices`, `/workshop/*`) AND nested (`/dashboard/inventory/*`, `/dashboard/operations/*`, `/dashboard/workshop/*`) for the same data domains. For an authed area this is "merely" wasted code; but if any of these mirror routes are crawlable, they become **duplicate content SEO penalties** under the same canonical domain. Verify `middleware.ts` blocks all dashboard mirrors from anonymous traffic.

## 2. SEO hygiene

### Metadata coverage — partial

- **Root `metadata` in `src/app/layout.tsx`** — strong baseline: `metadataBase`, `title.default` + `template`, `description`, 15 `keywords`, `manifest`, `icons`, full `openGraph`, `twitter`, `alternates.canonical`, `robots`, AU geo hints. Solid.
- **Per-page metadata**: `/product`, `/features`, `/how-it-works`, `/pricing`, `/contact`, `/privacy`, `/terms` all export `metadata` with title + description. Homepage `page.tsx` also exports metadata. Good.
- **Missing per-page metadata**: `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`, `(auth)/reset-password`, `(auth)/onboarding` — none export `metadata`. These are public-indexable routes that inherit only the root title template. Low SEO priority (login pages don't need to rank) but `/register` should explicitly carry `robots: { index: false, follow: false }` to keep the open-signup page out of Google.
- **No per-page `openGraph.image`** anywhere — the root `openGraph` has no `images` field. Social shares get no preview image. Low effort fix.
- **JSON-LD**: `Organization` + `WebSite` schemas embedded via `<JsonLd>` in `layout.tsx:127–191`. Good but **`FAQPage` schema is missing** — `LandingFaq` has 6 well-formed Q&A pairs perfect for FAQPage rich snippets; not emitted as structured data.

### Sitemap — **broken**

`src/app/sitemap.ts` is a stale, hand-edited file:
```
BASE_URL = 'https://ccwonline.com.au'
URLs listed: /, /service, /walk-in, /internet, /phone, /faq
```
**Not one of these matches a real Next.js route.** `/` is the only correct entry. `/service`, `/walk-in`, `/internet`, `/phone` look copy-pasted from a telco/utility sitemap template. `/faq` doesn't exist as a top-level route (`LandingFaq` is a section on `/`).

**The real marketing routes** — `/product`, `/features`, `/how-it-works`, `/pricing`, `/contact`, `/privacy`, `/terms` — **are not listed**. Google has no canonical index of the public site. This is the single highest-leverage SEO fix.

### Structured data — partial (see above)

Org + WebSite present. FAQPage missing. No `Product` schema even though Shopify products are surfaced via `api/ccw/products`. No `BreadcrumbList` on inner marketing pages.

### robots.txt — **missing**

No `src/app/robots.ts`, no `public/robots.txt`. Next.js will not auto-generate one. Result: crawlers see no directives; no disallow on `/dashboard/*`, `/api/*`, `/portal/*`, `/supplier/*`, `/playground`, `/design-system`, `/demo*`. **/dashboard, /api, /portal, /supplier, /playground, /design-system, /demo, /demo-live, /demo/i18n must be disallowed** — otherwise Google may try to crawl 155 dashboard pages and 223 API routes, which (a) wastes crawl budget on the real site, (b) potentially indexes private-by-intent pages because there's no `noindex` meta on most of them.

## 3. Activation funnel

The intended path (per homepage CTAs): visit `/` → click "Start with your team" → land on `/login` → … no signup form on that page → click "Don't have an account? Sign up" → `/register` → email+password → workspace assigned → `/dashboard`.

**What's there**
- `/login` page (`(auth)/login/page.tsx`) renders `<LoginForm variant="marketing">` inside `<AuthPageShell>`. Login posts to `/api/auth/login`, JWT pair issued, then `window.location.replace('/dashboard')` to force middleware re-check (`login-form.tsx:65`).
- Homepage embeds a second copy of `<LoginForm>` in the final "Sign in" card section (`marketing-landing.tsx:622–652`) — clever, removes one click.
- `/register` page exists; the registration API issues a JWT and sets session cookies on success, dropping the new user straight into `/dashboard`.

**What's broken**

1. **The hero primary CTA copy lies.** Button text: "Start with your team". Destination: `/login`. A first-time visitor who is NOT yet a CCW staffer hits a login screen and bounces. The correct destination for "start" is `/register`, OR the copy should be "Sign in to continue" + a secondary "New here? Create your workspace" link to `/register`. This is the single biggest activation killer on the page.
2. **Open registration on a single-tenant white-label CRM.** `api/auth/register/route.ts:34` — first-ever signup becomes `owner`; every subsequent signup becomes `admin`. There is no email-domain restriction, no invite-only gate, no workspace selector. Any visitor who finds `/register` and submits an email+password gets `admin` on CCW's production data. This is both a security gap AND an activation problem — Toby's actual staff will be onboarded by him, not by self-serve registration. The register button should likely be removed from the public header, or registration should be invite-only via `/team/invite`.
3. **No demo / contact-to-sales surface.** The Prisma schema has `DemoRequest` + `ContactSubmission` tables. The API has `POST /api/demo-requests` and `POST /api/contact-submissions` accepting anonymous submissions. **Neither has a frontend form.** `/contact` is a `mailto:` link (broken — wrong domain — see Section 5 U-2). The full demo-intake → SubmissionNote → sales-followup loop exists in the DB but has zero entry point on the website.
4. **Time-to-aha is undefined.** A new authed user lands on `/dashboard`. There is no onboarding wizard wired into the post-register redirect path — `/onboarding` exists as a page but `register/route.ts` redirects to `/dashboard` directly. So the first thing a brand-new owner sees is an empty CRM with no customers, no products, no quotes. No "Hello! Let's import your first 10 products" prompt. The autosave/draft-restore feature was just ripped out (audit Section 9 — 6+ form sweep). Combined: a new user sees an empty product table with no guidance.
5. **Login → dashboard hard-reload.** `window.location.replace('/dashboard')` post-login (vs a soft `router.push`) was a deliberate fix to force middleware re-check of the new session cookie. It's the right call for correctness but adds ~600ms of perceived latency vs the alternative. Acceptable but worth noting.

**What's missing**

- No social proof on the login surface (the testimonials are buried at section 6 of the homepage; new visitors who click "Log in" from the header never see them).
- No SSO / Google sign-in. For a B2B distributor's staff, Microsoft 365 or Google Workspace SSO would cut friction dramatically.
- No "magic link" passwordless option — only email+password.
- No mobile-app deep-link or PWA install prompt despite `manifest.json` being present.

## 4. Analytics wiring

**Telemetry plumbing exists but fires nowhere.**

- `src/lib/telemetry.ts` defines a typed `trackTelemetry(event)` helper that POSTs to `/api/telemetry` with a 13-event allowlist (`showroom_visit`, `showroom_product_selected`, `showroom_quote_start`, `showroom_order_created`, etc. — all `showroom_*` events).
- `src/app/api/telemetry/route.ts` accepts those events into an in-memory `buffer[]` (max 200 events). **No persistence, no forward to GA4/PostHog/Segment/Amplitude.** Process restart = data gone.
- `grep -rln "trackTelemetry\|trackEvent" src/` returns **zero call sites in the entire codebase.** The helper is defined and never used. The `/api/telemetry` endpoint will only ever see traffic if something outside the repo calls it.

**No third-party analytics installed**:
- No `@vercel/analytics` in `package.json` or imports.
- No `posthog-js` / `mixpanel` / `amplitude-js` / `segment`.
- No `gtag`, no Google Analytics tag in `layout.tsx`.
- No Plausible, no Fathom.

**What this means for conversion measurement**: there is no instrument that can answer "did the homepage hero CTA convert?" or "what's the funnel drop-off between `/pricing` and `/contact`?" or "how many `/register` signups become DAU at day 7?". The Market Strategist cannot optimise what cannot be measured. Every change to copy, CTA placement, or pricing page is currently shipping blind.

**Server-side events that DO exist**:
- `AgentRun` table tracks agent execution metadata.
- `EmailThread` + `EmailMessage` record customer email conversations.
- POS, order, invoice, payment tables record business events.
But none of these are conversion events — they're transaction events that happen AFTER conversion.

## 5. Five market unblockers

| # | Title | Why | Effort |
|---|---|---|---|
| **U-1** | **Close open self-serve registration; replace with invite-only** | `api/auth/register/route.ts:34` lets any visitor become `admin`. For a single-tenant white-label CRM holding Toby's customer + financial data, this is a critical commercial leak (competitors can sign in and see CCW workflows) and a security risk. Wire `/register` behind a team-invite token (`api/team/invite` already exists) and remove the "Sign up" button from `MarketingHeader`. Keep registration only for invite-token URLs. | S |
| **U-2** | **Rewrite `src/app/sitemap.ts` + add `src/app/robots.ts`** | Current sitemap lists 5 non-existent routes (`/service`, `/walk-in`, `/internet`, `/phone`, `/faq`) and zero real ones. Replace with the 7 actual marketing routes (`/`, `/product`, `/features`, `/how-it-works`, `/pricing`, `/contact`, `/privacy`, `/terms`). Add `robots.ts` that disallows `/dashboard/*`, `/api/*`, `/portal/*`, `/supplier/*`, `/demo`, `/demo-live`, `/playground`, `/design-system`. Highest SEO leverage per engineering hour in the entire codebase. While here: resolve the 3-way domain/email identity drift — site is `ccwonline.com.au`, contact page mailtos `sales@ccwequipment.com.au`, JSON-LD says `sales@ccwonline.com.au`. Pick one and ripgrep-replace. | S |
| **U-3** | **Wire the homepage hero CTA + add a contact form on `/contact`** | "Start with your team" → `/login` is a copy-destination mismatch; change either the copy ("Sign in to continue") or the destination (`/register`-via-invite per U-1, or a new `/contact` form). On `/contact`: replace the broken mailto with a real form that POSTs to `/api/contact-submissions` (the API + Prisma table already exist; only the form is missing). Bonus: add a second form variant POSTing to `/api/demo-requests` for inbound "book a walkthrough" leads. Both feed `SubmissionNote` for sales follow-up — the entire backend is already there. | S |
| **U-4** | **Install one analytics tool + wire trackTelemetry to fire** | Pick one (PostHog self-hosted is the cleanest for B2B funnels and respects Phill's no-ad-spend rule — free tier covers CCW's volume). Add a script to `layout.tsx`, wire `trackTelemetry` to also forward to PostHog (so the existing typed event allowlist becomes the conversion event schema), and instrument 5 critical events: `landing_view`, `cta_click_hero`, `register_submit`, `login_submit`, `contact_form_submit`. Without this, every other optimisation in this list is unmeasurable. | M |
| **U-5** | **Emit `FAQPage` JSON-LD on `/` (and per-marketing-page where Q&A exists)** | `LandingFaq` has 6 well-formed Q&A pairs that map cleanly to the schema.org FAQPage spec. Emitting the structured data unlocks Google FAQ rich results — free organic traffic uplift without writing more content. Use the existing `<JsonLd>` component pattern from `layout.tsx`. Same lift applies to `/pricing` (likely Q&A about packaging) and `/how-it-works` (rollout phase Q&A). Compounds with U-2 once Google can re-crawl the new sitemap. | S |

(Effort: S = ≤1 day, M = 2–4 days)

---

## Top-3 conversion-friction issues

1. **Hero CTA copy↔destination mismatch on `/`** — "Start with your team" sends visitors to `/login`, not a signup or contact path. First-time visitors bounce. Fix in U-3.
2. **`/contact` is a broken mailto with a wrong domain** (`ccwequipment.com.au` vs site domain `ccwonline.com.au`) and there is no form despite both `ContactSubmission` and `DemoRequest` APIs being live in the backend. Inbound interest hits a dead link. Fix in U-3.
3. **Zero analytics instrumentation** (`trackTelemetry` defined, never called; no GA4 / PostHog / Vercel Analytics). Every conversion optimisation is currently shipping blind — we cannot tell if U-1..U-5 actually move the needle. Fix in U-4.

## Top-3 SEO gaps

1. **`sitemap.ts` lists 5 non-existent routes and omits all 7 real marketing routes** — Google has no canonical index of the public site. Critical. Fix in U-2.
2. **No `robots.txt` / `robots.ts`** — no crawl directives at all; dashboard mirrors, API routes, design-system playground, and demo pages are all crawl-eligible. Fix in U-2.
3. **No `FAQPage` JSON-LD** despite a clean 6-item FAQ block on `/` — leaving free rich-result real estate on the table. Fix in U-5.

---

Recommendation to Phill: queue U-1 + U-2 + U-3 as the next CCW-CRM PR — all three are <1 engineer-day total, all three close known-customer credibility gaps (broken mailto, open admin signup, missing sitemap), and U-4 (PostHog wiring) makes everything else measurable. Skip ad spend, skip Slack per [[feedback-no-slack]], do not propose a generic acquisition funnel — the conversion goal for CCW-CRM is **Toby's staff can sign in cleanly, his prospects can reach him through the contact form, and Google can find his marketing pages**. Nothing more.

## Cross-refs

[[ccw-crm-discovery-audit-2026-05-14]] · [[ccw-crm-review-technical-architect-2026-05-14]] · [[ccw-crm-review-product-strategist-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[ccw]] · [[unite-crm]] · [[unite-group-nexus-architecture]] · [[pi-ceo-architecture]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[research-tangential-2026-05-14]] · [[marketing-brain-system]] · [[opus-adversary]]
