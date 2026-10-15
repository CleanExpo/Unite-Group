# Unite-Group idea-to-DONE validation record

16/10/2026 · Local and hosted checkpoints plus staged rehearsal · Full operational acceptance remains open.

This record distinguishes observed local results from the accepted research-to-payment outcome. The runtime operator keeps raw logs and file snapshots in `D:\pi-ceo-scratch\idea-to-done-runtime`. `RUNTIME_RECEIPT.md` records runtime setup and diagnostic history; `FINAL_VERIFICATION_RECEIPT.json` records the initial checkpoint; `FINAL_CONTINUATION_RECEIPT.json` records the 15 October continuation's local gates and source binding. The 16 October staged rehearsal is under `staging-20261016`. These local artefacts are evidence pointers, not portable CI or deployment receipts.

Grounded 15/10/2026: the terminal contract suite executed ten assertions with no failures — `node --test scripts/__tests__/idea-lifecycle-status.test.mjs` (exit 0).

Grounded 15/10/2026: existing schema metadata includes `cc_tasks.metadata`, `external_ref`, `updated_at`, unique `(founder_id, external_ref)`, founder-scoped policies and task/event/approval check constraints — `D:\pi-ceo-scratch\idea-to-done-runtime\schema-gate-receipt.json:1` (read-only Supabase tool result, project `lksfwktwtmyznckodsau`, observed 15/10/2026 at 22:21 AEST). No production write or migration was performed.

Grounded 15/10/2026: the complete web suite passed 746 files and 5,987 assertions — `corepack pnpm@9.15.0 exec vitest run --maxWorkers=4 --minWorkers=1` (exit 0), recorded in `FINAL_VERIFICATION_RECEIPT.json` and `final-web-vitest.log`.

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 2/12 Build) · AA — scoped checkpoint evidence. The 41-file fingerprint and hosted CI below retain their historical bindings. The 16 October catalogue, worker-transport and quota-message delta has focused checks; final review and matching full gates remain pending. No higher delivery rung is claimed.

## Initial checkpoint checks

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

Documentation receipt updates were deliberately excluded from that initial application-source fingerprint. Those local gates were collected against a working-tree candidate and are not relabelled as clean-commit verification. The separately observed committed hosted CI below has its own SHA and scope; neither proves merge or release.

## 15 October continuation — local gates and standalone provider smoke

This checkpoint added bounded public-research domain/store services, owner/registered-worker APIs, explicit research UI, an opt-in Windows Job Object worker and configured GitHub required-check verification. Independent review remains false; trusted live-journey/activation/customer outcomes remain open. The earlier checkpoint counts and fingerprint above describe that earlier source version, not these additions.

The raw `HOSTED_CI_B63.json` records the [Monorepo CI run](https://github.com/CleanExpo/Unite-Group/actions/runs/38735162749) for `b63e1c5250f85a8803974c67e4eb0722e46adde2`: completed, success, all 20 jobs successful. That earlier hosted checkpoint does not cover later changes.

| Continuation web check | Observed result | Local receipt |
|---|---|---|
| Complete web suite | **751/751 files, 6,076/6,076 assertions passed; exit 0; no skips** | `continuation-web-vitest.log` |
| Web type-check | Exit 0 | `continuation-typecheck.log` |
| Web lint | Exit 0 | `continuation-lint.log` |
| Isolated web build | Exit 0 | `continuation-web-build.log` |
| Final root readiness | **530/530 assertions passed; exit 0; no skips** | `formatter-readiness.log`; supersedes the historical pre-repair 527/527 result in `final-continuation-readiness.log` |
| Final worker contract tests | **34/34 passed; exit 0; independently reviewed** | `FINAL_CONTINUATION_RECEIPT.json`, independent review `final_formatter_review`; supersedes the historical pre-repair 31/31 result |
| Actual Windows broker/process checks | Independently reviewed 8/8 passed; exit 0; no skips | `research-containment-review/REVIEW_RECEIPT.md`; unchanged broker inputs and actual harmless native processes, not a model invocation |

`FINAL_CONTINUATION_RECEIPT.json` and its `continuation-final-source.json` snapshot bind those gates to 41 source files at base `59eef3ebef1b71b0b475b18511eb014c5ea49b74`, with fingerprint `c99021196337f1f4fb33bc778261ff25458376689c0a365b50a401099e254467` and zero source drift at collection. The fingerprint is SHA-256 of compact JSON sorted path/sha256 records over UTF-8 working-tree bytes. All 35 application source hashes also showed zero drift then. The containment review retains its unchanged broker binding and actual Unicode/long-stdin, deadline, parent-death and descendant-cleanup checks. These are historical working-tree receipts; they do not bind subsequent portability or 16 October changes.

The preserved initial standalone monthly-provider probe in `public-research-smoke-formatter-failure.json` returned `success: false`, `process_containment_unconfirmed` and unreconciled usage. It observed a successful permitted `WebFetch` to the public Claude headless documentation, but did not yield an accepted completed proposal. The probe was limited to one admitted source, two minutes and four turns and did not create an application job or exercise its lease/approval workflow. This failed experiment remains preserved separately and is not relabelled as success or research acceptance.

The final standalone real monthly-provider smoke in `public-research-smoke.json` succeeded in **32.851 seconds, 3 turns**, with one approved `WebFetch`, reply-only `StructuredOutput` and one proposed source. It used the Claude subscription login with no paid API environment or fallback, reconciled usage and matched the formatter payload hash to the final structured output. `public-research-server-validation.json` confirms acceptance by the unchanged server Zod proposal schema and the final hash match. This proves standalone provider/formatter compatibility only: it created no application job and proves no queue, lease, production workflow, delivery or commercial outcome.

Account metadata checks are distinct from model invocation and a complete authenticated research journey. `contained-auth-probe.json` records the actual Windows Job Object probe: `loggedIn: true`, `authMethod: claude.ai`, `apiProvider: firstParty`, subscription type `max`, and no paid API environment variables present. It confirms subscription login metadata on that host, not remaining allowance or an authenticated application workflow.

`macmini-runner-metadata.json` records the intended runner config file exists, the runner bearer is present and the app host is `unite-group.in`; no raw credential value is included. Its filtered Claude auth probe returned exit 1, `loggedIn: false`, `authMethod: none`, `apiProvider: firstParty` on Node v22.23.1. This establishes that host's observed CLI authentication state, not absence of every account connection. The new research worker requires Windows kernel containment and does not support that macOS host.

Fixture images are local review artefacts: `ui-fixture/lifecycle-desktop.png`, `ui-fixture/lifecycle-mobile.png` and `ui-fixture/source-form-mobile.png` in the runtime directory. They render labelled fixture state through actual components; they are not screenshots of an authenticated deployed product. Architecture and correctness review use the same model with distinct checklists, so they do not establish external model/provider diversity.

## 16 October checkpoint and staged rehearsal

`hosted-8b33-final.json` records [Monorepo CI](https://github.com/CleanExpo/Unite-Group/actions/runs/38744866310) at `8b33f595acd776bb329f4eb20b772dc22636b550` as completed successfully, including the E2E job. That E2E run reported 52 passed and 13 skipped; it is not a complete mission journey. The whole-diff static review passed for that checkpoint's 45 files with no P1/P2 findings; this is not provider-review quorum. The newer catalogue/transport/quota-message delta requires fresh final review and matching full checks.

`staging-20261016/FINAL_STAGING_RECEIPT.json` binds ten local rehearsal receipts by SHA-256, including source bindings. It records actual localhost Next requests against the existing E2E branch with no mocked responses, production mutations, build dispatches or payment actions. It does not establish a hosted staging deployment.

| New capability or observation | Evidence and boundary |
|---|---|
| Read-only offers catalogue | `catalog-green.log`: 17/17 tests passed. Strict primary/agency/synthex aliases, no credential fallback and conservative partial results; `catalog-typecheck.log` records the successful typecheck. `catalog-fallback-mutant-red.log` shows both missing-account regressions detect a deliberate fallback mutation. No actual authenticated catalogue result is claimed. |
| Research worker transport | `worker-transport-green.log`: 89/89 focused tests passed across proxy, route and transport suites; `worker-transport-typecheck.log` and `worker-transport-lint.log` record successful checks. Only the exact research POST bypasses browser-cookie guards; route authentication and rate limiting remain. |
| Safe quota explanation | `worker-quota-green.log`: 38/38 Windows worker tests passed with no skips. `worker-quota-red.log` preserves the regression before repair. The observed terminal weekly-limit format now produces fixed `research_subscription_limit` guidance without echoing provider reset text; usage, checkpoints and deadlines remain guarded. This uses fixtures after the real quota event, with no further provider attempt. |
| Real owner API persistence | `staging-20261016/owner-api-receipt.json`: two authenticated rehearsal users; capture, duplicate request handling, raw-text reload, saved mandate and other-owner 404 passed against branch `jhqjxomxlvvmjslgzqhd`. Production writes: zero. |
| Authenticated browser | `staging-20261016/actual-final-browser-receipt.json`: actual same-task localhost:3108 reload at 1440/390 widths, visible handoff, no page errors or horizontal overflow, production requests blocked; screenshots `actual-final-desktop.png` and `actual-final-mobile.png`. Unrelated notification requests returned 500 because this historical branch lacks `founder_notifications`; whole-application success is not claimed. |
| Explicit research consent | `staging-20261016/owner-consent-receipt.json`: HTTP 200, durable queued public-research permission for one source, two minutes and four turns. |
| Manual brief, handoff and compact status | `staging-20261016/manual-brief-handoff-receipt.json`: all 13 outputs explicitly included or limited, `research_brief_only` approval, hash-bound `non_executable_draft` manifest, same-task delivery preparation HTTP 200/`ready_for_review`, research cancellation and authenticated compact status parity. No provider research completion, build approval or dispatch. |

This local rehearsal uses the existing E2E Supabase branch, with new rehearsal users and data. The hosted preview is separate: it points at the production database and lacks the production-only signing/Stripe configuration, so it is not an isolated staging environment. `staging-20261016/stage-db-reconciliation.md` records two pre-existing branch-drift repairs: the auth trigger now qualifies `public.user_profiles` with fixed `search_path`, and the existing `20260716010000_cc_tasks_claim.sql` migration's missing claim columns/index were reconciled. Both were reapplied idempotently and retained existing schema contracts. Production was inspected read-only; no new feature migration or production write occurred.

`staging-20261016/connected-worker-receipt.json` records the actual claim/checkpoint path and explicit owner retry. The provider reported a weekly subscription limit resetting 20 October at 05:00 Australia/Brisbane. The same job retained its original deadline and allowance; two cumulative turns were reconciled, with zero tool calls, durable `partial` state and no completed proposal. This is evidence of guarded interruption and retry, not completed research. No paid API fallback was used. The subsequent manual brief rehearsal retained that research limitation and cancelled the run. No required `nexus/release-receipt`, main merge, release or commercial outcome has been established. Historical agency billing of AUD 2,500/month does not establish the idea's offer or a qualifying payment.

## Requirements portability

The documentation follow-up adds [PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md) and [EVIDENCE_AND_ACCEPTANCE.md](EVIDENCE_AND_ACCEPTANCE.md) verbatim from the original local intake bundle. Byte comparison confirms both copies match their originals, preserving proposal status and acceptance wording. Their SHA-256 values are:

| Input | SHA-256 |
|---|---|
| `PRODUCT_DEFINITION.md` | `fd5b666935e86ab7f4b2fe99a1b7561c5880cb1c9ec9ac0fbe2032b630805ad0` |
| `EVIDENCE_AND_ACCEPTANCE.md` | `801fc45f94a77c2859087ec933a33d7c73267b8856bbff7e36d9d3bc7d547905` |

The handoff links now resolve to these repository inputs. The copied snapshots intentionally retain eight references to seven original-only supporting files; all seven exist in the originating bundle but are not supplied here. Their provenance and access limits are documented in [IMPLEMENTATION.md](IMPLEMENTATION.md). They are not counted as resolving repository links or substituted with invented evidence.

This follow-up changes documentation only. It does not alter the frozen 28-file application fingerprint, rerun or upgrade the earlier local application gauntlet, or turn its working-tree evidence into clean-commit verification. Later application changes require their own matching verification receipts.

Documentation checks passed: both input copies remain byte-identical; 39 repository links resolve after the 16 October updates; eight preserved references resolve only in the original bundle (seven distinct files). The earlier four-document NUL/home-path and naming-pattern scanner results remain historical. A fresh `node --test scripts/__tests__/canonical-naming.test.mjs` run passed 9/9 with no skips under a Git Bash-enabled PATH (exit 0), and `git diff --check -- docs/idea-to-done` exited 0. The first naming-suite attempt used Windows' default WSL Bash and failed to resolve Windows paths; the Git Bash rerun corrected that test environment. These checks cover documentation portability and content, not application acceptance.

## Unproven full-product acceptance

The [implementation handoff](IMPLEMENTATION.md) maps local capabilities to AT-01–AT-20 from the accepted intake bundle. Local tests use labelled provider fixtures and cannot prove these missing outcomes:

- A completed connected application research run and reviewed evidence pack. Staged authenticated consent, claim and checkpoint handling have been observed, but the first provider attempt ended partial; neither this nor the standalone smoke establishes remaining monthly credits.
- A trusted independent BRV review producer and reviewer eligibility. Configured exact-commit required-check verification is implemented; `reviewApproved` remains false until the independent review contract is satisfied.
- Real build-harness execution, provider-confirmed merge into main, the required release receipt and current commit-bound CI/review receipts for the latest delta.
- A complete research-to-payment staged flow, main merge and released application with trusted core-journey/recovery observations, activation adapter and actual customer onboarding.
- A real captured payment under the agreed product/account/window contract, together with eligible activation and distinct-client evidence. Subscription renewals and mixed-product baskets remain unsupported.
- Founder acceptance of the full authenticated journey and commercial target achievement.

No production action, customer contact or charge was performed by this documentation task. Full idea-to-DONE acceptance remains open despite the passing local software checks.
