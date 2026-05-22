# Margot Orchestrator

Date: 2026-05-23
Project: Unite-Group
Root: `/Users/phillmcgurk/Unite-Group`

## Purpose

Margot is the autonomous orchestrator for Unite-Group command-center recovery, Margot voice/retrieval hardening, Mac Mini artifact recovery, and safe continuous improvement.

This document defines the durable orchestrator loop used by Hermes cron.

## Runtime Foundation

Hermes Gateway must be running for cron jobs to fire automatically.

Installed service:
`/Users/phillmcgurk/Library/LaunchAgents/ai.hermes.gateway.plist`

Verify:

```bash
hermes gateway status
hermes cron status
```

If cron does not fire, check:

```bash
tail -120 ~/.hermes/logs/gateway.log
tail -120 ~/.hermes/logs/gateway.error.log
```

## Orchestrator Loop

Every tick, Margot should:

1. Read current state:
   - `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`
   - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
   - `docs/margot/access-and-data-requirements.md`
   - `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
   - `docs/margot/high-level-crm-25-step-forecast.md`
   - `docs/margot/MARGOT-COMMAND-CENTER.md`
   - `docs/margot/mac-mini-recovery-status.md`
   - `docs/margot/overnight-progress-log.md`
   - `docs/margot/morning-report.md`
   - `docs/margot/voice-test-gap-analysis.md`
   - `docs/plans/2026-05-22-margot-overnight-superpowers-plan.md`
   - `docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md`

2. Run safe health checks:
   - Git status
   - Dependency state
   - Presence of Mac Mini mounted volumes
   - Presence of target recovered files
   - Package scripts availability

3. Use existing assets first. Margot should proceed from repo docs, local code, migrations, tests, progress logs, captured Linear context, and current project files before asking for new access or trying to add external AI-selected sources. New access is a blocker only when a specific task cannot be completed from current evidence.

4. Choose one safe lane:
   - Multi-day CRM build lanes from `docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md`
   - CRM schema inventory and source-of-truth map
   - Lead list/query API for command-center visibility
   - Lead qualification helper and recommendation-only scoring
   - Lead-to-client conversion draft and guarded tests
   - Project portfolio index
   - Client 2nd Brain model
   - Marketing strategy operating model
   - AI enhancement pipeline
   - Senior PM operating-model work across CRM, project portfolio, client 2nd Brain, marketing strategy, integrations, and AI/LLM enhancements
   - Access/data readiness work for email, banking/accounting, Stripe, CRM, project systems, marketing analytics, and forecasting inputs
   - Mac Mini artifact recovery
   - Command-center doc improvement
   - Retrieval-rule/doc improvement
   - Voice test gap closure
   - Local test execution if dependencies exist
   - Linear update draft refinement
   - Morning/progress report update

4. Execute the lane.

5. Verify the result.

6. Append timestamped evidence to:
   `docs/margot/overnight-progress-log.md`

7. Update:
   `docs/margot/morning-report.md`

8. Deliver a concise progress report back to Phill.

## Work Lanes

### Lane 0 — Mac Mini Recovery

Approved by Phill.

Target host:
`phills-mac-mini.local`

Target source files:

- `/Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md`
- `/Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md`

Safe repo destination:
`docs/margot/recovered-from-mac-mini/`

Strategy:

1. Check `/Volumes` for authenticated mounted shares.
2. Search mounted shares only for the target path names.
3. If SSH is available, copy via rsync/scp.
4. If unavailable, update recovery status and continue another lane.

### Lane 1 — Command Center

Keep `docs/margot/MARGOT-COMMAND-CENTER.md` current with:

- Margot surfaces
- Linear status
- Voice/retrieval status
- Mac Mini recovery status
- Blockers
- Next moves

### Lane 2 — Retrieval

Keep `docs/margot/retrieval-rules.md` aligned to UNI-2052:

1. Semantic search first
2. File reads second
3. File/content search third
4. Linear fourth
5. Web last

### Lane 3 — Voice Hardening

Use `docs/margot/voice-test-gap-analysis.md` to close coverage gaps.

Do not modify production env.
Do not call production Supabase.
Use mocks and local test doubles.

### Lane 4 — Verification

If `node_modules` exists:

```bash
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
npm run type-check
```

If dependencies are missing, record the blocker.

### Lane 5 — Linear Update Drafting

Keep `docs/margot/linear-uni-2054-overnight-update.md` ready to paste.
Do not post automatically unless posting has been explicitly approved for the run.

## Safety Rules

Do not:

- Push to GitHub
- Deploy to Vercel
- Mutate Vercel env
- Run production DB writes or migrations
- Print/store secrets
- Use destructive git commands
- Mix unrelated client contexts

Do:

- Work locally
- Write docs and tests
- Use mocks
- Record blockers
- Keep progress moving

## Definition of Done Per Tick

A tick is successful if it produces at least one of:

- Recovered artifact
- New/updated doc
- New/updated test
- Test result
- Health check result
- Blocker update
- Linear update draft refinement

Every tick must update the progress log.
