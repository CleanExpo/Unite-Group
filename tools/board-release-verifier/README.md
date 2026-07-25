# Board release verifier

Dependency-free, stdlib-only Python verifier for a Hermes Senior Board release receipt (schema
`nexus.board-release-receipt.v2`), implementing
[ADDENDUM-001](../../docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md)
(founder ruling 24/07/2026) plus the independent Codex pre-build challenge repair (m14a).

## Four states, not one verdict

Every run produces four separate, non-aliased booleans:

- **`candidate_verified`** — the artefact itself is technically sound: schema-valid receipt, an
  independently supplied trusted PR snapshot (repo/PR/`base=main`/exact lowercase-40-hex HEAD),
  policy/roster/check-manifest bound by expected path+schema+version+hash, a Claude/`anthropic`
  builder and a standalone Codex/`openai` independent reviewer with distinct execution identities
  (the reviewer can never have authored or repaired the candidate), and every required check from
  the frozen manifest rerun **outside** the builder with command identity, exit code, timestamp,
  runner identity, trust domain, and an immutable evidence digest — `status: passed` alone is never
  sufficient.
- **`board_release_ready`** — `candidate_verified` AND the eligible Board roster
  (`docs/constitution/board-release-roster.v1.json`) unanimously `APPROVE`d on the same exact HEAD,
  the rejection ledger is explicitly marked complete (an absent ledger is never treated as zero
  rejections) with every item resolved, repaired, and independently re-reviewed on the *final*
  HEAD, none of `direct_spend` / `constitutional_change` / `out_of_scope` / `missing_privilege` /
  `authority_conflict` / `unapproved_infrastructure` is raised (and a receipt cannot claim
  `constitutional_change: false` while its declared `changed_paths` touch `docs/constitution/`),
  and the receipt is unexpired with a bounded (≤24h) TTL whose `issued_at` is never later than
  the injected verification time (`--now`) — zero future issuance, with no grace period.
- **`merge_authorised`** — `true` only when `board_release_ready` holds AND every founder-ratified
  UG-AUTONOMY-001 activation gate is satisfied: the repo is on the independently hash-bound
  activation manifest (`docs/constitution/ug-autonomy-001-activation.v1.json`), the candidate is
  non-constitutional (any `docs/constitution/**` or `tools/board-release-verifier/**` change in
  `changed_paths` blocks this unconditionally — neither protected/governing path family can ever
  self-authorise), and the receipt carries tested rollback evidence, a
  present post-deployment verification plan, and manifest-bound, exact-HEAD restart/canary evidence.
  Eligibility is **derived** from the independently supplied activation manifest — there is no
  hardcoded gate. Consumed only by `tools/board-release-verifier/controller.py`, which additionally
  enforces a constant, defense-in-depth repo allowlist before ever calling `gh`.
- **`deployment_authorised`** — **always `false`** in this implementation, with an explicit reason
  (`no deployment executor is implemented`). Strictly separate from `merge_authorised`, never
  aliased to it, and never implied by it. Deployment is out of scope for m14a.

Any single defect fails the whole receipt closed. `board_release_ready` is evidence a human
merge-approver may use. `merge_authorised` is the machine precondition the separate merge controller
requires before it may attempt one SHA-guarded, independently post-merge-verified merge. Neither
field, nor `deployment_authorised`, is itself a merge or deploy.

## What the verifier deliberately does not do

`verifier.py` never calls `gh`, `git push`, `merge`, or `deploy`, makes no network calls, and never
claims production has been merged or deployed. Malformed/missing input files produce a structured,
four-state JSON rejection payload — never a raw traceback. All side effects (reading the live PR,
merging, re-verifying) live in the separate `controller.py`, which independently re-reads the live PR
HEAD before mutating and independently re-reads the PR after a merge-API "success" response — a
merge API confirmation that fails that independent re-read is reported as `merge_unverified`, never
as a completed merge. `controller.py` may only ever invoke `gh pr view` and the merge API `PUT`, with
a fixed argv and no shell.

## Run

```bash
cd tools/board-release-verifier
python3 verifier.py \
  --receipt receipt.json \
  --roster ../../docs/constitution/board-release-roster.v1.json \
  --constitution ../../docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md \
  --check-manifest ../../docs/constitution/board-release-required-checks.v1.json \
  --evidence-index <path to the independently-supplied evidence-index JSON> \
  --expect-repo CleanExpo/Unite-Group \
  --expect-base main \
  --expect-head-sha <40hex live PR HEAD> \
  --expect-pr <PR number> \
  --expect-policy-path docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md \
  --expect-policy-version 1.0 \
  --expect-roster-path docs/constitution/board-release-roster.v1.json \
  --expect-check-manifest-path docs/constitution/board-release-required-checks.v1.json \
  --expect-evidence-index-path <the evidence-index path as declared in the receipt> \
  --expect-policy-sha256 <64hex independently-computed hash of --constitution> \
  --expect-roster-sha256 <64hex independently-computed hash of --roster> \
  --expect-check-manifest-sha256 <64hex independently-computed hash of --check-manifest> \
  --expect-evidence-index-sha256 <64hex independently-computed hash of --evidence-index> \
  --changed-path <a live PR changed file path, repeat once per file> \
  --now <ISO 8601 verification timestamp, e.g. 2026-07-24T12:00:00+00:00>

# Optional, only to also derive merge_authorised (omitting these three fails merge authorisation
# closed -- a receipt-declared activation status alone is never proof):
#   --activation-manifest ../../docs/constitution/ug-autonomy-001-activation.v1.json \
#   --expect-activation-manifest-path docs/constitution/ug-autonomy-001-activation.v1.json \
#   --expect-activation-manifest-sha256 <64hex independently-computed hash of --activation-manifest>

python3 -m unittest discover -s tests -v
```

Every `--expect-*-sha256` value must be computed independently of this tool (e.g. `shasum -a 256
<file>`) — never derived by reading the same file the verifier is about to trust. `--changed-path`
may repeat once per live PR file; omitting it entirely still allows `board_release_ready` but fails
`merge_authorised` closed.

The separate, fail-closed merge controller requires every one of the following flags (all mandatory
except `--now`):

```bash
python3 controller.py \
  --gh <path to the real gh binary> \
  --repo CleanExpo/Unite-Group \
  --pr <PR number> \
  --receipt receipt.json \
  --roster ../../docs/constitution/board-release-roster.v1.json \
  --constitution ../../docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md \
  --check-manifest ../../docs/constitution/board-release-required-checks.v1.json \
  --evidence-index <path to the independently-supplied evidence-index JSON> \
  --activation-manifest ../../docs/constitution/ug-autonomy-001-activation.v1.json \
  --expect-policy-path docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md \
  --expect-policy-version 1.0 \
  --expect-roster-path docs/constitution/board-release-roster.v1.json \
  --expect-check-manifest-path docs/constitution/board-release-required-checks.v1.json \
  --expect-evidence-index-path <the evidence-index path as declared in the receipt> \
  --expect-activation-manifest-path docs/constitution/ug-autonomy-001-activation.v1.json \
  --expect-policy-sha256 <64hex independently-computed hash of --constitution> \
  --expect-roster-sha256 <64hex independently-computed hash of --roster> \
  --expect-check-manifest-sha256 <64hex independently-computed hash of --check-manifest> \
  --expect-evidence-index-sha256 <64hex independently-computed hash of --evidence-index> \
  --expect-activation-manifest-sha256 <64hex independently-computed hash of --activation-manifest> \
  --now <ISO 8601 verification timestamp, e.g. 2026-07-24T12:00:00+00:00>
```

The controller reads the live PR (repo/PR/HEAD/changed-file set) itself via `--gh`; it never accepts
`--expect-head-sha` or `--changed-path` -- those are independently observed, not caller-supplied. It
refuses to trust a file whose live
hash doesn't match, before ever reading its content — see `tests/test_controller.py`.
