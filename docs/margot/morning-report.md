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
- Latest probe at `2026-05-23 07:01 AEST`: hostname resolves to IPv4 addresses including `169.254.28.74`, `169.254.37.78`, and `192.168.2.77`; SMB/File Sharing port 445 is reachable; SSH/Remote Login port 22 is unreachable.

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
6. Create a daily CRM digest template if schema work should remain draft-only for the next tick.
7. Use the new portfolio, client 2nd Brain, marketing strategy, and AI enhancement docs as Senior PM control surfaces while code lanes continue.
8. Continue Mac Mini recovery when an authenticated share or SSH is available.
9. Keep cron/project logs as the official evidence channel until user-visible delivery is configured.
10. Keep the verified local CRM lead gate green:
   `npx jest tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand && npm run type-check`
11. For Margot voice regressions, run:
   `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`

## Bottom line

Margot’s command-center foundation, retrieval rules, Linear update draft, test gap analysis, progress log, morning report, forward-readiness gap analysis, high-level CRM 25-step forecast, 2nd Brain carry-forward directive, Senior Project Manager operating model, CRM operating model, active multi-day CRM build plan, CRM schema inventory, project portfolio index, client 2nd Brain model, marketing strategy operating model, and AI enhancement pipeline are in place. The schema inventory (`docs/margot/crm-schema-inventory.md`) maps CRM-adjacent migrations, writers/readers, source-of-truth rules, integration mirror columns, `src/lib/empire/*` helper readers, and gap queue items; it passed spec compliance review and code/doc quality review after fixes. The local CRM lead spine now includes website lead persistence, admin/service-role lead list visibility, deterministic recommendation-only lead qualification, and a guarded local lead-to-client conversion route contract that requires operator approval and blocks missing approval with `403 operator_approval_required`. The new contacts/opportunities proposal (`docs/margot/crm-contacts-opportunities-model.md`) now defines the next identity and commercial pipeline layer with local-only `crm_contacts` / `crm_opportunities` field models, lifecycle flows, cross-client abort rules, Stripe separation, privacy/RLS caveats, Board approval gates, sandbox-first handling, and a future mocked test matrix; it passed spec compliance review and quality review after tightening safety language. The focused CRM lead gate passed at 08:07 AEST with 4 suites / 19 tests plus `npm run type-check` green. Documentation lanes E-H provide the Senior PM control surfaces for project oversight, durable client memory, marketing strategy, and safe AI improvement. The next strategic lanes are sandbox-only contacts/opportunities migration/test drafts or the daily CRM digest template. The remaining infrastructure blockers are authenticated Mac Mini file access or approved export for original artifacts, missing local `RESTOREASSIST-CONTENT-INDEX.md`, Vercel linking/env verification, and configuring a real user-visible delivery target if project-file logs are not enough.
