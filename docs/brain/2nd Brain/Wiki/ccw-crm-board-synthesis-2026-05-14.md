---
type: wiki
updated: 2026-05-14
---

# CCW-CRM Board Synthesis — 2026-05-14

CEO synthesis of three independent [[pi-ceo-architecture]] Board reviews against the underlying discovery audit. Inputs:

- [[ccw-crm-discovery-audit-2026-05-14]] — base ground truth (557 lines)
- [[ccw-crm-review-technical-architect-2026-05-14]] — 6 P0 / 8 P1 / 5 P2
- [[ccw-crm-review-product-strategist-2026-05-14]] — 18 half-finished features, 10 dead UI elements
- [[ccw-crm-review-market-strategist-2026-05-14]] — 3 conversion gaps, 3 SEO gaps, public-signup admin-promotion bug

Repo: `/Users/phill-mac/pi-seo-workspace/CCW-CRM/`. Tech Lead: Rana Muzamil. **Corrected deadline: Toby Bredhauer returns Mon 18 May 2026 (not 26 May).** Demo window collapsed by 8 days; everything below is re-ranked against Mon 18 May 10:00 AEST.

## 1. CEO headline

CCW-CRM is a prototype mid-pivot wearing an enterprise skin: 223 API routes, 155 page files, 37 Prisma models, but only 3 trivial test files, zero e2e specs, and **`npm run build` / `lint` / `tsc --noEmit` all currently FAIL** because nobody re-ran `prisma generate` after the last three migrations on 2026-05-10 → 2026-05-12 (`ProductLocationStock`, `StockReservation`, `Cin7BomMaster` etc.). 91 of 223 routes have no auth gate — ~30 of those are unintentional, including the `/api/auth/register` endpoint that **auto-promotes every public self-signup to `admin`** (`api/auth/register/route.ts:34`), exposing CCW's production data to anyone who finds the homepage. The `/contact` page mailtos `sales@ccwequipment.com.au` on a site whose canonical domain is `ccwonline.com.au` (3-way identity drift). Zero conversion analytics — `trackTelemetry` is defined and never called. 18 half-finished features, 10 dead UI buttons, 8 entire page-trees (marketplace, marketing, workshop, service-requests, contractors, autonomous, prd, tasks) with no backend at all. **Verdict: NO — CCW-CRM is not shippable to Toby for billing demo by Mon 18 May 10:00 AEST.** The three hard blockers: (1) public signup → admin must be killed before any external link goes live; (2) Stripe is zero-LOC so any "billing demo" must be Xero-only or scoped out; (3) the build is red. Demo-ready in the **scope-reduced "internal ERP" framing** is achievable by Mon 18 May — billing-platform-demo is not.

**Mon 18 May ship target (revised):** Toby sees a green-build, auth-gated, scope-cut CCW workflow demo (quote → order → invoice → Xero) on a feature branch, with the public-signup hole closed and the contact form working. Stripe and customer portal are post-Mon-18.

## 2. P0 — must ship before Mon 18 May 10:00 AEST

Hard cap 8. Listed in execution order. Each P0 traces directly to an unblock for Mon 18 May demo or to a security-catastrophe-already-live.

### P0-1 — Regenerate Prisma client + green the build
- **Action:** `rm -rf node_modules/.prisma && npx prisma generate && npm run check:all`
- **File:line:** ~30 routes under `src/app/api/inventory/*` + `src/app/api/cin7/bom/*` failing on `productLocationStock` / `stockReservation` / `Cin7BomMaster` member resolution. See [[ccw-crm-discovery-audit-2026-05-14]] §2.
- **Owner:** Rana. **Effort:** 15 min (command) + 30 min (re-verify CI).
- **Acceptance:** `npm run check:all` exits 0; `next build` produces `.next/standalone`; Vercel preview deploy goes green.
- **Blast radius if skipped:** Every other P0 is gated by a green build. No deploy possible. Reviewer attribution: Tech Architect P0-1.

### P0-2 — Kill public self-signup admin-promotion bug
- **Action:** Either (a) remove `/api/auth/register` POST entirely and only allow account creation via `/api/team/invite` flow (recommended), or (b) gate `register/route.ts:34` so `isFirst === false` returns 403 and require an invite-token query param validated against `AppUser.passwordReset*` style table.
- **File:line:** `src/app/api/auth/register/route.ts:34` — `const isFirst = (await countAppUsers()) === 0; const defaultRole = isFirst ? 'owner' : 'admin';`
- **Owner:** Rana. **Effort:** 2-3 hours (route change + remove "Sign up" link from `MarketingHeader` + redirect `/register` page to `/login` with note + smoke test invite-flow).
- **Acceptance:** Anonymous POST to `/api/auth/register` (without invite token) returns 403. "Sign up" button removed from homepage header. `/register` page either deleted or 308-redirects to `/login`. Invite flow via `/api/team/invite` produces a working onboarding for a new staffer.
- **Blast radius if skipped:** Anyone who finds the production URL becomes admin on CCW's customer + financial data. Security catastrophe.
- **Reviewer attribution:** Raised by **Market Strategist** (U-1); Tech Architect missed this. Cross-confirmed by Product Strategist Q1 ("schizophrenic SaaS/single-tenant" framing).

### P0-3 — Fix `/contact` mailto + domain identity drift
- **Action:** Replace `mailto:sales@ccwequipment.com.au` with a real form POSTing to `/api/contact-submissions` (the API + Prisma table already exist — only the form is missing). Then ripgrep-replace the 3 email/domain variants down to one: site `ccwonline.com.au`, contact email `sales@ccwonline.com.au`, JSON-LD `sales@ccwonline.com.au`.
- **File:line:** `src/app/(marketing)/contact/page.tsx` (mailto), `src/app/layout.tsx:127-191` (JSON-LD Organization), all `ccwequipment.com.au` references.
- **Owner:** Rana. **Effort:** 2 hours (form component + submit handler + ripgrep + visual QA).
- **Acceptance:** Submitting `/contact` form creates a `ContactSubmission` row visible in `/dashboard/operations/submissions`. Zero `ccwequipment.com.au` references in `src/`.
- **Blast radius if skipped:** Inbound prospects bounce on a dead mailto with the wrong domain — Toby loses every cold lead.
- **Reviewer attribution:** Market Strategist U-3; Product Strategist §1 step B.3.

### P0-4 — Auth-gate the ~30 unintentionally-public routes
- **Action:** Wrap with `requireAuthScope` or `requireSessionUser`. Specifically the highest-risk: `/api/ai/copilot/quote` (burns OpenAI budget unauthenticated — see [[ccw-crm-discovery-audit-2026-05-14]] §4), `/api/ccw/products` + `/api/ccw/summary` (leak Shopify catalog + business data), `/api/inventory-stream` + `/api/dashboard/metrics-stream` (Edge SSE DoS vector), `/api/monitoring/{health,metrics,range,alerts}`, `/api/autonomy/{health,metrics,anomalies}`, all `/api/pos/{locations,terminals,staff,sales-staff}`, `/api/integrations/{cin7,sendgrid,shopify,xero}/{configure,connect,disconnect,status}`, `/api/integrations/diagnostics`, `/api/contacts`, `/api/containers`, `/api/backorders`, `/api/activities/{route,stats}`, `/api/submissions/{statistics,[type]/[id]/notes}`, `/api/orders/[id]/activity`.
- **File:line:** ~30 route files under `src/app/api/*`. Reference list in [[ccw-crm-discovery-audit-2026-05-14]] §4 "Likely unintentional gaps".
- **Owner:** Rana. **Effort:** 4-6 hours (mechanical wrap + smoke test each).
- **Acceptance:** `scripts/verify-route-auth.ts` (new) greps every `src/app/api/**/route.ts` and confirms count of authed routes drops from 132 → ~162 (i.e., ~30 newly gated, 61 legit-public remaining). Public-by-design allowlist documented in the script.
- **Blast radius if skipped:** Cost (OpenAI), data exposure (competitive intel via `/ccw/products`), config tampering (OAuth secrets via `/integrations/*/configure`).
- **Reviewer attribution:** Tech Architect P0-4; Market Strategist §1 ("Brand-damage public leaks").

### P0-5 — Scope-cut delete sweep: remove 8 dead page-trees + their UI references
- **Action:** Delete the following page-trees + sidebar links + any `/api/*` calls into them: `/(dashboard)/marketplace/*`, `/(dashboard)/marketing/*`, `/(dashboard)/service-requests`, `/(dashboard)/contractors`, `/(dashboard)/autonomous`, `/(dashboard)/autonomous-dev`, `/(dashboard)/prd/*`, `/(dashboard)/tasks`. Also delete `/(dashboard)/settings/integrations/ap2/page.tsx` + all 10 AP2 stub routes + 5 HeyGen stub routes (gated by Phill Q3 — recommended default = kill).
- **Files:** ~3,000 LOC of orphan UI + 15 stub API routes per [[ccw-crm-review-product-strategist-2026-05-14]] §2 + §6 Q4-Q5.
- **Owner:** Rana. **Effort:** 1 day (careful deletes + sidebar audit + visual QA across remaining pages).
- **Acceptance:** `find src/app/(dashboard) -name page.tsx | wc -l` drops by ~40. Sidebar shows only CCW-workflow surfaces (CRM, inventory, operations, finance, settings). `npm run build` still green.
- **Blast radius if skipped:** Toby's first demo wanders into broken empty pages — credibility shot. Also: these dead trees account for ~40 of the 91 unauthed routes; deleting them reduces P0-4 workload.
- **Reviewer attribution:** Product Strategist top-3 unblocker #3; cross-confirms Tech Architect P0-6 (IA dedup).

### P0-6 — IA dedup: pick canonical dashboard tree, 301 the other
- **Action:** Canonical = `/dashboard/*` (per `next.config.ts:24-100` redirects). Delete the top-level mirror pages (`/inventory/page.tsx`, `/products/page.tsx`, `/invoices/page.tsx`, `/workshop/*`, etc. — most are thin re-exports per [[ccw-crm-review-product-strategist-2026-05-14]] §1). Flip `next.config.ts` redirects from `permanent: false` to `permanent: true`. Update sidebar + quick-actions to use canonical paths only.
- **File:line:** `next.config.ts:24-100`; ~25 mirror page files under `src/app/(dashboard)/{inventory,products,invoices,workshop,...}/`.
- **Owner:** Rana. **Effort:** 4 hours (delete + redirect flip + sidebar audit).
- **Acceptance:** `find src/app -name page.tsx | wc -l` ≤ 90 (currently 155, minus ~40 from P0-5, minus ~25 from this = ~90). Every nav link resolves to a `/dashboard/*` URL without a 307 hop.
- **Blast radius if skipped:** Bug-fix drift, SEO duplicate-content, ~2× bundle bloat.
- **Reviewer attribution:** Tech Architect P0-6; Product Strategist Q2; Market Strategist §1 "Duplicated IA".

### P0-7 — Replace `sitemap.ts` + add `robots.ts`
- **Action:** Rewrite `src/app/sitemap.ts` to list the 7 real marketing routes (`/`, `/product`, `/features`, `/how-it-works`, `/pricing`, `/contact`, `/privacy`, `/terms`) — current file lists 5 non-existent telco-template routes (`/service`, `/walk-in`, `/internet`, `/phone`, `/faq`). Add `src/app/robots.ts` disallowing `/dashboard/*`, `/api/*`, `/portal/*`, `/supplier/*`, `/demo`, `/demo-live`, `/playground`, `/design-system`, `/demo/i18n`. Also add `robots: { index: false }` to `/register` metadata (or delete the page entirely per P0-2).
- **File:line:** `src/app/sitemap.ts` (full rewrite), `src/app/robots.ts` (new).
- **Owner:** Rana. **Effort:** 1 hour.
- **Acceptance:** `curl https://<preview>/sitemap.xml` returns the 7 real routes only. `curl https://<preview>/robots.txt` disallows the 9 paths above.
- **Blast radius if skipped:** Google indexes 155 dashboard pages + 223 API routes (crawl-budget waste + potentially private surfaces). Highest SEO leverage per engineering hour.
- **Reviewer attribution:** Market Strategist U-2.

### P0-8 — Webhook signature validation: implement OR delete
- **Action:** `/api/webhooks/route.ts:14` has a stubbed HMAC check (comment `// Add your signature validation logic here`) — the route currently trusts attacker-controlled `body.event` and writes payloads to logs. Decision: **delete the route entirely** (no provider points at it; if we need webhook intake later we'll add a provider-specific route like `/api/webhooks/stripe`).
- **File:line:** `src/app/api/webhooks/route.ts:1-50`.
- **Owner:** Rana. **Effort:** 30 min (delete + smoke test that nothing in the UI references it).
- **Acceptance:** `find src/app/api/webhooks -name route.ts` returns empty. No `/api/webhooks` references in `src/`.
- **Blast radius if skipped:** Log injection + DoS via unbounded log volume.
- **Reviewer attribution:** Tech Architect P0-2; Product Strategist §2.

**Stripe in v1: GATED on Phill Q2 (see §5).** Default recommendation = NO for Mon 18 May (no time to wire SDK + Checkout Session + webhook + Subscription model + UI in 4 days). If Phill picks YES, Stripe shoves out P0-5 scope-cut and one of P0-6 or P0-7 must slip to P1. Honest call: Toby's billing can demo via existing Xero integration; full SaaS Stripe billing is a Sprint 2 problem.

## 3. P1 — ship this sprint (post Mon 18 May, target Fri 22 May)

Hard cap 12.

### P1-1 — Unify onboarding flows
Delete one of `/(auth)/onboarding/page.tsx` (5-step `OnboardingWizard`) or `/dashboard/settings/welcome` (single-screen). Per [[ccw-crm-review-product-strategist-2026-05-14]] §5: register-form.tsx:61 redirects to `/settings/welcome` but the proper wizard at `/onboarding` is never reached. Recommend: **keep `/onboarding` wizard**, change `register-form.tsx:61` to redirect there, delete `/settings/welcome`. Effort: 4 hours. Owner: Rana.

### P1-2 — Wire customer portal backend (`/api/portal/*`)
Highest product ROI for CCW per [[ccw-crm-review-product-strategist-2026-05-14]] §2: 5 polished pages exist (`/portal/{,orders,invoices,certifications,service}`) all calling 5 GET routes + 1 POST that don't exist. Models already in Prisma (`Customer`, `Order`, `Invoice`). Effort: 1 week. Owner: Rana + senior-agent assist.

### P1-3 — Login rate-limit + lockout
`src/app/api/auth/login/route.ts:14-46` has no throttling. Add `AppUserLoginAttempt(email, ip, ts, success)` model, deny logins >5 fails in 15min per email-or-IP. Effort: 4 hours. Owner: Rana.

### P1-4 — Money fields `Float` → `Decimal @db.Decimal(14,4)`
`prisma/schema.prisma:77, 262, 296, 336, 457-460, 481, 499-501, 553-555, 649-650, 670` — every monetary column is `Float`. BAS reports under `/api/invoices/reports/bas` will drift. Migrate via `USING column::numeric(14,4)`. Effort: 1 day (migration + read-site updates). Owner: Rana. **ATO consequence risk — this is closer to P0 than its position suggests; gated only because the build must go green first.**

### P1-5 — POS terminals/locations/staff: in-memory mock → Prisma
`src/lib/pos/mock-store.ts` is process-local; Vercel cold start = data evaporates. Add 3 Prisma models, FK from `PosTransaction`, rewrite 7 routes. Effort: 2 days. Owner: Rana.

### P1-6 — Install PostHog + wire `trackTelemetry` to fire
`src/lib/telemetry.ts` defines `trackTelemetry()` and the 13-event allowlist, but `grep` returns zero call sites. Pick PostHog (self-hosted, no ad spend per Phill's rule), wire 5 events: `landing_view`, `cta_click_hero`, `register_submit` (post-P0-2: now invite-token-flow), `login_submit`, `contact_form_submit`. Effort: 1 day. Owner: Rana. Reviewer: Market Strategist U-4.

### P1-7 — Add `FAQPage` JSON-LD on `/` + per-marketing-page
`LandingFaq` has 6 well-formed Q&A pairs; emit as structured data via existing `<JsonLd>` component pattern from `layout.tsx`. Free organic uplift. Effort: 2 hours. Owner: Rana. Reviewer: Market Strategist U-5.

### P1-8 — Postgres CHECK constraints + indexes
Per Tech Architect §6:
- `ProductLocationStock`: `CHECK (quantity >= 0)`, `CHECK (reserved >= 0)`, `CHECK (reserved <= quantity)`
- `StockReservation`: `CHECK (quantity > 0)`
- `*LineItem`: `CHECK (quantity > 0)`, `CHECK (lineTotal >= 0)`
- `Invoice`: `CHECK (amountPaid >= 0 AND amountPaid <= total)`
- Indexes on `PosTransaction.{terminalId, locationCode, salesStaffId}`, `Order.customerId`, `Quote.customerId`
Effort: 4 hours (raw SQL migration). Owner: Rana.

### P1-9 — Minimum credible test coverage (3 Playwright specs + workspace-isolation integration)
Currently zero e2e specs. Add: (a) auth round-trip (login → me → expired-token rejection), (b) invoice lifecycle (create → mark paid → BAS report GST correct), (c) inventory adjust → reserve → release → stock-take submit. Plus integration test for workspace isolation on 3 read routes. Effort: 2 days. Owner: Rana + senior-agent. Reviewer: Tech Architect §7.

### P1-10 — Fix pricing page CTA + hero CTA copy
`pricing-public-page.tsx:126` → "Get started" links to `/login` (should be `/contact` once P0-3 form lands, or `/register?invite=...` once P0-2 lands). Homepage hero "Start with your team" → `/login` same mismatch. Effort: 1 hour. Owner: Rana. Reviewer: Market Strategist top-3 conversion-friction #1.

### P1-11 — Dead UI cleanup
Wire or remove the 10 dead UI elements per [[ccw-crm-review-product-strategist-2026-05-14]] §3: cancel-transfer (TODO at `transfers/page.tsx:162`), view-order-from-reservation (TODO at `reservations/page.tsx:203`, requires the missing `/dashboard/operations/orders/[id]/page.tsx`), request-customer-link (`settings/mobile/page.tsx:129`). Wire the 3 that map to existing endpoints; remove the rest. Effort: 1 day. Owner: Rana.

### P1-12 — Cron secret comparison: constant-time
14 `api/cron/*` routes use `!==` string compare on `CRON_SECRET`. Centralise as `assertCronAuth(request)` using `crypto.timingSafeEqual` with length guard. Effort: 2 hours. Owner: Rana. Reviewer: Tech Architect P0-5 (downgraded — theoretical risk, Vercel-CRON only).

## 4. P2 — defer

Hard cap 8.

### P2-1 — Phill decision: AP2 + HeyGen kill (already inside P0-5)
If Phill confirms kill in Q3, the work is bundled into P0-5. If Phill picks WIRE, this becomes ~1-2 weeks P2 work.

### P2-2 — Monorepo decision: delete `apps/web/`, `apps/backend/`, `packages/*/`
Recommended (Tech Architect P1-7 + Product Strategist Q1). Gated on Phill Q1. ~30 min of `git rm` once decided.

### P2-3 — Sync `.env.example` with the 23 missing env vars
Per [[ccw-crm-discovery-audit-2026-05-14]] §6. Add `scripts/verify-env.sh` that diffs `process.env.X` references against `.env.example`. Effort: 2 hours.

### P2-4 — Commit `vercel.json` declaring cron schedules + function settings
Currently split between `next.config.ts` and Vercel UI. Effort: 2 hours.

### P2-5 — Remove `SLACK_WEBHOOK_URL` reference
Per [[feedback-no-slack]] — Slack is permanently rejected. `src/app/api/boardroom/cron/route.ts:93` reads `SLACK_WEBHOOK_URL`. Replace `notifyCEO` Slack branch with Telegram per existing Pi-Dev-Ops pattern, OR just `console.error` (Vercel captures). Effort: 1 hour.

### P2-6 — Remove unused deps: `@composio/openai-agents`, `@openai/agents`, `mcp-linear`
Declared in `package.json:35,37,64`; zero imports in `src/`. Saves ~30MB install. Effort: 30 min.

### P2-7 — `eslint-config-next` bump 15.1.0 → ^16.1.0
Pinned to Next 15 while repo on Next 16. 36 lint errors are partially version-skew noise. Effort: 2 hours triage. Reviewer: Tech Architect P1-6.

### P2-8 — Rename `middleware.ts` → `proxy.ts`
Next 16 deprecation warning; Next 17 will remove. Effort: 30 min. Reviewer: Tech Architect P1-8.

## 5. Open questions for Phill — make the calls

Exactly five. Each gates work above.

### Q1 — Monorepo or single-app? **Recommend SINGLE-APP**
- `apps/web/` is empty; `apps/backend/` is an orphan Python skeleton with no `pyproject.toml`; `packages/*/` are empty. There is one real Next.js app at the root.
- **Pick: SINGLE-APP** → P2-2 deletes the scaffolding (~30 min).
- **Pick: MONOREPO** → ~1 week of work to legitimise (`turbo.json`, workspaces, port the Python service). Slips Mon 18 May.
- **Implication if not answered:** Every new file at root deepens the contradiction.

### Q2 — Stripe in v1 (by Mon 18 May)? **Recommend NO**
- **YES** → ~3 days work: install `stripe`, add `Subscription` model, `POST /api/billing/checkout-session` + `POST /api/webhooks/stripe` (HMAC-verified), wire `/settings/billing` page. Forces dropping P0-5 (scope-cut) or P0-7 (sitemap/robots) from the 4-day plan.
- **NO** → Bill via Xero (already wired); delete `/settings/billing` UI + remove `STRIPE_*` placeholders from `.env.example`. Demo to Toby is "the ERP works"; SaaS-style self-serve billing is a Sprint 2 problem.
- **Implication if YES:** see [[stripe-milestone-invoice]] skill — but that skill provisions Stripe for Unite-Group invoicing of *clients*, not for CCW's own Toby-pays-Phill SaaS revenue. Two different Stripe wirings; don't conflate.

### Q3 — HeyGen + AP2 — kill or wire? **Recommend KILL**
- **KILL** → Inside P0-5. Removes 15 stub routes + 2 settings UIs (one of them ~50KB+). Saves auth-gate work in P0-4. Reversible later.
- **WIRE** → ~1 week HeyGen alone. AP2 spec pre-1.0; don't wire regardless.
- **Implication:** Pure cost-of-mental-real-estate decision. CCW is a carpet-cleaning-supplies distributor — neither feature has a business case.

### Q4 — CCW-only ERP or multi-tenant SaaS? **Recommend CCW-ONLY**
- The "schizophrenic" question per [[ccw-crm-review-product-strategist-2026-05-14]] §6 Q1. Code has `AppUser.workspaceId`, multi-tenant scoping, `/settings/billing`, `/pricing` public page — all SaaS-shaped. But Toby is the only customer.
- **CCW-ONLY** → P0-5 deletes billing UI + pricing public page CTAs + public register flow. Aligns with Q2=NO + Q5=invite-only. Cleanest demo story for Toby.
- **MULTI-TENANT SAAS** → Half the SaaS plumbing is missing (Stripe, plan gating, tenant-level config). 4+ weeks to legitimise. CCW is the wrong first paying SaaS tenant (he's an internal stakeholder, not a SaaS buyer).
- **Implication:** This is the deepest architectural question. If CCW-only wins, Q2 and Q5 follow automatically (NO Stripe + invite-only).

### Q5 — Self-register signup — keep or invite-only? **Recommend INVITE-ONLY**
- **INVITE-ONLY** → P0-2 closes the admin-promotion hole. `/api/team/invite` already exists; wire `/register` to consume an invite token. Removes "Sign up" from `MarketingHeader`.
- **KEEP SELF-REGISTER** → Forces the multi-tenant SaaS framing in Q4. Also still must fix the admin-promotion: signups must default to a `pending` role with email-domain verification.
- **Implication:** If Q4 = CCW-ONLY (recommended), this answer is forced INVITE-ONLY. Listing as a separate question because it's the most urgent security vector — Phill should explicitly bless the kill of public signup before Mon 18 May.

## 6. The exact 4-day plan (Wed 14 May → Mon 18 May 10:00 AEST)

Surgical. Test-pass gate per day. Assumes Phill answers Q1=single-app, Q2=NO, Q3=kill, Q4=CCW-only, Q5=invite-only by Wed 14 May EOD.

### Wed 14 May (today) — Build green + security bleed stopped
- **AM:** Phill answers the 5 questions (§5).
- **PM:**
  - P0-1: regenerate Prisma client, green the build. **Gate: `npm run check:all` exits 0; preview deploy green.**
  - P0-2: kill public self-signup; remove "Sign up" from header; 308 `/register` → `/login`. **Gate: anonymous POST to `/api/auth/register` returns 403.**
  - P0-8: delete `/api/webhooks/route.ts`. **Gate: no references to it in `src/`.**
- **EOD:** Build green, security-catastrophe routes neutralised, Telegram ping to Phill: "Day-1 green; admin-signup hole closed."

### Thu 15 May — Scope-cut + auth-gate sweep
- **AM:**
  - P0-5: delete 8 dead page-trees + AP2 UI + HeyGen routes. **Gate: `find src/app/(dashboard) -name page.tsx | wc -l` drops by ~40; `npm run build` still green.**
- **PM:**
  - P0-4: auth-gate the ~30 unintentionally-public routes. Write `scripts/verify-route-auth.ts` as the CI gate. **Gate: untagged-routes count drops to 0; legit-public allowlist documented.**
- **EOD:** Codebase is ~30% smaller, every API surface either authed or explicitly allowlisted. Telegram ping.

### Fri 16 May — IA dedup + SEO + contact form
- **AM:**
  - P0-6: pick canonical `/dashboard/*` tree, delete top-level mirrors, flip redirects to `permanent: true`. **Gate: `find src/app -name page.tsx | wc -l` ≤ 90; every nav resolves without a 307 hop.**
- **PM:**
  - P0-3: real `/contact` form POSTing to `/api/contact-submissions`; ripgrep-replace 3-way domain identity drift. **Gate: submitting the form creates a `ContactSubmission` row visible in dashboard.**
  - P0-7: rewrite `sitemap.ts`; add `robots.ts`. **Gate: `curl /sitemap.xml` returns 7 real routes; `curl /robots.txt` disallows 9 paths.**
- **EOD:** Public surface is honest (1 canonical IA, real sitemap, working contact form, no admin-signup vector). Telegram ping.

### Sat 17 May — Buffer + manual QA + demo dry-run
- **AM:** Manual click-through of the full Toby demo path: marketing landing → contact form → invite-flow signup (via test invite) → onboarding → create quote → convert to order → invoice → Xero sync. Fix anything broken. No new features.
- **PM:** Write a 5-minute Loom of the demo path. Stage the feature branch for Mon 18 May review. Open a PR titled "CCW-CRM: Mon 18 May demo cut" with the 4-day diff summary. Run [[opus-adversary]] on the PR for pre-merge gate.

### Sun 18 May — DO NOT TOUCH PROD
- Reserve for emergency fixes only. Final smoke test 09:00 AEST.

### Mon 18 May 10:00 AEST — Demo to Toby
- Walk Toby through the demo cut. Use the Loom as backup if live demo flakes.
- Frame: "Here's the CCW workflow we're shipping. Stripe billing and customer portal are next sprint."

**Test-pass gates summary:**
- Day 1: `npm run check:all` exits 0.
- Day 2: zero untagged unauthed routes; build still green.
- Day 3: page count ≤ 90; sitemap + robots correct.
- Day 4: full demo path completes manually without errors.

**Slip protocol:** If any day's gate fails by EOD, Telegram-ping Phill (single-shot, not every-cycle per [[feedback-no-repeating-alerts]]) with the specific failing gate and the proposed cut. Don't ship behind a red gate.

## 7. Cross-refs

[[ccw]] · [[ccw-crm-discovery-audit-2026-05-14]] · [[ccw-crm-review-technical-architect-2026-05-14]] · [[ccw-crm-review-product-strategist-2026-05-14]] · [[ccw-crm-review-market-strategist-2026-05-14]] · [[project-ccw-holiday-window]] · [[unite-crm]] · [[unite-group-nexus-architecture]] · [[feedback-no-slack]] · [[feedback-no-repeating-alerts]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-audit-verification]] · [[feedback-model-routing-max-first]] · [[reference-1password-index]] · [[stripe-milestone-invoice]] · [[playbook-client-onboarding-7stage]] · [[operational-priorities-q2-2026]] · [[swot-saas-cluster-2026]] · [[opus-adversary]]
