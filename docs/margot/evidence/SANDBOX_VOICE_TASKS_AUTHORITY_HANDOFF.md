# Sandbox Voice/Task Authority Handoff

Generated: 2026-06-09 11:11 AEST
Owner: Margot
Scope: local-only Board/operator handoff for the `tasks` / `voice_command_sessions` sandbox validation lane.

## Classification

`ready_for_specific_sandbox_authority_auth_gate`

This packet packages the existing static evidence into the smallest actionable authority handoff. It does not run sandbox `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote`; it does not read credentials; it does not write sandbox or production data.

## Decision this handoff supports

Approve or decline one narrow future sandbox validation run for:

`docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql`

If approved later, the run should be limited to sandbox project `xgqwfwqumliuguzhshwv` and must exclude production promotion, Vercel deploys, env mutation, GitHub push/merge/PR mutation, client-facing sends, public publishing, credential printing, and new vendors.

## Existing evidence bundled by reference

| Evidence | Current status | Path |
| --- | --- | --- |
| Sandbox-only SQL proposal | Static ready, not sandbox-applied | `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql` |
| Validation checklist | Static ready, execution gated | `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_CHECKLIST.md` |
| Review packet | `static_ready_auth_blocked_sandbox_validation_not_run` | `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_REVIEW_PACKET.md` |
| Credential-boundary review | Static ready, sandbox validation not run | `docs/margot/evidence/SANDBOX_WIZARD_CREDENTIAL_BOUNDARY_REVIEW_PACKET.md` |
| Proposal static guard | PASS in latest local gate | `tests/unit/margot-tasks-voice-migration-proposal.test.ts` |
| Sandbox wizard credential-boundary guard | PASS in latest local gate | `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts` |

## Diagnostic gate

- What exists: local proposal, checklist, review packets, credential-boundary patch/tests, CRM test matrix, progress/morning surfaces, and sandbox-first wizard governance.
- What has already started: local static proposal reconstruction, credential-boundary hardening, and evidence packaging only.
- Why it was created: Margot voice task ingestion and CRM digest task reads need a verified schema path for `tasks` and `voice_command_sessions` before production migration can be discussed.
- Problem/friction reduced: the next operator does not need to rediscover which authority is missing; the missing gate is now a single named sandbox validation grant plus authenticated secret retrieval without value exposure.
- What is missing: explicit sandbox validation authority/auth, actual sandbox apply/diff evidence, RLS/service-role/cross-scope checks, transcript retention/privacy approval, and production promotion authority.
- What is duplicated/unclear: older packets mention `op whoami` auth blockage; newer credential-boundary work reduces credential blast radius for sandbox `apply` / `status` but does not authorize execution.
- Business benefit: moves the lane from repeated status-looping to a Board-ready action packet while keeping all DB-writing actions gated.
- Smallest useful next action: if authority is later granted, run only the pre-apply local checks, then the two sandbox wizard commands below, then record evidence; otherwise continue local-only CRM/retrieval evidence work.

## Future command envelope after explicit authority only

Pre-apply local checks:

```bash
bash -n scripts/sandbox-wizard.sh
./scripts/sandbox-wizard.sh help >/tmp/margot-sandbox-help-voice-tasks.out
npx jest tests/unit/margot-tasks-voice-migration-proposal.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
```

Sandbox actions, only after the authority/auth gate:

```bash
./scripts/sandbox-wizard.sh apply docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql
./scripts/sandbox-wizard.sh diff
```

Do not run `setup`, `sync`, `status`, `reset`, or `promote` unless separately authorized for that exact action.

## Evidence required from the future sandbox run

- Sandbox ref shown as `xgqwfwqumliuguzhshwv`.
- Production ref `lksfwktwtmyznckodsau` not written.
- Wizard output captured with no secret values.
- Apply result captured.
- Diff result captured and classified as expected/additive or blocked.
- `tasks` checks: required fields, route-supported statuses/priorities, legacy constraints, indexes, updated-at behavior, RLS enabled, service-role write path, and no cross-workspace authenticated read leakage.
- `voice_command_sessions` checks: route-required fields, task FK with `ON DELETE SET NULL`, org/user/created indexes, RLS enabled, service-role write path, no cross-org transcript leakage.
- Post-apply local route-contract gate run before any production discussion.

## Stop conditions

Stop immediately and record `unapproved_gate_reached` or `blocked_with_evidence` if any of these occur:

- Sandbox authority/auth is absent or ambiguous.
- The wizard asks for production promotion or typed production confirmation.
- The run would require printing, storing, or manually entering secrets into repo/docs/logs.
- The schema diff is destructive, broad, or unrelated to `tasks` / `voice_command_sessions`.
- RLS/service-role/cross-scope behavior cannot be verified.
- Transcript retention/privacy remains unapproved for production promotion.

## Safety statement for this packet

This handoff is documentation-only. No sandbox apply/status/diff/sync/setup/reset/promote, production DB write, credential read, secret printing/storage, GitHub push/merge/PR mutation, Vercel deploy/env mutation, provider polling/mutation, client-facing action, billing/payment action, new vendor/account action, Nango/connector-platform action, or destructive git occurred while producing it.
