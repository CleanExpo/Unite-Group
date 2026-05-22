# Margot 2nd Brain Carry-Forward Directive

Date: 2026-05-23 06:40:08 AEST
Project: Unite-Group
Owner: Margot
Canonical roadmap: `docs/margot/high-level-crm-25-step-forecast.md`

## Purpose

This note pins the High-Level CRM forecast and Senior Project Manager mandate into Margot's 2nd Brain operating context so they are carried forward into this task, the next task, and all future Unite-Group / Margot tasks.

Phill's instruction is clear: Margot must not treat the CRM forecast as a one-off document. It is now durable operating context for ongoing work.

## Carry-Forward Rule

For every future Unite-Group task involving Margot, CRM, Command Center, clients, leads, tasks, integrations, 2nd Brain retrieval, Linear, Stripe, Supabase, Vercel, GitHub, active projects, marketing strategy, client context, AI/LLM improvements, or daily operating intelligence, Margot must first consider:

1. What does the High-Level CRM forecast imply for this task?
2. Does this task advance the CRM operating loop?
3. Does this task need to update the 2nd Brain docs, schema inventory, operating model, or progress log?
4. What can Margot discover independently before asking Phill?
5. What business judgment, if any, genuinely requires Phill?

## Canonical CRM Operating Loop

Every future task should be evaluated against this loop:

```text
Inbound signal
  ↓
Normalize event
  ↓
Resolve identity
  ↓
Attach to client / business / contact / opportunity / task
  ↓
Decide: auto / draft / ask Phill / block / never
  ↓
Write CRM event + optional task / notification
  ↓
Sync execution system if needed, usually Linear
  ↓
Verify result
  ↓
Surface in Phill cockpit + daily digest
```

## Current Strategic Priorities

The next CRM/Margot tasks should carry forward these priorities unless a higher-priority blocker appears:

1. Read `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` first for project/client/marketing/AI oversight.
2. Use existing repo docs, local code, migrations, tests, progress logs, and captured project context first. Do not wait for speculative new access when current evidence is enough to complete the task.
3. Create `docs/margot/crm-operating-model.md`.
4. Create `docs/margot/crm-schema-inventory.md`.
5. Investigate lead persistence in `src/app/api/marketing/leads/route.ts`.
6. Decide whether to add `crm_leads` or use an existing table.
7. Draft lead-to-client conversion flow.
8. Draft contact model proposal.
9. Draft opportunity/task/approval model proposal.
10. Build CRM test coverage matrix.
11. Create `docs/margot/project-portfolio-index.md`.
12. Create `docs/margot/client-second-brain-model.md`.
13. Create `docs/margot/marketing-strategy-operating-model.md`.
14. Create `docs/margot/ai-enhancement-pipeline.md`.
15. Keep Margot voice tests and type-check green.
16. Continue Mac Mini artifact recovery only when safe authenticated access exists.

## Margot Must Discover First

Before asking Phill for input, Margot should inspect:

- `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/MARGOT-COMMAND-CENTER.md`
- `docs/margot/retrieval-rules.md`
- `docs/margot/MARGOT-ORCHESTRATOR.md`
- `docs/margot/overnight-progress-log.md`
- `docs/margot/morning-report.md`
- `supabase/migrations/`
- `src/app/api/empire/`
- `src/app/api/marketing/leads/route.ts`
- `src/app/api/pi-ceo/margot-voice/`
- `src/lib/empire/`
- relevant tests under `tests/`

## Human Judgment Still Needed Eventually

Margot should not ask all of these at once. Use structured defaults first. Ask only when work is blocked by actual business judgment.

Likely future Phill decisions:

1. Pipeline stages.
2. Which businesses/clients enter the CRM cockpit first.
3. What counts as urgent.
4. Which actions Margot may auto-create.
5. Which actions require Phill approval.
6. Whether website leads should notify Phill immediately.
7. Whether Margot may create Linear tickets automatically for CRM tasks.
8. Daily digest time/channel.
9. Privacy boundaries for client notes and voice summaries.
10. Whether recovered Mac Mini artifacts override or merge with reconstructed docs.

## Retrieval Integration

This note should be included in Margot's read-first set and retrieval rules. It functions as the 2nd Brain anchor for CRM continuity.

When semantic search is unavailable or low confidence, exact file read of this note and the High-Level CRM forecast is required before making CRM architecture, implementation, or prioritization decisions.

## Definition of Done for Carry-Forward

This directive is active when:

- Persistent Hermes memory contains the CRM carry-forward fact.
- `docs/margot/retrieval-rules.md` points to this directive.
- `docs/margot/MARGOT-ORCHESTRATOR.md` reads this directive every tick.
- `docs/margot/orchestrator-prompt.md` includes this directive in the read-first set.
- `docs/margot/MARGOT-COMMAND-CENTER.md` references this directive.
- `docs/margot/morning-report.md` and `docs/margot/overnight-progress-log.md` record that the carry-forward directive was installed.
