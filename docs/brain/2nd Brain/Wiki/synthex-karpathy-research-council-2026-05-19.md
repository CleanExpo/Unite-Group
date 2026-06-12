---
type: implementation-note
date: 2026-05-19
status: active
project: synthex
tags:
  - synthex
  - unite-group
  - obsidian
  - palantir-ontology
  - karpathy
  - hermes
---

# Synthex Karpathy Research Council

## Decision

Synthex and Unite-Group should use a **research council** pattern before any
high-value campaign, product, media, or platform decision moves into build or
production.

The local pattern is:

```text
User/Source Input
-> Obsidian/Wiki evidence bundle
-> Research Council findings
-> Contrarian review
-> Chair synthesis
-> Human-reviewed command packet
-> Outcome learning
```

This is an adaptation of:

- `karpathy/llm-council` — parallel first opinions, anonymised peer review,
  chairman synthesis.
- `karpathy/autoresearch` — autonomous experiment loop with a fixed budget,
  single metric, keep/discard discipline, and results logging.
- `multica-ai/andrej-karpathy-skills` — think first, keep code simple, make
  surgical edits, and verify against explicit goals.

## Applied To Synthex

The app-side implementation lives in:

```text
/Users/phill-mac/Synthex/lib/unite-command-center/research/
```

It adds a service-layer research council packet with:

- `councilRoute`
- source-backed findings
- confidence and risk state
- open questions
- production-blocking gate when evidence is missing
- learning-loop keep/discard criteria

Routing now sends Obsidian, Hermes, Palantir/ontology, evidence, source, and
Karpathy-style commands to `research-council`.

## Source Integration

Processed Sources:

- [[5 Ways I Make Money With Hermes Agent]] — Hermes should act as a junior
  operator for lead research, content research, trend scouting, alerts, and
  client ops. It drafts and logs; humans review high-risk actions.
- [[Marketing Brain My AI SEO System Walkthrough (Claude Code + Obsidian)]] —
  Obsidian works best as a compounding marketing brain with client metadata,
  hot/index/wiki structure, DataForSEO-backed workbooks, and execution plans.
- [[Graphify Solves Claude's Biggest Limitation (Finally)]] — code/docs should
  be compiled into a graph so agents can ask path/explain/query questions
  without rediscovering the same context every run.

## Ontology Mapping

Required objects:

- `Source`
- `EvidenceRef`
- `ResearchQuestion`
- `CouncilFinding`
- `Risk`
- `OpenQuestion`
- `ApprovalGate`
- `OutcomeMetric`
- `Learning`

Required links:

- `Source` -> `EvidenceRef`
- `EvidenceRef` -> `CouncilFinding`
- `CouncilFinding` -> `Risk`
- `CouncilFinding` -> `OpenQuestion`
- `ChairSynthesis` -> `ApprovalGate`
- `CommandPacket` -> `OutcomeMetric`
- `OutcomeMetric` -> `Learning`

## Hermes Always-On Role

Hermes remains the always-on operator substrate for:

- source monitoring,
- trend scouting,
- content research,
- client ops reminders,
- morning action briefs,
- draft command-packet creation.

Hermes must not directly publish, spend, deploy, or commit. It routes evidence
and draft commands into Synthex/Unite-Group review gates.

## Unite-Group Link

Synthex produces campaign, media, and research command packets.

Unite-Group Nexus remains the portfolio command system where those packets
become visible work, board decisions, and business-level next actions.

This page links to:

- [[synthex]]
- [[synthex-pipedream-planning-mode-2026-05-19]]
- [[synthex-command-center-gen-media-build-2026-05-19]]
- [[synthex-intelligence-ontology-platform-research-2026-05-19]]
- [[unite-autonomous-command-center-authority-2026-05-19]]
- [[unite-group-nexus-architecture]]
- [[margot-conversation-os]]
- [[spec-karpathy-pipeline-audit-2026-05-15]]

## Current State

Status: implemented in Synthex sandbox branch.

Verification:

- Focused research council unit tests pass.
- Existing command-center contract and Hermes handoff tests pass.

Production: blocked until the wider branch green gate, authenticated browser
review, security review, rollback path, and explicit human approval are complete.
