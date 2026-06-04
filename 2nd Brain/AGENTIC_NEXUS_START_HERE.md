---
type: start-here
component: agentic-nexus
status: active
created: 2026-06-04
owner: hermes-ceo-orchestrator
links:
  - "[[AGENTIC_NEXUS_BLUEPRINT]]"
  - "[[CONTROL_PLANE_SPEC]]"
  - "[[LOCAL_WORKER_CLUSTER_SPEC]]"
  - "[[AGENT_REGISTRY]]"
  - "[[TASK_QUEUE_SCHEMA]]"
  - "[[HUMAN_APPROVAL_GATES]]"
---

# Agentic Nexus Start Here

## What Agentic Nexus is

Agentic Nexus is the local-first control plane for autonomous business production across Phill's ecosystem.

It coordinates:
- three local computers
- Hermes CLI command layer
- Obsidian/2nd-brain memory
- GitHub repositories
- repo-local agents and scripts
- evidence ledgers
- approvals
- dashboard/status reporting

## First command

From `/Users/phillmcgurk/2nd-brain`:

```bash
python3 .agentic_nexus/scripts/agentic_nexus.py init
```

## First vertical slice command sequence

```bash
python3 .agentic_nexus/scripts/agentic_nexus.py init
python3 .agentic_nexus/scripts/agentic_nexus.py create-task --project 2nd-brain --type research --outcome "Produce a safe local Agentic Nexus smoke-test artifact with evidence and approval gate."
python3 .agentic_nexus/scripts/agentic_nexus.py claim --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py run --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py status
```

## What each computer does

- Command Node: owns control plane, queue, dashboard, approvals, registries, evidence ledger.
- Build Worker: code sandboxes, tests, builds, Playwright/browser checks, PR preparation.
- Research/BI Worker: Obsidian analysis, research, SEO/AEO/GEO, strategy, marketing, finance/legal awareness.

## How tasks are created

Tasks are created manually first, then later by event triggers. Every task must include project, type, requested outcome, owner/agent, worker route, risk, approval requirement, evidence requirement, and next action.

## How work is verified

Every run writes:
- run log
- output artifact
- evidence record
- dashboard update
- approval request when required

## How Phill approves/rejects

v0 creates approval records in:

`.agentic_nexus/state/approvals.jsonl`

No sensitive action proceeds until approval is explicitly recorded by a future approved command/workflow.

## Safety default

No merge, deploy, delete, publish, email, invoice, prod DB, auth, billing, legal, or destructive action without human approval.
