---
type: wiki
updated: 2026-05-19
---

# Synthex

Marketing-automation SaaS and AI-powered social media management platform (MIT licensed). Unite-Group product — used internally across the portfolio, sold to external clients (including white-label agency portals), and hosted at synthex.social with over 1,000 active users.

**GitHub:** CleanExpo/Synthex  
**Version:** 2.0.1 (package.json) / v11.1 latest changelog release (2026-03-24)  
**Production:** https://synthex.social  
**Primary external client using Synthex:** [[ccw]] — uses Synthex for outbound email, segmentation, and campaign triggers driven by CRM-ERP events.

Synthex automation delivers a 2.2x average engagement boost and 87% time savings.

## Operator Cockpits

- [[chorus-agent-platform-2026-05-19]] - candidate external cockpit for Synthex
  Marketing Agency research, engineering support, campaign drafting, diagrams,
  and creative ideation. Integration remains adapter-gated until the Chorus
  URL/auth contract is verified.

## Targets

- NRR ≥ 100%
- Pricing tier discipline (no discounting that compresses margins)
- Churn root-cause investigation ongoing

## Agent Coverage

- **CFO bot:** Synthex MRR row in cfo_state.jsonl; NRR tracked per cycle
- **CMO bot:** prosumer growth campaigns
- **CS bot:** churn signals, NPS

## Core Features

- **AI Content Intelligence:** Viral pattern analysis, persona learning, trend prediction, multi-provider AI generation (OpenRouter, Claude, Gemini, GPT)
- **Multi-Platform Scheduling:** Unified publishing across 9 networks (YouTube, Instagram, TikTok, X, Facebook, LinkedIn, Pinterest, Reddit, Threads), optimal time determination, visual calendar, bulk scheduling, timezone intelligence
- **Analytics & Discovery:** Real-time metrics, competitor analysis, ROI tracking, custom reporting, trending topics, hashtag research, visual asset library
- **Collaboration:** Role-based access, approval workflows, client portals, internal notes
- **GEO/SEO Engine:** Enterprise SEO framework (10,000+ pages), AI search visibility (AIO/Perplexity/ChatGPT citations), entity coherence + citation tracking, E-E-A-T framework, autonomous A/B testing, self-healing content pipeline

## Technology Stack

- **Frontend:** Next.js 15 (App Router), TypeScript 5, Tailwind CSS, Framer Motion, Radix UI — WCAG 2.1 AA compliant
- **Backend:** Node.js 22 LTS, Supabase (PostgreSQL + connection pooling), Prisma 6 (67 models), Redis via Upstash (serverless), Vercel multi-region edge deployment, BullMQ background job queues
- **AI:** OpenRouter (primary gateway), Anthropic SDK, Google AI SDK, OpenAI SDK, Vercel AI SDK
- **Integrations:** Stripe (subscription + webhooks), SendGrid + Resend (transactional email), OAuth 2.0 Google/GitHub via Supabase Auth (Synthex CLAUDE.md hard rule: Supabase only — never Clerk/NextAuth/Auth.js)
- **Security:** SOC 2 Type II + GDPR compliant, end-to-end encryption, CRON_SECRET enforced on all 21 cron routes (v11.1)
- **Build:** `next dev --turbopack` (dev), `next build --webpack` (prod), Turbopack for dev HMR

## Changelog Summary (key milestones)

| Version | Date | Milestone |
|---------|------|-----------|
| v11.1 | 2026-03-24 | SWARM Audit Sprint: audit logging, WCAG fixes, CSP unsafe-inline removed |
| v11.0 | 2026-03-23 | Obsidian markdown importer, real PDF reports, GDPR data export |
| v10.0 | 2026-03-19 | 498-route reference system, SSRF/JWT/IDOR security patches |
| v8.0 | 2026-03-13 | Stripe live (Pro/Growth/Scale AUD), synthex.social DNS live |
| v5.0 | 2026-03-11 | GEO optimiser v2, E-E-A-T framework, citation engine |
| v2.0 | 2026-03-03 | Agent orchestration hardening, AI workflow engine (7 step types), confidence gating |
| v1.0 | 2026-02-17 | Production hardening, RLS on 132 Prisma tables |

## Security (2026-05-09)

PR#218 merged: HSTS header added.

## Relationship to Remotion Skills Package

The `marketing-orchestrator` and `remotion-orchestrator` skill families produce marketing artefacts *for* Synthex clients (including [[ccw]]). Synthex-as-automation-platform is distinct from Synthex-as-marketing-target.

## Marketing Agency Runtime

The Synthex Marketing Agency environment now has a wiki-level runtime lifecycle:
[[synthex-marketing-agency-runtime-lifecycle-2026-05-19]]. It adapts the
[[service-layer-architecture-2026-05-18]] pattern to Synthex's actual stack:
Next.js App Router, Prisma, Supabase/Postgres, Vercel, `lib/marketing-agency/*`
service modules, and provider adapters. Convex language in prompts maps to this
service-layer boundary unless a future migration plan explicitly changes the
substrate.

The live link capture page is
[[synthex-marketing-agency-wikilinks-2026-05-19]]. It is the first place to add
new Synthex Marketing Agency pages so future agents do not re-discover the graph.

## External Resources

- **GitHub:** [CleanExpo/Synthex](https://github.com/CleanExpo/Synthex)
- **Production:** [synthex.social](https://synthex.social)
- **Docs:** [docs.synthex.social](https://docs.synthex.social)
- **Support:** support@synthex.social (Brisbane QLD, AEST)

## Cross-refs

[[businesses-overview]] · [[ccw]] · [[pi-ceo-architecture]] · [[wave-roadmap]] · [[seo-linkable-assets]] · [[synthex-seo-aeo-geo-master-generator-2026-05-18]] · [[semrush-health-check-and-nexus-ingestion-plan-2026-05-18]] · [[synthex-search-growth-management-index-2026-05-18]] · [[synthex-marketing-agency-runtime-lifecycle-2026-05-19]] · [[synthex-marketing-agency-wikilinks-2026-05-19]]

## Board Directives Log

### 2026-05-16 — Synthex finalisation execution sequence
**Decision:** Phase 1 measure-first (RLS adversarial baseline + Stripe churn mix + Vercel CFR), then Phase 2/3/4 parallel dispatch via Pi-CEO swarm with merge-gate of adversarial-RLS-≥50% before Phase 3 ships, Phase 6 sign-off gated on vibetest-use top-10 journey pass.
**Directive to:** Senior PM (PM-Core) — Phase 1 starts immediately, single-shot Telegram on completion to surface SOC 2 real-or-aspirational ruling.
**Condition for revisit:** RLS adversarial baseline reveals <5/131 actually-secure tables (P0 — pause everything, security-only sprint).

### 2026-05-19 — Marketing Agency runtime lifecycle
**Decision:** The `/Users/phill-mac/Documents/Marketing Team` sandbox is a command
center, not a duplicate application repo. Synthex Marketing Agency work uses
runtime reconciliation before edits, keeps provider mechanics behind adapters,
keeps domain policy in Synthex service/orchestration layers, and compacts state
back into the wiki at lifecycle boundaries.
**Directive to:** PM-Synthex + Technical Architect + QA Lead.
**Condition for revisit:** Synthex migrates away from Next.js/Prisma/Supabase/Vercel
or an explicit Convex migration plan is approved.

### 2026-05-19 — Command Center Campaign Studio
**Decision:** The next Synthex Dashboard direction is Campaign Command Studio:
a client-facing operating room where Toby/CCW can send a voice brief, Synthex
grounds it in Shopify/product data and current channel research, then shows a
branded campaign Kanban, storyboard, approval gates, production meter, and
learning loop before any paid production or publishing.
**Directive to:** PM-Synthex + Product Strategist + Technical Architect + Creative
Director + QA Lead.
**Condition for revisit:** A live platform connection or commercial policy changes
the no-publish/no-spend/default-draft boundary.

### 2026-05-19 — Media Assets Production Stack
**Decision:** The Synthex media stack uses Remotion and HyperFrames for
deterministic branded overlays, launch videos, captions, diagrams, thumbnails
and source-to-video demos. Artlist is reserved for licensed music and high-value
source media behind credential, budget, consent and licence gates. The first
mini-app backlog is Storyboard Builder, Overlay Pack Generator, Thumbnail Lab,
Lead Magnet Preview, Website Ideation Preview, Production Meter, Media QA Review
and Asset Ledger.
**Directive to:** PM-Synthex + Creative Director + Technical Architect + QA Lead
+ Compliance.
**Condition for revisit:** Artlist exposes and verifies a public Studio AI media
API, HyperFrames access/docs change materially, or Remotion licensing/render
volume changes the production economics.

### 2026-05-19 — Gen Media Command Center Build
**Decision:** Build the next Synthex Command Center around Gen Media mini-apps:
voice brief intake, source grounding, campaign cards, shared human/agent asset
grid, Remotion/HyperFrames overlay lane, production meter, licence/QA gates and
exportable state. Riley Brown's FAL/Buffer/Paper examples are pattern references
only; this slice uses Synthex's approved providers and existing API surfaces.
**Directive to:** PM-Synthex + Technical Architect + Creative Director + QA Lead.
**Condition for revisit:** The sandbox cockpit fails to create a clearer client
approval path than the existing campaign package page, or service-layer tests
cannot validate the command-center state contract.

### 2026-05-21 — Governed Signal Ledger M12
**Decision:** Start M12 with the governed signal contract before UI, persistence,
or provider work. Synthex Marketing Agency signals now need typed source,
evidence, score, risk, approval, opportunity, and outcome-learning objects before
they can become campaign recommendations.
**Directive to:** PM-Synthex + Technical Architect + QA Lead.
**Condition for revisit:** The service contract fails to map live Apify, Google,
social, or Wiki research output into ranked opportunities without losing
evidence, confidence, risk, and approval state.
