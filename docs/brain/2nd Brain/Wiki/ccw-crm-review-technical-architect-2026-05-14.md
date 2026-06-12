---
type: wiki
updated: 2026-05-14
---

# CCW-CRM — Technical Architect Review

Reviewer: Technical Architect persona, [[pi-ceo-architecture]] Board. Audit source: `[[ccw-crm-discovery-audit-2026-05-14]]`. Repo: `/Users/phill-mac/pi-seo-workspace/CCW-CRM/` ([[ccw]]).

## 1. Headline assessment

This is a prototype that grew an enterprise-shaped skin. The repo has 223 API routes, 155 pages, and 37 Prisma models, but only 3 test files (52 trivial unit tests, zero e2e) and a broken main branch — `npm run build`, `npm run lint`, and `tsc --noEmit` all fail with the same root cause (`prisma generate` hasn't been run after the last three migrations on 2026-05-10 → 2026-05-12 added `ProductLocationStock`, `StockReservation`, `StockTransfer`, `InventoryStockTake*`, `Cin7BomMaster`, `Cin7BomComponent`, `Cin7ProductionRun`). On top of that, the monorepo scaffolding (`apps/web` empty, `apps/backend` an orphan Python skeleton, `packages/*` empty) is vestigial — there is one real Next.js app at the root masquerading as a multi-package workspace. Integration breadth is broad but shallow: SendGrid/Shopify/Xero/Cin7 OAuth flows are wired; Stripe/Resend/Supabase/Telegram/Anthropic/Gemini/Pi-CEO/Unite-Group are zero-LOC; HeyGen (5 routes) and AP2 (10 routes) are explicit 501-stubs. Git history is a single-day 2026-05-10/11 agent burst that landed unfinished. Honest verdict: **prototype mid-pivot**, not production-ready, but the bones (custom JWT, Prisma schema, route topology) are coherent enough to ship after a focused 1–2 week stabilisation sprint.

## 2. Architectural debt — P0 (blocks shipping)

### P0-1 Stale Prisma client → 87 tsc errors, build FAIL
- **File:line:** `src/app/api/inventory/adjust/route.ts:59`, `auto-reorder/route.ts:61,86,105`, `barcode/[code]/route.ts:47,55`, `by-location/route.ts:51,56`, `low-stock/route.ts:30,53`, `product/[productId]/locations/route.ts:41,45,49,50,56,57`, `release/[id]/route.ts:20,33,39,44`, `reorder-alerts/route.ts:27,80`, `reorder-rules/route.ts:24,38,108`, `reorder-settings/[productId]/[location]/route.ts:55`, `reservations/route.ts:26,45,52` (+ ~25 more). All `Property 'productLocationStock' / 'stockReservation' / 'stockTransfer' does not exist on type ...PrismaClient...`.
- **Problem:** Schema declares the models (`prisma/schema.prisma:164-254`), migrations exist (`20260510120000`, `20260511130000`, `20260512183000`), but the installed `node_modules/.prisma/client` was last generated before these. `postinstall: prisma generate` exists in `package.json:31`, so the failure is that nobody ran `npm ci` after pulling these migrations.
- **Blast radius:** Every inventory + Cin7 BOM endpoint (~30 routes) and indirectly all dashboard pages that consume them. `next build` exits non-zero → Vercel deploys are blocked.
- **Suggested fix shape:** `rm -rf node_modules/.prisma && npx prisma generate`, then re-run `npm run check`. Add a CI step (`npm run db:generate && npm run type-check`) as a required PR check. Pin `prisma` + `@prisma/client` versions to identical patch (currently both `^7.7.0` — fine; the failure is a regen miss, not a version skew).
- **Acceptance criteria:** `npm run check:all` exits 0. `next build` produces a `.next/standalone` bundle. CI gate refuses any PR where `prisma generate` would change generated output.

### P0-2 Webhook signature validation is a stub
- **File:line:** `src/app/api/webhooks/route.ts:11-15` — `if (webhookSecret && signature) { /* Add your signature validation logic here */ }`. The endpoint then trusts `body.event` and dispatches.
- **Problem:** Any internet-reachable POST to `/api/webhooks` executes the `logger.info('Task completed', { data })` / `task.failed` branches and writes attacker-controlled payloads to logs. No HMAC verification.
- **Blast radius:** Log injection, denial-of-service via unbounded log volume, future trust-on-first-use confusion if this endpoint is wired to Cin7/Shopify webhooks (currently it's not, but the Settings → Integrations UI implies it will be).
- **Suggested fix shape:** Either (a) delete the route (it's dead — no provider points at it) or (b) require `WEBHOOK_SECRET` to be set, reject with 401 if missing, validate `x-webhook-signature` as `HMAC-SHA256(WEBHOOK_SECRET, rawBody)`. Use `crypto.timingSafeEqual`.
- **Acceptance criteria:** Returns 401 when signature header missing or mismatched. Unit test covers valid + invalid signatures + missing secret.

### P0-3 POS locations / terminals / staff are in-memory mock stores
- **File:line:** `src/app/api/pos/locations/route.ts:1-6` imports `getPosStore` from `@/lib/pos/mock-store`. `src/lib/pos/mock-store.ts` defines `PosLocation`, `PosStaff`, `PosTerminal` types and a process-local store. Routes: `pos/locations`, `pos/locations/[id]`, `pos/terminals`, `pos/terminals/[id]`, `pos/staff`, `pos/staff/[id]`, `pos/sales-staff`.
- **Problem:** Data evaporates on Vercel cold start, is not multi-tenant (no `ownerUserId` scope), no auth gate. The `PosTransaction` model in schema (`prisma/schema.prisma:490-510`) references `terminalId` and `locationCode` as free-text strings with no FK, so the database has no integrity link back to whatever the mock store contains.
- **Blast radius:** POS reconciliation, BAS reports, bank-feed matching — all depend on terminal/location identity. Currently the database can store POS transactions referencing terminals that don't exist in the (in-memory) terminal store and that nobody else can see.
- **Suggested fix shape:** Add 3 Prisma models (`PosLocation`, `PosStaff`, `PosTerminal`) scoped by `ownerUserId`, FK from `PosTransaction.terminalId → PosTerminal.terminalId` and `PosTransaction.locationCode → PosLocation.code`. Rewrite the 7 routes against Prisma. Gate with `requireAuthScope`.
- **Acceptance criteria:** POS terminals/locations persist across deploys. PosTransaction can't be created with an unknown terminal. Multi-tenancy isolation verified by integration test.

### P0-4 91 / 223 API routes have no auth gate
- **File:line:** `src/app/api/contacts/route.ts:3-11` is the canonical example — returns `{data:[], total:0, ...}` with no auth check. The audit lists ~30 likely-unintentional gaps including `containers/route.ts`, `backorders/route.ts`, `autonomy/{health,metrics,anomalies}`, `monitoring/{health,metrics,range,alerts}`, `submissions/{statistics,[type]/[id]/notes}`, all `pos/*` routes, `activities/{route,stats}`, `ai/{copilot/quote,cin7-anomaly/sync-health,insights/{dashboard,sales},inventory-forecast,patterns/orders}`, `ccw/{products,summary}`, `cin7/fulfilments/[id]/status`, `integrations/{cin7,sendgrid,shopify,xero}/{configure,status,disconnect,...}`, `integrations/diagnostics`, `orders/[id]/activity`.
- **Problem:** `src/app/api/ai/copilot/quote/route.ts:49` consumes `OPENAI_API_KEY` and emits chat completions — unauthenticated callers can burn budget. `integrations/*/configure` lets anyone set OAuth secrets server-side. `monitoring/metrics` and `autonomy/health` leak internal state.
- **Blast radius:** Cost (OpenAI bills), data exposure (customer counts, agent run telemetry), config tampering (OAuth credentials).
- **Suggested fix shape:** Add a global wrapper `withAuth(handler)` and a per-route allow-list of explicitly-public paths (auth, health, public/stats, telemetry, demo-requests POST, contact-submissions POST, the SSE streams *after* token-binding). Reject everything else.
- **Acceptance criteria:** Listing untagged routes returns 0. A script `scripts/verify-route-auth.ts` greps every `src/app/api/**/route.ts` for `requireAuth*|CRON_SECRET|public route allow-list` and fails CI if any unaccounted route exists.

### P0-5 Cron secret comparison is a non-constant-time string compare
- **File:line:** `src/app/api/boardroom/cron/route.ts:16` — `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`) { return Unauthorized; }`. Same pattern in every `src/app/api/cron/*/route.ts`.
- **Problem:** `!==` on strings leaks timing. Low-severity in practice (Vercel CRON only) but trivial to fix.
- **Blast radius:** Theoretical secret extraction by a network-adjacent attacker.
- **Suggested fix shape:** Centralise as `assertCronAuth(request)` using `crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(expected))` with length guard.
- **Acceptance criteria:** All 14 cron routes call the helper. Helper unit-tested.

### P0-6 Two parallel IA structures coexist
- **File:line:** `next.config.ts:24-100` declares 50+ redirects from top-level routes (`/products`, `/inventory`, `/invoices`, `/workshop/*`, `/customers/*`, ...) to `/dashboard/*`, but **both filesystem trees still exist** under `src/app/(dashboard)/`. Audit Section 5 confirms: `/inventory/page.tsx` + `/dashboard/inventory/page.tsx`, `/products/page.tsx` + `/dashboard/inventory/products/page.tsx`, etc.
- **Problem:** The redirect rules are non-permanent (`permanent: false`) so search engines won't cache them; users who click a stale bookmark hit a 307 hop. Worse, both trees can drift — bug-fixes will be applied to one and not the other.
- **Blast radius:** Subtle correctness bugs ("I fixed it" + "no you didn't"). SEO. Bundle size (155 page files is ~2× what the IA needs).
- **Suggested fix shape:** Pick the canonical tree (`/dashboard/*` per the redirects in `next.config.ts`), delete the duplicate top-level pages, flip redirects to `permanent: true`. ~70 page files deletable.
- **Acceptance criteria:** `find src/app -name page.tsx | wc -l` ≤ 90. No duplicate page mapping to the same data domain.

## 3. Architectural debt — P1 (degrades shipping)

### P1-1 Login has no rate-limiting / lockout
- **File:line:** `src/app/api/auth/login/route.ts:14-46`. Verifies password with bcrypt then issues JWT. No attempt counter, no exponential backoff, no IP throttle.
- **Problem:** Online password-guessing is uncapped. bcrypt cost gives ~100ms/attempt — still ~10/sec per attacker.
- **Blast radius:** Account takeover.
- **Suggested fix shape:** Add an `AppUserLoginAttempt` model `(email, ip, ts, success)`, deny logins where >5 failures in last 15min for the email or IP. Or use Upstash/Redis rate-limit if introduced for other reasons.
- **Acceptance criteria:** 6th failed login from same IP within 15min returns 429.

### P1-2 `Product.price`, `Order.total`, `Invoice.total` etc. are `Float`
- **File:line:** `prisma/schema.prisma:77` (`price Float @default(0)`), `:262` (`Order.total`), `:296` (`Quote.total`), `:336` (`Invoice.total/subtotal/taxTotal/amountPaid`), `:457-460` (`PurchaseOrder.subtotal/tax/shippingCost/total`), `:481` (`PurchaseOrderLine.unitCost/subtotal`), `:499-501` (`PosTransaction.subtotal/tax/amount`), `:553-555` (`BankFeedTransaction.credit/debit/balance`), `:649-650` (`SalesInvoice.amount`), `:670` (`SalesPayment.amount`).
- **Problem:** Postgres maps Prisma `Float` to `double precision`. Money in `double` accumulates rounding error — `0.1 + 0.2 !== 0.3`. Invoice line-item rollups will drift; BAS reports will round wrong.
- **Blast radius:** Audit trail, tax filings (BAS reports under `api/invoices/reports/bas`), bank-feed reconciliation.
- **Suggested fix shape:** Migrate to `Decimal @db.Decimal(14,4)` for all monetary fields. Decimal.js handling on read. This is a breaking client-code change.
- **Acceptance criteria:** Schema validate, migration adds `USING column::numeric(14,4)`. Existing reads continue to work after the Prisma client regen.

### P1-3 `ProductLocationStock.quantity` / `reserved` can drift below zero or be inconsistent
- **File:line:** `prisma/schema.prisma:168-169` — `quantity Int @default(0)`, `reserved Int @default(0)`. No CHECK constraint.
- **Problem:** `src/app/api/inventory/adjust/route.ts:63-69` enforces `nextQty >= row.reserved` at application level inside a transaction, but other writers (`StockTransfer`, `StockReservation`, `Cin7` syncs) update `quantity`/`reserved` independently. A bug in any one path lets stock go negative or reserved > quantity. Once that happens, every aggregation is wrong.
- **Blast radius:** Inventory accuracy (ground-truth across the whole ERP), backorders, auto-reorder triggers.
- **Suggested fix shape:** Add Postgres CHECK constraints: `CHECK (quantity >= 0)`, `CHECK (reserved >= 0)`, `CHECK (reserved <= quantity)`. Add a migration via `prisma migrate dev` with raw SQL in the migration file.
- **Acceptance criteria:** Migration applies cleanly. Existing dev data passes the constraints (or fails loudly so we know to fix it).

### P1-4 No FK between `PosTransaction.salesStaffId / terminalId / locationCode` and their (would-be) parent tables
- **File:line:** `prisma/schema.prisma:494-496` — three `String` fields, no relations. Same for `SalesFulfilment.cin7OrderMappingId` (`:623`), `GoodsReceipt.cin7PoMappingId` (`:686`), `SalesPayment.cin7InvoiceId` (`:667`).
- **Problem:** Orphan-prone. Cin7 mapping IDs reference an external system, so FK to a local Prisma table isn't possible — but `cin7OrderMappingId` should at least be `@@index`-ed.
- **Blast radius:** Reporting joins do N×M scans without index.
- **Suggested fix shape:** Once P0-3 lands (POS tables in DB), wire FKs. Until then, add `@@index([terminalId])`, `@@index([locationCode])`, `@@index([salesStaffId])` on `PosTransaction`. Add `@@index([cin7OrderMappingId])` on `SalesFulfilment` (already exists at `:638`) — verify the rest.
- **Acceptance criteria:** EXPLAIN ANALYZE on the dashboard's POS reconciliation query shows Index Scan, not Seq Scan.

### P1-5 Two SSE streams accept unauthenticated connections
- **File:line:** `src/app/api/inventory-stream/route.ts:1` (`export const runtime = 'edge'`, no auth), `src/app/api/dashboard/metrics-stream/route.ts:1` (same pattern).
- **Problem:** Anyone can hold open a 25-second connection per request — trivial to DoS the edge function quota. They currently just emit `connected` + keep-alive heartbeats with no real data, so they're harmless data-wise but waste edge invocations.
- **Blast radius:** Vercel cost + edge function exhaustion.
- **Suggested fix shape:** Either delete (they emit no payload) or require a short-lived JWT in the URL token and validate before opening the stream.
- **Acceptance criteria:** Anonymous GET returns 401 or the routes are removed.

### P1-6 `ESLint` config pinned to Next 15, repo on Next 16
- **File:line:** `package.json:106` — `"eslint-config-next": "15.1.0"` while `next: "16.1.6"`. Audit Section 2 confirms 36 lint errors.
- **Problem:** Lint rules may miss Next 16 idioms (e.g., `middleware` vs `proxy` deprecation, async dynamic params). The `npm run lint` failures are partially noise from version skew.
- **Blast radius:** False signal in CI; real lint regressions hidden under known-bad output.
- **Suggested fix shape:** Bump `eslint-config-next` to `^16.1.0`, re-run lint, triage residual errors.
- **Acceptance criteria:** `npm run lint` exits 0 or the residual list is documented in a `.eslintignore` with rationale.

### P1-7 `apps/backend` is an orphan Python skeleton; `apps/web` is empty
- **File:line:** `apps/web/` has only `node_modules` + `tsconfig.tsbuildinfo`. `apps/backend/` has `alembic/`, `src/{ai,api,auth,...}/` but no `pyproject.toml`/`requirements.txt` at top.
- **Problem:** Engineers see "monorepo" and look for shared packages that don't exist. New devs waste hours.
- **Blast radius:** Onboarding friction; confusion about deploy target.
- **Suggested fix shape:** Either delete both (preferred — the Python backend is described as vestigial), or commit to one and add `turbo.json` + workspaces declaration. Phill should decide (see Section 8).
- **Acceptance criteria:** Repo top has either a real `turbo.json` + workspace manifest *or* no `apps/` / `packages/` dirs.

### P1-8 Deprecated `middleware` convention in Next 16
- **File:line:** `src/middleware.ts:1`. Build output: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **Problem:** Next 17 will likely remove `middleware`. Forward-compat risk on the next minor.
- **Suggested fix shape:** Rename to `src/proxy.ts`, update export name per Next 16 docs.
- **Acceptance criteria:** No deprecation warning in `next build` output.

## 4. Architectural debt — P2 (nice-to-have)

### P2-1 23 env vars referenced in code but missing from `.env.example`
- **File:** `.env.example`. Audit Section 6 lists the gap (e.g., `API_UPSTREAM_URL`, `AUTH_DEV_EXPOSE_RESET_TOKEN`, `BUSINESS_TAX_RATE`, `CRON_INTEGRATION_USER_ID`, `JWT_ACCESS_EXPIRES`, `OPENAI_QUOTE_COPILOT_MODEL`, all 5 `SHOPIFY_*` OAuth vars).
- **Problem:** New environments break in non-obvious ways.
- **Fix:** Add the 23 entries with placeholders + a one-line comment each.
- **Acceptance:** `scripts/verify-env.sh` (new) diffs `process.env.X` references against `.env.example` and fails on mismatches.

### P2-2 `package.json` carries unused deps
- **File:line:** `package.json:35` `@composio/openai-agents`, `:37` `@openai/agents`, `:64` `mcp-linear` — declared, zero imports in `src/`.
- **Fix:** Remove via `npm uninstall`. Saves ~30MB install + reduces supply-chain surface.
- **Acceptance:** `npm ls` shows no orphan deps; `npm run build` still succeeds.

### P2-3 Boardroom cron Slack notification is the only Slack reference
- **File:line:** `src/app/api/boardroom/cron/route.ts:93` uses `SLACK_WEBHOOK_URL`. Per `[[feedback-no-slack]]` Slack is permanently rejected.
- **Fix:** Delete `notifyCEO` Slack branch. Route failure notifications through Telegram (which Phill uses) or just `console.error` — Vercel already captures it.
- **Acceptance:** Zero `SLACK_WEBHOOK_URL` references in `src/`.

### P2-4 No `vercel.json`
- **File:** Repo root.
- **Problem:** Cron schedules, function memory, rewrites/headers split between `next.config.ts` and the Vercel UI. Hard to reproduce a fresh deploy from source.
- **Fix:** Commit a `vercel.json` declaring cron schedules + function settings.
- **Acceptance:** New Vercel project bootstrap from this repo deploys without manual UI config.

### P2-5 `NodeJS-Starter-V1/` directory at root
- **File:** Top-level. Audit lists it as a separate starter scaffold.
- **Fix:** Delete or move to a `docs/legacy/` location.

## 5. Connection layer gaps

For each integration in Audit Section 10 marked "started but broken" or "referenced but no code":

### Stripe — zero SDK, zero env
- **Missing:** `stripe` npm package, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_*` env, any route under `src/app/api/billing/` or `src/app/api/webhooks/stripe/`. The Billing page (`src/app/(dashboard)/settings/billing/page.tsx`) calls an internal `billingApi` that returns fixtures.
- **Smallest wire-live fix:** `npm i stripe`. Add `STRIPE_SECRET_KEY` (read from 1Password per `[[reference-1password-index]]`). Create `src/lib/billing/stripe.ts` exporting a singleton client. Add `POST /api/billing/checkout-session` (creates Checkout Session), `POST /api/webhooks/stripe` (verifies `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`, persists `Subscription` events). One Prisma model `Subscription { stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd, ownerUserId }`.
- **Tests that prove it works:** (a) Stripe CLI `stripe trigger checkout.session.completed` → row appears in DB. (b) Webhook with bad signature returns 400. (c) Billing page shows live subscription status, not fixture.

### Resend — not started
- **Missing:** `resend` npm dep, `RESEND_API_KEY` env, any helper. Outbound email is SendGrid-only via `src/lib/integrations/sendgrid-mail.ts`.
- **Smallest wire-live fix:** Decide first whether Resend replaces or supplements SendGrid — they overlap. If replacement: install `resend`, add `src/lib/email/resend.ts` mirroring the SendGrid helper signature, swap call sites in `api/integrations/sendgrid/send/route.ts` and password-reset flow (`api/auth/forgot-password/route.ts`). If supplement: pick a provider per env (transactional vs marketing). Flag this under Section 8.
- **Tests:** Send to a SendGrid sink address, assert 202 + message ID. Unit-test the provider switch.

### Supabase — commented stub only
- **Missing:** `@supabase/supabase-js`, `SUPABASE_URL` / `SUPABASE_ANON_KEY` env. The only mention is commented-out at `src/app/api/cron/health-check/route.ts:27-28`.
- **Smallest wire-live fix:** Honestly, **don't**. CCW-CRM is a Prisma+Postgres app. The Brain-2 portfolio uses Supabase for portal_content but CCW-CRM has no need. Recommend deleting the commented stub and removing `**.supabase.co` from `next.config.ts:104` CSP `remotePatterns` if no Supabase storage is used.
- **Tests:** N/A (recommend removal not wiring).

### Linear — `mcp-linear` declared, zero imports
- **Missing:** Any `import` of `mcp-linear` or `@linear/sdk`. No `LINEAR_API_KEY` reference.
- **Smallest wire-live fix:** If Linear ticket sync is wanted (creating Linear tickets when a `submission`/`demoRequest` lands), use `@linear/sdk` (the proper REST SDK), not `mcp-linear` (an MCP server adapter — wrong shape for in-process use). Single route `POST /api/integrations/linear/create-from-submission` reading `LINEAR_API_KEY` + `LINEAR_TEAM_ID`. Remove `mcp-linear` from deps.
- **Tests:** Mock the Linear GraphQL endpoint, assert request body matches.

### Telegram — zero references
- **Missing:** Any HTTP client to `api.telegram.org`, no `TELEGRAM_*` env.
- **Smallest wire-live fix:** Add `src/lib/notifications/telegram.ts` with `sendTelegramAlert(chatId, text)` using `fetch` to `https://api.telegram.org/bot${TOKEN}/sendMessage`. Replace P2-3's Slack call with Telegram. Reuse pattern from `Pi-CEO/Pi-Dev-Ops` (already shipped per `[[reference-1password-index]]`).
- **Tests:** Unit-test happy path + 4xx error handling. Single integration test that hits the bot in a staging chat.

### Anthropic — UI tile only, no code
- **Missing:** `@anthropic-ai/sdk` not in `package.json`. `ANTHROPIC_API_KEY` in `.env.example` but no `process.env.ANTHROPIC*` in `src/`.
- **Smallest wire-live fix:** If the Settings UI tile (`src/app/(dashboard)/settings/integrations/page.tsx:541-545`) is supposed to be functional, install `@anthropic-ai/sdk`, mirror the OpenAI helper at `src/lib/ai/anthropic.ts`, and add a model-routing layer that picks Anthropic vs OpenAI per task. Otherwise remove the tile from the UI.
- **Tests:** Skip until decision made.

### Gemini — zero references
- **Missing:** Everything.
- **Smallest wire-live fix:** Only if specifically required. Otherwise drop from `.env.example` and Settings UI to avoid promising unbuilt features.
- **Tests:** N/A.

### Pi-CEO API — zero references
- **Missing:** `PI_CEO_API_KEY` not referenced. `API_UPSTREAM_URL` is referenced (`src/app/api/agents/*`, `workflows/*` proxy to it) but it's a generic upstream, not specifically Pi-CEO.
- **Smallest wire-live fix:** Decide whether `API_UPSTREAM_URL` *is* the Pi-CEO API or a separate Python backend. If Pi-CEO: rename env to `PI_CEO_API_URL` + `PI_CEO_API_KEY`, add bearer auth to the proxy in `src/app/api/agents/list/route.ts` etc.
- **Tests:** Integration test that the proxy forwards the bearer correctly.

### Unite-Group API — zero references
- **Missing:** No `UNITE_GROUP_*` env consumed in code.
- **Smallest wire-live fix:** Same shape as Pi-CEO. Decide if needed; otherwise remove from `.env.example`.

### HeyGen — 5 stub routes
- **Files:** `src/app/api/integrations/heygen/{avatars,generate,quota,status/[videoId],voices}/route.ts` — all `notImplementedResponse('HeyGen', ...)`.
- **Smallest wire-live fix:** Replace each stub with a `fetch` call to `https://api.heygen.com/v2/...` reading `HEYGEN_API_KEY`. Add a `VideoGeneration` Prisma model `(ownerUserId, heygenVideoId, status, videoUrl, createdAt)`. Webhook from HeyGen → `POST /api/webhooks/heygen` updates status.
- **Tests:** Mock HeyGen API; verify request shape + state transitions on the model.

### AP2 — 10 stub routes
- **Files:** `src/app/api/integrations/ap2/{mandates/{[mandateId]/verify,cart,intent,payment,},payments/{[transactionId],execute},transactions,voice/sessions/{[sessionId]/input,}}/route.ts` — all `notImplementedResponse('AP2', ...)`.
- **Smallest wire-live fix:** AP2 is Google's Agent Payments Protocol — still pre-1.0. Honest answer: **don't wire until the spec is stable**. Mark the UI tile "Coming soon". Phill should confirm (see Section 8).
- **Tests:** N/A until spec stable.

## 6. Schema / migration safety

The 3 most recent migrations (`20260510120000_product_location_stock_and_transfers`, `20260511130000_inventory_reservations_reorder_stock_take`, `20260512183000_cin7_bom_tables`) add tables only — no destructive column drops, no type narrowings. They are safe to `prisma migrate deploy` to production *once `prisma generate` is re-run on every consumer build* (P0-1). The `migration_lock.toml` is correct.

**Unsafe-to-migrate patterns currently in schema** — none catastrophic, but worth tightening before production:

- `Cin7BomMaster.quantityProduced` (`prisma/schema.prisma:110`), `Cin7BomComponent.quantity` (`:130`), `Cin7BomComponent.wastagePercent` (`:132`), `Cin7ProductionRun.quantityPlanned` / `quantityCompleted` (`:146-147`) are typed `String` with defaults like `"1.0000"`. These are numbers being stored as strings to preserve external Cin7 precision. **Risk:** SQL aggregation impossible without `::numeric` casts. **Fix shape:** Convert to `Decimal @db.Decimal(14,4)` in a follow-up migration with `USING column::numeric(14,4)`. Touch the ~3 Cin7 BOM routes that read them.

**Indexes needed:**
- `PosTransaction.terminalId`, `PosTransaction.locationCode`, `PosTransaction.salesStaffId` (`prisma/schema.prisma:494-496`) — no `@@index`, dashboard queries scan.
- `Order.customerId` — not currently indexed (`:256-271`); the `@@index([ownerUserId])` exists but customer-detail page does `WHERE customerId = ?` without an index.
- `Quote.customerId` (`:290-307`) — same gap.
- `Invoice.customerId` — already indexed at `:347`. Good.
- `EmailMessage.threadId` — indexed at `:424`. Good.
- `BankFeedTransaction.bankAccountId` — indexed at `:562`. Good.

**CHECK constraints needed (raw SQL in next migration):**
- `ProductLocationStock`: `CHECK (quantity >= 0)`, `CHECK (reserved >= 0)`, `CHECK (reserved <= quantity)`.
- `StockReservation.quantity`: `CHECK (quantity > 0)`.
- `OrderLineItem.quantity / lineTotal`, `InvoiceLineItem.quantity / lineTotal`, `QuoteLineItem.quantity` — `CHECK (quantity > 0)`, `CHECK (lineTotal >= 0)`.
- `Invoice.amountPaid`: `CHECK (amount_paid >= 0 AND amount_paid <= total)` to prevent over-payment artefacts.
- `InvoiceLineItem.taxRate`: `CHECK (tax_rate >= 0 AND tax_rate <= 1)` (assumes 0-1 fraction; verify what the codebase uses).

**`onDelete` semantics worth auditing:**
- `Invoice.customer` is `onDelete: Restrict` (`:341`) — good (don't delete a customer with invoices).
- `Invoice.order` is `onDelete: SetNull` (`:342`) — questionable. If an order is deleted the invoice becomes orphaned of context but retains amounts. Likely fine for audit-trail, but `Restrict` would force the right ordering.
- `Cin7ProductionRun.bomMaster` is `Restrict` (`:157`) — good.
- All `*LineItem` are `Cascade` on parent delete — good.

## 7. Test coverage gaps

3 test files, 52 tests, **all of them in `src/lib`**. Zero coverage of API routes, pages, auth flows, or Prisma persistence. Specific untested behaviours that will bite if shipped:

1. **Auth round-trip** — `src/app/api/auth/login/route.ts` + `register` + `refresh` + `me` + `change-password` + `forgot-password` + `reset-password`. No test verifies a happy-path login → access-token → `/api/auth/me` round trip. No test that an expired token is rejected. No test that `register` enforces email uniqueness against the `@unique` constraint. **Risk:** silent regression locks every user out.

2. **Workspace isolation** — `src/lib/auth/workspace-scope.ts` (`getWorkspaceMemberUserIds`) is called from ~80 routes including `inventory/adjust/route.ts:20`. No test proves that user A in workspace W1 can't read/write user B's data in workspace W2. **Risk:** multi-tenant data leak.

3. **Invoice numbering uniqueness** — `prisma/schema.prisma:347` declares `@@unique([ownerUserId, invoiceNumber])` but no API test that two concurrent POSTs to invoice creation handle the unique-violation collision (a race condition will fire `P2002`). **Risk:** 500s under load.

4. **Stock reservation arithmetic** — `inventory/release/[id]/route.ts` releases reserved stock back to available. No test for: double-release (idempotency), releasing an expired reservation, releasing across a stock-take boundary. **Risk:** inventory drift.

5. **Cin7 BOM cost rollup** — `Cin7BomMaster.quantityProduced` × component costs should equal a finished-good cost. No test. **Risk:** mis-priced production runs.

6. **PurchaseOrder receive-partial** — `purchase-orders/[id]/items/[itemId]/receive/route.ts`. No test for `quantityReceived > quantity` (should reject) or partial receive across multiple GoodsReceipt rows summing correctly. **Risk:** stock + supplier-payable drift.

7. **Cron CRON_SECRET enforcement** — Confirmed in the source but not tested. **Risk:** a refactor accidentally removes the check and nobody notices.

8. **CSRF** — `next.config.ts:130-144` sets `Access-Control-Allow-Origin: *` from env. No test verifies the value of `NEXT_PUBLIC_FRONTEND_URL` in prod is the canonical CCW origin. **Risk:** if env is unset, `Access-Control-Allow-Origin: http://localhost:3000` ships to prod, breaking real users.

9. **CSP regression** — `next.config.ts:165-188` defines CSP. No test that pages actually load under the declared CSP. **Risk:** a new dependency adds an inline script and breaks prod.

10. **e2e: invoice → payment → BAS** — Zero Playwright specs. The most load-bearing customer journey (create invoice → mark paid → BAS report shows correct GST) is completely untested. **Risk:** GST mis-reporting (ATO consequences).

**Minimum credible coverage to ship:** 1 Playwright spec for auth round-trip; 1 for invoice lifecycle; 1 for inventory adjust → reserve → release → stock-take submit; integration tests with a test Postgres for workspace isolation on 3 representative read routes (`customers`, `invoices`, `inventory`).

## 8. The five questions Phill needs to answer to unblock

### Q1 — Monorepo or single-app? **PICK ONE**
- **Option A (recommended):** Delete `apps/web/`, `apps/backend/`, `packages/*/`. CCW-CRM is one Next.js app. Saves ~50MB of orphan `node_modules` and removes the "where is the real code" tax for every new contributor.
- **Option B:** Commit to the monorepo split. Add `turbo.json`, `pnpm-workspace.yaml`, move Next.js app into `apps/web/`, port the Python backend into `apps/backend/` with real `pyproject.toml`. ~1 week of work.
- **Implication:** Until decided, every new file added at the root deepens the contradiction. P1-7 blocks on this.

### Q2 — Stripe or no Stripe in v1? **YES / NO**
- **YES:** Adds ~3 days of work for Checkout Session + webhook + subscription model + billing UI. Required if CCW will charge customers from the CRM (not just bill them via Xero).
- **NO:** Remove the `/settings/billing` page from the UI; document that billing is Xero-only; remove `STRIPE_*` placeholders.
- **Implication:** P0-2 / Section 5 / Settings → Billing all hinge on this. Per `[[project-ccw-holiday-window]]` Toby is back 26 May — if billing is a "demo to Toby" requirement, YES is forced.

### Q3 — HeyGen and AP2 — kill or wire? **KILL / WIRE**
- **KILL (recommended):** Remove the 15 stub routes + the Settings tiles. They occupy mental real-estate. AP2 spec is unstable; HeyGen value for an industrial-supplies CRM is unclear.
- **WIRE:** Adds ~1 week for HeyGen alone (avatars, generation, status webhook, storage). AP2 should wait regardless of decision.
- **Implication:** Touches P0-4 (auth gates on dead routes are still required) and the IA. Decision is reversible later; the cost of KILL is one git revert when re-introduced.

### Q4 — Cin7 numeric fields as `String` (current) or `Decimal`? **PICK ONE**
- **`String` (current):** Preserves Cin7's exact wire format. Aggregation requires casts. Reports get expensive at scale.
- **`Decimal @db.Decimal(14,4)`:** SQL-native math, exact-precision arithmetic, but a one-way migration with downtime risk if existing data has values that don't round-trip.
- **Implication:** P1-2 + Section 6 hinge on this. If Cin7 is the system of record, keeping `String` is defensible. If CCW becomes the system of record for production-run cost reporting, `Decimal` is needed.

### Q5 — Anthropic / Gemini in the AI surface? **JUST OPENAI / ADD CLAUDE / ADD BOTH**
- **JUST OPENAI (current):** Remove the Anthropic UI tile, drop `ANTHROPIC_API_KEY` from `.env.example`. One model, one bill.
- **ADD CLAUDE:** Install `@anthropic-ai/sdk`, add a routing helper, give the Quote Copilot a `model: 'claude-opus-4-7' | 'gpt-4o-mini'` switch. Per `[[feedback-model-routing-max-first]]`, Claude via Max is $0 marginal — strong cost case.
- **ADD BOTH (Gemini too):** More complexity, marginal benefit unless a specific Gemini-strength task exists (long-context summarisation).
- **Implication:** Section 5 Anthropic/Gemini gaps hinge on this. Per memory `[[feedback-model-routing-max-first]]`, ADD CLAUDE is consistent with the empire's routing rule.

---

**Report:**
- **P0 count:** 6
- **P1 count:** 8
- **P2 count:** 5
- **Top-3 unblocking questions:** (1) monorepo or single-app — every cleanup PR is awkward until decided; (2) Stripe in v1 — gates the Settings → Billing surface and ~3 days of work; (3) HeyGen/AP2 — kill or wire decides whether 15 stub routes need auth gates and IA presence at all.

## Cross-refs

[[ccw-crm-discovery-audit-2026-05-14]] · [[ccw-crm-review-product-strategist-2026-05-14]] · [[ccw-crm-review-market-strategist-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[ccw]] · [[unite-crm]] · [[pi-ceo-architecture]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-model-routing-max-first]] · [[feedback-audit-verification]] · [[stripe-milestone-invoice]] · [[opus-adversary]]
