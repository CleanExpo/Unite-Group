# Sandbox Wizard Credential-Boundary Review Packet

Generated: 2026-06-09 04:59 AEST
Owner: Margot
Scope: local-only review/packaging of the inherited sandbox-wizard credential-boundary diff.

## Classification

`static_ready_auth_blocked_sandbox_validation_not_run`

The local sandbox-wizard credential-boundary patch is statically reviewable and locally verified, but this packet does not grant authority to run sandbox `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote`, and it does not validate live sandbox schema state.

## Files reviewed

- `scripts/sandbox-wizard.sh`
- `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`
- `tests/unit/margot-tasks-voice-migration-proposal.test.ts`
- `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_CHECKLIST.md`
- `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_REVIEW_PACKET.md`

## Diagnostic gate

- What exists: sandbox-first governance in `CLAUDE.md`, `scripts/sandbox-wizard.sh`, a reconstructed sandbox-only `tasks` / `voice_command_sessions` proposal, a static proposal guard, a 14-test credential-boundary guard, and prior validation/review packets.
- What has started: local credential-boundary hardening and static validation. No sandbox apply/status/diff/sync/setup/promote, production promotion, secret read, or DB write occurred in this tick.
- Why it was created: sandbox-only validation was blocked because `apply` / `status` previously shared production-capable credential loading and a mandatory Management API token path.
- Problem/friction: a sandbox-only command should not import production-labelled DB credentials or require Management API access unless the sub-action actually needs it.
- Missing: a specific Board/authority gate for live sandbox validation, authenticated secret retrieval without printing values, actual sandbox apply/diff evidence, RLS/service-role validation, and transcript retention/privacy approval.
- Duplicated/unclear: prior evidence still names 1Password auth as the execution blocker; this patch narrows which credentials sandbox-only commands request but does not remove the explicit sandbox authority/auth gate.
- Business benefit: makes the next sandbox validation safer and more auditable by reducing credential blast radius before any DB-writing/status action is approved.
- Smallest useful next action: keep the patch local/static until a named sandbox-validation authority/auth grant exists, then run only the checklist-defined wizard commands through `scripts/sandbox-wizard.sh`.

## Local static review findings

| Area | Status | Evidence | Remaining limitation |
| --- | --- | --- | --- |
| Sandbox-only credential loading | PASS | `cmd_apply` and `cmd_status` call `load_sandbox_creds`, not production-capable `load_creds`. | Does not prove 1Password is signed in or that sandbox DB operations will pass. |
| Production credential separation | PASS | `load_sandbox_creds` requests `UNITE_GROUP_SANDBOX_DB_PASSWORD` and not `UNITE_GROUP_DB_PASSWORD`, `PROD_DB_PASSWORD`, `PROD_DB_URL`, or `PROD_DB_HOST`. | `setup`, `sync`, `diff`, and `promote` remain production-capable / Management-API paths and are still gated. |
| Local override parsing | PASS | `local_credential_value` reads only the requested key via a Python parser and does not `source` the override file. | It is a local parser, not shell evaluation; unsupported shell features stay intentionally inert. |
| Management API token coupling | PASS for apply/status | `cmd_status` no longer requires `SUPABASE_ACCESS_TOKEN`; `cmd_apply` skips the optional advisor when the token is absent. | Optional advisor output is skipped without token; live advisor evidence would require explicit approved token use. |
| Dispatch boundary | PASS | Dispatch remains routed through audited `cmd_apply`, `cmd_status`, and `cmd_promote` functions. | Dispatch integrity is static only; no live wizard subcommands were executed beyond help. |

## Verification

```bash
bash -n scripts/sandbox-wizard.sh
./scripts/sandbox-wizard.sh help >/tmp/margot-sandbox-help-credential-boundary.out
npx jest tests/unit/margot-tasks-voice-migration-proposal.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
# PASS at 2026-06-09 04:59 AEST: Jest returned 2 suites / 31 tests; TypeScript completed; route-inventory check reported 0 unprotected mutating routes; diff hygiene passed.
```

## Safety statement

No GitHub push, merge, PR mutation, Vercel deploy/env mutation, sandbox `apply` / `status` / `diff` / `sync` / `setup` / `reset` / `promote`, production DB write, credential prompt/read, secret printing/storage, client-facing action, billing/payment action, external vendor/account action, Nango/connector-platform action, or destructive git occurred while producing this packet.

## Next gate

`unapproved_gate_reached`: live sandbox validation remains blocked until a specific sandbox-validation authority/auth grant exists. When approved, the permitted command shape remains the checklist path:

```bash
./scripts/sandbox-wizard.sh apply docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql
./scripts/sandbox-wizard.sh diff
```

Production promotion remains blocked until sandbox validation passes, RLS/service-role/cross-scope behavior is verified, transcript retention/privacy is approved, and Phill grants explicit production promotion through the wizard’s typed gate.
