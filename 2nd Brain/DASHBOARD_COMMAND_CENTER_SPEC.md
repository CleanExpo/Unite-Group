---
type: spec
component: agentic-nexus-dashboard
status: active-draft
created: 2026-06-04
owner: dashboard-reporter-agent
---

# Dashboard Command Center Spec

## Purpose

The dashboard is the visual command centre for Agentic Nexus. It shows actionable system truth, not vanity metrics.

## Must show

- projects and ShipIt readiness
- active agents
- active workers and heartbeat status
- queued/running/blocked tasks
- approval requests
- failed runs
- evidence strength
- PR status and build readiness
- growth opportunities
- risks
- next best actions

## v0 files

- `.agentic_nexus/dashboard/status.md`
- `.agentic_nexus/dashboard/status.json`

## Dashboard card contract

```json
{
  "id": "ANX-20260604-0001",
  "type": "task|approval|worker|risk|gap|pr|growth|shipit",
  "title": "actionable title",
  "project": "project",
  "owner": "agent/worker",
  "status": "queued|running|blocked|approval_pending|done|failed",
  "priority": "P0|P1|P2|P3|P4",
  "evidence_status": "locked|partial|missing|stale",
  "next_action": "imperative action",
  "approval_required": "none|board|merge|deploy|publish|prod_db|auth|billing|legal|destructive|external_comm",
  "source_paths": []
}
```

## Visual layout

Top strip:
- active P0/P1 items
- worker health
- approval count
- failed run count
- next best action

Main panels:
- task queue
- worker cluster
- approvals
- evidence strength
- ShipIt readiness by project
- growth opportunities
- risk register

## Rule

If a dashboard item has no owner, evidence, status, and next action, it does not belong on the dashboard.
