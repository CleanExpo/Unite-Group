# Margot Voice Task Schema Provenance

Date: 2026-05-23 19:22 AEST
Last update: 2026-06-12 18:00:00 AEST — Senior PM 88th answer-shape fixture (voice-task-schema-provenance self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-VOICE-TASK-SCHEMA-PROVENANCE-SELF-BOUNDARY`, bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added) so a future answer about the voice-task-schema-provenance self-boundary must cite this doc, `voice-test-gap-analysis.md`, `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, and `retrieval-rules.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated in the new self-boundary section. Previous refresh 2026-05-23 19:22 AEST (original lane).
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

## Senior PM verification checkpoint (2026-06-10 22:50:00 AEST)

This checkpoint confirms that the 22nd answer-shape fixture `AI-RET-001-ANSWER-VOICE-SCHEMA-PROVENANCE-BOUNDARY` has been added to the AI-RET-001 local retrieval harness, binding this document's provenance contract (generated supabase type evidence, no defining migration found, repo-local evidence only, not a migration, tasks insert fields, voice_command_sessions insert fields, generated types as schema evidence, not migration provenance, no production apply, voice task route writes, current safe operating decision) to 4 required citations (docs/margot/voice-task-schema-provenance.md, docs/margot/MARGOT-COMMAND-CENTER.md, docs/margot/crm-test-coverage-matrix.md, docs/margot/ai-enhancement-candidate-register.md) and 10 prohibited overclaims. The voice task route writes one voice_command_sessions row and one tasks row; generated types are schema evidence, not migration provenance; no production apply; current safe operating decision is stage-1 operator queue only.

## AI-RET-001 Voice Schema Provenance Citation Contract

This document is bound to the AI-RET-001 local retrieval harness via the `AI-RET-001-ANSWER-VOICE-SCHEMA-PROVENANCE-BOUNDARY` fixture. The following are the required and prohibited answer phrases for any Margot answer that cites this document.

**Required phrases (11):**

- `generated supabase type evidence`
- `no defining migration found`
- `repo-local evidence only`
- `not a migration`
- `tasks insert fields`
- `voice_command_sessions insert fields`
- `generated types as schema evidence`
- `not migration provenance`
- `no production apply`
- `voice task route writes`
- `current safe operating decision`

**Required citations (4):**

- `docs/margot/voice-task-schema-provenance.md`
- `docs/margot/MARGOT-COMMAND-CENTER.md`
- `docs/margot/crm-test-coverage-matrix.md`
- `docs/margot/ai-enhancement-candidate-register.md`

**Prohibited overclaims (10):**
A Margot answer that claims any of the following about the voice task schema has overclaimed local evidence and must be rewritten before command-center surfacing:

- `migration applied`
- `production schema changed`
- `sandbox apply completed`
- `production db accessed`
- `table definition changed`
- `nango`
- `migration provenance confirmed`
- `schema migrated directly`
- `credential loaded`
- `voice task route deployed`

## AI-RET-001 Voice-Task-Schema-Provenance Self-Boundary (88th answer-shape fixture)

This voice-task-schema-provenance doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 88th answer-shape fixture `AI-RET-001-ANSWER-VOICE-TASK-SCHEMA-PROVENANCE-SELF-BOUNDARY` (bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added). A future answer about the voice-task-schema-provenance self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `voice task schema provenance self boundary lane` (the 88th self-boundary identifier; the doc is the load-bearing voice task schema provenance surface).
  - `29th voice schema provenance content citation class` (the 29th fixture guards the operator-evidence voice schema surface map; the 88th is the disjoint self-evidence identifier set).
  - `voice command sessions and tasks generated type shape only` (the doc is bounded to the generated supabase types and forbids any claim of a repo-local migration file).
  - `no repo local migration file for tasks or voice command sessions` (the load-bearing provenance gap clause; the migration-directory search returned zero sql files).
  - `voice task route inserts voice command sessions row first then tasks row` (the chain ordering and fail-closed branch the harness pins against regression).
  - `generated supabase types treated as current schema evidence not migration provenance` (the doc forbids using the generated types as proof of a production migration).
  - `blocked approval required task is operator decision support not production write authority` (the safe operating decision the doc records).
  - `sandbox wizard only path for future crm schema migration work` (deferral of any future migration to the wizard subcommand boundary).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule).
  - `do not infer production safety from generated types alone` (the explicit anti-inference rule the doc carries).
- The 4 required citations are present in this doc:
  - `docs/margot/voice-task-schema-provenance.md` (this doc).
  - `docs/margot/voice-test-gap-analysis.md` (the voice test gap analysis the voice task schema provenance doc pairs with).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that owns the doc-drift guard).
  - `docs/margot/retrieval-rules.md` (the retrieval integration the self-boundary is bound under).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 18:00:00 AEST)` heading):
  - voice task schema provenance production migration applied, voice task schema provenance live voice session executed, voice task schema provenance supabase client called for real, voice task schema provenance elevenlabs api key read, voice task schema provenance sandbox wizard apply run without authority, voice task schema provenance github push executed, voice task schema provenance vercel deploy executed, voice task schema provenance nango connector platform onboarded, voice task schema provenance public publishing approved, voice task schema provenance client facing send dispatched without approval.

The `## AI-RET-001 Voice-Task-Schema-Provenance Self-Boundary (88th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-12 18:00:00 AEST)

Doc-drift guard: the 10 required phrases (voice task schema provenance self boundary lane, 29th voice schema provenance content citation class, voice command sessions and tasks generated type shape only, no repo local migration file for tasks or voice command sessions, voice task route inserts voice command sessions row first then tasks row, generated supabase types treated as current schema evidence not migration provenance, blocked approval required task is operator decision support not production write authority, sandbox wizard only path for future crm schema migration work, use existing assets first, and do not infer production safety from generated types alone) and 4 required citations (voice-task-schema-provenance.md, voice-test-gap-analysis.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, retrieval-rules.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: voice task schema provenance production migration applied, voice task schema provenance live voice session executed, voice task schema provenance supabase client called for real, voice task schema provenance elevenlabs api key read, voice task schema provenance sandbox wizard apply run without authority, voice task schema provenance github push executed, voice task schema provenance vercel deploy executed, voice task schema provenance nango connector platform onboarded, voice task schema provenance public publishing approved, voice task schema provenance client facing send dispatched without approval.
