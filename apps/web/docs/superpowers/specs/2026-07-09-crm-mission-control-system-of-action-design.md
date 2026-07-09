# CRM Mission Control — System-of-Action (UNI-2234 correction)

**Date:** 09/07/2026 · **Owner:** Phill (founder direction) · **Status:** design, build in slices
**Ticket:** UNI-2234 · **Branch:** `phillmcgurk/uni-2234-crm-mission-control-consumer`

## 1. Founder direction (verbatim intent)

Mission Control must become the CRM **system-of-action**, not a record-only dashboard. Build
the real approval-processing consumer that (1) lives behind CRM Mission Control, (2) calls
`evaluateCrmApprovalLifecycle`, (3) respects `CRM_AUTO_EXECUTE` as the kill switch, (4) executes
only through a backend route/worker (never UI code), (5) uses write-then-confirm journaling,
(6) writes all results to the evidence ledger, (7) surfaces `queued / approved / executing /
executed / failed / needs-review` states inside Mission Control.

This supersedes the earlier "defer — no consumer exists" deferral. The consumer named is real.

## 2. What already exists (first-source, verified 09/07/2026)

| Capability | Where | Reuse |
|---|---|---|
| Auto-execution risk matrix + kill switch | `src/lib/crm/auto-exec-matrix.ts` (`evaluateAutoExecute`, `CRM_AUTO_EXECUTE === '1'`) | admission gate |
| Decision-gated wrapper + lifecycle | `src/lib/crm/approval-lifecycle.ts` (`evaluateCrmApprovalLifecycle`, `evaluateDecisionGatedAutoExecute`, `safeToAutoExecute`) | admission gate |
| Job state machine + event timeline | `src/lib/operator-gateway/jobs.ts` (`operator_jobs`/`operator_events`, `OperatorJobStatus`, `canTransition`, `ALLOWED_TRANSITIONS`) | **state + event backbone** |
| Safety invariants (dormant execution) | `jobs.ts` — `api_key_requested:false`, `HARD_GATED_TASK_TYPES`, `externalActionRequested`/`productionActionRequested` default false = "a separate Board gate" (`jobs.ts:127`); `dryRun*` / `requestControlledLocalOperatorExecution` "foundation_ready, dispatchPerformed:false" pattern | dispatch-disabled pattern |
| Lane registry (code, not schema) | `src/lib/operator-gateway/lanes.ts` (`OPERATOR_LANES`) — **no CRM lane yet** | add a CRM lane in code |
| Evidence ledger (write) | `src/lib/obsidian/evidence.ts` (`insertEvidenceLedgerRow`, `withTimeout`), migration `20260709010000_evidence_ledger.sql`; `journalAutoExecution` in `auto-exec-matrix.ts` | write-then-confirm journal |
| Mission Control surface | `src/app/(founder)/founder/command-centre/page.tsx` — approval-gated Pipeline + "Task queue / approvals" deck (UNI-2339) | 6-state UI |

**Decision: reuse the operator-gateway backbone; do not invent a parallel executor.** (NorthStar
No-Invaders #4 — no duplicate systems.) CRM approvals become operator jobs of a new CRM lane,
admitted by the CRM lifecycle gate, surfaced in the command-centre deck.

## 3. State model

Founder's 6 states map onto the existing `OperatorJobStatus` machine (no new enum needed):

| Mission Control state | operator_jobs status | Meaning |
|---|---|---|
| queued | `queued` | admitted to the execution queue |
| approved | (admission event) | `evaluateCrmApprovalLifecycle` = `may_execute` **and** `safeToAutoExecute` |
| executing | `running` | worker has begun (dispatch-gated) |
| executed | `done` | mutation confirmed (write-then-confirm) |
| failed | `failed` | dispatch or confirm failed |
| needs-review | `blocked` | lifecycle says stop, or safe=false with a reviewable reason |

`canTransition` already enforces the legal edges. "approved" is a lifecycle fact recorded as an
`operator_events` row, not a distinct job status.

## 4. Admission + execution flow

```
CRM approval (task evidence)
  → evaluateCrmApprovalLifecycle(input)        # decision + safeToAutoExecute + autoExecuteReason
  → CRM_AUTO_EXECUTE kill switch               # unset ⇒ safe:false ⇒ needs-review/queued only
  → admit as operator_job (CRM lane)           # queued; event 'created'
  → [Board-gated] worker dispatch              # productionActionRequested — OFF until go-live
       running → execute() → confirm           # write-then-confirm
       → journal evidence_ledger (bounded)     # withTimeout, best-effort
       → done | failed | blocked(needs-review)
```

Write-then-confirm (not raced): the worker performs the mutation, **reads back** the committed
state, and only then journals `executed`. A JS timeout cannot cancel a side effect, so the
timeout bounds the *wait*, and the confirm read is the source of truth for the journal — never
journal success on a race win.

## 5. Locked gates (cannot be crossed autonomously)

1. **Schema** — any migration validated on a **Supabase database branch**, never prod, never
   autonomous (`CLAUDE.md` hard rule; `jobs.ts` header). Slices 1–3 need **no** migration
   (operator_jobs + evidence_ledger already exist; CRM lane is a code constant).
2. **Live dispatch** of a real CRM mutation = `productionActionRequested:true` → **Board gate**
   + founder go-live (`jobs.ts:127`). Kept OFF; the consumer ships dispatch-disabled.
3. **Autonomy ladder** — `lead_conversion` L1 (proving window) only; `opportunity_commitment`
   L2 deferred (`AUTO_EXEC_CONFIG.l2_enabled:false`); `client_merge`/`data_export` L3 never.

## 6. Slice plan (each independently verifiable; behind the kill switch)

- **Slice 1 — consumer core (no schema, dispatch OFF).** `src/lib/crm/mission-control-execution.ts`:
  given a lifecycle evaluation + signals, admit/deny, compute target state, plan write-then-confirm
  journal; `dispatchPerformed:false`. Pure/DI. Vitest TDD. *Behaviour-neutral.*
- **Slice 2 — backend route.** `app/api/command-centre/crm/approvals/[id]/process/route.ts`:
  auth-gated, founder-scoped; runs Slice 1; writes the operator_job + event via the founder client;
  returns the 6-state status. No live mutation dispatched (Board gate). Route tests.
- **Slice 3 — Mission Control surface.** Render the 6 states in the command-centre approvals deck
  (read-only view over operator_jobs filtered to the CRM lane) + a "Process" action that calls
  Slice 2. Component/source tests.
- **Slice 4 — Board-gated activation (separate, not autonomous).** Real `execute()` per subject
  type + `productionActionRequested` flip + `CRM_AUTO_EXECUTE=1` at go-live. Requires Board sign-off,
  Supabase-branch validation of any new columns, and the autonomy-ladder gate. **Not built here.**

## 7. Success criteria

- Slices 1–3 merge behind `CRM_AUTO_EXECUTE` unset with **zero prod behaviour change** (no mutation
  dispatched; matrix stays inert).
- `evaluateCrmApprovalLifecycle` is the sole admission gate; no UI-side mutation path exists.
- Every processed approval produces an operator_job + event + (on execute) an evidence_ledger row.
- Type-check + vitest green each slice; live dispatch remains Board-gated until Slice 4.
