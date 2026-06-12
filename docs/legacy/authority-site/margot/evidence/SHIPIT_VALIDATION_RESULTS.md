# ShipIt Validation Results

Run timestamp (UTC): 20260606T064540Z
Target system: Pi-Dev-Ops / 2nd Brain / Margot / Agentic Unite-Group Nexus
Repo: CleanExpo/Unite-Group (canonical "Authority-Site" / Empire Command Center / Pi-CEO)
Local path: $REPO_ROOT
Live URL: https://www.unite-group.in
HEAD at validation: d1e26757f6563ffcfcbfeafe1e949bb506fc83be (== origin/main)
Working tree: clean except untracked ShipIt evidence docs + .shipit_evidence/

## Environment / dependency readiness (names only, no secrets)
- node: v22.22.3
- npm: 10.9.8
- node_modules: present (installed)
- package manager: npm (package-lock present)
- Required env var NAMES (not values): ANTHROPIC_API_KEY, VAULT_ENCRYPTION_KEY,
  SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  CRON_SECRET, FOUNDER_USER_ID (per CLAUDE.md). No secret values read or printed.

## Validation gate results (fresh run, real exit codes)
| Gate | Command | Exit | Duration | Result |
|---|---|---|---|---|
| Type-check | npm run type-check (tsc --noEmit) | 0 | 2s | PASS |
| Lint | npm run lint (eslint .) | 0 | 8s | PASS (0 errors, 918 warnings) |
| Build | npm run build (next build) | 0 | 7s | PASS (route table emitted) |
| Pipeline tests | npm run test (jest tests/pipelines) | 0 | <1s | PASS (23/23) |
| Full test suite | npm run test:all (jest) | 0 | 4s | PASS (1125 passed, 1 skipped, 144/145 suites) |
| Route security | npm run security:routes-check | 0 | <1s | PASS (0 unprotected mutating routes) |
| Whitespace | git diff --check | 0 | <1s | PASS (clean) |

## Security / safety checks
- Secret scan over tracked source: NO committed secret VALUES found.
  Matches are safe: env-var references reading from .env at runtime
  (scripts/run-wave3-backfill.sh, scripts/sandbox-wizard.sh), Stripe key
  *prefix* checks in code logic (billing/receipt, webhooks), and a deliberately
  fake/truncated token in a test fixture. No .env contents printed.
- Route inventory: 0 unprotected mutating routes (server:routes-check PASS).
- No destructive command run. No production DB write. No external client action.

## Lint warning note
918 lint warnings are all `@typescript-eslint/no-explicit-any` style warnings,
0 errors. They are non-blocking for release per the project's ESLint config
(warnings do not fail the gate). Recorded as P2 quality debt, not a ShipIt blocker.

## Evidence artifacts
- .shipit_evidence/node_npm_preflight.log
- .shipit_evidence/type_check.log
- .shipit_evidence/lint.log
- .shipit_evidence/build.log
- .shipit_evidence/pipeline_tests.log
- .shipit_evidence/full_tests.log
- .shipit_evidence/security_routes_check.log
- .shipit_evidence/diff_check.log
- .shipit_evidence/run_ts.txt

## Verdict
All safe local validation gates PASS. No failures to triage.
