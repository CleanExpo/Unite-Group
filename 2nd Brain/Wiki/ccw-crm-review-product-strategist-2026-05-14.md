---
type: wiki
updated: 2026-05-14
---

# CCW-CRM Product Strategist Review — 2026-05-14

Companion to [[ccw-crm-discovery-audit-2026-05-14]]. CCW-CRM = the internal operations spine for [[ccw]] (Toby Carstairs, Sydney). The CRM is NOT a SaaS product; it is one business's ERP. Many "product surfaces" found in code are aspirational SaaS scaffolding, not CCW workflow.

## 1. User journey trace

There are two distinct "users" who matter for CCW:

**A. CCW staff (Toby + team) — the actual operators.**
**B. CCW's wholesale customers (restoration contractors) — the buyers.**

### A. Staff journey

| Step | Code support | Files |
|---|---|---|
| 1. Sign up | Working API + form. Posts to `/api/auth/register`. | `src/components/auth/register-form.tsx`, `src/app/api/auth/register/route.ts` |
| 2. Land in onboarding | **BROKEN.** Register redirects to `/dashboard/settings/welcome` — but there is also a separate 5-step `OnboardingWizard` at `/(auth)/onboarding/page.tsx` that is never reached. Two parallel onboarding flows; only one runs. | `register-form.tsx:61`, `/(auth)/onboarding/page.tsx`, `/(dashboard)/settings/welcome/page.tsx` |
| 3. Create first quote | Working. `/dashboard/operations/quotes?create=1` → POST `/api/quotes`. | `/(dashboard)/dashboard/operations/quotes/page.tsx` |
| 4. Convert quote → order | Working. `/api/quotes/[id]/convert-to-order`. | `src/app/api/quotes/[id]/convert-to-order/route.ts` |
| 5. View order detail | **MISSING PAGE.** `/dashboard/operations/orders/[id]/page.tsx` does not exist — only `[id]/invoice/page.tsx`. `inventory/reservations/page.tsx:203` TODO confirms: "Navigate to order detail page once it exists." | `/(dashboard)/dashboard/operations/orders/[id]/` |
| 6. Fulfil + ship | Partial. `/dashboard/operations/fulfilment` exists, Cin7 fulfilment routes wired. | `src/app/api/cin7/fulfilments/*` |
| 7. Invoice + collect payment | Invoice generation works; **payment collection is fictional** (no Stripe, no AP2 working). | `src/app/api/invoices/*`, AP2 stubs |
| 8. Reorder stock | **BROKEN AT COMPILE.** Auto-reorder + stock-take routes all fail tsc (stale Prisma client per audit §2). | `src/app/api/inventory/*` (87 errors) |

### B. Customer journey (wholesale buyers)

| Step | Code support | Files |
|---|---|---|
| 1. Discover via landing page | Working. | `src/app/page.tsx`, `src/components/landing/*` |
| 2. View pricing | Working UI. **CTA is wrong**: "Get started" button on pricing tiers links to `/login` (not `/register`). | `src/components/landing/pages/pricing-public-page.tsx:126` |
| 3. Sign up / book demo | Demo request form works; signup goes to staff registration (no customer-vs-staff distinction). | `src/app/api/demo-requests/route.ts` |
| 4. Place an order (mobile photo flow) | **Live but isolated.** `/order/new` lets a customer photograph a product and submit → CCW staff approve. Genuinely shipped. | `/(mobile)/order/new/page.tsx`, `src/lib/api/mobile.ts` |
| 5. Approve order via token link | Working. | `/(guest)/order/[token]/page.tsx` |
| 6. Customer portal (orders, invoices, certs, service) | **UI EXISTS, BACKEND DOES NOT.** Portal page calls `/api/portal/profile`, `/api/portal/orders`, `/api/portal/invoices`, `/api/portal/certifications`, `/api/portal/service-requests`. **None of these routes exist** — `find src/app/api -type d -name "portal"` returns empty. Page silently fails (try/catch `// silently ignore — demo mode`). | `/(portal)/portal/*` (5 pages) |
| 7. Reorder | No reorder button on the portal. |  |

**IA duplication note:** the audit's "duplication" between `/inventory/*` and `/dashboard/inventory/*` is actually thin re-exports (`export { default } from '@/app/(dashboard)/inventory/page'`). Both URLs render the same page. Not divergent code — but still confusing IA: which is canonical? Quick-actions link to `/dashboard/operations/*` (the nested versions), the sidebar mostly links to top-level. Pick one tree and 301 the other.

## 2. Half-finished features

| Feature | Lives at | Missing | Time | MVP? |
|---|---|---|---|---|
| **Customer portal** (5 pages: orders/invoices/certs/service/home) | `/(portal)/portal/*` | Entire `/api/portal/*` backend — 5 GET routes + 1 POST. Currently silently swallows errors and shows blank cards. | 1w | **YES for CCW** — its wholesale buyers genuinely need order/invoice self-service. This is the highest-leverage half-finished surface. |
| **Supplier portal** (2 pages) | `/(supplier)/supplier/*` | `/api/supplier-portal/profile`, `/api/supplier-portal/purchase-orders` — directory does not exist. | 1d | Probably yes — CCW manages real suppliers. |
| **Billing surface** | `/(dashboard)/settings/billing/page.tsx` | 7 backend routes called by `billingApi`: `/api/billing/{subscription,subscribe,payment-methods,invoices}`. None exist. No Stripe SDK in `package.json`. | unknown | **NO** — this is SaaS-customer billing for a hypothetical paying tenant. CCW is the only tenant; it doesn't bill itself. Cut. |
| **Marketplace dashboard** | `/(dashboard)/marketplace/page.tsx` (747 lines) | `/api/marketplace/*` — 10 routes called (channels, sync, products, orders). Zero exist. | 2w | Maybe — Shopify is already wired separately. Cut unless Toby wants Amazon/eBay channels. |
| **Marketing campaign generator** | `/(dashboard)/marketing/page.tsx` (627 lines) | `/api/marketing/*` — none exist. | unknown | NO — out of scope for ERP. Cut. |
| **Workshop / equipment service** | `/(dashboard)/workshop/*` + `/dashboard/workshop/*` (6 pages) | `/api/workshop/{equipment,templates,bookings,reminders}` — none exist. | 1w | Maybe — CCW services cleaning equipment. Confirm with Toby (post-26 May). |
| **Service requests / contractors** | `/(dashboard)/service-requests`, `/(dashboard)/contractors` | `/api/service-requests`, `/api/contractors` — none exist. | unknown | NO — looks like leakage from RestoreAssist. Cut. |
| **Autonomous ops** | `/(dashboard)/autonomous`, `/(dashboard)/autonomous-dev` | `/api/autonomous/*` — none exist. `/api/autonomy/*` exists but is different (health/anomalies only). | unknown | NO — Pi-CEO scope creep. Cut. |
| **PRD generator** | `/(dashboard)/prd/{generate,[id]}` | `/api/prd/*` — none exist. | unknown | NO. Cut. |
| **Tasks** | `/(dashboard)/tasks/page.tsx` | `/api/tasks` — does not exist. | unknown | NO unless Toby asks. |
| **Sample data step** in onboarding | `SampleDataStep.tsx:80` | `/api/test-data/generate` — does not exist. Step "succeeds" silently via `.catch(() => undefined)`. | 4h | YES if onboarding is kept. |
| **HeyGen video** | 5 stub routes | All return 501. No `HEYGEN_API_KEY` integration. | 1w | NO — no business case. Cut. |
| **AP2 voice payments** | 10 stub routes + `/settings/integrations/ap2` page (full UI with mandates table, voice session creation) | All 10 backend routes return 501. UI is rich (50KB+ page). | 2-4w | NO — out of scope for CCW MVP. Cut entire `/integrations/ap2` UI + routes. |
| **Anthropic Claude** | UI tile only (`/settings/integrations` shows status) | `@anthropic-ai/sdk` not in `package.json`, no API routes, just a status badge. | 2d to wire one feature | Defer — OpenAI is already wired for quote copilot. |
| **Gemini** | Not started | No code references. | n/a | NO. |
| **Stripe** | Not started; only mentioned in privacy-policy text and SaaS billing page | No SDK, no env, no code path. The pricing-public-page CTAs go to `/login`, not Stripe Checkout. | 2w | NO for CCW (it's not a SaaS). |
| **Cancel transfer** | `/inventory/transfers/page.tsx:162` TODO | One DELETE endpoint. | 4h | YES. |
| **View order from reservation** | `/inventory/reservations/page.tsx:203` TODO | Just need `/dashboard/operations/orders/[id]/page.tsx` (which is also the missing order-detail page from Section 1). | 1d | YES. |
| **Webhook signature validation** | `/api/webhooks/route.ts:14` | Validation logic stubbed in comment. | 2h | YES (security). |
| **Health-check alerting** | `/api/cron/health-check/route.ts:42` | "Send alert to monitoring service". | 2h | YES. |

**Count: ~18 half-finished features.** Of those, only ~6 are in MVP scope for CCW.

## 3. Dead UI elements

- **Pricing page "Get started" CTA** → `/login` instead of `/register`. `pricing-public-page.tsx:126` — Toby's customers can't actually start anything from pricing.
- **"View Order" button in inventory/reservations** → toast that says "Order ID: ..." with no navigation. `reservations/page.tsx:203`.
- **"Cancel" button in inventory/transfers** → toast "Cancel transfer functionality coming soon". `transfers/page.tsx:162`.
- **"Request customer link" in settings/mobile** → toast "feature coming soon". `settings/mobile/page.tsx:129`.
- **Entire `/portal/*` cards** silently show stale/empty data when backend 404s (the catch block swallows errors). `portal/page.tsx:49`.
- **Entire `/supplier/*` page** same pattern.
- **Entire `/marketplace/page.tsx`** silently fails — 747-line dashboard that renders empty tabs.
- **`/settings/billing` page** loads forever (or shows "—") because `billingApi` calls 404. `billing/page.tsx:48`.
- **HeyGen integration tile** in `/settings/integrations` — labelled "Stub routes" honestly, but the tile still exists drawing attention to a non-feature. `integrations/page.tsx:568`.
- **AP2 integration page** entire `/settings/integrations/ap2/page.tsx` — full table UI, "Create voice session" / "Create mandate" buttons, all backed by 501 responses.

## 4. Missing empty / loading / error states

- **Only one `loading.tsx`** in the entire `(dashboard)` tree, and one `error.tsx`. All 133 dashboard pages share these two. Sub-routes with very different data fetches (inventory vs. workshop vs. marketing) get a generic spinner.
- **No `not-found.tsx`** inside `(dashboard)`. A bad `/customers/[id]` slug falls through to the root `not-found.tsx` (which is marketing-styled).
- **Portal pages** (`/portal/*`) have NO empty/error state — when `/api/portal/profile` 404s, the welcome banner renders "Welcome back" with no name and zero quick-link badges. Looks broken, not designed.
- **Marketplace page** — when the (nonexistent) `/api/marketplace/channels` returns nothing, tabs render empty tables with no "Connect a channel" CTA.
- **Customer detail `/customers/[id]`** — confirm a fresh DB with zero orders for a customer shows useful guidance, not just empty tables.
- **First-login dashboard** — `(dashboard)/dashboard/page.tsx` has demo-fallback data (`DASHBOARD_DEMO_AGGREGATED`) wired in, which is good. But a real new account will see fake numbers indistinguishable from real ones — borderline misleading.

## 5. Onboarding gap

There are **two parallel onboarding flows**, and the wrong one is reachable:

1. **`/(auth)/onboarding/page.tsx`** — a proper 5-step `OnboardingWizard` (Company Setup → Shopify Connect → Sample Data → Team Invite → First Quote). Well-designed, optional steps, progress bar. **Never reached** — nothing in the auth flow redirects here.
2. **`/dashboard/settings/welcome`** — what `register-form.tsx:61` actually redirects to after sign-up. Likely a single welcome screen, not a wizard.

A brand-new CCW user signs up, lands on `/dashboard/settings/welcome`, then the global dashboard at `/dashboard` which auto-shows demo data. They never see:
- Company info capture
- Shopify connect prompt (yet Shopify is wired and ready)
- Sample data offer
- Team invite prompt
- Guided first-quote creation

This is the single biggest first-value gap. **Either delete the unreached `OnboardingWizard` and own the welcome page as the onboarding, or wire `register-form.tsx:61` to redirect to `/onboarding` instead.** Currently both exist and neither wins.

## 6. Five product questions Phill needs to answer

1. **Is this a CCW-only ERP, or a multi-tenant SaaS?** The code is schizophrenic — `AppUser.workspaceId`, multi-tenant data scoping, a `/settings/billing` page with Stripe subscriptions, "Sign up" CTAs on a public pricing page all imply SaaS. But CCW is one Sydney business owned by one person. If it's CCW-only: cut the billing/pricing/marketing-pages/register flow entirely and ship a single-tenant ERP. If it's SaaS: half the code is missing (Stripe, billing routes, plan gating) and Toby's not the customer. **Pick one.**

2. **Which IA tree is canonical: `/inventory/*` or `/dashboard/inventory/*`?** Both render the same component via re-export. Toby's team is one click off whichever URL they land on. Pick one, 301 the other, and update the sidebar + quick-actions to be consistent.

3. **Customer portal — finish or cut?** This is genuinely valuable for CCW (wholesale customers want to see their orders + invoices). It's also the most complete-looking half-finished feature: 5 polished pages, all backed by missing routes. ~1 week to ship the `/api/portal/*` backend on top of the existing Customer/Order/Invoice Prisma models. **If kept, this is the single highest-ROI product unblocker.**

4. **What's the deal with `marketplace/marketing/workshop/service-requests/contractors/autonomous/prd/tasks`?** These are 8 page surfaces (~3000 LOC) with zero backend. They smell like leakage from a sister product (RestoreAssist? a Unite-Group internal tool?) or from an earlier ambition. None of them serve CCW's carpet-cleaning-supplies workflow. **Recommend cutting all 8 plus their UI code before Toby returns.** Cuts surface area by ~25%.

5. **AP2 voice payments and HeyGen video — keep the dream or kill it?** 15 stub routes + 2 settings UIs (one of them rich) for features with no business case at CCW. They make the codebase look more ambitious than it is and consume audit attention every cycle. **Default: kill.** Keep the spec docs, delete the routes/UIs, revisit in 6 months if there's evidence of demand.

---

## Report-back summary

- **Half-finished features:** 18 (6 in MVP scope, 12 out of scope and should be cut)
- **Dead UI elements:** 10
- **Top-3 product unblockers (in order):**
  1. **Wire the customer portal backend** (`/api/portal/*`, ~1w) — highest leverage; CCW's wholesale buyers will use this.
  2. **Decide and unify the onboarding flow** — pick the wizard OR the welcome page, redirect register correctly, kill the other. ~4h once decided.
  3. **Cut scope: delete `marketplace`/`marketing`/`workshop`/`service-requests`/`contractors`/`autonomous`/`prd`/`tasks` pages + `/settings/billing` + `/settings/integrations/ap2` + HeyGen stubs.** ~1d of careful deletes; massive surface-area reduction and removes ~40 of the 91 unauthenticated routes flagged in the audit.

**Recommended next move:** before Toby returns 26 May, run the cut (#3) on a feature branch — it's a one-person sweep that removes ~3000 LOC of orphan UI + ~30 dead API stubs and clears the path for the customer-portal build. Don't ship to main until Toby reviews, but having the diff ready means Day-1 conversation is "here's what we're keeping" not "here's what's broken."

## Cross-refs

[[ccw-crm-discovery-audit-2026-05-14]] · [[ccw-crm-review-technical-architect-2026-05-14]] · [[ccw-crm-review-market-strategist-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[ccw]] · [[unite-crm]] · [[unite-group-nexus-architecture]] · [[pi-ceo-architecture]] · [[feedback-no-slack]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[stripe-milestone-invoice]] · [[opus-adversary]]
