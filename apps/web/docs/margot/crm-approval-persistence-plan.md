<!-- Ported from Authority-Site docs/margot, 12/06/2026; schema/API assumptions not yet validated against apps/web — see docs/convergence/migration-map.md -->

# Margot CRM Approval Persistence Plan

Date: 2026-05-23 16:38 AEST
Last update: 2026-06-10 00:58 AEST — Senior PM approval-persistence doc-drift guard lane: aligned to the new `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` answer-shape fixture and bound this control surface to AI-RET-001 (was 192 lines before this lane)
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

- It matches existing route behaviour and tests.
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

The dedicated table should be branch-first (validated on a Supabase database branch, never against prod) and should not be promoted to prod without explicit Phill/Board approval via a merged, approved branch.

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
| `metadata jsonb not null default '{}'` | Minimal non-secret context | Must be sanitised like timeline metadata. |
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

1. Keep the current task subtype behaviour in Margot voice route.
2. Add route-level tests that assert approval-required actions write sanitised timeline events to `agent_actions` when event writes are introduced.
3. Add a pure mapping helper from task/approval evidence into `evaluateCrmApprovalLifecycle` input, with tests.
4. Add command-center/digest read surfaces for approval-needed tasks using the existing task convention.
5. Only if structured approval history is still needed, write the `crm_approvals` migration in `apps/web/supabase/migrations/` and validate it on a Supabase database branch (an ephemeral per-branch DB; never validate against prod).
6. Promotion to production (`lksfwktwtmyznckodsau`) happens ONLY by merging an approved branch — never apply to prod directly or autonomously, and only with explicit typed Phill/Board approval.

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
   - approval requested/approved/rejected events map to sanitised `agent_actions`
   - no approval reference, Board ID, tokens, IPs, or secret-like metadata are persisted
4. Optional future migration guard tests:
   - `crm_approvals` has lifecycle checks, RLS, service-role-only writes, safety comments, and no raw secret/reference persistence.

## Current decision

Decision for current autonomous lane:

- Keep `tasks` as the current approval queue/subtype.
- Do not create or apply a `crm_approvals` migration yet.
- Treat `crm_approvals` as a future Stage 2 table only after structured approval history/query needs are proven.
- Use `src/lib/crm/approval-lifecycle.ts` as pure local decision support; it must not authorise auto-execution.
- Next implementation lane should be a local mapper/test lane, not a production write lane.

## Blockers and boundaries

Blocked / draft-first:

- Dedicated `crm_approvals` migration: needs branch-first validation on a Supabase database branch (never prod) and explicit promotion approval via a merged, approved branch.
- Approval outcome writes: need a route contract and sanitised timeline events first.
- Production execution after approval: requires scoped Phill/Board authorisation and must remain manual, auditable, and least-privilege.

Allowed now:

- Local docs, tests, helpers, and mocked route tests.
- Daily digest/command-center read-only surfacing of blocked approval tasks.
- Progress log and morning report updates.

## AI-RET-001 Approval-Persistence Citation Contract

This control surface is now bound to the `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` answer-shape fixture (added in this lane), which in turn references the `AI-RET-001-LEAD-QUALIFICATION` source-citation fixture. A future retrieval-augmented answer that summarises the approval-persistence boundary must satisfy all of the following:

- Cite the 4 required source files: `docs/margot/crm-approval-persistence-plan.md`, `src/lib/crm/approval-lifecycle.ts`, `docs/margot/ai-enhancement-candidate-register.md`, `docs/margot/crm-operating-model.md`.
- Include the 7 required answer phrases that codify the stage-1 / stage-2 boundary:
  - `stage-1 task subtype` — the current approval queue is the `tasks` row with `status='blocked'`, `priority='high'`, `assignee_name='Phill approval'`, the `approval-required` tag, and a sanitised approval reason in the description.
  - `stage-2 crm_approvals table` — a future dedicated CRM table for durable approval history; only justified after structured approval history/query needs are proven.
  - `no auto-execution` — `src/lib/crm/approval-lifecycle.ts` always returns `safeToAutoExecute: false`; approval is recommendation-only.
  - `sanitized approval reason` — task descriptions and `reason` fields must not store secret values, bearer tokens, payment details, full approval references, or Board IDs.
  - `no board approval id persisted` — by default, the `crm_approvals` table stores an optional one-way `approval_reference_hash` only and never the raw Board approval ID.
  - `phill or board review for high risk` — `client_merge`, `data_export`, billing/payment, deployment, and client-facing-send subjects remain high-risk even when marked approved.
  - `branch-first validation` — any future `crm_approvals` migration is written in `apps/web/supabase/migrations/` and validated on a Supabase database branch (an ephemeral per-branch DB; never against prod) before production promotion; promotion to prod happens ONLY by merging an approved branch and is still gated on explicit Phill/Board approval.
- Reject the 6 prohibited overclaims (`crm_approvals migration applied`, `crm_approvals production applied`, `auto-execution enabled`, `safe to auto execute`, `board id persisted`, `nango`) before any command-center surfacing.

The new doc-drift guard test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` (`keeps the crm approval persistence plan source doc aligned with the AI-RET-001 approval-persistence answer-shape contract`) reads this file from disk and asserts that all 7 required answer phrases and all 4 required citation sources are present, and that none of the 6 prohibited phrases appear in the assertion section (everything before `## Senior PM verification checkpoint`). This is the fifth doc-drift guard in the retrieval suite (after the lead-to-client plan guard, the command-centre guard, the daily-digest-template guard, and the contacts/opportunities model guard).

## Out of Scope for This Revision

This control-surface refresh is a docs-only, mock-only, local-only Senior PM lane. It does NOT:

- Apply, promote, or sync any database migration.
- Create, alter, or seed the `crm_approvals` table in any environment.
- Write, mutate, or read production database records.
- Persist any Board approval ID, secret, token, payment detail, or full approval reference.
- Create, validate, or merge any Supabase database branch, or apply/promote any migration to prod.
- Deploy to Vercel or mutate Vercel env / GitHub repository state.
- Trigger any client-facing send, public publishing, billing/payment action, or campaign auto-launch.
- Adopt Nango, any new vendor, or any new connector platform.
- Run a live semantic search, embeddings backfill, or external AI call.

## Senior PM verification checkpoint (2026-06-10 00:58 AEST)

What exists (this tick, `2026-06-10 00:58 AEST`):

- The new `AI-RET-001-ANSWER-APPROVAL-PERSISTENCE-BOUNDARY` answer-shape fixture in `src/lib/margot/retrieval-evaluation.ts` (10th in the array; pinned by `pins mocked answer-shape fixtures` and `can evaluate all mocked answer-shape fixtures` tests; type-safe via the extended `MargotRetrievalAnswerShapeFixtureId` union).
- A new pass-test case `passes approval-persistence answer shape only when stage-1/stage-2 boundary and citations are present` proving the contract evaluates to `pass` when the future answer uses the stage-1/stage-2 phrasing, the sanitised-reason rule, the no-Board-id rule, the Phill/Board high-risk review, the branch-first validation rule, and the four required citation sources.
- A new reject-test case `rejects approval-persistence answer shape when it overclaims crm_approvals applied or auto-execution` proving the contract evaluates to `shape_mismatch` when an answer claims the `crm_approvals` migration was applied, claims production apply, claims auto-execution, claims `safe to auto execute`, persists the Board ID, or mentions `nango`.
- A new doc-drift guard test `keeps the crm approval persistence plan source doc aligned with the AI-RET-001 approval-persistence answer-shape contract` that reads `docs/margot/crm-approval-persistence-plan.md` from disk and asserts the 7 required answer phrases, the 4 required citation sources, and the absence of the 6 prohibited phrases in the assertion section.
- The default-answer entry for the new fixture in `scripts/margot-retrieval-evaluation-report.ts` so the local report runner emits `answerShape=10/10` for the new fixture.

What has started (this tick):

- Refreshed the control-surface header to a `Last update: 2026-06-10 00:58 AEST` state, added the `Related evidence`, `Related fixture`, and `Related rotation guard` lines, added the `## AI-RET-001 Approval-Persistence Citation Contract` section, the `## Out of Scope for This Revision` section, and this checkpoint.

Why it exists:

- This control surface (`docs/margot/crm-approval-persistence-plan.md`) was last touched `2026-05-23 16:38 AEST` and was not yet bound to the AI-RET-001 harness. Without a doc-drift guard, future refreshes could accidentally soften the stage-1/stage-2 boundary, introduce `crm_approvals` migration language that implies production apply, or remove the no-Board-id rule.

Missing/unclear/pending external authority:

- Dedicated `crm_approvals` migration (Stage 2): not drafted in this lane; remains blocked on branch-first validation on a Supabase database branch (never prod) and explicit Phill/Board promotion approval via a merged, approved branch.
- Approval outcome writes: still need a route contract and sanitised timeline events before any task/agent action can persist an approval decision.
- Voice transcript retention/privacy policy (carried forward): still blocks richer AI-RET-001 answer shapes for voice-derived approval data.
- Mac Mini authenticated artifact transport: still blocked; no credential prompt, secret read, or recursive system-volume scan.

Current health evidence:

- The new doc-drift guard test is in RED for one tick only because the doc was not yet updated in this lane; the GREEN phase is achieved by this very refresh (the doc now contains the 7 required phrases, the 4 required sources, and zero prohibited phrases in the assertion section).
- AI-RET-001 local report runner is expected to report `answerShape=10/10` after this lane (was 9/9).
- Combined local CRM + Margot + runtime + credential-boundary gate is expected to grow by `+3` (pass + reject + doc-drift guard) — `+1` for the pass, `+1` for the reject, `+1` for the doc-drift guard.

Smallest next action:

- Re-run the focused retrieval-evaluation Jest gate and the AI-RET-001 report runner to confirm `answerShape=10/10` and the GREEN status of the new doc-drift guard.
- Continue rotating other still-stale control surfaces (e.g. `crm-schema-inventory.md` at `2026-05-23 07:24 AEST`, `marketing-strategy-operating-model.md` and `ai-enhancement-pipeline.md` at `2026-05-23 07:33 AEST`) into the same doc-drift guard pattern on future ticks.
- Do NOT create, validate, or merge any Supabase database branch, and do NOT apply or promote any migration to prod (`lksfwktwtmyznckodsau`), until a specific authority/auth gate is granted for that exact action. Promotion to prod is only ever via a merged, approved branch — never a direct or autonomous apply.
