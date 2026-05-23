# Margot Command Center

Date: 2026-05-23
Project: Unite-Group
Root: `/Users/phillmcgurk/Unite-Group`

## Status

Margot is present in the Unite-Group repo as a voice-first operator surface with three connected layers:

1. UI voice panel in the command center.
2. ElevenLabs signed-session API.
3. Voice packet to CRM task ingestion API.

Margot is now also pinned as the Senior Project Manager for the Unite-Group operating system. The canonical Connected Teams rulebook is:
`docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`

The canonical Senior PM model is:
`docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`

That mandate expands Margot's control surface beyond voice/CRM into portfolio oversight, client 2nd Brain, marketing strategy, Hermes-powered continuous enhancement, and AI/LLM/integration improvement toward the $2B business target.

The Mac Mini recovery path is approved by Phill, but the current MacBook session has not yet authenticated to the Mac Mini file share or SSH service. Local reconstruction is therefore active while recovery continues.

## Local Margot Surfaces

### Voice UI

File:
`src/components/command-center/voice/MargotVoicePanel.tsx`

Purpose:
- Presents the “Talk to Margot” command-center surface.
- Uses ElevenLabs ConvAI widget embed.
- Requests signed voice sessions from `/api/pi-ceo/margot-voice/signed-url`.
- Presents safe operator-facing errors through the failure taxonomy.

### Failure handling

File:
`src/components/command-center/voice/failure-taxonomy.ts`

Purpose:
- Converts backend/network/auth failures into safe operator messages.
- Handles rate limits, auth failures, missing config, upstream errors, and network errors.
- Keeps secrets out of user-facing error copy.

### ElevenLabs signed URL endpoint

File:
`src/app/api/pi-ceo/margot-voice/signed-url/route.ts`

Purpose:
- Admin-gated endpoint for creating a signed ElevenLabs conversation URL.
- Rate-limited under the `margot-voice-signed-url` key.
- Requires:
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_MARGOT_AGENT_ID`
- Calls ElevenLabs `get-signed-url` with `include_conversation_id=true`.
- Fails closed with:
  - `rate_limited`
  - admin auth response
  - `elevenlabs_not_configured`
  - `elevenlabs_signed_url_failed`
  - `elevenlabs_unreachable`

### Voice-to-CRM task endpoint

File:
`src/app/api/pi-ceo/margot-voice/task/route.ts`

Purpose:
- Accepts voice packets from Margot and creates CRM task records.
- Bearer-token protected with timing-safe comparison.
- Rate-limited under `margot-voice-task-create`.
- Requires:
  - `UNITE_CRM_INGEST_TOKEN`
  - `UNITE_CRM_ORG_ID`
  - `UNITE_CRM_WORKSPACE_ID`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Writes:
  - `voice_command_sessions`
  - `tasks`
- Assigns non-approval work to `Margot`.
- Assigns approval-required work to `Phill approval` and marks it blocked.

### Semantic retrieval wrapper

File:
`scripts/margot-semantic-search-wrapper.ts`

Purpose:
- Defines the Margot-facing semantic search tool wrapper.
- Uses a similarity threshold around `0.76`.
- Intended to let Margot use 2nd Brain retrieval before falling back to slower file/API searches.

## Tests Present

- `tests/integration/api/margot-voice-signed-url.test.ts`
- `tests/integration/api/margot-voice-task.test.ts`

Current verification state:
- `node_modules` is present from the prior `npm ci` readiness pass.
- CRM create timeline write-hook fix passed at `2026-05-23 14:33 AEST`: contact/opportunity create routes now treat `agent_actions` timeline writes as best-effort, contact create uses explicit service-role select columns, approved/won opportunity tests assert both timeline inserts, focused tests returned 2 suites / 25 tests passed, expanded CRM matrix returned 10 suites / 64 tests passed, `npm run type-check` passed, and `npm run security:routes-check` returned 0 unprotected mutating routes. The local fix commit and docs evidence commit are not pushed because GitHub transport is unauthenticated in the cron shell.
- CRM daily digest workspace-scope fix passed at `2026-05-23 10:41 AEST`: `tasks` reads are skipped unless `UNITE_CRM_WORKSPACE_ID` is configured, scoped with `.eq('workspace_id', process.env.UNITE_CRM_WORKSPACE_ID)` when present, and covered by the focused 3-suite gate returning 15 tests passed.
- Focused Margot voice tests passed again at `2026-05-23 06:29 AEST`: 3 suites passed, 28 tests passed.
- CRM schema inventory lane verification passed at `2026-05-23 07:36 AEST`: `docs/margot/crm-schema-inventory.md` exists, spec compliance review PASS, code/doc quality review APPROVED, and `npm run type-check` passed.
- Senior PM documentation lanes E-H verification passed at `2026-05-23 07:33 AEST`: `project-portfolio-index.md`, `client-second-brain-model.md`, `marketing-strategy-operating-model.md`, and `ai-enhancement-pipeline.md` exist with repo-local evidence and explicit unknowns.

## Linear Operating Queue

### Live Linear watch

Margot has access to the parent-Hermes-pushed Unite-Group Linear intake via:
`docs/margot/linear-watch-today.md`

Use that file as today's live Linear task-list mirror before selecting or sequencing work. It is generated from the Linear `UNI` team and contains the current active/todo/urgent backlog candidates plus issue links and description excerpts.

### Active

`UNI-2054` — Maintain Margot Command Center and RestoreAssist Content Index

Status from Linear context:
- In Progress
- Owner: Margot
- Route: Unite-Group operating system + RestoreAssist content index
- Project: Brand OS Production Board

Referenced outputs:
- `/Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md`
- `/Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md`

Governance:
- Keep statuses current.
- Record missing files and blocked decisions.
- Keep parked Toby/Duncan work out of RestoreAssist / Brand OS workflow.

### Queued / blocked

`UNI-2053` — Create CCW product category copy

Status from Linear context:
- Todo
- Owner: Margot
- Route: Unite-Group / CCW CRM

Blocker:
- First product category topic needed.

Governance:
- Do not mix CCW with RestoreAssist/Synthex/DR-NRPG/CARSI contexts.
- Source client identity from registry before drafting.

## Retrieval Policy

Margot should follow the unified retrieval rules from UNI-2052:

1. Semantic search first.
2. File reads second.
3. File/content search third.
4. Linear API fourth for active queue/status.
5. Web search last.

Confidence thresholds:
- `> 0.8`: use directly.
- `0.6–0.8`: verify with another source.
- `< 0.6`: fall back.

Detailed local policy:
`docs/margot/retrieval-rules.md`

## Mac Mini Recovery

Approved by Phill.

Known host:
`phills-mac-mini.local`

Observed status:
- Prior probes showed Bonjour resolution and SMB/File Sharing reachability.
- Probe at `2026-05-23 05:49:39 AEST` found both SMB/File Sharing port 445 and SSH port 22 unreachable from this MacBook session.
- Latest probe at `2026-05-23 06:22 AEST`: `phills-mac-mini.local` resolves, SMB/File Sharing port `445` is reachable, SSH/Remote Login port `22` still times out, and no authenticated SMB volume is mounted under `/Volumes`.
- Noninteractive SMB listing failed with authentication errors in prior attempts; do not embed credentials or print secrets.

Recovery status file:
`docs/margot/mac-mini-recovery-status.md`

Safe destination when recovered:
`docs/margot/recovered-from-mac-mini/`

## Health Check Snapshot

Timestamp:
`2026-05-23 13:25 AEST`

Git state:
- branch: `feat/margot-crm-daily-digest-route`
- head during this tick: `c03b953 docs: record Margot health check refresh`
- working tree changed locally for CRM activity/timeline `agent_actions` insert mapping and Margot handoff docs; no destructive git action taken.

Dependency state:
- `node_modules=present`
- `package-lock.json=present`

Verification:
- CRM timeline mapping lane passed at 2026-05-23 13:25 AEST: local policy pins existing `agent_actions` as the first CRM timeline persistence target, defers any new dedicated timeline-table migration until query/RLS needs are proven, and keeps route-write follow-up scoped to sanitized audit events.
- `src/lib/crm/activity-timeline.ts` now maps defensively sanitized CRM timeline events to `agent_actions` insert payloads with `crm_timeline_<event_type>` action types, `done` vs `pending` status semantics, null UUID link fields unless explicitly resolved, and no Board approval ID, contact PII, token, API-key, bearer-token, IP, address, or secret-like metadata persistence.
- Focused activity timeline verification passed at 2026-05-23 13:25 AEST and was re-run after sanitizer hardening: `npx jest tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 1 suite, 5 tests passed.
- `npm run type-check` passed at 2026-05-23 13:25 AEST.
- Activity/timeline taxonomy lane passed at 2026-05-23 12:42 AEST: `src/lib/crm/activity-timeline.ts` now normalizes lead captured, lead qualified, lead converted, contact created, opportunity created, approval requested, task completed, and integration stale events into safe CRM timeline entries, rejects unknown event types/missing identity, and redacts token/secret/password/authorization/API-key/Board-approval-id metadata variants.
- Focused activity taxonomy TDD evidence: `npx jest tests/unit/lib/crm/activity-timeline.test.ts --runInBand` failed RED before implementation because the module did not exist; reviewer-requested sanitizer hardening then failed RED on sensitive key variants before passing GREEN with 1 suite / 3 tests passed.
- Expanded CRM matrix gate passed at 2026-05-23 12:42 AEST: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 10 suites, 60 tests passed.
- `npm run type-check` passed at 2026-05-23 12:42 AEST.
- `npm run security:routes-check` passed at 2026-05-23 12:42 AEST: route inventory found 0 unprotected mutating routes.
- Opportunity digest integration passed at 2026-05-23 11:42 AEST: `src/app/api/crm/daily-digest/route.ts` can now include open/won/blocked `crm_opportunities` rows in the daily digest only when `UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED=true`, maps safe select columns into opportunity priorities/approvals, and returns `crm_digest_opportunities_read_failed` on enabled read failure.
- Focused daily digest route verification passed at 2026-05-23 11:42 AEST: `npx jest tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 1 suite, 10 tests passed.
- Expanded focused CRM matrix gate passed at 2026-05-23 11:42 AEST: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 9 suites, 57 tests passed.
- `npm run type-check` passed at 2026-05-23 11:42 AEST.
- `npm run security:routes-check` passed at 2026-05-23 11:42 AEST: route inventory found 0 unprotected mutating routes.
- Guarded opportunities create route passed TDD/review at 2026-05-23 11:29 AEST: `src/app/api/crm/opportunities/route.ts` inserts forecast-only `crm_opportunities` rows behind admin auth, approval guards for won/conversion-like states, explicit safe select columns, value-currency defaults, and hardened `additionalData` validation.
- Expanded focused CRM matrix gate passed at 2026-05-23 11:29 AEST: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 9 suites, 55 tests passed.
- `npm run type-check` passed at 2026-05-23 11:29 AEST.
- `npm run security:routes-check` passed at 2026-05-23 11:29 AEST: route inventory found 0 unprotected mutating routes.
- `docs/margot/crm-test-coverage-matrix.md` now records the opportunities create API coverage and next safe gaps.
- `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` passed at 2026-05-23 10:30 AEST: 3 suites, 14 tests. This re-verifies the current read-only daily digest route after the latest local doc commit.
- `npm run type-check` passed at 2026-05-23 10:30 AEST.
- `npm run security:routes-check` passed at 2026-05-23 10:30 AEST: route inventory found 0 unprotected mutating routes.
- `npx jest tests/integration/api/crm-daily-digest.test.ts --runInBand` passed at 2026-05-23 10:01 AEST: 1 suite, 7 tests. This includes the new blocked/high CRM task inclusion and safe task-read failure coverage.
- `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` passed at 2026-05-23 10:01 AEST: 3 suites, 14 tests. This verifies the current daily digest route now includes blocked/todo CRM task rows as well as recent leads.
- `npm run type-check` passed at 2026-05-23 10:01 AEST.
- `npm run security:routes-check` passed at 2026-05-23 10:01 AEST: route inventory found 0 unprotected mutating routes.
- `npm run build` remains blocked in this local cron environment after successful compilation because existing `/api/search/nexus` page-data collection requires configured Supabase URL/env.
- `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` passed at 2026-05-23 09:24 AEST: 3 suites, 12 tests.
- `npm run type-check` passed at 2026-05-23 09:24 AEST.
- `npm run security:routes-check` passed at 2026-05-23 09:24 AEST: route inventory found 0 unprotected mutating routes.
- `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand` passed: 3 suites, 28 tests.
- `docs/margot/crm-schema-inventory.md` passed spec compliance and code/doc quality review.
- `test -f` verification passed for the four Senior PM docs: `docs/margot/project-portfolio-index.md`, `docs/margot/client-second-brain-model.md`, `docs/margot/marketing-strategy-operating-model.md`, and `docs/margot/ai-enhancement-pipeline.md`.
- `npx jest tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts --runInBand` passed at 2026-05-23 07:35 AEST: 2 suites, 9 tests.
- `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` passed at 2026-05-23 08:07 AEST: 4 suites, 19 tests.
- `npm run type-check` passed after the CRM lead visibility / qualification verification lane.
- `npm run type-check` passed after the guarded lead-to-client conversion approval-gate lane.
- `npm run type-check` passed after the documentation lane: `tsc --noEmit` completed.
- Daily CRM digest helper/template verification passed at 2026-05-23 08:51 AEST: focused digest test passed (1 suite / 2 tests), CRM digest regression passed (4 suites / 17 tests), and `npm run type-check` passed.

Mac Mini recovery probe:
- `/Volumes` only contains `Macintosh HD`; no authenticated Mac Mini share is mounted.
- Latest 2026-05-23 13:25 AEST probe: `phills-mac-mini.local:445` is reachable.
- Latest 2026-05-23 13:25 AEST probe: `phills-mac-mini.local:22` is unreachable.
- `docs/margot/recovered-from-mac-mini/` exists with only `.gitkeep`; no recovered artifacts yet.

## High-Level CRM Forecast

Phill has clarified that Margot must treat Unite-Group as a high-level CRM operating system and forecast the missing pieces instead of waiting for perfect requirements.

New roadmap:
`docs/margot/high-level-crm-25-step-forecast.md`

2nd Brain carry-forward directive:
`docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`

The carry-forward directive pins the High-Level CRM forecast into future Margot tasks. For any future Unite-Group CRM/Margot/Command Center task, Margot must first consider the CRM operating loop, what can be discovered independently, what requires Phill's business judgment, and whether the task should update operating-model, schema-inventory, progress, or retrieval docs.

Current CRM/data foundations confirmed in the repo:
- `nexus_clients` as the current client spine.
- `agent_actions` as the audit/action spine.
- Integration mirror tables for GitHub, Vercel, Railway, DigitalOcean, Supabase, 1Password names-only, Linear, Stripe, and Composio.
- Client create/update routes under `src/app/api/empire/clients/`.
- Client activity and Business 360 read helpers under `src/lib/empire/`.
- Margot voice task ingress under `src/app/api/pi-ceo/margot-voice/task/route.ts`.
- Lead intake at `src/app/api/marketing/leads/route.ts`, now locally wired to `crm_leads` with migration/test evidence; target Supabase migration application still requires sandbox-first workflow and approval before production.

Core CRM gap:
The repo has strong CRM ingredients, but not yet the canonical operating loop: object model, source-of-truth matrix, identity resolution, lead persistence, lead-to-client conversion, contact/opportunity/task models, sync conflict rules, and daily operator digest.

## Senior PM Documentation Lanes

The remaining local documentation lanes from the multi-day CRM build plan are now present:

- Project portfolio index: `docs/margot/project-portfolio-index.md`
- Client 2nd Brain model: `docs/margot/client-second-brain-model.md`
- Marketing strategy operating model: `docs/margot/marketing-strategy-operating-model.md`
- AI enhancement pipeline: `docs/margot/ai-enhancement-pipeline.md`

These docs provide the repo-local control surfaces for project oversight, durable client/business memory, CRM-connected marketing strategy, and safe AI/LLM/integration evaluation. They mark live/external status unknown where this doc lane did not verify providers.

## CRM Contacts / Opportunities Proposal

The next identity and commercial pipeline layer is now drafted locally:

- Contacts/opportunities model: `docs/margot/crm-contacts-opportunities-model.md`

Current state:
- Local proposal only; no migration has been applied and no production write has been performed.
- Defines `crm_contacts` and `crm_opportunities` candidate fields, lifecycle flows, identity/dedupe rules, cross-client aborts, Stripe separation, privacy/RLS caveats, Board approval gates, sandbox-first migration handling, future mocked test matrix, and next implementation steps.
- Spec compliance review passed and quality review approved after safety-language patches at `2026-05-23 08:17 AEST`.

## Immediate Next Moves

1. Continue from `docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md` as the active multi-day build queue.
2. Use `docs/margot/crm-schema-inventory.md`, `docs/margot/crm-operating-model.md`, and `docs/margot/crm-test-coverage-matrix.md` as the current schema/source-of-truth/verification map.
3. Use `docs/margot/lead-to-client-conversion-plan.md` as the current local guarded conversion contract; missing operator approval now returns `403 operator_approval_required` and the focused CRM lead suite is green.
4. Use `docs/margot/crm-contacts-opportunities-model.md` as the current local proposal before broader contact/opportunity automation.
5. Use `src/app/api/crm/daily-digest/route.ts` and `src/lib/crm/daily-digest.ts` as the current local read-only daily CRM digest wiring; the route now reads recent leads, workspace-scoped blocked/todo CRM task rows, and feature-flagged open/won/blocked opportunities when `UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED=true`.
6. Next safe build lane: route-level event-write tests using the local `agent_actions` mapping in `src/lib/crm/activity-timeline.ts`, or command-center CRM digest UI consumption if UI is higher leverage.
7. Continue sandbox-only contacts/opportunities route/migration drafts only through local tests and the sandbox wizard; do not apply to production without explicit Board approval.
8. Use the portfolio, client 2nd Brain, marketing strategy, and AI enhancement docs as Senior PM control surfaces while code lanes continue.
9. Continue Mac Mini recovery when an authenticated SMB share is mounted or SSH is enabled.
10. Keep the expanded CRM matrix gate, `npm run type-check`, and `npm run security:routes-check` green before handoff or merge.
