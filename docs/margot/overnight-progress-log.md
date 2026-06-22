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
