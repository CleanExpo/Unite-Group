---
type: start-here
component: agentic-intelligence-layer
status: active
created: 2026-06-04
owner: nexus-executive-orchestrator
links:
  - "[[AGENTIC_INTELLIGENCE_LAYER_BLUEPRINT]]"
  - "[[SPECIALIST_AGENT_ORG_CHART]]"
  - "[[GAP_DETECTION_ENGINE]]"
  - "[[EVIDENCE_LEDGER_SCHEMA]]"
  - "[[OBSIDIAN_MEMORY_WRITE_RULES]]"
  - "[[AUTONOMOUS_RESEARCH_LOOP]]"
  - "[[DASHBOARD_COMMAND_CENTER_SPEC]]"
  - "[[IMPLEMENTATION_ROADMAP]]"
  - "[[FIRST_10_AGENTIC_WORKFLOWS]]"
---

# Agentic System Start Here

## What this system is

This is the start point for the Unite-Group Nexus Agentic Intelligence Layer.

It turns stored knowledge into strategic intelligence, then turns intelligence into action across:
- Obsidian/2nd-brain memory
- Hermes command layer
- Pi-CEO/Nexus orchestration
- Unite-Hub CRM
- Unite-Group Authority-Site / Empire Command Center
- Synthex
- RestoreAssist
- CARSI
- Disaster Recovery QLD
- CCW
- related business/project systems

## Core rule

Obsidian is memory, not intelligence.

Agents must use Obsidian as source material and write structured outcomes back, but the intelligence layer is the active organisation of agents, evidence scoring, gap detection, governance, and execution workflows.

## Read-first sequence for Hermes

When a future Hermes session is asked to work on the agentic intelligence layer, read in this order:

1. `AGENTIC_SYSTEM_START_HERE.md`
2. `AGENTIC_INTELLIGENCE_LAYER_BLUEPRINT.md`
3. `SPECIALIST_AGENT_ORG_CHART.md`
4. `GAP_DETECTION_ENGINE.md`
5. `EVIDENCE_LEDGER_SCHEMA.md`
6. `OBSIDIAN_MEMORY_WRITE_RULES.md`
7. `AUTONOMOUS_RESEARCH_LOOP.md`
8. `DASHBOARD_COMMAND_CENTER_SPEC.md`
9. `IMPLEMENTATION_ROADMAP.md`
10. `FIRST_10_AGENTIC_WORKFLOWS.md`
11. `CLAUDE.md`
12. `Decisions/adr-006-retrieval-first-protocol.md`
13. recent `Outcomes/` related to the current component

## First command to run next

Run a local-only intelligence scan. Do not deploy. Do not write production DBs. Do not create external accounts.

Suggested Hermes instruction:

```text
Load /Users/phillmcgurk/2nd-brain/AGENTIC_SYSTEM_START_HERE.md and run Workflow 3 + Workflow 8 from FIRST_10_AGENTIC_WORKFLOWS.md as a local-only MVP. Inspect the 2nd-brain vault and local repo evidence, produce a project gap analysis and an agentic command-center digest under Outcomes/, with every gap having severity, owner, evidence status, next action, and approval requirement. No external side effects.
```

## Operating command loop

```
retrieve context
  -> score evidence
  -> detect gaps
  -> route to specialist agents
  -> recommend next actions
  -> execute only safe/approved actions
  -> QA/governance check
  -> write structured outcome
  -> update dashboard digest
```

## Where outputs go

| Output | Path |
|---|---|
| raw/source research | `Sources/YYYY-MM-DD-*.md` |
| sketches for new capabilities | `Sketches/NN-*.md` |
| grill transcript | `Grills/NN-*.md` |
| shaped pitch | `Pitches/NN-*.md` after grill |
| decisions | `Decisions/adr-*.md` after ratification |
| task/result reports | `Outcomes/YYYY-MM-DD-*.md` |
| system docs | root docs named by Phill |

## Current known starting gaps

1. No unified cross-ecosystem agent protocol.
2. No unified evidence ledger.
3. No formal gap detection engine implementation yet.
4. No local command-center digest generator yet.
5. No shared dashboard aggregator across repos.
6. Obsidian integration is rich in Synthex but fragmented elsewhere.
7. Hermes integration is fragmented and often proxy-only.
8. Pi-CEO has strong Nexus primitives but scheduler/action execution is gated/incomplete.
9. Some repo automations are stubs or siloed.
10. Every recommendation must now be evidence-scored before execution.

## Safety rules

- No Nango.
- No new external vendors/accounts without Phill approval.
- No production DB writes without sandbox-first and Board approval.
- No deploys without explicit approval.
- No client/public communications without approval.
- No public publishing of private vault content.
- No fabricated evidence.
- No dashboard item unless actionable.

## Definition of done for the first working system

The first working system exists when Hermes can run one command that:

1. reads the start docs and current evidence,
2. scans 2nd-brain and selected repos,
3. emits a gap report,
4. emits a command-center digest,
5. cites evidence paths,
6. assigns owners/severity/next actions,
7. identifies approval requirements,
8. writes structured Outcomes,
9. does not mutate external systems.

## Human approval boundaries

Phill/Board approval is required for:
- strategic commitments
- prod database changes
- deploys
- new vendors/tools/accounts
- external/client comms
- billing/payment/legal/accounting action
- public publishing
- irreversible destructive operations

## What future agents should understand

The goal is operating leverage. The system should reduce the number of questions Phill has to ask by proactively surfacing:

- what we know
- why we believe it
- what is weak
- what is missing
- what changed
- what should be done next
- what requires Phill
- what should be ignored

The outcome is not more markdown. The outcome is a living intelligence-to-action loop.
