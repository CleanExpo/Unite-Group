---
type: wiki
updated: 2026-05-14
---

# CARSI Review — Market Strategist — 2026-05-14

Inputs: [[carsi-discovery-audit-2026-05-14]] + `/Users/phill-mac/pi-seo-workspace/carsi/`.
Brand: [[carsi]] — [[iicrc-content-initiative]] CEC platform, Forest Lake QLD SAB, ANZ ~5,000-learner niche.
Persona: 20+y SaaS GTM (Stripe/Vercel/Pipedrive growth).

---

## 1. Public-facing surface audit

23 top-level public routes under `app/(public)/` + the root `app/page.tsx`. The course catalogue **is** the marketing site — no separate brochureware layer. SEO surface is wide for a 1-engineer team.

| Route | Purpose | Conversion goal | Critical flaws |
|---|---|---|---|
| `/` `app/page.tsx` | Homepage — hero, featured 3 courses, IICRC discipline map, student journey, FAQ | Browse Courses CTA → `/courses` | `dynamic = 'force-dynamic'` (line 54) — every homepage hit is server-rendered against DB; no ISR; the CDN cache that should serve the highest-traffic page is opted out by default. Lighthouse will punish LCP under load. |
| `/courses` `app/(public)/courses/page.tsx` | Catalogue index, discipline filter, search | Click into course → enrol | Same `force-dynamic`. Discipline filter is query-string only — no faceted URLs like `/courses/water-restoration` that would rank per-discipline. ~150 published courses (per WP export) all share one URL. |
| `/courses/[slug]` `app/(public)/courses/[slug]/page.tsx` | Course detail | `EnrolButton` → Stripe checkout | (a) No price visible until `pricing` API resolves client-side (line 65 `useEffect`) — price flashes in after paint. (b) Description body is unsanitised WP HTML with `<h3>Already Purchased This Course?` legacy WordPress login link inline at the top of every imported description (see `data/wordpress-export/courses.json:6`). Live competitive landing pages don't lead with "already purchased". (c) `force-dynamic` again — every detail page is uncached. |
| `/pathways`, `/pathways/[slug]` | Cert-track bundles | Enrol in pathway | Pathway data fetched from upstream backend (`sitemap.ts:65`); if `BACKEND_API_KEY`/`NEXT_PUBLIC_API_URL` is misconfigured, both routes silently return empty. No fallback to local seed (unlike `/courses`). |
| `/industries` + 23 sub-pages | Industry landing pages (aged-care, construction, mining, etc.) | Click through to relevant courses | Strong SEO surface area, but per audit §2 these pages were touched by the type-check failure cluster — and there is no industry→discipline cross-link verified in code. Industry pages are static prose, not course-filtered views. |
| `/pricing` | Plan tiers | Subscribe / start trial | Exists but `/api/lms/subscription/status` is referenced by `EnrolButton.tsx:46` — subscription endpoint not in the audit's 59-route inventory; flag as wired in UI but unverified server-side. |
| `/professional-directory` | NRPG-powered directory | Listing CTA | Hard-coded "Full live listing coming soon." (`page.tsx:193`). Public credibility risk — a public page openly saying it's not done. |
| `/news`, `/research`, `/podcast`, `/youtube`, `/calendar`, `/jobs`, `/ideas`, `/testimonials` | Content surfaces | Newsletter / brand lift | Empty skeletons in audit §8. Eight publicly indexed routes with no content = thin-content SEO penalty risk. |
| `/about`, `/contact`, `/privacy`, `/terms` | Trust / legal | Form submit → contact | `app/api/contact/route.ts` is a no-op (audit §10). Form submissions go to /dev/null. |
| `/submit`, `/submit/[type]`, `/submit/[type]/success` | UGC submission | Submit content | `app/api/submit/route.ts` has no auth and no documented downstream. |
| `/subscribe`, `/subscribe/success` | Newsletter | Email capture | No Resend/SMTP wired (audit §10) — newsletter signups have no destination. |
| `/credentials/[credentialId]` | Public credential view | Verifier confidence | This is the social-proof primitive (a learner shares a CARSI credential URL on LinkedIn → traffic). Good — wired. |
| `/verify/training-record` | Verifier landing | Compliance check | Wired via `ccw-training/verify/route.ts`. |

**Headline read:** the public surface is **bigger than the content actually populating it**. 23 industry pages + 8 thin-content shells (news/research/podcast/youtube/calendar/jobs/ideas/testimonials) + a "coming soon" directory dilute crawl budget and pollute the brand. The catalogue itself is the only conversion-real surface, and its detail pages render with **WordPress legacy HTML** as the primary on-page description.

---

## 2. SEO hygiene

| Check | State | Evidence |
|---|---|---|
| Root metadata (title, description, OG, Twitter, canonical) | **Excellent** | `app/layout.tsx:25-87` — default title template `'%s | CARSI'`, OG image at `/og-image.png` 1200×630, Twitter card `summary_large_image`, `metadataBase`, `alternates.canonical`, 8 IICRC + restoration keywords, `lang="en-AU"`, `locale: 'en_AU'`. |
| Per-route `generateMetadata` | **Partial** | Course detail (`/courses/[slug]/page.tsx:104-161`) generates dynamic title/desc/keywords/OG/Twitter/canonical from DB or WP export — excellent. Catalogue (`app/(public)/courses/page.tsx:20`) generates a fact-derived description. **18 of 23 industry pages have no `generateMetadata` export** (`grep generateMetadata app/(public)/industries/`); they inherit the root title template, so all 23 ship as `Industries | CARSI` variants with no per-industry description override. |
| `sitemap.xml` (`app/sitemap.ts`) | **Wired, has issues** | Lists 32 static URLs + dynamic `/courses/[slug]` + `/pathways/[slug]`. Issues: (a) `dynamic = 'force-dynamic'` on the sitemap itself (line 5) — every Googlebot fetch hits the backend; under outage the sitemap returns static-only and de-indexes the catalogue. (b) Pulls courses via `fetch(${backendUrl}/api/lms/courses?limit=500)` not the local export — if backend is down, sitemap loses 150+ URLs. (c) Eight thin-content routes (`/news`, `/research`, `/podcast`, `/youtube`, `/calendar`, `/jobs`, `/ideas`, `/testimonials`) are **not** in the sitemap — appropriate, but `robots.ts` doesn't disallow them either, so they're still crawlable but unranked. |
| `robots.txt` / `app/robots.ts` | **Wired, redundant** | Two sources of truth: `public/robots.txt` (static, lists Googlebot + 5 AI crawlers, disallows `/admin/`, `/api/`, `/student/`, `/instructor/`) **and** `app/robots.ts` (Next.js dynamic, narrower list — adds `/dashboard/`, `/login`, `/register`, `/forgot-password`). Next.js dynamic robots wins over the static file at request time, so `public/robots.txt` is dead weight but inconsistent (`/dashboard/` only in the dynamic one). |
| JSON-LD structured data | **Strong** | `src/components/seo/JsonLd.tsx` — Organization (EducationalOrganization + LocalBusiness w/ areaServed for all 8 AU states), Website (w/ SearchAction), **Course** (price, duration, teaches, educationalLevel, courseInstance), Breadcrumb, FAQ, Event, JobPosting, Article, NewsArticle, PodcastSeries, VideoObject. Course schema is **rendered on every course detail page** (`app/(public)/courses/[slug]/page.tsx:9` imports `CourseSchema, BreadcrumbSchema`). This is the single biggest SEO asset CARSI has. |
| `llms.txt` | **Wired, stale** | `public/llms.txt` exists — explicitly written for AI crawlers, "Last updated: 2026-03-05" — 70 days old. Mentions 7 disciplines, pricing ($20 entry, $795/yr subscription), industries served. This is the GEO play; needs a quarterly refresh job. |
| `opengraph-image.tsx`, `twitter-image.tsx` | **Wired** | Top-level dynamic OG generation at `app/opengraph-image.tsx` + `app/twitter-image.tsx`. |
| Per-course canonicals | **Wired** | `app/(public)/courses/[slug]/page.tsx:158` — `alternates.canonical: ${siteUrl}/courses/${slug}` per course. |

**SEO hygiene verdict:** the **schema layer is genuinely strong** (matches the brand audit's 2026-03-05 GEO work — `llms.txt` + JSON-LD + AI-crawler robots allow-list). The **on-page layer is weak** — `force-dynamic` everywhere kills caching, industry pages have no per-page metadata, the sitemap doesn't gracefully degrade, and course descriptions are imported WordPress HTML with legacy "Already Purchased? Login Here" links inline at the top of every page (see `data/wordpress-export/courses.json:6`).

---

## 3. Activation funnel

The intended path:

```
/ (home)
  → /courses (catalogue, discipline filter)
    → /courses/[slug] (detail)
      → EnrolButton click
        → if (!user) → /register?next=/courses/[slug]
        → if (user)  → /api/lms/checkout → Stripe Checkout
          → on success: /courses/[slug]/payment-success?session_id=cs_xxx
            → POST /api/lms/enrollments/confirm
              → 3-second countdown → /dashboard/student
                → first lesson?
```

What exists:
- **EnrolButton** (`src/components/lms/EnrolButton.tsx`) — wired live, calls `/api/lms/checkout`, redirects to Stripe.
- **Stripe checkout session** (`src/lib/server/local-course-checkout.ts:67`) — creates `mode: 'payment'`, captures `course_slug` + `student_id` in metadata.
- **Webhook** (`app/api/lms/webhooks/stripe/route.ts`) — verifies signature, listens for `checkout.session.completed`.
- **Confirm endpoint** (`app/api/lms/enrollments/confirm/route.ts`) — finalises enrolment on client return.
- **Payment-success page** (`app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx`) — POSTs to confirm, counts down 3s, redirects to `/dashboard/student`.
- **Resume endpoint** (`app/api/lms/learner/resume/route.ts`) — wired.
- **Onboarding wizard** (`src/components/lms/OnboardingWizard.tsx:424`) — IICRC member number capture, but "SMS reminders — coming soon" label.

What's missing or broken:
- **No first-lesson auto-redirect.** Payment-success drops the learner on `/dashboard/student`, not on the first lesson of the course they just bought. Highest-intent moment of their entire lifecycle — wasted. Should be `/dashboard/courses/[slug]/lessons/[firstLessonId]`.
- **No price on cold-load.** `EnrolButton.tsx:60-72` fetches `/api/lms/courses/[slug]/pricing` in a `useEffect` — anonymous users see fallback `priceAud` prop only if the parent passed one; otherwise the button text resolves async. Stripe-style instant CTAs are the bar; CARSI's flashes.
- **`register` then `checkout` is a 2-redirect detour.** `EnrolButton.tsx:96` sends unauthed users to `/register?next=...`. The competitor pattern (Stripe-Checkout-led, lazy-account-create) is one-click: capture email at Stripe, create the account from the webhook. No friction during purchase intent.
- **Habit loop = none.** There is no email digest, no SMS reminder ("delivery not yet wired for sms" — `prisma/schema.prisma:40`), no streak mechanic in production code, no resume nudge job. Leaderboard + XP exist (`lms/gamification/leaderboard`, `lms/gamification/me/renewal-summary`) but no engagement-loop trigger fires them.
- **No price-discount surfacing on the catalogue.** Discounts resolve only at the `/api/lms/courses/[slug]/pricing` call on the detail page. The catalogue grid shows list price — even when a logged-in learner has a discount waiting.
- **Confirm endpoint has weak auth** (audit §4) — "trust-on-Stripe-reference design" means a guessed `session_id` could trigger enrolment confirmation. Low practical risk because Stripe IDs are long, but it's a soft gate.
- **`contact/route.ts` is a no-op** (audit §10) — every non-purchase top-of-funnel inquiry from `/contact` goes to /dev/null. Pure leak.
- **Newsletter has no destination** (audit §10 — Resend/SMTP not started) — `/subscribe` collects emails with no provider wired.

---

## 4. Analytics wiring

**Status: not wired.**

`grep -rln "gtag\|GoogleAnalytics\|posthog\|plausible\|fbq\|window.dataLayer" app src` returns **0 matches** in instrumentation code (only mentions in `src/lib/design-system/library-registry.ts` and `src/lib/audit/*` — internal tooling, not page-level analytics).

What this means concretely — for each funnel event:

| Event | Fired? | Evidence |
|---|---|---|
| Page view (`/`, `/courses`, `/courses/[slug]`) | **No** | No `gtag`, no `posthog.capture`, no Plausible script, no GTM container in `app/layout.tsx`. |
| Discipline filter clicked | **No** | `CourseSearchBar` + `CourseBrowseProvider` exist as UI components — no analytics call inside them. |
| Enrol button clicked | **No** | `EnrolButton.tsx:81-150` — no `track()` call before `apiClient.post('/api/lms/checkout', ...)`. |
| Stripe checkout started | **No** | `local-course-checkout.ts:67` creates Stripe session — no event dispatched. |
| Stripe webhook `checkout.session.completed` | Server-side only | `app/api/lms/webhooks/stripe/route.ts` processes the event but emits no analytics ping (no `fetch` to a measurement endpoint visible). |
| Enrolment confirmed | **No** | `payment-success/PaymentSuccessClient.tsx:31` POSTs to `/api/lms/enrollments/confirm` — no `gtag('event', 'purchase', ...)` server- or client-side. **No conversion measurement at all.** |
| Lesson started / completed | **No client event** | `lms/lessons/[lessonId]/progress/route.ts` (PATCH) writes to `LmsLessonProgress` table — no fan-out to any analytics pipe. |
| Certificate earned | **No client event** | `lms/enrollments/[enrollmentId]/certificate/route.ts` serves the PDF — no event. |
| NRPG points threshold | Cannot fire | NRPG points integration is "not started" (audit §10). |

There is an `app/api/analytics/metrics/overview/route.ts` route but it's a **proxy** to an upstream backend — `getUpstreamBaseUrl()` (line 6); if the upstream isn't configured, it returns `upstreamNotConfigured()`. It's a consumer of analytics, not a producer.

**Implication:** CARSI cannot answer (1) what % of `/courses/[slug]` viewers enrol, (2) which industry page converts best, (3) which discipline filter has the highest CTR, (4) where the funnel leaks. It cannot run an A/B test. It cannot prove SEO ROI to a board. This is the single biggest market-side blocker — every other recommendation below is unmeasurable without it.

---

## 5. Five market unblockers

Ranked by GTM impact ÷ effort.

### 1. Wire GA4 + PostHog (or Plausible). 4 hours. UNBLOCKS EVERYTHING ELSE.
Add `app/layout.tsx` script injection for GA4 (gtag) + PostHog client. Emit `course_view`, `enrol_click`, `checkout_started` (client-side), and server-side `purchase` from the Stripe webhook (`app/api/lms/webhooks/stripe/route.ts`) to GA4 Measurement Protocol. Without this, the next four items below cannot be measured. **This is the highest-leverage market-side change.**

### 2. Strip WordPress legacy HTML from imported course descriptions. 2 hours.
Every course detail page (`/courses/[slug]`) leads with `<h3>Already Purchased This Course?</h3><p><a href="https://carsi.com.au/courses/...">Access Here</a></p>` (see `data/wordpress-export/courses.json:6`). This is a high-intent visitor's first hero impression — telling them to leave. Add a pre-render sanitiser in `src/lib/wordpress-export-courses.ts` that strips the first `<h3>Already Purchased</h3>` + following `<p>` block. Re-render the catalogue. Immediate conversion lift.

### 3. Redirect post-purchase straight to the first lesson, not `/dashboard/student`. 1 hour.
`PaymentSuccessClient.tsx:20` hard-codes `nextRaw = searchParams.get('next') ?? '/dashboard/student'`. The Stripe success URL builder (`src/lib/checkout-urls.ts`) sets `success_url` — change it to resolve `next = /dashboard/courses/[slug]/lessons/[firstLessonId]` server-side at checkout creation. Highest-intent moment of the entire lifecycle is currently wasted on a generic dashboard.

### 4. Add per-discipline faceted URLs. 1 day.
Catalogue is one page (`/courses`) with `?discipline=WRT`. The high-intent SEO query is *"IICRC WRT course Australia"* — not *"course catalogue"*. Add `/courses/water-restoration`, `/courses/applied-structural-drying`, etc. — 7 URLs, one per IICRC code. Each with its own `generateMetadata`, JSON-LD `CollectionPage` schema, and an H1 like "IICRC Water Restoration Training — Australia". This is where the ~5,000 ANZ learners are actually searching. Today, all that intent funnels to a single page that competes against itself.

### 5. Kill `force-dynamic` on `/`, `/courses`, `/courses/[slug]`, and `app/sitemap.ts`. Move to ISR with 5-minute revalidate. 2 hours.
`dynamic = 'force-dynamic'` appears on the homepage, catalogue, course detail, and sitemap. Every request hits Postgres. LCP under traffic spike will collapse, and crawl budget is wasted re-fetching unchanged HTML. Next 16 + Vercel's incremental cache with `revalidate: 300` would hold the catalogue at edge for 5 minutes and re-validate on demand. The few mutations (new course, new lesson) can call `revalidatePath('/courses')` from the admin route. Saves DB cost, fixes Lighthouse, no UX trade-off for a catalogue that changes 1×/week.

---

## 6. WordPress import pipeline status

What it intends to do: `scripts/wp-migrate.ts` (888 lines) scrapes `carsi.com.au`'s WordPress REST + WooCommerce v3 APIs and writes 9 JSON files to `data/wordpress-export/`: `posts.json`, `pages.json`, `products.json`, `courses.json` (LMS-shaped), `users.json` (WC customers, requires `WC_CONSUMER_KEY`/`WC_CONSUMER_SECRET`), `categories.json`, `tags.json`, `media.json`, `memberships.json`, `url-redirects.json`. It also generates a `wordpress-seed.sql` dump. IICRC discipline tagging is heuristic — maps WP category slugs (`water-restoration`, `carpet-cleaning`, `oct`, etc.) to the 7 IICRC codes (`wp-migrate.ts:45-59`).

What's actually present in `data/wordpress-export/`:
- `carsi.WordPress.2026-04-05.xml.gz` — the WXR export dated 2026-04-05.
- `courses.json` — 9,561 lines, **150 courses** (142 `"status":"published"` + 8 `"status":"draft"`). This is what the live catalogue is reading from (the audit's `/courses` and `/courses/[slug]` both fall back to `loadWpExportCourses()` from `src/lib/wordpress-export-courses.ts`).
- Missing: `posts.json`, `pages.json`, `products.json`, `users.json`, `categories.json`, `tags.json`, `media.json`, `memberships.json`, `url-redirects.json` — none present despite the script's intent.

What is broken:
- **The whole pipeline is blocked behind the `package.json` merge conflict (audit §2).** `npm run build` fails before any seed script can run. The 13 seed scripts (`db:seed-wp-export`, `db:seed-wp-lessons`, `db:seed-air-quality-docx`, etc., audit §1) cannot execute until the conflict is resolved.
- The Prisma generated client at `src/generated/prisma/` is stale (audit §2), so even after resolving the conflict, every seed script that writes IICRC/onboarding/leaderboard columns will type-error.
- WooCommerce consumer key + secret are **committed in plaintext** to `.env.example:1-3` (audit §10) — they look live, not placeholder. Rotate immediately, then move to 1Password.
- `WP_EXPORT_COURSES_PATH` env var is referenced in code but **missing from `.env.example`** (audit §6) — production deploys can't override the path without source changes.
- 13 seed scripts (DOCX, TXT, XLSX parsers for water damage, specialty drying, microbial, marketing-business, WHS/compliance, etc.) were added in the last 12 commits but **none have been run against the current schema** — `git log` shows scripts registered (commit `34153a1`) but no migrations populating these courses.

What's pending:
- Lessons. The `LmsLesson` model exists (audit §3); the `db:seed-wp-lessons` script exists; no evidence the WP-export-derived lesson JSON has been generated or seeded.
- Media. `media.json` not in the export; course thumbnails currently resolve via `normalizePublicAssetUrl` from raw WP URLs — fragile on the old `carsi.com.au` WordPress host.
- URL redirects. `url-redirects.json` not present; the legacy WP permalinks (`/courses/{wp-slug}/`) need 301s to the new Next.js routes or every existing inbound link breaks on cutover.

**Verdict (1 sentence):** The WordPress import pipeline got 150 courses into a JSON checkpoint that the live catalogue is currently serving from, but the full migration — lessons, media, redirects, users, posts, pages, plus 13 unprocessed DOCX/TXT/XLSX seeds — is **stalled behind the `package.json` merge conflict and the stale Prisma client**, with no commits in 28 days.

---

## Report back

**Top 3 conversion-friction issues:**
1. Every course detail page leads its hero with WordPress legacy HTML: `<h3>Already Purchased This Course?</h3><a>Access Here</a>` — instructing the highest-intent visitors to leave.
2. Post-purchase redirect drops learners on a generic `/dashboard/student` page, not on the first lesson of the course they just bought — wasted activation moment.
3. Anonymous `EnrolButton` clicks force a `/register?next=...` detour before checkout; competitors lazy-create the account from the Stripe webhook for a true one-click purchase.

**Top 3 SEO gaps:**
1. **No analytics wired** — no GA4, no PostHog, no conversion tracking; SEO ROI is unmeasurable.
2. **No per-discipline faceted URLs** — all 7 IICRC disciplines compete on one `/courses` page; the high-intent queries ("IICRC WRT course Australia") have no dedicated landing page to rank.
3. **`force-dynamic` on homepage + catalogue + course detail + sitemap** — defeats Vercel's edge cache, hurts LCP, and the sitemap silently empties on backend outage.

**WordPress import pipeline (1 sentence):** Stalled at 150/N courses behind the `package.json` merge conflict — the live catalogue is serving from a JSON snapshot, but lessons/media/redirects/users and 13 DOCX/TXT/XLSX seeds are all blocked from running.

**Recommended next move:** Resolve `package.json` conflict + `prisma generate` (these are §1 and §2 of the discovery audit) FIRST — until those land, nothing else in this review is executable. Then run #1 (wire GA4 + PostHog) before any other change, so the impact of #2-#5 is measurable.

## Cross-refs

[[carsi-discovery-audit-2026-05-14]] · [[carsi-review-technical-architect-2026-05-14]] · [[carsi-review-product-strategist-2026-05-14]] · [[carsi-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[carsi]] · [[iicrc-content-initiative]] · [[dr-nrpg]] · [[pi-ceo-architecture]] · [[research-tangential-2026-05-14]] · [[marketing-brain-system]] · [[feedback-secrets-handling]] · [[feedback-no-slack]] · [[opus-adversary]]
