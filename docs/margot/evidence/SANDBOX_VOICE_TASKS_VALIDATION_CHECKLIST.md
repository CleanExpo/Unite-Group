# Sandbox Voice/Task Migration Validation Checklist

Generated: 2026-06-08 14:13 AEST
Owner: Margot
Scope: `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql`

## Purpose

This is the next safe evidence packet for the `tasks` / `voice_command_sessions` sandbox-only proposal. It converts the prior vague "recover/reconstruct migrations" action into a concrete validation checklist that can be executed only after a specific sandbox authority/auth gate exists.

This checklist is local documentation only. It does not apply a migration, run sandbox status/diff/apply, touch production, read secrets, or request credentials.

## Current static evidence

- Original defining migrations for `public.tasks` and `public.voice_command_sessions` are still not present under `supabase/migrations/`.
- Reconstructed sandbox-only proposal exists: `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql`.
- Static guard exists: `tests/unit/margot-tasks-voice-migration-proposal.test.ts`.
- Latest local static verification in this Margot tick (`2026-06-08 16:25 AEST`): `bash -n scripts/sandbox-wizard.sh`; `./scripts/sandbox-wizard.sh help >/tmp/margot-sandbox-help-current.out`; `npx jest tests/unit/margot-tasks-voice-migration-proposal.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 2 suites / 31 tests passed; `npm run type-check`; `npm run security:routes-check` returned 0 unprotected mutating routes; and `git diff --check` passed.
- Sandbox wizard credential-boundary harness exists: `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`.
- Review packet exists: `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_REVIEW_PACKET.md`, classifying the lane as `static_ready_auth_blocked_sandbox_validation_not_run` and reconciling the 2026-06-06 blocked auth evidence with the 2026-06-08 local checklist.
- No sandbox apply/status/diff/sync/promote command has been run in this tick.

## Authority gate before execution

Do not execute the sandbox validation commands until all are true:

1. A specific sandbox-validation run is approved for this proposal.
2. 1Password/auth prerequisites are available without printing secrets.
3. The run is limited to sandbox project `xgqwfwqumliuguzhshwv`.
4. No production promotion is included.
5. The operator accepts that `./scripts/sandbox-wizard.sh apply ...` and `diff` are DB-writing/status actions and are not routine tick commands.

## Pre-apply local checks

Run before any sandbox apply:

```bash
bash -n scripts/sandbox-wizard.sh
./scripts/sandbox-wizard.sh help >/tmp/margot-sandbox-help-voice-tasks.out
npx jest tests/unit/margot-tasks-voice-migration-proposal.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
```

Expected result:

- Shell syntax passes.
- Wizard help renders without credential reads.
- Proposal guard and credential-boundary guard pass.
- Type-check passes.
- Route security check reports 0 unprotected mutating routes.
- Diff hygiene passes.

## Sandbox apply/diff checks — gated, not executed here

Only after the authority gate:

```bash
./scripts/sandbox-wizard.sh apply docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql
./scripts/sandbox-wizard.sh diff
```

Required evidence to collect:

- Wizard stdout/stderr with secret values redacted.
- Confirmation that sandbox ref is `xgqwfwqumliuguzhshwv`.
- Confirmation that production ref `lksfwktwtmyznckodsau` was not written.
- Schema diff summary naming only expected additive changes.
- Any advisor or validation warnings, without secrets.

## Schema validation checklist

### `public.tasks`

Validate in sandbox:

- Table exists or additive columns apply cleanly to an existing table.
- `workspace_id` exists and supports workspace-scoped reads.
- `title` remains required.
- `status` supports the voice/task route values: `todo`, `blocked`, `in_progress`, `review`, `done`, `cancelled`.
- `priority` supports route/digest values: `low`, `normal`, `medium`, `high`, `urgent`.
- `assignee_type`, `assignee_name`, `tags`, `position`, `obsidian_path`, and `obsidian_synced_at` exist.
- Legacy `project_id`, `assigned_to`, and `created_by` constraints do not break voice-created tasks when omitted by `src/app/api/pi-ceo/margot-voice/task/route.ts`.
- Indexes exist for `workspace_id`, `status`, `priority`, and `updated_at`.
- Updated-at trigger behavior exists or a follow-up trigger migration is required.
- RLS is enabled and service-role writes remain possible.
- Authenticated/user policies do not allow cross-workspace task leakage.

### `public.voice_command_sessions`

Validate in sandbox:

- Table exists with `org_id`, `user_id`, `transcript`, `parsed_intent`, `status`, `language_code`, `created_task_id`, `created_at`, and `updated_at`.
- `created_task_id` references `public.tasks(id)` with `ON DELETE SET NULL`.
- Indexes exist for `org_id`, `user_id`, and `created_at`.
- RLS is enabled.
- Service-role writes remain possible for the voice task route.
- Authenticated/user policies do not allow cross-org transcript leakage.
- Transcript retention/privacy rule is documented before production promotion.

## Route-contract validation checklist

After sandbox apply only, run local mocked gates again before any production discussion:

```bash
npx jest tests/integration/api/margot-voice-task.test.ts tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
```

Expected result:

- Voice session insert and task insert contracts still pass.
- Approval-required voice commands still create blocked/high approval tasks.
- Daily digest still reads task rows safely and labels voice-created tasks without exposing secrets.
- No new unprotected mutating route appears.

## Production promotion blockers

Production promotion remains blocked until all are true:

1. Sandbox apply succeeds.
2. Sandbox diff shows only expected additive changes.
3. RLS policies are explicitly validated for service-role writes and cross-org/workspace read prevention.
4. Legacy `tasks` constraints are reconciled without destructive changes.
5. Transcript retention/privacy rule is approved.
6. Board grants explicit production promotion authority through the sandbox wizard typed gate.

## Current classification

`static_ready_sandbox_validation_blocked`

The proposal is reconstructed and locally guarded, but it is not sandbox-validated and not production-ready.
