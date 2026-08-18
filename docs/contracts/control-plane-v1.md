# Control-plane contract v1 — canonical run, lane and tool-event vocabulary

**Ticket:** UNI-2403 (`[MC-P1] Canonical run, lane and tool-event contract — one control-plane source of truth`)
**Parent:** UNI-2246 · **Status of this document:** normative for `control-plane/v1`
**Machine-readable contract:** [`contracts/control-plane/v1.ts`](../../contracts/control-plane/v1.ts)
**Audit:** [`scripts/control-plane-contract.mjs`](../../scripts/control-plane-contract.mjs) · tests in [`scripts/__tests__/control-plane-contract.test.mjs`](../../scripts/__tests__/control-plane-contract.test.mjs)

---

## 1. What this is, and what it deliberately is not

`apps/web`, `apps/workspace` and `apps/autopilot-runner` each ship their own
lifecycle vocabulary. They overlap, disagree on names for the same idea, and in
two cases are hand-copies of each other that nothing keeps in step. That is the
duplicate-control-system problem UNI-2403 exists to close.

This contract closes it by **declaration and audit**, not by rewriting the
running systems:

- it names the nine canonical run states and their legal transitions;
- it maps every shipped state machine onto them, member by member;
- it declares the event envelope every producer must eventually emit;
- and it fails the build the moment a source file and this contract disagree.

It introduces **no queue, no executor, no second state machine, and no schema
change**. Nothing in `contracts/` runs at request time. Guardrail compliance for
UNI-2403 (L1 planning/build only) is therefore structural: there is no code path
here that could apply a migration, deploy, read a secret or write production.

## 2. Identity chain

```
founder request → Linear task → operator job → lane → machine → CLI process → tool call → evidence
```

`ControlPlaneIdentity` carries one field per link. The rule is ordering, not mere
presence: **a link may only be set once its parent is set.** A `laneId` with no
`operatorJobId` above it means work entered the fleet through a second door, so
`findIdentityChainGaps()` reports it as a violation rather than a warning.
`evidenceRefs` hangs off the identity as a whole (test IDs, PR URLs, receipts).

## 3. Canonical run states

Nine states, exactly as specified on the ticket. No producer may invent a tenth;
a source-level tenth is what the audit is built to catch.

| State | Meaning |
| --- | --- |
| `queued` | admitted and waiting; no owner yet |
| `claimed` | an owner holds a lease but work has not begun |
| `running` | work in flight |
| `paused` | suspended by request, resumable in place |
| `blocked` | cannot proceed without an external decision (founder approval, gate, review) |
| `stopping` | termination requested, not yet acknowledged |
| `stopped` | terminated without completing |
| `done` | completed successfully |
| `failed` | terminated by error |

Legal transitions are declared in `LEGAL_TRANSITIONS`. `stopped`, `done` and
`failed` are terminal and have no outgoing edge. `auditTransitions()` proves the
table is closed, self-loop-free, and that every state is reachable from `queued`.

**States that are not run states.** Several shipped members are honestly not
lifecycle positions — a lane catalogue entry, a machine presence signal, a
pre-admission draft. Those map to `null` and **must** carry a reason in
`offRunReasons`. A `null` with no reason fails the audit, so "not a run state"
can never be used as a silent escape hatch.

## 4. Event envelope

Every control-plane event carries `schemaVersion`, `source`, `occurredAt`,
`sequence`, `runId`, `kind` and `message`; `fromState`/`toState` are required on
lifecycle transitions. Without source, timestamp and schema version a replayed
ledger cannot be attributed or migrated, which is the failure this field set
prevents. `findEnvelopeViolations()` returns every reason a value is not a legal
envelope — including an illegal `fromState → toState` pair.

`RunEventKind` is `lifecycle | control | output | tool_call | evidence |
annotation | error`. Each shipped event vocabulary is mapped onto it in
`REGISTERED_EVENT_TYPES`.

## 5. Redaction boundary, stated honestly

The rule is **structural**: a producer must never hand a credential to the event
layer in the first place. `findSecretShapes()` is a deny-list tripwire for
defence in depth — a deny-list cannot prove absence, and this document does not
claim it does.

`ENVELOPE_LEDGER` therefore records what each shipped event shape **actually**
carries today, rather than asserting compliance. As of `control-plane/v1`:

| Shape | `schemaVersion` | `source` | `sequence` | redacts messages |
| --- | --- | --- | --- | --- |
| `OperatorEvent` (`apps/web` operator-gateway) | missing | missing | missing | no |
| `TaskEvent` (`apps/web` command-centre) | missing | `actor` (who, not which surface) | missing | no |
| `LaneRunEvent` (`apps/workspace` lanes) | missing | missing | `sequence` | yes (CLI adapter) |
| `LaneStreamEvent` (`apps/workspace` lanes/event-stream, UNI-2406) | `schemaVersion` | `source` | `sequence` | yes (before the sink) |

That is a debt ledger, and the audit keeps it honest in both directions: a new
event shape with no ledger entry fails, and a ledger entry that claims a field
its interface does not declare also fails.

`LaneStreamEvent` is the first shape to satisfy every field, and it does so by
`extends RunEventEnvelope` rather than re-declaring the seven fields. An
inherited field cannot drift from its base, so this is the shape the other three
should converge on. The audit resolves `extends` across the files it has loaded
(`resolveDeclaredFields`); a base it cannot resolve is reported, never assumed
satisfied — otherwise a typo in an `extends` clause would buy a silent pass.

**Other declared gaps at v1:**

- `claimed` has exactly one producer (`OwnestCompletionPhase`) and `paused` has
  exactly one (`SessionStatus`). Both are single points of truth today.
- `tool_call` and `evidence` have exactly one producer each
  (`LaneStreamEvent`, UNI-2406). The other three shapes still emit neither.
- `apps/web` and `apps/workspace` both export a type named `LaneStatus` with
  entirely different meanings (installation state vs runtime state). v1 records
  the collision rather than renaming either — a rename is a separate change with
  its own blast radius.

## 6. Audit scope — what this proves, and what it does not

The audit reads the files listed in `CONTROL_PLANE_SOURCES`:

```
apps/web/src/lib/operator-gateway/jobs.ts
apps/web/src/lib/operator-gateway/lanes.ts
apps/web/src/lib/operator-gateway/presence.ts
apps/web/src/lib/command-centre/tasks.ts
apps/web/src/lib/command-centre/sessions.ts
apps/web/src/lib/crm/mission-control-execution.ts
apps/workspace/src/server/lanes/types.ts
apps/workspace/src/server/lanes/event-stream.ts
apps/autopilot-runner/src/ownest/types.ts
```

It additionally loads `contracts/control-plane/v1.ts` itself, so a producer that
inherits the canonical envelope can be credited for the fields it inherits.

Within those files it fails on any exported union whose name ends in `Status`,
`State`, `Phase` or `EventType` that is neither registered nor listed in
`AUDIT_EXEMPTIONS` (currently empty).

**It does not sweep the whole monorepo.** `apps/web` alone exports dozens of
unrelated status unions — campaign status, deploy state, approval status — and
pulling them in would make the contract meaningless. Claims from this audit are
bounded to the nine files above. Extending the boundary is a deliberate edit to
`CONTROL_PLANE_SOURCES`, and the audit will immediately demand registrations for
whatever the new file declares.

`apps/autopilot-runner`'s `operator_jobs` worker is permanently retired
(`scripts/operator-jobs-launchd.sh` is a tombstone; `src/index.ts` returns
without claiming work). The runner's live surface is the OWNEST tick, which is
what is registered here.

## 7. How the audit fires

Each check is a pure function over its inputs, so the tests feed it deliberately
broken inputs and assert it reports the violation. Beyond the fixtures, the
audit was run against three mutations of real source files, each of which turned
it red and was then reverted:

1. an unmapped member added to `LaneRunStatus` → `source adds unmapped member(s) sprinting`
2. the hand-copied runner `CcTaskStatus` drifted from `apps/web` `TaskStatus` → `declared duplicates but have drifted apart`
3. a second state machine (`ShadowRunStatus`) added to an audited file → `lifecycle union is neither registered nor exempt`

Run it directly:

```bash
node scripts/control-plane-contract.mjs          # human-readable, exit 1 on violation
node scripts/control-plane-contract.mjs --json   # machine-readable
node --test scripts/__tests__/control-plane-contract.test.mjs
```

It is wired into `npm run verify:readiness`, so it runs on every branch the
readiness gate covers.

## 8. Acceptance criteria (UNI-2403)

| # | Criterion | Where it is satisfied |
| --- | --- | --- |
| 1 | Contract/spec and TypeScript types exist in the canonical monorepo | `contracts/control-plane/v1.ts` + this document |
| 2 | Contract tests prove all current web/workspace/runner producers and consumers agree | `auditRegistry` over all three apps; 37 tests incl. drift, deletion and unmapped-member controls |
| 3 | Duplicate-control-system audit confirms no new queue or state machine was introduced | §6 unregistered-union check; this change adds no runtime, no queue, no executor |
| 4 | Existing jobs/events remain backward compatible | no source file changed; the registry is the compatibility ledger and fails if a member is dropped |

## 9. Changing the contract

Adding a state, an event kind or an envelope field is a **new version**
(`control-plane/v2`), not an edit to v1 — `schemaVersion` on every event exists
so both can coexist during migration. Registering a newly-shipped state machine,
or recording a member that already exists in source, is an in-version edit.
