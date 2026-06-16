# Draft Linear Update — UNI-2054

Ticket: UNI-2054 — Maintain Margot Command Center and RestoreAssist Content Index
As of: 2026-05-23 07:01 AEST

## Status

Margot command-center recovery and local reconstruction remain in progress. The local Unite-Group repo now has the Margot command-center draft and supporting operating artifacts needed for handoff/continuity, but the original RestoreAssist content index remains missing locally and no recovered Mac Mini artifacts have been copied yet.

Current local operating artifacts available in the repo:

- `docs/margot/MARGOT-COMMAND-CENTER.md`
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/access-and-data-requirements.md`
- `docs/margot/retrieval-rules.md`
- `docs/margot/voice-test-gap-analysis.md`
- `docs/margot/mac-mini-recovery-status.md`
- `docs/margot/OVERNIGHT-AUTONOMY-MANDATE.md`
- `docs/plans/2026-05-22-margot-overnight-superpowers-plan.md`

## Evidence

Latest repo/host health check evidence at 2026-05-23 07:01 AEST:

- Git working tree includes modified tracked files:
  - `src/components/command-center/voice/failure-taxonomy.ts`
  - `tests/integration/api/margot-voice-signed-url.test.ts`
  - `tests/integration/api/margot-voice-task.test.ts`
- Git working tree includes untracked local artifacts/context:
  - `.linear/`
  - `.vercel-context.json`
  - `docs/margot/`
  - `docs/plans/`
  - `tests/unit/margot-voice-failure-taxonomy.test.ts`
- Dependency/install state:
  - `node_modules` is present.
  - `package-lock.json` is present.
  - Available npm scripts include `lint`, `build`, `dev`, `start`, `test`, `test:all`, `type-check`, `gen:types`, `check:schema-drift`, `validate:jsonld`, `brand:lint`, `brand:lint:csv`, `security:routes-check`, and `prepare`.
- Margot voice/code surfaces currently evidenced in repo:
  - Voice panel UI: `src/components/command-center/voice/MargotVoicePanel.tsx`
  - Failure taxonomy: `src/components/command-center/voice/failure-taxonomy.ts`
  - ElevenLabs signed URL API: `src/app/api/pi-ceo/margot-voice/signed-url/route.ts`
  - Voice-to-CRM task ingest API: `src/app/api/pi-ceo/margot-voice/task/route.ts`
  - Semantic wrapper: `scripts/margot-semantic-search-wrapper.ts`
  - Integration tests:
    - `tests/integration/api/margot-voice-signed-url.test.ts`
    - `tests/integration/api/margot-voice-task.test.ts`
  - Failure-taxonomy unit test: `tests/unit/margot-voice-failure-taxonomy.test.ts`
- Mac Mini discovery/recovery evidence:
  - `phills-mac-mini.local` resolves to IPv4 addresses including `169.254.28.74`, `169.254.37.78`, and `192.168.2.77`.
  - SMB/File Sharing port `445` is reachable.
  - SSH/Remote Login port `22` is unreachable.
  - `/Volumes` only contains `Macintosh HD`; no authenticated Mac Mini share is mounted locally.
  - `docs/margot/recovered-from-mac-mini/` contains only `.gitkeep`.
  - Local reconstructed `docs/margot/MARGOT-COMMAND-CENTER.md` exists.
  - Original `RESTOREASSIST-CONTENT-INDEX.md` is not present locally yet.

## Verification

Latest known local verification status for the Margot voice lane, refreshed at 2026-05-23 06:29 AEST:

- `npm ci` completed successfully using `package-lock.json` during the readiness pass.
- Focused Jest passed: 3 suites, 28 tests.
- Focused Jest command: `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`
- `npm run type-check` passed.
- Current 2026-05-23 07:01 AEST health check confirms the required dependency artifacts and scripts are present, and confirms the Mac Mini recovery destination has not received original artifacts beyond `.gitkeep`.

## Blockers

1. Original RestoreAssist content index remains missing locally; it still needs recovery from the Mac Mini/source once access is available.
2. Mac Mini artifact copy requires an authenticated SMB mount or another approved transfer path. SMB is reachable, but no share is mounted under `/Volumes`; SSH/Remote Login is currently unreachable.
3. Vercel link/env verification remains blocked by missing local credentials/token. Continue recording env names only, never values.

## Next actions

1. Mount/authenticate the Mac Mini SMB share and copy only the approved original artifacts into `docs/margot/recovered-from-mac-mini/`.
2. Recover/confirm the original `RESTOREASSIST-CONTENT-INDEX.md`; do not treat the local reconstruction as a recovered Mac Mini artifact.
3. Keep `docs/margot/MARGOT-COMMAND-CENTER.md` and the operating artifacts current as the handoff source of truth.
4. Re-run focused Margot voice tests and `npm run type-check` before merge/handoff if code changes continue.
5. Link Vercel or provide env access when credentials/token are available; record env names only, never values.
