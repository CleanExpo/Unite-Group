# Enquiry alerts S2a build evidence — 24/10/2026

Grounded 24/10/2026: branch feat/enquiry-alerts-20261024 starts at c6e2103e42fda7e83f65982f11fab4f8f6f11c2a; Stripe route is byte-unchanged — git diff and source-manifest.json.
Waterline: local implementation and synthetic validation only; uncommitted worktree, not released or live. The host lead commits. The manifest binds the exact changed source and contract; this is not a signed release receipt.

Built: email-only minimal lead alerts, atomic claim migration, bounded send, unchanged public response, health reconciliation, authenticated enquiry view, heartbeat gate, advisory env declarations and required privacy wording. Founder decisions override the engineering note requesting an extra business source label: the email has only first name, business, ask and link.

## Locked criteria

Each command is `/bin/zsh -f .claude/done/work/w_d12e3c3508b3/run.sh <recipe>` from this worktree. Terminal output is in C1-final.log through C7-final.log, exits in C1.exit through C7.exit.

| Criterion | Recipe | Exit | Tests / checks |
|---|---|---|---|
| C1 | tests | 0 | 7 files / 58 tests |
| C2 | types | 0 | tsc --noEmit |
| C3 | typetests | 0 | tsc type tests and 1 file / 2 Vitest type tests; no type errors |
| C4 | lint | 0 | eslint src/ |
| C5 | env | 0 | Both alert vars unset; isolated non-secret required-variable fixtures |
| C6 | heartbeat | 0 | 96 tests |
| C7 | migration | 0 | One forward migration; structural check only |

C5 uses an empty environment plus PATH and test-placeholder values for the pre-existing required variables, with a database.example.invalid URL and placeholder founder UUID. No environment file or real secret was read. The inherited bare environment run exited 1 because pre-existing CRITICAL/REQUIRED values were absent (env-initial.log); this is not an alert-variable build failure. The actual CI validator was also mutated and restored with this same fixture.

Supplemental enquiry view: 4 tests (enquiry-view-final.log). An initial Vitest CLI run silently ran the ordinary full suite: 774 files / 6,611 tests passed. It was not accepted as type-test proof; configuration now runs the two actual type tests under the locked command. Installed SDK source confirms MailService.setTimeout forwards to a client request timeout; the isolation test proves alerts use a separate five-second client without changing campaign sends.

## Mutation controls

20 actual plantings, 23 command observations (three type mutants each checked by both compilers). All red commands returned non-zero, every restored command returned zero, and every byte comparison returned zero. SQL lock/conflict controls below are expressly structural: they do not establish real database concurrency. JSON fragments, original backups and red/restored logs beside this file preserve the detailed evidence.

| AC | file | planted | command | exit_under_mutant | exit_restored | cmp |
|---|---|---|---|---|---|---|
| AC-1 | apps/web/src/app/api/leads/route.ts | Delete notify call | cd apps/web && pnpm exec vitest run src/app/api/leads/__tests__/route.test.ts -t 'alerts once only after' | 1 | 0 | 0 |
| AC-2 | apps/web/src/app/api/leads/route.ts | Remove alert try/catch | cd apps/web && pnpm exec vitest run src/app/api/leads/__tests__/route.test.ts -t 'alerts are rejected' | 1 | 0 | 0 |
| AC-2 | apps/web/src/app/api/leads/route.ts | Return 500 for a non-sent outcome | cd apps/web && pnpm exec vitest run src/app/api/leads/__tests__/route.test.ts -t 'alerts are failed' | 1 | 0 | 0 |
| AC-2 | apps/web/src/app/api/leads/route.ts | Remove the six-second route cap | cd apps/web && pnpm exec vitest run src/app/api/leads/__tests__/route.test.ts -t 'alerts are never' | 1 | 0 | 0 |
| AC-3 | apps/web/src/lib/notifications/lead-alert.ts | Put first name into audit title | cd apps/web && pnpm exec vitest run src/lib/notifications/__tests__/lead-alert.test.ts -t 'sends only first name' | 1 | 0 | 0 |
| AC-5 | apps/web/src/lib/notifications/lead-alert.ts | Log provider error.message | cd apps/web && pnpm exec vitest run src/lib/notifications/__tests__/lead-alert.test.ts -t 'provider failure is safe' | 1 | 0 | 0 |
| AC-6 | apps/web/src/app/api/leads/route.ts | Delete notify call before reconciliation | cd apps/web && pnpm exec vitest run src/lib/notifications/__tests__/lead-alert.test.ts -t 'reconciles the real POST' | 1 | 0 | 0 |
| AC-7 | apps/web/src/lib/notifications/lead-alert.ts | Widen dedup window from 60 to 1440 minutes | cd apps/web && pnpm exec vitest run src/lib/notifications/__tests__/lead-alert.test.ts -t '90 minutes' | 1 | 0 | 0 |
| AC-6 | apps/web/src/app/api/health/alerts/route.ts | unconfigured-not-failed | cd apps/web && pnpm exec vitest run src/app/api/health/alerts/__tests__/route.test.ts | 1 | 0 | 0 |
| AC-6 | apps/web/src/app/api/health/alerts/route.ts | window-24-hours | cd apps/web && pnpm exec vitest run src/app/api/health/alerts/__tests__/route.test.ts | 1 | 0 | 0 |
| AC-7 | apps/web/supabase/migrations/20261024090000_alert_delivery_log.sql | no-advisory-lock | cd apps/web && pnpm exec vitest run src/app/api/health/alerts/__tests__/migration.test.ts | 1 | 0 | 0 |
| AC-7 | apps/web/supabase/migrations/20261024090000_alert_delivery_log.sql | no-conflict-handling | cd apps/web && pnpm exec vitest run src/app/api/health/alerts/__tests__/migration.test.ts | 1 | 0 | 0 |
| AC-15 | apps/web/src/app/api/health/alerts/route.ts | checkout-reconciliation-early | cd apps/web && pnpm exec vitest run src/app/api/health/alerts/__tests__/route.test.ts | 1 | 0 | 0 |
| AC-13 | scripts/nexus-heartbeat.mjs | 503-allowed | node --test scripts/__tests__/nexus-heartbeat.test.mjs | 1 | 0 | 0 |
| AC-13 | scripts/nexus-heartbeat.mjs | unalerted-bypass | node --test scripts/__tests__/nexus-heartbeat.test.mjs | 1 | 0 | 0 |
| AC-9 | apps/web/src/lib/notifications/index.ts | legacy-return-type | pnpm run type-check:tests | 2 | 0 | 0 |
| AC-9 | apps/web/src/lib/notifications/index.ts | legacy-return-type | pnpm exec vitest run --typecheck.only | 1 | 0 | 0 |
| AC-3 | apps/web/src/lib/notifications/lead-alert.ts | payload-email | pnpm run type-check:tests | 2 | 0 | 0 |
| AC-3 | apps/web/src/lib/notifications/lead-alert.ts | payload-email | pnpm exec vitest run --typecheck.only | 1 | 0 | 0 |
| AC-3 | apps/web/src/lib/notifications/lead-alert.ts | payload-surname | pnpm run type-check:tests | 2 | 0 | 0 |
| AC-3 | apps/web/src/lib/notifications/lead-alert.ts | payload-surname | pnpm exec vitest run --typecheck.only | 1 | 0 | 0 |
| AC-9 | apps/web/scripts/validate-env.mjs | alert-env-required | pnpm exec vitest run src/lib/notifications/__tests__/alert-env.test.ts | 1 | 0 | 0 |
| AC-9 | apps/web/scripts/validate-env.mjs | alert-env-required (actual CI validator) | node scripts/validate-env.mjs --ci (sanitised required-variable fixtures; alerts unset) | 1 | 0 | 0 |

## Acceptance boundary and risks

| AC | Local status / held reason |
|---|---|
| AC-1–7 | Local unit/integration checks and red controls recorded above. AC-7 real SQL concurrency remains unproven. |
| AC-8 | NOT RUN — S2b checkout alerts excluded. |
| AC-9 | Static, type and env checks pass, including actual type tests and both compiler red controls. |
| AC-10 | NOT RUN — explicitly excluded live/Supabase branch gate. No database branch was created, no SQL applied, no drift command or production probe attempted. Responding local PostgreSQL ports had unknown ownership and were not used. |
| AC-11 | NOT RUN — human-gated preview mailbox, configuration and delivery proof. |
| AC-12 | NOT RUN — S2b and human-gated Stripe endpoint/test events. |
| AC-13 | Local heartbeat suite and two planted red runs verified. No issue or email sent. |
| AC-14 | NOT RUN — human-gated production promotion and enquiry proof. |
| AC-15 | Local checkout-exclusion tests pass; signed-event adapter is mocked; Stripe implementation unchanged. |

The six-second cap aborts DB work and records a fixed TimeoutError console classification. If the cap interrupts the final DB write, its claim remains pending and health counts it as failed after 15 seconds. Immediate persistence of failed cannot be guaranteed once the database deadline has expired; this uses the spec's pending reconciliation fallback. A provider-accepted email is not proof of delivery. Real claims/RLS/concurrency and native timeout operation still require the held database/preview gates. No delivery or spend was attempted.

The enquiry detail view was added because the inspected tree had no CRM lead view: /founder/leads/[id] verifies the cookie user, matches the configured founder, validates the UUID and queries the founder-scoped record. This is the smallest addition that supplies the required usable alert link. No public detail endpoint was introduced.

Dependency repair: the worktree initially had only a partially populated .pnpm store and no top-level package links. Offline frozen installs were stopped after stalled package imports. Exact lockfile package links were restored locally; Next.js 16.4.2 was APFS-cloned from the already installed identical version in the canonical checkout, without modifying it. The existing eslint plugin hoist was restored locally. No dependency, lockfile or package version changed and nothing was downloaded.

## Review and handoff

One built review round: a read-only independent agent inspected health, SQL, the enquiry view and privacy wording; another inspected notification claim/send behaviour. No new blockers were reported; the notification reviewer identified the timeout persistence limit above. These are local code review observations, not signed release receipts. No further plan review was performed.

Files reviewed: spec.md revision 5 and engineering.md; root CLAUDE.md and SOURCE-OF-TRUTH.md; web conventions; notification router, legacy sender and tests; leads route/tests; SendGrid installed implementation/types; grow packages/card editions; env validator; heartbeat/workflow/tests; privacy policy; relevant CRM policies and web migration location; cron authentication and founder/cookie/service client helpers. Source-manifest.json records exact hashes of the final changed files and locked inputs.

Files changed (reconciled 25/10/2026 against the merged work; the original build-time list was stale). Merged in #1234 (commit 0eb4bb8c), excluding this directory:

- `.github/workflows/nexus-heartbeat.yml`
- `apps/web/package.json`
- `apps/web/scripts/validate-env.mjs`
- `apps/web/scripts/verify-claim-alert-sql.mjs`
- `apps/web/src/app/(founder)/founder/leads/[id]/__tests__/page.test.ts`
- `apps/web/src/app/(founder)/founder/leads/[id]/page.tsx`
- `apps/web/src/app/api/founder/leads/[id]/erase-alert-data/__tests__/route.test.ts`
- `apps/web/src/app/api/founder/leads/[id]/erase-alert-data/route.ts`
- `apps/web/src/app/api/health/alerts/__tests__/route.test.ts`
- `apps/web/src/app/api/health/alerts/route.ts`
- `apps/web/src/app/api/leads/__tests__/route.test.ts`
- `apps/web/src/app/api/leads/route.ts`
- `apps/web/src/app/privacy-policy/__tests__/erasure-wording.test.tsx`
- `apps/web/src/app/privacy-policy/page.tsx`
- `apps/web/src/lib/integrations/sendgrid.ts`
- `apps/web/src/lib/notifications/__tests__/alert-env.test.ts`
- `apps/web/src/lib/notifications/__tests__/lead-alert.test.ts`
- `apps/web/src/lib/notifications/__tests__/notify.test-d.ts`
- `apps/web/src/lib/notifications/__tests__/sendgrid-suppression.test.ts`
- `apps/web/src/lib/notifications/__tests__/sendgrid-timeout.test.ts`
- `apps/web/src/lib/notifications/dedup-key.ts`
- `apps/web/src/lib/notifications/index.ts`
- `apps/web/src/lib/notifications/lead-alert.ts`
- `apps/web/src/lib/notifications/sendgrid-suppression.ts`
- `apps/web/supabase/migrations/20261025000000_alert_erasure.sql`
- `apps/web/tsconfig.typetest.json`
- `apps/web/vitest.config.mts`
- `scripts/__tests__/nexus-heartbeat.test.mjs`
- `scripts/nexus-heartbeat.mjs`

Merged earlier in #1222 (commit f7cf7ad0), already applied in production and not changed by #1234:

- `apps/web/supabase/migrations/20261024090000_alert_delivery_log.sql`
- `apps/web/src/app/api/health/alerts/__tests__/migration.test.ts`

Anything changed after 0eb4bb8c is recorded by its own commit, not here. Raw run logs and plan-round review notes named above were dropped from the branch and stay on the Mini.

Recommended next step: host lead reviews and commits locally, then keeps the required two-part rollout: migration alone through AC-10 database-branch approval first, followed by code only after the table is confirmed through the approved path. Preview and production configuration and proof stay human-gated. This lane did not commit, push, open a PR, deploy, change Vercel settings or edit the locked work directory.

Final read-only evidence audit: all 26 manifest hashes match current bytes; C1-C7 exit files and terminal logs agree; all 23 mutation table observations match the four JSON fragments; AC-10/11/12/14 NOT RUN boundaries confirmed.
