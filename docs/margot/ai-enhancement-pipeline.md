# Margot AI Enhancement Pipeline

Date: 2026-05-23 07:33 AEST
Project: Unite-Group
Owner: Margot
Scope: Existing repo/docs/code evidence only. This document defines the pipeline; it does not adopt a new model/vendor/tool or make production changes.

## Purpose

Margot must continuously improve Unite-Group with AI, LLM, retrieval, agent, automation, and integration capabilities while staying evidence-driven, privacy-safe, cost-aware, and Board-bounded.

The pipeline exists to prevent random tool chasing. Every AI enhancement must map to CRM, project portfolio, client 2nd Brain, marketing, integration, QA, or operating leverage.

Primary inputs:

- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/crm-operating-model.md`
- `docs/margot/crm-schema-inventory.md`
- `docs/margot/retrieval-rules.md`
- `scripts/margot-semantic-search-wrapper.ts`
- `docs/tool-registration-semantic-search.md`

## Pipeline stages

```text
Watch
  -> Triage
  -> Sandbox
  -> Evaluate
  -> Plan
  -> Implement
  -> Verify
  -> Adopt
  -> Retire / Roll back
```

## Stage definitions

| Stage | What Margot does | Required output | Stop/approval gate |
| --- | --- | --- | --- |
| Watch | Notice a new model/tool/integration/workflow or repo gap. | Candidate note with source and likely business use. | Do not send data or connect accounts yet. |
| Triage | Map candidate to CRM/2nd Brain/marketing/project value. | Value score and affected systems. | Stop if no clear business outcome. |
| Sandbox | Test locally, with mocks, public docs, or synthetic data. | Local test/demo notes; no client secrets/PII. | Production data/vendor connection requires approval. |
| Evaluate | Compare quality, cost, latency, privacy, security, maintainability. | Evaluation matrix and recommendation. | Stop if privacy/security risk is unresolved. |
| Plan | Write implementation plan with files, tests, rollback, owner. | Plan doc or ticket-ready task. | Deployment/env/DB writes require explicit approval. |
| Implement | Build behind tests and scoped boundaries. | Code/docs/tests where approved. | No production deploy by default. |
| Verify | Run focused tests/type-check/manual checks. | Evidence in progress log. | Failed verification blocks adoption. |
| Adopt | Update CRM, command center, 2nd Brain rules, docs, runbooks. | Linked docs and operating rules. | Ask before changing user-facing behavior. |
| Retire | Remove stale/redundant unsafe tools or mark parked. | Retirement note and migration path. | Destructive removal needs clear scope. |

## Value scoring

Score each candidate 0-3 on each dimension:

- Revenue leverage: captures, protects, or accelerates revenue.
- Operating leverage: reduces manual coordination or enables safe agentic execution.
- Data leverage: improves CRM/2nd Brain quality, retrieval, identity, or auditability.
- Client leverage: improves outcomes, retention, trust, speed, or transparency.
- Strategic leverage: moves Unite-Group toward a scalable AI-enabled operating company.

Suggested decision bands:

- 12-15: high-priority candidate; plan a sandbox quickly.
- 8-11: useful; queue behind current CRM spine work.
- 4-7: park unless it solves an active blocker.
- 0-3: reject or revisit later.

## Risk gates

Block or ask before continuing if any are true:

- client PII or confidential data would leave approved systems;
- a vendor requires production credentials or broad account access;
- tool output would directly contact clients/leads or publish publicly;
- the model would make financial, legal, compliance, hiring, billing, or production-deployment decisions automatically;
- cost is unbounded or recurring without monitoring;
- logs may contain secrets, tokens, transcripts, or sensitive client data;
- source identity is ambiguous across clients/businesses;
- no rollback path exists.

## Local-only evaluation pattern

Default safe pattern:

1. Create a small fixture using synthetic or public repo data.
2. Define expected output quality in plain English and tests where possible.
3. Run candidate locally or through mocked interface.
4. Compare against current baseline.
5. Record cost/latency/privacy assumptions explicitly.
6. Store results in a doc or test artifact.
7. Only then propose production integration.

Never use live client secrets, production DB writes, or client-facing outputs during initial evaluation.

## Candidate register format

```yaml
candidate:
  name:
  category: model|agent|retrieval|integration|automation|qa|marketing|ops
  source:
  proposed_use:
  affected_objects:
    - crm_leads
    - nexus_clients
    - tasks
    - agent_actions
    - project_portfolio
    - client_2nd_brain
  value_score:
    revenue:
    operating:
    data:
    client:
    strategic:
  risks:
    privacy:
    cost:
    security:
    reliability:
    vendor_lock_in:
  sandbox_plan:
  verification_plan:
  approval_needed:
  status: watch|triage|sandbox|evaluating|planned|implemented|adopted|parked|retired
  evidence:
```

## Current repo anchors

Current candidate register: `docs/margot/ai-enhancement-candidate-register.md`.

| Anchor | Current role | Enhancement opportunity |
| --- | --- | --- |
| `scripts/margot-semantic-search-wrapper.ts` | Margot-facing semantic retrieval wrapper with confidence threshold. | Add evaluation fixtures for retrieval precision/recall and fallback behavior. |
| `docs/margot/retrieval-rules.md` | Retrieval order and confidence policy. | Connect evaluation outcomes to updated thresholds/rules. |
| `agent_actions` | Current audit/event spine. | Add AI enhancement events and adoption/rollback evidence. |
| `crm_leads` / marketing route | Lead capture source. | Add deterministic qualification first; AI enrichment only after privacy/approval gates. |
| Margot voice routes/tests | Voice-to-task ingress. | Evaluate better summarization/classification only with transcript privacy rules. |
| Integration mirrors | Provider health and project evidence. | Add stale-sync/risk summarization without direct provider mutation. |

## First safe candidates

These are candidates implied by current docs; none are adopted by this lane:

1. Retrieval evaluation harness for Margot docs.
   - Value: data/operating leverage.
   - Safe first step: synthetic queries against known docs, no external calls.

2. Deterministic lead qualification helper before AI scoring.
   - Value: revenue/operating leverage.
   - Safe first step: local tests with `crm_leads` fields.

3. Morning digest generator backed by explicit CRM/project rows.
   - Value: operating/client/strategic leverage.
   - Safe first step: template over docs and mocked data.

4. Integration health summarizer.
   - Value: operating/data leverage.
   - Safe first step: local rules over `integration_sync_state` shape.

5. Voice transcript privacy and retention policy.
   - Value: client/security leverage.
   - Safe first step: docs and tests around route field handling.

## Reporting requirements

Every AI enhancement lane must append evidence to `docs/margot/overnight-progress-log.md`:

```text
Candidate:
Stage moved from -> to:
Files changed:
Verification:
Risks/approval gates:
Adopted, parked, or retired:
```

## Immediate next implementation steps

1. Keep the first local-only retrieval fixture gate (`src/lib/margot/retrieval-evaluation.ts`; `tests/unit/lib/margot/retrieval-evaluation.test.ts`) green before changing Margot retrieval thresholds or answer behavior.
2. Maintain `docs/margot/ai-enhancement-candidate-register.md` as the concrete candidate queue when a safe evaluation starts or changes status.
3. Expand AI-RET-001 only with mocked/static fixtures first; integration-stale and command-center source-citation fixtures now exist, so the next safe expansion is mocked answer-shape checks before any live retrieval behavior change.
4. Keep deterministic CRM helpers (`qualifyLead`, daily digest) ahead of probabilistic AI scoring/enrichment until privacy, identity, and approval gates are explicit.
5. Link adopted enhancements back into CRM schema/source-of-truth docs and the command-center report.
