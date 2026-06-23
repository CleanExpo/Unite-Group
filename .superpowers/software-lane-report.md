# Software Lane — Build Report

Branch: `feat/software-lane`
Date: 23/06/2026
All claims tagged per Fabel evidence standard.

---

## Summary

All 6 units built TDD (failing test → red → implement → green → commit). Full gauntlet green.

---

## Unit Reports

### Unit 1 — `generateBuildPlan`
**File:** `apps/web/src/lib/command-centre/lanes/software-plan.ts`
**Test:** `apps/web/src/lib/command-centre/lanes/__tests__/software-plan.test.ts`
**Commit:** `e6c0b55b7`
**Tests:** 4 — valid JSON parsed; model throws → fallback; unparseable → fallback; long idea truncated at 120 chars.
**Status:** [VERIFIED] `✓ src/lib/command-centre/lanes/__tests__/software-plan.test.ts (4 tests) 2ms`

### Unit 2 — `runSoftwareBuild`
**File:** `apps/web/src/lib/command-centre/lanes/software-build.ts`
**Test:** `apps/web/src/lib/command-centre/lanes/__tests__/software-build.test.ts`
**Commit:** `51db562a3`
**Tests:** 3 — throws on missing task; happy path merges metadata + appends event; best-effort appendTaskEvent doesn't block return.
**Status:** [VERIFIED] `Test Files 400 passed (400)`

### Unit 3 — Build route
**File:** `apps/web/src/app/api/command-centre/lanes/software/build/route.ts`
**Test:** `apps/web/src/app/api/command-centre/lanes/software/build/__tests__/route.test.ts`
**Commit:** `31461b8d5`
**Tests:** 5 — 401 unauth; 400 missing taskId; 400 non-string taskId; 200 with result; 500 on throw.
**Note:** `build/` dir ignored by `~/.config/git/ignore:44:build/`; committed with `-f` (this is a Next.js app route, not a build artefact).
**Status:** [VERIFIED] `Test Files 401 passed (401)`

### Unit 4 — `runSoftwareHandoff`
**File:** `apps/web/src/lib/command-centre/lanes/software-handoff.ts`
**Test:** `apps/web/src/lib/command-centre/lanes/__tests__/software-handoff.test.ts`
**Commit:** `08e99cadf`
**Tests:** 4 — not_planned when no plan; merges awaiting_build + appends event; preserves prev metadata; best-effort appendTaskEvent doesn't block.
**Status:** [VERIFIED] `Test Files 402 passed (402)`

### Unit 5 — Handoff route
**File:** `apps/web/src/app/api/command-centre/lanes/software/handoff/route.ts`
**Test:** `apps/web/src/app/api/command-centre/lanes/software/handoff/__tests__/route.test.ts`
**Commit:** `0cfe20ef4`
**Tests:** 5 — 401 unauth; 400 missing taskId; 400 non-string taskId; 200 handed_off; 200 not_planned (not a 4xx); 500 on throw.
**Status:** [VERIFIED] `Test Files 403 passed (403)`

### Unit 6 — IdeaConsole software lane panel
**File:** `apps/web/src/app/(founder)/founder/command-centre/IdeaConsole.tsx`
**Test:** `apps/web/src/app/(founder)/founder/command-centre/__tests__/IdeaConsole.software.test.tsx`
**Commit:** `808f25e01`
**Tests:** 5 — Plan build button shown for software lane; PR brief renders (title/summary/AC/steps); Hand off disabled pre-plan; enabled post-plan + honest helper text; handed_off confirmation shows; error state on failed fetch.
**Status:** [VERIFIED] `Test Files 404 passed (404)`

---

## Full Gauntlet Output [VERIFIED]

```
# type-check
> tsc --noEmit
(no output — clean)

# lint
> eslint src/
(no output — clean)

# test
Test Files  404 passed (404)
Tests  2435 passed (2435)
Start at  15:15:27
Duration  22.48s
```

All three gates: [VERIFIED] clean.

---

## Concerns / Notes

1. **Global gitignore collision:** `~/.config/git/ignore` line 44 has `build/` which matches `software/build/`. Used `git add -f` for the build route. This is a known hazard for any Next.js route segment named `build` — the directory is correctly a route, not an artefact.

2. **`decomposeApprovedIdea` not used:** Per spec — not in scope for v1. Plan steps stored in `metadata.software.plan.steps`, not as sub-tasks.

3. **No migration needed:** Plan persisted to `cc_tasks.metadata.software` via `mergeTaskMetadata` — no schema change required.

4. **Honest scope:** The hand-off UI says plainly "Actual code build runs externally — this hands the brief to the build queue." No autonomous code generation, no PR creation, no deploy machinery.
