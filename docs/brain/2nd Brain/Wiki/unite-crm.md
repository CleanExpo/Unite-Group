---
type: wiki
updated: 2026-05-10
---

# Unite-CRM / [[ccw]]-Online ERP

CRM-ERP platform built by Unite-Group for equipment suppliers. First external deployment: [[ccw]] (Carpet Cleaners Warehouse). Product name in the wild: **[[ccw]]-Online ERP**.

**GitHub:** CleanExpo/[[ccw]]-CRM  
**Version:** 1.0.0  
**Package name:** `ccw-online-erp`

## What It Is

An integrated ERP and CRM for equipment suppliers (wholesalers, distributors) — manages the complete quote-to-cash lifecycle: SKU catalogues, B2B quoting, warehouse-aware fulfilment, and finance reconciliation. Strong fit for Australian cleaning-equipment businesses.

## Tech Stack

- **Frontend:** Next.js 16.1.6 (upgraded to 16.2.6 via PR#149, May 2026), React 19, TypeScript, Tailwind CSS
- **ORM:** Prisma 7.7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Database:** PostgreSQL (pg ^8.16.0)
- **UI:** Radix UI (full component suite), shadcn/ui, Framer Motion 12, Recharts 3.5, ReactFlow 11
- **AI Agents:** `@openai/agents` 0.4.10, `@composio/core` 0.6.3, `@composio/openai-agents`
- **Integrations:** `mcp-linear` 0.1.8, `next-intl` 4.8, i18n support
- **Auth:** bcryptjs 3, jose 5 (JWT)
- **Forms:** react-hook-form 7.54, zod 3.24, @hookform/resolvers
- **Testing:** Vitest, Playwright, Lighthouse CI
- **Package manager:** npm

## Database Schema (as of 2026-02-02)

- Migration 001: Approval workflow system (approvals, approval_steps tables)
- Migration 002: Semantic search with pgvector (products.embedding column)
- Schema version: `002_add_semantic_search`

## Documented Integrations (capability map — maturity varies)

- Inventory/ERP: Cin7-oriented flows
- Accounting: Xero
- E-commerce: Shopify
- Payments: Stripe
- AI/media providers

## Business Capabilities

- Customer/contact records, quotes, orders, pipeline, dashboards
- SKU-led catalogue (commercial pricing, kits, variants)
- Inventory, purchase orders, receiving, stock movements, transfers, reorder
- Invoicing, reconciliation, accounting-system alignment
- Service requests, activities, workshop/equipment workflows
- AI-assisted workflows for inventory, quotes, and operations
- Multi-language i18n
- Production runbooks, disaster recovery, backup strategies, security hardening

## [[ccw]] Deployment Status

- PR#149 merged 2026-05-09: 3 high CVEs→0, Next.js 16.2.6, 7 new security headers
- Paying $2,750/month ($33,000/yr ARR), SaaS contract signed 2026-05-03

## Stripe Billing Scaffold (built 2026-05-10)

Lives in the **unite-group** repo (not the [[ccw]]-CRM repo). Centralised billing for all portfolio businesses + future Industry Association members.

- `src/lib/billing/tiers.ts` — `MembershipTier` enum for [[industry-association-vision-2026]] tiers (Base/Professional/Master annual)
- `src/app/api/billing/subscribe/route.ts` — admin POST creates Stripe customer + subscription
- `src/app/api/billing/webhook/route.ts` — HMAC-SHA256 verified Stripe event sink
- Supabase migration: `businesses` gained `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status`, `subscription_current_period_end`

Activation deferred to Q3 2026 (Industry Association launch). No Stripe Products yet, no API keys. [[ccw]]'s existing subscription was created outside this code; can be linked into the schema by setting `stripe_subscription_id` on the businesses row when needed.

See `src/lib/billing/README.md` in the unite-group repo for the full setup runbook.

## Cross-refs

[[ccw]] · [[synthex]] · [[businesses-overview]] · [[unite-group-nexus-architecture]] · [[industry-association-vision-2026]]
