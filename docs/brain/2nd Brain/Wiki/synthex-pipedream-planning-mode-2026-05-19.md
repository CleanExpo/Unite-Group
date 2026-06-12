---
type: wiki
updated: 2026-05-19
---

# Synthex Pipedream Planning Mode

The Synthex Pipedream is the full autonomous operating pipeline connecting [[synthex]], [[unite-crm]], [[margot-conversation-os]], [[aip-architecture]], Hermes, Brain-1/Wiki, Command Centre, Gen Media, and human approval gates.

## Current decision

Build and fully test in sandbox before main/prod movement.

```text
Telegram / Plaud / Meeting Notes / Command Centre Input
  -> Margot cleanup
  -> Brain-1/Wiki and Synthex data grounding
  -> Nexus ontology
  -> @team routing
  -> draft plans, presentations, media, and build packets
  -> human approval
  -> sandbox execution
  -> preview verification
  -> production gate
  -> outcome learning
```

## Confirmed assets

- Synthex Command Centre has authenticated org-scoped APIs for status, activity, pending approvals, performance, stats, and autopilot.
- Hermes Agent is installed and running locally.
- Hermes Telegram is configured.
- Hermes Unite-Group plugin exists.
- Brain-1 contains the Synthex, Unite-CRM, Margot, and Command Center authority pages.
- Pipedream is useful as an optional adapter, not the core brain.

## Current blockers

- Linear live issue creation is blocked in the current Codex tool environment because `LINEAR_API_KEY` is unavailable.
- WhatsApp is not configured in the observed Hermes status.
- Pipedream credentials are not visible in the current Codex environment.
- Hermes reports it is behind upstream; update requires a separate backup/update gate.

## App-side plan

```text
/Users/phill-mac/Synthex/docs/unite-group/synthex-pipedream-sandbox-to-live-plan-2026-05-19.md
```

## Replay packet

```text
/Users/phill-mac/Synthex/.planning/linear-packets/synthex-pipedream-command-center-2026-05-19.json
2nd Brain/Wiki/linear-packets/synthex-pipedream-command-center-2026-05-19.json
```

## Research Council Upgrade

The current Synthex sandbox now treats Karpathy-style research as a first-class
command-center packet:

```text
Obsidian Source -> Wiki evidence -> Research Council -> Chair synthesis -> Human review
```

References:

- [[synthex-karpathy-research-council-2026-05-19]]
- [[spec-karpathy-pipeline-audit-2026-05-15]]
- [[margot-conversation-os]]

Hermes stays always-on as an operator and researcher. Publishing, spend,
deployment, and public output remain behind Synthex/Unite-Group approval gates.

## Linked pages

[[synthex]] · [[unite-crm]] · [[margot-conversation-os]] · [[unite-autonomous-command-center-authority-2026-05-19]] · [[aip-architecture]] · [[service-layer-architecture-2026-05-18]] · [[synthex-karpathy-research-council-2026-05-19]]
