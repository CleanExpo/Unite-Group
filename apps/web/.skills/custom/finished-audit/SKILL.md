---
id: finished-audit
name: finished-audit
type: Capability Uplift
version: 2.0.0
created: 20/03/2026
modified: 14/08/2026
status: active
triggers:
  - are we done
  - is this finished
  - audit completion
  - verify done
  - check if complete
  - is it ready
  - can we ship
  - can we close this
description: >-
  Evidence-only completion audit. Determines the strongest lifecycle state
  actually proven; never grants merge/deploy/business authority.
---

# Finished Audit

## Purpose

Test a completion/readiness claim against current evidence. No vague summaries, optimistic assumptions or authority inflation.

## Evidence classes

For every required criterion classify:
- **PROVEN** — current, specific evidence was independently checked;
- **CLAIMED** — somebody says it passed but the evidence was not verified;
- **UNKNOWN** — technically verifiable but not yet checked;
- **MISSING** — confirmed absent/broken;
- **NOT_APPLICABLE** — explicitly inapplicable with recorded reason.

Structural existence is not automatically behavioural proof: a route/test/schema/document file existing proves only that the file exists unless the criterion specifically asks for existence.

## Procedure

1. Resolve the active `/spm` mission and candidate SHA/environment.
2. Load the applicable completion contract / Definition of Done.
3. Verify each proof artefact against the exact candidate/environment.
4. Reject stale, adjacent, synthetic or merely claimed evidence.
5. Calculate whether every applicable criterion is PROVEN/NOT_APPLICABLE.
6. Report the **earned lifecycle state** and any remaining evidence/authority gates.

UNKNOWN technical evidence should be verified by Nexus, not assigned to the founder as routine QA.

## Output — incomplete

```text
FINISHED AUDIT
mission: [id]
candidate: [SHA/PR/environment]
criteria proven: [n]/[n]

EARNED STATE: [IMPLEMENTED | LOCALLY_VERIFIED | PR_OPEN | CI_GREEN | STAGING_VERIFIED | RELEASE_READY | POST_DEPLOY_VERIFIED | BLOCKED]
STATUS: NOT COMPLETE

BLOCKERS / MISSING PROOF
1. [criterion] — [CLAIMED|UNKNOWN|MISSING] — next technical action: [...]

AUTHORITY REMAINING
none | [merge/release/business/other authority that has not been granted]

NEXT EXECUTABLE MOVE
[technical action or genuine decision packet]
```

## Output — all completion criteria proven

```text
FINISHED AUDIT
mission: [id]
candidate: [SHA/environment]
criteria proven: 100%

EARNED STATE: COMPLETE
STATUS: COMPLETION PROVEN

PROOF
- [criterion] — [evidence ref]
...

AUTHORITY CLAIMED BY THIS AUDIT: NONE
```

If all pre-release criteria are proven but production/outcome evidence is not applicable yet, return `RELEASE_READY`, not `COMPLETE`.

## Authority boundary

This skill **never outputs “APPROVED FOR merge/deploy/ship”** merely because evidence passed.

Verification authority and execution authority are separate:
- this skill proves evidence/state;
- `/spm` and the canonical authority/release contract decide whether the next consequential transition is authorised;
- green CI or `RELEASE_READY` is not itself a merge/deploy receipt.

## Proof quality checks

Before PROVEN:
- evidence is from the current candidate/environment;
- evidence is recent enough for the claim;
- evidence is specific to the criterion;
- deterministic output is available where the criterion is deterministic;
- user-facing criteria use applicable Playwright/visual evidence;
- production claims use provider/runtime receipts tied to exact SHA/environment.

## Failure handling

- Missing DoD → generate/resolve the completion contract, then continue.
- Wrong/stale evidence → gather current evidence.
- Failed criterion → route repair to the technical owner, then re-verify.
- Criterion disputed as unnecessary → SPM/product owner decides scope; verifier does not silently waive it.
- Technical repair exhaustion → route through the technical escalation ladder before founder handoff.

## Banned shortcuts

Do not say:
- Done/Finished/Everything working without proof;
- production-ready from CI alone;
- deployed from a merge alone;
- “looks good” as evidence;
- tests passed without verified output;
- approved for merge/deploy/ship unless citing a separate valid authority receipt.

## Cross-references

- `.claude/commands/spm.md`
- `.claude/commands/done.md`
- `.claude/rules/verification-gate.md`
- `.skills/custom/definition-of-done-builder/SKILL.md`
