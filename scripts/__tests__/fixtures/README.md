# CI evidence fixtures

Both fixtures are **vitest JSON reporter output** (`vitest run --reporter=json`), not console
text. That substrate is deliberate: a test's stdout is a captured field *inside* this structure,
never a sibling of it, so a test printing reporter-shaped bytes cannot add or alter a suite record.
Two earlier revisions parsed the human-readable log and both were forged in adversarial review.

| File | Provenance |
|---|---|
| `spine-skipped.vitest.json` | **Real vitest output**, produced locally by running `vitest run --reporter=json` in `packages/spine/packages/spine` with `SPINE_DATABASE_URL` unset — the same condition CI runs under. Counts match live CI job 95119197937 exactly: 22 total, 3 passed, 19 skipped. Absolute paths were rewritten to the runner's prefix; assertion records are untouched. |
| `spine-all-executed.synthetic.vitest.json` | **Synthetic**, derived from the file above by flipping every skipped assertion to `passed`. Not observed output. It is the positive control: it proves the checker can return `PASS`, so a `FAIL` on the real report is a finding rather than a checker that can only ever fail. |
| `real-upload-artifact.zip` | **A real repository artefact, bytes unmodified.** Artefact `9264287002` (`dependency-audit-results`) from run `31949682645`, downloaded via `gh api repos/CleanExpo/Unite-Group/actions/artifacts/9264287002/zip` on 17/08/2026; sha256 `2bbee3ea9897a26a3bae7a129e990622eeca5a01dd155ee6a460deecd3423db0`. Produced by the same pinned `actions/upload-artifact` SHA this repository's workflows use. Its content is irrelevant — it is here for its **container layout**. |

### Why the ZIP fixture is real and not built by the test writer

Every archive in the ZIP tests is constructed by `buildZip` in the test file, and for nine
rounds that writer only ever emitted the layout the reader already accepted. So the suite could
not see that the reader **refused the layout GitHub actually produces**: real artefacts are
written streamed — general-purpose flag bit 3 set in both headers, a zeroed local CRC and sizes,
and a signed 16-byte data descriptor after the compressed data. The round-nine hardening refused
that outright, and the tiling rule rejected the descriptor as unaccounted bytes even with the
refusal lifted. The gate could not have read a single real artefact, through 176 passing tests.

The commit that introduced the refusal argued in its own comment that "actions/upload-artifact
does not stream — every artefact this gate has ever read carries its sizes in the local header."
Nobody had opened one. One `gh api` call settled it.

A fixture the test suite writes itself can only ever prove the reader agrees with the writer.
This one is the counterparty's output, so it proves the reader agrees with production.

## Why neither fixture can forge a gated PASS

**This section was false when first written, and the correction is the point.** It claimed
"neither fixture can be replayed as evidence for a real SHA" on the strength of API-resolved
provenance. Round six of independent review pointed `--gate` at
`spine-all-executed.synthetic.vitest.json` — the file the table above labels *synthetic, not
observed output* — for real job `95119197937` on real commit `d1d57b8e5`, and got
`evidence-completeness PASS` with zero violations. Provenance bound the **job**. Nothing bound
the **file** to that job, and the two are not the same claim.

What is true now: under `--gate` the checker takes **no evidence path at all**. `--evidence`
alongside `--gate` is refused (`UNBOUND_EVIDENCE_SOURCE`). The report is downloaded from the
resolved run's own artefact through the API, the artefact's `workflow_run.id` and
`head_sha` are re-checked against the resolved run and commit, and the artefact name itself
carries the commit (`spine-test-evidence-{sha}`). These fixtures can therefore only ever be
graded in report-only mode, whose output labels the evidence `UNBOUND` and which never gates.

Both fixtures remain useful for exactly what they are: inputs to unit tests of the parser and
the completeness rules. Neither is, or ever was, evidence about a commit.

## Two things the real report proved, both worth keeping

1. **Vitest 4 reports a skipped assertion as `"skipped"`, not `"pending"`.** The checker counts
   `executed` positively (passed + failed) rather than `declared - skipped`, so an unrecognised
   status is simply not evidence instead of silently inflating the executed count.
2. **The file-level `status` for `rls.test.ts` is `"passed"` while all four of its tests were
   skipped.** That is the whole UNI-2567 defect in miniature. A file-level status can be green
   while nothing ran, so it can never stand in for counting assertions.

   The converse also holds, and round six found it: a file-level status can be `"failed"` while
   every assertion passed — an `afterAll` hook that throws, a setup error, an unhandled
   rejection. Counting assertions alone certified that as complete green evidence. The checker
   now reads both, and disagreement in either direction is a violation.

## History

An earlier revision shipped a synthetic all-green log with no provenance and a checker that
accepted any `--sha` string, so a committed file produced a gated `PASS` for an arbitrary commit.
A later revision derived the SHA from the log text, which fell to one `sed`. Do not reintroduce
provenance that comes from a file the caller supplies.
