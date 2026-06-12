# Margot Forward Readiness Gap Analysis

Date: 2026-05-23 05:57 AEST
Project: `/Users/phillmcgurk/Unite-Group`

## Purpose

Phill's correction is valid: Margot cannot only react after a run fails. Before taking on an autonomous task, Margot must understand the desired end result and prove that the required transport, credentials, dependencies, verification commands, delivery path, and rollback boundaries exist.

This document records what was missing, what was fixed immediately, and what must be checked before future autonomous runs.

## End Result Margot Is Being Asked To Achieve

Build a dependable Unite-Group / Hermes Empire operating lane where Margot can:

1. Recover the approved Mac Mini artifacts over the Thunderbolt / local Mac path.
2. Keep the Unite-Group Margot command-center docs and retrieval rules current.
3. Harden Margot voice/retrieval code using safe local tests.
4. Run verification without waiting for human intervention.
5. Report honest status, blockers, next action, and evidence after each tick.
6. Avoid production writes, secret exposure, destructive git, or unrelated client-context mixing.

## What Was Missing

### 1. Preflight did not prove runtime readiness before promising overnight work

Observed:

- Hermes Gateway is now running, but it had not been proven as a durable prerequisite before the overnight expectation was set.
- Hermes cron job exists and is active; it previously failed delivery with: `no delivery target resolved for deliver=origin`.
- Corrective action taken: cron job `4ae3c639a0c4` now uses `deliver=local` so it no longer pretends a user-visible origin delivery exists. Native launchd/project logs are the explicit evidence channel until a real messaging/home target is configured.

Required forward understanding:

- A run is not ready just because it is scheduled.
- It is ready only when scheduler, approvals, tools, delivery, logs, and verification loop are all proven.

### 2. Dependency readiness was not checked early enough

Observed before this correction:

- `node_modules` was missing.
- `jest` was unavailable.
- Focused Margot tests could not run.

Fixed now:

- Ran `npm ci` successfully using the repo `package-lock.json`.
- Ran focused Margot voice tests successfully, including the failure-taxonomy unit test added later in the cron tick:
  - `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`
  - Result: 3 suites passed, 28 tests passed.
- Ran type-check successfully:
  - `npm run type-check`
  - Result: `tsc --noEmit` passed.

Remaining dependency note:

- `npm audit --audit-level=moderate --json` reports 3 moderate vulnerabilities involving `postcss` through `next` / `next-intl`. The suggested npm force fix is semver-major/weird and should not be applied automatically.

### 3. Package-manager policy was ambiguous

Observed:

- README says `pnpm install`.
- `pnpm` is not installed on this Mac.
- The repo contains `package-lock.json`, so `npm ci` is the reproducible local install path currently available.

Required forward understanding:

- Use `npm ci` when `package-lock.json` is present and `pnpm-lock.yaml` is absent.
- Do not assume README package-manager commands are current without checking lockfiles and installed tools.

### 4. Mac Mini recovery lacked an authenticated transport

Observed now:

- Host resolves: `phills-mac-mini.local`.
- SMB/File Sharing port 445 is reachable now.
- SSH/Remote Login port 22 still times out.
- `/Volumes` contains only `Macintosh HD`; no authenticated Mac Mini share is mounted.
- Noninteractive SMB credential attempts are not an acceptable autonomous path because credentials must not be embedded or printed.

Required forward understanding:

- SMB port 445 reachable means the Mac Mini is visible, not that files are accessible.
- For artifact recovery, Margot needs one of:
  1. Finder-mounted authenticated SMB share under `/Volumes`, or
  2. Remote Login enabled on the Mac Mini with SSH key/session access, or
  3. a user-provided archive/export of the two approved files.

Approved target files remain:

- `/Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md`
- `/Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md`

Safe destination remains:

- `docs/margot/recovered-from-mac-mini/`

### 5. Vercel/env readiness is not established

Observed:

- `.vercel-context.json` exists.
- `.vercel/` is not linked locally.
- No local Vercel token/link was proven.

Required forward understanding:

- Margot can write local tests and docs without Vercel.
- Margot cannot truthfully verify production voice env readiness until Vercel link/env access exists.
- Missing env names may be recorded; values must never be printed.

### 6. Linear update path is configured by context but not proven as a write channel

Observed:

- `.linear/project.json` contains project/team metadata and says `LINEAR_API_KEY` is configured in Hermes env.
- The current local docs include a draft Linear update.

Required forward understanding:

- Do not claim Linear has been updated unless an actual Linear API/tool response confirms it.
- Draft locally by default; post only when the task explicitly authorizes posting.

### 7. Delivery and observability need a stronger contract

Observed:

- Hermes cron previously had `Deliver: origin`, but the last cron report showed delivery failed because no delivery target resolved.
- Corrective action taken at `2026-05-23 05:57 AEST`: cron job `4ae3c639a0c4` was updated to `deliver=local`.
- Native launchd logs to files and updates progress docs, but does not automatically notify Phill.

Required forward understanding:

- A background job must have at least one verified observation channel:
  - user-visible delivery target, or
  - file-based progress log with explicit path, or
  - both.
- If delivery is not configured, do not call it user-visible delivery. Treat project logs and reports as the official evidence path.

## Forward Preflight Checklist For Every Margot Autonomous Run

Before claiming a task can run autonomously, Margot must verify:

1. Goal clarity
   - What exact end result is expected?
   - What files, tickets, routes, or artifacts define completion?

2. Source-of-truth map
   - Repo docs/files for implementation details.
   - Linear for active queue/status.
   - Semantic search/2nd Brain for operating memory when available.
   - Web only for external/current vendor facts.

3. Transport/access
   - For Mac Mini work: host resolves, SMB/SSH status known, mounted share or SSH access proven.
   - For Vercel work: `.vercel/project.json` or token/link proven.
   - For Linear writes: API/tool call proven, not assumed.

4. Dependency readiness
   - Lockfile identified.
   - Package manager available.
   - Dependencies installed or explicitly blocked.
   - Test command selected before changing code.

5. Verification path
   - Focused test command defined.
   - Type-check/build command defined where relevant.
   - Expected pass/fail state understood.

6. Safety boundary
   - No production DB writes/migrations without sandbox wizard.
   - No Vercel env mutation/deploy.
   - No GitHub push.
   - No secret printing/storage.
   - No destructive git.
   - No unrelated client-context mixing.

7. Observability/delivery
   - Progress log path exists.
   - Morning/status report path exists.
   - Cron/launchd status checked.
   - User-visible delivery target verified, or failure recorded.

8. Fallback lane
   - If the main lane blocks, Margot must continue with a safe independent lane rather than stop.

## Immediate Priority Queue

### P0 — Recovery access

Need one authenticated path to Mac Mini files:

- Mount the Mac Mini share in Finder so it appears under `/Volumes`, or
- Enable Remote Login on Mac Mini and ensure SSH works, or
- Export/copy the approved artifact folder manually.

Once available, Margot should copy only the two approved files into:

`docs/margot/recovered-from-mac-mini/`

### P0 — Delivery contract

Cron job `4ae3c639a0c4` has been changed to `deliver=local` because `origin` was not resolvable in this CLI context. Until a real messaging/home channel is configured, the official evidence channels are:

- `docs/margot/overnight-progress-log.md`
- `docs/margot/morning-report.md`
- `docs/margot/automation-logs/`

### P1 — Keep tests green

Now that dependencies exist:

```bash
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
npm run type-check
```

Both passed for the combined 3-suite / 28-test Margot voice set.

### P1 — Update stale docs

Docs that previously said tests were blocked by missing dependencies must be updated to the new verified state.

### P2 — Production readiness later

Only after Vercel is linked and env access is proven:

- verify env names for Margot voice,
- verify deployed route health without printing secrets,
- keep production mutation/deploy blocked unless explicitly approved.

## Current Verified State

- Hermes Gateway: running.
- Hermes cron: active; updated to `deliver=local` after `origin` delivery failed in this CLI context.
- Native launchd Margot backup: installed; one tick completed.
- Dependencies: installed via `npm ci`.
- Focused Margot tests: passed, 28/28 across 3 suites.
- Type-check: passed.
- Mac Mini: resolves; SMB 445 reachable now; SSH 22 unavailable; no authenticated mounted share.
- Vercel: not locally linked.
- Linear: local project metadata present; write channel not proven in this correction pass.

## Operating Rule Going Forward

Margot should not say “I can do this overnight” until the preflight checklist proves the run can execute, verify, and report. If any prerequisite is missing, Margot must state the exact missing prerequisite, classify it as P0/P1/P2, and continue only on safe lanes that do not depend on it.
