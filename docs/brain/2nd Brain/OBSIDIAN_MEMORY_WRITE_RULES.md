---
type: governance
component: obsidian-memory-write-rules
status: active-draft
created: 2026-06-04
owner: documentation-architect
links:
  - "[[EVIDENCE_LEDGER_SCHEMA]]"
  - "[[GAP_DETECTION_ENGINE]]"
---

# Obsidian Memory Write Rules

## Principle

Obsidian is memory, not intelligence. Agents may write to Obsidian only when the write improves future retrieval, evidence, decision-making, or execution.

No random dumps. No unstructured “thoughts”. No claims without source labels. No pitch without grill. No external publishing.

## Allowed reads

Agents may read:
- `CLAUDE.md`
- `AGENTIC_SYSTEM_START_HERE.md`
- `Sources/`, `Outcomes/`, `Sketches/`, `Grills/`, `Pitches/`, `Decisions/`, `Personas/`
- the ten agentic intelligence operating docs
- repo-local docs and configs when scoped to the task

Agents should load hot memory first:
1. master start doc
2. relevant persona/product doc
3. relevant decisions/pitches
4. last 7-30 days outcomes
5. targeted source search

## Allowed writes

| Folder/file class | Allowed | Notes |
|---|---|---|
| `Sources/YYYY-MM-DD-*.md` | yes | raw or synthesised research with source URLs/paths |
| `Sketches/NN-*.md` | yes | fat-marker sketches only; must include rabbit_holes/no_gos |
| `Grills/NN-*.md` | yes | Q+A transcript and decided/deferred summary |
| `Outcomes/YYYY-MM-DD-*.md` | yes | result/evidence/verification notes |
| `Decisions/adr-*.md` | draft only unless ratified | significant decisions only |
| requested root operating docs | yes | system docs named by Phill |
| `Pitches/NN-*.md` | only after grill resolved | Shape Up rule |

## Forbidden writes

- public publish files unless explicitly approved
- invented evidence or fake metrics
- private secrets or API keys
- raw huge transcripts with no summary/evidence structure
- duplicate docs when an existing doc should be patched
- production-state claims without verification
- pitches that skip grill

## Required frontmatter

Every structured note must include:

```yaml
---
type: source | sketch | grill | pitch | decision | outcome | gap | research-brief | implementation-plan | qa-report | operating-model | schema | governance
component: short-component
status: draft | active-draft | captured | open | in_progress | complete | ratified | rejected | parked
created: YYYY-MM-DD
owner: agent-or-team
links: []
evidence_paths: []
---
```

Use extra fields when relevant:
- `severity`
- `confidence`
- `freshness`
- `approval_required`
- `next_review`
- `business_goal`
- `project`
- `gap_id`

## Research brief template

```markdown
---
type: research-brief
component: ...
status: complete
created: YYYY-MM-DD
owner: research-lead
confidence: low | medium | high
evidence_paths: []
links: []
---

# Research Brief — [Topic]

## Question

## Why it matters to the business

## Sources checked
| Source | Type | Date | Reliability | Notes |
|---|---|---:|---:|---|

## Findings
1. Claim — evidence path/URL — confidence.

## Weak assumptions

## Contradictions

## Recommendation

## Next actions
```

## Decision record template

```markdown
---
type: decision
slug: adr-NNN-short-name
status: proposed | ratified | superseded | rejected
created: YYYY-MM-DD
owner: board-secretary
approval: Phill | Board | pending
links: []
evidence_paths: []
---

# ADR-NNN: [Decision]

## Context

## Decision

## Alternatives considered

## Rationale

## Consequences

## Rollout plan

## Rollback plan

## Review date
```

## Gap report template

```markdown
---
type: gap
id: GAP-YYYYMMDD-001
status: open
category: ...
severity: P0 | P1 | P2 | P3 | P4
score: 0
owner: ...
project: ...
component: ...
evidence_status: ...
approval_required: ...
created: YYYY-MM-DD
links: []
evidence_paths: []
---

# Gap — [Title]

## Summary

## Business impact

## Evidence

## Weak assumptions

## Recommended next action

## Definition of done
```

## Implementation plan template

```markdown
---
type: implementation-plan
component: ...
status: draft
created: YYYY-MM-DD
owner: senior-project-manager
business_goal: ...
evidence_paths: []
links: []
---

# Implementation Plan — [Feature]

## Goal

## Current evidence

## Scope

## Non-goals

## Acceptance criteria

## Tasks
1. Task, files, expected verification.

## Tests / QA

## Rollback

## Documentation updates
```

## QA report template

```markdown
---
type: qa-report
component: ...
status: complete | failed | blocked
created: YYYY-MM-DD
owner: qa-lead
evidence_paths: []
links: []
---

# QA Report — [Thing]

## Scope tested

## Commands run / evidence checked

## Results

## Failures / risks

## Approval recommendation

## Required follow-up
```

## Write-back rules after every agent task

At completion, write or update exactly one of:
- Outcome note for completed work
- Gap report for detected gap
- Research brief for research task
- QA report for verification task
- Decision draft for significant decision

Every write must include:
- what was done
- evidence paths/URLs
- what is still missing
- next action
- approval requirement if any

## Hygiene rules

- Prefer patching an existing canonical doc over creating duplicates.
- Keep titles searchable and specific.
- Use wiki links for related docs.
- Use relative paths in evidence where possible.
- Keep raw material in `Sources/`; conclusions in briefs/outcomes/gaps.
- Move from capture to action through the Shape Up path when build work is implied.
