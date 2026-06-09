# Margot Retrieval Rules

Date: 2026-06-09
Last update: 2026-06-09 16:10 AEST
Previous refresh: 2026-05-23 08:00 AEST
Source: Linear UNI-2052 / local Margot wrapper context / AI-RET-001 local harness
Owner: Margot

## Purpose

Margot should retrieve operating knowledge in a predictable, auditable order. The goal is to use the fastest high-signal source first while preserving verification when confidence is uncertain.

This revision pins the abstract UNI-2052 thresholds to the repo-local AI-RET-001 fixture harness, so the order, the similarity gate, the citation contract, and the answer-shape contract are now testable locally rather than only described in prose.

## 2nd Brain Carry-Forward Anchors

Before any Unite-Group CRM/Margot/Command Center task, treat these files as durable 2nd Brain context:

1. `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
2. `docs/margot/high-level-crm-25-step-forecast.md`
3. `docs/margot/MARGOT-COMMAND-CENTER.md`
4. `docs/margot/MARGOT-ORCHESTRATOR.md`
5. `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
6. `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`
7. `docs/margot/overnight-progress-log.md`
8. `docs/margot/morning-report.md`

The High-Level CRM forecast is not a one-off plan. It is active operating context for future Margot tasks and must shape priorities, questions, schema work, integration work, and daily operating intelligence.

## Retrieval Order

1. Semantic search first
   - Use Margot's semantic search wrapper for 2nd Brain / embedded operational knowledge.
   - Wrapper: `scripts/margot-semantic-search-wrapper.ts` (`margotSemanticSearch` / `getRelevantBrainContext`).
   - Default similarity gate: `DEFAULT_MARGOT_RETRIEVAL_MIN_SIMILARITY = 0.76` (re-exported by `src/lib/margot/retrieval-evaluation.ts`).
   - Best for: prior decisions, agent instructions, project context, operating patterns, wiki knowledge.
   - If the task touches CRM, clients, leads, tasks, Margot, integrations, or Command Center strategy, ensure the CRM carry-forward anchors above are included in context.
   - Hard rule: every answer surfaced to the command center must carry the matched source files as citations. A `fallback_required` or `shape_mismatch` evaluation forces a file-read fallback and answer rewrite before the operator sees it.

2. File reads second
   - Use exact files when semantic search or Linear points to a path.
   - Best for: implementation details, repo-local docs, source files, tests, command-center artifacts.
   - File reads are required before any code or schema edit, before any documentation lane that changes verified behavior, and before any production-bound change.

3. File/content search third
   - Use targeted search when exact file paths are unknown.
   - Best for: locating Margot references, route handlers, components, tests, docs.
   - Never use file search as a substitute for the carry-forward file reads; use it to *find* the file, then read it.

4. Linear API fourth
   - Use Linear for active queue, status, blockers, priorities, project/team metadata, and comments.
   - Linear is the operating board, not the long-form source of truth for implementation details.
   - Never claim a ticket is complete without checking Linear status.

5. Web search last
   - Use only for current external facts, vendor docs, package/API references, or when repo/Linear do not answer the question.
   - Do not pull in AI-picked sources, third-party connector platforms (including Nango), or speculative integrations unless the current task is genuinely blocked by a specific named missing source.

## Confidence Thresholds

The thresholds are not just policy. They are exercised by the AI-RET-001 harness on every test run.

- `> 0.76` (default minSimilarity) - use directly if the source is authoritative and current, and the answer-shape fixture is `pass`.
- `0.6 - 0.76` - the fixture harness treats this as a `fallback_required` outcome; verify with file read, Linear issue, or another independent source before surfacing the answer.
- `< 0.6` - fail-closed. Re-run with file read fallback. Do not surface to the command center.

Prohibited phrases in the surfaced answer (asserted by every answer-shape fixture):
- live DB mutations
- Nango / connector-platform actions
- Vercel deploy/env mutation
- GitHub push without approval
- Mac Mini credential prompts or secret reads
- client-facing sends without approval

## AI-RET-001 Local Retrieval Harness (UNI-2052 working evidence)

The abstract thresholds and behavior above are pinned to a repo-local, mocked, fail-closed harness so any drift from the policy is caught by `npx jest`.

- Harness module: `src/lib/margot/retrieval-evaluation.ts`
  - Exports `MARGOT_RETRIEVAL_EVALUATION_FIXTURES` (7 source-citation fixtures).
  - Exports `MARGOT_RETRIEVAL_ANSWER_SHAPE_FIXTURES` (7 answer-shape fixtures).
  - Exports `evaluateMargotRetrievalFixtures`, `evaluateMargotRetrievalAnswerShapes`, `buildMargotRetrievalEvaluationReport`, `readBackMargotRetrievalEvaluationReport`.
  - Exports the `DEFAULT_MARGOT_RETRIEVAL_MIN_SIMILARITY = 0.76` gate.
- Runner script: `scripts/margot-retrieval-evaluation-report.ts`
  - Writes the report to `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (refuses to write outside `docs/margot/evidence/`).
- Unit tests: `tests/unit/lib/margot/retrieval-evaluation.test.ts`
  - 32 tests covering source-citation gating, answer-shape gating, empty-results fallback, non-Mac-Mini low-similarity branch, all-empty results-map branch, report read-back integrity (missing/malformed summary rows, inconsistent counts, duplicate summary rows, duplicate overall-status rows, duplicate handoff sections, duplicate fixture result sections, missing fixture-result sections, unexpected fixture statuses, fixture-result row-count/status reconciliation, missing handoff blocks, gated-action overclaims, digest-send/publish/mutation overclaims, access/new-vendor overclaims, Mac Mini recovery/credential overclaims).
- Source-citation fixtures (7): `AI-RET-001-SANDBOX-WIZARD`, `AI-RET-001-MAC-MINI`, `AI-RET-001-LEAD-QUALIFICATION`, `AI-RET-001-USE-EXISTING-ASSETS`, `AI-RET-001-SENIOR-PM-LOOP`, `AI-RET-001-INTEGRATION-STALE-SYNC`, `AI-RET-001-COMMAND-CENTER-CITATION`.
- Answer-shape fixtures (7): `AI-RET-001-ANSWER-INTEGRATION-STALE-SYNC`, `AI-RET-001-ANSWER-COMMAND-CENTER-STATUS`, `AI-RET-001-ANSWER-REPORT-HANDOFF`, `AI-RET-001-ANSWER-GATED-ACTION-BOUNDARY`, `AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY`, `AI-RET-001-ANSWER-ACCESS-REQUEST-BOUNDARY`, `AI-RET-001-ANSWER-MAC-MINI-RECOVERY-BOUNDARY`.
- Report: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`
  - `overallStatus=pass` is the only state the runner accepts for command-center surfacing.

Focused gate command:

```bash
npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand
```

## Margot-Specific Rules

- Prefer `margot_semantic_search` for cross-project operating knowledge before broad filesystem searches.
- Use file reads for all repo-local code decisions; semantic results must always be cited, never trusted blind.
- Use Linear for active status and blocker tracking.
- Do not blend client contexts unless the active ticket explicitly scopes them.
- Keep RestoreAssist / Brand OS work separate from CCW unless working UNI-2053.
- Treat approval-required voice tasks as blocked for Phill approval.
- Never expose secrets from env files, Vercel, Supabase, Linear, or local config.
- Never invent or read Mac Mini credentials. Mac Mini answers must rely on the recovery status doc and the bounded probe; if a source file is missing, return `fallback_required` and stop.

## Pi-CEO / Margot Shared Rules

- Semantic search should be the first retrieval attempt for operational memory.
- File reads are required before editing code.
- Linear status must be checked before claiming a ticket as complete.
- Production database changes must go through the sandbox wizard and require explicit approval before promotion.
- AI-RET-001 must remain `pass` before any new live retrieval threshold, new fixture, or new answer-shape rule ships.

## Out of Scope for This Revision

- Live vector DB reads, embeddings backfill, or live semantic-search calls against production. The harness is mocked and local.
- New vendor onboarding (including Nango) without explicit Phill approval.
- Public publishing, paid spend, or client-facing sends.
- Any production DB write, migration, Vercel deploy/env mutation, or GitHub push.
- Mac Mini credential prompt/read, secret printing/storage, or recursive system-volume scan.

## Current Repo Hooks

Margot wrapper:
`scripts/margot-semantic-search-wrapper.ts`

Pi-CEO wrapper:
`scripts/pi-ceo-semantic-search-wrapper.ts`

Local command-center doc:
`docs/margot/MARGOT-COMMAND-CENTER.md`

Mac Mini recovery status:
`docs/margot/mac-mini-recovery-status.md`

Senior PM verification checkpoint (this lane):

- What exists: AI-RET-001 source-citation harness, 7/7 pass; answer-shape harness, 7/7 pass; report runner writing to `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`; report read-back parser rejecting malformed/duplicate/overclaiming rows; retrieval-rules doc now pinned to the harness, the gate, and the answer-shape contract; carry-forward anchors unchanged.
- What has started: 2026-06-09 16:10 AEST retrieval-rules refresh (this lane). No new code, no new fixture, no new answer-shape rule.
- Why it exists: the previous retrieval-rules doc (last touched 2026-05-23 08:00 AEST) described thresholds in prose only; the AI-RET-001 harness now exists, the gate is `0.76`, and the answer-shape contract is testable. This refresh links policy to the harness so drift is caught locally.
- Missing/unclear: live retrieval threshold, embedding model, and vector DB contract remain unverified. The local harness is mocked; do not treat it as proof of live behavior.
- Current health evidence: `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` -> 1 suite / 32 tests pass. Report is `overallStatus=pass`, `source=7/7`, `answerShape=7/7`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable, SSH unreachable; no credential prompt/read, no recursive system-volume scan.
- Smallest next action: when a real retrieval change is needed, add a new fixture to `MARGOT_RETRIEVAL_EVALUATION_FIXTURES` or `MARGOT_RETRIEVAL_ANSWER_SHAPE_FIXTURES` first, then run the focused Jest gate, then update this doc with the new fixture id.
