# Unite-Group idea-to-DONE validation record

15/10/2026 · Local candidate evidence · Full operational acceptance remains open.

This record distinguishes observed local results from the accepted research-to-payment outcome. The runtime operator keeps raw logs and file snapshots in `D:\pi-ceo-scratch\idea-to-done-runtime`. `RUNTIME_RECEIPT.md` records runtime setup and diagnostic history; `FINAL_VERIFICATION_RECEIPT.json` records the final local gate exits and source comparisons. These local artefacts are evidence pointers, not portable CI or deployment receipts.

Grounded 15/10/2026: the terminal contract suite executed ten assertions with no failures — `node --test scripts/__tests__/idea-lifecycle-status.test.mjs` (exit 0).

Grounded 15/10/2026: existing schema metadata includes `cc_tasks.metadata`, `external_ref`, `updated_at`, unique `(founder_id, external_ref)`, founder-scoped policies and task/event/approval check constraints — `D:\pi-ceo-scratch\idea-to-done-runtime\schema-gate-receipt.json:1` (read-only Supabase tool result, project `lksfwktwtmyznckodsau`, observed 15/10/2026 at 22:21 AEST). No production write or migration was performed.

Grounded 15/10/2026: the complete web suite passed 746 files and 5,987 assertions — `corepack pnpm@9.15.0 exec vitest run --maxWorkers=4 --minWorkers=1` (exit 0), recorded in `FINAL_VERIFICATION_RECEIPT.json` and `final-web-vitest.log`.

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 3/12 Test) · AA — local gates bind the 28-file candidate fingerprint below; no clean candidate commit receipt is asserted. No higher delivery rung is claimed.

## Observed checks

| Check | Observed result | Receipt and limit |
|---|---|---|
| Full web suite | **746/746 files, 5,987/5,987 assertions passed; exit 0; no skips** | `final-web-vitest.log`; includes latest lifecycle UI 20 and domain 14 assertions |
| Frozen UI/domain check | 5 files, 73/73 assertions passed; exit 0 | `frozen-ui-domain-tests.log`; 59 UI plus 14 domain assertions |
| Terminal status contract | 10/10 passed; exit 0; no skips | `frozen-cli-tests.log`; also rerun by documentation task under Node v24.14.1; mocked HTTP, no authenticated deployment |
| Web type-check | `corepack pnpm@9.15.0 run type-check`; exit 0 | `frozen-typecheck.log` |
| Web lint | `corepack pnpm@9.15.0 run lint`; exit 0 | `frozen-lint.log` |
| Isolated web build | `node scripts/verify-web-ci-build.mjs`; exit 0 | `frozen-web-build.log`; local build, no deployment |
| Root readiness | `npm run verify:readiness`; 496/496 assertions passed; exit 0 | `frozen-readiness.log`; scanner summary: 10 pass, 0 fail, 0 unknown, 0 blocking |
| Responsive review | Fixture browser record reports 1440 px desktop and 390 px mobile, matching scroll widths, keyboard source-field access and no page errors | `ui-fixture/browser-result.json`; persisted verdict `.omx/state/idea-to-done-ui/ralph-progress.json`; no authenticated or provider journey established |

Commands for web tests/type-check/lint ran from `apps/web`; readiness and the isolated build verifier ran from the repository root. Counts above overlap and must not be summed into a unique test total.

Earlier diagnostic runs failed: the first full run had four Windows test-harness failures, and an initial build found an in-progress UI typing error. The repairs retained existing assertions; current full tests, type-check and build supersede those failed experiments. Their original logs remain in the runtime directory. A separate shell-quoting failure in `frozen-ui-tests.log` did not execute the intended UI assertions; the successful `frozen-ui-domain-tests.log` is the focused receipt.

## Candidate binding

The source snapshots use base `59eef3ebef1b71b0b475b18511eb014c5ea49b74`; this is the base commit, not a commit of the candidate changes. `FINAL_VERIFICATION_RECEIPT.json` records 28 application code/test/config files with source fingerprint `39e36f7e517bbeb80f34d930ed90765340bf35ba2b93ab2498b0c0a125ea3728`. Comparisons of `frozen-build-start.json` against `frozen-build-end.json`, `final-vitest-end.json` and `final-verified-candidate.json` report zero drift and no absent source files.

Documentation receipt updates are deliberately excluded from that application-source fingerprint. A final all-file snapshot follows the documentation freeze. This record establishes local candidate verification and does not invent a candidate commit SHA, remote CI, merge or release receipt.

Fixture images are local review artefacts: `ui-fixture/lifecycle-desktop.png`, `ui-fixture/lifecycle-mobile.png` and `ui-fixture/source-form-mobile.png` in the runtime directory. They render labelled fixture state through actual components; they are not screenshots of an authenticated deployed product. Architecture and correctness review use the same model with distinct checklists, so they do not establish external model/provider diversity.

## Unproven full-product acceptance

The [implementation handoff](IMPLEMENTATION.md) maps local capabilities to AT-01–AT-20 from the accepted intake bundle. Local tests use labelled provider fixtures and cannot prove these missing outcomes:

- A supported automated research account connection, bounded research scheduling and a real researched evidence pack.
- Required branch-check policy and independent reviewer eligibility. The trusted adapter deliberately keeps engineering check/review verification false until those are evaluated.
- Real harness execution, provider-confirmed merge into main and commit-bound CI/review receipts for this increment.
- A released application with trusted core-journey/recovery observations, activation adapter and actual customer onboarding.
- A real captured payment under the agreed product/account/window contract, together with eligible activation and distinct-client evidence. Subscription renewals and mixed-product baskets remain unsupported.
- Founder acceptance of the full authenticated journey and commercial target achievement.

No production action, customer contact or charge was performed by this documentation task. Full idea-to-DONE acceptance remains open despite the passing local software checks.
