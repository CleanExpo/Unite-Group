---
type: spec
component: gap-detection-engine
status: active-draft
created: 2026-06-04
owner: senior-project-manager-agent
---

# Gap Detection Engine Spec

## Purpose

Detect missing pieces across code, product, UI/UX, SEO, AEO, GEO, content, brand, marketing, sales, finance, legal/compliance awareness, accounting awareness, operations, documentation, automation, and customer experience.

## Gap object

```json
{
  "gap_id": "GAP-20260604-0001",
  "category": "code|product|ui_ux|seo|aeo|geo|content|brand|marketing|sales|finance|legal_awareness|accounting_awareness|operations|documentation|automation|customer_experience",
  "severity": "P0|P1|P2|P3|P4",
  "confidence": 0,
  "evidence_status": "evidence_locked|partial|assumption|contradicted|stale",
  "owner": "agent/team",
  "linked_project": "project",
  "next_action": "imperative action",
  "escalation_rule": "when/why to escalate"
}
```

## Severity

- P0: active security/prod/client/revenue harm.
- P1: blocks ShipIt, revenue, production readiness, or trust.
- P2: meaningful improvement, not immediate blocker.
- P3: cleanup or quality improvement.
- P4: parked idea.

## Detection sources

- Obsidian Sources/Outcomes/Decisions
- GitHub issues/PR/checks where available
- local repo status and tests
- failed builds/tests
- dashboard approvals/rejections
- stale project reports
- missing evidence records
- weekly review
- ShipIt readiness checks

## Routing

- code/build gaps -> Principal Software Engineer + QA/Test Agent
- UI/UX gaps -> UI/UX Review Agent
- SEO/AEO/GEO/content/brand -> SEO, Content, Brand agents
- growth/sales/marketing -> Marketing Strategy Agent
- finance/legal/accounting -> awareness agents and Board escalation
- ops/docs/automation -> Business Ops, Documentation, Dashboard agents

## Required output

Every gap must have owner, severity, confidence, evidence status, next action, and approval requirement.
