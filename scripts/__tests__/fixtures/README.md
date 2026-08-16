# CI evidence fixtures

Both fixtures are **raw GitHub Actions job logs** — Actions timestamp prefixes and ANSI colouring
intact, exactly as `gh api repos/{owner}/{repo}/actions/jobs/{id}/logs` returns them. Nothing is
hand-cleaned. `scripts/ci-evidence-manifest.mjs` normalises internally, so these fixtures exercise
the same code path a real log takes.

| File | Provenance |
|---|---|
| `spine-required-job-95119197937.raw.log` | **Real CI output**, byte-for-byte from `Monorepo CI` run 31928303697, job 95119197937. The log's own checkout step proves SHA `d1d57b8e5745e90259f2799cb9086e4a62689318`. The job concluded `success` while 19 of 22 tests were skipped — the UNI-2567 false-assurance evidence. |
| `spine-all-executed.synthetic.log` | **Synthetic**, hand-written. Not observed CI output. It is the positive control: it proves the completeness checker can return `PASS`, so a `FAIL` on the real log is a finding rather than a checker that can only ever fail. |

## Why the synthetic fixture cannot forge a green verdict

It carries a deliberately fake provenance SHA (`0123456789abcdef…01234567`) that matches no commit
in this repository. The checker derives the SHA from the log's checkout step and refuses when the
caller's `--sha` disagrees, so this file can only ever produce a `PASS` for a commit that does not
exist. Replaying it as evidence for a real SHA fails closed with `PROVENANCE_MISMATCH`.

An earlier revision of this directory shipped a synthetic all-green log with **no** provenance and a
checker that accepted any `--sha` string. That combination let a committed file produce a gated
`PASS` for an arbitrary commit — the exact false-assurance class UNI-2567 exists to close. It was
caught in adversarial review before merge. Do not reintroduce a fixture without provenance.
