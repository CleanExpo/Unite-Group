# Nexus Orchestrator v1 — implementation and evidence receipt

Date: 28/07/2026
Branch: `codex/nexus-orchestrator-v1-20260728`
Base: `origin/main` at `0ef5f7d4a`
Scope: local, bounded Mission Control orchestration only

## Implemented

- Reused the existing `apps/workspace` lane orchestrator, supervised CLI
  adapter, Hermes gateway adapter, worktree isolation, run ledger, event ledger
  and lanes dashboard. No parallel executor or second dashboard was created.
- Added an append-only local task queue with `pending`, `running`, `completed`,
  `failed` and `blocked` states.
- Added single-worker dispatch that claims one task and hands execution to the
  existing lane orchestrator.
- Added worker identities for Claude CLI, Codex and the Hermes gateway.
- Added a Mac Mini-over-Tailscale interface that is deliberately disabled and
  labelled `unverified`; no remote command, SSH or Tailscale execution path was
  added.
- Added task-to-run evidence links. Completion requires a durable succeeded
  run, matching start/success lifecycle events and a clean worktree. CLI coding
  tasks also require a new commit; chat-only Hermes tasks omit commit evidence
  when the clean SHA is unchanged.
- Added an authenticated task API, an authenticated dispatch API and queue,
  worker and machine-state summaries in the existing Mission Control lanes
  panel.

## Safety invariants

- Merging this code would arm no remote or production worker.
- Every local execution worker is default-off unless the operator explicitly
  sets `NEXUS_BOUNDED_DISPATCH_ARMED=1`.
- The Mac Mini interface cannot dispatch.
- Queueing requires a fresh, explicit approval in the authenticated UI/API.
  The server creates the fixed low-risk authority envelope; clients cannot
  weaken its prohibited actions or evidence requirements.
- Dispatch requires an existing admitted local worker and an existing lane.
- A durable task worker must still match the lane backend at dispatch time.
- Interrupted `running` tasks become `blocked` on process restart and require
  manual reconciliation.
- Queue ownership uses an atomic lock directory with PID, host, token and inode
  checks. Dead same-host locks are moved to a fixed recovery tombstone so
  concurrent recoverers cannot delete a new owner; crashed recovery tombstones
  and torn final JSONL writes are recovered.
- The private task ledger is mode `0600`; its directory is mode `0700`.
- Task missions are never returned by the API or rendered in the dashboard.
- Dispatch and lane lookup failures use mission-blind public reasons. The lane
  ledger separately redacts the original private task as well as its guardrail
  envelope when worker output echoes it.
- Credential-shaped missions are rejected before the ledger is written.
- Worker output continues through the existing bounded redaction and evidence
  pipeline.
- No database migration, production write, deployment, deletion, merge or
  remote-machine activation is part of this change.

## Verification

Runtime: Node `24.14.1`, the repository-declared minimum.

Focused evidence:

- 7 focused test files passed.
- 69 focused tests passed.
- TypeScript `--noEmit` passed.
- Touched-file ESLint passed after the final import-order check.

Repository-defined workspace gate:

- `npm run verify:workspace`
- TypeScript passed.
- 103 test files passed.
- 784 tests passed.
- Vite client production build passed.
- Vite SSR production build passed.

Warnings observed but not introduced by this scope:

- Vite reports existing large client chunks.
- Vite reports existing ineffective dynamic imports.
- `vite-tsconfig-paths` reports that native Vite path resolution is now
  available.

## Known gaps

1. Mac Mini identity, Tailscale transport, remote process ownership, stop
   acknowledgement and reboot recovery are not implemented or verified.
2. The queue is host-local JSONL. Multi-host claims, leases and replay-safe
   remote recovery remain a later governed slice.
3. The dispatcher processes one explicitly selected worker per request. There
   is no autonomous scheduler.
4. Existing run events record lifecycle outcomes; live stdout/stderr streaming
   and a unified evidence timeline remain later Mission Control slices.
5. No three-machine failure drills or seven-day soak evidence exist.
6. Independent reviews of the first two implementation SHAs failed closed. The
   second review found gateway evidence, lock ownership and successful-output
   privacy defects; those are repaired in the current working tree. The new
   exact SHA still requires independent review.

## Exact next steps

1. Independently review the final local commit SHA and rerun the same workspace
   gate against that exact SHA.
2. If the review passes, open one PR to `main` under the repository release gate;
   do not activate any worker as part of the merge.
3. Run five clean hand-triggered queue/dispatch exercises with synthetic,
   non-production tasks and retain their task/run/event receipts.
4. Specify the Mac Mini broker contract: canonical machine identity, signed
   admission, Tailscale reachability, process-tree ownership, stop
   acknowledgement, lease expiry and reboot reconciliation.
5. Implement remote dispatch only as a separately reviewed dormant slice.
6. Complete three-machine failure drills and the seven-day soak before any
   production or L3 capability is considered.
