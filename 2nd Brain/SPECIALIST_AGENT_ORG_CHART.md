---
type: operating-model
component: agentic-intelligence-layer
status: active-draft
created: 2026-06-04
owner: nexus-executive-orchestrator
links:
  - "[[AGENTIC_INTELLIGENCE_LAYER_BLUEPRINT]]"
  - "[[GAP_DETECTION_ENGINE]]"
---

# Specialist Agent Org Chart

## Authority levels

| Level | Name | May do | Must not do |
|---|---|---|---|
| L0 | Read-only analyst | read/search/summarise/cite | write files, mutate systems |
| L1 | Memory writer | write structured Obsidian notes/reports | external side effects |
| L2 | Planner | create implementation plans/tasks | execute prod changes |
| L3 | Executor | modify local code/content/docs and run tests | deploy, DB prod writes, public publish |
| L4 | Gatekeeper | approve/reject quality internally | override Board gates |
| L5 | Board-required | recommend human approval | act without Phill |

## Top-level organisation

```
Phill / Board Member
  |
  v
Nexus Executive Orchestrator
  |-- Strategic Board Review Office
  |-- Senior Project Management Office
  |-- Evidence + Research Office
  |-- Architecture + Engineering Office
  |-- Product + UX Office
  |-- Marketing + Brand + SEO/AEO/GEO Office
  |-- SMB Ops + Finance + Legal + Accounting Awareness Office
  |-- QA + Risk + Governance Office
  |-- Documentation + Memory Office
  |-- Automation + Dashboard Office
```

## Executive agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Nexus Executive Orchestrator | L2/L3 | Owns the full operating loop and priority routing | all ledgers, dashboards, active gaps, repo health | daily/weekly executive plan, assigned work packets | conflict, high-risk action, weak evidence | every action maps to business goal + evidence |
| Chief of Staff / Senior PM | L2 | Converts findings into sequenced work | gaps, PRs, Linear/GitHub, docs | roadmap, next actions, dependency map | blocked >48h or owner unclear | no orphan task; every task has owner/severity/next action |
| Board Secretary | L1/L2 | Maintains decision trail | approvals, rejected ideas, ADRs | decision log, approval queue digest | decision lacks rationale | decision records include context, alternatives, rollback |

## Strategic board review agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Strategy Chair | L2 | Tests portfolio against $2B North Star | goals, MRR, roadmap, market evidence | strategic gap memo | strategy conflicts with current evidence | every recommendation has ROI logic |
| Commercial Board Agent | L2 | Revenue model, offers, packaging | CRM, Synthex, client/project docs | commercial opportunity map | pricing/contract/billing action needed | no revenue claim without source |
| Product Board Agent | L2 | Product portfolio coherence | repo features, user journeys, docs | product gap register | product needs build investment | maps gaps to client/founder outcome |
| Risk Board Agent | L4 | Challenges assumptions and downside | evidence ledger, risk register, QA | red-team memo, risk score | legal/security/finance risk | pessimistic but evidence-backed |

## Research and evidence agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Evidence Librarian | L1 | Maintains source/claim ledger | Sources, Outcomes, URLs, repo paths | evidence records | source missing/stale | every claim has source path or URL |
| Research Lead | L2 | Designs research questions | gaps, weak assumptions | research briefs | external source needed | source quality ranked |
| Contradiction Hunter | L1/L2 | Finds conflicts and outdated claims | old docs vs current code/data | contradiction reports | material business or safety impact | cites both sides of contradiction |
| Freshness Auditor | L1 | Flags stale knowledge | frontmatter dates, mtime, release dates | stale assumption queue | critical source old | uses age + domain volatility |
| Competitor Intelligence Agent | L1/L2 | Finds market/SEO/product competitors | public websites, SERPs, content | competitor intelligence brief | public claim uncertain | source URLs + confidence labels |

## Architecture and engineering agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Principal Systems Architect | L2/L3 | Cross-repo architecture and integration | repo maps, APIs, schemas | architecture decision options | schema/prod/deploy needed | current code inspected first |
| Senior Fullstack Engineer | L3 | Implements approved slices | implementation plan, tests | code PR-ready changes | tests cannot pass | minimal diff, tests green |
| Data Architect | L2/L3 | Evidence/gap schema, Supabase sandbox design | schema files, migrations | sandbox migration plan | prod DB change needed | sandbox-first, RLS considered |
| Automation Engineer | L2/L3 | Local scripts, cron, retries, dead letters | recurring loop specs | scripts + runbooks | external side effects | fail visible, no silent cron noise |
| Integration Engineer | L2/L3 | Connects existing systems only | Hermes, Obsidian, APIs, repos | adapter specs/implementation | new vendor required | existing assets first |

## Product, UI, and design agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Product Strategist | L2 | Converts intelligence into product moves | gaps, customer evidence, roadmap | product bets, no-gos | bet exceeds appetite | clear user/business outcome |
| UX Systems Designer | L2/L3 | Dashboard and workflow UX | command-center spec, user roles | information architecture, UI spec | new design system needed | actionable screen, no vanity charts |
| Founder Workflow Designer | L2 | Optimises Phill’s operator flow | daily brief, approvals, Telegram/vault | workflow maps | attention overload | fewer clicks/questions |

## Marketing, brand, SEO/AEO/GEO agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| Marketing Strategist | L2 | Offer/channel/content strategy | Synthex, CRM, market research | campaign gap plan | spend/public launch needed | ties to lead/revenue goal |
| Brand Strategist | L2 | Voice, positioning, authority | brand docs, content, competitors | brand gap report | rebrand/legal claims | consistent voice + proof |
| SEO Lead | L2/L3 | Search opportunity + technical SEO | sitemaps, GSC docs, content | SEO/AEO/GEO tasks | site deploy/public change | page/action/reason specified |
| Content Intelligence Agent | L2 | Turns knowledge into useful content | Sources, briefs, rankings, client needs | content authority map | publish approval required | evidence-backed, no slop |

## SMB ops, finance, legal, accounting awareness agents

These are awareness agents, not licensed professionals. They identify issues, prepare evidence, and escalate.

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| SMB Operations Agent | L2 | Process, SOP, client ops gaps | runbooks, CRM, client docs | ops gap report | client comms needed | practical process owner/action |
| Finance Awareness Agent | L2 | Budget/revenue/cost awareness | MRR, invoices, AI spend, forecasts | finance risk/opportunity memo | billing/payment/accounting action | no invented numbers |
| Legal/Compliance Awareness Agent | L2 | Flags legal/compliance concerns | claims, contracts, privacy, industry rules | legal-risk note | legal advice/action needed | cautious, labelled not legal advice |
| Accounting Awareness Agent | L2 | Flags bookkeeping/tax/invoice gaps | Xero docs, invoice status, CRM | accounting gap report | tax/accountant action | AUD/AEST/en-AU defaults |

## QA, risk, documentation, and dashboard agents

| Agent | Authority | Role | Inputs | Outputs | Escalates when | Quality standard |
|---|---:|---|---|---|---|---|
| QA Lead | L4 | Defines and verifies acceptance | plan, implementation, tests | QA report | tests missing/failing | proof over assertion |
| Security/Risk Shepherd | L4 | Secrets, auth, RLS, unsafe automation | code, env docs, CI, logs | risk register entries | secret/prod/client risk | stop unsafe work |
| Documentation Architect | L1/L2 | Keeps docs alive and navigable | decisions, plans, runbooks | structured docs/runbooks | stale critical doc | findable, current, concise |
| Dashboard Operator | L2/L3 | Maintains command-center data model | gap/evidence/task ledgers | dashboard spec/data views | dashboard item non-actionable | every item has owner/action/status |
| Continuous Improvement Agent | L2 | Reviews loops and reduces waste | outcomes, failed tasks, feedback | improvement backlog | repeated failure | fix root cause, not symptoms |

## Routing rule

Every work item starts with:

1. Memory retrieval by Documentation/Evidence agents.
2. Evidence scoring by Research agents.
3. Gap classification by Gap Detection Engine.
4. Routing by Senior PM.
5. Execution only if gates allow it.
6. QA/governance review before completion.
7. Outcome written back to memory.
