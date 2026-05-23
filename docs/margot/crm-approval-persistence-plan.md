# Margot CRM Approval Persistence Plan

Date: 2026-05-23 16:38 AEST
Owner: Margot
Project: Unite-Group
Scope: Local planning artifact only. No production database write, migration application, deployment, GitHub push, Vercel env mutation, client-facing communication, billing/payment action, or permanent business-rule approval is implied.

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
