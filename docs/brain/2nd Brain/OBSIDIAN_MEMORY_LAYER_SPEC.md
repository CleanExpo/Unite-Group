---
type: spec
component: obsidian-memory-layer
status: active-draft
created: 2026-06-04
owner: documentation-agent
---

# Obsidian Memory Layer Spec

## Principle

Obsidian is the memory layer, not the intelligence layer. Agentic Nexus may read and write structured memory, but decisions and execution are governed by the control plane.

## Read rules

Agents may read:
- root Agentic Nexus docs
- `Sources/`, `Outcomes/`, `Sketches/`, `Grills/`, `Pitches/`, `Decisions/`, `Personas/`
- repo docs and configs relevant to assigned task

Agents must not dump full vault context into every run. Use targeted retrieval.

## Write rules

Allowed writes:
- research briefs
- gap reports
- decision drafts
- implementation plans
- QA reports
- outcomes
- command-center digests

Forbidden writes:
- secrets
- unstructured dumps
- fabricated evidence
- public publishing artifacts marked as published without approval
- pitches without grill/approval path

## Templates

### Research brief

Fields: question, business relevance, sources, findings, confidence, missing evidence, recommendation, next action.

### Gap report

Fields: gap ID, category, severity, owner, evidence status, business impact, next action, escalation.

### Decision record

Fields: context, decision, alternatives, rationale, rollout, rollback, approver, review date.

### Implementation plan

Fields: goal, repo, files, tasks, validation commands, acceptance criteria, rollback, docs.

### QA report

Fields: scope, commands, results, logs, screenshots, failures, approval recommendation.

## Evidence linking

Every Obsidian output from Agentic Nexus must include:
- linked task ID
- evidence paths
- confidence score or evidence status
- owner
- next action
