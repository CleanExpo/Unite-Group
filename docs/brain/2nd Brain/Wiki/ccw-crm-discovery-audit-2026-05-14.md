---
type: wiki
updated: 2026-05-14
---

# CCW-CRM Discovery Audit — 2026-05-14

Audit of `/Users/phill-mac/pi-seo-workspace/CCW-CRM/` ([[ccw]] CRM, Next.js 15.x / 16.x monorepo). Tech Lead: see [[rana-handoff-2026-05-14]]. Read-only observation only. No fixes proposed here.

## 1. Repo shape

**Top-level directories**
- `apps/` — declared as monorepo workspaces; `apps/web/` is effectively empty (only `node_modules` + `tsconfig.tsbuildinfo`); `apps/backend/` contains a Python project skeleton (`alembic/`, `src/{ai,api,auth,cache,config,db,events,integrations,monitoring,security,services,state,testing,utils,workflow}`) but with no top-level `pyproject.toml` / `requirements.txt` visible. Backend appears to be a stale or vestigial Python service stub.
- `packages/` — `config/` and `shared/`; both contain only `node_modules` (no source).
- `src/` — actual Next.js app source (App Router under `src/app/`).
- `prisma/` — Prisma schema + migrations directory.
- `scripts/` — setup, verify, and ops scripts.
- `docs/` — large doc tree (215 entries listed in `ls`).
- `briefs/`, `.pi-ceo/`, `.claude/`, `.github/`, `.vscode/`, `.husky/`, `.githooks/` — agent/CI/dev metadata.
- `public/`, `NodeJS-Starter-V1/` — assets + a separate starter scaffold.

**Effective layout:** despite `apps/`/`packages/` directories existing, the live application is a single-package Next.js app rooted at the repo top with sources under `src/`. The `apps/web` is empty and `apps/backend` is a Python skeleton with no manifest — there is no real monorepo orchestration (no `turbo.json` at root, no `pnpm-workspace.yaml`).

**Package manager + key deps** (`package.json`)
- npm (`engines.npm >=10.0.0`, `engines.node >=20.0.0`); `.npmrc` present.
- `next` 16.1.6 (Turbopack)
- `react` ^19.0.0
- `prisma` ^7.7.0 (`@prisma/client` ^7.7.0, `@prisma/adapter-pg` ^7.7.0)
- `tailwindcss` ^4.0.0 (`@tailwindcss/postcss` ^4.1.18)
- `typescript` ^5.7.2
- `vitest` ^2.1.8 (`@vitejs/plugin-react` ^4.3.4)
- `@playwright/test` ^1.49.1
- `eslint` ^9.17.0, `eslint-config-next` 15.1.0 (note: next is 16 but eslint config is pinned to 15)
- `zod` ^3.24.1, `react-hook-form` ^7.54.1, `jose` ^5.10.0 (JWT)
- `@composio/core` ^0.6.3, `@openai/agents` ^0.4.10, `mcp-linear` ^0.1.8

**Scripts (`package.json`)**
- `dev`: `prisma generate && next dev --webpack`
- `build`: `next build`
- `start`: `next start`
- `lint`: `eslint src`
- `type-check`: `tsc --noEmit`
- `test`: `vitest run`
- `test:e2e`: `playwright test`
- `test:lighthouse`: `lhci autorun`
- `check`: `type-check && lint`; `check:all`: adds `test`
- `db:generate`: `prisma generate`; `db:migrate`: `prisma migrate dev`; `db:push`: `prisma db push`
- `postinstall`: `prisma generate`

**Apps (declared)**
- `apps/web` — empty (no `package.json`, no `src/`). Role unclear; possibly placeholder for a future split.
- `apps/backend` — Python service skeleton (Alembic, FastAPI-style folders) without an installable manifest. Not wired into Next.js build.
- The real app is the root-level Next.js project. The `apps/`/`packages/` dirs appear to be unused scaffolding.

## 2. Build health

### `npx tsc --noEmit` — **FAIL**

87 TypeScript errors total. All concentrated in inventory + Cin7 BOM Prisma model usage. Representative first errors:

```
src/app/api/inventory/adjust/route.ts(59,28): error TS2339: Property 'productLocationStock' does not exist on type 'Omit<PrismaClient...>'.
src/app/api/inventory/adjust/route.ts(71,16): error TS2339: Property 'productLocationStock' does not exist on type ...
src/app/api/inventory/auto-reorder/route.ts(61,9): error TS2353: Object literal may only specify known properties, and 'locationStocks' does not exist in type 'ProductSelect<DefaultArgs>'.
src/app/api/inventory/auto-reorder/route.ts(86,9): error TS2353: Object literal may only specify known properties, and 'locationStocks' does not exist in type 'ProductSelect<DefaultArgs>'.
src/app/api/inventory/auto-reorder/route.ts(105,50): error TS2339: Property 'locationStocks' does not exist on type '{ name: string; id: string; ... }'.
src/app/api/inventory/barcode/[code]/route.ts(47,9): error TS2353: Object literal may only specify known properties, and 'locationStocks' does not exist in type 'ProductSelect<DefaultArgs>'.
src/app/api/inventory/barcode/[code]/route.ts(55,48): error TS2339: Property 'locationStocks' does not exist ...
src/app/api/inventory/by-location/route.ts(51,9): error TS2353: ... 'locationStocks' does not exist ...
src/app/api/inventory/by-location/route.ts(56,44): error TS2339: ...
src/app/api/inventory/low-stock/route.ts(30,9): error TS2353: ...
src/app/api/inventory/low-stock/route.ts(53,44): error TS2339: ...
src/app/api/inventory/product/[productId]/locations/route.ts(41,31): error TS2339: Property 'productLocationStock' does not exist ...
src/app/api/inventory/product/[productId]/locations/route.ts(45,37): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/app/api/inventory/product/[productId]/locations/route.ts(49,24): error TS2339: Property 'quantity' does not exist on type '{}'.
src/app/api/inventory/product/[productId]/locations/route.ts(50,27): error TS2339: Property 'reserved' does not exist on type '{}'.
src/app/api/inventory/product/[productId]/locations/route.ts(56,27): error TS2339: Property 'reorderPoint' does not exist on type '{}'.
src/app/api/inventory/product/[productId]/locations/route.ts(57,30): error TS2339: Property 'reorderQuantity' does not exist on type '{}'.
src/app/api/inventory/release/[id]/route.ts(20,38): error TS2339: Property 'stockReservation' does not exist ...
src/app/api/inventory/release/[id]/route.ts(33,28): error TS2339: Property 'productLocationStock' does not exist ...
src/app/api/inventory/release/[id]/route.ts(39,18): error TS2339: Property 'productLocationStock' does not exist ...
src/app/api/inventory/release/[id]/route.ts(44,16): error TS2339: Property 'stockReservation' does not exist ...
src/app/api/inventory/reorder-alerts/route.ts(27,9): error TS2353: ...
src/app/api/inventory/reorder-alerts/route.ts(80,44): error TS2339: ...
src/app/api/inventory/reorder-rules/route.ts(24,18): error TS2353: ...
src/app/api/inventory/reorder-rules/route.ts(38,27): error TS2339: ...
src/app/api/inventory/reorder-rules/route.ts(108,17): error TS2339: ...
src/app/api/inventory/reorder-settings/[productId]/[location]/route.ts(55,16): error TS2339: ...
src/app/api/inventory/reservations/route.ts(26,25): error TS2694: Namespace 'Prisma' has no exported member 'StockReservationWhereInput'.
src/app/api/inventory/reservations/route.ts(45,14): error TS2339: Property 'stockReservation' does not exist ...
src/app/api/inventory/reservations/route.ts(52,14): error TS2339: Property 'stockReservation' does not exist ...
```

Pattern: stale `@prisma/client` generated output — schema declares `ProductLocationStock`, `StockReservation`, `StockTransfer`, `InventoryStockTake`, `InventoryStockTakeLine`, `Cin7BomMaster`, `Cin7BomComponent`, `Cin7ProductionRun` (added in migrations dated 2026-05-10 / 2026-05-11 / 2026-05-12) but the installed Prisma client in `node_modules/.prisma/client` does not include them. `npm install` / `prisma generate` has not been run after the latest migrations landed.

### `npm run lint` — **FAIL**

`✖ 68 problems (36 errors, 32 warnings)` across 31 files. Last lines:

```
✖ 68 problems (36 errors, 32 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

Mix of `@typescript-eslint/no-explicit-any` warnings and unspecified ESLint errors (full breakdown not parsed here).

### `npm run build` — **FAIL**

Next.js compiled assets OK (`✓ Compiled successfully in 8.3s`) but failed at type-checking. Last 20 lines:

```
▲ Next.js 16.1.6 (Turbopack)

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
  Creating an optimized production build ...
✓ Compiled successfully in 8.3s
  Running TypeScript ...
Failed to compile.

./src/app/api/inventory/adjust/route.ts:59:28
Type error: Property 'productLocationStock' does not exist on type 'Omit<PrismaClient<...>, ...>'.

 57 |     await prisma.$transaction(async (tx) => {
 58 |       await ensureProductLocationStockRows(tx, product);
> 59 |       const row = await tx.productLocationStock.findUniqueOrThrow({
    |                            ^
 60 |         where: { productId_location: { productId: product.id, location } },
 61 |       });
 62 |       const nextQty = row.quantity + quantityChange;

Next.js build worker exited with code: 1 and signal: null
```

Same root cause as tsc — stale Prisma client.

### `npm test` — **PASS**

`vitest run` summary:

```
 Test Files  3 passed (3)
      Tests  52 passed (52)
   Duration  1.27s
```

## 3. Database / Prisma schema

`prisma/schema.prisma` — 736 lines, PostgreSQL, `prisma-client-js` generator.

**Enums**: `TeamRole { owner, admin, member, billing }`

**Models** (37 total):

| Model | Key fields | Relations |
|---|---|---|
| `AppUser` | email (unique), passwordHash, role, isAdmin, workspaceId, passwordReset* | — |
| `Customer` | ownerUserId, companyName, contactName, email, phone, isActive | orders, quotes, invoices, persona |
| `CustomerPersona` | customerId (unique), persona, confidence, reason | Customer |
| `Product` | ownerUserId, name, sku, category, price, stock, warehouseLocation, isActive; unique(ownerUserId, sku) | orderLineItems, purchaseOrderLines, quoteLineItems, posTransactionLines, goodsReceiptLines, invoiceLineItems, locationStocks, stockTransfers, stockReservations, inventoryStockTakeLines |
| `Cin7BomMaster` | ownerUserId, cin7BomId, name, sku, version, status, finishedGoodSku, quantityProduced, uom | components, productionRuns |
| `Cin7BomComponent` | bomMasterId, componentSku, componentName, quantity, uom, wastagePercent | Cin7BomMaster |
| `Cin7ProductionRun` | bomMasterId, cin7ProductionId, quantityPlanned/Completed, status, plannedDate, completedDate, locationId, cin7Synced | Cin7BomMaster |
| `ProductLocationStock` | productId, location, quantity, reserved, reorderPoint, reorderQuantity, leadTimeDays, autoApproveUnderQty, reorderEnabled; unique(productId, location) | Product |
| `StockReservation` | ownerUserId, productId, orderId, location, quantity, status, reservedAt, expiresAt, fulfilledAt, cancelledAt | Product |
| `InventoryStockTake` | ownerUserId, location, status, submittedAt | lines |
| `InventoryStockTakeLine` | takeId, productId, countedQty; unique(takeId, productId) | InventoryStockTake, Product |
| `StockTransfer` | ownerUserId, productId, fromLocation, toLocation, quantity, status, reason | Product |
| `Order` | ownerUserId, customerId, orderNumber, status, total | Customer, OrderLineItem, Invoice |
| `OrderLineItem` | orderId, productId, quantity, unitPrice, lineTotal | Order, Product |
| `Quote` | ownerUserId, customerId, quoteNumber, status, total, validUntil, notes | Customer, QuoteLineItem |
| `QuoteLineItem` | quoteId, productId, quantity, unitPrice, lineTotal | Quote, Product |
| `Invoice` | ownerUserId, invoiceNumber, customerId, orderId?, invoiceDate, dueDate, status, subtotal, taxTotal, total, amountPaid; unique(ownerUserId, invoiceNumber) | Customer, Order?, items, payments |
| `InvoiceLineItem` | invoiceId, productId?, description, quantity, unitPrice, taxRate, taxAmount, lineSubtotal, lineTotal | Invoice, Product? |
| `InvoicePayment` | invoiceId, amount, paymentDate, paymentMethod, referenceNumber | Invoice |
| `EmailThread` | ownerUserId, subject, customerEmail, customerName, status, intent, lastMessageAt | messages |
| `EmailMessage` | threadId, direction, fromEmail, toEmail, subject, bodyText, bodyHtml, sendgridMessageId, sentAt, wasAiGenerated | EmailThread |
| `Supplier` | ownerUserId, supplierCode (unique per owner), companyName, contactName, email, phone, isActive | purchaseOrders |
| `PurchaseOrder` | ownerUserId, poNumber (unique per owner), supplierId, deliveryLocation, status, orderDate, expectedDeliveryDate, actualDeliveryDate, subtotal, tax, shippingCost, total | Supplier, lines |
| `PurchaseOrderLine` | purchaseOrderId, productId, quantity, quantityReceived, unitCost, subtotal | PurchaseOrder, Product |
| `PosTransaction` | ownerUserId?, transactionNumber (unique), terminalId, locationCode, salesStaffId?, paymentMethod, paymentStatus, subtotal, tax, amount, reconciliationStatus | lines |
| `PosTransactionLine` | posTransactionId, productId, quantity, unitPrice, lineTotal | PosTransaction, Product |
| `BankAccount` | ownerUserId?, accountName, accountNumber, bsb, bankName, accountType, feedProvider, isActive, locationCode | feedTransactions |
| `BankFeedTransaction` | bankAccountId, transactionDate, description, reference, credit, debit, balance, reconciled, matchedPosTxId | BankAccount |
| `ContactSubmission` | name, email, phone, subject, message, source, status | notes |
| `DemoRequest` | name, email, company, phone, message, preferredDate, status | notes |
| `SubmissionNote` | contactSubmissionId?, demoRequestId?, noteType, content, createdBy | ContactSubmission?, DemoRequest? |
| `SalesFulfilment` | ownerUserId?, cin7OrderMappingId, cin7FulfilmentId, orderReference, status, pickLocation, trackingNumber, carrier, shippedAt, deliveredAt | — |
| `SalesInvoice` | ownerUserId?, cin7OrderMappingId, cin7InvoiceId, invoiceNumber, invoiceDate, dueDate, amount, currency, status, paidAt, orderReference | payments |
| `SalesPayment` | salesInvoiceId?, cin7InvoiceId, cin7PaymentId, paymentMethod, amount, currency, paymentDate, reference, status | SalesInvoice? |
| `GoodsReceipt` | ownerUserId?, cin7PoMappingId, poReference, supplierName, receivedBy, receivedDate, locationId, status, cin7ReceiptId, totalItemsReceived, confirmedAt, syncedAt | lines |
| `GoodsReceiptLine` | goodsReceiptId, productId?, sku, productName, orderedQty, receivedQty, putAwayLocation, batchNumber, expiryDate, condition | GoodsReceipt, Product? |
| `AgentRun` | agentType, status, errorMessage, completedAt | — |

**`prisma format`** → exit 0 (`Formatted prisma/schema.prisma in 30ms 🚀`). File content was rewritten (the audit was meant to be read-only; format succeeded and may have made cosmetic changes — flagged here but no source files modified beyond schema formatting if any).

**`prisma validate`** → exit 0 (`The schema at prisma/schema.prisma is valid 🚀`).

**TODO comments / commented-out fields in schema**: only one structural comment found (`/// All users in one org share the same workspace id (typically the first owner's user id).` at line 24). No FIXME / TODO markers in schema.

**Migrations** (`prisma/migrations/`, 19 directories):
- `20260104180000_init`
- `20260417183625_initialize_schema`
- `20260423120000_add_order_line_items`
- `20260423182215_update_order_related_endpoints`
- `20260423220341` (unnamed)
- `20260424130000_operations_modules`
- `20260424150000_submission_notes_and_sales_fulfilment`
- `20260428130424` (unnamed)
- `20260428180000_add_team_role_to_app_users`
- `20260430114000_enforce_owner_data_isolation`
- `20260509114227_add_owner_user_id_extension_tables`
- `20260509120000_backfill_extension_owner_user_ids`
- `20260509130000_customer_personas`
- `20260509160000_app_users_workspace_id`
- `20260509180357_update_database_schema`
- `20260509190000_email_threads_and_invoice_payments`
- `20260510120000_product_location_stock_and_transfers`
- `20260511130000_inventory_reservations_reorder_stock_take`
- `20260512183000_cin7_bom_tables`

`migration_lock.toml` → `provider = "postgresql"`.

Schema-vs-client drift: the last 3 migrations (`product_location_stock_and_transfers`, `inventory_reservations_reorder_stock_take`, `cin7_bom_tables`) are present in `prisma/schema.prisma` but absent from the generated Prisma client — root cause of the 87 tsc errors.

## 4. API routes

**Total route files**: 223 under `src/app/api/`.

Routes are listed in topical groups below. Each group entry summarises HTTP methods and purpose. Where a route calls an external service, that's noted.

### auth (`src/app/api/auth/`)
- `login/route.ts` — POST; email+password → JWT token pair via `signTokenPair`. **No auth gate** (intentional).
- `logout/route.ts` — POST; clears auth session cookies. **No auth gate** (intentional).
- `refresh/route.ts` — POST; refresh JWT pair. **No auth gate by header** (uses refresh-token cookie).
- `me/route.ts` — GET, PATCH; current user; gated by `getAuthClaimsFromRequest`.
- `register/route.ts` — POST; new AppUser. **No auth gate** (intentional sign-up).
- `change-password/route.ts` — gated.
- `forgot-password/route.ts` — POST; emails reset token; **no auth** (intentional).
- `reset-password/route.ts` — POST; consumes reset token; **no auth** (intentional).

### activities, agents, ai
- `activities/route.ts`, `activities/stats/route.ts` — **no auth gate found**.
- `agents/{insights,list,patterns,stats,tasks/recent}/route.ts` — proxy to `API_UPSTREAM_URL` via `requireUpstreamBase`. **No per-request user-auth gate**, relies on upstream.
- `ai/copilot/quote/route.ts` — POST → **OpenAI** (`https://api.openai.com/v1/chat/completions`, model env `OPENAI_QUOTE_COPILOT_MODEL` default `gpt-4o-mini`); reads `OPENAI_API_KEY`. **No auth gate**.
- `ai/cin7-anomaly/sync-health`, `ai/insights/{dashboard,sales}`, `ai/inventory-forecast`, `ai/patterns/orders` — **no auth gate found**.

### analytics, autonomy, backorders, bank-feeds
- `analytics/metrics/overview/route.ts` — gated.
- `autonomy/{anomalies,health,metrics}/route.ts` — **no auth gate**.
- `backorders/route.ts` — **no auth gate**.
- `bank-feeds/accounts/[id]/route.ts`, `bank-feeds/accounts/route.ts`, `bank-feeds/alerts`, `bulk-reconcile`, `export`, `reconcile`, `stats`, `sync`, `unreconciled` — gated.

### boardroom, ccw, cin7
- `boardroom/cron/route.ts` — GET; gated by `Authorization: Bearer ${CRON_SECRET}`; POSTs to `/api/boardroom/session` upstream. Optional **Slack** webhook via `SLACK_WEBHOOK_URL`.
- `ccw/products/route.ts` — proxies **Shopify**-style product feed. **No auth gate**.
- `ccw/summary/route.ts` — **no auth gate**.
- `cin7/bom/{master/[bomId],production-runs/{[id]/status,},sync}` — Cin7 BOM CRUD. Gated.
- `cin7/fulfilments/{[id]/status,}`, `cin7/goods-receipts/...`, `cin7/invoices/...`, `cin7/payments/...` — most gated.

### config, contact-submissions, contacts, containers
- `config/business/route.ts` — gated.
- `contact-submissions/{[id]/{status,},}` — **no auth gate** for `route.ts` POST (intentional submission endpoint), gated for others.
- `contacts/route.ts` — empty stub returning `{ data: [], total: 0, page: 1, page_size: 50, total_pages: 0 }`. **No auth gate**.
- `containers/route.ts` — **no auth gate**.

### crm, cron, customers, dashboard, demo-requests
- `crm/personas/{classify-all,}` — gated.
- `cron/{auto-reorder-inventory,check-expiring-quotes,check-sla-breaches,cleanup-old-runs,daily-report,health-check,nightly-full-sync,process-onboarding-emails,refresh-health-scores,refresh-xero-tokens,retry-failed-webhooks,run-autonomous-ops,shadow-sync-cin7,shadow-sync-xero}` — all gated by `CRON_SECRET` Bearer header.
- `customers/route.ts` — gated.
- `dashboard/{aggregated,metrics-stream,order-status-breakdown,quote-conversion,revenue-by-location}/route.ts` — `metrics-stream` is an Edge SSE stream with **no auth gate**; others gated.
- `demo-requests/{[id]/{status,},}` — **no auth gate** (intentional public lead intake).

### health, integrations
- `health/route.ts`, `health/routes/route.ts` — **no auth gate** (intentional).
- `integrations/ap2/{mandates/{[mandateId]/verify,cart,intent,payment,},payments/{[transactionId],execute},transactions,voice/sessions/{[sessionId]/input,}}/route.ts` — **all are `notImplementedResponse('AP2', ...)` stubs**. **No auth gate** because no body.
- `integrations/cin7/{configure,connect,disconnect,poll,poll/status,status,stream,stream/stats,sync/[entityType]}/route.ts` — calls Cin7 Omni/Core REST APIs. **Most are not auth-gated** at the request-level (rely on cookie/session via `next-cookies`).
- `integrations/diagnostics/route.ts` — **no auth gate**.
- `integrations/heygen/{avatars,generate,quota,status/[videoId],voices}/route.ts` — **all `notImplementedResponse('HeyGen', ...)` stubs**.
- `integrations/sendgrid/{configure,conversations,conversations/[conversationId],demo/simulate-inbound,disconnect,send,status}/route.ts` — calls **SendGrid** REST API (`api.sendgrid.com/v3`); auth varies (`send` requires `requireAuthScope`; `configure`/`status`/`disconnect` are cookie-driven configuration).
- `integrations/shopify/{authorize,callback,configure,connect,disconnect,import-order/[orderId],import-orders,status,sync-all-inventory,sync-inventory/[productId],sync-product/[productId]}/route.ts` — **Shopify** OAuth flow + sync. `import-orders`, `sync-all-inventory`, etc. gated by `CRON_SECRET`.
- `integrations/xero/{auth,authorize,callback,disconnect,invoice/[orderId],status,sync-all,sync-order/[orderId]}/route.ts` — **Xero** OAuth + invoice sync. `sync-all` / `sync-order` gated by `CRON_SECRET`.

### inventory
- `inventory/route.ts` and ~25 child routes (`adjust`, `auto-reorder`, `barcode/[code]`, `by-location`, `low-stock`, `product/[productId]/locations`, `release/[id]`, `reorder-alerts`, `reorder-rules`, `reorder-settings/[productId]/[location]`, `reservations`, `reserve`, `stock-health`, `stock-take/[takeId]/submit`, `stock-take`, `stock-takes`, `summary`, `transfer-suggestions`, `transfer`, `transfers/[id]`, `transfers/[id]/status`, `transfers`) — all gated (typically `requireAuthScope`); **all currently fail tsc compile** due to stale Prisma client (Section 2).
- `inventory-stream/route.ts` — Edge SSE; **no auth gate**.

### invoices, monitoring, orders, pos, products, public, purchase-orders, quotes, shadow, submissions, suppliers, team, telemetry, warehouse, webhooks, workflows
- `invoices/{[id]/{cancel,payments,send,},reports/{bas,revenue,tax},}` — gated.
- `monitoring/{alerts/{pos-failures/{stream,},},health,metrics,range}` — **no auth gate found**.
- `orders/{[id]/{activity,status,},}` — gated, except `[id]/activity` which is uncovered.
- `pos/{locations/{[id],},sales-staff,staff/{[id],},terminals/{[id],},transactions,xero/bulk-invoices}` — pos staff/terminals/locations routes mostly **lack the standard auth gate**.
- `products/route.ts` — gated.
- `public/stats/route.ts` — **intentionally public**, **no auth gate**.
- `purchase-orders/{[id]/{items/[itemId]/receive,},}` — gated.
- `quotes/{[id]/{convert-to-order,},}` — gated.
- `shadow/{ai-opportunities,comparison,daily-stats,gaps,patterns,readiness-score,session/{[sessionId]/end,},status,transition-report}` — all gated by `requireShadowAuth`.
- `submissions/{[type]/[id]/notes,statistics}` — **no auth gate**.
- `suppliers/route.ts` — gated.
- `team/{[userId]/{role,},invite,}` — gated.
- `telemetry/route.ts` — **no auth gate** (intentional ingestion endpoint).
- `warehouse/ops/route.ts` — gated.
- `webhooks/route.ts` — validates optional `WEBHOOK_SECRET` via `x-webhook-signature` (signature check stubbed; comment: "Add your signature validation logic here"). Effectively **no enforced auth** today.
- `workflows/{[id]/{execute,},instances,route.ts,templates/{[id],}}` — proxy to `API_UPSTREAM_URL`. **No per-request user-auth gate**.

### External-service touchpoints per route (summary)
- **OpenAI**: `api/ai/copilot/quote/route.ts`
- **SendGrid**: all `api/integrations/sendgrid/*` and `api/integrations/sendgrid-mail.ts` helper
- **Shopify**: all `api/integrations/shopify/*` and `api/ccw/products/route.ts` (consumes Shopify product JSON)
- **Xero**: all `api/integrations/xero/*`
- **Cin7 Omni / Cin7 Core**: all `api/integrations/cin7/*`, `api/cin7/*`
- **Slack** (webhook only): `api/boardroom/cron/route.ts`
- **HeyGen**: `api/integrations/heygen/*` (all stubs, not implemented)
- **AP2**: `api/integrations/ap2/*` (all stubs, not implemented)

### Routes WITHOUT auth gates (flagged)

Total: 91 of 223 route files contain none of `requireAuth`, `getCurrentUser`, `getAuthClaimsFromRequest`, `requireAuthScope`, `requireSessionUser`, `requireShadowAuth`, `requireUpstreamBase`, `CRON_SECRET` (or `authorization` header check). Sample (verified against intentional public routes):

Public-by-design: `auth/{login,logout,refresh,register,forgot-password,reset-password}`, `health/{route,routes/route}`, `demo-requests/*`, `contact-submissions/route` (POST), `public/stats`, `telemetry`, `webhooks` (stub), `inventory-stream`, `dashboard/metrics-stream`, all `integrations/heygen/*` stubs, all `integrations/ap2/*` stubs.

**Likely unintentional gaps** (need triage by Wave B): `contacts/route.ts`, `containers/route.ts`, `backorders/route.ts`, `autonomy/{health,metrics,anomalies}`, `monitoring/{health,metrics,range,alerts,alerts/pos-failures/{stream,}}`, `submissions/{statistics,[type]/[id]/notes}`, `pos/{locations,locations/[id],staff,staff/[id],terminals,terminals/[id],sales-staff}`, `activities/{route,stats}`, `ai/{copilot/quote,cin7-anomaly/sync-health,insights/dashboard,insights/sales,inventory-forecast,patterns/orders}`, `ccw/{products,summary}`, `cin7/fulfilments/[id]/status`, `integrations/cin7/{connect,disconnect,configure,status,poll,poll/status,stream,stream/stats}`, `integrations/diagnostics`, `integrations/sendgrid/{configure,status,disconnect}`, `integrations/shopify/{authorize,callback,configure,connect,disconnect,status}`, `integrations/xero/{auth,authorize,callback,disconnect,status}`, `orders/[id]/activity`.

Cron routes (`api/cron/*`) all gate via `CRON_SECRET` correctly.

## 5. Pages / UI surfaces

Total: **155 page files** under `src/app/`. Grouped by route group:

### `(auth)` (5)
- `/forgot-password`, `/login`, `/onboarding`, `/register`, `/reset-password` — public auth flows.

### `(dashboard)` (~115)
- `/activities`, `/agents`, `/ai-assistant`, `/ai-ops`, `/ai-query`, `/alerts`, `/approvals`, `/autonomous-dev`, `/autonomous`, `/backorders`, `/bank-feeds`, `/contacts`, `/contacts/[id]`, `/containers`, `/containers/[id]`, `/contractors`, `/customers`, `/customers/[id]`, `/customers/health`, `/customers/onboarding`, `/customers/personas`.
- `/dashboard/ai-reports/{ai-assistant,ai-ops,ai-query,insights,marketing,marketplace,prd/[id],prd/generate,reports}`.
- `/dashboard/crm/{activities,client-health,contacts,contacts/[id],contractors,customers,customers/[id],onboarding,page,personas,service-requests}`.
- `/dashboard/finance/{bank-feeds,emails,invoices,invoices/[id],invoices/bas}`.
- `/dashboard/inventory/{backorders,bom,containers,containers/[id],forecast,page,products,products/[id],reservations,stock,transfers,transfers/[id],warehouse}`.
- `/dashboard/operations/{fulfilment,orders,orders/[id]/invoice,pos,pos/locations,pos/reconciliation,pos/staff,pos/terminal,purchase-orders,purchase-orders/receiving,quotes,quotes/generate,submissions}`.
- `/dashboard/page`, `/dashboard/workflows`.
- `/dashboard/workshop/{equipment,equipment/[id],page,reminders,schedule,templates}`.
- Plus duplicate top-level mirrors: `/demo-live`, `/demo`, `/emails`, `/faq`, `/insights`, `/inventory/{bom,forecast,reservations,stock,transfers,transfers/[id],page}`, `/invoices/{bas,[id],page}`, `/marketing`, `/marketplace`, `/monitoring`, `/prd/{[id],generate}`, `/products/{[id],page}`, `/reconciliation`, `/reports`, `/service-requests`, `/settings/{account,billing,company,integrations,integrations/ap2,integrations/gl,integrations/marketplace,integrations/shadow,mobile,onboarding,onboarding/wizard,page,setup,shadow,team,translations,welcome}`, `/shipments`, `/suppliers`, `/tasks`, `/warehouse`, `/workflows`, `/workshop/{equipment,equipment/[id],page,reminders,schedule,templates}`.

**Observation**: heavy duplication — the dashboard has both top-level (`/inventory/page`, `/products`, `/invoices`, `/workshop/*`) and nested (`/dashboard/inventory/*`, `/dashboard/operations/*`, `/dashboard/workshop/*`) trees representing the same data domains. Two parallel IA structures coexist.

### `(guest)` (1)
- `/order/[token]` — token-gated guest order page.

### `(marketing)` (1)
- `/contact` — marketing contact page.

### `(marketing-pages)` (6)
- `/features`, `/how-it-works`, `/pricing`, `/privacy`, `/product`, `/terms`.

### `(mobile)` (1)
- `/order/new` — mobile order intake.

### `(portal)` (5)
- `/portal`, `/portal/{certifications,invoices,orders,service}`.

### `(supplier)` (2)
- `/supplier`, `/supplier/orders`.

### Top-level (5)
- `/` (page.tsx), `/dashboard-analytics`, `/demo/i18n`, `/design-system`, `/playground`.

### Broken imports (`@/` paths)

`tsc --noEmit` reports 87 errors. **None are `TS2307 "Cannot find module"`** — i.e., no broken `@/` import paths detected. All errors are Prisma client member-resolution failures (`TS2339`, `TS2353`, `TS2694`, `TS2305`) caused by stale generated client. No missing source modules.

## 6. Env vars referenced

**Code references** (unique `process.env.X` in `src/`): 66.

**`.env.example` keys**: 172 (single template file; `.env.example` is 1236 lines including comments).

### Referenced in code but NOT in `.env.example` (23)

```
AI_EMAIL_AUTO_RESPONSE
AI_EMAIL_CONFIDENCE_THRESHOLD
API_UPSTREAM_URL
AUTH_DEV_EXPOSE_RESET_TOKEN
BUSINESS_QUOTE_VALIDITY_DAYS
BUSINESS_TAX_NAME
BUSINESS_TAX_RATE
CIN7_CORE_API_BASE_URL
CIN7_POLLING_ENABLED
CRON_INTEGRATION_USER_ID
JWT_ACCESS_EXPIRES
JWT_REFRESH_EXPIRES
NEXT_PUBLIC_APP_URL
OPENAI_QUOTE_COPILOT_MODEL
SENDGRID_MODE
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
SHOPIFY_MY_SHOPIFY_DOMAIN
SHOPIFY_REDIRECT_URI
SHOPIFY_SCOPES
VERCEL_URL
XERO_REDIRECT_URI_LOCAL
XERO_REFRESH_TOKEN
```

### Cross-cut observations
- `.env.example` declares `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS`, `ANTHROPIC_TEMPERATURE`, `AP2_*`, `COMPOSIO_API_KEY`, `AUSPOST_API_KEY`, `AWS_*`, etc., but **none of these are referenced by `process.env.*` in the Next.js source.** They appear to be carried over from the (vestigial) Python backend or aspirational.
- `LINEAR_*`, `TELEGRAM_*`, `PI_CEO_*`, `UNITE_GROUP_*`, `STRIPE_*`, `RESEND_*`, `SUPABASE_*` env vars: **zero references in `src/`**.
- `SLACK_WEBHOOK_URL` is referenced in `src/app/api/boardroom/cron/route.ts:93`.

## 7. Tests

- **Unit test files**: 3 (`find src -name '*.test.ts'`).
  - `src/lib/utils.test.ts`
  - `src/lib/utils/calculations.test.ts`
  - `src/lib/integrations/not-implemented-response.test.ts`
- **e2e tests** (`find e2e tests/e2e -name '*.spec.ts'`): **0**. Playwright is a declared devDep and `npm run test:e2e` is wired to `playwright test`, but no spec files exist.
- **vitest run**: `Test Files 3 passed (3) / Tests 52 passed (52)` in 1.27s.

Representative test names:
- `src/lib/utils.test.ts:6` — `it("should merge class names", () => { expect(cn("foo", "bar")).toBe("foo bar"); })`
- `src/lib/utils/calculations.test.ts:17` — `test("basic calculation", () => { const result = calculateLineTotal(5, 10.0); expect(result).toBe(50.0); })`
- `src/lib/integrations/not-implemented-response.test.ts:5` — `it('returns 501 with code', async () => { ... expect(body.code).toBe('not_implemented'); })`

Coverage is effectively limited to: `cn()` helper (3 tests), pricing/calculation math (48 tests), and the not-implemented response wrapper (1 test). 220+ API routes, 155 pages, and all auth/RBAC, Prisma persistence, and integration flows are **completely untested**.

## 8. Open TODOs / FIXMEs / placeholders

Initial scan with `grep -rEn "TODO|FIXME|XXX|placeholder|not-yet-implemented|wip|coming soon"` returned 60+ hits dominated by HTML `placeholder=` attributes on form inputs (non-issue) and Australian format hints (`04XX XXX XXX`, `XX XXX XXX XXX`). After filtering those out, **genuine code TODO markers are sparse**:

| File:line | Marker | Note |
|---|---|---|
| `src/app/api/agents/stats/route.ts:53` | TODO | `avg_iterations: 1.5, // TODO: Calculate from execution metadata` |
| `src/app/api/cron/health-check/route.ts:42` | TODO | `// TODO: Send alert to monitoring service (e.g., PagerDuty, Slack)` |
| `src/app/(dashboard)/inventory/reservations/page.tsx:203` | TODO | `// TODO: Navigate to order detail page once it exists` |
| `src/app/(dashboard)/inventory/transfers/page.tsx:162` | TODO | `// TODO: Implement cancel endpoint` |
| `src/app/(dashboard)/inventory/transfers/page.tsx:165` | coming soon | `description: "Cancel transfer functionality coming soon"` |
| `src/app/(dashboard)/settings/mobile/page.tsx:129` | coming soon | `description: 'Request customer link feature coming soon'` |
| `src/lib/agents/independent-verifier.ts:92–104, 333, 374` | TODO/FIXME (regex) | These are regex patterns scanning for "TODO/FIXME/TBD/INSERT" in agent-generated output (the auditor itself), not actual TODOs in source. |

**Clusters**: no single file has >3 actionable TODOs. The verifier (`independent-verifier.ts`) has 16 hits but they are search-pattern definitions, not project debt.

**Other placeholders worth noting**:
- `src/app/api/webhooks/route.ts:14–18` — signature validation stub: `// Add your signature validation logic here / // Example: const isValid = validateSignature(body, signature, webhookSecret);`
- `src/app/api/cron/health-check/route.ts:27–28` — `// Check Supabase (optional - can add if needed) / // const supabaseHealthy = await checkSupabaseHealth();`

## 9. Recent commit activity

`git log --oneline -20` (most recent first):

```
fb00a907 merge: adopt .claude/DESIGN.md + CI lint
2d58332e feat(design-md): adopt .claude/DESIGN.md + CI lint
1d208774 fix(cin7): BOM routes and PostgreSQL-backed catalog sync
843a6023 api: Cin7 production runs list, create, and status patch
b187f4c9 api: GET /api/cin7/bom/:bomId BOM detail
65725b76 api: GET /api/cin7/bom and POST /api/cin7/bom/sync
6c5c4cbd cin7: in-memory BOM and production run store per user
85ca5df8 api: warehouse ops metrics from purchase orders and open orders
f2216f80 client: map transfer-suggestions response for inventoryApi
495b9d4a api: GET /api/inventory/reservations paginated list
745770ca api: GET /api/inventory/transfer-suggestions rebalance hints
5b7ab4da api: GET /api/inventory/stock-health multi-location buckets
31631939 api: GET /api/inventory paginated catalog with filters
51339b5c api: GET /api/inventory/transfers paginated workspace list
01a12494 api: POST /api/inventory/transfers/:id/status update transfer state
845909a7 api: GET /api/inventory/transfers/:id transfer detail
ad641b6e api: POST /api/inventory/transfer between warehouses
9e5c2102 api: GET /api/inventory/product/:id/locations with reorder fields
ad489b84 api: POST /api/inventory/stock-take/:id/submit apply counts
3eb60fd7 api: GET /api/inventory/stock-takes list takes
```

`git log --since='30 days ago'` returns ~80+ commits, all dated 2026-05-10 or 2026-05-11, all themed around inventory / Cin7 / SendGrid / invoices / customer personas / autosave-removal. Pattern: dense single-day burst of feature/route additions (likely an agent-driven sweep).

**Flagged commit messages** (`wip`, `checkpoint`, `broken`, `revert`, `fix(temp)`): scanning the 30-day window — none of these exact tokens appear in commit subjects. However:
- `71633322 fix(deps): unblock CI via legacy-peer-deps (#150)` (2026-05-10) — CI-unblocking workaround.
- Multiple `chore(hooks): remove useAutosave hook` / `refactor(*): remove draft restore autosave from * form` (2026-05-10) — a coordinated removal sweep across 6+ forms (suppliers, shipments, products, quotes, purchase-orders, orders, customers) suggesting a recent rollback of an autosave feature.

## 10. Connection inventory

For each external system below, verdict + citation.

### Stripe payments — **referenced in docs but no code**
- No `import Stripe`, no `new Stripe(...)`, no `stripe.checkout|customers|subscriptions|paymentIntents` calls anywhere in `src/`.
- The only "stripe" hits are: one occurrence inside `src/app/(dashboard)/settings/billing/page.tsx` (string only — UI listing) and inside `src/components/landing/pages/privacy-public-page.tsx` (privacy-policy text). The Billing page uses `billingApi` from `@/lib/api/billing` against an internal API, not Stripe SDK.
- `STRIPE_*` env vars: not in `.env.example`, not referenced in code.

### Resend / SMTP email — **not started**
- No `resend` import or `RESEND_*` env reference anywhere in `src/`.
- Outbound email is handled exclusively by **SendGrid** (see below).

### Supabase database — **referenced in docs but no code**
- No `@supabase/supabase-js` import in `src/`.
- Only mention: `src/app/api/cron/health-check/route.ts:27–28` — commented-out: `// Check Supabase (optional - can add if needed) / // const supabaseHealthy = await checkSupabaseHealth();`
- The `createClient` mention in `src/lib/api/client.ts:362` is the project's own `createClient` factory (`export function createClient() { ... }`), not Supabase.
- Database access is via **Prisma + PostgreSQL** (raw `pg`), `DATABASE_URL`.

### Auth — **wired live (custom JWT + cookies)**
- Custom JWT implementation using `jose`. Files: `src/lib/auth/{jwt-tokens,session-cookies,update-session,app-user-repo,password,schemas,http,request-token,data-scope,workspace-scope,team-repo,map-user}.ts`.
- No NextAuth, no Clerk, no Supabase Auth.
- Middleware `src/middleware.ts:7` — `import { updateSession } from "@/lib/auth/update-session";` runs on every request.
- Login: `src/app/api/auth/login/route.ts:8` — `import { signTokenPair } from '@/lib/auth/jwt-tokens';` issues access + refresh tokens.

### Linear (project management) — **referenced but not active**
- `mcp-linear@^0.1.8` declared in `package.json` dependencies.
- **Zero imports** of `mcp-linear` or `@linear/sdk` in `src/`. No `LINEAR_API_KEY` referenced.

### Vercel (deploy config + env) — **wired live**
- `.vercel/project.json`: `{"projectId":"prj_oTCifkMVqP1NFoTJFBv6u82JmBYd","orgId":"team_KMZACI5rIltoCRhAtGCXlxUf","projectName":"ccw-crm-web"}`.
- No `vercel.json` at repo root (cron schedules / rewrites / headers configured elsewhere, e.g., in the Vercel UI or via `next.config.ts`).
- Build runs Next.js 16 with Turbopack. `process.env.VERCEL_URL` referenced in code.

### Telegram (notifications) — **not started**
- No `node-telegram-bot-api`, no `grammy`, no `api.telegram.org` fetch in `src/`.
- "telegram" matches in src are all false positives (e.g., `sendMessage` in WebSocket hooks, not Telegram).
- No `TELEGRAM_*` env vars in code.

### Anthropic / OpenAI / Gemini (any LLM) — **partially wired (OpenAI only, env-gated)**
- **OpenAI: wired but env-gated**. `src/app/api/ai/copilot/quote/route.ts:49` — `const apiKey = process.env.OPENAI_API_KEY?.trim();` Returns 503 when missing. Calls `https://api.openai.com/v1/chat/completions` directly via `fetch` (no SDK), default model `gpt-4o-mini`.
- **Anthropic: referenced in docs but no code**. `@anthropic-ai/sdk` is **not** in `package.json` dependencies. `src/lib/tools/index.ts` documents "Claude API" usage in comments and JSDoc but does not import or call Anthropic. The Settings → Integrations UI shows an "Anthropic Claude" tile (`src/app/(dashboard)/settings/integrations/page.tsx:541–545`) but no backing route. `ANTHROPIC_API_KEY` listed in `.env.example` but not referenced in any `process.env.ANTHROPIC*` call in `src/`.
- **Gemini: not started**. No reference.
- **Composio / OpenAI Agents**: `@composio/core`, `@composio/openai-agents`, `@openai/agents` are dependencies but no `import` of them found in `src/` source. Likely planned, not wired.

### Pi-CEO API (`PI_CEO_API_KEY`) — **not started**
- Zero references to `PI_CEO_API_KEY` or any `PI_CEO_*` env var in `src/`.

### Unite-Group internal API (`UNITE_GROUP_*`) — **not started**
- Zero references to `UNITE_GROUP_*` env vars in `src/`.

### Additional integrations actually present (worth noting)
- **SendGrid: wired live (env-gated, cookie-overridable)**. `src/lib/integrations/sendgrid-mail.ts:1–50` defines `getSendGridApiKey`, `sendMailViaSendGrid`. Routes: `api/integrations/sendgrid/{send,configure,disconnect,status,conversations,demo/simulate-inbound}`.
- **Shopify: wired live (OAuth + REST)**. Full OAuth dance in `api/integrations/shopify/{authorize,callback,configure,connect,disconnect}`; sync routes import/sync inventory and orders.
- **Xero: wired live (OAuth + invoice sync)**. `api/integrations/xero/{auth,authorize,callback,disconnect,invoice/[orderId],sync-all,sync-order/[orderId]}`. Cron token refresh: `api/cron/refresh-xero-tokens`.
- **Cin7 Omni / Cin7 Core: wired live**. `api/integrations/cin7/{configure,connect,disconnect,poll,poll/status,status,stream,stream/stats,sync/[entityType]}` + `api/cin7/bom/*` + `api/cin7/{fulfilments,goods-receipts,invoices,payments}/*`. Currently the BOM Prisma models are the source of the 87 tsc errors (Section 2).
- **HeyGen: started but broken / stub**. All 5 routes (`avatars`, `generate`, `quota`, `status/[videoId]`, `voices`) return `notImplementedResponse('HeyGen', ...)`. `HEYGEN_API_KEY` referenced in code but routes are stubs.
- **AP2 (voice payments): started but broken / stub**. All 10 routes return `notImplementedResponse('AP2', ...)`. Settings page exists at `/settings/integrations/ap2`.
- **Slack (webhook only): wired but env-gated**. `src/app/api/boardroom/cron/route.ts:93` reads `SLACK_WEBHOOK_URL` for boardroom-session notification POSTs.

---

**Audit summary**

| Metric | Count |
|---|---|
| API route files | 223 |
| Page files | 155 |
| Unit test files | 3 (52 tests, all passing) |
| e2e test files | 0 |
| Actionable code TODOs / FIXMEs | 6 |
| Prisma models | 37 |
| Prisma migrations | 19 (latest 2026-05-12) |
| Build status (tsc / lint / build) | FAIL / FAIL / FAIL — all 3 share the stale-Prisma-client root cause |
| Build status (npm test) | PASS |
| Env vars referenced in code | 66 |
| Env vars in code but missing from `.env.example` | 23 |
| Broken / not-started integrations | Stripe (none), Resend (none), Supabase (commented stub), Linear (dep declared, no code), Telegram (none), Anthropic (UI tile only), Gemini (none), Pi-CEO API (none), Unite-Group API (none), HeyGen (5 stub routes), AP2 (10 stub routes) |
| Working integrations | Custom JWT auth, Vercel deploy, OpenAI (env-gated), SendGrid, Shopify, Xero, Cin7 Omni/Core, Slack webhook |
| Routes lacking auth gates | 91 / 223 (most are intentional public/cron/stub; ~30 are likely-unintentional gaps to triage) |

## Cross-refs

[[ccw]] · [[ccw-crm-review-technical-architect-2026-05-14]] · [[ccw-crm-review-product-strategist-2026-05-14]] · [[ccw-crm-review-market-strategist-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[rana-handoff-2026-05-14]] · [[unite-crm]] · [[unite-group-nexus-architecture]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-audit-verification]] · [[operational-priorities-q2-2026]] · [[swot-saas-cluster-2026]] · [[opus-adversary]]
