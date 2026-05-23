# Margot Morning Report

Date: 2026-05-23
Project: Unite-Group

## Honest status

The overnight cron job was configured and enabled, but it did not record a completed run before the morning update. I triggered it again and then completed the first recovery/update pass manually so the repo has useful Margot artifacts now.

## Completed

Created/updated local Margot operating docs:

- `docs/margot/MARGOT-COMMAND-CENTER.md`
- `docs/margot/retrieval-rules.md`
- `docs/margot/voice-test-gap-analysis.md`
- `docs/margot/linear-uni-2054-overnight-update.md`
- `docs/margot/overnight-progress-log.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`

Added high-level CRM forward forecast for Phill:

- Identifies existing CRM foundations: `nexus_clients`, `agent_actions`, integration mirror tables, client CRUD routes, Business 360 reads, client activity reads, and Margot voice task ingress.
- Identifies the missing CRM operating loop: object model, source-of-truth matrix, identity resolution, lead persistence, lead-to-client conversion, contact/opportunity/task models, conflict rules, and daily operator digest.
- Sets the next five CRM actions: operating model, schema inventory, lead persistence investigation, conversion flow, and CRM test coverage matrix.

Added Senior PM documentation lanes E-H:

- `docs/margot/project-portfolio-index.md` — portfolio rows for active/local-evidence projects, businesses, blockers, next actions, and $2B leverage.
- `docs/margot/client-second-brain-model.md` — canonical client/business memory shape, decision history, retrieval priority, privacy boundaries, and client-mixing abort rules.
- `docs/margot/marketing-strategy-operating-model.md` — CRM-connected ICP/offer/content/campaign model, lead follow-up rules, context separation, and approval gates.
- `docs/margot/ai-enhancement-pipeline.md` — watch/triage/sandbox/evaluate/plan/implement/verify/adopt/retire flow with privacy/cost/security gates and local-only evaluation pattern.

Added Senior Project Manager control model for Margot:

- Pins Margot as the Senior Project Manager across CRM, Hermes connector work, project portfolio oversight, client 2nd Brain, marketing strategy, and AI/LLM/integration improvement.
- Defines the continuous control loop: classify signal, retrieve context, resolve identity, define outcome, choose auto/delegate/draft/ask/block path, execute, verify, record, and surface in the command center/daily digest.
- Adds the $2B strategy lens: revenue leverage, operating leverage, data leverage, client leverage, and strategic leverage.
- Sets the next artifacts: CRM operating model, schema inventory, project portfolio index, client 2nd Brain model, marketing strategy operating model, and AI enhancement pipeline.

Created the CRM operating model:

- `docs/margot/crm-operating-model.md`
- Defines the CRM as Phill's operating cockpit, not a generic contact list.
- Adds the canonical CRM loop from inbound signal to command-center/daily-digest/2nd Brain update.
- Adds core CRM objects, source-of-truth matrix, identity resolution policy, Margot decision classes, lead persistence plan, lead qualification/conversion guardrails, and CRM test matrix seed.
- Confirms the local CRM lead spine now includes `crm_leads` migration draft, marketing lead persistence, admin/service-role lead listing, and deterministic recommendation-only qualification; production schema application remains sandbox-first and Board-bounded.

Created the contacts/opportunities model proposal:

- `docs/margot/crm-contacts-opportunities-model.md`
- Defines why canonical contacts and opportunities should come before broader CRM automation and unguarded lead-to-client conversion.
- Proposes local-only `crm_contacts` and `crm_opportunities` field models, lifecycle flows, identity/dedupe rules, cross-client abort rules, source-of-truth rules, Stripe separation rules, Board approval gates, sandbox-first migration handling, future mocked test matrix, and next implementation steps.
- Tightens privacy and safety defaults: narrowest-scope contact privacy, no default global PII scope, no direct browser/client PII reads/writes without server route or restricted RLS, no JSONB secrets/payment details/unapproved sensitive PII/cross-client notes, and a future junction-table requirement before multi-scope contacts.

Added focused, verified Margot voice test coverage:

- `tests/integration/api/margot-voice-signed-url.test.ts`
- `tests/integration/api/margot-voice-task.test.ts`
- `tests/unit/margot-voice-failure-taxonomy.test.ts`

New test coverage includes rate limiting, upstream/service failures, invalid JSON/packet handling, Supabase insert failures, cache-control headers, summary truncation, default packet fields, and operator-safe failure-taxonomy copy for 401/403/429/503/502/network/unknown/code-fallback cases.

Previously created and still active:

- `docs/margot/OVERNIGHT-AUTONOMY-MANDATE.md`
- `docs/margot/mac-mini-recovery-status.md`
- `docs/plans/2026-05-22-margot-overnight-superpowers-plan.md`

## Margot inventory confirmed

Margot has:

- Voice UI panel in `src/components/command-center/voice/MargotVoicePanel.tsx`
- Failure taxonomy in `src/components/command-center/voice/failure-taxonomy.ts`
- ElevenLabs signed URL endpoint in `src/app/api/pi-ceo/margot-voice/signed-url/route.ts`
- Voice-to-CRM task endpoint in `src/app/api/pi-ceo/margot-voice/task/route.ts`
- Semantic search wrapper in `scripts/margot-semantic-search-wrapper.ts`
- Integration tests for signed URL and task ingest routes, plus the failure-taxonomy unit test

## Mac Mini status

Mac Mini recovery remains blocked by current connectivity/auth state:

- Host: `phills-mac-mini.local`
- Latest probe at `2026-05-23 18:32 AEST`: SMB/File Sharing port 445 is reachable; SSH/Remote Login port 22 is unreachable; no authenticated SMB share is mounted under `/Volumes`.

Still blocked:

- No authenticated SMB share is mounted under `/Volumes`; `/Volumes` only contains `Macintosh HD`.
- Recovery destination `docs/margot/recovered-from-mac-mini/` contains only `.gitkeep`.
- Original `RESTOREASSIST-CONTENT-INDEX.md` is not present locally yet.
- SSH is not available from this MacBook session.
- Noninteractive SMB auth failed in prior probes.

Target recovery files remain:

- `/Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md`
- `/Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md`

## Verification status

Latest verification refresh at `2026-05-23 18:54 AEST`:

- Re-read Margot operating docs, current Linear mirror, CRM matrix, approval persistence plan, command-center state, Mac Mini recovery status, and latest progress evidence before selecting the next safe lane.
- Health check: branch `feat/crm-approval-lifecycle-helper`, head before this working-tree slice `0667ba0 docs: record approval timeline evidence`, `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` reachable, `phills-mac-mini.local:22` unreachable, and no recovered Mac Mini artifacts are present locally.
- Code/test improvement: `src/app/api/crm/leads/[id]/convert/route.ts` now writes a best-effort sanitized `crm_timeline_lead_converted` `agent_actions` event after the primary lead conversion update succeeds.
- Safety evidence: new mocked route coverage in `tests/integration/api/crm-lead-conversion.test.ts` verifies the timeline action remains `pending`, `requiresApproval=true`, contains no Board approval ID, does not use raw lead email as the timeline subject label when company is blank, and conversion success still returns if the timeline insert throws after the primary update succeeds.
- Verification passed: focused lead conversion suite returned 1 suite / 7 tests passed; expanded CRM matrix returned 11 suites / 101 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned `0 unprotected mutating routes`; `git diff --check` passed.
- Updated `docs/margot/MARGOT-COMMAND-CENTER.md`, `docs/margot/mac-mini-recovery-status.md`, `docs/margot/crm-test-coverage-matrix.md`, `docs/margot/overnight-progress-log.md`, and this report with the latest evidence.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, client-facing communication, billing/payment action, merge, destructive git, or unrelated context mixing was performed.

Prior approval decision timeline mapping lane at `2026-05-23 18:06 AEST`:

- Re-read Margot operating docs and current approval handoff state, inspected repo state, checked Mac Mini recovery availability, and completed the next safe approval decision timeline mapping slice.
- Code/test improvement: `src/lib/crm/activity-timeline.ts` now recognizes `approval_approved` and `approval_rejected` events and maps them to sanitized pending `agent_actions` insert payloads; `tests/unit/lib/crm/activity-timeline.test.ts` now covers approved/rejected decision event sanitization and a structural-event hardening regression.
- Review fix included: quality review requested changes because structurally constructed approval decision events could have become `done`; `db79b53 fix: keep CRM approval timeline inserts pending` now forces configured approval-required event types to remain `pending` and `requiresApproval=true`.
- Verification passed: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 40 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned `0 unprotected mutating routes`; `git diff --check` passed.
- Health check: branch `feat/crm-approval-lifecycle-helper`, latest local code commit `db79b53 fix: keep CRM approval timeline inserts pending`, Margot handoff docs committed as an evidence-only follow-up, `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` reachable, `phills-mac-mini.local:22` unreachable, and no recovered Mac Mini artifacts are present locally.
- Push/PR remains blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/crm-approval-lifecycle-helper` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`; `gh` is not installed in this cron shell.
- Updated `docs/margot/MARGOT-COMMAND-CENTER.md`, `docs/margot/mac-mini-recovery-status.md`, `docs/margot/overnight-progress-log.md`, and this report with the latest evidence.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, successful GitHub push, secret access/printing, Mac Mini write, client-facing communication, billing/payment action, merge, or destructive git action was performed.

Prior approval task evidence mapper lane at `2026-05-23 17:11 AEST`:

- Continued branch `feat/crm-approval-lifecycle-helper`; local code commit is `14061be feat: map CRM approval task evidence`.
- Added pure local `buildCrmApprovalLifecycleInputFromTaskEvidence` in `src/lib/crm/approval-lifecycle.ts` and expanded `tests/unit/lib/crm/approval-lifecycle.test.ts` to 33 tests.
- The mapper converts Stage 1 approval task evidence into lifecycle input without Supabase writes, without treating completed tasks as executed, and without granting auto-execution authority.
- Security fixes from review are included: returned operator-facing reasons no longer echo raw approval references, Board IDs, approver values, rejection reasons, unknown statuses, or unknown subject types.
- Spec review: PASS. Quality/security re-review: APPROVED. Final integration review: READY.
- Verification passed: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 1 suite / 33 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned `0 unprotected mutating routes`; `git diff --check` passed.
- Push/PR remains blocked because `gh` is not installed and HTTPS GitHub transport is unauthenticated in this cron shell.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, successful GitHub push, secret access/printing, Mac Mini write, client-facing communication, billing/payment action, merge, or destructive git action was performed.

Latest approval persistence planning lane at `2026-05-23 16:38 AEST`:

- Created `docs/margot/crm-approval-persistence-plan.md` as the current approval persistence operating decision.
- Decision: keep existing `tasks` approval subtype as Stage 1 for the operational queue (`blocked`, `high`, `Phill approval`, `approval-required`) and defer a dedicated `crm_approvals` table until structured approval history/query needs are proven.
- Updated `docs/margot/crm-schema-inventory.md` and `docs/margot/crm-test-coverage-matrix.md` so approvals are no longer an undecided current persistence shape; the next safe gap is a local approval evidence mapper and sanitized event-write tests.
- Updated `docs/margot/MARGOT-COMMAND-CENTER.md` and `docs/margot/overnight-progress-log.md` with health-check and evidence.
- Verification passed: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 1 suite / 20 tests passed; `git diff --check` passed.
- Health check: `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` unreachable, `phills-mac-mini.local:22` unreachable.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, client-facing communication, billing/payment action, merge, or destructive git action was performed.

Latest approval lifecycle helper verification at `2026-05-23 16:11 AEST`:

- Current branch is `feat/crm-approval-lifecycle-helper`; local implementation commit is `ee642c3 feat: add CRM approval lifecycle helper`. Handoff docs were updated after the implementation commit to record evidence.
- Added/verified pure local decision-support helper `src/lib/crm/approval-lifecycle.ts` and `tests/unit/lib/crm/approval-lifecycle.test.ts` for requested, approved, rejected, cancelled, expired, executed, invalid, and high-risk approval states.
- Safety posture is explicit: the helper always returns `safeToAutoExecute: false`, does not echo approval references or Board IDs in operator-facing reasons, and does not perform any Supabase/Linear/GitHub/Vercel/Stripe write.
- Updated CRM operating/model matrix evidence so approvals are covered as pure local decision support while persistence remains undecided (`crm_approvals` vs task subtype) before route writes.
- Verification passed: focused approval lifecycle test returned 1 suite / 20 tests passed; expanded CRM matrix returned 11 suites / 84 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned `0 unprotected mutating routes`; `git diff --check` passed.
- Push/PR remains blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/crm-approval-lifecycle-helper` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`; `gh` is not installed.
- Mac Mini probe remains blocked for artifact copy: `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` is currently unreachable, `phills-mac-mini.local:22` is unreachable, and `docs/margot/recovered-from-mac-mini/` still contains only `.gitkeep`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, successful GitHub push, secret access/printing, Mac Mini write, client-facing send, merge, or destructive git action was performed.

Latest CRM create timeline write-hook fix at `2026-05-23 14:33 AEST`:

- Continued active branch `feat/crm-timeline-write-hooks-clean` after the prior activity timeline write-hook feature landed on `origin/main` as PR #170.
- Added local fix commit `17b46be fix: make CRM timeline writes best-effort` plus a follow-up docs evidence commit on top of updated `origin/main`.
- Fixed reviewer-blocking gaps: contact/opportunity timeline writes are best-effort when `agent_actions` insert throws, contact create uses explicit service-role select columns instead of `select('*')`, and approved/won opportunity tests assert both `opportunity_created` and `approval_requested` timeline inserts without Board approval id persistence.
- Spec re-review: PASS. Code quality/security re-review: APPROVED.
- Verification passed after rebase: focused contact/opportunity create tests returned 2 suites / 25 tests passed; expanded CRM matrix returned 10 suites / 64 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned `0 unprotected mutating routes`.
- Push/PR remains blocked: `gh` is not installed and `GIT_TERMINAL_PROMPT=0 git push -u origin feat/crm-timeline-write-hooks-clean` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, successful GitHub push, secret access/printing, Mac Mini write, client-facing send, merge, or destructive git action was performed.

Latest CRM timeline mapping lane at `2026-05-23 13:25 AEST`:

- Continued the activity/timeline lane and pinned existing `agent_actions` as the first persistence target in the local matrix/operating handoff; no separate policy doc, new dedicated timeline table, or migration was created or applied.
- Added `buildCrmTimelineAgentActionInsert(event)` in `src/lib/crm/activity-timeline.ts` to map defensively sanitized CRM timeline events into safe `agent_actions` insert payloads with `crm_timeline_<event_type>` action types, `done`/`pending` status semantics, null UUID link fields unless explicitly resolved, and no Board approval ID, contact PII, token, API-key, bearer-token, IP, address, or secret-like metadata persistence.
- Updated the local CRM coverage and operating docs: `docs/margot/crm-operating-model.md`, `docs/margot/crm-test-coverage-matrix.md`, and `docs/margot/MARGOT-COMMAND-CENTER.md`.
- Verification passed and was re-run after sanitizer hardening: `npx jest tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 1 suite / 5 tests passed, and `npm run type-check` passed.
- Mac Mini probe: SMB/File Sharing `phills-mac-mini.local:445` is reachable, SSH/Remote Login `phills-mac-mini.local:22` is unreachable, `/Volumes` contains only `Macintosh HD`, and `docs/margot/recovered-from-mac-mini/` still contains only `.gitkeep`.
- Local commit created: `b369375 feat: map CRM timeline events to agent actions`.
- Push/PR remains blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/margot-crm-daily-digest-route` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, successful GitHub push, secret access/printing, Mac Mini write, client-facing send, destructive git, or unrelated context mixing was performed.

Latest autonomous health check at `2026-05-23 12:51 AEST`:

- Re-read Margot operating docs and handoff state, then ran a safe verification refresh without starting a new lane.
- Repo state before the report update was clean on `feat/margot-crm-daily-digest-route` at `49fdc09 feat: add CRM activity timeline taxonomy`.
- Mac Mini probe: SMB/File Sharing `phills-mac-mini.local:445` is reachable, SSH/Remote Login `phills-mac-mini.local:22` is unreachable, `/Volumes` contains only `Macintosh HD`, and `docs/margot/recovered-from-mac-mini/` still contains only `.gitkeep`.
- Verification passed: `git diff --check`, `npx jest tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 1 suite / 3 tests passed, and `npm run type-check` passed.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, client-facing send, destructive git, or unrelated context mixing was performed.

Latest activity/timeline taxonomy lane at `2026-05-23 12:42 AEST`:

- Added pure local CRM timeline helper `src/lib/crm/activity-timeline.ts`.
- Added TDD coverage `tests/unit/lib/crm/activity-timeline.test.ts`; RED failed first because the module did not exist, then reviewer-requested sanitizer hardening failed RED on sensitive key variants before passing GREEN.
- The taxonomy normalizes lead captured, lead qualified, lead converted, contact created, opportunity created, approval requested, task completed, and integration stale events into safe CRM timeline entries.
- Safety coverage rejects unknown event types and missing identity instead of guessing across CRM objects, redacts token/secret/password/authorization/API-key/Board-approval-id metadata variants, and does not copy Board approval ids into event metadata.
- Updated `docs/margot/crm-test-coverage-matrix.md` and `docs/margot/crm-operating-model.md`; next gap is persistence policy and route-level event-write tests, not taxonomy definition.
- Re-ran expanded CRM matrix with the new test: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 10 suites / 60 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Mac Mini probe during this lane: `/Volumes` contains only `Macintosh HD`; SMB/File Sharing port `445` is reachable; SSH/Remote Login port `22` is unreachable.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.
- Local commit created: `49fdc09 feat: add CRM activity timeline taxonomy`.
- Push/PR remains blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/margot-crm-daily-digest-route` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`.

Latest opportunity digest integration finalize at `2026-05-23 12:08 AEST`:

- Created local commit `6ae1b31 feat: add opportunity digest reads` on `feat/margot-crm-daily-digest-route`.
- Spec compliance review: PASS. Code quality review: APPROVED.
- Re-ran focused daily digest route verification: `npx jest tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 1 suite / 10 tests passed.
- Re-ran expanded CRM matrix gate: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 9 suites / 57 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Push/PR remains blocked: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/margot-crm-daily-digest-route` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest opportunity digest integration lane at `2026-05-23 11:42 AEST`:

- Continued active branch `feat/margot-crm-daily-digest-route` from local head `9456ab1 docs: refresh CRM operating model next lanes`.
- Extended read-only `src/app/api/crm/daily-digest/route.ts` so open/won/blocked `crm_opportunities` can be included in the daily CRM digest when `UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED=true`.
- Kept the read feature-flagged because `crm_opportunities` is still a draft/sandbox-first table and should not be touched by deployed digest reads until schema readiness/promotion is explicit.
- Added mocked integration coverage in `tests/integration/api/crm-daily-digest.test.ts` for opportunity priorities/approval surfacing and safe `crm_digest_opportunities_read_failed` handling.
- Focused daily digest route verification passed: `npx jest tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 1 suite / 10 tests passed.
- Expanded CRM matrix gate passed: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 9 suites / 57 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Mac Mini probe during this lane: `/Volumes` only contains `Macintosh HD`; SMB/File Sharing port `445` is reachable; SSH/Remote Login port `22` is unreachable; recovery directory still contains only `.gitkeep`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest guarded opportunities create route lane at `2026-05-23 11:29 AEST`:

- Added local forecast-only `POST /api/crm/opportunities` route at `src/app/api/crm/opportunities/route.ts`.
- Added TDD integration coverage at `tests/integration/api/crm-opportunities-create.test.ts`; RED failed first because the route module did not exist, GREEN passed after implementation, and quality re-review approved after adding explicit authenticated non-admin denial coverage.
- Route behavior: admin gate before CRM Supabase access; config/invalid JSON/invalid payload safe failures; `crm_opportunities` insert only; explicit safe select columns; value currency default/support; sensitive/oversized `additionalData` rejection; won/conversion-like opportunities require approval flags and a Board approval id; Board approval id is never persisted.
- Updated `docs/margot/crm-test-coverage-matrix.md`, `docs/margot/crm-operating-model.md`, and `docs/margot/MARGOT-COMMAND-CENTER.md` so the opportunities create API is now part of the focused CRM verification gate.
- Re-ran the expanded focused CRM gate: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 9 suites passed / 55 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest CRM test matrix lane at `2026-05-23 11:04 AEST`:

- Created `docs/margot/crm-test-coverage-matrix.md` as the durable coverage/verification map for the current CRM operating loop.
- Updated `docs/margot/crm-operating-model.md` so the CRM Test Matrix section points to the new detailed matrix and focused verification gates instead of the older seed table.
- Matrix covers lead capture/list/qualification/conversion, contacts schema/API, opportunities draft schema, daily digest helper/route, Margot voice ingress, client audit/activity gaps, integration mirrors, approvals, command-center UI gaps, and Mac Mini recovery evidence.
- Re-ran the expanded focused CRM gate: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts --runInBand` returned 8 suites passed / 41 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Mac Mini probe during this lane: `/Volumes` only contains `Macintosh HD`; SMB/File Sharing port `445` is reachable; SSH/Remote Login port `22` is unreachable; recovery directory still contains only `.gitkeep`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest CRM daily digest workspace-scope fix at `2026-05-23 10:41 AEST`:

- Continued active branch `feat/margot-crm-daily-digest-route` and fixed the broad service-role `tasks` read flagged by code-quality review.
- `src/app/api/crm/daily-digest/route.ts` now reads `tasks` only when `UNITE_CRM_WORKSPACE_ID` is configured, filters by `.eq('workspace_id', process.env.UNITE_CRM_WORKSPACE_ID)` before blocked/todo status filtering, and otherwise returns a lead-only digest without reading the `tasks` table.
- TDD evidence: RED failed before implementation because the new scoped-query/missing-workspace tests expected workspace filtering and task-read skipping; GREEN passed after implementation with `tests/integration/api/crm-daily-digest.test.ts` returning 1 suite / 8 tests passed.
- Spec compliance re-review: PASS. Code quality re-review: APPROVED.
- Re-ran the focused daily CRM digest / lead-list gate: `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` returned 3 suites passed / 15 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest Senior PM daily digest verification refresh at `2026-05-23 10:30 AEST`:

- Inspected current repo state on branch `feat/margot-crm-daily-digest-route`; head is `ed65b98 docs: record CRM daily digest task-read progress` and the working tree was clean before this report refresh.
- Re-ran the focused daily CRM digest / lead-list gate: `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` returned 3 suites passed / 14 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Mac Mini probe: SMB/File Sharing port `445` is reachable, SSH/Remote Login port `22` is unreachable, no authenticated Mac Mini share is mounted under `/Volumes`, and the recovery directory still contains only `.gitkeep`.
- Updated current-state docs: `docs/margot/MARGOT-COMMAND-CENTER.md`, `docs/margot/mac-mini-recovery-status.md`, `docs/margot/overnight-progress-log.md`, and this report.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest CRM daily digest task-read verification at `2026-05-23 10:01 AEST`:

- Continued active branch `feat/margot-crm-daily-digest-route` and created local commit `060d233 feat: include CRM tasks in daily digest`.
- Verified the read-only daily CRM digest route now queries recent `crm_leads` and blocked/todo `tasks`, maps `assignee_name` into digest task owner, and surfaces high-priority blocked approval tasks in operator priorities/approvals.
- TDD evidence: RED failed before implementation because the new task inclusion test expected blocked/approval counts of `1` and received `0`; GREEN passed after implementation with `tests/integration/api/crm-daily-digest.test.ts` returning 1 suite / 7 tests passed.
- Spec compliance review: PASS. Code quality review: APPROVED with one minor optional note about config-before-admin ordering; current invalid-query/config preflight ordering was kept intentionally.
- Re-ran the focused daily CRM digest / lead-list gate: `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` returned 3 suites passed / 14 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Ran `npm run build`; Next compiled successfully but build remains blocked during page-data collection for existing `/api/search/nexus` because local Supabase URL/env is not configured in this cron environment.
- GitHub push/PR/check state remains blocked because `gh` is unavailable and HTTPS GitHub auth is not configured; Vercel deploy state remains blocked because `vercel` CLI/auth is unavailable.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest command-center verification refresh at `2026-05-23 09:24 AEST`:

- Inspected current repo state on branch `feat/margot-crm-daily-digest-route`; head is `db7631f feat: add CRM daily digest route`; working tree was clean before this report/doc refresh.
- Re-ran the daily CRM digest / lead-list gate: `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` returned 3 suites passed / 12 tests passed.
- Re-ran `npm run type-check`; `tsc --noEmit` passed.
- Re-ran `npm run security:routes-check`; route inventory returned `0 unprotected mutating routes`.
- Mac Mini probe: SMB/File Sharing port `445` is reachable, SSH/Remote Login port `22` is unreachable, and no authenticated Mac Mini share is mounted under `/Volumes`; recovery directory still contains only `.gitkeep`.
- Updated current-state docs: `docs/margot/MARGOT-COMMAND-CENTER.md`, `docs/margot/mac-mini-recovery-status.md`, `docs/margot/overnight-progress-log.md`, and this report.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest CRM daily digest route lane at `2026-05-23 09:21 AEST`:

- Added read-only admin digest route `src/app/api/crm/daily-digest/route.ts` and TDD coverage `tests/integration/api/crm-daily-digest.test.ts`.
- RED failed because the route module did not exist; GREEN passed after implementing the route and fixing spec-review findings.
- The route validates `limit`, handles missing Supabase config safely, requires admin before CRM data reads when configured, reads recent `crm_leads`, maps lead rows into `createCrmDailyDigest`, and returns structured digest JSON.
- Focused verification passed: `npx jest tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-leads-list.test.ts --runInBand` returned 3 suites passed / 12 tests passed.
- `npm run type-check` passed.
- `npm run security:routes-check` passed with `0 unprotected mutating routes`.
- Local commit created on `feat/margot-crm-daily-digest-route` with message `feat: add CRM daily digest route`; push failed because HTTPS GitHub credentials are unavailable in this session (`could not read Username for 'https://github.com': Device not configured`). Use `git log -1 --oneline` for the final local hash because this report was amended after recording push failure.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Previous daily CRM digest helper lane at `2026-05-23 08:51 AEST`:

- Added pure local helper `src/lib/crm/daily-digest.ts` to produce structured daily CRM digest counts, operator priorities, approvals, blockers, verification lines, and markdown output.
- Added TDD test `tests/unit/lib/crm/daily-digest.test.ts`; RED failed because the helper did not exist, then GREEN passed after implementation.
- Added `docs/margot/daily-crm-digest-template.md` as the Senior PM daily digest contract for leads, opportunities, tasks, approvals, blockers, verification, and safety notes.
- Focused verification passed: `npx jest tests/unit/lib/crm/daily-digest.test.ts --runInBand` returned 1 suite passed / 2 tests passed.
- CRM digest regression passed: `npx jest tests/unit/lib/crm/daily-digest.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-leads-list.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` returned 4 suites passed / 17 tests passed.
- `npm run type-check` passed.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, GitHub push, secret access/printing, Mac Mini write, or client-facing send was performed.

Latest CRM contacts create API hardening at `2026-05-23 08:39 AEST`:

- Continued the active branch `feat/margot-crm-contacts-api` at `5fc6459` rather than starting a new lane.
- Re-verified local-only guarded contact creation route `src/app/api/crm/contacts/route.ts` and test contract `tests/integration/api/crm-contacts-create.test.ts`.
- Spec compliance review: PASS.
- Code quality review initially requested stronger blank-default and approval-ID validation; the follow-up patch added regressions and final quality re-review was APPROVED.
- Focused CRM contact test passed: `npx jest tests/integration/api/crm-contacts-create.test.ts --runInBand` returned 1 suite passed / 9 tests passed.
- Focused CRM regression passed: `npx jest tests/integration/api/crm-contacts-create.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` returned 6 suites passed / 31 tests passed.
- `npm run type-check` passed.
- `npm run security:routes-check` passed with `0 unprotected mutating routes`.
- No production DB write, migration application, sandbox apply, deployment, Vercel env mutation, secret access/printing, or client-facing send was performed.
- Local commit created on `feat/margot-crm-contacts-api` with message `test: harden CRM contacts approval defaults`; push failed because HTTPS GitHub credentials are unavailable in this session (`could not read Username for 'https://github.com': Device not configured`).
- `gh` is unavailable locally, so GitHub PR/check state could not be inspected via GitHub CLI in this tick.

Latest contacts/opportunities migration-draft verification at `2026-05-23 08:27 AEST`:

- Created sandbox-first draft migration `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` for `crm_contacts` and `crm_opportunities`; it was not applied to sandbox or production.
- Added guard test `tests/unit/margot-crm-contacts-opportunities-migration.test.ts` to assert core contact fields, opportunity forecast/approval fields, RLS/service-role policies, and sandbox-first / no-secrets / no-billing-truth safety comments.
- Updated `docs/margot/crm-schema-inventory.md` and `docs/margot/crm-contacts-opportunities-model.md` so docs now describe the draft migration state instead of saying no migration exists.
- TDD evidence: focused test first failed RED because the migration file was missing; after implementation it passed GREEN.
- Focused CRM regression passed: `npx jest tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` returned 5 suites passed / 22 tests passed.
- `npm run type-check` passed.
- `npm run security:routes-check` passed with `0 unprotected mutating routes`.
- No production DB write, migration application, deploy, Vercel mutation, GitHub push, secret access/printing, or client-facing send was performed.

Latest contacts/opportunities proposal verification at `2026-05-23 08:17 AEST`:

- `docs/margot/crm-contacts-opportunities-model.md` was created as a local-only source-of-truth proposal for canonical contacts and commercial opportunities.
- Health check confirmed `node_modules=present`; Mac Mini SMB `445` and SSH `22` were unreachable in this probe, and no authenticated share was mounted under `/Volumes`.
- Document verification passed: `test -f docs/margot/crm-contacts-opportunities-model.md`.
- Spec compliance review: PASS after adding explicit grounding in `docs/margot/lead-to-client-conversion-plan.md`.
- Quality review: APPROVED after tightening privacy scope defaults, multi-scope contact caveat, direct read/write RLS caveats, and JSONB safety language.
- `npm run type-check` passed (`tsc --noEmit`).
- No production DB write, migration application, deploy, Vercel mutation, GitHub push, secret access/printing, or client-facing send was performed.

Latest CRM lead visibility / qualification verification at `2026-05-23 07:35 AEST`:

- Health check confirmed `node_modules=present`, `src/app/api/crm/leads/route.ts` present, `tests/integration/api/crm-leads-list.test.ts` present, `/Volumes` only contains `Macintosh HD`, Mac Mini SMB `445` is reachable, SSH `22` is unreachable, and the Mac Mini recovery directory still contains only `.gitkeep`.
- `docs/margot/crm-operating-model.md` was refreshed to reflect current lead persistence/list/qualification state instead of the old TODO.
- Focused verification passed: `npx jest tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts --runInBand` returned 2 suites passed / 9 tests passed.
- `npm run type-check` passed.
- No production DB write, migration application, deploy, Vercel mutation, GitHub push, or client-facing send was performed.

Latest guarded lead-to-client conversion verification at `2026-05-23 08:07 AEST`:

- Lane D from the active multi-day CRM build plan is now a local guarded route/test contract, not a production-promoted conversion system.
- `tests/integration/api/crm-lead-conversion.test.ts` added the missing-operator-approval guard using TDD: RED failed with expected `403` vs received `400`; GREEN passed after the route change.
- `src/app/api/crm/leads/[id]/convert/route.ts` now returns `403` with `{ error: 'operator_approval_required' }` for missing or blank `boardApprovalId` before Supabase conversion/update is attempted.
- `docs/margot/lead-to-client-conversion-plan.md` was updated so it no longer says no route exists; it now qualifies the state as local-only, guarded, and not production-promoted.
- Focused verification passed: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` returned 4 suites passed / 19 tests passed.
- `npm run type-check` passed.
- Spec compliance review: PASS. Code/doc quality review: APPROVED.

Latest UNI-2054 draft refinement verification at `2026-05-23 07:04 AEST`:

- `docs/margot/linear-uni-2054-overnight-update.md` was refreshed with current 07:01 repo/host health evidence.
- Spec compliance review: PASS.
- Quality review: APPROVED after removing the unrelated UNI-2053/CCW blocker from the UNI-2054 draft and clarifying verification timestamps.
- No Linear post was made; the update remains a local paste-ready draft.

Latest voice/test verification refresh at `2026-05-23 07:03 AEST`:

- Focused Margot voice tests passed again: 3 suites passed, 28 tests passed.
- Command used: `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`.
- `npm run type-check` passed: `tsc --noEmit` completed.
- CRM operating model was created from existing repo evidence; no production DB write, migration, deploy, Vercel mutation, secret access, or GitHub push was performed.

Documentation lanes E-H verification at `2026-05-23 07:33 AEST`:

- Created and checked existence of `docs/margot/project-portfolio-index.md`, `docs/margot/client-second-brain-model.md`, `docs/margot/marketing-strategy-operating-model.md`, and `docs/margot/ai-enhancement-pipeline.md`.
- Links/paths are based on inspected repo-local files and unknown external/live statuses are marked as unknown.
- `npm run type-check` passed: `tsc --noEmit` completed.
- No production DB write, migration application, deploy, Vercel mutation, GitHub push, or client-facing send was performed.

Prior verification refresh at `2026-05-23 06:29 AEST`:

- `node_modules` exists from the prior `npm ci` readiness pass.
- Focused Margot voice tests passed: 3 suites passed, 28 tests passed.
- `npm run type-check` passed: `tsc --noEmit` completed.
- Mac Mini resolves and SMB `445` is reachable, but SSH `22` still times out and no authenticated share is mounted under `/Volumes`.

Prior correction/preflight pass at `2026-05-23 05:57 AEST`:

- `npm ci` completed successfully using `package-lock.json`.
- `npm audit --audit-level=moderate --json` reported 3 moderate advisories involving `postcss` through `next` / `next-intl`; do not apply the suggested force fix automatically.

Subagent review of the new Margot voice tests:

- Spec Compliance: PASS.
- Code Quality: APPROVED with minor notes only.
- Handoff doc updated to use the correct future focused test command.

Package scripts available:

- `npm run test` — scoped to `tests/pipelines`, not preferred for these integration tests
- `npm run test:all`
- `npm run type-check`
- `npm run build`

Preferred focused command for future Margot voice checks:

```bash
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
```

## Key blockers

1. Mac Mini needs authenticated SMB mount, SSH/Remote Login, or approved export for original artifact copy.
2. Original `RESTOREASSIST-CONTENT-INDEX.md` remains missing locally.
3. Vercel is still not locally linked due missing credentials/token.
4. Hermes cron was changed from unresolved `deliver=origin` to `deliver=local`; project logs are the current official evidence channel until a real user-visible delivery target is configured.
5. UNI-2053 still needs the first CCW product category topic.

## Recommended next move

Active multi-day plan:
`docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md`

1. Use `docs/margot/crm-schema-inventory.md` and the refreshed `docs/margot/crm-operating-model.md` as the current schema/source-of-truth map.
2. Use `docs/margot/lead-to-client-conversion-plan.md` as the current guarded conversion contract; keep the 4-suite / 19-test CRM lead gate green.
3. Use `docs/margot/crm-contacts-opportunities-model.md` as the local proposal for canonical contacts and commercial opportunities before broader conversion automation.
4. Draft contact/opportunity create/link route tests now that `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` exists locally, but keep actual schema application sandbox-first through `./scripts/sandbox-wizard.sh` and never promote without explicit Board approval.
5. Apply/diff the draft migration against the sandbox when credentials are available and safe to use; do not touch production.
6. Use the new `src/app/api/crm/daily-digest/route.ts` read-only admin route as the local digest wiring point; next local-only digest work should be a command-center loader/fixture rather than another route.
7. Use the new portfolio, client 2nd Brain, marketing strategy, and AI enhancement docs as Senior PM control surfaces while code lanes continue.
8. Continue Mac Mini recovery when an authenticated share or SSH is available.
9. Keep cron/project logs as the official evidence channel until user-visible delivery is configured.
10. Keep the verified local CRM lead gate green:
   `npx jest tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand && npm run type-check`
11. For Margot voice regressions, run:
   `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`

## Bottom line

Margot’s command-center foundation, retrieval rules, Linear update draft, test gap analysis, progress log, morning report, forward-readiness gap analysis, high-level CRM 25-step forecast, 2nd Brain carry-forward directive, Senior Project Manager operating model, CRM operating model, active multi-day CRM build plan, CRM schema inventory, project portfolio index, client 2nd Brain model, marketing strategy operating model, and AI enhancement pipeline are in place. The schema inventory (`docs/margot/crm-schema-inventory.md`) maps CRM-adjacent migrations, writers/readers, source-of-truth rules, integration mirror columns, `src/lib/empire/*` helper readers, and gap queue items; it passed spec compliance review and code/doc quality review after fixes. The local CRM lead spine now includes website lead persistence, admin/service-role lead list visibility, deterministic recommendation-only lead qualification, and a guarded local lead-to-client conversion route contract that requires operator approval and blocks missing approval with `403 operator_approval_required`. The new contacts/opportunities proposal (`docs/margot/crm-contacts-opportunities-model.md`) now defines the next identity and commercial pipeline layer with local-only `crm_contacts` / `crm_opportunities` field models, lifecycle flows, cross-client abort rules, Stripe separation, privacy/RLS caveats, Board approval gates, sandbox-first handling, and a future mocked test matrix; it passed spec compliance review and quality review after tightening safety language. The focused CRM lead gate passed at 08:07 AEST with 4 suites / 19 tests plus `npm run type-check` green. Documentation lanes E-H provide the Senior PM control surfaces for project oversight, durable client memory, marketing strategy, and safe AI improvement. The next strategic lanes are sandbox-only contacts/opportunities migration/test drafts or the daily CRM digest template. The remaining infrastructure blockers are authenticated Mac Mini file access or approved export for original artifacts, missing local `RESTOREASSIST-CONTENT-INDEX.md`, Vercel linking/env verification, and configuring a real user-visible delivery target if project-file logs are not enough.
