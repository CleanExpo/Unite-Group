# CI evidence fixtures

Both fixtures are **vitest JSON reporter output** (`vitest run --reporter=json`), not console
text. That substrate is deliberate: a test's stdout is a captured field *inside* this structure,
never a sibling of it, so a test printing reporter-shaped bytes cannot add or alter a suite record.
Two earlier revisions parsed the human-readable log and both were forged in adversarial review.

| File | Provenance |
|---|---|
| `spine-skipped.vitest.json` | **Real vitest output**, produced locally by running `vitest run --reporter=json` in `packages/spine/packages/spine` with `SPINE_DATABASE_URL` unset — the same condition CI runs under. Counts match live CI job 95119197937 exactly: 22 total, 3 passed, 19 skipped. Absolute paths were rewritten to the runner's prefix; assertion records are untouched. |
| `spine-all-executed.synthetic.vitest.json` | **Synthetic**, derived from the file above by flipping every skipped assertion to `passed`. Not observed output. It is the positive control: it proves the checker can return `PASS`, so a `FAIL` on the real report is a finding rather than a checker that can only ever fail. |

## Why neither fixture can forge a gated PASS

Provenance is not read from these files at all. Under `--gate` the checker requires `--job`,
`--sha` and `--repo`, resolves the commit from the **GitHub Actions API**, and refuses if the job's
`head_sha` disagrees, if the job is not the manifest's `requiredCheck`, or if it has not completed.
A local evidence file therefore cannot vouch for its own commit, and neither fixture can be
replayed as evidence for a real SHA.

## Two things the real report proved, both worth keeping

1. **Vitest 4 reports a skipped assertion as `"skipped"`, not `"pending"`.** The checker counts
   `executed` positively (passed + failed) rather than `declared - skipped`, so an unrecognised
   status is simply not evidence instead of silently inflating the executed count.
2. **The file-level `status` for `rls.test.ts` is `"passed"` while all four of its tests were
   skipped.** That is the whole UNI-2567 defect in miniature. Never trust a file-level or job-level
   status; count assertions.

## History

An earlier revision shipped a synthetic all-green log with no provenance and a checker that
accepted any `--sha` string, so a committed file produced a gated `PASS` for an arbitrary commit.
A later revision derived the SHA from the log text, which fell to one `sed`. Do not reintroduce
provenance that comes from a file the caller supplies.
