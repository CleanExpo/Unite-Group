# Margot Retrieval Rules

Date: 2026-05-23
Source: Linear UNI-2052 / local Margot wrapper context

## Purpose

Margot should retrieve operating knowledge in a predictable, auditable order. The goal is to use the fastest high-signal source first while preserving verification when confidence is uncertain.

## 2nd Brain Carry-Forward Anchors

Before any Unite-Group CRM/Margot/Command Center task, treat these files as durable 2nd Brain context:

1. `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
2. `docs/margot/high-level-crm-25-step-forecast.md`
3. `docs/margot/MARGOT-COMMAND-CENTER.md`
4. `docs/margot/MARGOT-ORCHESTRATOR.md`
5. `docs/margot/overnight-progress-log.md`
6. `docs/margot/morning-report.md`

The High-Level CRM forecast is not a one-off plan. It is active operating context for future Margot tasks and must shape priorities, questions, schema work, integration work, and daily operating intelligence.

## Retrieval Order

1. Semantic search first
   - Use Margot’s semantic search wrapper for 2nd Brain / embedded operational knowledge.
   - Best for: prior decisions, agent instructions, project context, operating patterns, wiki knowledge.
   - If the task touches CRM, clients, leads, tasks, Margot, integrations, or Command Center strategy, ensure the CRM carry-forward anchors above are included in context.

2. File reads second
   - Use exact files when semantic search or Linear points to a path.
   - Best for: implementation details, repo-local docs, source files, tests, command-center artifacts.

3. File/content search third
   - Use targeted search when exact file paths are unknown.
   - Best for: locating Margot references, route handlers, components, tests, docs.

4. Linear API fourth
   - Use Linear for active queue, status, blockers, priorities, project/team metadata, and comments.
   - Linear is the operating board, not the long-form source of truth for implementation details.

5. Web search last
   - Use only for current external facts, vendor docs, package/API references, or when repo/Linear do not answer the question.

## Confidence Thresholds

- `> 0.8` — use directly if the source is authoritative and current.
- `0.6–0.8` — verify with file read, Linear issue, or another independent source.
- `< 0.6` — fallback to another retrieval method.

## Margot-Specific Rules

- Prefer `margot_semantic_search` for cross-project operating knowledge before broad filesystem searches.
- Use file reads for all repo-local code decisions.
- Use Linear for active status and blocker tracking.
- Do not blend client contexts unless the active ticket explicitly scopes them.
- Keep RestoreAssist / Brand OS work separate from CCW unless working UNI-2053.
- Treat approval-required voice tasks as blocked for Phill approval.
- Never expose secrets from env files, Vercel, Supabase, Linear, or local config.

## Pi-CEO / Margot Shared Rules

- Semantic search should be the first retrieval attempt for operational memory.
- File reads are required before editing code.
- Linear status must be checked before claiming a ticket as complete.
- Production database changes must go through the sandbox wizard and require explicit approval before promotion.

## Current Repo Hooks

Margot wrapper:
`scripts/margot-semantic-search-wrapper.ts`

Pi-CEO wrapper:
`scripts/pi-ceo-semantic-search-wrapper.ts`

Local command-center doc:
`docs/margot/MARGOT-COMMAND-CENTER.md`

Mac Mini recovery status:
`docs/margot/mac-mini-recovery-status.md`
