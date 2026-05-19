---
type: wiki
updated: 2026-05-14
---

# DR-NRPG — Disaster Recovery / National Restoration Practitioners Group

## Online-First Search + Onboarding Mandate (2026-05-20)

Disaster Recovery / NRPG is not a storefront-location business. Treat it as an online-first service-area and marketplace/onboarding operation: clients submit disaster/restoration needs digitally, contractors apply and are vetted digitally, and Synthex/Unite-Group routes demand, proof, content, and automation through the correct business context.

Search goal: rank #1 in the real locations where the network can serve clients, without creating fake offices or keyword-stuffed Google Business Profiles. GBP is only used where eligible as a service-area profile with a hidden public address if customers are not served at that address. Location dominance should be built through service-area pages, Search Console learning, real contractor/service coverage, reviews, structured data, local citations, and evidence-backed content.

Priority onboarding surfaces:

- Client intake: emergency restoration request, insurance/job context, location, urgency, photos/documents, consent, and contact path.
- Contractor intake: trade/service coverage, certifications, insurance, equipment, response capacity, service areas, licences, and onboarding status.
- Authority layer: NRPG standards, contractor requirements, restoration education, safety guidance, and industry-association pathway.
- Synthex automation: drafts local pages, GBP/service-area updates where eligible, posts, review replies, contractor nurture, and reporting packets; live publishing remains evidence/QA gated.

Two live products sharing the same monorepo (Turborepo). Production site: disasterrecovery.com.au.

## DR/NRPG ↔ RestoreAssist relationship (2026-05-14)

DR/NRPG is **tenant zero** for [[restore-assist]]. RA is the CRM the user's own restoration business will run on, AND will sell to other tradies as SaaS. The DR/NRPG → RA integration scaffolding exists in the RA repo:
- `DrNrpgIntegration` Prisma model (apiKey, baseUrl, webhookSecret, isActive, lastSyncAt)
- `DrNrpgJobSync` Prisma model (inspection ↔ DR/NRPG job link)
- `/api/dr-nrpg/connect/route.ts` (connection setup)
- `/api/webhooks/dr-nrpg/route.ts` (inbound jobs from DR/NRPG)
- `/api/cron/dr-nrpg-liveness/route.ts` (health probe)

Missing: the **job-import UX** — inbound DR/NRPG jobs should auto-populate the RA inspection list with one-tap "Start" action. Flagged as Section 18 in `docs/superpowers/specs/2026-05-14-signin-jobclose-audit-design.md` in the RA repo; folds into SP-A scope.

**GitHub (production):** CleanExpo/DR-NRPG  
**GitHub (sandbox):** CleanExpo/DR-Sandbox (safe experiment space, no Vercel link, created 2026-04-20 alongside DR-184 consolidation)  
**GitHub (archived):** CleanExpo/Disaster-Recovery, CleanExpo/NRPG-Onboarding-Framework (both archived via DR-184)  
**Production URL:** https://disasterrecovery.com.au

## Repo Status (DR-NRPG)

- **Code quality:** 100% — 0 ESLint warnings/errors, 151/151 tests passing
- **Infrastructure:** 100% — Docker PostgreSQL + Redis configured, 12 DB tables, seed data ready
- **README status:** 95% complete / production-ready code (dated 2025-12-27)
- **Security:** PR#103 merged (95% vuln reduction: 57→2); PR#350 merged (HSTS 2yr+preload)

## Monorepo Structure (Turborepo)

- `apps/nrpg-web` — Next.js frontend
- `apps/backend` — FastAPI Python backend (implied from DR-Sandbox architecture)
- `packages/*` — shared packages

## Tech Stack (DR-NRPG)

- **Framework:** Next.js 14.2 (nrpg-web app)
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS 3.4
- **Database:** PostgreSQL 15, Prisma ORM
- **Cache:** Redis 7
- **Testing:** Jest 29, Playwright
- **Auth:** NextAuth, JWT
- **UI:** Radix UI, shadcn/ui
- **Build:** Turborepo 2.9+, pnpm
- **AI (dev):** `@google/generative-ai` ^0.24.1 in monorepo root devDeps

## DR-Sandbox Tech Stack

Lightweight experiment space: Node.js >=20, TypeScript 5.6, tsx, vitest, Anthropic SDK 0.32. Scripts include `council`, `autoresearch`, `score`, `proposals`, `expand`, `watch`, `voice:server`. Pi-Dev-Ops auto-PRs land here (not DR-NRPG).

## Content-Ops Architecture (DR-Sandbox)

Three loops: algorithm drift detection, coverage expansion, lead feedback. Six subsystems. Machine-readable content rubric at `rubric/v1.ts` — versioned, consumed by all agents. All scored pages carry rubric version for decay detection.

## NRPG Onboarding Framework (Archived)

100-point certification system for restoration contractors:
- Specialisation portfolio (40 pts), [[carsi]] mandatory platform (25 pts), industry associations (20 pts), Govt Cert IV + CPD (15 pts)
- Levels: Certified Specialist (60-69) → Professional (70-84) → Expert (85-99) → Master (100+)
- 22 training modules: CSE (10 modules, 10hr) + WRT (12 modules, 24hr)
- 3-part ecosystem: Website (authority) + NRPG (SEO dominance) + CRM (contractor connection)
- Partners with Clean Claims (https://cleanclaims.com) for field documentation

## Expansion into ANZ Industry Association (2026-05-11)

NRPG is the existing wiki/legal scaffold that expands into the full [[industry-association-vision-2026|ANZ Property Services Industry Association]] — the certification-and-cert-firm pillar of a broader association covering media, advocacy, events, member services, and cross-trade scope. See [[association-launch-plan-2026]] Wave 2 — the 100-point cert above gets repackaged as the association's flagship Individual cert, with a new **Certified Firm** organisation-level tier sitting above it (modelled on IICRC Certified Firm program, see [iicrc.org](https://iicrc.org/iicrccertifiedfirm/)). IICRC affiliation is maintained (we sit alongside, not against) and we add AU-specific standards where IICRC has gaps (storm response, hard floor cleaning).

## IAQ Credential Layer (added 2026-05-11)

IAQ Magazine Australia + IAQA Australia Chapter membership now feed the **industry associations** scoring bucket (20 pts) in the 100-point cert system. Practitioners who hold IAQAA membership (or AIRAH equivalents) earn credit; CARSI's incoming IAQ + Building Science pillar feeds the platform points. [[founder|Phill]]'s IAQ Magazine Australia editorial committee seat is the portfolio-wide E.E.A.T. anchor — schema.org author markup on disasterrecovery.com.au must reflect. See [[iaq-building-science-initiative]].

## Related Products & Services

### Custom DrawPlan for your business

We offer customizable functionality for specific business needs, allowing rebranding and publishing under your company name. Services include:
- Custom features and workflows
- Branding integration (logo, colors, name)
- Dedicated app build and release support
- Option to publish under your company on the App Store / Play Store
- Priority support and roadmap alignment

Target industries include Contractors, Builders, Real Estate Designers, Architects, and Renovators.

### Encircle Floor Plan (Estimating Workflow)

Encircle converts simple smartphone videos into professional, Xactimate-ready floor plans in under six hours, enabling immediate estimating. The platform automates documentation, eliminating the need for training, tripods, or manual drawing.

**Key Features:**
*   **Workflow:** Transforms video footage into accurate, professional floor plans.
*   **Speed:** Enables starting estimates on Day 1.
*   **Accuracy:** Provides professional-grade documentation without hardware headaches.
*   **AI Scope Generation:** Encircle Scope turns real job data into a clear, defensible scope in minutes, ensuring nothing is missed and maximizing captured work.
*   **Field Documentation:** Captures detailed job data using photos, videos, notes, and 360°s, providing evidence to prevent profit loss from missing documentation.
*   **AI Tools:** Includes AI-powered video summaries and automated photo labeling/organization by room.

**Comparison to Competitors:**
*   **VS DocuSketch:** Addresses the unpredictability of costs, tour fees, and rush fees associated with Docusketch billing. [See Encircle Vs. DocuSketch](https://explore.getencircle.com/compare-encircle-vs-docusketch/)
*   **VS Magicplan:** Provides a complete platform solution, unlike Magicplan, which is better suited for single-room sketches and can be clunky for full floor plans. [See Encircle Vs. Magicplan](https://explore.getencircle.com/compare-encircle-vs-magicplan/)

### Encircle Field Documentation (Proof Capture)

Encircle provides comprehensive field documentation capabilities, allowing crews to capture every detail required for accurate billing and scope definition. This includes:
*   Centralized real-time field data capture.
*   AI-powered tools for documentation and analysis.
*   Comprehensive evidence capture to support billing and scope verification.

### Related Resources

*   **Demo:** [Link to Demo]
*   **Pricing:** [Link to Pricing]

### Related Products

*   **[Product Name]:** [Link]

### Related Services

*   **[Service Name]:** [Link]

### Related Partners

*   **[Partner Name]:** [Link]

### Related Content

*   **Blog:** [Link]

### Related Support

*   **Support:** [Link]

### Related Community

*   **Community:** [Link]

### Related Legal

*   **Terms of Service:** [Link]

### Related Privacy

*   **Privacy Policy:** [Link]

### Related Contact

*   **Contact Us:** [Link]

### Related Careers

*   **Careers:** [Link]

### Related Sitemap

*   **Sitemap:** [Link]

### Related Sitemap

*   **Sitemap:** [Link]

### Related Sitemap

*   **Sitemap:** [Link]
