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
## Current Autonomy Rotation Guard — 2026-06-09 21:32 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `c5f7a86` (sandbox-wizard auto-sync commit `c5f7a86 chore: Margot ops auto-sync [tick 20260609_204936]` is the current head; `git rev-list --count main..origin/main` returned `0` so the local main is in sync with origin). Inherited local dirty state is unchanged from the prior tick: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts` with case-insensitive `normalizedSubjectType` and 35 tests), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`, 16 tests), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`, 35 tests after this lane), and the deterministic stale-sync/daily-digest changes (`src/lib/runtime/stale-sync-check.ts` `last_error` + NaN guard, `src/lib/crm/daily-digest.ts` `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes`).
- Completed safe rotation lane: refreshed `docs/margot/lead-to-client-conversion-plan.md` (last touched `2026-05-23`, before AI-RET-001 and the new `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` answer-shape fixture added at `2026-06-09 20:58 AEST`) to a `Last update: 2026-06-09 21:32 AEST` state. The refresh adds a `Last update` header, a `Previous refresh: 2026-05-23` pointer, an explicit `Related evidence` cross-link to the AI-RET-001 report, an explicit `Related fixture` line pointing at `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY`, an explicit `Related rotation guard` pointer to the new in-doc checkpoint, an expansion of the non-negotiable rule that names the 6 required answer-shape phrases (`recommendation-only`, `no auto-conversion`, `no crm identity overwrite`, `identity review`, `board-approved conversion rules`, `operator-approved conversion`), three new `Implementation notes` (qualifyLead operator-note contract, local conversion route fail-closed branches, sandbox authority gate for `tasks` / `voice_command_sessions`), a new `Out of Scope for This Revision` section that codifies the modern hard safety rules, and a `Senior PM verification checkpoint (2026-06-09 21:32 AEST)` block. Added a doc-drift guard Jest test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` (`keeps the lead-to-client conversion plan source doc aligned with the AI-RET-001 answer-shape contract`) that reads the plan from disk, asserts all 6 `requiredAnswerPhrases` + 4 `requiredCitationSources` are present in the doc, and asserts none of the 6 `prohibitedAnswerPhrases` appear in the assertion section (everything before `## Senior PM verification checkpoint`). The original 2026-05-23 content (state machine, state definitions, identity gates, API contract seed, local evidence, implementation notes) is preserved unchanged. The doc is now 121 lines (was 94 before this lane; +27).
- Verification passed: focused retrieval gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 35 tests PASS (was 34 before this lane; +1 for the doc-drift guard). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 159 tests PASS (was 158 before this lane; +1). `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. `git diff --check` clean. Re-ran the AI-RET-001 report runner: `overallStatus=pass; source=7/7; answerShape=8/8; readback=pass; safetyNotes=true; nextSafeAction=true`. AI-RET-001 evidence report regenerated at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (47 lines, unchanged from prior lane). Voice test counts unchanged: focused Margot voice suite remains 3 suites / 28 tests.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (port `445` open, IP `192.168.2.78`), SSH is unavailable (probe at `2026-06-09 21:32 AEST` confirmed `nc` exit `0` for `:445` and exit `1` for `:22`), and no recovered Markdown artifacts are present.
- Files changed this tick (test+doc, no schema, no production, no GitHub push, no Vercel env mutation, no sandbox wizard subcommand): `docs/margot/lead-to-client-conversion-plan.md` (94 -> 121 lines; +27), `tests/unit/lib/margot/retrieval-evaluation.test.ts` (+1 new doc-drift test in the final describe block), `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (regenerated by the runner; 47 lines), `docs/margot/overnight-progress-log.md` (this entry), `docs/margot/morning-report.md` (new current block at top), `docs/margot/MARGOT-COMMAND-CENTER.md` (this rotation guard entry), `docs/margot/mac-mini-recovery-status.md` (newest probe entry at top).

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes; add additional local report corruption/error-path cases; package/review the local credential-boundary diff; refresh project/client/marketing/AI/retrieval control surfaces; add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.
6. Do not adopt Nango or any third-party connector platform; do not perform a live vector search, embeddings backfill, or live AI call against production.
7. When a fixture-binding doc is refreshed, add or update a doc-drift guard test (file-read + required-phrase + citation-source + prohibited-phrase check scoped to the assertion section) so future drift is caught locally.

## Current Autonomy Rotation Guard — 2026-06-09 20:58 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `455eb32` (sandbox-wizard auto-sync commit `455eb32 chore: Margot ops auto-sync [tick 20260609_200912]` is the current head; `git rev-list --count main..origin/main` returned `0` so the local main is in sync with origin). Inherited local dirty state is unchanged from the prior tick: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts` with case-insensitive `normalizedSubjectType` and 35 tests), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`, 16 tests), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`, 34 tests), and the deterministic stale-sync/daily-digest changes (`src/lib/runtime/stale-sync-check.ts` `last_error` + NaN guard, `src/lib/crm/daily-digest.ts` `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes`).
- Completed safe rotation lane: added a new mocked AI-RET-001 answer-shape fixture `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` to the Margot retrieval-evaluation harness, expanding the answer-shape gate from 7 to 8 fixtures while keeping the source-citation gate at 7. The new fixture is linked to the existing `AI-RET-001-LEAD-QUALIFICATION` source-citation fixture so a future lead-to-client conversion answer must cite `docs/margot/lead-to-client-conversion-plan.md`, `src/lib/crm/qualify-lead.ts`, `docs/margot/ai-enhancement-candidate-register.md`, and `docs/margot/crm-operating-model.md`, and must include the existing recommendation-only / no auto-conversion / no crm identity overwrite / identity review / board-approved conversion rules / operator-approved conversion contract. Six prohibited phrases (`lead auto-converted`, `client record created`, `follow-up sent`, `campaign launched`, `auto-conversion approved`, `nango`) reject common overclaims before command-center surfacing. The new fixture is wired into the report runner's default answers map and the candidate register's fixture contract.
- Verification passed: focused retrieval gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 34 tests PASS (was 32 before this lane; +2 new tests for the new fixture: a pass case proving the conversion gating language and citations evaluate to `pass`, and a reject case proving prohibited phrases and missing citation sources evaluate to `shape_mismatch`). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 158 tests PASS (was 156 before this lane; +2). `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. `git diff --check` clean. Re-ran the AI-RET-001 report runner: `overallStatus=pass; source=7/7; answerShape=8/8; readback=pass; safetyNotes=true; nextSafeAction=true`. AI-RET-001 evidence report regenerated at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (now 47 lines, was 46 before this lane). Voice test counts unchanged: focused Margot voice suite remains 3 suites / 28 tests.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (port `445` open, IP `192.168.2.78`), SSH is unavailable (probe at `2026-06-09 20:58 AEST` confirmed `nc` exit `0` for `:445` and exit `1` for `:22`), and no recovered Markdown artifacts are present.
- Files changed this tick (code+test+doc, no schema, no production, no GitHub push, no Vercel env mutation, no sandbox wizard subcommand): `src/lib/margot/retrieval-evaluation.ts` (added new answer-shape fixture + extended `MargotRetrievalAnswerShapeFixtureId` type to 8 members), `tests/unit/lib/margot/retrieval-evaluation.test.ts` (added new pinned-fixture block + 2 new pass/reject test cases + bumped 7→8 fixture-count assertions + added new entry to the all-fixtures maps + bumped readback answer-shape count 7→8), `scripts/margot-retrieval-evaluation-report.ts` (added new entry to the default answers map so the runner reports `answerShape=8/8`), `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (regenerated by the runner; now lists the 8th answer-shape row), `docs/margot/ai-enhancement-candidate-register.md` (header Date updated to `2026-06-09 20:56:46 AEST`; new answer-shape fixture contract table; "adds seven" → "adds eight" with timestamp), `docs/margot/overnight-progress-log.md` (this entry), `docs/margot/morning-report.md` (new current block at top), `docs/margot/MARGOT-COMMAND-CENTER.md` (this rotation guard entry), `docs/margot/mac-mini-recovery-status.md` (newest probe entry at top).

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes; add additional local report corruption/error-path cases; package/review the local credential-boundary diff; refresh project/client/marketing/AI/retrieval control surfaces; add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.
6. Do not adopt Nango or any third-party connector platform; do not perform a live vector search, embeddings backfill, or live AI call against production.

## Current Autonomy Rotation Guard — 2026-06-09 20:09 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `461a3ed`, `main...origin/main [ahead 0]`. Inherited local dirty work is unchanged: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`), and the deterministic stale-sync/daily-digest changes.
- Completed safe rotation lane: refreshed `docs/margot/crm-operating-model.md` to a `Last update: 2026-06-09 20:09 AEST` state. The previous version was last touched `2026-05-23 11:29 AEST` and pre-dated the AI-RET-001 7/7 source-citation + 7/7 answer-shape mocked report, the case-insensitive `normalizedSubjectType` approval-lifecycle lane (35 tests), the dedicated `digest-mappers` positive-coverage suite (16 tests), the `logCrmDigestReadError` `Set`-based fail-closed union guard (3 tests), the deterministic `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` daily-digest helpers, the stale-sync `last_error` + NaN guard (11 tests), the `crm-approval-persistence-plan.md` Stage-1 task-subtype decision, and the modern binding safety rules. The refresh adds a `Last update` marker, a `Previous refresh` pointer, an explicit `Related evidence` cross-link to the AI-RET-001 report, an explicit `Related rotation guard` pointer, a refreshed `Current evidence as of 2026-06-09 20:09 AEST` block that names the seven concrete CRM helper files + tests (`qualify-lead`, `daily-digest`, `digest-edge-cases`, `digest-mappers`, `digest-read-error`, `approval-lifecycle`, `activity-timeline`, plus the `runtime/stale-sync-check` 11-test suite), a tightened `Next Implementation Lanes` list that marks the stale-sync threshold lane as complete (with the `last_error` precedence + NaN guard notes), preserves the partial coverage already in `crm-contacts-create` / `crm-opportunities-create` / `control-panel-add-ons` routes, and adds a new lane 10 binding any client-facing send / public publishing / live semantic-search / live AI-call change to a green AI-RET-001 mocked report + updated source-citation / answer-shape contract, an `Out of Scope for This Revision` section that codifies the modern hard safety rules (no new vendor including Nango, no live vector DB reads, no sandbox wizard DB-writing/status subcommand, no GitHub push/merge/PR mutation, no Vercel deploy/env mutation, no production DB write, no public publishing, no paid spend, no client-facing send, no Mac Mini credential prompt/read, no destructive git, no cross-client context merge), and a `Senior PM verification checkpoint (2026-06-09 20:09 AEST)` block. The original 2026-05-23 content is preserved unchanged. The doc is now 274 lines (was 243 before this lane; +31).
- Verification passed: focused `wc -l` check on the refreshed doc returned 274 lines (was 243; +31). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 156 tests PASS; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed before and after status-report updates. Re-ran the AI-RET-001 report runner: `overallStatus=pass; source=7/7; answerShape=7/7; readback=pass; safetyNotes=true; nextSafeAction=true`. Voice test counts unchanged from the original 2026-05-23 05:57 AEST lane: focused Margot voice suite remains 3 suites / 28 tests.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (port `445` open, IP `192.168.2.78`), SSH is unavailable (last verified probe `2026-06-09 15:55 AEST`), and no recovered Markdown artifacts are present.
- Files changed this tick (docs only, no code, no schema, no test): `docs/margot/crm-operating-model.md` (243 -> 274 lines; +31), `docs/margot/overnight-progress-log.md` (this entry), `docs/margot/morning-report.md` (new current block at top), `docs/margot/MARGOT-COMMAND-CENTER.md` (this rotation guard entry), `docs/margot/mac-mini-recovery-status.md` (newest probe entry at top).

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes; add additional local report corruption/error-path cases; package/review the local credential-boundary diff; refresh project/client/marketing/AI/retrieval control surfaces; add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.
6. Do not adopt Nango or any third-party connector platform; do not perform a live vector search, embeddings backfill, or live AI call against production.

## Current Autonomy Rotation Guard — 2026-06-09 17:30 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `7ce7010`, `main...origin/main [ahead 0]`. Inherited local dirty work is unchanged: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`), and the deterministic stale-sync/daily-digest changes.
- Completed safe rotation lane: refreshed `docs/margot/access-and-data-requirements.md` (last touched `2026-05-23 06:55:27 AEST`) to a `Last update: 2026-06-09 17:30 AEST` state. The refresh added a `Last update` line with the lane summary, a `Previous refresh: 2026-05-23 06:55:27 AEST` pointer, an explicit `Related evidence` line pointing at the AI-RET-001 report, an explicit `Related rotation guard` pointer to the new in-doc checkpoint, an `Out of Scope for This Revision` section that codifies the modern hard safety rules (no new vendor including Nango, no live vector DB reads, no sandbox wizard DB-writing/status subcommand, no GitHub push/merge/PR mutation, no Vercel deploy/env mutation, no production DB write, no public publishing, no paid spend, no client-facing send, no Mac Mini credential prompt/read, no destructive git, no cross-client context merge), and a `Senior PM verification checkpoint (2026-06-09 17:30 AEST)` block (what exists, what has started, why it exists, missing/unclear, current health evidence, smallest next action). The original 2026-05-23 access policy content (purpose, principles, per-domain minimum permissions, security baseline, phased rollout, immediate next 10 actions, human decisions needed from Phill) is preserved unchanged. The doc is now 566 lines (was 541 before this lane; +25 lines for the new header lines, the out-of-scope section, and the Senior PM verification checkpoint).
- Verification passed: focused `wc -l` check on the refreshed doc returned 566 lines (was 541 before this lane; +25). Focused retrieval-evaluation Jest gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 32 tests PASS. `npm run type-check` passed. `npm run security:routes-check` reported 0 unprotected mutating routes. `git diff --check` passed. Re-ran the AI-RET-001 report runner: `overallStatus=pass; source=7/7; answerShape=7/7; readback=pass; safetyNotes=true; nextSafeAction=true`. Voice test counts unchanged from the original 2026-05-23 05:57 AEST lane: focused Margot voice suite remains 3 suites / 28 tests.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (IP `192.168.2.78`), SSH is unavailable (last verified probe `2026-06-09 15:55 AEST`), and no recovered Markdown artifacts are present.
- Files changed this tick (docs only, no code, no schema, no test): `docs/margot/access-and-data-requirements.md` (541 -> 566 lines; +25), `docs/margot/overnight-progress-log.md` (this entry), `docs/margot/morning-report.md` (new current block at top), `docs/margot/MARGOT-COMMAND-CENTER.md` (this rotation guard entry), `docs/margot/mac-mini-recovery-status.md` (newest probe entry at top).

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes, add additional local report corruption/error-path cases, package/review the local credential-boundary diff, refresh project/client/marketing/AI/retrieval/access control surfaces, or add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.
6. Do not adopt Nango or any third-party connector platform; do not perform a live vector search, embeddings backfill, or live AI call against production.

## Current Autonomy Rotation Guard — 2026-06-09 17:08 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `2d96cb7` (sandbox-wizard auto-sync commit `2d96cb7 chore: Margot ops auto-sync [tick 20260609_164403]` closed the 78-commit gap that existed at the prior tick), `main...origin/main [ahead 0]`. Inherited local dirty work is unchanged: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`), the deterministic stale-sync/daily-digest changes, and the modified `src/lib/crm/approval-lifecycle.ts` / `src/lib/crm/daily-digest.ts` / `src/lib/runtime/stale-sync-check.ts` plus their tests.
- Completed safe rotation lane: refreshed two control surfaces that were still on the 2026-05-23 lane and had not been aligned with the modern Senior PM verification rotation. `docs/margot/voice-test-gap-analysis.md` (now 192 lines, was 171) keeps the original 2026-05-23 coverage map and adds a `Files Reviewed (2026-06-09 Senior PM Verification Refresh)` section plus a current Senior PM verification checkpoint naming the existing 28 voice tests, the AI-RET-001 GATED-ACTION-BOUNDARY answer-shape and COMMAND-CENTER-CITATION source-citation fixtures, the missing/unclear gaps (malformed `voice_command_sessions` payload, unknown `source` enum, voice UI panel state machine unit test, end-to-end ElevenLabs → Supabase chain), the current health evidence, and the smallest next action. `docs/margot/orchestrator-prompt.md` (now 77 lines, was 52) keeps the original Senior PM control loop and adds a 14-file ordered read-first set (with `linear-watch-today.md` and the AI-RET-001 evidence gate), the binding hard safety rules (no Nango, no live semantic search, no sandbox wizard subcommand without authority, no public publishing / paid spend / client-facing send), and the explicit Senior PM verification rotation guard. Neither refreshed doc runs any sandbox DB-writing subcommand, swaps a model, or does external AI enrichment. The orchestrator-prompt now matches the modern Margot rotation guard contract and is the canonical binding prompt for any future cron/orchestrator run.
- Verification passed: focused `wc -l` check on both refreshed docs (192 / 77 lines); focused retrieval-evaluation Jest gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 32 tests PASS; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed before and after status-report updates. AI-RET-001 report unchanged: `overallStatus=pass`, `source=7/7`, `answerShape=7/7`, `safetyNotes=true`, `nextSafeAction=true`. Voice test counts unchanged from the original 2026-05-23 05:57 AEST lane: focused Margot voice suite remains 3 suites / 28 tests.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (IP `192.168.2.78`), SSH is unavailable (last probe `2026-06-09 15:55 AEST`), and no recovered Markdown artifacts are present.

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes, add additional local report corruption/error-path cases, package/review the local credential-boundary diff, refresh project/client/marketing/AI/retrieval control surfaces, or add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.

## Current Autonomy Rotation Guard — 2026-06-09 16:48 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `93b74f0`, `main...origin/main [ahead 78]`. Inherited local dirty work is unchanged: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`), the deterministic stale-sync/daily-digest changes, and the modified `src/lib/crm/approval-lifecycle.ts` / `src/lib/crm/daily-digest.ts` / `src/lib/runtime/stale-sync-check.ts` plus their tests.
- Completed safe rotation lane: refreshed `docs/margot/retrieval-rules.md` (last touched `2026-05-23 08:00 AEST`) so UNI-2052 retrieval policy is pinned to the local AI-RET-001 harness, the `DEFAULT_MARGOT_RETRIEVAL_MIN_SIMILARITY = 0.76` gate, the 7/7 source-citation contract, the 7/7 answer-shape contract, the 5-row prohibited-phrase list, and an explicit Out-of-Scope section. The doc now carries a `Last update: 2026-06-09 16:10 AEST` marker, a `Previous refresh: 2026-05-23 08:00 AEST` pointer, and a current Senior PM verification checkpoint (what exists, what has started, why it exists, missing/unclear, current health evidence, smallest next action). The original retrieval order, 2nd Brain carry-forward anchors, confidence thresholds, Margot-specific rules, Pi-CEO/Margot shared rules, and current repo hooks are preserved unchanged. The doc is now 147 lines (was 80 before this lane; +67 lines) and does not run any sandbox DB-writing subcommand, swap a model, or do external AI enrichment.
- Verification passed: focused `wc -l` check on the refreshed doc (147 lines); focused retrieval-evaluation Jest gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 32 tests PASS; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed before and after status-report updates. AI-RET-001 report unchanged: `overallStatus=pass`, `source=7/7`, `answerShape=7/7`, `safetyNotes=true`, `nextSafeAction=true`.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable, SSH is unavailable (last probe `2026-06-09 15:55 AEST`), and no recovered Markdown artifacts are present.

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes, add additional local report corruption/error-path cases, package/review the local credential-boundary diff, refresh project/client/marketing/AI/retrieval control surfaces, or add another mocked AI-RET-001 fixture.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.

## Current Autonomy Rotation Guard — 2026-06-09 11:49 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `df92cb6`, `main...origin/main [ahead 70]`. Inherited local dirty work is now: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), and the new untracked CRM digest-mappers TDD lane (`tests/unit/lib/crm/digest-mappers.test.ts`).
- Completed safe rotation lane: closed the last `src/lib/crm/*` module without a dedicated unit test file — `src/lib/crm/digest-mappers.ts` (167 lines, used by the daily-digest API route and the server helper). Authored 16 dedicated unit tests across 5 unhedged contract sections: `readDigestOwner` env-var precedence + blank-fallback, `QUALIFICATION_BANDS` exact set contents (case-sensitive), `mapLead` qualificationBand fail-closed derivation (rejects "hot"/"QUALIFIED"), `mapTask` source='margot_voice' detection via tags AND `voice/` obsidian_path (with whitespace-trim), and `mapOpportunity` probability (percent → fraction) parsing + stage→status fallback + requiresApproval fail-closed. Tests passed GREEN on first run because the module was already fail-closed; this lane added *positive coverage* of an unhedged contract rather than a RED→GREEN bug fix.
- Verification passed: focused run `npx jest tests/unit/lib/crm/digest-mappers.test.ts --runInBand` returned 1 suite / 16 tests; expanded CRM helper gate `npx jest tests/unit/lib/crm/ --runInBand` returned 8 suites / 99 tests; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed before and after status-report updates.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (newly observed IP `192.168.2.78`), SSH is unavailable, and no recovered Markdown artifacts are present.

## Current Autonomy Rotation Guard — 2026-06-09 15:31 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `4943e16`, `main...origin/main [ahead 72]`. Inherited local dirty work is unchanged: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), the prior CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`), the prior CRM digest-mappers positive-coverage lane (`tests/unit/lib/crm/digest-mappers.test.ts`), the untracked Margot retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `tests/unit/lib/margot/retrieval-evaluation.test.ts`), and the deterministic stale-sync/daily-digest changes.
- Completed safe rotation lane: refreshed `docs/margot/project-portfolio-index.md` to a `Last update: 2026-06-09 15:31 AEST` state. The previous version was last touched `2026-06-09 10:02 AEST` and pre-dated the digest-read-error redaction helper, the case-insensitive `normalizedSubjectType` approval-lifecycle lane, the digest-mappers positive coverage, the AI-RET-001 7/7 + 7/7 expansion, and the explicit sandbox-wizard credential-boundary lane. The refresh added a current Senior PM verification checkpoint, three new portfolio rows (CRM deterministic helpers, sandbox wizard credential boundary, AI enhancement pipeline updated to point at the AI-RET-001 evidence report and the retrieval-evaluation harness), and a tightened immediate-next-tasks list. The portfolio is now 96 lines (was 89 before this lane).
- Verification passed: focused `wc -l` check on the refreshed doc; combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returned 11 suites / 156 tests PASS; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable, SSH is unavailable, and no recovered Markdown artifacts are present.

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes, add additional local report corruption/error-path cases, package/review the local credential-boundary diff, or refresh project/client/marketing/AI control surfaces.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.

## Current Autonomy Rotation Guard — 2026-06-09 11:50 AEST

Margot must not keep spending every tick on the same sandbox-validation/status refresh once the blocker is known. Current state from this tick:

- Repo: `main` at `df92cb6`, `main...origin/main [ahead 70]`. Inherited local dirty work is now: the sandbox-wizard credential-boundary lane (`scripts/sandbox-wizard.sh` plus untracked `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts`), the prior CRM redaction TDD lane (`src/lib/crm/digest-read-error.ts`, `tests/unit/lib/crm/digest-read-error.test.ts`), and the new CRM approval-lifecycle TDD lane (`src/lib/crm/approval-lifecycle.ts`, `tests/unit/lib/crm/approval-lifecycle.test.ts`).
- Completed safe rotation lane: TDD-hardened the `evaluateCrmApprovalLifecycle` `subjectType` path — the function was case-sensitive (`'LEAD_CONVERSION'`, `'Data_Export'` returned `'invalid'`), causing routine approvals to be misclassified as needing Phill review. RED added 2 new tests proving the case-mismatch bug; GREEN added a single `.toLowerCase()` call to `normalizedSubjectType`, mirroring the existing status-path casing pattern. This was a local code+test lane, not a sandbox, production, provider-polling, deployment, PR, or client-facing lane.
- Verification passed: focused RED-then-GREEN run on `approval-lifecycle.test.ts` (2 new tests fail, 33 pass → 35/35 pass); expanded CRM helper gate `npx jest tests/unit/lib/crm/digest-read-error.test.ts tests/unit/lib/crm/read-daily-digest.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/unit/lib/crm/digest-edge-cases.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 6 suites / 75 tests; `npm run type-check` passed; `npm run security:routes-check` reported 0 unprotected mutating routes; `git diff --check` passed before and after status-report updates.
- Blocked/gated lane: the `tasks` / `voice_command_sessions` sandbox validation packet and the credential-boundary patch remain locally ready/static, but cannot advance to sandbox apply/status/diff/sync/promote, production promotion, or live RLS/service-role/constraint verification without a specific sandbox authority/auth gate.
- Safe evidence now includes: the new 2-test case-insensitive subjectType coverage in `tests/unit/lib/crm/approval-lifecycle.test.ts` and the hardened `src/lib/crm/approval-lifecycle.ts` (case-insensitive `normalizedSubjectType`), the prior 3-test `digest-read-error.test.ts` gate and hardened `src/lib/crm/digest-read-error.ts` (fail-closed `Set`-based union guard), `docs/margot/evidence/SANDBOX_VOICE_TASKS_AUTHORITY_HANDOFF.md`, the refreshed `docs/margot/project-portfolio-index.md` current verification checkpoint, the refreshed `docs/margot/crm-test-coverage-matrix.md` deterministic integration-health section, deterministic digest/stale-sync helpers and tests, local AI-RET-001 assets and read-back guards, `docs/margot/evidence/SANDBOX_WIZARD_CREDENTIAL_BOUNDARY_REVIEW_PACKET.md`, `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_REVIEW_PACKET.md`, `docs/margot/evidence/SANDBOX_VOICE_TASKS_VALIDATION_CHECKLIST.md`, and the sandbox-only voice/tasks migration proposal.
- Mac Mini recovery remains opportunistic only: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable, SSH is unavailable, and no recovered Markdown artifacts are present.

Rotation rule until the sandbox/Mac Mini gates change:

1. Do one bounded health/read-back check per tick.
2. If sandbox authority/auth is still missing, record it once and rotate to another safe Senior PM lane instead of revalidating the same blocked DB boundary repeatedly.
3. Preferred safe lanes: add route/page-level digest/stale-integration read-surface tests only when that surface changes, add additional local report corruption/error-path cases, package/review the local credential-boundary diff, or refresh project/client/marketing/AI control surfaces.
4. Do not run `setup`, `sync`, `apply`, `diff`, `status`, `reset`, or `promote` on the sandbox wizard unless the run has explicit authority for that exact wizard action.
5. Continue Mac Mini artifact recovery only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another lane moving.

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
- `tests/unit/margot-voice-failure-taxonomy.test.ts`

Current verification state:
- CRM contact/opportunity read-before-write duplicate safety refreshed at `2026-05-24 07:38 AEST`: `src/app/api/crm/contacts/route.ts` now checks normalized `dedupe_email_key` before insert; `src/app/api/crm/opportunities/route.ts` now checks exact Zod-trimmed opportunity name plus first supplied scoped link before insert; duplicate lookup hits return safe `409` conflicts before primary insert or timeline writes while preserving `23505` fallback race handling. Verification passed: `npx jest tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 3 suites / 40 tests; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Lead conversion timeline failure logging hardened at `2026-05-24 05:54 AEST`: `src/app/api/crm/leads/[id]/convert/route.ts` now logs generic messages only when best-effort `agent_actions` timeline inserts return or throw errors after the primary conversion succeeds. `tests/integration/api/crm-lead-conversion.test.ts` covers returned and thrown timeline failures without raw Error logging. Verification passed: `npx jest tests/integration/api/crm-lead-conversion.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 15 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- CRM test matrix timeline coverage refreshed at `2026-05-24 05:19 AEST`: `docs/margot/crm-test-coverage-matrix.md` now reflects the current mocked route contracts for best-effort sanitized timeline writes in contact creation, opportunity creation, and approved won/conversion-like opportunity approval-request events. Verification passed: `npx jest tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 3 suites / 32 tests passed.
- `node_modules` is present from the prior `npm ci` readiness pass.
- CRM daily digest privacy hardening passed at `2026-05-23 21:01 AEST`: `src/lib/crm/daily-digest.ts` now renders email-only lead fallback labels as stable `lead <id>` copy instead of raw email in operator priorities/markdown. TDD RED reproduced the leak first; spec review PASS; quality/security review APPROVED. Verification passed: focused daily digest/approval/timeline gate returned 3 suites / 43 tests passed; expanded CRM matrix returned 11 suites / 102 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- CRM approval decision timeline mapping refreshed at `2026-05-23 20:14 AEST`: `src/lib/crm/activity-timeline.ts` now also recognizes `approval_cancelled` and `approval_expired` events and maps approval approved/rejected/cancelled/expired events to sanitized pending `agent_actions` inserts. The review-requested sanitizer hardening blocks benign `rejectionReason` / `rejection_reason` metadata by key, not only sensitive-looking values. Verification passed: focused approval timeline/approval lifecycle gate returned 2 suites / 40 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed. Spec re-review PASS and quality/security re-review APPROVED.
- Command-center approval tag recognition refreshed at `2026-05-24 02:22 AEST`: `src/app/api/command-center/control-panel/route.ts` now counts `approval`, `approval-required`, and `needs-approval` task tags in `summary.approvalRequired`, in addition to blocked/approval statuses and Phill/Board/operator approval assignee markers. TDD RED reproduced the miss first with an `approval-required` tagged task returning 3 instead of 4. Verification passed: `npx jest tests/unit/components/command-center/HermesControlPanel.test.tsx tests/integration/api/control-panel.test.ts --runInBand` returned 2 suites / 7 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Command-center add-on approval timeline event write refreshed at `2026-05-24 04:32 AEST`: `src/app/api/command-center/control-panel/add-ons/route.ts` now writes a best-effort sanitized `crm_timeline_approval_requested` row to `agent_actions` after creating a new blocked add-on approval task. `tests/integration/api/control-panel-add-ons.test.ts` covers sanitized payload shape, no actor email in timeline payload/metadata, returned and thrown timeline insert failures still returning the primary task success, no duplicate event for existing open approval tasks, and generic task-insert logging without raw database error objects. TDD RED reproduced the missing timeline write and raw-error logging before the route changes. Verification passed: `npx jest tests/integration/api/control-panel-add-ons.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 15 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed. Spec re-review PASS; quality/security re-review APPROVED.
- Command-center add-on approval timeline event write shipped at `2026-05-24 04:47 AEST`: PR #184 is merged to `main` at `347397e` / `347397ee37d27dc0e49ebf63c272cabcdbecf9fb`; GitHub PR checks reported success for TypeScript, route/unit/integration/lint/audit/schema-drift gates, specialist reviews, and Chief Reviewer. Local post-merge verification also passed: `npx jest tests/integration/api/control-panel-add-ons.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 15 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Command-center approval status whitespace recognition refreshed at `2026-05-24 03:41 AEST`: `src/app/api/command-center/control-panel/route.ts` now trims CRM task `status` and `priority` before live workstream status/RYG mapping, extending the earlier approval-required classifier trim so whitespace-padded ` blocked ` rows do not stay falsely green/live when mapped to a command-center workstream. `tests/integration/api/control-panel.test.ts` covers the spaced status case. TDD RED reproduced the miss first with the mapped Margot voice workstream still `status=live` / `ryg=yellow`; it passed after the route fix. Verification passed: `npx jest tests/unit/components/command-center/HermesControlPanel.test.tsx tests/integration/api/control-panel.test.ts --runInBand` returned 2 suites / 7 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Command-center approval tag whitespace recognition refreshed at `2026-05-24 03:06 AEST`: `src/app/api/command-center/control-panel/route.ts` now trims approval status, tag, and assignee strings before approval-required classification, and `tests/integration/api/control-panel.test.ts` covers a spaced ` needs-approval ` tag. TDD RED reproduced the miss first with expected approval-required count 5 receiving 4. Verification passed: `npx jest tests/unit/components/command-center/HermesControlPanel.test.tsx tests/integration/api/control-panel.test.ts --runInBand` returned 2 suites / 7 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Command-center approval-required UI summary refreshed at `2026-05-23 22:48 AEST`: `src/components/command-center/control-panel/HermesControlPanel.tsx` now renders an `APPROVAL REQUIRED` summary cell beside GREEN/YELLOW/RED, using the existing `summary.approvalRequired` API contract with a zero seed fallback. Verification passed: `npx jest tests/unit/components/command-center/HermesControlPanel.test.tsx tests/integration/api/control-panel.test.ts --runInBand` returned 2 suites / 4 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Voice task schema provenance refreshed at `2026-05-23 19:22 AEST`: `docs/margot/voice-task-schema-provenance.md` now documents repo-local generated type evidence for `tasks` and `voice_command_sessions`, confirms no defining migration was found in `supabase/migrations/`, and keeps generated types as evidence rather than migration authority. Focused voice gate passed: 3 suites / 28 tests.
- CRM approval decision timeline mapping passed at `2026-05-23 18:06 AEST`: `src/lib/crm/activity-timeline.ts` now recognizes `approval_approved` and `approval_rejected` events and maps them to sanitized pending `agent_actions` inserts without approval references, Board IDs, rejection reasons, tokens, auth data, secrets, API keys, IPs, emails, phone numbers, or addresses. A review-blocking gap was fixed so structurally constructed approval decision events cannot become `done` even if supplied with an inconsistent `actionClass`. Verification passed: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 40 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- CRM approval task evidence mapper passed at `2026-05-23 17:11 AEST`: `buildCrmApprovalLifecycleInputFromTaskEvidence` now maps Stage 1 approval tasks into lifecycle input without Supabase writes, without treating completed tasks as executed, and without echoing approval references, Board IDs, approver values, rejection reasons, or malformed enum values in returned operator-facing reasons. Verification passed: approval lifecycle Jest suite 33 tests, `npm run type-check`, `npm run security:routes-check`, and `git diff --check`.
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
`2026-05-23 21:01 AEST`

Git state:
- branch: `feat/crm-approval-lifecycle-helper`
- latest local code/doc commit before this uncommitted digest privacy slice: `fbb434e docs: close wrapper tick log marker`
- GitHub push/PR remains blocked because `gh auth status` reports no GitHub hosts logged in; no PR/deploy was verified for the current local slice.

Dependency state:
- `node_modules=present`
- `package-lock.json=present`

Verification:
- Daily digest lead-label privacy hardening passed at 2026-05-23 21:01 AEST: `src/lib/crm/daily-digest.ts` now falls back to stable `lead <id>` labels instead of raw lead email for email-only leads, and `tests/unit/lib/crm/daily-digest.test.ts` proves operator-facing sections and markdown do not expose `private.contact@example.com`.
- Fresh verification after the digest hardening passed: `npx jest tests/unit/lib/crm/daily-digest.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 3 suites / 43 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Safe health check at 2026-05-23 20:49 AEST found `/Volumes` contains `Claude` and `Macintosh HD`, no approved target artifacts under `/Volumes`, `phills-mac-mini.local:445` reachable, `phills-mac-mini.local:22` unreachable, and no recovered Mac Mini artifacts present locally.
- Focused digest/approval/timeline verification passed at 2026-05-23 21:01 AEST: `npx jest tests/unit/lib/crm/daily-digest.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 3 suites / 43 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Expanded CRM matrix verification passed at 2026-05-23 21:01 AEST: 11 suites / 102 tests passed.
- Approval cancelled/expired timeline lane completed at 2026-05-23 20:14 AEST: `src/lib/crm/activity-timeline.ts` now recognizes `approval_cancelled` and `approval_expired` as high-severity, approval-required CRM timeline events and maps them to pending `agent_actions` insert payloads.
- Sanitization evidence: tests now prove approval decision events strip approval references, Board IDs, rejection reasons including benign `rejectionReason` / `rejection_reason`, tokens, auth values, client secrets, API keys, IPs, and sensitive-looking values before event/insert mapping while preserving benign decision labels and safe generic notes.
- Fresh verification passed at 2026-05-23 20:14 AEST: `npx jest tests/unit/lib/crm/activity-timeline.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 2 suites / 40 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Lead conversion route timeline-write lane completed at 2026-05-23 18:45 AEST: `src/app/api/crm/leads/[id]/convert/route.ts` now records a best-effort sanitized `crm_timeline_lead_converted` `agent_actions` row after the primary lead conversion update succeeds.
- Lead conversion safety evidence: the new mocked route coverage verifies the persisted timeline action stays `pending`, `requiresApproval=true`, uses the existing sanitizer/mapping helper, stores no Board approval ID, does not use raw lead email as the timeline subject label when company is blank, and does not fail the conversion response if the timeline insert throws after primary success.
- Fresh verification passed at 2026-05-23 18:54 AEST: `npx jest tests/integration/api/crm-lead-conversion.test.ts --runInBand` returned 1 suite / 7 tests passed; expanded CRM matrix returned 11 suites / 101 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Safe health check passed at 2026-05-23 18:32 AEST: `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` reachable, `phills-mac-mini.local:22` unreachable, and no recovered Mac Mini artifacts are present locally.
- Approval decision timeline mapping lane completed at 2026-05-23 18:06 AEST: `src/lib/crm/activity-timeline.ts` recognizes `approval_approved` and `approval_rejected` as high-severity, approval-required CRM timeline events and maps them to pending `agent_actions` insert payloads.
- Sanitization evidence: the new tests verify approval decision events strip approval references, Board IDs, rejection reasons, tokens, auth values, client secrets, API keys, IPs, and other sensitive metadata before event/insert mapping while preserving benign decision labels.
- Review fix evidence: `db79b53` adds a regression test and defensive mapper logic so structurally constructed approval decision events remain `pending` and `requiresApproval=true` even if the supplied event action class is inconsistent.
- Fresh verification passed at 2026-05-23 18:06 AEST: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand` returned 2 suites / 40 tests passed; `npm run type-check` passed; `npm run security:routes-check` returned 0 unprotected mutating routes; `git diff --check` passed.
- Safe health check passed at 2026-05-23 18:06 AEST: `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` reachable, `phills-mac-mini.local:22` unreachable, and no recovered Mac Mini artifacts are present locally.
- Approval persistence planning lane completed at 2026-05-23 16:38 AEST: `docs/margot/crm-approval-persistence-plan.md` now chooses current `tasks` approval subtype as Stage 1, defers a dedicated `crm_approvals` table until structured history/query needs are proven, and defines future sandbox-first table shape, lifecycle, route wiring order, and test plan.
- Updated `docs/margot/crm-schema-inventory.md` and `docs/margot/crm-test-coverage-matrix.md` so approvals are no longer an undecided persistence shape for the current lane: current decision is task-subtype queue now, future `crm_approvals` only after Stage 2 triggers and sandbox review.
- Focused approval lifecycle verification passed at 2026-05-23 16:38 AEST: `npx jest tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 1 suite, 20 tests passed.
- Safe health check passed at 2026-05-23 16:38 AEST: `node_modules=present`, `package-lock.json=present`, `/Volumes` contains only `Macintosh HD`, `phills-mac-mini.local:445` unreachable, `phills-mac-mini.local:22` unreachable, and `git diff --check` returned no whitespace errors.
- Approval lifecycle helper verification remains current: `src/lib/crm/approval-lifecycle.ts` classifies requested, approved, rejected, cancelled, expired, executed, invalid, and high-risk approval states as pure local decision support, always keeps `safeToAutoExecute: false`, and avoids echoing approval references/Board IDs in returned reasons.
- Prior expanded CRM matrix gate passed at 2026-05-23 16:11 AEST: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/activity-timeline.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand` returned 11 suites, 84 tests passed.
- Prior `npm run type-check` and `npm run security:routes-check` passed at 2026-05-23 16:11 AEST; no code was changed in this pass.
- Push/PR remains blocked for this branch: `GIT_TERMINAL_PROMPT=0 git push -u origin feat/crm-approval-lifecycle-helper` failed with `fatal: could not read Username for 'https://github.com': terminal prompts disabled`; `gh` is not installed.
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
- Latest 2026-05-23 18:32 AEST probe: `phills-mac-mini.local:445` is reachable.
- Latest 2026-05-23 18:32 AEST probe: `phills-mac-mini.local:22` is unreachable.
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

1. Treat the `tasks` / `voice_command_sessions` sandbox validation lane as `static_ready_auth_blocked_sandbox_validation_not_run` until a specific sandbox authority/auth gate is granted.
2. Package/review the inherited local sandbox-wizard credential-boundary diff without running DB-writing/status wizard subcommands.
3. Rotate active Senior PM effort to non-gated control surfaces when the sandbox gate is unchanged: project portfolio index, client 2nd Brain model, marketing strategy operating model, AI enhancement pipeline, retrieval evaluation fixtures, or command-center digest visibility.
4. Use `docs/margot/crm-schema-inventory.md`, `docs/margot/crm-operating-model.md`, and `docs/margot/crm-test-coverage-matrix.md` as the current schema/source-of-truth/verification map.
5. Use `docs/margot/lead-to-client-conversion-plan.md` as the current local guarded conversion contract; missing operator approval returns `403 operator_approval_required`, successful conversion writes a best-effort sanitized pending `crm_timeline_lead_converted` action, and the focused CRM lead suite has prior green evidence.
6. Use `src/app/api/crm/daily-digest/route.ts` and `src/lib/crm/daily-digest.ts` as the current local read-only daily CRM digest wiring; the route reads recent leads, workspace-scoped blocked/todo CRM task rows, and feature-flagged open/won/blocked opportunities when `UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED=true`.
7. Continue sandbox-only route/migration drafts only through local tests and the sandbox wizard under explicit sandbox authority; do not apply to production without explicit Board approval.
8. Continue Mac Mini recovery only when an authenticated SMB share is mounted, SSH becomes usable, or Phill provides an approved export.
9. Keep focused local Jest gates, `npm run type-check`, `npm run security:routes-check`, and `git diff --check` green before handoff or merge.
