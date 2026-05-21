---
type: strategy
updated: 2026-05-17
---

# Unite-Group Portfolio Ops Board v1

## Objective
Create the first durable operating board for Unite-Group portfolio execution under the $2B by June 2028 pathway.

Cross-refs: [[exit-thesis]] · [[operational-priorities-q2-2026]] · [[unite-crm]] · [[margot-conversation-os]] · [[pi-ceo-architecture]]

## Kanban Board (created)
- Board slug: `unite-group-portfolio-ops`
- Name: Unite-Group Portfolio Operations
- DB path: `/Users/phill-mac/.hermes/kanban/boards/unite-group-portfolio-ops/kanban.db`

Seed cards (triage, no execution yet):
1. `t_49a8d5f4` — UG-OPS-01 Daily Hermes update scout + release risk classification
2. `t_94f78614` — UG-OPS-02 Plaud intake normalization: voice to structured brief
3. `t_7d4959aa` — UG-OPS-03 Portfolio RYG dashboard cadence + verification gates
4. `t_82f1a895` — UG-OPS-04 Build plan v1 for autonomous CEO control layer (no coding yet)

## Update Scout (run now)
Commands executed:
- `hermes update --check`
- `hermes version`
- Latest release pulled from GitHub `NousResearch/hermes-agent`

Result snapshot:
- Local version: Hermes Agent v0.14.0 (2026.5.16)
- Latest tag: `v2026.5.16`
- Delta: none (already up to date)

Recommendation:
- `IGNORE` for now (no update needed)
- Trigger `CANARY` only when a release includes critical security fixes or features that directly improve verification, throughput, or cost in portfolio operations

## Plaud Intake Flow (v1)
Scope: Plaud NotePin S as mobile voice intake only. Routing authority remains [[unite-crm]].

1) Intake
- Source: Plaud recording/transcript
- Artifact: raw transcript + metadata (speaker/date/context)

2) Normalize (Margot)
- Convert raw transcript to structured brief:
  - Objective
  - Requested outcome
  - Business context (which asset)
  - Required evidence
  - Deadline / owner
  - Risk level

3) Route (non-negotiable order)
- First write: Unite CRM record (source of truth)
- If and only if marketing/campaign work: route execution brief to Synthex
- All other product/repo work: execution assets (RestoreAssist, ATO, DR-NRPG, CCW, CARSI, etc.)

4) Persist
- Create/update Kanban task with CRM reference ID
- Store only summary + references in chat; keep durable state in CRM/Kanban/files

5) Verify gate
- No completion claim without evidence:
  - repo change => tests/logs
  - production claim => deployment/check output
  - revenue/client claim => CRM-linked source

## 2026-05-21 Intake Expansion

New Plaud packets added three durable workstreams:

- [[portfolio-voice-intake-2026-05-21]] — meeting cockpit, RestoreAssist dictation, NRPG member-value dashboard, and personalized learning feed.
- [[duncan-fitr-venture-brief-2026-05-21]] — FITR / ITR Button / DIY Home Loan venture brief from the 2026-05-20 discussion.
- [[agentic-engineering-harness-2026-05-21]] — AI-layer operating standard from the new Source batch.

Routing decision:

- Founder voice notes enter Plaud/Wiki first.
- Margot normalizes into a short brief and assigns business context.
- Unite-Group CRM becomes the operating record.
- Synthex receives only marketing, search, campaign, proposal, and presentation tasks.
- Product and engineering tasks go to their owning repo and must close through [[mandatory-close-the-loop-protocol]].

## Build Plan (no-code phase)
Phase 0 — Control surface and governance (now)
- Board created
- Intake/route boundaries locked
- Verification gates defined

Phase 1 — Intake and triage wiring
- Standardise Plaud -> Margot brief schema
- Auto-create triage cards with CRM references
- Enforce role classification (CRM vs Synthex vs execution assets)

Phase 2 — Execution and QA lanes
- Add explicit owner, due date, and acceptance checks per card
- Add test/proof templates by work type (code, ops, content, client)

Phase 3 — Reporting lane
- Daily RYG snapshot with:
  - what changed
  - evidence links
  - blockers
  - next action
  - owner/system
  - budget used/saved

Phase 4 — Automation hardening
- Move mechanical checks to no-agent cron where possible
- Keep high-cost models only for architecture/security/merge decisions
- Maintain canary-first upgrade path

## RYG (today)
- Status: GREEN
- Why: Board created, scout run and verified, intake flow and phased plan documented, no coding started
