---
type: spec
component: event-driven-automation
status: active-draft
created: 2026-06-04
owner: automation-engineer
---

# Event Driven Automation Spec

## Principle

Events do not directly execute sensitive actions. Events create structured tasks routed through the control plane.

## First event triggers

| Event | Task type | Default route | Approval default |
|---|---|---|---|
| new Obsidian file | evidence/research | research-bi-worker | none |
| changed Obsidian file | evidence validation | research-bi-worker | none |
| new GitHub issue | planning/build/research | command-node routes | none unless sensitive |
| failed build | qa/platform improvement | build-worker | none |
| failed test | qa/build | build-worker | none |
| merged PR | outcome/documentation | command-node | none |
| dashboard approval | approved execution task | assigned worker | depends action |
| rejected idea | decision memory update | command-node | none |
| stale project | project gap analysis | research-bi-worker | none |
| missing evidence | research task | research-bi-worker | none |
| weekly review | executive digest | command-node/research | none |
| ShipIt readiness check | qa/shipit | build-worker | none to check, approval to ship |

## Event object

```json
{
  "event_id": "EVT-20260604-0001",
  "created_at": "ISO-8601",
  "source": "obsidian|github|ci|dashboard|scheduler|manual",
  "event_type": "new_obsidian_file|failed_build|weekly_review|...",
  "source_ref": "path/url/id",
  "dedupe_key": "stable key",
  "generated_task_id": "ANX-..."
}
```

## v0 implementation

Manual task creation first. File/GitHub watchers come later after queue and approval gates are proven.
