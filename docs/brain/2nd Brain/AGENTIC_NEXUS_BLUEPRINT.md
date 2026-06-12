---
type: blueprint
component: agentic-nexus
status: active-draft
created: 2026-06-04
owner: hermes-ceo-orchestrator
links:
  - "[[AGENTIC_NEXUS_START_HERE]]"
  - "[[CONTROL_PLANE_SPEC]]"
  - "[[LOCAL_WORKER_CLUSTER_SPEC]]"
evidence_paths:
  - AGENTIC_SYSTEM_START_HERE.md
  - AGENTIC_INTELLIGENCE_LAYER_BLUEPRINT.md
  - Outcomes/2026-06-04-project-gap-analysis.md
---

# Agentic Nexus Blueprint

## Mission

Agentic Nexus is the local-first business production factory for the Unite-Group ecosystem. It coordinates Hermes, Obsidian memory, GitHub repositories, local CLI agents, dashboards, and three high-powered computers so work moves from signal to task to isolated execution to evidence to human approval to ShipIt readiness.

The outcome is not more markdown. The outcome is a control plane that makes autonomous work reviewable, testable, auditable, and commercially useful.

## Design lessons applied

- Background agents need an isolated body, not just a model brain.
- The orchestrator lives outside disposable execution sandboxes.
- Sandboxes are replaceable workspaces for code/test/research runs.
- Work moves toward evidence and reviewable PRs, not vague suggestions.
- Humans retain control over merges, deploys, publishing, payments, destructive changes, sensitive systems, and business-critical decisions.
- Every failure becomes a platform improvement task.

## Current ecosystem evidence

| Area | Existing asset | Missing control-plane capability |
|---|---|---|
| Hermes | CLI command layer, tools, cron, delegation | Unified task/run lifecycle for local cluster |
| Obsidian / 2nd Brain | `/Users/phillmcgurk/2nd-brain` memory vault | Memory write governance tied to queue/evidence |
| Pi-CEO | `swarm/nexus/*` outcomes/audit/approval/discovery | local worker cluster and task claiming |
| Unite-Group Authority-Site | `/nexus`, command center, Hermes proxy | dashboard feed from local control plane |
| Unite-Hub CRM | many `.claude/agents` and skills | shared agent registry and authority model |
| Synthex | strong Obsidian, SEO/AEO/GEO automation | shared research/business worker role |
| RestoreAssist | QA/governance/Mission Control | reusable verification gates |
| Disaster Recovery QLD | native NEXUS agent registry | cross-project control-plane routing |

## Architecture

```text
Phill / Board approvals
        |
        v
Agentic Nexus Control Plane  (Command Node)
        |-- task queue
        |-- worker registry
        |-- agent registry
        |-- project registry
        |-- approval gates
        |-- evidence ledger
        |-- run logs
        |-- artifact index
        |-- dashboard/status feed
        |
        +--> Build Worker sandbox bodies
        |       code, tests, builds, Docker, Playwright, PR prep
        |
        +--> Research/BI Worker sandbox bodies
        |       Obsidian analysis, research, SEO/AEO/GEO, strategy
        |
        +--> Command Node local worker
                queue maintenance, approvals, dashboard, registry
```

## Layers

1. Memory Layer: Obsidian vault, repo docs, evidence files, decisions, outcomes.
2. Control Plane: queue, routing, registry, lifecycle, permissions, approvals.
3. Worker Layer: local machines with declared capabilities and heartbeats.
4. Agent Layer: role-bound agents with authority limits and quality gates.
5. Sandbox Layer: disposable worktrees/Docker/process workspaces.
6. Execution Layer: code, tests, browser checks, research, content, docs.
7. Evidence Layer: logs, artifacts, citations, screenshots, command output.
8. Dashboard Layer: current state, blockers, approvals, ShipIt readiness, growth opportunities.
9. Governance Layer: human approval gates and forbidden actions.

## First production-grade principle

Start with the safe control plane. Do not start with full autonomy.

The first vertical slice must prove:
- local command node starts
- worker registry exists
- three-worker model is defined
- manual task can be created
- worker can claim task
- agent can run task
- artifact is produced
- evidence record is created
- approval gate is triggered
- dashboard/status file is updated

## Non-goals for v0.1

- no production deploys
- no prod database writes
- no merge automation
- no public publishing
- no email/client comms
- no new SaaS/vendor
- no peer-to-peer worker autonomy
- no vector/RAG dependency before local ledgers prove insufficient
