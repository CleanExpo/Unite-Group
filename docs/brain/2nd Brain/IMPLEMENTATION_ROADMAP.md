---
type: implementation-plan
component: agentic-intelligence-layer
status: active-draft
created: 2026-06-04
owner: senior-project-management-office
links:
  - "[[AGENTIC_SYSTEM_START_HERE]]"
  - "[[FIRST_10_AGENTIC_WORKFLOWS]]"
---

# Implementation Roadmap

## Goal

Move from Obsidian as passive memory to a living agentic intelligence system that detects gaps, validates evidence, recommends actions, coordinates execution, verifies results, and writes structured outcomes back to memory.

## Phase 0: Audit current state

Status: started.

Evidence gathered:
- 2nd-brain vault exists, 551 markdown files, no git remote.
- Pi-CEO has Nexus outcomes/audit/approval/BRA/discovery/scheduler code.
- Unite-Group has `/nexus`, command-center routes, Hermes chat proxy, semantic search scripts, crons.
- Synthex has strongest Obsidian/content/SEO/AEO/GEO intelligence tooling.
- Unite-Hub has strongest agent/skills registry and CRM governance.
- RestoreAssist has strong QA/governance and Mission Control.
- DR has native NEXUS agent registry and trigger APIs.

Deliverables:
- this 10-file operating model set.
- concise implementation summary.

## Phase 1: Schemas and files

Objective: establish local canonical docs and machine-readable contracts.

Tasks:
1. Install the 10 root operating docs in `2nd-brain/`.
2. Add evidence block and gap record templates.
3. Define dashboard item contract.
4. Define Obsidian write rules.
5. Define first workflow specs.

Acceptance:
- all files exist
- `git diff --check` passes
- no production/external changes

## Phase 2: Agent registry

Objective: create shared agent taxonomy that maps existing repo-local agents into one Nexus organisation.

Tasks:
1. Create local registry JSON/Markdown from `SPECIALIST_AGENT_ORG_CHART.md`.
2. Map Synthex `.claude/skills`, Unite-Hub `.claude/agents`, RestoreAssist agents, DR NEXUS agents, Hermes skills.
3. Add authority levels and allowed actions.
4. Mark duplicate/overlapping agents.
5. Define route rules for Hermes delegation.

Output:
- `Outcomes/YYYY-MM-DD-agent-registry-audit.md`
- future `AgentRegistry/agent-registry.json` if folder policy approved.

## Phase 3: Gap detection

Objective: build local-only scanner.

First slice:
- read last 7 days of `Sources/` and `Outcomes/`
- scan root operating docs and selected repo status/docs
- emit top 10 gaps with severity, owner, evidence status, next action
- propose max 3 immediate workflows

Suggested implementation path:
- `2nd-brain/.agentic/scripts/gap_scan.py` after folder approval, or repo-local script in Pi-CEO if preferred.
- output Markdown first, JSONL second.

Acceptance:
- no external side effects
- every gap cites evidence paths
- every gap has owner/severity/next action

## Phase 4: Research automation

Objective: convert weak assumptions into evidence-backed research briefs.

Tasks:
1. Add research task generator from gap records.
2. Add source quality scoring.
3. Add contradiction detector.
4. Add stale assumption detector.
5. Produce daily research queue.

Acceptance:
- each research output has sources, confidence, recommendation, next action.

## Phase 5: Dashboard integration

Objective: make intelligence visible and actionable.

MVP:
- generate `Outcomes/YYYY-MM-DD-agentic-command-center.md` daily.

Next:
- create JSON dashboard item feed.
- add read-only parser/API in Unite-Group Authority-Site.
- render under `/nexus/intelligence` or extend `/nexus`.

Acceptance:
- every dashboard item has source, owner, status, action.

## Phase 6: Execution workflows

Objective: route approved intelligence into implementation.

Tasks:
1. build task conversion rules for engineering/content/docs/SEO/ops.
2. require implementation plans for build work.
3. require QA reports before done.
4. integrate with Linear/GitHub only after approval.
5. write outcome notes after execution.

Acceptance:
- no build task bypasses planning/QA/docs gates.

## Phase 7: QA and governance

Objective: make autonomy safe.

Tasks:
1. codify approval matrix.
2. add risk classifier to gap scanner.
3. add secret/prod/client/public-publish guards.
4. add dead-letter output for failed writes.
5. add weekly audit of false positives/noise.

Acceptance:
- P0/prod/legal/finance/public actions are never executed without approval.

## Phase 8: Continuous improvement

Objective: make the system learn.

Tasks:
1. weekly gap burn-down review.
2. track which recommendations were accepted/rejected.
3. identify repeated false positives.
4. promote repeated patterns to decisions/runbooks.
5. reduce noisy loops and improve high-signal loops.

Acceptance:
- system produces fewer, better, more actionable recommendations over time.

## Build-first recommendation

Build first: local-only gap detector + command-center digest.

Why:
- uses existing files only
- no new vendor
- no prod risk
- attacks actual bottleneck: knowledge not yet turned into strategic/execution gaps
- produces immediate evidence for dashboard and agent routing

## Risks

| Risk | Mitigation |
|---|---|
| more markdown but no action | every doc/workflow requires owner, severity, next action |
| agent noise | cap daily proposals; rank by ROI x urgency x confidence |
| stale docs | freshness scoring and contradiction detection |
| unsafe autonomy | governance layer and approval matrix |
| fragmented repo agents | shared registry maps existing agents before new ones |
| dashboard bloat | dashboard item contract requires actionability |
| evidence fabrication | evidence ledger rejects uncited claims |

## Immediate next 5 actions

1. Run a local gap scan against 2nd-brain + audit findings.
2. Create the first daily command-center digest from that scan.
3. Create shared agent registry from existing repo-local agents.
4. Prototype evidence/gap JSONL output.
5. Wire the digest into Hermes recurring task or Pi-CEO scheduler after review.
