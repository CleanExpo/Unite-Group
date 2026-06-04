---
type: spec
component: local-worker-cluster
status: active-draft
created: 2026-06-04
owner: devops-lead
links:
  - "[[CONTROL_PLANE_SPEC]]"
---

# Local Worker Cluster Spec

## Principle

The three computers form a local worker cluster, not a peer-to-peer autonomous swarm. All work is routed through the Command Node control plane.

## Workers

| Worker | Role | Primary capabilities | Forbidden without approval |
|---|---|---|---|
| command-node | control plane, queue, approvals, dashboard | registries, task lifecycle, evidence, dashboard, approvals | worker self-execution of high-risk tasks |
| build-worker | coding and verification body | git worktrees, Docker, package installs, lint, type-check, tests, builds, Playwright screenshots, PR preparation | merge, deploy, prod DB, secrets, destructive cleanup |
| research-bi-worker | research and business intelligence body | Obsidian analysis, citations, SEO/AEO/GEO scans, competitor research, content briefs, strategy, finance/legal awareness memos | public publishing, client comms, legal/finance actions |

## Heartbeat

Each worker writes heartbeat state:

```json
{
  "worker_id": "build-worker",
  "role": "build",
  "status": "idle|busy|offline|blocked",
  "capabilities": ["git", "docker", "node", "python", "playwright"],
  "current_task_id": null,
  "last_heartbeat": "2026-06-04T16:00:00+10:00",
  "machine_label": "user-defined",
  "notes": "local-only v0"
}
```

## Assignment rules

- Control plane assigns tasks by capability and risk.
- Workers claim tasks only from queue.
- Workers write run logs and artifacts under `.agentic_nexus/`.
- Workers must not read secrets or `.env*` unless the task is explicitly approved and scoped.
- Workers must not modify sibling repos unless the task names that repo.

## Failure recovery

If worker fails:
1. mark task failed or blocked
2. write run log
3. write evidence record
4. create platform improvement task
5. update dashboard
6. do not retry infinitely

## Safe connection model v0

- Start local-only: shared filesystem/git repo artifacts, no remote daemon required.
- Later: SSH with restricted user and mounted workspace only.
- No broad peer-to-peer worker access.
- No network credential sharing by default.

## Capability declaration

A worker is eligible only if it declares required capability:
- `code`: git, shell, package manager
- `test`: package manager and test runner
- `browser`: Playwright or browser automation
- `research`: web/search tools or approved source corpus
- `obsidian`: read/write vault path
- `dashboard`: write local status feed
