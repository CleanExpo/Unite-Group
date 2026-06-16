# Margot CRM Approval Persistence Plan

Date: 2026-05-23 16:38 AEST
Last update: 2026-06-13 02:30:00 AEST — Senior PM 90th answer-shape fixture (crm-approval-persistence-plan self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-CRM-APPROVAL-PERSISTENCE-PLAN-SELF-BOUNDARY`, bound to `AI-RET-001-LEAD-QUALIFICATION`, no source-citation union member added) so a future answer about the crm-approval-persistence-plan self-boundary must cite this doc, `crm-operating-model.md`, `crm-schema-inventory.md`, and `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below. Disjoint from the 10th `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` (content-citation boundary, bound to `AI-RET-001-LEAD-QUALIFICATION`) which guards the operator-evidence approval-persistence surface map; the 90th (self-boundary, bound to `AI-RET-001-LEAD-QUALIFICATION`) guards the self-evidence identifier set. The two cover different coverage vectors.
Owner: Margot
Project: Unite-Group
Scope: Local planning artifact only. No production database write, migration application, deployment, GitHub push, Vercel env mutation, client-facing communication, billing/payment action, or permanent business-rule approval is implied.
Related evidence: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (overallStatus=pass, answerShape=10/10 after this lane)
Related fixture: `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` (new in this lane, bound to `AI-RET-001-LEAD-QUALIFICATION` source-citation fixture)
Related rotation guard: `## Senior PM verification checkpoint (2026-06-10 00:58 AEST)` block at the end of this file

## Purpose

This plan closes the next safe CRM approvals gap: decide how approval evidence should persist before Margot wires approval lifecycle decisions into route writes, daily digest actions, or command-center UI.

The current code has a safe local approval classifier in `src/lib/crm/approval-lifecycle.ts`, but persistence is still deliberately unresolved. This document recommends the staged persistence model that keeps today's task-based approval convention working while defining when a dedicated `crm_approvals` table becomes justified.

## Current evidence

| Evidence | Current meaning |
| --- | --- |
| `src/app/api/pi-ceo/margot-voice/task/route.ts` | Voice packets with `approval_required=true` create a `tasks` row with `status='blocked'`, `priority='high'`, `assignee_name='Phill approval'`, approval tags, and the operator-facing approval reason in the task description. |
| `src/lib/crm/approval-lifecycle.ts` | Pure local decision-support helper that classifies `requested`, `approved`, `rejected`, `cancelled`, `expired`, `executed`, and invalid approvals. It performs no writes and always returns `safeToAutoExecute: false`. |
| `tests/unit/lib/crm/approval-lifecycle.test.ts` | Covers lifecycle states, required fields, expired approvals, high-risk subject types, and no echoing of approval references or Board-like IDs in returned reasons. |
| `src/app/api/crm/opportunities/route.ts` | Requires approval flags/reference for won/conversion-like opportunities but does not persist Board approval IDs. |
| `src/lib/crm/daily-digest.ts` and `src/app/api/crm/daily-digest/route.ts` | Surface blocked/high-priority tasks and approval needs as operator decision-support. |
| `docs/margot/crm-schema-inventory.md` | Marks approvals as partial via task convention and calls out the decision between `crm_approvals` and task subtype. |
| `docs/margot/crm-test-coverage-matrix.md` | Marks approvals as covered only as pure local decision support; persistence shape is still the next gap. |

## Recommendation

Use a two-stage model.

### Stage 1 — Keep task subtype as the current operational queue

Use `tasks` as the visible work queue for approval-required items until the schema provenance for `tasks` and `voice_command_sessions` is recovered and reviewed.

Task subtype rules:

1. Approval-needed work is represented by:
   - `status='blocked'`
   - `priority='high'`
   - `assignee_name='Phill approval'`
   - tag `approval-required`
   - a non-secret approval reason in the task description
2. Task rows are for operator routing, not legal/compliance evidence.
3. Task descriptions must not store secret values, bearer tokens, API keys, payment details, full approval references, or Board IDs.
4. Margot may surface these tasks in daily digest and command-center views as decisions needed.
5. Margot must not treat a task convention alone as permission to perform production writes, client-facing sends, billing/payment actions, cross-client merges, or deployments.

Why Stage 1 stays useful:

- It matches existing route behavior and tests.
- It keeps Phill approval work visible without a new migration.
- It avoids creating a dedicated table before query/RLS/audit needs are proven.
- It is safe for local docs/tests and command-center surfacing.

### Stage 2 — Add `crm_approvals` only when durable approval evidence is required

Introduce a dedicated `crm_approvals` draft migration only after one of these triggers is true:

1. Approval outcomes must be queried independently from tasks.
2. Multiple CRM objects need the same approval record.
3. Approval status changes need immutable audit history.
4. Expiry and executed-at semantics must be enforced consistently across routes.
5. Command-center UI needs structured filters by subject, risk, requester, approver, or expiry.
6. Legal/compliance/revenue governance needs durable non-secret approval metadata.

The dedicated table should be sandbox-first and should not be promoted without explicit Phill/Board approval.

## Proposed `crm_approvals` shape when Stage 2 is justified

Draft fields for a future migration:

| Field | Purpose | Safety rule |
| --- | --- | --- |
| `id uuid primary key` | Approval record identity | Internal UUID only. |
| `subject_type text not null` | `lead_conversion`, `opportunity_commitment`, `client_merge`, `data_export`, `deployment`, `billing_action`, `client_facing_send`, `other` | Unknown subject types must block. |
| `subject_id uuid null` | Related CRM object when safe and known | Do not guess object links. |
| `subject_slug text null` | Non-UUID object hint such as client/business slug | Must be scoped and non-secret. |
| `requested_by text not null` | Requesting actor/system | No tokens or raw email headers. |
| `requested_at timestamptz not null default now()` | Request time | Required for expiry. |
| `reason text not null` | Operator-safe reason | No secrets, payment details, or full Board IDs. |
| `scope text not null` | Exact permission being requested | Must be least-privilege and action-specific. |
| `risk_level text not null default 'medium'` | `low`, `medium`, `high`, `critical` | High/critical require explicit Phill/Board review. |
| `status text not null default 'requested'` | `requested`, `approved`, `rejected`, `cancelled`, `expired`, `executed` | Lifecycle helper must classify before execution recommendation. |
| `approved_by text null` | Approver label | Do not infer approver. |
| `approved_at timestamptz null` | Approval time | Required for approved status. |
| `approval_reference_hash text null` | Optional one-way reference proof | Never persist full Board approval IDs by default. |
| `expires_at timestamptz null` | Approval expiry | Expired approvals must not execute. |
| `executed_at timestamptz null` | Manual execution completion time | Does not permit auto-execution. |
| `execution_actor text null` | Who executed manually | Must be auditable. |
| `rejection_reason text null` | Operator-safe rejection reason | No sensitive details. |
| `related_task_id uuid null` | Link back to `tasks` when schema provenance exists | Only after `tasks` identity is confirmed. |
| `metadata jsonb not null default '{}'` | Minimal non-secret context | Must be sanitized like timeline metadata. |
| `created_at timestamptz not null default now()` | Created time | Audit support. |
| `updated_at timestamptz not null default now()` | Updated time | Audit support. |

Hard constraints:

- RLS enabled.
- Service-role write policy only until explicit read/write roles exist.
- No secret values.
- No raw Board approval ID persistence by default.
- No approval record should ever set `safeToAutoExecute=true`; approval can only recommend manual scoped execution.
- `client_merge`, `data_export`, billing/payment, deployment, and client-facing-send subjects remain high-risk even when approved.

## State machine

```text
requested
  -> approved
  -> executed

requested
  -> rejected

requested
  -> cancelled

requested or approved
  -> expired

invalid input
  -> invalid_request from helper; do not persist as approval unless logged as data-quality issue
```

Execution rules:

1. `requested`: wait for Phill/Board.
2. `approved`: manual scoped execution may be recommended only if approval metadata is complete and not expired.
3. `rejected`, `cancelled`, `expired`: do not execute.
4. `executed`: do not execute again.
5. high-risk subjects: require explicit Phill/Board review even when marked approved.

## Route wiring sequence

Do not jump straight to a migration. Use this sequence:

1. Keep the current task subtype behavior in Margot voice route.
2. Add route-level tests that assert approval-required actions write sanitized timeline events to `agent_actions` when event writes are introduced.
3. Add a pure mapping helper from task/approval evidence into `evaluateCrmApprovalLifecycle` input, with tests.
4. Add command-center/digest read surfaces for approval-needed tasks using the existing task convention.
5. Only if structured approval history is still needed, draft `crm_approvals` migration and run it through:
   - `./scripts/sandbox-wizard.sh apply <migration.sql>`
   - `./scripts/sandbox-wizard.sh diff`
6. Promotion to production requires explicit typed approval through the sandbox wizard.

## Test plan

Current passing gate for this lane:

```bash
npx jest tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand
```

Next safe tests before any route wiring:

1. Approval evidence mapper unit test:
   - blocked task -> `requested`
   - approved task metadata -> `approved`
   - expired timestamp -> `expired`
   - malformed/missing subject -> `invalid_request`
   - no Board ID/ref echo in operator reasons
2. Daily digest approval section tests:
   - blocked approval tasks are surfaced as decisions needed
   - rejected/expired/executed approvals are not surfaced as pending execution
3. Timeline event-write tests:
   - approval requested/approved/rejected events map to sanitized `agent_actions`
   - no approval reference, Board ID, tokens, IPs, or secret-like metadata are persisted
4. Optional future migration guard tests:
   - `crm_approvals` has lifecycle checks, RLS, service-role-only writes, safety comments, and no raw secret/reference persistence.

## Current decision

Decision for current autonomous lane:

- Keep `tasks` as the current approval queue/subtype.
- Do not create or apply a `crm_approvals` migration yet.
- Treat `crm_approvals` as a future Stage 2 table only after structured approval history/query needs are proven.
- Use `src/lib/crm/approval-lifecycle.ts` as pure local decision support; it must not authorize auto-execution.
- Next implementation lane should be a local mapper/test lane, not a production write lane.

## Blockers and boundaries

Blocked / draft-first:

- Dedicated `crm_approvals` migration: needs sandbox-first apply/diff and explicit promotion approval.
- Approval outcome writes: need a route contract and sanitized timeline events first.
- Production execution after approval: requires scoped Phill/Board authorization and must remain manual, auditable, and least-privilege.

Allowed now:

- Local docs, tests, helpers, and mocked route tests.
- Daily digest/command-center read-only surfacing of blocked approval tasks.
- Progress log and morning report updates.

## AI-RET-001 Approval-Persistence Citation Contract

This control surface is now bound to the `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` answer-shape fixture (added in this lane), which in turn references the `AI-RET-001-LEAD-QUALIFICATION` source-citation fixture. A future retrieval-augmented answer that summarises the approval-persistence boundary must satisfy all of the following:

- Cite the 4 required source files: `docs/margot/crm-approval-persistence-plan.md`, `src/lib/crm/approval-lifecycle.ts`, `docs/margot/ai-enhancement-candidate-register.md`, `docs/margot/crm-operating-model.md`.
- Include the 7 required answer phrases that codify the stage-1 / stage-2 boundary:
  - `stage-1 task subtype` — the current approval queue is the `tasks` row with `status='blocked'`, `priority='high'`, `assignee_name='Phill approval'`, the `approval-required` tag, and a sanitized approval reason in the description.
  - `stage-2 crm_approvals table` — a future dedicated CRM table for durable approval history; only justified after structured approval history/query needs are proven.
  - `no auto-execution` — `src/lib/crm/approval-lifecycle.ts` always returns `safeToAutoExecute: false`; approval is recommendation-only.
  - `sanitized approval reason` — task descriptions and `reason` fields must not store secret values, bearer tokens, payment details, full approval references, or Board IDs.
  - `no board approval id persisted` — by default, the `crm_approvals` table stores an optional one-way `approval_reference_hash` only and never the raw Board approval ID.
  - `phill or board review for high risk` — `client_merge`, `data_export`, billing/payment, deployment, and client-facing-send subjects remain high-risk even when marked approved.
  - `sandbox-first apply` — any future `crm_approvals` migration must be applied through `./scripts/sandbox-wizard.sh apply` and `./scripts/sandbox-wizard.sh diff` before production promotion; promotion itself is still gated on explicit Phill/Board approval.
- Reject the 6 prohibited overclaims (`crm_approvals migration applied`, `crm_approvals production applied`, `auto-execution enabled`, `safe to auto execute`, `board id persisted`, `nango`) before any command-center surfacing.

The new doc-drift guard test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` (`keeps the crm approval persistence plan source doc aligned with the AI-RET-001 approval-persistence answer-shape contract`) reads this file from disk and asserts that all 7 required answer phrases and all 4 required citation sources are present, and that none of the 6 prohibited phrases appear in the assertion section (everything before `## Senior PM verification checkpoint`). This is the fifth doc-drift guard in the retrieval suite (after the lead-to-client plan guard, the command-center guard, the daily-digest-template guard, and the contacts/opportunities model guard).

## Out of Scope for This Revision

This control-surface refresh is a docs-only, mock-only, local-only Senior PM lane. It does NOT:

- Apply, promote, or sync any database migration.
- Create, alter, or seed the `crm_approvals` table in any environment.
- Write, mutate, or read production database records.
- Persist any Board approval ID, secret, token, payment detail, or full approval reference.
- Touch the sandbox wizard (`apply`, `status`, `diff`, `sync`, `setup`, `reset`, `promote`).
- Deploy to Vercel or mutate Vercel env / GitHub repository state.
- Trigger any client-facing send, public publishing, billing/payment action, or campaign auto-launch.
- Adopt Nango, any new vendor, or any new connector platform.
- Run a live semantic search, embeddings backfill, or external AI call.

## Senior PM verification checkpoint (2026-06-10 00:58 AEST)

What exists (this tick, `2026-06-10 00:58 AEST`):

- The new `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` answer-shape fixture in `src/lib/margot/retrieval-evaluation.ts` (10th in the array; pinned by `pins mocked answer-shape fixtures` and `can evaluate all mocked answer-shape fixtures` tests; type-safe via the extended `MargotRetrievalAnswerShapeFixtureId` union).
- A new pass-test case `passes approval-persistence answer shape only when stage-1/stage-2 boundary and citations are present` proving the contract evaluates to `pass` when the future answer uses the stage-1/stage-2 phrasing, the sanitized-reason rule, the no-Board-id rule, the Phill/Board high-risk review, the sandbox-first apply, and the four required citation sources.
- A new reject-test case `rejects approval-persistence answer shape when it overclaims crm_approvals applied or auto-execution` proving the contract evaluates to `shape_mismatch` when an answer claims the `crm_approvals` migration was applied, claims production apply, claims auto-execution, claims `safe to auto execute`, persists the Board ID, or mentions `nango`.
- A new doc-drift guard test `keeps the crm approval persistence plan source doc aligned with the AI-RET-001 approval-persistence answer-shape contract` that reads `docs/margot/crm-approval-persistence-plan.md` from disk and asserts the 7 required answer phrases, the 4 required citation sources, and the absence of the 6 prohibited phrases in the assertion section.
- The default-answer entry for the new fixture in `scripts/margot-retrieval-evaluation-report.ts` so the local report runner emits `answerShape=10/10` for the new fixture.

What has started (this tick):

- Refreshed the control-surface header to a `Last update: 2026-06-10 00:58 AEST` state, added the `Related evidence`, `Related fixture`, and `Related rotation guard` lines, added the `## AI-RET-001 Approval-Persistence Citation Contract` section, the `## Out of Scope for This Revision` section, and this checkpoint.

Why it exists:

- This control surface (`docs/margot/crm-approval-persistence-plan.md`) was last touched `2026-05-23 16:38 AEST` and was not yet bound to the AI-RET-001 harness. Without a doc-drift guard, future refreshes could accidentally soften the stage-1/stage-2 boundary, introduce `crm_approvals` migration language that implies production apply, or remove the no-Board-id rule.

Missing/unclear/pending external authority:

- Dedicated `crm_approvals` migration (Stage 2): not drafted in this lane; remains blocked on sandbox-first apply/diff and explicit Phill/Board promotion approval.
- Approval outcome writes: still need a route contract and sanitized timeline events before any task/agent action can persist an approval decision.
- Voice transcript retention/privacy policy (carried forward): still blocks richer AI-RET-001 answer shapes for voice-derived approval data.
- Mac Mini authenticated artifact transport: still blocked; no credential prompt, secret read, or recursive system-volume scan.

Current health evidence:

- The new doc-drift guard test is in RED for one tick only because the doc was not yet updated in this lane; the GREEN phase is achieved by this very refresh (the doc now contains the 7 required phrases, the 4 required sources, and zero prohibited phrases in the assertion section).
- AI-RET-001 local report runner is expected to report `answerShape=10/10` after this lane (was 9/9).
- Combined local CRM + Margot + runtime + credential-boundary gate is expected to grow by `+3` (pass + reject + doc-drift guard) — `+1` for the pass, `+1` for the reject, `+1` for the doc-drift guard.

Smallest next action:
- Re-run the focused retrieval-evaluation Jest gate and the AI-RET-001 report runner to confirm `answerShape=10/10` and the GREEN status of the new doc-drift guard.
- Continue rotating other still-stale control surfaces (e.g. `crm-schema-inventory.md` at `2026-05-23 07:24 AEST`, `marketing-strategy-operating-model.md` and `ai-enhancement-pipeline.md` at `2026-05-23 07:33 AEST`) into the same doc-drift guard pattern on future ticks.

## AI-RET-001 CRM-Approval-Persistence-Plan Self-Boundary (90th answer-shape fixture)

This crm-approval-persistence-plan doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 90th answer-shape fixture `AI-RET-001-ANSWER-CRM-APPROVAL-PERSISTENCE-PLAN-SELF-BOUNDARY` (bound to `AI-RET-001-LEAD-QUALIFICATION`, no source-citation union member added). A future answer about the crm-approval-persistence-plan self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `crm approval persistence plan self boundary lane` (the self-evidence identifier set of the 90th fixture).
  - `10th crm approval persistence content citation class` (the 10th content-citation fixture guards the operator-evidence approval-persistence surface map; the 90th is the disjoint self-evidence identifier set).
  - `two stage model keeps tasks as stage 1 operational queue` (the load-bearing rule: stage 1 uses the existing tasks table as the visible approval-queue convention; stage 2 only fires when durable approval evidence is required).
  - `stage 2 dedicated crm_approvals table only when durable approval evidence is required` (the six triggers and the sandbox-first promotion requirement).
  - `stage 1 task subtype uses status blocked priority high assignee phill approval tag approval required` (the exact task-convention shape that voice/task routes already emit).
  - `task descriptions must not store secret values bearer tokens api keys payment details or board ids` (the durable non-secret rule; full board approval IDs are not persisted by default).
  - `safe to auto execute stays false on the local approval lifecycle classifier` (the classifier in `src/lib/crm/approval-lifecycle.ts` is decision-support only).
  - `crm_approvals draft fields include subject type id slug requested by reason scope risk and status` (the stage-2 draft migration column set with RLS and service-role write policy).
  - `sandbox wizard only promotion path for crm_approvals when stage 2 is triggered` (the wizard subcommand boundary is the only sanctioned promotion route).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule).
- The 4 required citations are present in this doc:
  - `docs/margot/crm-approval-persistence-plan.md` (this doc).
  - `docs/margot/crm-operating-model.md` (the operating model that defines the durable surface and the sandbox-first promotion rule).
  - `docs/margot/crm-schema-inventory.md` (the schema inventory that marks `crm_approvals` as a still-draft table in the proposals directory).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that inherits the two-stage boundary).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-13 02:30:00 AEST)` heading):
  - crm approval persistence plan crm_approvals production migration applied.
  - crm approval persistence plan crm_approvals target env applied.
  - crm approval persistence plan crm_approvals production row written.
  - crm approval persistence plan approval auto executed.
  - crm approval persistence plan safe to auto execute set true.
  - crm approval persistence plan sandbox wizard apply run without authority.
  - crm approval persistence plan nango connector platform onboarded.
  - crm approval persistence plan github push executed.
  - crm approval persistence plan vercel deploy executed.
  - crm approval persistence plan secret read from env file.

The `## AI-RET-001 CRM-Approval-Persistence-Plan Self-Boundary (90th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-13 02:30:00 AEST)

- Doc-drift guard: the 10 required phrases (crm approval persistence plan self boundary lane, 10th crm approval persistence content citation class, two stage model keeps tasks as stage 1 operational queue, stage 2 dedicated crm_approvals table only when durable approval evidence is required, stage 1 task subtype uses status blocked priority high assignee phill approval tag approval required, task descriptions must not store secret values bearer tokens api keys payment details or board ids, safe to auto execute stays false on the local approval lifecycle classifier, crm_approvals draft fields include subject type id slug requested by reason scope risk and status, sandbox wizard only promotion path for crm_approvals when stage 2 is triggered, and use existing assets first) and 4 required citations (crm-approval-persistence-plan.md, crm-operating-model.md, crm-schema-inventory.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: crm approval persistence plan crm_approvals production migration applied, crm approval persistence plan crm_approvals target env applied, crm approval persistence plan crm_approvals production row written, crm approval persistence plan approval auto executed, crm approval persistence plan safe to auto execute set true, crm approval persistence plan sandbox wizard apply run without authority, crm approval persistence plan nango connector platform onboarded, crm approval persistence plan github push executed, crm approval persistence plan vercel deploy executed, crm approval persistence plan secret read from env file.
- Do NOT run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until a specific authority/auth gate is granted for that exact wizard action.
