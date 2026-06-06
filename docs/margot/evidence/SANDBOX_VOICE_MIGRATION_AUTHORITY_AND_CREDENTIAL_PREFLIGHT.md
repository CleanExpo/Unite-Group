# Sandbox Voice Migration Authority and Credential Preflight

Run ID: sandbox_voice_migration_20260606T073657Z
Generated: 2026-06-06T07:36:57Z
Workspace: /Users/phillmcgurk/Unite-Group

UGN diagnostic gate summary

- What already exists: scripts/sandbox-wizard.sh is the canonical sandbox entry point; the sandbox project ref is xgqwfwqumliuguzhshwv; the production ref is lksfwktwtmyznckodsau; the sandbox migration proposal exists at docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql; unit coverage exists at tests/unit/margot-tasks-voice-migration-proposal.test.ts.
- What has already been started: scripts/sandbox-wizard.sh has been patched so cmd_apply and cmd_status call load_sandbox_creds; the migration proposal covers tasks and voice_command_sessions; prior static validation and the unit suite pass.
- Why it was created: to validate Margot voice/task schema reconciliation in sandbox before any production approval request.
- Problem meant to solve: command-center tasks and Margot voice-task ingestion need compatible tables/columns/indexes without touching production first.
- Friction reduced: prevents blind production schema work; keeps credential boundaries explicit; produces Board-reviewable evidence.
- Missing: interactive/user-account 1Password sign-in recognised by op whoami, or an approved wizard auth compatibility patch.
- Duplicated: no alternate migration path was used; no direct psql production path was invoked.
- Unclear: whether the current op item access is service/cached access not recognised by op whoami; the patched wizard currently treats this as unauthenticated.
- Nexus benefit: preserves sandbox-first governance and protects production while making the readiness blocker concrete.
- Smallest useful next action: authenticate 1Password for op whoami or approve a sandbox-only require_op compatibility patch that accepts the already-working approved item retrieval without weakening credential-name boundaries.


## Authority grant

Board decision: approve_sandbox_apply_after_1password_authentication
Reviewer: Phill McGurk
Reviewer role: Founder / Board / Unite-Group Nexus product owner
Scope: sandbox-only credential preflight, sandbox wizard apply/status if and only if sandbox target is proven and 1Password authentication allows the patched wizard to proceed.

## Approved credential names

- SUPABASE_ACCESS_TOKEN
- UNITE_GROUP_SANDBOX_DB_PASSWORD

## Prohibited credential names and services

- UNITE_GROUP_DB_PASSWORD was not requested by this preflight.
- No production DB credentials were requested.
- No production Supabase/Vercel/Stripe/email/client credentials were requested.
- No secret values are included in this report or raw outputs.

## 1Password CLI presence and sign-in state

Evidence command summary: command -v op; op whoami; op item get for approved names only.

Result:

```
## Tooling
op: present
op_signin: not_signed_in
psql: psql (PostgreSQL) 17.4
pg_dump: pg_dump (PostgreSQL) 17.4
## Approved credential existence checks (values not printed)
SUPABASE_ACCESS_TOKEN: present; length=44; label=approved_non_production_label
UNITE_GROUP_SANDBOX_DB_PASSWORD: present; length=16; label=approved_non_production_label
## Forbidden credential request proof
UNITE_GROUP_DB_PASSWORD: not_requested_by_this_preflight
## Static sandbox wizard boundary
bash_n: pass
cmd_apply_calls_load_sandbox_creds: pass
cmd_status_calls_load_sandbox_creds: pass
load_sandbox_creds_does_not_request_prod: pass
load_sandbox_creds_requests_sandbox: pass
git_diff_check_sandbox_wizard: pass
PASS tests/unit/margot-tasks-voice-migration-proposal.test.ts
  tasks & voice_command_sessions sandbox migration proposal
    ✓ proposal file exists at the expected docs path (1 ms)
    sandbox-only safety language
      ✓ declares sandbox-first intent
      ✓ references sandbox-wizard apply script
      ✓ requires Board approval for production promotion
      ✓ does not claim production / prod / live has been applied (1 ms)
    no destructive operations
      ✓ does not contain destructive DDL
    tasks table proposal
      ✓ creates tasks table with idempotent DDL
      ✓ includes all route-required columns
      ✓ defines indexes for workspace, status, priority, and updated_at
      ✓ enables row level security
      ✓ notes that RLS policies must be validated in sandbox before prod
    voice_command_sessions table proposal
      ✓ creates voice_command_sessions table with idempotent DDL
      ✓ includes all route-required columns
      ✓ references tasks(id) with on delete set null for created_task_id
      ✓ defines indexes for org_id, user_id, and created_at
      ✓ enables row level security
      ✓ notes that RLS policies must be validated in sandbox before prod

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        0.147 s, estimated 1 s
Ran all test suites matching /tests\/unit\/margot-tasks-voice-migration-proposal.test.ts/i.

```

Interpretation:

- 1Password CLI: present.
- op whoami state: not signed in.
- Approved item retrieval: both approved credential names were retrievable without printing values.
- Patched wizard compatibility: blocked, because scripts/sandbox-wizard.sh require_op requires op whoami to pass before status/apply.

## Credential names checked

- SUPABASE_ACCESS_TOKEN: checked; present; value not printed; length only recorded in raw preflight.
- UNITE_GROUP_SANDBOX_DB_PASSWORD: checked; present; value not printed; length only recorded in raw preflight.

## Proof production credential names were not requested

The preflight script iterated only over the exact allowlist: SUPABASE_ACCESS_TOKEN and UNITE_GROUP_SANDBOX_DB_PASSWORD. It recorded: UNITE_GROUP_DB_PASSWORD: not_requested_by_this_preflight.

Static boundary assertions also confirmed load_sandbox_creds does not request op item get "UNITE_GROUP_DB_PASSWORD".

## Target classification checks

- Sandbox ref in wizard: xgqwfwqumliuguzhshwv.
- Production ref in wizard: lksfwktwtmyznckodsau.
- cmd_apply host target: db.xgqwfwqumliuguzhshwv.supabase.co through SANDBOX_REF.
- cmd_status host target: db.xgqwfwqumliuguzhshwv.supabase.co through SANDBOX_REF.
- cmd_apply and cmd_status call load_sandbox_creds, not load_creds.
- cmd_promote remains production-capable and was not invoked.

Target classification: sandbox for apply/status, based on static call-site inspection.

## Existing wizard status preflight

Command: ./scripts/sandbox-wizard.sh status
Purpose: prove whether the existing patched wizard can proceed before any apply.

stdout:

```
    Run this first:  eval $(op signin)

```

stderr:

```
[0;31m[✗][0m 1Password CLI not signed in.

```

meta:

```
command: ./scripts/sandbox-wizard.sh status
exit_code: 1
duration_seconds: 0.261

```

## Whether sandbox apply may proceed

No. Sandbox apply may not proceed in this run.

Reason: the Board approval condition is approve_sandbox_apply_after_1password_authentication. Although approved item retrieval works, the existing patched wizard's require_op gate reports 1Password CLI not signed in and exits before sandbox status/apply can run. Running apply would require bypassing or altering the existing wizard auth gate, which was not separately approved for this batch.

Stop condition reached: 1Password is not signed in in the form required by the patched wizard, so sandbox apply/status cannot proceed safely through the existing project-approved command path.
