---
type: wiki
updated: 2026-05-19
---

# Unite Autonomous Command Center Authority

Phill authorised the Unite-Group CRM / Command Center to become the autonomous operating layer for the business, with Phill as human-in-the-loop and Board members able to submit input through Telegram, future WhatsApp, Plaud notes, meeting notes, and Command Center review surfaces.

## Core mandate

The system should make the founder and Board experience simple:

```text
Send input -> Margot clarifies -> Board/team routes -> draft packet generates -> human approves -> local/preview action runs -> outcome learns
```

Under the hood, Unite-Group must preserve the [[aip-architecture]] pattern:

- every input becomes an ontology object
- every recommendation links to evidence
- every action has confidence, risk, owner, and approval state
- every generated presentation or live-event packet passes QA before use
- every outcome feeds back into learning

## Authority

Non-destructive project updates can be applied directly to the correct project surface or Linear when the target is clear. This includes docs, specs, Linear packets, sandbox features, service shells, tests, mock adapters, visual prototypes, and committed local changes.

Still approval-gated:

- public publishing
- ad spend
- production deployment
- destructive migrations
- external client commitments
- paid provider jobs above configured caps
- exposing credentials or sensitive client/founder data

## Product translation

In the Synthex app checkout, the mandate is recorded at:

```text
/Users/phill-mac/Synthex/docs/unite-group/autonomous-command-center-authority-2026-05-19.md
```

Live Linear creation was blocked in the local tool environment because `LINEAR_API_KEY` is not set. Replayable issue packets were written instead:

```text
/Users/phill-mac/Synthex/.planning/linear-packets/unite-autonomous-command-center-2026-05-19.json
2nd Brain/Wiki/linear-packets/unite-autonomous-command-center-2026-05-19.json
```

## First implementation tranche

1. Build the service-layer command-center control plane.
2. Add Board input intake for Telegram, Plaud, meetings, and future WhatsApp.
3. Add Margot queue and `@team` dispatch panel.
4. Add presentation QA gate for generated board/live-event materials.

## Linked pages

[[unite-crm]] · [[margot-conversation-os]] · [[aip-architecture]] · [[decision-frameworks]] · [[unite-group-portfolio-ops-board-v1]] · [[service-layer-architecture-2026-05-18]]
