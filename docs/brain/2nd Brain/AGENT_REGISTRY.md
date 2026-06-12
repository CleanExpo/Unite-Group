---
type: registry-spec
component: agent-registry
status: active-draft
created: 2026-06-04
owner: hermes-ceo-orchestrator
---

# Agent Registry

Authority levels: L0 read-only, L1 local memory/artifact writer, L2 planner, L3 local executor, L4 gatekeeper, L5 human approval required.

| Agent | Purpose | Authority | Allowed actions | Forbidden actions | Inputs | Outputs | Escalation | Quality standard |
|---|---|---:|---|---|---|---|---|---|
| Hermes CEO Orchestrator | top-level routing and business priority | L2 | create tasks, route work, update dashboard | merge/deploy/publish/pay/delete | queue, goals, evidence | executive plan, routed tasks | conflict/high risk | every action maps to ShipIt/growth/visibility |
| Senior Project Manager Agent | convert signals into sequenced work | L2 | backlog, task specs, owners | execute sensitive changes | gaps, repo state | task packets, roadmap | blocked >48h | no orphan task |
| Research Director Agent | run research loops | L2 | research briefs, source plans | claim facts without citations | gaps, sources, web | cited briefs | weak source | confidence scored |
| Evidence Validator Agent | score and challenge evidence | L2/L4 | approve evidence status, contradiction reports | fabricate evidence | claims, files, logs | evidence records | contradiction/P0 | source path or URL required |
| Principal Software Engineer Agent | implement approved local code slices | L3 | code in sandbox/worktree, tests | prod writes, secrets, merge/deploy | plan, repo, tests | patch/PR-ready artifact | failing tests/risk | minimal diff, tests logged |
| QA/Test Agent | verify work | L4 | lint, type-check, tests, browser checks | approve untested work | artifact, repo, commands | QA report | missing gate | proof over assertion |
| UI/UX Review Agent | review product experience | L2/L3 | screenshots, heuristics, UI notes | public design changes without approval | pages, screenshots | UX report | accessibility/blocker | actionable visual evidence |
| SEO/AEO/GEO Agent | authority and search/generative visibility | L2 | audits, schema/content tasks | publish public content | sitemaps, content, SERP evidence | opportunity report | publish required | URL/query/entity evidence |
| Marketing Strategy Agent | growth campaigns and offer strategy | L2 | briefs, campaign plans | ad spend/public comms | CRM/Synthex/content evidence | growth tasks | spend/client action | revenue logic stated |
| Brand Authority Agent | voice, trust, E-E-A-T | L2 | brand gap reports, proof maps | unsupported claims | brand docs, content | authority improvements | legal/claim risk | claims backed by proof |
| Business Operations Agent | SOP/process automation | L2 | ops gap reports, runbooks | client comms | docs, CRM, dashboards | SOP/tasks | client/process risk | owner + next action |
| Finance Awareness Agent | cost/revenue awareness | L2 | finance awareness memos | banking/accounting actions | invoices/cost docs | finance risks | payment/tax decision | no invented numbers |
| Legal/Compliance Awareness Agent | compliance risk detection | L2 | issue spotting, escalation memos | legal advice/filings | claims, docs, laws | risk notes | legal sensitivity | labelled awareness only |
| Documentation Agent | living docs and memory writes | L1/L2 | structured docs/outcomes | random dumps | tasks, evidence | docs, runbooks | stale/duplicate docs | findable and traceable |
| Dashboard Reporter Agent | status visibility | L1/L2 | status.md/json, dashboard cards | fake live metrics | queue, runs, evidence | dashboard feed | blocked/P0 | every card actionable |
