---
type: wiki
updated: 2026-05-13
---

# CCW — Carpet Cleaners Warehouse

External company. Shopify-based e-commerce + website. **First paying client** of [[unite-crm|ccw-crm]].

**ARR:** $33,000/yr ($2,750/month) — 12-month SaaS contract  
**Status (locked 2026-05-03):** Live and paying SaaS subscription. Logo rights agreed.  
**Human point-of-contact:** Toby Bredhauer — `tobyb@ccwarehouse.com.au`. Also future co-[[founder]] / VP / CCW Liaison of [[industry-association-vision-2026|the ANZ Industry Association]] (scope expanded 2026-05-11 to biggest-ANZ-association-any-sector; John Coutis confirmed as spokesman; see [[association-launch-plan-2026]] Wave 0–4).  
**Currently:** On holidays 11–17 May 2026 (back Mon 18 May — corrected 2026-05-14) — no CCW outreach until Mon 18 May. First weekly cadence call must be moved from Tue 26 May to Mon 18 May or Tue 19 May 10am AEST. See [[project-ccw-holiday-window]] and [[ccw-crm-board-synthesis-2026-05-14]] for the 4-day Stripe-demo-readiness sprint.  
**Public site:** ccwonline.com.au (SEO-tracked via [[semrush-api]])  
**Corporate domain:** ccwarehouse.com.au (Toby's email)  
**Linked records:** `nexus_clients.id = e224b8e2-947a-4f57-a037-0e4550fc87d8`; `businesses.id = fb4e6343-1518-43d3-8333-5f3e366dd1dd` (split — see [[unite-group-nexus-architecture]] schema-split note)

## What Unite-Group Built for CCW

Unite-Group built CCW's internal CRM-ERP system. That system is the `ccw-crm` SaaS product (codebase: `CleanExpo/CCW-CRM`). CCW also uses [[synthex|Synthex]] for marketing automation — automated email, segmentation, campaign triggers from CRM events.

## CCW-Online ERP (Unite-built product)

An integrated ERP and CRM platform for equipment suppliers managing the quote-to-cash lifecycle. Strong fit for Australian cleaning-equipment wholesalers and distributors.

**Capabilities:**
- Sales/CRM: customer records, quotes, orders, pipeline, dashboards
- Products: SKU-led catalogue with pricing, categories, search
- Inventory/procurement: purchase orders, receiving, stock movements, transfers, reorder
- Finance: invoicing, reconciliation, Xero-style accounting flows
- Service: service requests, activities, workshop/equipment journeys
- AI/agent workflows for inventory, quotes, operations
- i18n support for multi-language needs

**Tech Stack (CCW-CRM):**
- Frontend: Next.js 16.1.6, React 19, TypeScript, Tailwind CSS
- ORM: Prisma 7.7 (`@prisma/adapter-pg`)
- UI: Radix UI primitives, shadcn/ui, Framer Motion, Recharts, ReactFlow
- AI: `@openai/agents` 0.4.10, `@composio/core` 0.6.3, `@composio/openai-agents`
- Integrations: `mcp-linear` 0.1.8, `next-intl`, `jose` (JWT)
- Auth: bcryptjs, jose
- Testing: Vitest, Playwright, Lighthouse CI
- Package manager: npm

**DB schema (as of 2026-02-02):**
- Migration 001: Approval workflow system (approvals, approval_steps tables)
- Migration 002: Semantic search with pgvector (products.embedding column)
- Current schema version: `002_add_semantic_search`

**Documented integrations (capability map — maturity varies):**
- Inventory/ERP: Cin7-oriented flows
- Accounting: Xero
- E-commerce: Shopify
- Payments: Stripe
- AI/media providers

## Security (2026-05-09)

PR#149 merged: 3 high CVEs→0, Next.js upgraded to 16.2.6, 7 new security headers added.

## Wave 5.2 — Pi-CEO First-Client Treatment (live 2026-05-13)

CCW is the first business with full Pi-CEO observability + priority surfacing:
- Every Toby email persists to `ccw_support_tickets` (Unite-Group Supabase) within 5 minutes of receipt via the Hermes-fired `toby-watch.py` cron.
- Single-shot Telegram alert on first sight; no repeats per `~/.hermes/state/toby_watch.json` dedup.
- Daily 6-pager surfaces `ccw-crm ⭐` row FIRST in the CS section every morning with NPS / FCR / GRR / avg-first-response.
- Escalations (`state='escalated'`) trip the CS critical-alert threshold for founder visibility.

See [[pi-ceo-architecture]] §"CCW First-Client Treatment" for the full data path.

## Cross-refs

[[unite-crm]] · [[synthex]] · [[businesses-overview]] · [[operational-priorities-q2-2026]] · [[bulcs-holdings]]
