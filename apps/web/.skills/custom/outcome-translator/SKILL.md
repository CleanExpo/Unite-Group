---
id: outcome-translator
name: outcome-translator
type: flexible
version: 2.0.0
created: 20/03/2026
modified: 14/08/2026
status: active
triggers:
  - finished
  - ready
  - launch it
  - make it work
  - production ready
  - ready for clients
  - ship it
  - done
  - go live
  - just make it work
  - it's ready
  - we're done
  - release it
description: >-
  Translate founder outcome language into the correct Nexus mission target state,
  proof gap and next executable move without forcing clear execution intent back
  into another planning cycle.
---

# Outcome Translator

> Founders describe outcomes. Nexus owns the technical decomposition required to make those outcomes real.

## Primary rule

Translate the founder's phrase into:
1. intended business/user outcome;
2. target `/spm` lifecycle state;
3. current evidence-backed state;
4. missing proof/blocker;
5. next executable move.

**Do not automatically generate a new gated plan.** First resolve the active mission and current `/spm` state. If a sufficient plan/mission already exists, continue it.

## Intent routing

| Founder phrase | Target behaviour |
|---|---|
| `make it work`, `just fix it` | Continue/enter BUILD or FIX; diagnose root cause, implement, verify |
| `Stop Planning, Build` | Explicit `PLANNED → BUILD_AUTHORISED` transition via `/spm` |
| `ready`, `done`, `complete` | Audit the completion claim against current evidence; report earned state |
| `ship it`, `go live`, `release it` | Resolve `RELEASE_READY`; repair missing gates or route to `/spm ship` if separately authorised |
| `ready for clients` | Verify customer-path/outcome evidence in addition to technical readiness |

Execution language must not be rerouted to generic AUDIT mode merely because this translator activated.

## Founder abstraction boundary

Do not ask Phill to answer technical questions that can be resolved from the estate, such as:
- which files/folders/routes should change;
- whether a new table/API is technically required;
- why CI/build/type/test failed;
- whether the UI renders correctly;
- which dependency/version is compatible;
- how a merge conflict should be repaired.

Resolve these through current code/runtime evidence and specialist agents. Ask the founder only for product/business intent, subjective preference, risk appetite, or consequential authority that cannot be derived technically.

## Evidence states

- **PROVEN** — current evidence exists and was verified.
- **UNKNOWN** — technically verifiable; Nexus should perform the verification.
- **MISSING** — confirmed gap; route repair work.
- **BLOCKED** — real dependency/authority blocker with evidence.

`UNKNOWN` is not a reason to send a manual checklist to the founder when Nexus has the tools to verify it.

## Outcome definitions

### Make it work

Requires:
- root cause understood to an appropriate level;
- smallest complete repair implemented;
- regression coverage appropriate to changed behaviour;
- deterministic checks/build pass;
- applicable integration and visual evidence pass.

### Release ready

Requires the current `/spm` release-ready contract: frozen candidate, required CI, independent review, applicable staging/visual/security/data gates and rollback evidence. Release authority is separate.

### Complete

Requires the intended outcome plus all applicable post-release/customer-path evidence. A PR, merge, deployment, HTTP 200 or green CI alone is not COMPLETE.

## Response shape

Keep translation compact unless a new mission genuinely needs specification:

```text
OUTCOME: [plain-English founder goal]
MISSION: [id/name]
CURRENT STATE: [evidence-backed SPM state]
TARGET STATE: [next meaningful lifecycle state]
PROVEN: [key evidence]
GAPS: [missing/unknown/blocker]
NEXT MOVE: [the action Nexus will perform now]
FOUNDER DECISION: none | [only genuine business/authority decision]
```

After emitting this state, **perform the next safe authorised move**. Do not stop at the translation itself.

## Integration

- Mission lifecycle and mode transitions: `.claude/commands/spm.md`
- Verification ownership/proof language: `.claude/rules/verification-gate.md`
- Completion evidence: `.claude/commands/done.md`
- Execution mode/risk classification: `.claude/rules/cli-control-plane.md`

All referenced controls must exist; a missing cross-reference is a conformance failure, not an assumed capability.
