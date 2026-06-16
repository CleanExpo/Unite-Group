# Unite-Group — Senior PM Forward-Pathway & Brainstorming Plan
## Authored: Margot (Senior Project Manager)
## Date: 2026-05-31
## Branch: `margot/react-19-next-16-migration`
## Status: Migration Complete. Productization In Progress.

---

## 1. EXECUTIVE SUMMARY

Unite-Group is not a market-ready SaaS. It is a highly-functioning **agency operations platform** with three real paying clients (CCW, Bulcs Holdings, Dimitri ITR), a Stripe billing integration, an AI content pipeline (Synthex), and a mature engineering foundation (Next.js 16, React 19, 1,106 tests, 33 DB migrations).

The gap to self-service SaaS is **knowable and finite**. It is not a rebuild. It is a **bridge**.

This document is the bridge plan.

---

## 2. PROJECT STATE — THE FULL SURVEY

### 2.1 Platform Foundation

| Layer | Status | Evidence |
|-------|--------|----------|
| React / Next.js | ✅ Migrated | 19.2.6 / 16.2.6, Turbopack, all gates green |
| TypeScript | ✅ Strict | tsc --noEmit = 0 errors |
| Test coverage | ✅ Solid | 142 suites, 1,105 tests passing |
| Database | ✅ Mature | 33 migrations, RLS policies, pgvector |
| Auth | ✅ Working | Supabase auth, MFA support, profiles table |
| CI/CD | ✅ Flowing | GitHub Actions, deepsec, gitleaks, branch protection |
| Security | 🟡 Foundation | gitleaks + deepsec active, 50 React Compiler warnings, 76 outdated deps |
| Backup/DR | 🟡 Foundation | 7 daily backups, PITR disabled, psql auth unresolved |

### 2.2 Product Surface

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage | ✅ Live | Karen opener, hero, feature cards, SEO meta |
| Services page | ✅ Live | 4 service descriptions, named-operator pattern |
| Contact page | ✅ Live | Named-human (Phill), email CTA |
| Pricing page | ✅ Built | $2,750/mo, $4,400 setup, 12-month min, static prerendered |
| Blog / content | ✅ Pipeline | Synthex AI produces articles; CMS via Supabase |
| Client portals | ✅ CCW, Bulcs, Dimitri | Custom per-client portals with brand config |
| CRM / dashboard | ✅ Internal | Empire Command Center with client management |
| Auth (login/register) | ✅ Working | Supabase auth, validation, rate limiting |
| Stripe billing | ✅ Active | Checkout sessions, subscriptions, invoices |
| **Self-service signup** | ❌ **MISSING** | Register exists but no company onboarding flow |
| **Product tour / onboarding** | ❌ **MISSING** | No first-run experience |
| **In-app help** | ❌ **MISSING** | No docs, no chat widget, no FAQ in product |
| **Cancellation flow** | ❌ **MISSING** | No self-service downgrade/cancel |
| **GDPR data export** | ❌ **MISSING** | No "download my data" feature |
| **SaaS Terms of Service** | ❌ **MISSING** | Current /privacy page is generic, not SaaS-specific |

### 2.3 Revenue & Clients

| Client | Status | Revenue Model |
|--------|--------|--------------|
| CCW Carpet Cleaning | 🟢 Active | Retainer + portal access |
| Bulcs Holdings | 🟢 Active | Retainer |
| Dimitri ITR | 🟢 Active | Retainer + custom portal |
| Synthex AI | 🟢 Active | Content pipeline (internal product) |

**Estimate MRR:** ~$8,250+ AUD (3 clients × $2,750 base)

### 2.4 Marketing & SEO

| Component | Status |
|-----------|--------|
| SEO meta (OpenGraph, Twitter, canonical) | ✅ Every page |
| LocalBusiness schema | ✅ Client portals |
| VideoObject schema | ✅ Client portals |
| Sitemap.xml | ✅ Auto-generated |
| Analytics dashboard | ✅ Internal |
| Content pipeline (Synthex) | ✅ Active |

---

## 3. THE GAP ANALYSIS — What Separates "Agency Platform" from "Self-Service SaaS"

The gap is not engineering complexity. It is **product-market interface**.

| SaaS Requirement | Current State | Gap Size | Risk |
|------------------|---------------|----------|------|
| Self-service signup | Basic register form exists; no company creation, no plan selection | Medium | Blocking |
| Transparent pricing | Page built today; not linked from main nav | Small | Non-blocking |
| Product onboarding wizard | None exists | Medium | Conversion risk |
| In-app help / docs | None exists | Medium | Support burden |
| SaaS-specific ToS | Generic /privacy exists | Small | Legal risk |
| Self-service cancellation | None exists | Medium | Churn visibility |
| GDPR data export | None exists | Medium | Compliance risk |
| API keys for integrations | None exists | Medium | Enterprise appeal |
| Status page | None exists | Small | Trust signal |
| Free trial / freemium | None exists | Large | Top-of-funnel |

**Verdict:** 6–8 weeks of focused product work converts this from "agency platform" to "self-service SaaS with human onboarding backup."

---

## 4. THE FORWARD PATHWAY — 4-Phase Plan

### Phase A: Foundation Hardening (Week 1)
**Goal:** Clean technical debt so productization builds on solid ground.

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Fix 50 React Compiler errors | Engineering | 1 day | ESLint clean |
| Update 76 outdated npm packages | Engineering | 2 days | Dependabot config |
| Resolve psql auth failure | DevOps | 1 day | Backup restore tested |
| Enable PITR on Supabase | DevOps / Board | 0.5 day | Board approval → $10/mo |
| Add Sentry error tracking | Engineering | 0.5 day | Sentry project + DSN |
| Triage 1,845 Deepsec findings | Security | 1 day | False-positive marked, real issues ticketed |

**Gate:** All CI green, security score 8.5+/10.

---

### Phase B: Self-Service Core (Weeks 2–4)
**Goal:** A visitor can sign up, create a company, pick a plan, and pay without talking to Phill.

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Connect marketing CTAs to /register | Engineering | Done ✅ | Hero + homepage + pricing CTA |
| Add company-name + plan selection to register | Engineering | 2 days | Enhanced signup form |
| Build post-signup onboarding wizard | Engineering | 3 days | 3-step: company info → brand prefs → verify email |
| Create self-service nexus_clients row on signup | Engineering | 2 days | Public API (rate-limited) |
| Add "Start free trial" → Stripe checkout link | Engineering | 1 day | Checkout session with trial period |
| Build /settings/billing page | Engineering | 2 days | View invoices, update card, cancel |
| Write SaaS-specific ToS | Legal / Phill | 1 day | docs/legal/saas-terms-of-service.md |
| Update /privacy for SaaS | Legal / Phill | 1 day | GDPR language, data retention |
| Add "download my data" endpoint | Engineering | 2 days | CSV/JSON export |

**Gate:** New user → signup → company → payment in <5 minutes without human intervention.

---

### Phase C: Market-Ready Polish (Weeks 5–6)
**Goal:** Reduce support burden, increase conversion, build trust signals.

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| In-app help widget (Intercom/Help Scout) | Engineering | 2 days | Embedded support |
| Product tour (Framer Motion steps) | Engineering | 2 days | 5-step first-run tour |
| Public status page (/status) | Engineering | 1 day | Health checks + uptime |
| API key generation (/settings/api) | Engineering | 2 days | Scoped keys, revoke, usage |
| Webhook configuration | Engineering | 2 days | Event delivery |
| Case studies page | Marketing | 2 days | CCW, Bulcs, Dimitri stories |
| Testimonials component | Marketing | 1 day | Pull from nexus_clients.feedback |
| Changelog (/updates) | Engineering | 1 day | Auto-from git commits |

**Gate:** Support tickets <5/week, NPS survey shows >7.

---

### Phase D: Go-to-Market (Weeks 7–8)
**Goal:** Acquire self-service customers at scale.

| Task | Owner | Effort | Deliverable |
|------|-------|--------|-------------|
| Product Hunt launch | Marketing | 1 day | Listing + maker comments |
| Indie Hackers post | Marketing | 0.5 day | Build-in-public story |
| Google Ads (restoration CRM keywords) | Marketing | 2 days | Campaign + landing page |
| Partnership with IICRC/CARSI | Business Dev | 2 days | Co-marketing agreement |
| Referral program (/refer) | Engineering | 2 days | Credit for referrals |
| Affiliate tracking | Engineering | 1 day | Stripe Connect or Rewardful |
| Annual discount incentive | Business | 0.5 day | 2 months free for annual |

**Gate:** First 5 self-service signups without sales touch.

---

## 5. DISASTER RECOVERY STATUS

| Component | Status | Last Verified |
|-----------|--------|---------------|
| DR assessment | ✅ Complete | 2026-05-31 |
| DR runbooks (16 scenarios) | ✅ Complete | 2026-05-31 |
| Backup validation scripts | ✅ Active | Weekly cron |
| gitleaks | ✅ Active | Every commit |
| Deepsec | ✅ Fixed | Weekly scan |
| Branch protection | ✅ Fixed | 1 reviewer, admin enforce |
| PITR | ⏳ Board decision | Awaiting approval |
| psql connection | ⏳ Auth issue | Deferred |
| Quarterly DR drill | ⏳ Scheduled | Next: 2026-08-31 |

**Action:** Board must approve PITR (~$10/mo) and provide updated database credentials for psql.

---

## 6. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| React 19 peer dep warning breaks build | Low | High | `--legacy-peer-deps` in .npmrc; monitor @visx/group v4 |
| 76 outdated packages → security vuln | Medium | High | Enable Dependabot; schedule monthly update sprints |
| No self-service → growth bottleneck | High | High | Phase B priority; 3-week focused build |
| Phill as single point of contact | High | Medium | Hire #2; document processes; automate onboarding |
| Supabase outage → data loss | Low | Critical | PITR approval; quarterly restore drill |
| Stripe rate/chargeback issues | Low | Medium | Clear ToS; dispute log; manual review for large amounts |
| Competitor builds similar product | Medium | High | Case studies; IICRC partnership; speed to market |

---

## 7. IMMEDIATE NEXT ACTIONS (This Week)

1. **Approve & merge PR #215** — Phill must approve the React 19 / Next.js 16 migration
2. **Board decision: PITR** — ~$10/mo, enables <1h RPO
3. **Start Phase A** — Fix React Compiler errors (1 day) + update packages (2 days)
4. **Connect Stripe trial pricing** — 14-day free trial on the pricing page
5. **Draft SaaS ToS** — Start from Stripe Atlas template, adapt for ANZ

---

## 8. SUCCESS METRICS (90-Day Targets)

| Metric | Current | Target (90 days) |
|--------|---------|------------------|
| Self-service signups/mo | 0 | 10 |
| Trial-to-paid conversion | N/A | 30% |
| NPS score | N/A | >7 |
| Support tickets/wk | ~3 (manual) | <5 (mostly self-serve) |
| MRR (AUD) | ~$8,250 | $15,000+ |
| Security score | 7.2/10 | 9.0/10 |
| Test coverage | ~70% | >80% |
| Uptime | 99.5% | 99.9% |

---

## 9. CONCLUSION

Unite-Group is closer to self-service SaaS than it appears. The engineering foundation is solid. The clients are real. The revenue exists. What is missing is the **interface layer** — the bridge between "Phill approves every client" and "any restoration firm can sign up and start in five minutes."

That bridge is buildable in 6–8 weeks.

The question is not *can we build it?* The question is *what do we build first?*

---

**Prepared by:** Margot (Senior Project Manager)  
**Reviewed by:** Margot (Disaster Recovery Lead)  
**Approved by:** [Pending — Phill McGurk, Board]
