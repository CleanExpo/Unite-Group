---
type: wiki
updated: 2026-05-11
---

# Businesses Overview

7 portfolio businesses under Unite-Group (5 internal products + 2 paying external clients). [[ccw]] is the first paying external client at $2,750/month ($33,000/year SaaS contract signed 2026-05-08). The overarching strategic target: $2B valuation by June 2028.

## The Six Businesses

| Business | Type | Status | Stack |
|----------|------|--------|-------|
| [[synthex]] | Marketing-automation SaaS | Live — [[synthex]].social, 1,000+ users | Next.js 15, Supabase, Prisma 6 (67 models), Vercel multi-region |
| [[restore-assist]] | iOS/PWA field app (restoration) | Live — App Store build 1.0(10) approved 2026-05-08 | Next.js, Capacitor 8, Prisma 6, Anthropic + Gemini AI |
| [[dr-nrpg]] | Disaster recovery platform + contractor network | Live — disasterrecovery.com.au | Next.js 14.2, Turborepo, PostgreSQL 15, Redis 7 |
| [[carsi]] | LMS for restoration/cleaning professionals | Active — DigitalOcean | Next.js 16, Prisma 7.6, PostgreSQL 15, Stripe |
| [[unite-crm]] | CRM-ERP for equipment suppliers | Live ([[ccw]] deployment) | Next.js 16.2.6, Prisma 7.7, React 19, OpenAI Agents SDK |
| [[ccw]] | First paying client (Carpet Cleaners Warehouse) | Live — $33,000/yr ARR | Shopify + [[ccw]]-crm SaaS + [[synthex]] |
| [[4plan-designer]] | Home interior design/renovation app | Conceptual/Design | TBD (App Store/MS Store) |

## Unite-Group Hub (unite-group repo)

CEO command center connecting Pi-CEO to surface real-time health, agent activity, and business metrics across all 7 portfolio businesses.

**Stack:** Next.js 15.5.15 (App Router), Supabase (Postgres + RLS), Vercel, Tailwind CSS + shadcn/ui (Radix primitives)  
**GitHub:** CleanExpo/unite-group  
**Routes:** `/dashboard` (CEO portfolio health), `/api/health`, `/api/pi-ceo/health`

## M&A Intelligence (May 2026)

**$2B target requires:** $80M–$150M ARR, category leadership, AI defensibility roadmap, NRR >115%, international revenue, Rule of 40 >50, clean IP.

**ANZ SaaS multiples (May 2026):**
- Bootstrapped $500K–$1M ARR: 4.0x–5.5x
- Growth SaaS $1M–$5M ARR (>30% growth): 5.5x–8.0x
- Premium metrics (NRR >120%, R40 >50): 7x–10x+

**Recent ANZ comps:** RPM Global $1.056B/14.3x (Feb 2026), Qoria $1.016B/8.6x (Feb 2026), Domain $2.983B/25.2x EBITDA (Apr 2025)

**PE entry thresholds:** Monthly churn ≤2–3%, CAC payback <12 months

## Cross-refs

[[exit-thesis]] · [[pi-ceo-architecture]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]]