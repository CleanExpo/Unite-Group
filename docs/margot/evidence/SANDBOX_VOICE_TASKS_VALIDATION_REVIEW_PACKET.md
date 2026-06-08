# Sandbox Voice/Task Validation Review Packet

Generated: 2026-06-08 14:47 AEST
Owner: Margot
Scope: local-only Senior PM review of the `tasks` / `voice_command_sessions` validation lane.

## Classification

`static_ready_auth_blocked_sandbox_validation_not_run`

The reconstructed sandbox-only proposal and local safety harness are reviewable, but the lane is not sandbox-validated and not production-ready. This packet does not grant sandbox apply/diff authority and does not replace the sandbox wizard approval gate.

## Files reviewed

- `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_CHECKLIST.md`
- `docs/margot/evidence/SANDBOX_VOICE_MIGRATION_EVIDENCE_PACKET.md`
- `docs/margot/evidence/SANDBOX_VOICE_MIGRATION_AUTHORITY_AND_CREDENTIAL_PREFLIGHT.md`
- `docs/margot/evidence/SANDBOX_VOICE_MIGRATION_VERIFICATION_RESULTS.md`
- `docs/margot/evidence/SANDBOX_VOICE_MIGRATION_APPLY_EXECUTION_RESULTS.md`
- `docs/margot/crm-test-coverage-matrix.md`
- `tests/unit/margot-tasks-voice-migration-proposal.test.ts`
- `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`

## Diagnostic gate

- What exists: the sandbox-only migration proposal at `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql`, a 17-test static proposal guard, a 14-test sandbox-wizard credential-boundary guard, the 2026-06-06 blocked sandbox evidence packet, and the 2026-06-08 validation checklist.
- What has started: local proposal reconstruction, static verification, credential-boundary hardening, and evidence packaging. No sandbox apply/diff/status was executed in this tick.
- Why it was created: Margot voice-task ingestion and CRM digest task reads need a verified schema path for `tasks` and `voice_command_sessions` before production migration discussion.
- Problem/friction: prior ticks risked looping on “recover/reconstruct migrations” even though a proposal already exists; the real blocker is now sandbox authority/auth plus live sandbox validation.
- Missing: authorized sandbox apply/diff, live RLS and service-role validation, legacy `tasks` constraint review, updated-at trigger verification, transcript retention/privacy approval, and production Board promotion authority.
- Duplicated/unclear: older evidence references `op whoami` authentication as the apply blocker; newer local credential-boundary tests reduce Management API coupling but do not remove the need for a specific sandbox authority/auth gate.
- Business benefit: turns the CRM voice/task schema lane into a clean Board-reviewable readiness packet instead of another repeated status note.
- Smallest useful next action: keep this lane local until sandbox authority/auth is explicitly granted, then execute the checklist’s sandbox apply/diff commands through `scripts/sandbox-wizard.sh` only.

## Evidence matrix

| Evidence item | Status | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Static proposal guard | PASS | Proposal file exists, uses sandbox-first language, avoids destructive DDL, includes route-required fields, indexes, RLS enablement, and production approval guardrails. | It does not prove the SQL applies cleanly to the live sandbox or that policies prevent cross-org/workspace reads. |
| Sandbox-wizard credential-boundary guard | PASS | `cmd_apply` / `cmd_status` stay sandbox-credential scoped, local override parsing is inert, and dispatch routes through audited functions. | It does not prove 1Password is currently authenticated for live wizard execution or that sandbox DB operations have run. |
| 2026-06-06 authority/auth preflight | BLOCKED evidence | Approved credential names were checked without value exposure, production credential name was not requested, and the existing wizard stopped when `op whoami` was not signed in. | It does not authorize bypassing `require_op`, nor does it validate sandbox schema state. |
| 2026-06-08 validation checklist | STATIC READY | The next sandbox validation sequence is explicit and separates local pre-apply checks from gated DB-writing/status actions. | It does not constitute apply/diff evidence or production readiness. |
| Current 2026-06-08 16:25 local verification | PASS | Shell syntax, wizard help, proposal guard, credential-boundary guard, type-check, route-security inventory, and diff hygiene passed locally. | It does not touch sandbox/prod, inspect secrets, or validate live schema. |

## Current verification

```bash
bash -n scripts/sandbox-wizard.sh
./scripts/sandbox-wizard.sh help >/tmp/margot-sandbox-help-current.out
npx jest tests/unit/margot-tasks-voice-migration-proposal.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
# PASS: Jest returned 2 suites / 31 tests; TypeScript completed; route-inventory check reported 0 unprotected mutating routes; diff hygiene passed.
```

## Safety statement

No GitHub push, merge, deployment, Vercel/env mutation, sandbox apply/status/diff/sync/promote, production DB write, credential prompt/read, secret printing/storage, client-facing action, billing/payment action, external vendor/account creation, or destructive git occurred while producing this review packet.

## Next gate

Proceed only when a new run has a specific sandbox-validation authority/auth gate. The permitted DB-writing/status command shape after that gate remains:

```bash
./scripts/sandbox-wizard.sh apply docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql
./scripts/sandbox-wizard.sh diff
```

Production promotion remains blocked until sandbox apply succeeds, sandbox diff is expected/additive, RLS/service-role/cross-scope behavior is validated, transcript retention/privacy is approved, and Phill grants explicit production promotion through the wizard’s typed gate.
