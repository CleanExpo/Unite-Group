---
name: go-live-arming
description: The executable go-live procedure for CRM Mission Control auto-execution — the CRM_AUTO_EXECUTE (admission) and CRM_DISPATCH_ARMED (dispatch) gates, the L0–L3 autonomy ladder, and the founder/Board arming checklist. Use whenever touching the CRM approval-processing route, the auto-exec matrix or executor, or when asked to arm, enable, dispatch, or go live with autonomous CRM execution — or to confirm a change is still dormant.
---

# Go-live arming (CRM Mission Control)

The CRM system-of-action can convert a lead, commit an opportunity, merge a
client. Every one of those is a real prod mutation, so the whole path ships
**dormant** and is armed by an explicit, ordered, Board-gated procedure — never
as a side effect of a merge. This skill is that procedure and the gates it
flips. Arming is never autonomous: if a task would flip either flag, stop and
escalate to the Board.

## The doubly-inert stack (three independent layers)

A CRM approval only causes a mutation when **all three** are satisfied. Any one
unset ⇒ no mutation, no schema, no prod change.

1. **Admission gate — `CRM_AUTO_EXECUTE`** (master kill switch).
   `apps/web/src/lib/crm/auto-exec-matrix.ts` `evaluateAutoExecute()`. Unset or
   anything but the literal `'1'` ⇒ every evaluation returns
   `{ safe: false, reason: 'kill_switch_off' }`. This is the prod default.
2. **Dispatch gate — `CRM_DISPATCH_ARMED`** (the Board go-live flip).
   `apps/web/src/lib/crm/crm-auto-executor.ts` `isCrmDispatchArmed()`. Unset or
   ≠ `'1'` ⇒ no dispatch, even for an admitted approval. The route runs the
   executor only behind `admitted && armed`.
3. **Executor registry — `resolveSubjectExecutor()`** (same file). Returns
   `null` for every subject except `lead_conversion` (and only when a founder
   context is passed). A null executor is safe: `runCrmAutoExecution` never
   mutates and returns `{ state: 'needs_review', reason: 'no_executor' }`. So
   even fully armed, L2/L3 have no executor to run.

Admission itself (`mission-control-execution.ts` `resolveCrmAdmission`) is
exactly `evaluation.safeToAutoExecute` = decision-gate said `may_execute` AND
the matrix said safe AND `CRM_AUTO_EXECUTE` is on. `dispatchEnabled` is always
false today.

## The autonomy ladder (auto-exec-matrix.ts)

| Tier | Subject | Enabled | Safe-to-auto condition |
|---|---|---|---|
| **L1** | `lead_conversion` | **yes** | `confidence ≥ 0.8` **AND** no existing client link |
| **L2** | `opportunity_commitment` | **no** (`l2_enabled: false`) | value ≤ 500 AUD **AND** forward-only stage move |
| **L3** | `client_merge`, `data_export` | never | `high_risk_never_auto` |
| **L0** | `other` | never | advise only |

Thresholds are code constants in `AUTO_EXEC_CONFIG` (not env-driven):
`l1_confidence_threshold: 0.8`, `l2_max_value: 500`, `l2_enabled: false`
(deactivated for the 2-week L1 proving window). A required signal that is
missing or the wrong type degrades to `{ safe: false, reason:
'signal_unavailable' }` — never guess (NorthStar honest sources). L1
(`lead_conversion`) is the only tier with a real executor.

## The arming checklist (Board sign-off required — never autonomous)

Steps 1–2 are code+DB work; steps 3–4 are the Board/founder flip. Order matters.

1. **L1 executor** — `resolveSubjectExecutor('lead_conversion')` performs the
   real mutation write-then-confirm (perform → read back committed state →
   resolve; throw if unconfirmed). *Done (PR #736, merged to `main`).*
2. **Persist admitted approvals** as `operator_jobs` (CRM lane) via a production
   operator_jobs write client. Any schema is validated on a **Supabase database
   branch**, never prod-direct. *Done — CRM rows persist `status:'blocked'` so
   the Mac autopilot poller (claims `planned`/`queued`) can never claim them;
   CRM execution stays the route's own synchronous, Board-gated concern.*
3. **Board gate** — set `productionActionRequested` semantics true for the CRM
   lane (`jobs.ts:127`). *Remains Board.*
4. **Founder go-live** — set **`CRM_DISPATCH_ARMED=1` first, then
   `CRM_AUTO_EXECUTE=1`** (in that order), `lead_conversion` L1 only, for the
   2-week proving window. L2/L3 stay off per the ladder. *Remains founder.*

Arming in the wrong order (kill switch on before dispatch armed) briefly admits
approvals with no dispatch — harmless but not the approved sequence. Follow the
order.

## Invariants that must survive any change here

- **Merging arms nothing.** The standard every PR touching this path must meet:
  doubly inert (flag off AND null executors) ⇒ provably zero prod behaviour
  change. If a diff could cause a mutation with both flags unset, it is wrong.
- **Write-then-confirm.** `runCrmAutoExecution` treats a resolved executor as
  committed-and-confirmed and journals `executed`; any throw/timeout →
  `failed`, never a false `executed`. The evidence-ledger write
  (`journalAutoExecution`) is best-effort and never blocks execution.
- **Never flip a flag as a merge side effect.** `CRM_AUTO_EXECUTE` and
  `CRM_DISPATCH_ARMED` are per-environment operational flags flipped only at the
  documented go-live, by the founder, after Board sign-off. No code path, no
  cron, no agent sets them.
- **Migrations are founder-gated + branch-validated.** Any schema the CRM lane
  needs ships as a separate migration validated on a Supabase database branch
  (prod CRM ref `lksfwktwtmyznckodsau`, verify read-only first per
  `supabase-schema-gate`) and promoted by merging an approved branch — never
  applied to prod directly.

Full design + slice history: `apps/web/docs/superpowers/specs/2026-07-09-crm-mission-control-system-of-action-design.md` (Slice 4).
