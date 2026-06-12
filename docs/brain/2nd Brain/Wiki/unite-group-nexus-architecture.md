---
type: wiki
updated: 2026-05-18
---

# Unite-Group Nexus — Product Architecture Blueprint

Engineering brief. Source of truth for all Nexus build work.

## What It Is
Client-facing CRM and autonomous agency platform. Two sectors:
- **Empire Sector** — Phill's 6 portfolio businesses ([[synthex]], RA, DR, NRPG, [[carsi]], [[ccw]])
- **Client Sector** — Paying retainer clients ([[ccw]]-CRM first, then Bulcs Holdings etc.)

Done means: thoroughly tested, no bloat, no false positives, client can pay for it.

## Sitemap

```
/empire/                    Command Center (Phill only)
  /empire/businesses/[slug] Deep-dive per business
  /empire/agents/           Full agent pipeline
  /empire/clients/          Client sector management
  /empire/financial/        MRR, Stripe, Xero
  /empire/linear/           All Linear tickets

/client/                    Client portal (paying clients only)
  /client/seo/              Rankings + movements
  /client/social/           Content pipeline
  /client/reports/          Monthly PDFs
  /client/billing/          Stripe portal embed

/onboarding/                Self-serve signup flow
  /onboarding/start → plan → payment → complete
```

## Core Data Model

**businesses** — 6 portfolio companies  
**clients** — paying external clients  
**client_portals** — 1:1 portal config per client  
**subscriptions** — Stripe mirror  
**health_snapshots** — time-series from Pi-CEO, potentially including geospatial data  
**agent_actions** — every Margot→Board→PM→Orchestrator event  
**tickets** — Linear mirror  
**financial_records** — Stripe + Xero  
**content_pipeline** — [[synthex]] output per client  
**profiles** — Supabase auth + role ([[founder]] | client)  

## Revenue Model (updated 2026-05-10)

The Starter/Growth/Pro monthly retainer plans were removed 2026-05-10 — that product is no longer sold. Two real revenue streams now:

1. **Bespoke SaaS contracts.** [[ccw]] pays A$2,750/mo (A$33k/yr ARR) on a 12-month paper SaaS contract signed 2026-05-03. Custom price per client; not tier-shaped.
2. **ANZ Industry Association memberships** — three annual tiers via [[industry-association-vision-2026]], launching Q3 2026:
   - Base — A$299/yr — directory + newsletter + report
   - Professional — A$799/yr — + [[carsi]] training, equipment pricing
   - Master — A$2,499/yr — + conference, awards, advocacy

Plus event tickets, [[carsi]] training fees, [[ccw]] equipment commissions later.

## Stripe Billing Scaffold (built 2026-05-10, deferred activation)

Code shipped in `unite-group` repo:
- `src/lib/billing/tiers.ts` — `MembershipTier = 'base' | 'professional' | 'master'`, prices resolve from `STRIPE_PRICE_ID_{BASE,PROFESSIONAL,MASTER}` env vars
- `POST /api/billing/subscribe` — admin-only (`x-admin-token` == `PI_CEO_API_KEY`); creates Stripe customer

## Competitor Intel: HighLevel (gohighlevel.com) — ingested 2026-05-12

The dominant white-label agency CRM. Nexus competes directly on the agency-platform vector.

**What they sell.** All-in-one sales + marketing OS marketed as "AI-powered operating system" for agencies. Stated 2025 footprint: 7M AI voice calls, 7.3B leads, 179M appointments, US$5.2B sales facilitated. Pricing: Starter US$97/mo (3 sub-accounts), Unlimited US$297/mo (unlimited sub-accounts + Basic API), Agency Pro US$497/mo (SaaS Mode = resell to clients under agency's brand + Advanced API + automated sub-account creation + rebill phone/email at markup). The Agency Pro tier is the resale moat — agencies become SaaS vendors on top of HighLevel.

**API surface.** REST at `services.leadconnectorhq.com`. OAuth 2.0 (marketplace apps) or Private Integration Tokens. Covers: Contacts (CRUD, tags, custom fields), Conversations (SMS/email/call threads), Calendars (booking workflows), Opportunities (pipeline), Payments (subscriptions + transactions), Webhooks (50+ events). Marketplace for app distribution. Basic API gated behind Unlimited tier; Advanced API only at Agency Pro.

**Where they're vulnerable / where Nexus competes.**
1. **Generic-marketer voice.** HighLevel is "by marketers, for marketers" — no industry verticalisation. Nexus enters via the ANZ restoration/property-services vertical ([[industry-association-vision-2026]], [[dr-nrpg]], [[restore-assist]], [[ccw]]) — vertical-native data model (loss adjusters, IICRC certs, floor plans, IAQ) is uncopyable from a horizontal CRM.
2. **No agent layer.** HighLevel's "AI" is workflow automation + voice calls. Nexus ships an autonomous agency ([[agency-blueprint]], [[pi-ceo-architecture]]) — Margot → Board → 25 agents do the work, not "automate" it. Different category.
3. **Resale-on-rented-land.** SaaS Mode agencies own no IP — HighLevel can change terms anytime. Nexus offers bespoke SaaS contracts ([[ccw]] $33k/yr) where the client owns their portal data and the agency owns the platform code.
4. **Webhook-first architecture is replicable.** Their 50+ event webhook surface is a clean template for Nexus's own [[aip-architecture]] Actions layer — adopt the same event names (`contact.created`, `conversation.message_received`, `opportunity.stage_changed`) so agencies migrating off HighLevel get drop-in webhook compatibility.
5. **Marketplace is a moat we should mimic in Wave 4.** A Nexus marketplace where ANZ industry-association members publish vertical apps (DR site survey, NRPG cert workflow, CCW equipment order) builds the same lock-in HighLevel's marketplace builds — but vertical.

**Action.** Treat HighLevel as the reference horizontal baseline. Nexus must match their integration breadth (Contacts/Conversations/Calendar/Opportunities/Payments/Webhooks/Marketplace) but win on vertical depth + agent autonomy. Quote their pricing in Nexus sales decks: "HighLevel charges $497/mo for generic SaaS-Mode resale; we deliver vertical AI-agency capability per industry."

Cross-refs: [[marketing-agency-blueprint-2026]] · [[unite-hub-vision]] · [[aip-architecture]] · [[swot-saas-cluster-2026]] · [[semrush-health-check-and-nexus-ingestion-plan-2026-05-18]] · [[synthex-seo-aeo-geo-master-generator-2026-05-18]]