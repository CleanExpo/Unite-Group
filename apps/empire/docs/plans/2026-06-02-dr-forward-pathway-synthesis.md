# Unite-Group Disaster Recovery & Strategic Forward-Pathway
## Executive Synthesis — Hermes v0.15.x, Pi-Dev-Ops, and AU/NZ Market Dominance

**Date:** 2026-06-02  
**Author:** Margot (Senior PM / Security-DR Lead)  
**Status:** Board Review Required  
**Documents Referenced:**
- `docs/margot/hermes-v15-capability-assessment.md` (Hermes capabilities)
- `docs/plans/2026-06-02-au-nz-market-dominance-architecture.md` (market strategy)
- `docs/runbooks/resource-optimization-assessment.md` (cost optimization)
- `docs/margot/disaster-recovery-assessment.md` (DR baseline)
- `docs/margot/dr-validation-gap-analysis.md` (47 gaps)
- `docs/plans/2026-05-31-senior-pm-forward-pathway.md` (productization roadmap)

---

## 1. EXECUTIVE SUMMARY

Three parallel expert investigations have produced a unified picture of where Unite-Group stands, what Hermes v0.15.x enables, and how to accelerate toward the $2B North Star.

### Current State Snapshot

| Dimension | Score | Trend |
|-----------|-------|-------|
| Security / DR | 7.2/10 | Improving (P0 fixes applied) |
| Infrastructure | 5.5/10 | Needs PITR + sandbox |
| Product Maturity | Agency platform → SaaS bridge | In progress |
| Revenue | ~$8,250 AUD MRR (3 clients) | Growing |
| Hermes Agent | v0.15.1, Pi-Dev-Ops profile active | Upgraded |
| AI Spend | ~$65/mo (Kimi K2.6 = 68%) | Optimizable |

### What's New in Hermes v0.15.x That Changes the Game

1. **Kanban Multi-Agent Platform** (104 PRs, production-grade) — Can orchestrate DR monitoring swarms, content pipeline workers, and NRPG contractor coordination with auto-decomposition and gated verifiers.
2. **Session Search** (4,500x faster, free) — Instant context retrieval from ~2,800 sessions. No aux-LLM cost.
3. **Cron Improvements** (`context_from` chaining, `no_agent` mode, `workdir`) — Enables automated DR health checks at near-zero cost.
4. **Promptware/Brainworm Defense** (built-in, zero-config) — Protects against prompt injection in Synthex content pipeline and public AI tools.
5. **1Password Secret Consolidation** (use existing vendor) — Centralize all API keys in 1Password vault, eliminate `.env.local` drift. $0, 2-3 hours.
6. **Skill Bundles** — `/<bundle-name>` loads multiple skills at once. Recommend DR Response, Content Pipeline, NRPG Ops, Board Prep bundles.

### Bottom Line Recommendation

**Approve 5 quick wins this week ($10/mo, ~4 hours total). Deploy kanban DR swarm within 30 days. Execute AU/NZ market strategy in parallel. The infrastructure and tooling are ready — the gap is execution velocity.**

---

## 2. THE 5 QUICK WINS (This Week)

These are highest-impact, lowest-cost actions approved under existing Board constraints.

| # | Action | Time | Cost | Impact |
|---|--------|------|------|--------|
| 1 | **Enable PITR on Supabase** | 15 min | $10/mo | CRITICAL — RPO from 24h to <1s |
| 2 | **Install postgresql@17** | 15 min | $0 | HIGH — Unblocks all DR verification |
| 3 | **Configure auxiliary model routing** | 20 min | $0 | Saves $240-480/yr |
| 4 | **Run backup health check** | 1 hr | $0 | Automated daily verification |
| 5 | **Security package updates** | 2 hrs | $0 | Fix 2 moderate vulns |

**Total:** ~4 hours, $10/mo. ROI: 40x-400x on PITR alone.

---

## 3. HERMES v0.15.x CAPABILITY INTEGRATION

### 3.1 Kanban Multi-Agent Swarm for DR Monitoring

**Topology:**
```
Root: DR Coordinator
  ├── Worker 1: Supabase Health (no_agent probe)
  ├── Worker 2: Vercel Health (no_agent probe)
  ├── Worker 3: Stripe Health (no_agent probe)
  ├── Worker 4: GitHub Actions Health (no_agent probe)
  ├── Worker 5: SSL/DNS Health (no_agent probe)
  ├── Gated Verifier: All workers green?
  └── Synthesizer: Compile report → Telegram
```

**Benefits:**
- Each service gets isolated health checks
- Gated verifier prevents false alarms
- `no_agent` mode means zero LLM cost for probes
- Failure auto-retriggers with escalation

**Config addition to pi-dev-ops:**
```yaml
kanban:
  max_in_progress: 5
  dispatch_in_gateway: true
  failure_limit: 2
```

**Effort:** 12-16 hours. **Priority:** HIGH.

### 3.2 Session Search for DR Investigations

The ~2,800 sessions in state.db are now instantly searchable (20ms vs old 90s). DR context retrieval no longer requires manual compaction or LLM summarization cost.

**Use cases:**
- "Find the session where we fixed the Supabase stale project ID"
- "What did we decide about PITR in previous sessions?"
- "Show me all incident response sessions from May 2026"

**Effort:** Already active. **Priority:** HIGH — start using immediately.

### 3.3 Cron Automation Matrix (6 Jobs)

| Job | Schedule | Cost/Run | Purpose |
|-----|----------|----------|---------|
| Backup Health Check | Daily 6am | $0.002 | Verify Supabase backups |
| Dependency Audit | Mon 8am | $0.05 | npm outdated + audit |
| SSL/DNS Check | Mon/Thu 9am | $0 | Cert + DNS monitoring |
| Cost Report | Mon 10am | $0.03 | AI spend tracking |
| DeepSec Review | Wed 7am | $0.05 | Security scan triage |
| Sandbox Parity | Sat 5am | $0.05 | Schema diff check |

**Monthly cost:** ~$2-5. **Current cost:** $0 (but all manual). **Priority:** HIGH.

### 3.4 Promptware Defense for Synthex Pipeline

Built-in ~15 threat pattern detection scans memory load and tool output. Prevents prompt injection attacks that could hijack the Synthex content pipeline or public-facing AI tools.

**Status:** Active in v0.15.1, zero config. **Action:** Confirm Synthex content generation endpoint has Brainworm scanning enabled. **Effort:** 30 min verification.

---

## 4. AU/NZ MARKET DOMINANCE STRATEGY

### 4.1 Product Portfolio Map

```
Synthex AI (Content Engine)
         │ content packets
         ▼
RestoreAssist ────────► Unite-Hub CRM
(Content + Leads)      (Lead/Pipeline)
         ▲                    │ dispatches
         │                    ▼
    NRPG Contractor ◄─── Pi-CEO Orchestrator
    Network              (Monitoring + Swarm)
```

### 4.2 Target Personas (AU/NZ Specific)

| Persona | Problem | Unite-Group Solution |
|---------|---------|---------------------|
| Sarah (Regional Restoration Operator) | No online presence, losing jobs to franchises | RestoreAssist authority site + NRPG leads |
| James (Property Management Firm) | Can't find verified trades quickly | NRPG verified contractor directory |
| Dave (Sole Trader Tradie) | Spends 30% of time on admin, not work | Unite-Hub CRM automates pipeline |
| Michelle (Insurance Loss Adjuster) | Needs qualified contractor network fast | NRPG verified network + KPI snapshots |
| Franchise HQ | Inconsistent quality across locations | Standardized platform + brand control |

### 4.3 NRPG Member Onboarding Strategy

**Value Proposition:**
1. **Verified leads** — Pre-qualified property damage leads (not random inquiries)
2. **No fake storefront** — Online-first, service-area based (compliant with Google's guidelines)
3. **Budget-capped** — Never overspend on leads per month
4. **KPI transparency** — See exactly how many leads, conversions, coverage gaps

**Onboarding Flow:**
```
Apply → Background Check → Verify Insurance → Profile Publish → First Lead → Review
 (1d)      (2d)              (1d)              (1d)           (7d)       (ongoing)
```

**Target:** 50 members in 90 days, 200 in 180 days.

### 4.4 Service-Area Coverage Model

| Tier | Cities | Timeline | Coverage Target |
|------|--------|----------|-----------------|
| Tier 1 | Brisbane, Gold Coast, Auckland | Now-30d | GREEN |
| Tier 2 | Sydney, Perth, Wellington, Adelaide | 60-90d | AMBER → GREEN |
| Tier 3 | Melbourne, Canberra, Christchurch, Darwin, Hobart | 120-180d | RED → AMBER |

**Coverage Health Formula:**
- GREEN: Demand signal exists + 3+ verified contractors + active content + GBP verified
- AMBER: Demand exists + 1-2 contractors + content needed
- RED: Demand exists + 0 contractors or content gaps

### 4.5 Competitive Positioning

| Competitor | Their Strength | Our Differentiation |
|------------|---------------|---------------------|
| Hipages | Big brand, many trades | Niche focus on restoration; verified only; no franchise lock-in |
| ServiceSeeking | Cheap leads | Quality over quantity; budget capping; KPI transparency |
| Airtasker | Gig economy | Professional contractor network; insurance-verified; ongoing relationship |
| Steamatic/Chem-Dry (franchises) | National brand | No franchise fees; contractor-owned; local expertise |
| Local agencies | Personal service | Scalable platform; AI content; data-driven optimization |

---

## 5. RESOURCE OPTIMIZATION FINDINGS

### 5.1 Monthly Cost Breakdown (AUD)

| Category | Current | Optimized | Delta |
|----------|---------|-----------|-------|
| SaaS subscriptions | $145-200 | $145-200 | — |
| Stripe fees | $160-180 | Scales with revenue | — |
| API/AI usage | $25-55 | $10-25 | -$15-30 |
| Hermes Agent | $40-100 | $20-40 | -$20-60 |
| **Total** | **$370-535** | **$300-400** | **-$70-135** |

### 5.2 AI Spend Optimization (Immediate)

**Problem:** Kimi K2.6 = 68% of spend ($44/mo) on 2% of sessions (43 sessions).

**Solution:** 3-tier routing
- Tier 1: Shell scripts (free) — health checks, file ops
- Tier 2: gpt-4o-mini ($0.002/session) — cron triage, summaries
- Tier 3: Kimi K2.6 ($1+/session) — architecture, security, DR planning only

**Config change:**
```yaml
auxiliary:
  compression:
    model: gpt-4o-mini
  title_generation:
    model: gpt-4o-mini
  session_search:
    model: qwen/qwen3.7-max
```

**Savings:** $240-480/year.

### 5.3 90-Day Resource Roadmap

#### Month 1 (July): Foundation Hardening — 24 hrs, $12-15/mo
- Week 1: Enable PITR, install postgresql@17, configure crons
- Week 2: Security package updates, model routing config
- Week 3: PITR restore test to sandbox
- Week 4: @supabase/ssr upgrade (0.6→0.10)

#### Month 2 (August): Optimization & Automation — 29 hrs, $0-5/mo
- Week 1: jose upgrade (4→6), extend backup retention
- Week 2: Multi-region Vercel (add iad1 fallback)
- Week 3: Tailwind 4.0 migration
- Week 4: Full DR drill (one scenario end-to-end)

#### Month 3 (September): Scale Preparation — 28 hrs
- Week 1: React Compiler errors, cost budget alerting
- Week 2: Load testing, Supavisor pooling review
- Week 3: Annual budget review + 2027 forecast
- Week 4: Full DR runbook Board sign-off, Q4 planning

**Total 90-day investment:** ~81 developer hours, $15-20/mo additional.

---

## 6. RISK REGISTER — INTEGRATED VIEW

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| PITR not enabled → data loss | Certain (currently disabled) | Critical | Enable PITR this week ($10/mo) | Engineering |
| Kimi K2.6 overspend | High | Medium | Route aux tasks to gpt-4o-mini | Ops |
| Sandbox never synced | High | High | Install postgresql@17 + run wizard | Engineering |
| NRPG recruitment slower than target | High | High | First 5 leads free; Brisbane focus first | Marketing |
| Single-founder bottleneck | High | High | First hire: engineer or content marketer | Board |
| Competitor launches similar product | Low | High | Speed to market; content moat | Product |
| React 19 peer dep warnings | Low | Low | Monitor @visx/group for v4 | Engineering |
| 50 React Compiler warnings deferred | Medium | Low | Schedule Q3 cleanup sprint | Engineering |

---

## 7. IMMEDIATE NEXT ACTIONS (This Session)

### 7.1 Can Execute Now (No Board Approval Needed)

1. ✅ Enable PITR in Supabase Dashboard (15 min, $10/mo)
2. ✅ Install postgresql@17 via brew (15 min, free)
3. ✅ Edit pi-dev-ops config.yaml for auxiliary model routing (20 min, free)
4. ✅ Create Hermes cron jobs for backup health check + SSL check (1 hr, $2/mo)

### 7.2 Needs Board Approval

5. Consolidate all secrets into 1Password vault (use existing vendor, zero new cost)
6. 📝 Approve $15-20/mo additional infra for Q3
7. 📝 Approve first hire (engineer or content marketer)

### 7.3 Strategic Decisions

8. 🎯 Confirm AU/NZ market dominance as Q3 primary objective
9. 🎯 Approve NRPG "first 5 leads free" recruitment incentive
10. 🎯 Set $1M ARR 12-month target (vs. current ~$99K)

---

## 8. DOCUMENT INVENTORY

| Document | Purpose | Location |
|----------|---------|----------|
| This synthesis | Master forward-pathway | `docs/plans/2026-06-02-dr-forward-pathway-synthesis.md` |
| Hermes capabilities | v0.15.x capability assessment | `docs/margot/hermes-v15-capability-assessment.md` |
| Market strategy | AU/NZ dominance architecture | `docs/plans/2026-06-02-au-nz-market-dominance-architecture.md` |
| Cost optimization | Resource & cost engineering | `docs/runbooks/resource-optimization-assessment.md` |
| DR baseline | DR maturity assessment | `docs/margot/disaster-recovery-assessment.md` |
| Gap analysis | 47 gaps found by swarm | `docs/margot/dr-validation-gap-analysis.md` |
| Productization roadmap | SaaS bridge plan | `docs/plans/2026-05-31-senior-pm-forward-pathway.md` |

---

## 9. CONCLUSION

Unite-Group's DR foundation is solid but incomplete. The missing pieces (PITR, sandbox sync, cron automation) are small, cheap, and have enormous ROI. Hermes v0.15.x provides production-grade multi-agent orchestration, free session search, and automated monitoring that were not available 30 days ago.

The AU/NZ market strategy is visible and achievable. The product architecture connects correctly. The contractor network model (NRPG) differentiates from generic lead-gen competitors.

**The 90-day path is clear:**
1. **Week 1:** Enable PITR, install postgresql@17, configure model routing (~$10/mo)
2. **Weeks 2-4:** Deploy kanban DR swarm, create Hermes cron matrix
3. **Months 2-3:** Execute AU/NZ market strategy (NRPG recruitment, content at scale, service-area expansion)

**The question for the Board is not whether to invest — the question is whether to execute with the urgency the $2B target demands.**

---

**Prepared by:** Margot (Senior PM / Security-DR Lead)  
**Date:** 2026-06-02  
**Status:** DRAFT — Awaiting Board approval for PITR, Q3 budget, and strategic priorities  
**Next Review:** 2026-06-09
