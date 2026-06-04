---
type: operating-model
component: gap-detection-engine
status: active-draft
created: 2026-06-04
owner: senior-project-management-office
links:
  - "[[EVIDENCE_LEDGER_SCHEMA]]"
  - "[[AUTONOMOUS_RESEARCH_LOOP]]"
---

# Gap Detection Engine

## Purpose

The Gap Detection Engine turns “something feels missing” into a scored, owned, evidence-backed work item.

A gap is not a complaint. A valid gap has category, severity, evidence status, business impact, owner, next action, and lifecycle state.

## Gap categories

| Code | Category | Examples |
|---|---|---|
| STRAT | Strategy | unclear offer, weak market thesis, no North Star mapping |
| PROD | Product | missing feature, poor workflow, weak onboarding, unclear ICP fit |
| ENG | Engineering | failing tests, duplicate systems, brittle API, stale dependencies |
| ARCH | Architecture | fragmented integrations, no shared protocol, inconsistent schemas |
| DATA | Data | missing source, stale record, untrusted claim, schema mismatch |
| EVID | Evidence | claim lacks citation, weak confidence, contradiction |
| SEO | SEO/AEO/GEO | missing schema, weak entity coverage, ranking/content gap |
| MKT | Marketing | no campaign, weak positioning, missing proof, poor funnel |
| BRAND | Brand | inconsistent voice, unsupported claim, unclear authority |
| OPS | Operations | missing SOP, owner unclear, recurring manual work |
| FIN | Finance | missing cost/revenue visibility, pricing risk, AI spend drift |
| LEGAL | Legal/compliance awareness | risky claim, privacy issue, licensing/compliance uncertainty |
| ACCT | Accounting awareness | invoice/tax/bookkeeping gap, Xero readiness issue |
| QA | Quality | no test, unverified output, broken gate, failing CI |
| RISK | Risk/security | secret exposure, prod danger, destructive operation |
| DOC | Documentation | stale/missing/runbook absent, decision not recorded |
| AUTO | Automation | repetitive work not automated, cron silent failure, no retry |
| DASH | Dashboard | missing metric, passive chart, no actionable owner |

## Severity levels

| Severity | Meaning | Time expectation | Escalation |
|---|---|---|---|
| P0 Critical | active harm, security/prod/client/revenue risk | immediate | Board + Risk Shepherd |
| P1 High | blocks revenue, launch, compliance, or strategic clarity | 24-48h | Senior PM + owner |
| P2 Medium | materially improves system/business but not blocking | 7 days | owner/team |
| P3 Low | cleanup or nice-to-have | backlog/review | weekly review |
| P4 Parked | valid but not worth action now | revisit date | no active work |

## Scoring logic

Score each gap from 0-100.

```
impact_score        0-25  business/revenue/client/strategic impact
urgency_score       0-20  time sensitivity or blocking severity
confidence_score    0-20  strength of evidence
leverage_score      0-15  reusable compounding value
risk_score          0-10  risk avoided by fixing
effort_fit_score    0-10  small slice / high ROI
```

Priority mapping:
- 85-100: P0/P1 candidate
- 70-84: P1
- 50-69: P2
- 25-49: P3
- 0-24: P4 or archive

## Evidence status

| Status | Meaning | Allowed next step |
|---|---|---|
| evidence_locked | supported by current source/code/data | plan/build/assign |
| evidence_partial | some support, missing key source | research/validate |
| assumption_only | plausible but unproven | research only |
| contradicted | evidence conflicts | contradiction review |
| stale | source too old for domain | refresh research |
| rejected | disproven or not worth action | archive with reason |

## Gap record template

```yaml
---
type: gap
id: GAP-YYYYMMDD-001
status: open | researching | planned | in_progress | blocked | done | rejected | parked
category: STRAT | PROD | ENG | ARCH | DATA | EVID | SEO | MKT | BRAND | OPS | FIN | LEGAL | ACCT | QA | RISK | DOC | AUTO | DASH
severity: P0 | P1 | P2 | P3 | P4
score: 0
owner: agent-or-team
project: unite-group | unite-hub | synthex | restoreassist | disaster-recovery | ccw | carsi | portfolio
component: short-component-name
evidence_status: evidence_locked | evidence_partial | assumption_only | contradicted | stale | rejected
created: YYYY-MM-DD
last_reviewed: YYYY-MM-DD
next_action: short imperative action
approval_required: none | board | security | finance | legal | client | prod-db | deploy | publish
links: []
evidence_paths: []
---
```

## Gap lifecycle

```
Detected
  -> Classified
  -> Evidence-scored
  -> Routed
  -> Researched / Planned / Built / Documented / Rejected
  -> QA/governance reviewed
  -> Outcome written
  -> Closed or scheduled for re-review
```

## Routing rules

| Gap state | Route |
|---|---|
| `assumption_only` | Research Lead |
| `evidence_partial` | Evidence Librarian + Research Lead |
| `contradicted` | Contradiction Hunter + Risk Board Agent |
| `evidence_locked` + build needed | Senior PM -> Engineering/Content/Automation |
| `P0` or approval_required != none | Governance Office + Board queue |
| dashboard-related | Dashboard Operator |
| doc-related | Documentation Architect |

## Required next actions by gap type

| Type | Valid next actions |
|---|---|
| Research gap | create research brief, gather sources, score evidence |
| Build gap | create implementation plan, tests, QA gate |
| Content gap | create content brief, evidence pack, publish approval |
| SEO/AEO/GEO gap | create page/query/entity/schema task with evidence |
| Ops gap | create SOP/runbook/task owner |
| Finance/legal/accounting gap | create awareness memo + Board/professional escalation |
| Dashboard gap | define metric, source, refresh cadence, owner |

## Detection sources

- Obsidian `Sources/`, `Outcomes/`, `Decisions/`, `Pitches/`
- repo docs and configs
- Git status, PRs, CI, tests
- dashboard route inventory
- cron route inventory
- search/SEO/content files
- Supabase schema/types/migrations
- Hermes cron logs and session outputs
- manual Board instructions

## First detector implementation

Local-only scanner:
- read newest 7 days of `Sources/` and `Outcomes/`
- detect missing frontmatter, no `evidence_paths`, stale status, repeated terms, P0/P1 keywords
- scan selected repos for known stubs and missing integrations from audit
- emit `Outcomes/YYYY-MM-DD-gap-detection-report.md`
- propose max 10 gaps and max 3 immediate actions
- no external side effects
