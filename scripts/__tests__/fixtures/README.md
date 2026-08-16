# CI evidence fixtures

| File | Provenance |
|---|---|
| `spine-required-job-95119197937.log` | **Real CI output**, captured verbatim (ANSI and timestamp prefixes stripped) from `Monorepo CI` run 31928303697, job 95119197937, on `main` at `d1d57b8e5745e90259f2799cb9086e4a62689318`. The job's conclusion was `success` while 19 of 22 tests were skipped — the UNI-2567 false-assurance evidence. |
| `spine-all-executed.synthetic.log` | **Synthetic**, hand-written. Not observed CI output. It exists solely as the positive control: it proves the completeness checker is capable of returning `PASS`, so a `FAIL` on the real log is a finding rather than a checker that can only ever fail. |
