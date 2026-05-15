---
type: wiki
updated: 2026-05-10
---

# Synthex

Marketing-automation SaaS and AI-powered social media management platform (MIT licensed). Unite-Group product — used internally across the portfolio, sold to external clients (including white-label agency portals), and hosted at synthex.social with over 1,000 active users.

**GitHub:** CleanExpo/Synthex  
**Version:** 2.0.1 (package.json) / v11.1 latest changelog release (2026-03-24)  
**Production:** https://synthex.social  
**Primary external client using Synthex:** [[ccw]] — uses Synthex for outbound email, segmentation, and campaign triggers driven by CRM-ERP events.

Synthex automation delivers a 2.2x average engagement boost and 87% time savings.

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

## External Resources

- **GitHub:** [CleanExpo/Synthex](https://github.com/CleanExpo/Synthex)
- **Production:** [synthex.social](https://synthex.social)
- **Docs:** [docs.synthex.social](https://docs.synthex.social)
- **Support:** support@synthex.social (Brisbane QLD, AEST)

## Cross-refs

[[businesses-overview]] · [[ccw]] · [[pi-ceo-architecture]] · [[wave-roadmap]] · [[seo-linkable-assets]]
