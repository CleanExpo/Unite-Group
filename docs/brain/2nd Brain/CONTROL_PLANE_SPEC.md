---
type: spec
component: agentic-nexus-control-plane
status: active-draft
created: 2026-06-04
owner: command-node
links:
  - "[[AGENTIC_NEXUS_BLUEPRINT]]"
  - "[[TASK_QUEUE_SCHEMA]]"
  - "[[HUMAN_APPROVAL_GATES]]"
---

# Control Plane Spec

## Purpose

The control plane is the authority layer. It does not do all work itself. It owns identity, routing, state, approval gates, evidence, and lifecycle.

## Responsibilities

| Responsibility | v0 storage | Notes |
|---|---|---|
| task queue | `.agentic_nexus/state/tasks.jsonl` | append-only task records/events |
| work routing | `.agentic_nexus/state/tasks.jsonl` + registries | based on task type, risk, agent, worker capability |
| approvals | `.agentic_nexus/state/approvals.jsonl` | human approval required before sensitive actions |
| project registry | `.agentic_nexus/registries/projects.json` | paths, repos, default gates |
| worker registry | `.agentic_nexus/registries/workers.json` | command/build/research machines |
| agent registry | `.agentic_nexus/registries/agents.json` | role, authority, allowed actions |
| evidence ledger | `.agentic_nexus/state/evidence.jsonl` | source, confidence, claim, task link |
| run logs | `.agentic_nexus/runs/<run_id>/run.log` | stdout/stderr/status timeline |
| artifacts | `.agentic_nexus/artifacts/<task_id>/` | reports, patches, screenshots, test logs |
| dashboard updates | `.agentic_nexus/dashboard/status.md` and `status.json` | local MVP dashboard feed |
| lifecycle management | CLI commands | init, create-task, claim, run, status |

## Lifecycle

```text
created -> queued -> claimed -> running -> produced_artifact -> evidence_recorded -> approval_pending -> approved/rejected/done
```

Failure lifecycle:

```text
running -> failed -> platform_improvement_task_created -> blocked_or_retry
```

## Routing rules

- `build`, `qa`, `ui`, `shipit` tasks route to Build Worker.
- `research`, `seo`, `growth`, `strategy`, `evidence` tasks route to Research/BI Worker.
- `registry`, `approval`, `dashboard`, `queue` tasks stay on Command Node.
- High-risk tasks may be planned but not executed until approved.
- Workers never assign themselves tasks outside the queue.

## Command-node boundaries

Allowed:
- create/update local queue records
- write local artifacts and dashboards
- run read-only local audits
- dispatch approved worker tasks

Forbidden without approval:
- merge PRs
- deploy production
- write production databases
- delete files
- publish public content
- send external email/messages
- change auth/database policies/billing/payment logic

## First CLI implementation

The v0 CLI lives at:

`/Users/phillmcgurk/2nd-brain/.agentic_nexus/scripts/agentic_nexus.py`

Required commands:

```bash
python3 .agentic_nexus/scripts/agentic_nexus.py init
python3 .agentic_nexus/scripts/agentic_nexus.py create-task --project 2nd-brain --type research --outcome "..."
python3 .agentic_nexus/scripts/agentic_nexus.py claim --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py run --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py status
```
