# /done — Completion Verification Gate

> Verifies the current candidate against the applicable completion contract.
> `/done` reports evidence; it does not convert a draft PR or a clean working tree into mission `COMPLETE` by itself.

## Usage

```text
/done
/done "feature name"
```

## Scope rule

First classify the change:
- behavioural code change;
- user-facing change;
- schema/integration/security change;
- documentation/configuration/test-only change.

Run the strongest applicable verification. Do not downgrade a required check merely because it is inconvenient.

## apps/web deterministic baseline

For normal `apps/web` code changes, align with the current CI contract:

```bash
pnpm run lint
pnpm run type-check
pnpm run test
node ../../scripts/verify-web-ci-build.mjs
```

Record exact commands, exit codes and candidate SHA/worktree.

**Any failure means NOT DONE.** Repair first, then rerun the failed check and the applicable final baseline.

### Test coverage rule

For changed behaviour, **missing meaningful regression coverage is blocking**, not a note.

`NOT_APPLICABLE` is allowed only when the change is genuinely non-behavioural and the reason is recorded (for example a prose-only documentation correction). Do not convert `NO TESTS` into PASS for changed application/runtime behaviour.

## Additional gates by change type

### User-facing

Require the applicable Playwright journey plus console/network inspection and visual evidence. Use Computer Use or equivalent visual/desktop verification when Playwright cannot prove the real state.

### Schema / data / integration / security

Require the relevant specialised gate, isolated environment/branch where applicable, rollback/reversibility evidence, and independent review required by the current authority contract.

### Configuration / operating-control changes

Validate syntax plus active-reference/conformance rules. A Markdown rule or config edit is not accepted merely because the file exists.

## Candidate integrity

```bash
git status --short
git diff --stat
```

Record:
- source/base SHA;
- candidate HEAD SHA;
- branch/worktree;
- changed paths;
- uncommitted changes, if intentionally present;
- PR reference when one exists.

A commit or PR is an artefact, not proof of completion.

## Independent verification

When the mission requires independent review, the final reviewer must be a different execution identity/model lane from the builder and must review the frozen candidate. Model PASS never overrides a deterministic failure.

## Output

```text
COMPLETION CHECK — [task]

candidate:       [SHA / branch / PR]
lint:            PASS / FAIL / N/A
type-check:      PASS / FAIL / N/A
tests:           PASS / FAIL / MISSING_COVERAGE / N/A
build:           PASS / FAIL / N/A
integration:     PASS / FAIL / N/A
independent:     PASS / FAIL / PENDING / N/A
playwright:      PASS / FAIL / PENDING / N/A
visual:          PASS / FAIL / PENDING / N/A
release-proof:   PASS / FAIL / PENDING / N/A
outcome-proof:   PASS / FAIL / PENDING / N/A

EARNED STATE: [IMPLEMENTED | LOCALLY_VERIFIED | PR_OPEN | CI_GREEN | STAGING_VERIFIED | RELEASE_READY | POST_DEPLOY_VERIFIED | COMPLETE | BLOCKED]

Missing evidence / blockers:
1. ...

Next executable move:
...
```

## Hard rules

- Never say DONE/COMPLETE merely because code was written, committed, or a PR exists.
- Never mark changed behaviour complete with missing test coverage.
- Never skip the production-equivalent build when the affected deliverable is buildable.
- Never ask the founder to perform routine engineering QA that Playwright, Computer Use, logs, tests or a specialist can perform.
- `RELEASE_READY` is not `DEPLOYED`; `DEPLOYED` is not `COMPLETE` until post-release/outcome evidence is satisfied.
- If evidence is stale or unavailable, downgrade to an honest state.

## Integration

`/spm` owns mission lifecycle and authority transitions. `/done` supplies completion evidence to that state machine; it does not grant merge/deploy authority.

## Locale

Australian English. Dates DD/MM/YYYY. AEST/AEDT where applicable.
