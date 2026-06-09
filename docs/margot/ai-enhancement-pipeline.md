# Margot AI Enhancement Pipeline

Date: 2026-05-23 07:33 AEST
| Last update: 2026-06-10 09:00:00 AEST |
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
- `docs/margot/ai-enhancement-candidate-register.md` (concrete candidate queue with explicit statuses)
- `scripts/margot-semantic-search-wrapper.ts`
- `docs/tool-registration-semantic-search.md`

## Current Senior PM verification checkpoint (2026-06-09 14:53 AEST)

What exists:

- Durable pipeline doc with 9-stage state machine and 5-dimension value scoring.
- Concrete candidate register with explicit per-candidate status, value score, evidence list, and approval gates.
- Three local-only `implemented_local` candidates:
  - `AI-CRM-001` deterministic lead qualification helper.
  - `AI-CRM-002` daily CRM digest generator with explicit source labels.
  - `AI-RET-001` retrieval evaluation harness with mocked/static fixtures, local report runner, report read-back parser, and integrity/error-path cases.
- One `triage` candidate (`AI-INT-001` integration stale-sync/risk summarizer) anchored on the existing `stale-sync-check` helper.
- One `blocked_approval` candidate (`AI-VOICE-001` voice transcript privacy/retention policy) gated on transcript retention/privacy policy, sandbox apply/diff, RLS/service-role validation, and production promotion authority.

What has started (this tick):

- Refreshed this pipeline doc so the "First safe candidates" section, the "Reporting requirements" examples, and the "Immediate next implementation steps" list name the *concrete* AI-RET-001 report, the AI-RET-001 mocked answer-shape contract, the per-candidate statuses, and the existing AI-RET-001 read-back guards, rather than only describing the pipeline abstractly.
- This is a documentation refresh only; no new code, schema, test, deployment, or vendor work was performed.

Why this exists / problem it solves:

- The previous version of this doc listed "first safe candidates" abstractly and referenced `AI-RET-001` as "Add evaluation fixtures" rather than as a concrete implemented-local lane with a 7/7 source-citation + 7/7 answer-shape mocked gate. A future agent would have re-derived that `AI-RET-001` was still a forward plan and might have tried to design a new retrieval harness instead of extending the existing one.
- The previous version also didn't explicitly name the `blocked_approval` and `triage` lanes, so the doc implied all five candidates were at the same stage. The refreshed doc states which candidates are concrete (`implemented_local`) vs gated vs parked.

Missing / unclear / pending external authority:

- The `AI-VOICE-001` voice transcript privacy/retention policy is still pending a named authority/auth gate and an explicit privacy decision from Phill before any sandbox apply/diff, RLS/service-role validation, or production promotion.
- The `AI-INT-001` stale-sync/risk summarizer is still in `triage`; no live provider polling/secret reads/production DB writes are allowed, and mocked mirror fixtures are still to be defined.
- No new vendors, model swaps, or connector-platform tools are approved. Third-party connector platforms remain explicitly forbidden by operator policy.

Current health evidence (this tick):

- `npm run type-check` passed.
- `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/ tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 156 tests PASS.
- `npm run security:routes-check` reported 0 unprotected mutating routes.
- `git diff --check` passed before and after status-report updates.
- `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` is current with 7/7 source-citation fixtures PASS, 7/7 answer-shape fixtures PASS, `overallStatus=pass`.

Mac Mini state (this tick):

- `/Volumes` contains only `Macintosh HD`; no authenticated non-system mounted scan root exists; recovered Markdown artifact count remains `0`; `phills-mac-mini.local:445` is reachable (SMB/File Sharing reachable), `:22` is unreachable (SSH/Remote Login unavailable from this MacBook session). No credential prompt/read, secret printing/storage, or recursive system-volume scan occurred.

Smallest next safe action:

- Keep this pipeline doc aligned with the concrete candidate register and the AI-RET-001 mocked/report read-back contract; rotate to another bounded Senior PM lane (e.g. close another voice-test gap, add another mocked AI-RET-001 answer-shape fixture, or refresh another control surface) instead of repeatedly revalidating the same gated sandbox/Mac Mini state.

## AI-RET-001 AI-Enhancement-Pipeline Citation Contract

This control surface is now bound to the 17th mocked/static answer-shape fixture `AI-RET-001-ANSWER-AI-ENHANCEMENT-PIPELINE-BOUNDARY` (added at `2026-06-10 09:00:00 AEST`, bound to the existing `AI-RET-001-SENIOR-PM-LOOP` source-citation fixture; no source-citation union member added). The fixture pins the AI-enhancement-pipeline contract so any future answer that overclaims adoption, vendor onboarding, production database writes, paid spend, public publishing, budget change, third-party connector platforms, live vector search, or auto-execution is rejected before command-center surfacing.

### 9 required answer phrases

- `pipeline stages` (the durable Watch -> Triage -> Sandbox -> Evaluate -> Plan -> Implement -> Verify -> Adopt -> Retire state machine).
- `value scoring` (the 0-3 five-dimension matrix: revenue, operating, data, client, strategic).
- `candidate register` (`docs/margot/ai-enhancement-candidate-register.md` is the concrete candidate queue with explicit statuses).
- `sandbox-first` (every candidate is local-only and behind mocked/static tests before any production consideration).
- `local evidence only` (no live vector search, no external AI calls, no provider polling, no DB access, no vendor/account setup).
- `no production database writes` (every enhancement stays behind guarded server routes; production schema changes require the sandbox wizard and explicit operator approval).
- `no new vendor` (no third-party connector platform, no additional model swap without explicit Phill approval).
- `operator approval required` (any candidate that crosses into production / client-facing / billing territory requires explicit operator approval).
- `mocked/static harness` (the AI-RET-001 harness remains mocked/static, pinned to exact file-read fallback on `shape_mismatch`).

### 4 required citation sources

- `docs/margot/ai-enhancement-pipeline.md` (this doc).
- `docs/margot/ai-enhancement-candidate-register.md` (concrete candidate queue with statuses and approval gates).
- `src/lib/margot/retrieval-evaluation.ts` (the mocked/static AI-RET-001 harness).
- `docs/margot/retrieval-rules.md` (the canonical retrieval policy and the AI-RET-001 gate that pins this contract).

### Prohibited overclaim categories (full phrase list in the matching Senior PM verification checkpoint below)

The 9 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint` heading):

- Any wording that claims a model has been adopted, a vendor onboarded, the production database updated, paid spend committed, public publishing approved, the budget changed, live vector search enabled, auto-execution enabled, or that a third-party connector platform was used is rejected before command-center surfacing. A doc-drift guard test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` enforces this so a future draft cannot quietly mark this lane as model-adopted, vendor-onboarded, prod-written, paid-spend, public-publishing, budget-changed, live-vector-search, auto-execution, or third-party-connector-platform-handled. The exact prohibited substrings and their precise spelling are listed in the matching Senior PM verification checkpoint below and enforced by the harness, not by ad-hoc prose in this section.

The `## AI-RET-001 AI-Enhancement-Pipeline Citation Contract` section above IS the assertion section the doc-drift guard scans. The 9 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's prohibited-phrase enumeration) so the assertion-section regex check (which excludes the `## Senior PM verification checkpoint` body) stays green.

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

## Status mapping (pipeline stage -> candidate register status)

The candidate register uses a parallel set of statuses that are easier for operators to scan:

| Pipeline stage | Register status | Meaning |
| --- | --- | --- |
| Watch | `watch` | Candidate known, not shaped. |
| Triage | `triage` | Value/risk scored from existing assets. |
| Sandbox | `sandbox` | Local-only mocks/fixtures/tests being built or run. |
| Implement + Verify (local) | `implemented_local` | Local deterministic code/docs/tests exist; no production adoption is implied. |
| Plan (waiting on authority) | `blocked_approval` | Useful, but next action needs a named approval gate. |
| Watch (no case) | `parked` | No current safe business case. |
| Retire | `rejected` | Does not support Unite-Group or violates guardrails. |

This is the *only* mapping the pipeline uses. Any new candidate must be added with one of these statuses; status changes must be reflected in the candidate register with the same timestamp used in the progress log.

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

Additional operator-policy gates (2026-06-09):

- No new vendor or model swap without explicit Phill approval; third-party connector platforms are forbidden by operator policy.
- AI-RET-001-style local report evidence must be regenerated and read back green before any retrieval threshold, fallback, or behavior change.
- Any candidate that needs a transcript, voice, or client-note ingest must clear the `AI-VOICE-001` privacy/retention gate first.

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

The pattern is now instantiated concretely in `AI-RET-001`:

- The mocked fixture set lives in `src/lib/margot/retrieval-evaluation.ts`.
- The local report runner lives in `scripts/margot-retrieval-evaluation-report.ts`.
- The report read-back parser/assertion gate lives in `tests/unit/lib/margot/retrieval-evaluation.test.ts`.
- The generated evidence lives at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`.

Any new candidate that needs an evaluation harness should reuse this pattern before introducing a second pattern.

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

The concrete candidates that exist today are tracked in `docs/margot/ai-enhancement-candidate-register.md`. The pipeline does not duplicate that table; it only defines the format and the stage/status mapping.

## Current repo anchors

Current candidate register: `docs/margot/ai-enhancement-candidate-register.md`.

| Anchor | Current role | Enhancement opportunity |
| --- | --- | --- |
| `scripts/margot-semantic-search-wrapper.ts` | Margot-facing semantic retrieval wrapper with confidence threshold. | Threshold/answer-shape changes must clear the AI-RET-001 mocked gate first. |
| `docs/margot/retrieval-rules.md` | Retrieval order and confidence policy. | Connect evaluation outcomes to updated thresholds/rules. |
| `agent_actions` | Current audit/event spine. | Add AI enhancement events and adoption/rollback evidence. |
| `crm_leads` / marketing route | Lead capture source. | Add deterministic qualification first; AI enrichment only after privacy/approval gates. |
| Margot voice routes/tests | Voice-to-task ingress. | Evaluate better summarization/classification only with transcript privacy rules (AI-VOICE-001 gate). |
| Integration mirrors | Provider health and project evidence. | Add stale-sync/risk summarization without direct provider mutation (AI-INT-001). |
| `src/lib/margot/retrieval-evaluation.ts` | AI-RET-001 evaluation harness (7/7 source, 7/7 answer shape). | Extend with additional fixtures/report integrity cases before any behavior change. |
| `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` | Generated AI-RET-001 evidence. | Regenerate and read back green after any harness or threshold change. |

## First safe candidates (concrete, not abstract)

These candidates already exist in the register; none are adopted to production by this lane. The register is the source of truth; this list is a stable pointer.

1. `AI-CRM-001` — Deterministic lead qualification helper.
   - Status: `implemented_local`.
   - Evidence: `src/lib/crm/qualify-lead.ts`; `tests/unit/lib/crm/qualify-lead.test.ts`; matrix row.
   - Safe next step: keep pure-helper tests green; surface only as recommendation in digest/command center.

2. `AI-CRM-002` — Daily CRM digest generator with explicit source labels.
   - Status: `implemented_local`.
   - Evidence: `src/lib/crm/daily-digest.ts`; `docs/margot/daily-crm-digest-template.md`; `tests/unit/lib/crm/daily-digest.test.ts`; `tests/unit/lib/crm/digest-edge-cases.test.ts`; `tests/integration/api/crm-daily-digest.test.ts`.
   - Safe next step: re-run focused digest tests when summary/PII behavior changes.

3. `AI-RET-001` — Retrieval evaluation harness for Margot docs.
   - Status: `implemented_local`.
   - Evidence: `scripts/margot-semantic-search-wrapper.ts`; `src/lib/margot/retrieval-evaluation.ts`; `scripts/margot-retrieval-evaluation-report.ts`; `tests/unit/lib/margot/retrieval-evaluation.test.ts`; `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (7/7 source, 7/7 answer shape, `overallStatus=pass`).
   - Safe next step: extend only with additional local report corruption/error-path cases or more mocked answer-shape fixtures.

4. `AI-INT-001` — Integration stale-sync/risk summarizer.
   - Status: `triage`.
   - Safe next step: define local stale thresholds and mocked mirror fixtures before any live provider polling.

5. `AI-VOICE-001` — Voice transcript privacy and retention policy before richer summarization.
   - Status: `blocked_approval`.
   - Safe next step: keep route/schema tests green and add local redaction/privacy fixtures; do not run sandbox/prod wizard subcommands until a named authority/auth gate exists.

## Reporting requirements

Every AI enhancement lane must append evidence to `docs/margot/overnight-progress-log.md` using a template that mirrors the candidate register statuses:

```text
Candidate:
Stage moved from -> to:
Files changed:
Verification:
Risks/approval gates:
Adopted, parked, or retired:
```

This is a stable required template. The "Files changed" line must list every code, test, and doc path touched; the "Risks/approval gates" line must name the next named authority gate if the candidate is not yet `implemented_local` or beyond.

## Immediate next implementation steps

1. Keep the first local-only retrieval fixture gate (`src/lib/margot/retrieval-evaluation.ts`; `tests/unit/lib/margot/retrieval-evaluation.test.ts`) green and the AI-RET-001 evidence report read back green before changing Margot retrieval thresholds or answer behavior. The mocked fixture, answer-shape, local report-runner, and report read-back gates are the unit-testable boundary.
2. Maintain `docs/margot/ai-enhancement-candidate-register.md` as the concrete candidate queue. When a candidate's status changes, update the register with the same timestamp used in the progress log and the pipeline `Status mapping` table.
3. Expand AI-RET-001 only with mocked/static fixtures first. Integration-stale and command-center source-citation fixtures now exist; the next safe expansion is additional mocked answer-shape checks (e.g. for a future lead-to-client conversion flow) before any live retrieval behavior change.
4. Keep deterministic CRM helpers (`qualifyLead`, daily digest) ahead of probabilistic AI scoring/enrichment until privacy, identity, and approval gates are explicit. AI-CRM-001/002 remain recommendation-only and operator-decision-support only.
5. Link adopted enhancements back into CRM schema/source-of-truth docs and the command-center report. Adopting any candidate to production requires an explicit `Adopt` stage entry in the progress log and an updated status in the candidate register.
6. Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` for any AI-driven DB-touching candidate (notably `AI-VOICE-001`) until the specific authority/auth gate changes and the next-action envelope has been reviewed.
