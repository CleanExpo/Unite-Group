# Margot Voice Task Schema Provenance

Date: 2026-05-23 19:22 AEST
Owner: Margot
Project: Unite-Group
Scope: local repo evidence only. This is not a migration, not a production schema change, and not an approval to write production data.

## Purpose

Close the current local provenance gap for the Margot voice-to-task lane by documenting what is known about `tasks` and `voice_command_sessions` from repo-local evidence before any wider CRM approval, digest, or command-center automation depends on those tables.

## Evidence inspected

| Evidence | Finding |
| --- | --- |
| `src/app/api/pi-ceo/margot-voice/task/route.ts` | Voice task ingestion writes one `voice_command_sessions` row and then one `tasks` row after bearer auth, CRM env checks, packet validation, and rate limiting. |
| `types/supabase.ts` | Generated Supabase types contain both `tasks` and `voice_command_sessions`, including required insert fields and foreign-key relationships. |
| `tests/integration/api/margot-voice-task.test.ts` | Mocked route tests cover bearer auth, rate limit, missing CRM/Supabase config, invalid JSON/packet, voice session insert failure, task insert failure, successful write shape, summary truncation, defaults, and approval-required blocked task behavior. |
| `tests/integration/api/margot-voice-signed-url.test.ts` and `tests/unit/margot-voice-failure-taxonomy.test.ts` | Adjacent voice gate remains green and does not require real ElevenLabs or Supabase calls. |
| `supabase/migrations/` search | No repo-local migration file defining `tasks` or `voice_command_sessions` was found in this pass. Treat the generated types as current schema evidence, not migration provenance. |

## `voice_command_sessions` current generated type shape

Source: `types/supabase.ts` around `voice_command_sessions`.

Known row/insert fields used or relevant to Margot:

- `id`: generated UUID/string identity.
- `org_id`: required; foreign key to `organizations.id` according to generated relationship metadata.
- `user_id`: required; route uses CRM user id, CRM user email, or `phill` fallback.
- `transcript`: nullable text; route stores packet transcript.
- `parsed_intent`: nullable JSON; route stores the normalized voice packet.
- `status`: defaults available in generated insert type; route sends `todo` or `blocked`-aligned status value.
- `language_code`: insert default exists; route sends `en`.
- `orchestrator_run_id`: nullable; not currently used by the route.
- `created_at`: generated/default timestamp.

Relationship evidence:

- `voice_command_sessions_org_fk` links `org_id` to `organizations.id`.
- `voice_command_audit.session_id` references `voice_command_sessions.id` in generated types, but Margot's current voice task route does not write `voice_command_audit`.

## `tasks` current generated type shape

Source: `types/supabase.ts` around `tasks`.

Known row/insert fields used or relevant to Margot:

- `id`: generated UUID/string identity.
- `workspace_id`: required; foreign key to `workspaces.id` according to generated relationship metadata.
- `title`: required; route stores the voice packet summary truncated to 500 characters before insert.
- `description`: nullable; route stores requested outcome, route, business context, risk, approval requirement, approval reason when present, voice session id, and ElevenLabs conversation id.
- `status`: insert default exists; route sends `todo` for normal work or `blocked` for approval-required work.
- `priority`: nullable; route sends `high` for approval-required/high-risk work or `normal` otherwise.
- `assignee_type`: insert default exists; route sends `agent`.
- `assignee_name`: nullable; route sends `Margot` or `Phill approval`.
- `tags`: nullable string array; route sends `margot-voice`, business context, route, and either `approval-required` or `auto-created`.
- `position`: insert default exists; route sends `0`.
- `obsidian_path`: nullable; route sends `voice/<packet_id>`.
- `created_by`, `assignee_id`, `due_date`, `obsidian_synced_at`, `created_at`, `updated_at`: available but not currently set by the voice task route.

Relationship evidence:

- `tasks_workspace_id_fkey` links `workspace_id` to `workspaces.id`.

## Current safe operating decision

1. Keep `tasks` as the Stage 1 visible operator queue for voice-created work and approval-required work.
2. Keep `voice_command_sessions` as the Stage 1 raw/parsed voice session provenance row.
3. Do not add or apply a migration for either table from this lane; migration provenance is still missing from repo-local SQL.
4. Do not infer production safety from generated types alone. Before schema-affecting work, use the sandbox wizard path and explicit approval boundaries.
5. Do not store secrets, bearer tokens, API keys, full Board approval IDs, payment details, or cross-client private notes in task descriptions, tags, parsed intent, or voice session metadata.
6. Continue treating approval-required task rows as operator decision-support only. A blocked task is not permission for Margot to perform production DB writes, deployments, client-facing sends, billing/payment actions, cross-client merges, or permanent business-rule changes.

## Impact on next CRM lanes

- Daily digest can continue reading blocked/high `tasks` as decision-support when `UNITE_CRM_WORKSPACE_ID` is configured, and must skip task reads when workspace scope is absent.
- Command-center UI can show voice-created tasks and approval-required items after a read contract/component test exists.
- A future dedicated `crm_approvals` table should remain deferred until the triggers in `docs/margot/crm-approval-persistence-plan.md` are met.
- A future schema/migration recovery lane should try to locate the original table migrations or reconstruct a sandbox-only migration proposal; it must not apply directly to production.

## Verification on this pass

- Health check: `node_modules=present`; current branch `feat/crm-approval-lifecycle-helper`; `/Volumes` contains only `Macintosh HD`; Mac Mini SMB `445` reachable; Mac Mini SSH `22` unreachable; recovered Mac Mini directory still contains only `.gitkeep`.
- Focused voice gate passed: `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand` returned 3 suites / 28 tests passed.
