# Execution Mode Transition

> Global rule for moving from planning into execution. Applies across `/spm`, `/build`, `/minion`, orchestrator handoffs, Mission Control and worker dispatch.

## Purpose

Nexus must not confuse **thinking about work** with **performing work**.

The explicit signals below transition an adequately-scoped mission from PLAN into WRITE / EXECUTION mode:

- `/spm build`
- `/build`
- `Stop Planning, Build`
- `Build the approved plan`
- equivalent unambiguous instruction to implement/fix/create/update the current mission

## State invariant

Once a mission reaches `BUILD_AUTHORISED`:

```text
BUILD_AUTHORISED
  -> EXECUTING
  -> LOCALLY_VERIFIED
  -> PR_OPEN
  -> REVIEWING
  -> CI_GREEN
  -> STAGING_VERIFIED
  -> RELEASE_READY
```

The mission may move to `BLOCKED`, `FAILED_RECOVERABLE`, `FAILED_GATED` or `CANCELLED`, but it **must not silently fall back to `PLANNED`** merely because execution encountered friction.

A new planning activity may occur inside the active execution attempt when evidence requires replanning, but the externally visible mission remains an executing/blocked mission until the user cancels it or a material scope change requires renewed authority.

## Execution readiness

Before claiming a worker:

1. verify the selected worker is execution-capable rather than plan/read-only;
2. verify the repository/base and writable isolated worktree;
3. verify required tools/tests/browser harnesses are available;
4. verify relevant source and existing implementation before creating new code;
5. define deterministic and visual verification requirements;
6. identify the exact authority boundary for production/destructive/spend/privilege actions.

If any readiness check fails, emit a specific blocker and evidence. Do not substitute a generic design document for the requested build.

## Clarification boundary

Do not request routine approval again when the user has already issued an explicit build command and the existing mission/plan provides enough information to act safely.

Clarify or stop only when new information materially changes:

- intended business outcome;
- destructive or irreversible scope;
- production/release authority;
- spend;
- credential/privilege/security boundary;
- legal/reputational exposure;
- another constitutional hard gate.

## Momentum rule

After every completed execution step, perform the next safe executable move automatically until:

- the mission reaches `RELEASE_READY`;
- a real stop gate is reached;
- the mission is blocked with evidence;
- the user cancels or materially changes scope.

If one dependency blocks, continue independent safe work that advances the same mission instead of idling the full workstream.

## Completion rule

A build is not complete because a plan exists, code was written, a commit exists, a PR opened, CI passed, or a deployment returned success.

Use the applicable completion chain:

```text
implementation
+ deterministic verification
+ independent review
+ CI
+ browser/visual verification for user-facing work
+ staging/release readiness
+ separately authorised production action
+ post-deploy/customer-path verification
+ evidence/learning recorded
= COMPLETE
```

## Reporting

Prefer concise execution state over planning narration:

```text
state: EXECUTING | BLOCKED | RELEASE_READY | COMPLETE
mission: <id>
evidence: <new receipts>
blocker: <none or exact blocker>
next_move: <next safe executable action>
```
