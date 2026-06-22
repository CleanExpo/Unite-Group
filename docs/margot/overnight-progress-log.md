# Margot Overnight Progress Log

## 2026-06-22 11:13 AEST

### Tick 20260622_1113 — PR #412 OAuth-auth gate follow-through + Vercel sandbox blocker read-back

Lane: continued the already-in-progress branch/PR instead of starting a new CRM lane. Scope stayed inside read-only repo/GitHub/Vercel inspection plus local verification of the PR's touched AI client files. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, or destructive git action was performed by this tick.

Completed:
- Preflight found current work initially on `fix/apps-web-oauth-max-plan` with PR #412 open against `main`; tracked tree was clean and `docs/margot/linear-watch-today.md` was the only untracked root Margot doc.
- Read the Margot source-of-truth docs available in this checkout under `apps/empire/docs/margot/` and the current app/package/test surfaces before selecting a lane.
- PR #412 (`fix(ai): authenticate apps/web AI via Max-plan OAuth, not API credits`) had GitHub Actions and Vercel preview checks green while CodeRabbit was pending; watched until CodeRabbit reported success.
- PR #412 was later read back as `MERGED` by Phill/CleanExpo at 2026-06-22T01:12:12Z; merge commit now appears at `origin/main` as `60d657bee fix(ai): authenticate apps/web AI via Max-plan OAuth, not API credits (#412)`. This tick did not run the merge command.
- Local branch after merge read-back was `fix/qa-command-centre-tiles` at `ed8f10ca5`; no current-branch PR was open. Evidence docs were left local/uncommitted to avoid publishing unrelated state.

Verification / evidence:
- `gh pr checks 412 --watch --interval 10` -> all PR checks passed: CodeRabbit, Vercel Preview Comments, `Vercel – unite-group`, `Vercel – unite-group-sandbox`, `apps/web — lint, type-check, test, build`, `apps/workspace — build`, `apps/spec-board — type-check, test, build`, and `packages/pi-ceo-operator-mcp — build`.
- Local focused PR verification from `apps/web`: `pnpm vitest run src/lib/ai/__tests__/client.test.ts` -> PASS, 1 file / 4 tests; `pnpm run type-check` -> PASS; `pnpm exec eslint src/lib/ai/client.ts src/lib/ai/__tests__/client.test.ts --max-warnings=0` -> PASS; `git diff --check -- src/lib/ai/client.ts src/lib/ai/__tests__/client.test.ts apps/web/.env.example` -> PASS.
- Post-merge `origin/main` GitHub Actions read-back for commit `60d657bee...` -> success for apps/web, apps/workspace, apps/spec-board, and packages/pi-ceo-operator-mcp.
- Post-merge deployment read-back: Production `unite-group` -> success; `autopilot-runner / production` -> success; Production `unite-group-sandbox` -> failure.
- Vercel sandbox failure log read-back with `vercel inspect dpl_6TENrn5Vi5ioPxaAXABr63EqmL76 --logs` showed build preflight failed because the sandbox deployment environment had 0/3 critical env vars and 0/4 required env vars configured. Values were not read or printed. This is a Vercel environment configuration gate, not a local code/test failure from this tick.

Safety / blockers:
- Sandbox deployment is blocked on authorised Vercel env configuration for the required Nexus variables. This tick did not mutate Vercel env.
- No new production code was written in this tick, so RED/GREEN was not applicable; the work was PR gate follow-through and verification of an already-reviewed slice.
- Evidence files changed locally: `docs/margot/overnight-progress-log.md`, `docs/margot/morning-report.md`.

Next safe lane:
- Do not start a new branch from the stale `fix/qa-command-centre-tiles` local branch. First sync/checkout a clean `main` or a dedicated fresh branch, then continue the smallest CRM/Margot slice with strict RED-GREEN. If sandbox deploy remains required, prepare a typed gate-review packet for Vercel env configuration instead of mutating env autonomously.

## 2026-06-22 11:48–12:01 AEST

### Tick 20260622_1148 — Kanban sync packet free-text redaction (command-center control panel)

Lane: fresh branch from clean `main` (`fix/kanban-sync-packet-redaction-20260622`) because no open PRs were present. Scope stayed inside local apps/web route/test code plus evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action, or live provider mutation occurred.

Completed:
- Preflight: `main` was at `bd6aa3613`, `origin/main` matched, GitHub CLI auth and Vercel CLI were available, and `gh pr list --state open --limit 10` returned `[]`.
- Read canonical Margot/CRM source docs from the tracked app docs (`apps/empire/docs/margot/*`, `apps/web/docs/margot/*`) because root `docs/margot/*` is currently an untracked evidence/log area in this checkout.
- TDD RED: added a focused Vitest case proving `/api/command-center/control-panel/kanban-sync` leaked sensitive CRM task free text into downstream Kanban packets while preserving routing metadata.
- GREEN: added route-local redaction for packet `title`, `kanban.title`, and `kanban.body`, covering synthetic email, Board-style refs, JWT/bearer-shaped values, secret-style env assignments, Australian phone numbers, and card-ending snippets while preserving `ccTaskId`, idempotency key, lane, status, priority, assignee, and tags.
- Code commit: `1562077d6 fix(crm): redact kanban sync packet free text`.

Verification / evidence:
- RED command: `pnpm vitest run src/app/api/command-center/control-panel/kanban-sync/__tests__/route.test.ts --testNamePattern 'redacts sensitive task free text'` -> expected failure: raw synthetic email was present in serialized packet.
- GREEN focused command: same focused Vitest command -> PASS, 1 test.
- Focused route suite: `pnpm vitest run src/app/api/command-center/control-panel/kanban-sync/__tests__/route.test.ts` -> PASS, 1 file / 6 tests.
- Type check: `pnpm run type-check` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` -> PASS (`eslint src/`).
- Whitespace: `git diff --check -- apps/web/src/app/api/command-center/control-panel/kanban-sync/route.ts apps/web/src/app/api/command-center/control-panel/kanban-sync/__tests__/route.test.ts` -> PASS.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains an environment configuration gate, not a code/test failure.

Safety / blockers:
- Vercel/sandbox env configuration remains gated; this tick did not mutate env vars.
- Root `docs/margot/linear-watch-today.md` remains untracked from prior local evidence state; this tick intentionally committed only `overnight-progress-log.md` and `morning-report.md` as evidence files.

Next safe lane:
- Push/open PR for `fix/kanban-sync-packet-redaction-20260622` if publication remains safe after evidence commit, then monitor checks. If build checks fail only for missing env, classify as gated configuration rather than mutating Vercel/local env autonomously.

## 2026-06-22 20:04 AEST

### Tick 20260622_2004 — PR #427 Nexus audit logger service-role lint fix

Lane: continued already-open PR #427 (`pidev/auto-uni-2204`) instead of starting a new CRM slice. Scope stayed inside the Nexus provider-router audit logging helper/tests plus Margot evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action, or live provider mutation occurred.

Completed:
- Preflight: local checkout started from `main` clean and `origin/main` matched; GitHub CLI auth was available. Open PRs were #427 and #424, both targeting `main` with failing `apps/web — lint, type-check, test, build` checks. PR #427 was selected first as the most recent in-progress lane.
- PR #427 failure read-back: GitHub Actions job `27943507633` / `82682366297` failed at `pnpm run lint` because `apps/web/src/lib/nexus/audit-logger.ts:34:15` directly accessed `SUPABASE_SERVICE_ROLE_KEY`, which violates the repo rule requiring that key to be accessed only through `src/lib/supabase/service.ts` or documented server-only exceptions.
- TDD RED: added `apps/web/src/lib/nexus/__tests__/audit-logger.test.ts` proving `logRoutingDecision` should skip persistence when `hasSupabaseServiceConfig()` is false and should persist through `createServiceClient()` when config is present. Focused test failed before production-code change because the service helper mock was never called.
- GREEN: updated `apps/web/src/lib/nexus/audit-logger.ts` to use `hasSupabaseServiceConfig()` and `createServiceClient()` instead of importing `createClient` and reading `SUPABASE_SERVICE_ROLE_KEY` directly.
- PR state before push: #427 remote head `993b6986d4ebd97e7fcb86b28be356fa6343b9a5`; Vercel preview statuses were green, but `apps/web — lint, type-check, test, build` was still red from the pre-fix remote head.

Verification / evidence:
- RED command: `./node_modules/.bin/vitest run src/lib/nexus/__tests__/audit-logger.test.ts --config vitest.config.mts` -> expected failure, 1 file / 2 failed tests (`hasSupabaseServiceConfig` and `createServiceClient` were not called).
- GREEN focused command: same focused Vitest command -> PASS, 1 file / 2 tests.
- Focused Nexus suite: `./node_modules/.bin/vitest run src/lib/nexus/__tests__/router.test.ts src/lib/nexus/__tests__/audit-logger.test.ts --config vitest.config.mts` -> PASS, 2 files / 13 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full apps/web tests: `pnpm run test` -> PASS, 376 files / 2243 tests.
- Whitespace: `git diff --check` -> PASS.
- Added-line security scan: hardcoded-secret, shell-injection, eval/exec, unsafe-deserialization, and SQL-format scans returned no matches.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this is an environment configuration gate, not a code/test failure.

Safety / blockers:
- Local build remains blocked by missing local app env. This tick did not mutate local or Vercel env vars.
- Unrelated unstaged local files were present after verification (`apps/web/.claude/memory/current-state.md`, Linear mapping/test files). They were not part of this slice and were not staged for the PR #427 fix.
- PR #424 remains open with separate test failures around business-count expectations; not touched in this tick.

Next safe lane:
- Commit and push only the PR #427 audit-logger fix/evidence, then monitor GitHub Actions for the refreshed head. If #427 turns green, merge only if all checks pass and the change remains within the stated safe boundaries; otherwise read the failing logs and fix the next bounded issue. After #427 is settled, return to PR #424's separate failing test lane.

## 2026-06-22 21:34 AEST

### Tick 20260622_2134 — PR #433 E2E hosted-Chrome CI follow-through

Lane: continued the already-in-progress CI/E2E gate lane after PR #430 was merged by `CleanExpo` while its Playwright E2E job was still pending. Scope stayed inside GitHub Actions config, Playwright config, local CI-config test coverage, and evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action, or live provider mutation occurred.

Completed:
- Preflight found PR #430 (`fix/e2e-job-timeout`) open from `fix/e2e-job-timeout`; it was later read back as MERGED by `CleanExpo` at 2026-06-22T10:58:40Z with merge commit `1f55057457b2e558e543022de4a876a82789ec84`. This tick did not run the merge command.
- Watched PR #430 and post-merge main E2E runs: the new job-level timeout worked, but both the PR run and latest main run failed/cancelled after 20m because `pnpm exec playwright install chromium` downloaded Chrome for Testing to 100% and then hung until timeout; Playwright tests never started.
- Current `origin/main` advanced through PRs #429, #431, and #432 while monitoring; created fresh worktree branch `fix/e2e-use-hosted-chrome` from latest `origin/main` (`639a880231766e3668e4aa29734b659bbf62b672`) to avoid the unrelated local `apps/web/.claude/memory/current-state.md` PreCompact change in the original checkout.
- TDD RED: added `apps/web/src/lib/ci/__tests__/playwright-config.test.ts` asserting CI uses Playwright channel `chrome`; focused test failed before config change with `expected undefined to be 'chrome'`.
- GREEN: updated `apps/web/playwright.config.ts` to use hosted runner Chrome only when `process.env.CI` is set, and updated `.github/workflows/ci.yml` to remove the Playwright-managed browser cache/download step and verify `google-chrome --version` before `pnpm exec playwright test`.
- Code commit: `707face763e67810c96eb270e06ccd7644c1a95c` (`ci(e2e): use hosted Chrome for Playwright CI`).
- Published PR: https://github.com/CleanExpo/Unite-Group/pull/433.

Verification / evidence:
- RED command: `./node_modules/.bin/vitest run src/lib/ci/__tests__/playwright-config.test.ts --config vitest.config.mts` -> expected failure, 1 failed test (`expected undefined to be 'chrome'`).
- GREEN focused command: same focused Vitest command -> PASS, 1 file / 1 test.
- CI config parse/list: `CI=true ./node_modules/.bin/playwright test --list` -> PASS, listed 69 Playwright tests without requiring a managed browser download.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`); targeted ESLint on `src/lib/ci/__tests__/playwright-config.test.ts` -> PASS.
- Full tests: `pnpm run test` from `apps/web` -> PASS, 380 files / 2272 tests.
- Workflow assertion: local Python check confirmed `.github/workflows/ci.yml` no longer contains `pnpm exec playwright install chromium` and does contain `google-chrome --version`.
- Whitespace: `git diff --check -- .github/workflows/ci.yml apps/web/playwright.config.ts apps/web/src/lib/ci/__tests__/playwright-config.test.ts` -> PASS.
- Added-line security scan: hardcoded-secret, shell-injection, eval/exec, unsafe-deserialization, and SQL-format scans returned no matches.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains an environment configuration gate, not a code/test failure.
- PR #433 initial remote state after create: apps/web CI queued, workspace/spec-board/mcp in progress, Vercel previews pending, CodeRabbit success.

Safety / blockers:
- Main branch currently has older pre-timeout push runs still `in_progress` and newer post-timeout runs `cancelled` because the E2E lane still hit the browser-download hang before PR #433.
- PR #433 must be allowed to prove whether hosted Chrome starts the Playwright tests in GitHub Actions; do not merge unless all checks pass cleanly.
- Original checkout still has unrelated local `apps/web/.claude/memory/current-state.md` modification; it was not included in PR #433.

Next safe lane:
- Monitor PR #433 checks. If apps/web E2E reaches `Run Playwright tests` and passes, merge only if all checks are green and branch protection permits; if it fails, inspect the new failing step without mutating Vercel/env/secrets.

## 2026-06-22 22:16 AEST

### Tick 20260622_2216 — PR #433 E2E login-flow follow-through

Lane: continued already-open PR #433 (`fix/e2e-use-hosted-chrome`) because it was the only open PR and still had a failing `apps/web — Playwright E2E` check. Scope stayed inside Playwright E2E test helpers/specs, the PR branch merge from `origin/main`, and Margot evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action, or live provider mutation occurred.

Completed:
- Preflight found current checkout on the merged PR #434 branch with unrelated dirty local files, so work continued in the existing isolated worktree `/private/tmp/unite-e2e-fix` on PR #433.
- PR #433 read-back: remote head `707face763e67810c96eb270e06ccd7644c1a95c`, base `main`, merge state `BEHIND`, Vercel previews green, non-E2E CI checks green, and E2E failing after hosted Chrome successfully reached `Run Playwright tests`.
- Merged `origin/main` (`05c812e6f`, PR #434) into `fix/e2e-use-hosted-chrome`; merge commit `33cde07ef` is local before push.
- TDD/RED evidence: GitHub E2E log for run `27949676832` showed auth/login tests failing because the current UI renders Google-first sign-in with a hidden `Use email instead` fallback; downloaded Playwright error context confirmed the snapshot has `Continue with Google` plus `Use email instead`, not visible email/password inputs. Local focused Playwright then reproduced a stale branding assertion (`Pi-CEO` strict-mode ambiguity) before the final assertion fix.
- GREEN: added `apps/web/e2e/support/email-login.ts` and updated login/authenticated E2E specs to call `revealEmailLogin(page)` before asserting or filling email/password fields. Updated stale branding assertion from `Nexus — Unite Group` to exact `Pi-CEO` and `Unite-Group` text.
- Code commit: `accf27e0f8f5fce904157247267eecc3d73ae12f fix(e2e): reveal email fallback in login tests`.

Verification / evidence:
- Focused Playwright before final GREEN: `pnpm exec playwright test e2e/auth-flow.spec.ts e2e/smoke.spec.ts --project=chromium --reporter=list` -> failed only on stale/ambiguous `Pi-CEO` branding locator after email fallback fixes were applied.
- Focused Playwright after GREEN: same command -> PASS, 11 passed / 5 skipped. Local `.env.local=missing`; Next dev warned about missing Supabase env, but these no-auth login/smoke tests still passed.
- CI config regression: `./node_modules/.bin/vitest run src/lib/ci/__tests__/playwright-config.test.ts --config vitest.config.mts` -> PASS, 1 file / 1 test.
- Playwright config parse/list: `CI=true ./node_modules/.bin/playwright test --list` -> PASS, listed 69 tests.
- Type check: `pnpm run type-check` and `npm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`). Targeted `pnpm exec eslint e2e/... --max-warnings=0` is not applicable because repo ESLint config ignores E2E files and returned ignored-file warnings.
- Full apps/web tests: `pnpm run test` -> PASS, 380 files / 2272 tests.
- Whitespace: `git diff --check -- .github/workflows/ci.yml apps/web/playwright.config.ts apps/web/src/lib/ci/__tests__/playwright-config.test.ts apps/web/e2e` -> PASS.
- Added-line security scan: hardcoded-secret, shell-injection, eval/exec, unsafe-deserialization, and SQL-format scans returned no matches.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains an environment configuration gate, not a code/test failure.

Safety / blockers:
- The remote PR has not yet been pushed with the merge commit and login-test fix at this evidence-writing point.
- The downloaded CI artifact/log exposed no secret values; GitHub masked E2E env values. This tick did not inspect or mutate Supabase/Vercel credentials.
- E2E authenticated tests may still surface a separate non-prod Supabase `createUser`/DB provisioning issue after the email-login tests proceed further; if so, classify/fix only after fresh CI read-back and without production DB writes.

Next safe lane:
- Commit evidence, push PR #433, monitor refreshed GitHub Actions/Vercel checks. If the E2E lane still fails at Supabase test-user provisioning, inspect logs/artifacts and treat any E2E database branch/env mismatch as a gated non-prod configuration issue unless a code-level failing test proves otherwise.

## 2026-06-22 23:03 AEST

### Tick 20260622_2303 — Command-center add-on approval requester redaction

Lane: fresh branch from current `main` (`fix/add-on-approval-requester-redaction-20260622`) because no open PRs were present. Scope stayed inside the command-center add-on approval route/test plus Margot evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action, or live provider mutation occurred.

Completed:
- Preflight: `main` matched `origin/main` at `867c7ef81`; GitHub CLI auth and Vercel CLI were available; `gh pr list --state open --limit 10` returned `[]`. Existing local dirty files (`.claude/settings.local.json`, `apps/web/.claude/memory/current-state.md`, `docs/audit-reports/`) were unrelated and not staged.
- Read the available canonical Margot/CRM docs under `apps/empire/docs/margot/` and `apps/web/docs/margot/` because root source docs are not present in this checkout, then selected a small command-center approval surface.
- TDD RED: added a focused Vitest assertion that the add-on approval task objective must not store the authenticated requester's email address.
- GREEN: changed the task objective copy from the raw actor email to the stable non-PII phrase `Requested by: authenticated founder`; `founderId` remains the scoped identity passed to `createTask`.
- Code commit: `94587ceaabd9 fix(command-center): redact add-on requester email`.

Verification / evidence:
- RED command: `pnpm vitest run src/app/api/command-center/control-panel/add-ons/__tests__/route.test.ts --testNamePattern 'does not store the requester email'` -> expected failure because the objective contained the synthetic raw email.
- GREEN focused + route suite: same focused command -> PASS, then `pnpm vitest run src/app/api/command-center/control-panel/add-ons/__tests__/route.test.ts` -> PASS, 1 file / 4 tests.
- Type check: `pnpm run type-check` and `npm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full apps/web tests: `pnpm run test` -> PASS, 381 files / 2278 tests.
- Whitespace: `git diff --check -- src/app/api/command-center/control-panel/add-ons/route.ts src/app/api/command-center/control-panel/add-ons/__tests__/route.test.ts` -> PASS.
- Added-line security scan: hardcoded-secret, shell-injection, eval/exec, unsafe-deserialization, and SQL-format scans returned no matches.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains an environment configuration gate, not a code/test failure.

Safety / blockers:
- Vercel/local app env configuration remains gated; this tick did not mutate env vars.
- The slice does not enable add-ons, approve work, or execute provider actions; it only reduces PII retained in a founder-scoped approval task objective.

Next safe lane:
- Commit the bounded route/test/evidence files, push/open a PR if publication remains safe, then monitor checks. If build/deploy fails only on missing env configuration, keep it classified as a gated configuration action rather than mutating Vercel/local env autonomously.

## 2026-06-23 00:45 AEST

### Tick 20260623_0045 — PR #440 main-merge type-check fix

Lane: continued already-open/current branch PR #440 (`advisory-debate-f2-f4`) instead of starting a new CRM slice. Scope stayed inside branch update from `origin/main`, the advisory debate-engine merge resolution, local verification, and Margot evidence docs. No production DB write, migration application, Vercel env mutation, billing/payment action, credential read/print, client-facing send, cross-client merge, destructive git action on `main`, or live provider mutation occurred.

Completed:
- Preflight found current branch `advisory-debate-f2-f4` with PR #440 open against `main`, merge state `BEHIND`, Vercel previews green, and `apps/web — lint, type-check, test, build` failing on the remote head. PR #439 remains separately open with Playwright E2E red; this tick continued the current PR first.
- GitHub Actions failure read-back for run `27957885688`, job `82731040101`, showed `tsc --noEmit` failing with duplicate `allSettledWithConcurrency` declarations at `apps/web/src/lib/advisory/debate-engine.ts:555` and `:591`.
- Local branch type-check passed before merging main because only the PR copy of Step 2 was present; `origin/main` already contains PR #437's Step 2 helper. This explained the remote merge-check failure.
- Merged `origin/main` into the PR branch with `--no-commit` and reproduced RED locally: `pnpm run type-check` failed with the same duplicate `allSettledWithConcurrency` declarations.
- GREEN: removed the duplicate merge-introduced copy of `allSettledWithConcurrency`, keeping a single exported helper and preserving the PR's Step 3–5 advisory changes.
- Code/merge commit: `8b781d2de fix(advisory): resolve Step 2 helper merge duplication`.

Verification / evidence:
- RED command: from `apps/web`, `pnpm run type-check` after `git merge --no-commit --no-ff origin/main` -> expected duplicate export/function implementation errors at `debate-engine.ts:555` and `:591`.
- GREEN focused regression: `pnpm vitest run src/lib/advisory/__tests__/concurrency.test.ts` -> PASS, 1 file / 4 tests.
- Focused advisory PR suite: `pnpm vitest run src/lib/advisory/__tests__/concurrency.test.ts src/lib/advisory/__tests__/partial-debate.test.ts src/lib/advisory/__tests__/re-judge.test.ts 'src/app/api/advisory/cases/[id]/start/__tests__/route.test.ts' 'src/app/api/advisory/cases/[id]/re-judge/__tests__/route.test.ts' src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx` -> PASS, 6 files / 20 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full apps/web tests: `pnpm run test` -> PASS, 386 files / 2294 tests.
- Whitespace: `git diff --check` -> PASS.
- Added-line security scan over staged + unstaged diff -> PASS, no secret-shaped findings.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains an environment configuration gate, not a code/test failure.
- Push/read-back: pushed branch `advisory-debate-f2-f4` to remote head `22356539d930fee4d3f004b1134cb568c5642a3d`; PR #440 refreshed at https://github.com/CleanExpo/Unite-Group/pull/440.
- Remote CI/read-back: CodeRabbit, Vercel Preview Comments, `Vercel – unite-group`, `Vercel – unite-group-sandbox`, `apps/web — lint, type-check, test, build`, `apps/workspace — build`, `apps/spec-board — type-check, test, build`, and `packages/pi-ceo-operator-mcp — build` passed on run `27961410763`.
- Remaining remote gate: `apps/web — Playwright E2E` failed on run `27961410763` / job `82744252233` with pre-existing non-prod E2E provisioning/configuration symptoms: multiple `createUser failed: Database error creating new user` failures plus missing `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` for an authenticated test. This slice did not touch E2E auth/provisioning and did not mutate Supabase or GitHub/Vercel secrets.

Safety / blockers:
- This tick did not approve/execute advisory recommendations, write production DB rows, apply migrations, mutate Vercel env, or merge the PR.
- Root `docs/audit-reports/` remains untracked from existing local state and was not staged.
- Local merge also brought in already-merged `origin/main` files from PR #438 / the add-on requester-redaction lane; these are mainline updates required to make PR #440 current, not new work from this tick.
- Post-push read-back was recorded locally after the evidence commit; it was not pushed as a follow-up evidence-only commit to avoid retriggering the known-red E2E lane.

Next safe lane:
- Treat PR #440's product-code gates as fixed/green and the remaining Playwright E2E failure as a separate non-prod auth/test-user provisioning gate unless fresh logs prove a code-level failure. Do not merge while the required E2E gate is red; do not mutate Vercel/GitHub/Supabase env autonomously.

## 2026-06-23 01:26 AEST

### Tick 20260623_0126 — PR #440 Playwright credential env wiring follow-through

Lane: continued already-open/current branch PR #440 (`advisory-debate-f2-f4`) because its product-code gates were green but the required `apps/web — Playwright E2E` check was red. Scope stayed inside GitHub Actions E2E env wiring, a local CI-config regression test, verification, and evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight: local branch `advisory-debate-f2-f4` was ahead of `origin/advisory-debate-f2-f4` by the prior local evidence commit; PR #440 remote head remained `22356539d930fee4d3f004b1134cb568c5642a3d`. GitHub CLI auth and Vercel CLI auth were available. Open PRs: #440 and #439, both targeting `main` and both blocked by `apps/web — Playwright E2E`; current branch PR #440 was continued first.
- Failure read-back: `gh run view 27961410763 --log-failed` showed the hosted-Chrome E2E job now reaches test execution. One failure class was a local CI workflow wiring gap: `loginAsFounder()` throws because `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` were not present in the E2E job env. Separate authenticated specs still fail at Supabase Auth `createUser` with `Database error creating new user`, which remains a non-prod DB/provisioning gate and was not mutated here.
- TDD RED: added a focused Vitest assertion in `apps/web/src/lib/ci/__tests__/playwright-config.test.ts` requiring `.github/workflows/ci.yml` to pass `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` from GitHub secrets into the E2E job. The focused test failed before the workflow change because those env lines were absent.
- GREEN: updated `.github/workflows/ci.yml` to expose only `secrets.PLAYWRIGHT_TEST_EMAIL` and `secrets.PLAYWRIGHT_TEST_PASSWORD` to the E2E job. No secret values were read, printed, hardcoded, or changed.
- Code commit: `e88a6b982 ci(e2e): forward Playwright test credentials`.

Verification / evidence:
- RED command: from `apps/web`, `./node_modules/.bin/vitest run src/lib/ci/__tests__/playwright-config.test.ts --config vitest.config.mts --testNamePattern 'passes authenticated Playwright credentials'` -> expected failure, workflow did not contain `PLAYWRIGHT_TEST_EMAIL: ${{ secrets.PLAYWRIGHT_TEST_EMAIL }}`.
- GREEN focused command: `./node_modules/.bin/vitest run src/lib/ci/__tests__/playwright-config.test.ts --config vitest.config.mts` -> PASS, 1 file / 2 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full apps/web tests: `pnpm run test` -> PASS, 386 files / 2295 tests.
- Playwright config/list probe: `CI=true ./node_modules/.bin/playwright test --list` -> PASS, listed 69 tests.
- Whitespace: `git diff --check -- .github/workflows/ci.yml apps/web/src/lib/ci/__tests__/playwright-config.test.ts` -> PASS.
- Added-line security scan over the workflow/test diff -> PASS, no hardcoded-secret/shell/eval/deserialization/sql-format findings.
- Build check: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with 0/3 critical and 0/4 required env vars configured in this local shell. No env values were read or printed; this remains a local environment configuration gate, not a code/test failure.

Safety / blockers:
- This tick only wires existing GitHub secret names into the CI E2E job; it does not create, view, approve, or mutate secrets.
- The remaining E2E `createUser failed: Database error creating new user` symptoms are still unresolved and likely require the dedicated non-prod Supabase E2E branch/test-user provisioning to be repaired by an authorised operator. No Supabase DB writes or migrations were performed.
- Root `docs/audit-reports/` remains untracked from existing local state and was not staged.
- Current local branch is synced with `origin/advisory-debate-f2-f4` at pushed head `bf55113331e27ae6fe86732e6dbb696d36506ee2` after publishing this slice.
- Post-push read-back on run `27964238946`: apps/web lint/type/test/build, workspace, spec-board, and MCP checks passed; `apps/web — Playwright E2E` failed again at job `82754287731`; CodeRabbit was still pending at the final poll. The workflow now exposes the two expected env names, but GitHub showed `PLAYWRIGHT_TEST_EMAIL:` and `PLAYWRIGHT_TEST_PASSWORD:` as blank, meaning the repo/environment secrets are not configured for this job. The same run also retained Supabase Auth `createUser failed: Database error creating new user` failures. No secret values were available or read.

Next safe lane:
- Keep PR #440 unmerged while Playwright E2E is red. The remaining blocker is now a configuration/provisioning gate: authorised operator action is needed to configure `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` GitHub secrets and repair the dedicated non-prod Supabase E2E user-provisioning path, unless a fresh bounded RED test proves a code-level defect. Do not mutate GitHub/Vercel secrets or Supabase DB autonomously.

### Tick 20260623_0216 — PR #440 CodeRabbit partial-warning follow-through

Lane: continued already-open/current branch PR #440 (`advisory-debate-f2-f4`) after CodeRabbit completed. Scope stayed inside the advisory LiveDebateTab partial-debate warning surface and existing evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight: local branch `advisory-debate-f2-f4` was synced with `origin/advisory-debate-f2-f4` at `bf55113331e27ae6fe86732e6dbb696d36506ee2`; PR #440 remained open against `main`. GitHub CLI auth was available. Open PRs: #440 and #439; current branch PR #440 was continued first.
- Remote read-back: PR #440 checks at head `bf55113331e27ae6fe86732e6dbb696d36506ee2` had apps/web lint/type/test/build, workspace, spec-board, MCP, and CodeRabbit green; `apps/web — Playwright E2E` remained red on run `27964238946` / job `82754287731` due blank E2E login secrets and Supabase Auth `createUser failed: Database error creating new user` symptoms.
- CodeRabbit follow-through: added regression coverage and a minimal LiveDebateTab fix so persisted `judge_scores.droppedFirms` renders the partial-debate warning even if `judge_scores.partial` is absent/false. This closes the integrity mismatch where persisted degraded debates could be displayed as complete.
- Design follow-through: the partial warning now uses the Scientific Luxury OLED/Cyan palette (`#050505` / `#00F5FF`) instead of amber hardcoded colours.

TDD / verification:
- RED: `pnpm run test -- 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx'` executed the suite and failed only the new regression: `Unable to find role="alert"` when persisted `droppedFirms` existed without an explicit `partial` flag.
- GREEN focused: `./node_modules/.bin/vitest run 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx'` -> PASS, 1 file / 3 tests.
- Advisory focused suite: `./node_modules/.bin/vitest run 'src/lib/advisory/__tests__/partial-debate.test.ts' 'src/lib/advisory/__tests__/re-judge.test.ts' 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx' 'src/app/api/advisory/cases/[id]/start/__tests__/route.test.ts' 'src/app/api/advisory/cases/[id]/re-judge/__tests__/route.test.ts'` -> PASS, 5 files / 17 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full apps/web tests: `pnpm run test` -> PASS, 386 files / 2296 tests.
- Whitespace and added-line security scan: `git diff --check` -> PASS; added-line scan over touched LiveDebateTab files found no hardcoded-secret/token patterns.
- Build check: `pnpm run build` failed before Next build at `scripts/validate-env.mjs --ci` because this local shell still has 0/3 critical and 0/4 required app env vars configured. No env values were read or printed; no env mutation was attempted.

Safety / blockers:
- The Playwright E2E failure is still a non-prod configuration/provisioning gate, not resolved by this UI integrity slice. Do not merge PR #440 while the required E2E check is red.
- Root `docs/audit-reports/` remains untracked from existing local state and was not staged.
- This evidence was written before commit/push of the follow-through slice; re-check branch/head and PR head before publishing.

Next safe lane:
- Commit the bounded LiveDebateTab follow-through plus evidence, push PR #440 if branch/head still matches, then monitor refreshed checks. If E2E remains red with blank secret env and/or Supabase `createUser` provisioning symptoms, keep PR #440 unmerged and classify it as an authorised operator configuration/provisioning gate.

Post-push read-back (02:23 AEST):
- Published commit `a5050c5e4 fix(advisory): honour persisted dropped-firm warnings` to PR #440.
- Remote head: `a5050c5e47718b92ded92dca0383890976608874`.
- Passed remote checks: apps/web lint/type/test/build, apps/workspace build, apps/spec-board type/test/build, packages/pi-ceo-operator-mcp build, CodeRabbit, Vercel Preview Comments, `Vercel – unite-group`, and `Vercel – unite-group-sandbox`.
- Failed remote check: `apps/web — Playwright E2E` on run `27967280733` / job `82764801038`. Failed-log sample still shows `PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set to run authenticated tests`, plus Supabase Auth `createUser failed: Database error creating new user` failures in authenticated specs. This remains an authorised non-prod E2E secret/provisioning gate; no GitHub/Vercel secret or Supabase DB mutation was attempted.
- This post-push read-back is local evidence only and is intentionally not pushed as a follow-up commit to avoid retriggering the known-red E2E lane.

## 2026-06-23 02:58 AEST

### Tick 20260623_0258 — PR #440/#439 E2E gate read-back + CRM forecast verification

Lane: continued the already-open PR lanes instead of starting a new CRM branch. Scope stayed inside read-only GitHub/Vercel/status inspection, an isolated worktree verification of PR #439's CRM opportunity forecast redaction slice, and local Margot evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight found current branch `advisory-debate-f2-f4` at `a5050c5e4`, 10 commits ahead of `origin/main`, with local-only evidence changes in `docs/margot/morning-report.md` and `docs/margot/overnight-progress-log.md`; root `docs/audit-reports/` remains untracked and unstaged.
- Current PR #440 (`advisory-debate-f2-f4`) remains open against `main`; product-code CI, workspace/spec-board/MCP, CodeRabbit, and both Vercel previews are green at remote head `a5050c5e47718b92ded92dca0383890976608874`, but required `apps/web — Playwright E2E` remains red on run `27967280733` / job `82764801038` with blank/missing `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` and Supabase Auth `createUser failed: Database error creating new user` symptoms.
- PR #439 (`fix/crm-opportunity-forecast-redaction-20260622`, https://github.com/CleanExpo/Unite-Group/pull/439) was inspected next because it is the open CRM lane. Product-code CI, workspace/spec-board/MCP, CodeRabbit, and both Vercel previews are green at head `822723a7b5d04f036f0586d4871aee798db224cb`; `apps/web — Playwright E2E` is red on run `27957820931` / job `82732714470` with the same non-prod E2E secret/provisioning gate class.
- Created isolated read-only verification worktree `/private/tmp/unite-pr439-inspect-20260623` at PR #439 head and confirmed the slice redacts sensitive approval-gated opportunity `name` / `nextAction` free text while preserving forecast/routing fields. No code changes were made in this tick.

Verification / evidence:
- `gh pr view 440 --json ...` -> PR #440 open, `mergeStateStatus=UNSTABLE`; all non-E2E checks green, E2E failed.
- `gh pr checks 439` and `gh pr view 439 --json ...` -> PR #439 open, all non-E2E checks green, E2E failed; Vercel preview statuses green.
- `gh run view 27957820931 --job 82732714470 --log-failed` -> 34 passed / 24 skipped / 11 failed in Playwright E2E; failures are missing authenticated-test env plus Supabase Auth `createUser failed` in authenticated specs. Secret values were masked by GitHub and were not read.
- Worktree install: `pnpm install --frozen-lockfile` in `/private/tmp/unite-pr439-inspect-20260623/apps/web` -> completed; local-only `node_modules` created in the temp worktree.
- Focused CRM forecast suite: `./node_modules/.bin/vitest run src/lib/crm/__tests__/opportunity-forecast.test.ts --config vitest.config.mts` -> PASS, 1 file / 6 tests.
- Type check: `pnpm run type-check` from the PR #439 worktree -> PASS.
- Lint: `pnpm run lint` from the PR #439 worktree -> PASS.
- Whitespace: `git diff --check -- apps/web/src/lib/crm/opportunity-forecast.ts apps/web/src/lib/crm/__tests__/opportunity-forecast.test.ts` -> PASS.
- Build: `pnpm run build` from the PR #439 worktree failed before Next build at `scripts/validate-env.mjs --ci` because this local shell has 0/3 critical and 0/4 required app env vars configured. No env values were read or printed; this remains a local configuration gate, not a CRM forecast code failure.

Safety / blockers:
- PRs #439 and #440 should remain unmerged unless the required E2E gate is green or explicitly waived by an authorised operator.
- The recurring E2E blocker is now an authorised GitHub/E2E secret and non-prod Supabase Auth provisioning gate. This run did not mutate secrets, Vercel env, Supabase Auth, or production data.
- Evidence remains local on the current PR #440 branch; I did not push an evidence-only docs commit because that would retrigger the known-red E2E lane without changing the blocker.

Next safe lane:
- If an operator configures the missing E2E secrets/provisioning, re-run/monitor PR #439 and #440 E2E checks and merge only when all required checks are green. If no operator action is available, continue with a fresh, tiny CRM/Margot RED-GREEN slice only from a clean main/worktree and avoid publishing more branches until the existing PR gates are resolved.

## 2026-06-23 03:36 AEST

### Tick 20260623_0336 — Open PR E2E gate read-back + keep-gated packet

Lane: continued the already-open/current PR lane instead of starting another CRM branch. Scope stayed inside read-only repo/GitHub/Vercel status inspection, canonical Margot/CRM doc read-back, local focused verification on the current PR #440 branch, and local evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight found current branch `advisory-debate-f2-f4` synced with `origin/advisory-debate-f2-f4` at `a5050c5e4`, with local-only evidence changes in `docs/margot/morning-report.md` and `docs/margot/overnight-progress-log.md`; root `docs/audit-reports/` remains untracked and unstaged.
- Open PR read-back: #440 (`advisory-debate-f2-f4`, https://github.com/CleanExpo/Unite-Group/pull/440) and #439 (`fix/crm-opportunity-forecast-redaction-20260622`, https://github.com/CleanExpo/Unite-Group/pull/439) remain open against `main` with product-code CI, workspace/spec-board/MCP checks, CodeRabbit, and both Vercel previews green.
- Remaining shared blocker: both PRs still have required `apps/web — Playwright E2E` red. PR #440 failed on run `27967280733` / job `82764801038`; PR #439 failed on run `27957820931` / job `82732714470`. The failure class remains blank/missing authenticated-test login env plus non-prod Supabase Auth `createUser failed: Database error creating new user` symptoms.
- Gate disposition prepared for Phill/operator sign-off: `KEEP_GATED` for both PRs until the authorised E2E login-secret and non-prod Supabase Auth provisioning gates are fixed or explicitly waived. This run did not attempt the gated actions.

Verification / evidence:
- `gh pr view 440 --json ...` -> head `a5050c5e47718b92ded92dca0383890976608874`, `mergeStateStatus=UNSTABLE`, all non-E2E checks green, Vercel previews green, E2E failed.
- `gh pr view 439 --json ...` -> head `822723a7b5d04f036f0586d4871aee798db224cb`, `mergeStateStatus=UNSTABLE`, all non-E2E checks green, Vercel previews green, E2E failed.
- Current-branch focused regression: `./node_modules/.bin/vitest run 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx' --config vitest.config.mts` from `apps/web` -> PASS, 1 file / 3 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Whitespace: `git diff --check` -> PASS.
- Canonical docs read-back included connected-teams operating rules, Senior PM operating model, CRM operating model, CRM schema inventory, high-level CRM forecast, lead-to-client conversion plan, and contacts/opportunities model.

Safety / blockers:
- No new production code changed in this tick, so RED/GREEN was not applicable beyond focused regression read-back of the current PR branch.
- Do not merge #439 or #440 while required E2E is red unless an authorised operator explicitly waives that gate.
- Do not mutate GitHub/Vercel secrets or Supabase Auth/DB autonomously; the remaining work is a configuration/provisioning gate, not a safe code change proven by the current evidence.
- Evidence remains local on the current PR #440 branch; I did not push an evidence-only docs commit because it would retrigger the known-red E2E lane without changing the blocker.

Next safe lane:
- If the operator configures the missing E2E login secrets and fixes non-prod Supabase Auth provisioning, re-run/monitor #439 and #440 checks and merge only when all required checks are green. If no operator action is available, the next autonomous build slice should be a fresh, tiny CRM/Margot RED-GREEN slice from a clean main/temp worktree, kept local or published only after re-checking that existing PR gates will not be worsened.

## 2026-06-23 04:09 AEST

### Tick 20260623_0409 — Open PR E2E gate unchanged; KEEP_GATED packet refreshed

Lane: continued the already-open/current PR lane instead of starting another branch. Scope stayed inside read-only repo/GitHub/Vercel status inspection, canonical Margot/CRM doc read-back, current-branch focused verification, and local evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight found current branch `advisory-debate-f2-f4` synced with `origin/advisory-debate-f2-f4` at `a5050c5e47718b92ded92dca0383890976608874`, with local-only evidence changes in `docs/margot/morning-report.md` and `docs/margot/overnight-progress-log.md`; `docs/audit-reports/` remains untracked and unstaged.
- Open PR read-back: #440 (`advisory-debate-f2-f4`, https://github.com/CleanExpo/Unite-Group/pull/440) and #439 (`fix/crm-opportunity-forecast-redaction-20260622`, https://github.com/CleanExpo/Unite-Group/pull/439) remain open against `main` with product-code CI, workspace/spec-board/MCP checks, CodeRabbit, and both Vercel previews green.
- Remaining shared blocker is unchanged: both PRs remain `UNSTABLE` because required `apps/web — Playwright E2E` is red. PR #440 failed on run `27967280733` / job `82764801038`; PR #439 failed on run `27957820931` / job `82732714470`.
- Failure signal: PR #440 E2E log reports blank `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` and authenticated-spec Supabase Auth `createUser failed: Database error creating new user`. These are non-prod E2E configuration/provisioning symptoms; no secret values were read or printed.

Verification / evidence:
- `gh pr view 439 --json ...` -> head `822723a7b5d04f036f0586d4871aee798db224cb`, `mergeStateStatus=UNSTABLE`; all non-E2E checks green, Vercel previews green, Playwright E2E failed.
- `gh pr view 440 --json ...` -> head `a5050c5e47718b92ded92dca0383890976608874`, `mergeStateStatus=UNSTABLE`; all non-E2E checks green, Vercel previews green, Playwright E2E failed.
- Current-branch focused regression: `./node_modules/.bin/vitest run 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx' --config vitest.config.mts` from `apps/web` -> PASS, 1 file / 3 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Whitespace: `git diff --check` -> PASS.
- Canonical docs read-back used tracked/current locations under `apps/empire/docs/margot/*` plus `apps/web/docs/margot/crm-contacts-opportunities-model.md` because root `docs/margot/*` source docs are not present in this checkout; root `docs/margot/` contains the progress report files.

Gate-review packet for Phill/operator:
- Gate class: `NAMESPACE` — GitHub Actions E2E namespace / repo-or-environment secret configuration plus non-prod Supabase Auth test-user provisioning. Not a production DB/data gate and not a billing/credential-value action performed by this run.
- Disposition: `KEEP_GATED` for PR #439 and PR #440.
- Lift condition: authorised operator either configures non-blank `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` for the E2E job and repairs the non-prod Supabase Auth user-provisioning path, then reruns E2E to green, or explicitly grants a typed waiver accepting the required-check risk.
- Concrete risk if lifted now: merging while required authenticated E2E is red would ship without proof that login-dependent CRM/advisory flows and non-prod auth provisioning still work, and would normalise bypassing a required gate shared by multiple PRs.
- Rollback / recovery note: no code rollback is indicated by this tick. The safe recovery path is configuration/provisioning fix + E2E rerun; if a waiver is used, keep a follow-up gate task open until E2E returns green.

Safety / blockers:
- No new production code changed in this tick, so RED/GREEN was not applicable beyond focused regression read-back of the current PR branch.
- Do not merge #439 or #440 while required E2E is red unless Phill/operator explicitly waives that gate.
- Do not mutate GitHub/Vercel secrets or Supabase Auth/DB autonomously.
- Evidence remains local on the current PR #440 branch; I did not push an evidence-only docs commit because it would retrigger the known-red E2E lane without changing the blocker.

Next safe lane:
- If authorised operator configuration happens, re-run/monitor #439/#440 and merge only when all required checks are green. If not, pause PR publication/merge work on these lanes and, on a future run, use a clean main/temp worktree for one tiny CRM/Margot RED-GREEN slice that does not worsen the existing PR gate backlog.

## 2026-06-23 04:55 AEST

### Tick 20260623_0455 — PR #440 CodeRabbit follow-through: case-scoped live warning reset

Lane: continued current/open PR #440 (`advisory-debate-f2-f4`) instead of starting another CRM lane because PR #440 is the active branch. Scope stayed inside advisory LiveDebateTab state handling, advisory route comments/tests, local verification, and evidence docs. No production DB write, migration application, Vercel/GitHub secret mutation, billing/payment action, credential value read/print, client-facing send, cross-client merge, PR merge, or live provider mutation occurred.

Completed:
- Preflight read-back found current branch `advisory-debate-f2-f4` at `a5050c5e4`, tracking `origin/advisory-debate-f2-f4`; PR #440 remains open at https://github.com/CleanExpo/Unite-Group/pull/440 with product-code/Vercel checks green and required Playwright E2E red. PR #439 remains separately open with the same E2E gate.
- Verified still-valid CodeRabbit follow-up on PR #440: `LiveDebateTab` could retain live `firm_dropped` events after switching the selected advisory case, making a complete second case inherit a stale partial-debate warning.
- TDD RED: added a focused component test that emits a live `firm_dropped` event for `case-1`, switches the mocked selected case to `case-2`, and expects the partial-debate alert to clear. It failed before production-code change with the stale `Compliance` warning still rendered under `Advisory Case Beta`.
- GREEN: added a small case-scoped reset effect in `LiveDebateTab` that clears live events and `started` state when `caseId` changes.
- Reviewer quick wins: updated the misleading start-route docstring to say the debate is awaited/synchronous within the request, and added route regression coverage for start/re-judge `500` error paths. Those 500 behaviours already existed, so the tests passed immediately and were kept as regression coverage rather than changing route behaviour.

Verification / evidence:
- RED command: `./node_modules/.bin/vitest run 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx' --config vitest.config.mts --testNamePattern 'clears live dropped-firm warnings'` -> expected failure, stale `Compliance` partial-debate alert remained after switching to `case-2`.
- GREEN focused command: same command -> PASS, 1 file / 1 test.
- Component suite: `./node_modules/.bin/vitest run 'src/components/founder/advisory/tabs/__tests__/LiveDebateTab.partial.test.tsx' --config vitest.config.mts` -> PASS, 1 file / 4 tests.
- Advisory route suites: `./node_modules/.bin/vitest run 'src/app/api/advisory/cases/[id]/start/__tests__/route.test.ts' 'src/app/api/advisory/cases/[id]/re-judge/__tests__/route.test.ts' --config vitest.config.mts` -> PASS, 2 files / 8 tests.
- Type check: `pnpm run type-check` from `apps/web` -> PASS (`tsc --noEmit`).
- Lint: `pnpm run lint` from `apps/web` -> PASS (`eslint src/`).
- Full tests with clean Linear env for tests that assert missing Linear config: `env -u LINEAR_API_KEY -u LINEAR_TOKEN pnpm run test` from `apps/web` -> PASS, 386 files / 2299 tests. A plain `pnpm run test` failed only because this shell has `LINEAR_API_KEY` set, causing three missing-Linear-config tests to exercise the configured-provider path; focused rerun with Linear env unset passed those 11 tests.
- Whitespace: `git diff --check` -> PASS.
- Added-line security scan for hardcoded secrets, shell injection, eval/exec, unsafe deserialization, and SQL string-format patterns -> PASS, no matches.
- Build: `pnpm run build` did not reach Next build because `scripts/validate-env.mjs --ci` failed closed with missing local critical/required app env. Env values were not printed or mutated; this remains a local environment configuration gate.

Safety / blockers:
- Existing remote gate remains: PR #440 and PR #439 must stay unmerged while required `apps/web — Playwright E2E` is red on blank/missing E2E login secrets plus non-prod Supabase Auth `createUser failed` provisioning symptoms, unless Phill/operator explicitly grants a typed waiver.
- The current slice does not touch E2E auth/provisioning, Supabase data, provider credentials, billing, client identity, or production deployment.
- Root `docs/audit-reports/` remains untracked and was not staged.

Next safe lane:
- Commit and push only this bounded PR #440 follow-up after branch/head read-back and reviewer check; then re-read remote checks. If no authorised E2E configuration/provisioning fix has happened, keep PR #440 `KEEP_GATED` despite the follow-up commit.
