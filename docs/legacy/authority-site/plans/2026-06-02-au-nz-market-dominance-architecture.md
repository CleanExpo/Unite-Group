# AU/NZ Market Dominance Architecture
## Unite-Group Product Ecosystem — Strategic Plan

**Date:** 2026-06-02  
**Author:** Strategic Architecture Team  
**Status:** DRAFT — Board Review Required  
**Horizon:** 90–180 Days  

---

## EXECUTIVE SUMMARY

Unite-Group operates an integrated product ecosystem targeting the Australian and New Zealand restoration, disaster recovery, and allied trades market. This document maps the complete architecture connecting four core products (RestoreAssist, Unite-Hub CRM, Synthex AI, NRPG) to ideal client personas, contractor networks, and a path to market dominance under the $2B North Star target by 2028-06-30.

The strategy is online-first, service-area based, contractor-network driven, and explicitly rejects fake locations, storefront assumptions, phone-first funnels, and keyword-stuffed GBP names.

**Current State:** Agency operations platform with 3 active clients, real revenue (~$8,250 AUD MRR), production infrastructure (Supabase Sydney, Vercel syd1), and a working AI content pipeline. Market-readiness gap: 6–8 weeks of focused product work.

**Target State:** Dominant online-first restoration lead-generation and contractor-network platform across AU/NZ, with automated pipelines from content creation through lead intake to contractor dispatch.

---

## 1. CURRENT PRODUCT PORTFOLIO MAP

### 1.1 RestoreAssist — Restoration Content + Lead Engine

| Attribute | Detail |
|-----------|--------|
| **Product Role** | Authority content platform for disaster recovery and restoration services |
| **What It Does** | Produces educational content about restoration processes, insurance claims, and disaster recovery. Functions as a lead-generation authority site — homeowners searching for restoration help discover RestoreAssist content, then get connected to verified contractors |
| **Who It Serves** | Property owners experiencing water/fire/storm damage; restoration contractors seeking qualified leads; insurance assessors needing restoration education |
| **Revenue Model** | Lead generation fees (pay-per-lead to contractors), content licensing, premium contractor memberships |
| **Key Features** | Educational hub covering insurance jargon, restoration process, claim tips; service-area landing pages for each AU/NZ region; contractor directory with verified profiles; customer portal for tracking claim progress |
| **Integration Points** | Feeds leads into Unite-Hub CRM; content is produced by Synthex; contractors are NRPG members; RestoreAssist inspections auto-import from NRPG jobs |
| **Current State** | Active repository (CleanExpo/RestoreAssist); content pipeline producing pages; customer portal explainer hub proposed (P1 priority); customer education content differentiator |

### 1.2 Unite-Hub CRM — Lead/Pipeline Management

| Attribute | Detail |
|-----------|--------|
| **Product Role** | Central nervous system for all client and lead management |
| **What It Does** | Captures leads from all channels (organic, paid, referral), manages pipeline stages, tracks conversions, generates daily digests, and provides the Empire Command Center dashboard for CEO-level portfolio visibility |
| **Who It Serves** | Unite-Group's own operations team; client businesses using the platform; sales teams needing pipeline visibility |
| **Revenue Model** | Subscription SaaS ($2,750/mo base, $4,400 setup, 12-month minimum); per-seat licensing for multi-user clients |
| **Key Features** | Lead capture and scoring; contact management; opportunity tracking; conversion workflows; daily digest generation; client portal access; KPI strips; topology visualization; billing integration (Stripe) |
| **Integration Points** | Receives leads from RestoreAssist; dispatches work to NRPG contractors; content requests flow to Synthex; portfolio data feeds Pi-CEO dashboard |
| **Current State** | Active with 3 client portals (CCW, Bulcs, Dimitri); CRM tables live in production Supabase; daily digest pipeline operational; Stripe billing integrated; Empire Command Center functional |

### 1.3 Synthex AI — Content Engine

| Attribute | Detail |
|-----------|--------|
| **Product Role** | AI-powered content production and marketing automation layer |
| **What It Does** | Generates SEO-optimised content packets, drafts page updates, identifies Search Console opportunities, checks budget gates, records KPI snapshots, proposes retreat/expand decisions, and produces AI-generated marketing copy |
| **Who It Serves** | RestoreAssist (content for authority pages); NRPG members (contractor profile pages); Unite-Hub CRM (campaign copy); external clients seeking content marketing |
| **Revenue Model** | Content-as-a-Service licensing; per-campaign pricing; internal cost reduction (replaces human copywriters) |
| **Key Features** | AI-generated content packets; approval workflow (draft → QA → publish); content scheduling; SEO optimisation; brand voice enforcement; GBP/service-area updates; review reply drafts; Search Console opportunity identification |
| **Integration Points** | Produces content for RestoreAssist pages; drafts contractor profiles for NRPG; creates campaign copy for Unite-Hub; KPI snapshots feed Command Center |
| **Current State** | Producing real content for CCW client; active content pipeline; social media generation; calendar generation; brand-iq voting; voice-audit compliant copy |

### 1.4 NRPG — Disaster Recovery Contractor Network

| Attribute | Detail |
|-----------|--------|
| **Product Role** | Verified contractor network connecting restoration demand with qualified supply |
| **What It Does** | Operates as a contractor directory and verification platform. Members (tradies/contractors) apply, get verified, receive leads from RestoreAssist/Unite-Hub, and maintain professional profiles with evidence of qualifications |
| **Who It Serves** | Restoration contractors (carpet cleaners, water damage specialists, fire restoration, storm damage); property managers seeking verified tradespeople; insurance companies needing preferred contractor networks |
| **Revenue Model** | Membership fees (tiered); lead-referral commissions; verified-badge premium; budget-capped lead distribution |
| **Key Features** | Contractor application and verification workflow; directory/profile pages; service-area coverage visualisation; budget ledger (cap per contractor per month); KPI snapshots; controlled-retreat logic (exit underperforming areas); approval gates for content/GBP |
| **Integration Points** | Receives job dispatches from Unite-Hub CRM; provides verified contractor data to RestoreAssist service-area pages; feeds demand/coverage signals to Command Center |
| **Current State** | Service-area command center defined; contractor intake and verification flows built, budget ledger and KPI snapshot architecture designed |

### 1.5 Supporting Products

| Product | Role | Status |
|---------|------|--------|
| **CARSI** | Carpet/restoration industry certification and standards body integration | Active portfolio member |
| **CCW-CRM** | CCW Carpet Cleaning Brisbane — custom CRM for carpet cleaning operations | Active client portal |
| **Pi-CEO** | Autonomous AI operating system — orchestrates all products, agents, and dashboards | Active (Railway FastAPI) |
| **Margot** | Voice-activated AI executive assistant (ElevenLabs) | Active (voice tasks, approvals) |

### 1.6 Product Connection Map

```
    ┌─────────────────────────────────────────────────────────────┐
    │                    PI-CEO (Orchestrator)                      │
    │     Autonomous agent orchestration, health monitoring         │
    └───────────────┬────────────────────┬────────────────────────┘
                    │                    │
    ┌───────────────▼──┐    ┌───────────▼──────────┐
    │   Synthex AI     │    │   Unite-Hub CRM      │
    │ (Content Engine) │◄──►│  (Lead/Pipeline Mgmt)│
    └────────┬─────────┘    └──────────┬───────────┘
             │                         │
             │ content packets          │ leads + dispatches
             │ SEO opportunities        │ client pipeline data
             │                          │
    ┌────────▼─────────┐    ┌──────────▼───────────┐
    │  RestoreAssist   │    │       NRPG           │
    │ (Content + Leads)│◄──►│ (Contractor Network) │
    └────────┬─────────┘    └──────────┬───────────┘
             │                         │
             │ educational content      │ verified profiles
             │ authority pages          │ job completions
             │                          │
    ┌────────▼──────────────────────────▼───────────┐
    │           EMPIRE COMMAND CENTER                 │
    │   Portfolio health, KPI strips, daily digest    │
    │   Topology viz, business 360 views              │
    └────────────────────────────────────────────────┘
```

**Data Flow Summary:**
1. Synthex creates content → feeds RestoreAssist authority pages
2. RestoreAssist generates organic leads → flow into Unite-Hub CRM
3. Unite-Hub CRM qualifies and scores → dispatches to NRPG members
4. NRPG members execute work → evidence and reviews feed back to Synthex
5. Pi-CEO monitors all portfolio health → optimises across all products

---

## 2. IDEAL CLIENT PERSONAS FOR AU/NZ

### 2.1 Persona Matrix

| # | Persona | Segment | Key Problems | Unite-Group Solution |
|---|---------|---------|--------------|---------------------|
| 1 | **The Regional Restoration Operator** | Restoration companies (5–50 staff) | Lead generation is expensive and unreliable; no digital presence; competing against franchises; insurance panel access opaque | RestoreAssist authority content drives organic leads; NRPG verified badge builds trust; Unite-Hub CRM manages pipeline |
| 2 | **The Property Management Firm** | Strata managers, property managers, real estate agencies | Need reliable contractors at short notice for damage events; managing multiple vendors across regions; compliance documentation burdens | NRPG verified contractor network; online-first dispatch model; automated documentation compliance |
| 3 | **The Sole Trader Tradie** | Independent contractors (carpet cleaners, water damage, etc.) | Feast-or-famine lead flow; no marketing budget; competing against larger operators; admin takes 30%+ of time | NRPG membership → leads; Synthex handles content/SEO; Unite-Hub CRM automates admin; budget-capped lead distribution |
| 4 | **The Insurance Assessor/Loss Adjuster** | Insurance industry (assessors, loss adjusters, brokers) | Finding quality contractors in regional areas; slow response times; inconsistent quality; documentation for claims | NRPG regional coverage; RestoreAssist education content; verified quality metrics; automated claims documentation |
| 5 | **The Franchise Group / Chain Operator** | Multi-site restoration/carpet cleaning franchise groups | Standardising quality across locations; brand protection; lead routing inefficiency; royalty collection | Unite-Hub CRM multi-tenant; NRPG service-area coverage; Synthex brand compliance; automated reporting |

### 2.2 Detailed Persona Profiles

#### Persona 1: "Sarah the Restoration Owner" — Regional Restoration Operator

- **Demographics:** 35–55, owns a restoration company in Brisbane/Melbourne/Perth/Auckland, 5–30 employees
- **Pain Points:**
  - Spends $3–8K/month on Google Ads with diminishing returns
  - Website is outdated, no content marketing, invisible in local search
  - Struggling to compete against franchise brands (Steamatic, Chem-Dry)
  - Insurance panel work requires certifications she doesn't have documented
  - Seasonal demand fluctuations
- **Unite-Group Value:**
  - RestoreAssist authority content brings organic leads at 70% lower CPA
  - NRPG verified badge differentiates from cowboy operators
  - Synthex auto-generates service-area pages for each suburb she covers
  - Unite-Hub CRM gives her pipeline visibility without an admin hire
- **AU/NZ Specific:** Australian restoration market is $4.2B annually; NZ is $800M. Post-flood/fire demand surges in cyclone/storm seasons (Nov–Apr in AU, Jun–Sep in NZ)

#### Persona 2: "James the Property Manager" — Property Management Firm

- **Demographics:** 28–45, works for a strata management firm or real estate agency, manages 50–500 properties
- **Pain Points:**
  - When water damage happens at 2am, finding a reliable contractor takes hours of calls
  - Managing 15+ different contractors across different trades is chaotic
  - No way to compare quality or pricing without doing work himself
  - Compliance documentation for strata/BCA requirements is manual
- **Unite-Group Value:**
  - NRPG verified contractor network: pre-vetted, qualified, insured tradespeople
  - Online-first dispatch: no phone tag, automated matching by service area
  - Budget ledger: cap spend per event, transparent pricing
  - Automated compliance: work evidence, photos, certifications captured digitally
- **AU/NZ Specific:** 350,000+ strata schemes in AU; Property Management is $1.2B AU industry; Building Act compliance in NZ requires documented contractor credentials

#### Persona 3: "Dave the Tradie" — Sole Trader

- **Demographics:** 25–50, independent carpet cleaner or water damage specialist, 1–2 person operation, services 2–3 suburbs
- **Pain Points:**
  - Leads come in waves — busy one month, starving the next
  - Can't afford $2K/month on marketing; competes with companies spending $10K+
  - Spends 30% of time on admin (quoting, invoicing, chasing payment)
  - No online presence; relies entirely on word-of-mouth
- **Unite-Group Value:**
  - NRPG membership ($49–99/mo) includes leads, profile page, verified badge
  - Unit-Hub CRM handles quoting, invoicing, follow-ups automatically
  - Synthex generates his website content and SEO without hiring a copywriter
  - Budget-capped leads: never overspends on lead acquisition
- **AU/NZ Specific:** 400,000+ sole traders in AU trades sector; NZ tradie shortage means qualified operators are in high demand and can command premium pricing

#### Persona 4: "Michelle the Loss Adjuster" — Insurance Industry

- **Demographics:** 30–55, works for an insurance company or independent loss adjusting firm, covers regional AU/NZ
- **Pain Points:**
  - Finding qualified contractors in regional/rural areas is near-impossible
  - Response time SLAs (4–24 hrs) are hard to meet when contractor search takes days
  - Quality control is inconsistent — no standardised evidence of work
  - Claims documentation is still largely paper-based and slow
- **Unite-Group Value:**
  - NRPG regional coverage map: find verified contractors in any AU/NZ service area
  - RestoreAssist education: contractors are pre-educated on insurance processes
  - Verified quality metrics: before/after evidence, customer ratings, certifications
  - Automated claims documentation: digital evidence capture, timestamped reports
- **AU/NZ Specific:** AU insurance industry pays $5.8B/year in claims; major insurers (IAG, Suncorp, QBE) have preferred contractor panels; NZ Earthquake Commission (EQC) requires documented contractor verification

#### Persona 5: "The Franchise HQ" — Multi-Site Chain Operator

- **Demographics:** COO/Franchise Manager, oversees 10–100 franchise locations across AU/NZ
- **Pain Points:**
  - Brand consistency: franchisees going rogue on pricing, quality, marketing
  - Lead routing: inbound leads don't always reach the right franchisee
  - Royalty collection: manual, dispute-prone, slow
  - Data visibility: can't see real-time performance across all locations
- **Unite-Group Value:**
  - Unite-Hub CRM multi-tenant: each franchisee operates independently under franchise oversight
  - NRPG service-area routing: leads automatically matched to nearest franchisee
  - Synthex brand compliance: AI ensures all content matches brand guidelines
  - Automated royalty calculation + real-time portfolio dashboard
- **AU/NZ Specific:** 1,100+ franchise systems in AU; restoration franchises growing at 12% CAGR; NZ franchise market is $30B+ with strong restoration/trades representation

---

## 3. NRPG MEMBER CONNECTION STRATEGY

### 3.1 What NRPG Provides to Contractors

| Value Dimension | Detail |
|-----------------|--------|
| **Verified Leads** | Pre-qualified leads from RestoreAssist authority content. Not cold calls — these are people actively searching for help |
| **Digital Presence** | Professional profile page with certifications, before/after gallery, reviews. No need to build a website |
| **Service-Area Protection** | Budget-capped lead distribution prevents oversaturation in any one area |
| **Quality Verification** | Verified badge shows customers they're IICRC-certified, insured, and background-checked |
| **Admin Automation** | Unite-Hub handles quoting, invoicing, scheduling, follow-ups |
| **Content Marketing** | Synthex generates SEO content, social posts, and educational materials |
| **Community** | Network of fellow contractors for advice, referrals, bulk purchasing power |
| **Evidence-Based Growth** | KPI snapshots, job completions, customer ratings — data-driven business decisions |

### 3.2 NRPG Onboarding Journey

```
CONTRACTOR DISCOVERS NRPG
         │
         ▼
┌─────────────────────────┐
│ 1. APPLICATION (Online) │  ← RestoreAssist content drives discovery
│    - Trade type          │
│    - Service areas       │
│    - Qualifications      │
│    - Insurance details   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. VERIFICATION (48hrs) │  ← Automated credential checks
│    - ABN/NZBN validation│
│    - Insurance verify    │
│    - IICRC cert check    │
│    - Police check opt.   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. PROFILE BUILD (Auto) │  ← Synthex generates profile copy
│    - Service pages       │
│    - Service-area pages  │
│    - Photo gallery       │
│    - Review collection   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. ACTIVATION            │
│    - First 5 leads FREE │  ← Prove value before charging
│    - CRM walkthrough    │
│    - Content approval    │
│    - Budget cap set      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. ONGOING OPERATION    │
│    - Monthly budget cap  │
│    - Lead distribution   │
│    - KPI tracking        │
│    - Community access    │
│    - Retreat/expand logic│
└─────────────────────────┘
```

### 3.3 Differentiation from Generic Lead-Gen Services

| Generic Lead-Gen (Hipages, Airtasker, ServiceSeeking) | NRPG (Unite-Group) |
|-------------------------------------------------------|---------------------|
| Sell the same lead to 5+ contractors | Budget-capped exclusive distribution |
| Race-to-the-bottom pricing | Quality-verified, professional presentation |
| No ongoing relationship | Integrated CRM + content + community |
| No brand differentiation | Verified badge + IICRC certification |
| Generic service categories | Restoration-specific: water, fire, storm, mould |
| No education component | RestoreAssist educational content builds trust |
| Phone-first, directory-style | Online-first, content-driven, no fake locations |
| No franchise/network effect | NRPG network effects: more contractors = better coverage = more leads |
| Transactional | Relational: community, referrals, bulk purchasing |
| No controlled-retreat logic | Intelligent: exits underperforming areas, expands winners |

### 3.4 NRPG Activation Metrics

| Metric | Target (90 days) | Target (180 days) |
|--------|------------------|-------------------|
| Contractor applications | 200/month | 500/month |
| Verification completion rate | >70% | >80% |
| Profile activation (profile built + live) | >60% | >75% |
| First 5 free leads → paid conversion | >40% | >55% |
| Monthly active contractors | 50 | 200 |
| Contractor NPS | >7 | >8 |
| Lead acceptance rate by contractors | >25% | >40% |
| Average contractor monthly spend | $99 | $149 |

---

## 4. SERVICE-AREA COVERAGE MODEL

### 4.1 Online-First, No-Fake-Location Model

**Core Principle:** Unite-Group operates as a purely digital platform. No physical offices, no storefront assumptions, no misleading "local presence" in areas where no team member exists.

**How It Works:**
- Service-area pages target specific suburbs/regions (e.g., "Water Damage Restoration Brisbane Northside")
- Each page is genuinely authored with local knowledge (Synthex + local research)
- Contractor coverage is mapped to real NRPG members in those areas
- Where no contractor exists, the page honestly states "Service available via NRPG network — response time 24–48hrs"
- GBP (Google Business Profile) used only where legitimately eligible — no keyword stuffing, no fake addresses

### 4.2 Priority City/Region Sequence

**Tier 1 — Foundational (Months 1–3): Where we have active contractors**

| Priority | City/Region | Rationale |
|----------|-------------|-----------|
| 1 | Brisbane Metro (All) | Active client (CCW Carpet Cleaning), proven market |
| 2 | Gold Coast | Adjacent to Brisbane, high population density, storm/flood risk |
| 3 | Sunshine Coast | Growing region, established restoration demand |
| 4 | Auckland Metro | NZ's largest market, active storm/flood risk |
| 5 | Melbourne Metro | AU's second-largest market, established restoration demand |

**Tier 2 — Expansion (Months 4–6): Where demand exists but contractor coverage needs building**

| Priority | City/Region | Rationale |
|----------|-------------|-----------|
| 6 | Sydney Metro | Largest AU market, high competition opportunity |
| 7 | Perth Metro | Isolated market, premium pricing opportunity |
| 8 | Wellington + Hutt Valley | NZ capital, government/insurance sector demand |
| 9 | Adelaide Metro | Underserved market, low competition |
| 10 | Canberra/ACT | Government sector demand, high-income demographics |
| 11 | Christchurch | Post-earthquake rebuild demand continuing |

**Tier 3 — Regional Dominance (Months 7–12): Regional cities and high-risk areas**

| Priority | City/Region | Rationale |
|----------|-------------|-----------|
| 12 | Newcastle/Hunter | Flood/storm risk, large population |
| 13 | Townsville/Cairns | Cyclone/flood region, high restoration demand |
| 14 | Darwin | Cyclone season, tropical storm damage |
| 15 | Geelong/Ballarat | Regional VIC growth corridors |
| 16 | Waikato/Bay of Plenty | NZ regional expansion |
| 17 | Tauranga | NZ fastest-growing city |
| 18 | Hamilton NZ | Agricultural restoration demand |
| 19 | Wollongong | Coastal storm risk |
| 20 | Hobart | Underserved, low competition |

### 4.3 Coverage Gap Measurement

```
SERVICE-AREA COVERAGE HEALTH = 
    (Active NRPG contractors in area) / (Total addressable demand in area) × 100

COVERAGE TIERS:
┌───────────────┬───────────────────────────────────────────┐
│ TIER          │ CRITERIA                                  │
├───────────────┼───────────────────────────────────────────┤
│ GREEN (80%+)  │ 3+ verified contractors, <24hr response  │
│ AMBER (40-79%)│ 1-2 contractors, 24-48hr response         │
│ RED (<40%)    │ 0 verified contractors OR >48hr response  │
└───────────────┴───────────────────────────────────────────┘

GAP DETECTION:
- Synthex monitors Search Console for restoration-related queries in RED areas
- Unite-Hub flags service-areas with demand but weak contractor coverage
- Command Center surfaces "expand" vs "retreat" recommendations
- Budget ledger tracks lead cap usage by area
```

### 4.4 Coverage Expansion Playbook

For each new service area:

1. **Demand Validation:** Synthex checks Search Console volume for restoration queries
2. **Contractor Search:** NRPG recruitment campaign targeting local contractors
3. **Content Production:** Synthex generates service-area page + supporting content
4. **Soft Launch:** 3 verified contractors minimum before page goes live
5. **KPI Monitoring:** 90-day performance review — expand or controlled retreat
6. **Budget Cap Activation:** Lead distribution cap to prevent oversaturation

---

## 5. PRODUCTIVITY ENHANCEMENT THROUGH AUTOMATION

### 5.1 End-to-End Automated Workflow

```
LEAD INTAKE                    CRM PIPELINE                 CONTRACTOR DISPATCH
─────────────────────────────  ───────────────────────────  ─────────────────────
RestoreAssist visitor          Lead captured in Unite-Hub   Matched to NRPG member
├─ Content engagement          ├─ Auto-scored (AI)          ├─ Auto-dispatched
├─ Form/chatbot interaction    ├─ Pipeline stage assigned   ├─ Job accepted
├─ Email capture               ├─ Follow-up scheduled       ├─ Scheduling confirmed
└─ Lead scored                 └─ Quote generated           └─ Evidence collected
       │                              │                            │
       ▼                              ▼                            ▼
CONTENT CREATION                 SEO/SEARCH                   REVIEW/EVIDENCE
─────────────────                ──────────                   ──────────────
Synthex generates:               Synthex monitors:            NRPG captures:
├─ Service-area pages            ├─ Search Console opps       ├─ Before/after photos
├─ Educational articles          ├─ Ranking changes           ├─ Customer reviews
├─ Social media posts            ├─ Competitor movements      ├─ Quality certifications
├─ GBP updates                   └─ Budget cap usage          └─ Claims documentation
└─ Email campaigns                      │
       │                                ▼
       ▼                         KPI/REPORTING
  APPROVAL GATE                  ─────────────
  ┌──────────┐                   Pi-CEO Dashboard:
  │ QA Check │                   ├─ Daily digest
  │ Evidence │                   ├─ Portfolio health
  │ Review   │                   ├─ At-risk alerts
  └──────────┘                   ├─ KPI strips
       │                         └─ Business 360 views
       ▼
  PUBLISHED
```

### 5.2 Current Manual Bottlenecks

| Bottleneck | Current State | Automation Target |
|------------|---------------|-------------------|
| **Lead intake** | Manual form review, human qualification | AI scoring + auto-routing (80% of leads) |
| **CRM data entry** | Client portals require manual updates | Auto-sync from lead capture to pipeline |
| **Content creation** | Synthex drafts, human reviews all | Approval workflow: auto-publish low-risk, human-review high-risk |
| **Contractor dispatch** | Manual matching, phone calls | Algorithmic matching by service area + availability |
| **GBP updates** | Manual posting | Synthex drafts → approval gate → auto-publish |
| **Invoice generation** | Manual Stripe billing per client | Auto-invoice on signup + usage-based billing |
| **KPI reporting** | Manual data compilation | Pi-CEO auto-generates daily digests |
| **Review responses** | Manual drafting | AI-drafted responses → approval → auto-post |
| **Backup verification** | PITR disabled, manual pg_dump | PITR enabled + automated restore drills |
| **Security scanning** | Deepsec findings manually triaged | Auto-triage false positives, ticket real issues |

### 5.3 Automation Priority Stack

**P0 — Automate Now (Week 1–4):**

| Workflow | Implementation | Expected Time Saved |
|----------|---------------|-------------------|
| Lead scoring + routing | AI model on lead form data | 5 hrs/day |
| Content approval workflow | Low-risk auto-publish, high-risk human gate | 3 hrs/day |
| CRM lead-to-pipeline sync | Webhook from RestoreAssist → Unite-Hub | 2 hrs/day |
| GBP draft → publish | Synthex → approval gate → auto-publish | 1 hr/day |
| Invoice auto-generation | Stripe subscription + usage metering | 4 hrs/week |

**P1 — Automate Next (Week 5–8):**

| Workflow | Implementation | Expected Time Saved |
|----------|---------------|-------------------|
| Contractor dispatch | Service-area matching algorithm | 3 hrs/day |
| Review response drafting | AI-generated responses → approval queue | 2 hrs/day |
| KPI digest generation | Pi-CEO auto-compilation → daily delivery | 1 hr/day |
| Backup validation | Automated RestoreAssist script (fix bug first) | 2 hrs/week |
| SEO opportunity detection | Synthex → Search Console → action items | 3 hrs/week |

**P2 — Automate Later (Week 9–12+):**

| Workflow | Implementation | Expected Time Saved |
|----------|---------------|-------------------|
| Controlled-retreat logic | Auto-exit underperforming service areas | 2 hrs/week |
| Budget cap enforcement | Auto-pause lead distribution at cap | 1 hr/week |
| Social media scheduling | AI-generated → scheduled → posted | 3 hrs/week |
| Multi-tenant reporting | Per-franchisee automated reports | 4 hrs/week |
| Voice task processing | Margot voice command → task execution | Ongoing |

### 5.4 Productivity Targets

| Metric | Current | 90-Day Target | 180-Day Target |
|--------|---------|---------------|----------------|
| Manual tasks per day | ~20 | <10 | <5 |
| Content pieces produced/week | 2–3 | 8–10 | 15–20 |
| Lead response time | 2–4 hours | <30 minutes | <5 minutes |
| Contractor dispatch time | 1–2 hours | <15 minutes | <5 minutes |
| Human hours saved/week | 0 | 25 | 45 |
| Cost per lead (organic) | $50–80 (paid) | $15–25 (organic content) | $5–10 (scaled) |

---

## 6. RESOURCE REQUIREMENTS

### 6.1 Infrastructure Resources

| Component | Current State | Requirement | Cost Estimate | Priority |
|-----------|---------------|-------------|---------------|----------|
| **Supabase Production** | Active (syd1), 33 migrations | Enable PITR (~$10/mo); upgrade to Pro for higher limits | $10–25/mo | P0 |
| **Supabase Sandbox** | Active (schema mirror) | Maintain for testing; fix psql auth | $0 (included) | P0 |
| **Vercel Hosting** | Active (syd1 region) | Consider multi-region failover (add iad1 or sfo1) | $20/mo (Pro) | P1 |
| **Sentry Error Tracking** | Not implemented | Add to production for observability | Free tier → $26/mo | P0 |
| **Log Archival** | Vercel logs only (3–14 day retention) | Ship to Axiom or Datadog (90-day retention) | $15–50/mo | P1 |
| **Domain/DNS** | unite-group.vercel.app, custom domain | Document registrar, enable domain lock | ~$20/yr | P1 |
| **CI/CD Pipeline** | GitHub Actions active | Add automated test gate, deploy previews | $0 (GitHub) | P0 |

**Total Infrastructure Estimate:** $80–150 AUD/month

### 6.2 Tooling Resources

| Tool | Purpose | Current | Needed | Estimate |
|------|---------|---------|--------| ----------|
| **Intercom/Help Scout** | In-app help widget | None | Required | $50–100/mo |
| **LaunchDarkly/Unleash** | Feature flags | None | Required | Free OSS / $50/mo |
| **Dependabot/npm audit** | Dependency updates | Partial | Full automation | Free |
| **Statuspage.io** | Incident status page | None | Required | $0–29/mo |
| **Rewardful/Stripe Connect** | Affiliate/referral tracking | None | Required for growth | $50/mo |
| **Figma/design tools** | UX/UI design | Ad hoc | Product designer needed | External |

**Total Tooling Estimate:** $150–250 AUD/month

### 6.3 Staffing Resources

| Role | Status | Need | Timeline | Budget |
|------|--------|------|----------|--------|
| **Phill (Founder/CEO)** | Active | Reduce to strategic oversight | Ongoing | Current |
| **Product Designer** | None | HIRE — #1 priority for UX polish | Month 2 | $120–160K AUD/yr |
| **Full-Stack Engineer** | Phill-dependent | HIRE — accelerate self-service build | Month 1–2 | $120–150K AUD/yr |
| **Content Marketer** | Synthex only | HIRE — manage content at scale | Month 3–4 | $80–100K AUD/yr |
| **DevOps/SRE** | None | PART-TIME — manage DR, monitoring | Month 2–3 | $40–60K AUD/yr (PT) |
| **Sales/Business Dev** | Phill | HIRE — NRPG contractor acquisition | Month 4–5 | $80–100K AUD/yr + commission |
| **Customer Success** | None | HIRE — when >20 active clients | Month 5–6 | $70–90K AUD/yr |

**Staffing Budget (180 days):** ~$250–350K AUD total

### 6.4 Legal/Compliance Resources

| Item | Need | Timeline | Estimate |
|------|------|----------|----------|
| **SaaS Terms of Service** | Required before self-service signup | Week 1–2 | $2–3K (AU lawyer) |
| **Privacy Policy (SaaS-specific)** | GDPR/Privacy Act 1988 compliance | Week 1–2 | $1–2K |
| **Data Processing Agreement** | Required for enterprise clients | Month 2–3 | $1–2K |
| **PCI DSS Self-Assessment** | For Stripe integration | Month 2 | Internal (no cost) |
| **SOC 2 Type I Gap Analysis** | For enterprise credibility | Month 4–6 | $10–20K (auditor) |

### 6.5 Budget Summary (180 Days)

| Category | Months 1–3 | Months 4–6 | Total 180 days |
|----------|------------|------------|----------------|
| **Infrastructure** | $480 | $600 | $1,080 |
| **Tooling** | $900 | $1,200 | $2,100 |
| **Staffing** | $100K | $180K | $280K |
| **Legal/Compliance** | $8K | $15K | $23K |
| **Marketing/GTM** | $5K | $15K | $20K |
| **Contingency (15%)** | $17K | $31K | $48K |
| **TOTAL** | ~$131K | ~$242K | **~$374K AUD** |

### 6.6 Key Decision Gates

| Gate | Decision Required | Deadline | Impact |
|------|-------------------|----------|--------|
| **Board: PITR approval** | Enable $10/mo PITR on Supabase | Week 1 | Unblocks DR validation |
| **Board: First hire** | Approve Full-Stack Engineer | Week 2 | Accelerates self-service build |
| **Board: Product Designer** | Approve design hire | Month 2 | UX polish (market readiness) |
| **Legal: ToS/Privacy** | Approve SaaS legal docs | Week 3 | Unblocks self-service signup |
| **Board: Pricing model** | Finalise tiered pricing | Month 1 | Revenue model clarity |
| **Board: GTM budget** | Approve $20K GTM spend | Month 2 | Growth acceleration |

---

## 7. COMPETITIVE POSITIONING IN AU/NZ

### 7.1 Competitive Landscape

| Competitor | Segment | Strengths | Weaknesses | Unite-Group Advantage |
|------------|---------|-----------|------------|----------------------|
| **Hipages** | Lead marketplace | Market leader in AU, 40K+ tradies, strong brand | Generic (all trades), no verification quality, race-to-bottom pricing, no content/education | NRPG: restoration-specific, quality-verified, content-driven authority |
| **ServiceSeeking** | Lead marketplace | Established AU platform, insurance partnerships | Generic services, no brand differentiation, limited education content | RestoreAssist: educational content builds trust; NRPG verified badge |
| **Airtasker** | Task marketplace | Strong AU/NZ presence, flexible model | Gig economy perception, no professional verification, commoditized | NRPG: professional contractors only; verified quality; ongoing relationship |
| **Steamatic** | Franchise (restoration) | 40+ AU locations, brand recognition, IICRC certified | Franchise fees high ($200K+), limited to franchisees, not in NZ | NRPG open membership, lower cost ($49–99/mo), NZ coverage |
| **Chem-Dry** | Franchise (carpet) | Global brand, proprietary products | Franchise model, carpet-only, not restoration-focused | Broader restoration scope, no franchise lock-in |
| **Local SEO Agencies** | Marketing services | Local expertise, done-for-you service | $2–5K/month for basic SEO, no lead management, no CRM | Integrated platform: CRM + content + leads + dispatch at $2,750/mo |
| **HubSpot/Salesforce** | CRM platforms | Enterprise-grade, mature features | $500–2000+/month, overkill for small restoration firms, no industry content | Industry-specific, affordable, content + CRM integrated |
| **Generic WordPress + Leads** | DIY approach | Low cost, flexible | No CRM, no dispatch, no verification, no automation | Complete integrated system; no technical knowledge needed |

### 7.2 Unite-Group's Unique Value Proposition

**For Restoration Companies:**
> "The operating system for your restoration business — leads, CRM, content, compliance, and contractor network. All in one platform. Online-first, no fake locations, no storefront assumptions."

**For Contractors (NRPG Members):**
> "Stop chasing leads. Start receiving verified, pre-qualified restoration jobs in your service area. Verified badge, profile page, admin automation, and a network of fellow professionals. Budget-capped so you never overspend."

**For Property Managers:**
> "Find verified, insured, certified contractors in any AU/NZ service area within 24 hours. Online-first dispatch with automated compliance documentation. No more 2am phone calls searching for someone."

### 7.3 Why AU Restoration Companies Choose Unite-Group

| Decision Factor | Local Agency | Global Platform (HubSpot) | Unite-Group |
|-----------------|-------------|---------------------------|-------------|
| **Industry Expertise** | Some local knowledge | None | Deep restoration-specific |
| **Cost** | $2–5K/month | $500–2000/month | $2,750/month |
| **Lead Generation** | Manual SEO | None (you bring leads) | Integrated: content + organic + NRPG network |
| **CRM** | Spreadsheet/basic | Powerful but complex | Industry-specific, simple |
| **Contractor Network** | None | None | NRPG verified contractor network |
| **Content/SEO** | Separate service | Add-on module | Synthex AI — integrated, automated |
| **Dispatch** | Manual | Manual | Algorithmic matching by service area |
| **Compliance** | Manual | Manual | Automated evidence capture |
| **Online-First** | Some | Yes | Core design principle |
| **AU/NZ Specific** | Local only | Global generic | Purpose-built for AU/NZ |
| **No Fake Locations** | Often pretend | Pretend | Honest, transparent |
| **Community/Network** | None | Online forums | NRPG contractor community |

### 7.4 Competitive Moat Strategy

**Layer 1: Content Authority (0–6 months)**
- RestoreAssist becomes the #1 organic resource for AU/NZ restoration education
- Synthex produces 100+ service-area pages, 500+ educational articles
- NRPG member profiles with verified badges populate contractor directory
- Result: Organic traffic dominance at 70% lower CPA than paid alternatives

**Layer 2: Network Effects (6–12 months)**
- More NRPG contractors → better regional coverage → faster response times
- More regional coverage → more inbound leads → more contractors join
- More contractor reviews → higher trust → more customer conversions
- Result: Self-reinforcing flywheel that competitors cannot easily replicate

**Layer 3: Data & AI Advantage (12–24 months)**
- Pi-CEO accumulates portfolio data across all clients and regions
- AI models improve: lead scoring, content generation, dispatch matching
- Synthex learns AU/NZ restoration market patterns at scale
- Result: Intelligence moat — the more data, the better the platform performs

**Layer 4: Ecosystem Lock-in (24+ months)**
- Clients have pipeline history, content libraries, contractor relationships in platform
- NRPG members have profiles, reviews, lead history, community connections
- Switching cost increases with each month of use
- Result: High retention, predictable revenue, expansion revenue from upsell

### 7.5 Positioning Statement

**For the Market:**
> "Unite-Group is the operating system for Australia and New Zealand's restoration industry. We connect property owners with verified contractors through educational content, intelligent lead matching, and integrated business management — all online-first, all without fake locations or storefront assumptions."

**Against Competitors:**
> "Unlike generic lead marketplaces (Hipages, ServiceSeeking), we're restoration-specific with verified quality. Unlike expensive franchises (Steamatic, Chem-Dry), we're open to all contractors at $49–99/month. Unlike global CRMs (HubSpot, Salesforce), we're purpose-built for AU/NZ restoration with integrated content, dispatch, and compliance."

---

## 8. ACTIONABLE RECOMMENDATIONS

### 8.1 Immediate Actions (Week 1–2)

| # | Action | Owner | Deadline | Deliverable |
|---|--------|-------|----------|-------------|
| 1 | Approve PITR on Supabase ($10/mo) | Board | Day 2 | PITR enabled |
| 2 | Fix psql auth issue | DevOps | Day 3 | Backup restore tested |
| 3 | Fix RestoreAssist connection string bug | Engineering | Day 3 | Validation script works |
| 4 | Fix 50 React Compiler errors | Engineering | Day 5 | ESLint clean |
| 5 | Add Sentry error tracking | Engineering | Day 5 | DSN configured |
| 6 | Draft SaaS Terms of Service | Legal | Day 10 | Legal review complete |
| 7 | Draft SaaS Privacy Policy | Legal | Day 10 | Legal review complete |
| 8 | Add 10 missing env vars to docs | DevOps | Day 7 | Inventory complete |
| 9 | Wire CI gate for test:all | DevOps | Day 7 | CI blocks on failures |
| 10 | Triage 1,845 Deepsec findings | Security | Day 10 | Real issues ticketed |

### 8.2 Short-Term Actions (Week 3–6)

| # | Action | Owner | Deadline | Deliverable |
|---|--------|-------|----------|-------------|
| 11 | Build self-service signup flow | Engineering | Week 4 | Register → Company → Plan → Pay |
| 12 | Build onboarding wizard | Engineering | Week 5 | 3-step company setup |
| 13 | Launch pricing page | Marketing | Week 3 | Public pricing visible |
| 14 | Hire Full-Stack Engineer | Board/HR | Week 4 | Offer accepted |
| 15 | Finalise tiered pricing model | Board/Finance | Week 3 | Pricing approved |
| 16 | Enable Stripe trial period | Engineering | Week 3 | 14-day free trial active |
| 17 | Add "download my data" endpoint | Engineering | Week 5 | GDPR compliance |
| 18 | Build /settings/billing page | Engineering | Week 5 | Self-service billing |

### 8.3 Medium-Term Actions (Week 7–12)

| # | Action | Owner | Deadline | Deliverable |
|---|--------|-------|----------|-------------|
| 19 | Hire Product Designer | Board/HR | Week 8 | UX polish begins |
| 20 | Build in-app help widget | Engineering | Week 8 | Intercom/Help Scout live |
| 21 | Build product onboarding tour | Engineering/Design | Week 9 | 5-step first-run tour |
| 22 | Launch case studies page | Marketing | Week 8 | CCW, Bulcs, Dimitri stories |
| 23 | Create status page (/status) | DevOps | Week 8 | Public uptime visible |
| 24 | Build API key generation | Engineering | Week 10 | Scoped keys, revoke, usage |
| 25 | Build webhook configuration | Engineering | Week 10 | Event delivery |
| 26 | Build changelog (/updates) | Engineering | Week 9 | Auto-from git commits |
| 27 | Plan NRPG contractor recruitment | Sales/Marketing | Week 10 | Recruitment campaign ready |
| 28 | Execute first NRPG recruitment | Sales | Week 12 | 50 contractors onboarded |

### 8.4 Long-Term Actions (Month 4–6)

| # | Action | Owner | Deadline | Deliverable |
|---|--------|-------|----------|-------------|
| 29 | Launch Tier 1 cities (5 regions) | Marketing | Month 4 | Brisbane, Gold Coast, Sunshine Coast, Auckland, Melbourne live |
| 30 | Achieve 200 NRPG contractors | Sales | Month 5 | Network effects kicking in |
| 31 | Launch referral program | Engineering | Month 4 | Credit-for-referrals active |
| 32 | Hire Content Marketer | Board/HR | Month 4 | Content at scale |
| 33 | Hire Sales/Business Dev | Board/HR | Month 5 | Contractor acquisition |
| 34 | Execute Product Hunt launch | Marketing | Month 5 | Awareness spike |
| 35 | SOC 2 Type I gap analysis | DevOps | Month 6 | Compliance roadmap |
| 36 | Launch Tier 2 cities (6 regions) | Marketing | Month 6 | Sydney, Perth, Wellington, Adelaide, Canberra, Christchurch |
| 37 | Achieve $15K MRR target | All | Month 6 | Revenue milestone |

---

## 9. SUCCESS METRICS (90 & 180 Days)

| Metric | Current | 90-Day Target | 180-Day Target |
|--------|---------|---------------|----------------|
| **Revenue** | | | |
| MRR (AUD) | ~$8,250 | $12,000 | $25,000+ |
| Annual Run Rate | ~$99K | $144K | $300K+ |
| Active paying clients | 3 | 8 | 20+ |
| NRPG members (paid) | 0 | 50 | 200+ |
| **Product** | | | |
| Self-service signup flow | ❌ | ✅ | ✅ |
| Product tour/onboarding | ❌ | ✅ | ✅ |
| In-app help widget | ❌ | ✅ | ✅ |
| Status page | ❌ | ✅ | ✅ |
| Trial-to-paid conversion | N/A | 30% | 40% |
| NPS score | N/A | >7 | >8 |
| **Engineering** | | | |
| Security score | 7.2/10 | 8.5/10 | 9.0/10 |
| Test coverage | ~70% | 80% | 85% |
| Uptime | 99.5% | 99.9% | 99.95% |
| Deploy frequency | Daily | Multiple daily | Multiple daily |
| **Growth** | | | |
| Self-service signups/mo | 0 | 10 | 25 |
| NRPG applications/mo | 0 | 50 | 150 |
| Organic traffic/mo | ~5K | 15K | 40K |
| Support tickets/week | ~3 manual | <5 self-serve | <8 (scaled) |
| **AU/NZ Coverage** | | | |
| Service areas live | 1 (Brisbane) | 5 | 11 |
| NRPG coverage GREEN areas | 1 | 3 | 7 |

---

## 10. RISK REGISTER — STRATEGY RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Self-service build takes longer than 6 weeks** | Medium | High | Hire engineer early; scope MVP tightly |
| **NRPG contractor recruitment slower than expected** | High | High | Offer first 5 leads free; focus on Brisbane first |
| **Competitor launches similar product** | Low | High | Speed to market; content moat; network effects |
| **AU/NZ regulatory changes (Privacy Act, gig economy)** | Low | Medium | Legal review quarterly; flexible pricing model |
| **Supabase outage causes data loss** | Low | Critical | PITR approval; quarterly restore drill |
| **Single-founder risk (Phill bottleneck)** | High | High | First hire priority; document processes |
| **Pricing too high for sole traders** | Medium | Medium | Tiered pricing; $49 NRPG entry; free trial |
| **Content doesn't rank in 90 days** | Medium | Medium | Paid search bridge; local partnerships |
| **Client churn >10%/month** | Low | High | Customer success hire; NPS monitoring |

---

## 11. CONCLUSION

Unite-Group is uniquely positioned to dominate the AU/NZ restoration industry through an integrated, online-first platform that connects content authority (RestoreAssist + Synthex) with lead management (Unite-Hub CRM) and verified contractor supply (NRPG).

The architecture is sound. The products are real. The clients exist. The infrastructure is production-grade. What's needed is a 6-month execution sprint to:

1. **Productize the platform** (Weeks 1–6): Self-service signup, pricing, onboarding
2. **Build network effects** (Months 2–4): NRPG recruitment, content at scale
3. **Expand coverage** (Months 4–6): Tier 1 → Tier 2 cities, network effects flywheel
4. **Establish moat** (Months 6+): Data intelligence, ecosystem lock-in

The $2B North Star by 2028-06-30 requires radical execution from this point forward. But the path to $1M ARR within 12 months is visible, achievable, and funded through the resources outlined in this document.

**The question is not whether Unite-Group can dominate AU/NZ. The question is whether the Board will approve the resources and execute with urgency.**

---

**Document Status:** DRAFT v1.0  
**Prepared by:** Strategic Architecture Team  
**Reviewed by:** [Pending — Phill McGurk, Board]  
**Approved by:** [Pending]  
**Next Review:** 2026-06-09  

---

*End of Document*
