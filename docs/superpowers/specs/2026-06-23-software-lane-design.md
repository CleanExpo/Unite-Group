# Software Lane — Design + Build Brief (autonomous, honest v1)

> Unite-Group `apps/web` · 23/06/2026 · en-AU. Fourth lane of the idea platform. Auto-designed (no approval gate, per founder's standing instruction).

## Honest scope (read this first)
`apps/web` has **no code generation, no PR creation, no branch/deploy machinery** (the GitHub integration is read-only; no Vercel API). So the software lane's honest v1 is **intake → structured BUILD PLAN + PR brief → gated hand-off**. The actual code build runs **externally** (a human or the Hermes agent picks up the brief). This is NOT autonomous coding and must never claim to be (No-Invaders: no fake-as-real). The hand-off step is explicitly labelled "build runs externally".

## Flow
Idea routed to **software** lane → `runSoftwareBuild` generates a PR brief + build plan (a model call) and stores it on the task → founder reviews → **gated** `runSoftwareHandoff` marks the task ready-for-build and records the hand-off (no code is written). Persisted in `cc_tasks.metadata.software`. No migration.

## Reuse (verified)
- `getAIClient()` from `@/lib/ai/client` + `ANTHROPIC_MODELS` from `@/lib/anthropic/models` (use `SONNET`); call shape `model.messages.create({ model, max_tokens, system, messages:[{role:'user',content}] })` (mirror `src/lib/command-centre/classify-idea.ts`). Inject the client for tests.
- `getTaskById`/`mergeTaskMetadata`/`appendTaskEvent` (`src/lib/command-centre/tasks.ts`); `'comment'` is a valid TaskEventType; `getUser` (`@/lib/supabase/server`).
- Do NOT use `decomposeApprovedIdea` in v1 (it requires a decision record + creates sub-tasks — out of scope); store the plan steps in `metadata.software` instead.

## Governance / errors
Auto: generate the plan/brief (reversible — just metadata). **Gated:** hand-off (marks ready-for-build, records event; no external side-effect performed by the app). Model failure → deterministic fallback plan (best-effort, never throws). No plan yet → `not_planned`. en-AU, `founder_id` scoping, `force-dynamic` + auth on routes, no new deps.

## Build (TDD; each its own commit `[software-lane]`)
1. `src/lib/command-centre/lanes/software-plan.ts` — `generateBuildPlan(idea: string, client?: ModelClientLike): Promise<{ title: string; summary: string; acceptanceCriteria: string[]; steps: string[] }>`. One model call (SONNET) with a system prompt asking for ONLY JSON `{ title, summary, acceptanceCriteria[], steps[] }`; parse; on ANY failure return a deterministic fallback derived from the idea (title = idea truncated; summary = idea; acceptanceCriteria = ['Behaviour matches the idea','Tests cover the change','No regressions']; steps = ['Scope & branch','Implement','Test','Open PR for review']). Never throws. Reuse the `ModelClientLike` pattern from `classify-idea.ts`/`clarify.ts`. **Unit test** (mock model): valid JSON → parsed; model throws → fallback; unparseable → fallback.
2. `src/lib/command-centre/lanes/software-build.ts` — `runSoftwareBuild({ founderId, taskId }, deps?)`: `getTaskById` (throw 'Task not found' if null) → `generateBuildPlan(task.objective)` → `mergeTaskMetadata({ software:{ plan, status:'planned', plannedAt } })` → `appendTaskEvent('comment', payload:{kind:'software_planned'})` (best-effort) → return `{ status:'planned', plan }`. Inject deps. **Unit test** mocks deps.
3. `src/app/api/command-centre/lanes/software/build/route.ts` — thin POST `{ taskId }` → 401/400 → runSoftwareBuild → 200 `{ result }` / 500. `force-dynamic`. Route test (401/400/200/500).
4. `src/lib/command-centre/lanes/software-handoff.ts` — `runSoftwareHandoff({ founderId, taskId }, deps?)`: gated; require `metadata.software.plan` (else `{ status:'not_planned' }`); `mergeTaskMetadata({ software:{ ...prev, status:'awaiting_build', handedOffAt } })`; `appendTaskEvent('comment', payload:{kind:'software_handoff'})`; return `{ status:'handed_off' }`. Unit test.
5. `src/app/api/command-centre/lanes/software/handoff/route.ts` — thin POST `{ taskId }`. Route test.
6. IdeaConsole panel — when `routing.lane==='software'`: a **"Plan build"** action → build → render the PR brief (title, summary, acceptance criteria list, steps list) → a **gated "Hand off to build"** button (enabled after planned) with honest helper text "Actual code build runs externally — this hands the brief to the build queue." → handoff → "Handed off — ready for build". Honest not_planned/error states. Mirror the marketing/clarify handlers in `IdeaConsole.tsx`. Component test (mock fetch).

## Verify & PR
Full gauntlet green; `next build` clean. PR into `main`: `feat(command-centre): software lane — idea → build plan + gated hand-off (honest v1)`. Body must state plainly that v1 plans + hands off and does NOT autonomously write code/PRs.
