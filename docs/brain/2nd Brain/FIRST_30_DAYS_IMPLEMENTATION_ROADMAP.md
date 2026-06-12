---
type: roadmap
component: agentic-nexus
status: active-draft
created: 2026-06-04
owner: senior-project-manager-agent
---

# First 30 Days Implementation Roadmap

## Phase 0: audit current ecosystem

Status: started. Evidence captured in Agentic Intelligence audit and current Agentic Nexus docs.

## Phase 1: create control plane schemas

Deliverables:
- task queue schema
- evidence ledger schema
- approval schema
- worker registry
- agent registry
- project registry

## Phase 2: register three local workers

Deliverables:
- command-node
- build-worker
- research-bi-worker
- heartbeat file

## Phase 3: create task queue

Deliverables:
- JSONL queue
- create-task command
- claim command
- status projection

## Phase 4: connect Obsidian memory layer

Deliverables:
- read/write rules
- artifacts linked to Obsidian outcomes
- evidence paths in every output

## Phase 5: add coding sandbox verification

Deliverables:
- worktree strategy
- validation command capture
- artifact/log capture
- no merge/deploy automation

## Phase 6: add research/gap detection loop

Deliverables:
- missing evidence detector
- stale project detector
- weekly review task generator

## Phase 7: add dashboard visibility

Deliverables:
- `status.md`
- `status.json`
- future `/nexus/intelligence` feed

## Phase 8: run first ShipIt readiness workflow

Deliverables:
- project readiness report
- tests/build status
- blockers
- PR/action recommendations

## Phase 9: run first business growth workflow

Deliverables:
- SEO/AEO/GEO and commercial opportunity report
- ranked growth tasks
- evidence confidence scores

## Phase 10: self-improvement loop

Deliverables:
- every failure creates a platform improvement task
- weekly platform improvement digest

## First implementation slice

Safe control plane v0:
- local init
- registries
- manual task creation
- worker claim
- agent run
- artifact
- evidence
- approval gate
- dashboard update
