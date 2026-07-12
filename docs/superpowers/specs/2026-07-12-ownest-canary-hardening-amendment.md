# OWNEST One-Canary Hardening Amendment

**Date:** 2026-07-12
**Status:** Historical canary contract; live execution is now blocked by the
superseding dedicated-UID and independent-verifier requirements
**Applies to:** `2026-07-12-crm-hermes-ownership-control-plane-design.md`

> **Superseding security boundary:** This amendment still defines the desired
> one-task semantics, but it is not activation authority. The user-level
> LaunchAgent is retired, `CC_OWNEST_LIVE=1` is rejected by current production
> configuration, and the default independent verifier rejects completion. A new
> reviewed runtime design must satisfy the isolation and verification controls
> in the current OWNEST runbook before this canary contract can be reconsidered.
> The current build emits only the container refusal tombstone; there is no
> OWNEST command or host artifact. The retired sanitizer's historic same-UID
> plaintext rollback copies also require founder-authorised credential migration
> before any credential-bearing autonomy can be reconsidered.

## Historical decision

The historical contract proposed one explicitly nominated, low-risk advisory
CRM task on one isolated host, pinned to profile `ownest` and board
`unite-group-ownest`. It did not authorise a general queue worker or always-on rollout.

Proposed runtime controls, retained as design evidence only:

- `CC_OWNEST_LIVE=1` only for the bounded canary window;
- a required, persistent `CC_OWNEST_ROLLOUT_ID`;
- a required `CC_OWNEST_CANARY_TASK_ID`;
- rollout limit, daily admission limit, per-tick limit, and concurrency all set to `1`;
- a dedicated, explicitly pinned Hermes board;
- the default Hermes profile remains on its fast Codex model;
- only the dedicated `ownest` profile may use bounded MoA; the default and Empire profiles retain their existing Codex models.

If the nominated task is absent or ineligible, the tick returns without selecting another task.

## CRM authority and claim protocol

CRM must own the claim before Hermes can start:

1. Read the nominated task through a founder-scoped query.
2. Re-evaluate policy and compute a SHA-256 digest over the authoritative mission fields.
3. Compare-and-set `queued` to `running` using task ID, founder ID, expected status, and exact `updated_at`.
4. Persist the attempt, rollout, digest, lease, admission time, and a null Hermes mirror ID in `metadata.ownest`.
5. Create the Hermes mission idempotently from that persisted attempt.
6. Compare-and-set the returned Hermes ID and dispatch time into CRM using the new `updated_at` token.

A crash after the CRM claim recovers the same attempt and idempotency key. It never admits a second task. Claimed tasks with a null Hermes ID are part of the managed-task read.

All metadata writes preserve unrelated metadata keys. A zero-row compare-and-set is contention, not mission failure; the worker re-reads instead of overwriting fresher CRM state.

## Persistent quotas

The canary guarantee is an at-most-one admission for the lifetime of the rollout:

- the rollout ID is persisted on the CRM claim;
- the nominated task ID is fixed in configuration;
- the rollout quota counts CRM claims, including a claim that crashes before Hermes creation;
- the UTC daily quota counts the half-open interval from `00:00:00Z` to the next midnight;
- restarting the process or changing worker identity does not reset either quota.

The historical host-lock proposal prevented local overlap but was never a
security or correctness boundary. No host worker is currently emitted; any
future distributed correctness boundary remains CRM compare-and-set.

## Completion receipt

Hermes `done` is not sufficient. The closing Hermes run must contain:

- a non-empty bounded summary;
- `outcome = completed`, a terminal timestamp, and no run error;
- a machine-readable `ownest.completion.v1` receipt in run metadata;
- matching CRM task ID, Hermes task ID, attempt ID, rollout ID, and mission digest;
- exactly one passing result for every dispatched validation requirement;
- one or more durable evidence references, with valid digests and no credentials or ephemeral file paths.

The worker copies the trusted mission identifiers and requirement digests supplied in the mission envelope. It does not invent or recompute authority. The adapter derives the evidence URI from the pinned board, task ID, and closing run ID:

```text
hermes-kanban:/boards/<board>/tasks/<task-id>/runs/<run-id>
```

Scratch paths are never durable evidence because Hermes may delete the scratch workspace immediately after completion.

Completion repair is ordered and idempotent:

1. validate the receipt;
2. ensure deterministic validation rows;
3. ensure deterministic evidence;
4. ensure the evidence event;
5. ensure the completion event;
6. compare-and-set CRM to `done`.

Audit and evidence identifiers are deterministic UUIDs derived from the founder/task/attempt/rollout/kind tuple. Duplicate inserts are verified against the existing founder-owned row; conflicting content is an integrity failure.

## Failure and retry policy

- Consecutive transient failures use bounded backoff and reset after a successful reconciliation.
- The third consecutive transient failure dead-letters the task.
- Authentication, policy, schema, ownership, digest, malformed-receipt, and deterministic-ID conflicts fail closed immediately.
- Hermes `archived` is a terminal failure and can never become CRM `done`.
- CRM write or audit failures stop further dispatch for that tick; they are not counted as Hermes execution failures.
- Already reconciled dead letters do not emit repeated events each minute.

Only genuine consequential-action, risk, or explicit-approval gates enter `awaiting_approval`. Owner mismatch is ignored; unresolved dependencies defer; unsupported modes and infrastructure failures remain system-owned blockers so the worker does not manufacture founder work.

## Cancellation and stop

Before every Hermes operation, recompute the mission digest and confirm the CRM row is still authoritative. A changed objective, title, owner, risk, mode, dependencies, approval state, validation requirements, cancellation marker, or status revokes the old projection.

The in-flight stop path uses fixed arguments on the pinned board to reclaim the active Hermes task, verifies termination, removes its assignee to prevent redispatch, and archives the projection. An unconfirmed local or remote worker termination is a dead letter and is never automatically recreated.

In the historical contract, `CC_OWNEST_LIVE=0` was an admission kill switch, not
an in-flight stop. The current package has no service-manager or worker surface;
exact `1` is rejected and the wrappers refuse execution.

## Promotion gate

Always-on launchd execution, automatic general-queue selection, cross-host operation, concurrency above one, non-advisory work, and production/spend/credential/outbound/merge/deploy actions remain out of scope until all of these are proven:

- one CRM claim maps to one Hermes task;
- the receipt and validation rows verify;
- evidence exists before CRM completion;
- cancellation terminates the projection;
- deterministic audit repair survives a forced partial write;
- the rollback drill restores the hardened pre-MoA snapshot;
- the default Hermes model never changes;
- gateway and scheduled bridge health stay green.

Global atomic quota/concurrency and transactional multi-table completion require a future narrow database RPC and unique constraints. They are not claimed by this single-host canary.
