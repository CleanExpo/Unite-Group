# Idea Intake & Routing — Front-Half Design

> Project: Unite-Group `apps/web` (Next.js 16, React 19, Supabase, single-tenant founder console)
> Date: 23/06/2026 · Locale: en-AU · Status: **approved design, pre-implementation**
> Method: superpowers brainstorming. Evidence-tagged per the Fabel standard.

## 1. Purpose & context

The founder drops a plain-English **idea** into the console; the system **understands** it, **discovers** missing detail via clarifying questions, then **classifies and routes** it to the build+distribute *lane* that fits (marketing / software / content). This spec covers the **front-half only**: intake → clarify → classify/route → an approval checkpoint. The lanes themselves (actual build + Synthex distribution) are **stubbed** here and specified separately.

This is the first sub-project of a larger platform vision ("idea → specialised skills build & distribute through Synthex"). It is built first because the intake/clarify/router front-half is shared by every future lane.

**What already exists and is reused** `[VERIFIED]` (codebase scan 23/06/2026):
- Intake UI `IdeaConsole.tsx` + `POST /api/command-centre/ideas` → creates a `proposed`, `humanApprovalRequired` `cc_task` (`origin='idea'`), writes a wiki evidence brief, emits a `created` audit event.
- 9-persona board critique `POST /api/command-centre/board` (kept as-is, optional "deep understand" — **not** reordered by this slice).
- `decomposeApprovedIdea()` decomposition into risk-tagged sequential sub-tasks.
- `classifyWork` routing pattern; the Nexus provider router (`src/lib/nexus/router.ts`); the rate-limit-aware AI retry hardened in PR #440.
- Wiki evidence + immutable audit-event helpers on `cc_tasks`.

**What is net-new in this slice:** the clarify loop, the classify/route step, the `LaneAdapter` registry (with stub adapters), and the UI that chains intake → clarify → route → checkpoint.

## 2. Goals / Non-goals

**Goals**
- A founder can submit an idea and receive 3–4 focused clarifying questions, answer them, and see the idea classified into a lane with a confidence + rationale and a draft build/distribute plan, ending at a single "Approve & build" checkpoint.
- Everything reversible runs automatically (auto-with-checkpoints); nothing builds or distributes without the founder clearing the checkpoint.
- The lane seam is clean: adding the real marketing lane later means implementing one adapter, no front-half changes.

**Non-goals (YAGNI)**
- No real lane execution; no Synthex API calls; no campaign/code/content actually built.
- No new Supabase tables / no prod migration (artefacts live in existing `cc_tasks.metadata` JSONB).
- No reordering or rebuild of the 9-persona board.
- No multi-round clarify (one round only).

## 3. Pipeline

```
Idea ─▶ [1 Intake]* ─▶ [2 Clarify loop] ─▶ [3 Classify + Route] ─▶ ⛔ Checkpoint
         exists            NEW                   NEW                 "Approve & build"
                                                                     (lanes stubbed → terminal)
```

## 4. Components (each small, single-purpose, independently testable)

### 4.1 `POST /api/command-centre/clarify`
- **Input:** `{ taskId }` (founder-scoped; 401 if unauthenticated, 404 if task not founder's).
- **Does:** one model call (via Nexus router + retry) with the Fabel clarify prompt (finish-line, audience, constraints, out-of-scope, existing assets, budget/timeline). Returns 3–4 questions; filters to genuine `?`-terminated questions.
- **Output:** `{ questions: string[] }`. Persists `metadata.clarifications.{questions, generatedAt}`; emits `clarified` audit event.
- **Best-effort & non-blocking:** model failure or zero questions → `{ questions: [] }` + honest note; the pipeline continues (clarify is optional).

### 4.2 `POST /api/command-centre/clarify/answers`
- **Input:** `{ taskId, answers: Record<question, answer> }`.
- **Does:** persists `metadata.clarifications.{answers, answeredAt}`; emits audit event. Idempotent (overwrites prior answers + new event).

### 4.3 `POST /api/command-centre/classify`
- **Input:** `{ taskId }`.
- **Does:** one model call over (idea + clarifications) → `RoutingDecision`. Validates the model output against a schema; on invalid/failed → `lane='unknown', confidence=0` with an honest rationale (founder routes manually). Looks up the chosen `LaneAdapter` and calls `planBuild()`/`planDistribute()` for the draft plan.
- **Output / persisted:** `metadata.routing = { lane, confidence, rationale, planBuild[], planDistribute[], decidedAt }`; emits `routed` audit event + wiki evidence note. Idempotent.

```ts
type Lane = 'marketing' | 'software' | 'content' | 'unknown'
interface LanePlanStep { title: string; detail: string; risk: 'low'|'medium'|'high'; reversible: boolean }
interface RoutingDecision {
  lane: Lane
  confidence: number            // 0..1
  rationale: string
  planBuild: LanePlanStep[]
  planDistribute: LanePlanStep[]
}
```

### 4.4 `LaneAdapter` registry (the extensibility seam)
```ts
interface IdeaContext { idea: string; clarifications: { questions: string[]; answers: Record<string,string> } }
interface LaneAdapter {
  key: Exclude<Lane,'unknown'>
  matchHints: string[]                         // signals the classifier uses
  planBuild(ctx: IdeaContext): LanePlanStep[]  // STUB now (static planned steps)
  planDistribute(ctx: IdeaContext): LanePlanStep[] // STUB now (e.g. "publish via Synthex channels")
  execute?(ctx: IdeaContext): Promise<never>   // NOT IMPLEMENTED in front-half → not_connected
}
```
- A registry maps `key → adapter`. First slice ships three **stub adapters** returning static planned-step lists + honest `not_connected` status (No-Invaders #1 — no fake-as-real).
- Adding the real marketing lane later = implement `execute()` + real plans; no front-half change.

### 4.5 UI — clarify/route panel in `IdeaConsole`
- After submit: auto-calls `/clarify`, renders questions, captures answers → `/clarify/answers` → auto-calls `/classify`.
- Renders: lane + confidence + rationale, the planned build & distribute steps, and a single **"Approve & build"** button (the checkpoint). Because lanes are stubbed, the button surfaces the honest `not_connected` "lane build pending" state.
- Honest states throughout: clarify empty → "no questions, continuing"; classify `unknown` → manual lane picker; any fetch error → surfaced, never a blank/empty-as-success.

## 5. Data model — reuse `cc_tasks`, **no prod migration** `[INFERENCE]`
All artefacts live in existing `cc_tasks.metadata` (JSONB) + the existing audit-event log:
- `metadata.clarifications = { questions[], answers{}, generatedAt, answeredAt }`
- `metadata.routing = { lane, confidence, rationale, planBuild[], planDistribute[], decidedAt }`
- Events: `created → clarified → routed`. Evidence notes via the existing wiki helper.

Rationale: avoids a gated prod schema change (consistent with the governance rule that prod writes are gated), keeps the slice reversible. Typed columns/table is a deliberate **future** enhancement, not in scope.

## 6. Governance — auto with checkpoints
- **Auto (reversible, no gate):** generate questions, persist answers, classify+route, write evidence.
- **Gate (checkpoint):** before any lane `execute()`. In this slice lanes are stubbed, so the checkpoint is the terminal state. Every idea task stays `humanApprovalRequired=true`; nothing auto-distributes. Honours "fleet prepares, founder decides irreversible."

## 7. Error handling (No-Invaders honest states)
- Clarify model failure → `{questions:[]}`, continue. Classify failure/invalid → `unknown`, manual routing, never faked. Persistence failure → surfaced, never swallowed (Track-A lesson). Re-running clarify/classify overwrites that metadata section + a fresh audit event (idempotent; no duplicate tasks/events).
- All model calls go through the Nexus router + rate-limit-aware retry (reuse, don't reinvent).

## 8. Testing
- **Unit:** question filter (only genuine `?` questions); `RoutingDecision` validator (lane enum, confidence 0..1, rationale non-empty); `LaneAdapter` registry returns stub plans for each key; routing reducer maps model output → persisted shape.
- **Route tests** (mocked Supabase + mocked model, matching existing patterns): `/clarify`, `/clarify/answers`, `/classify` — 401 unauth, founder-scope, happy path, model-failure degradation (empty / `unknown`), idempotent re-run.
- **Component:** clarify panel renders questions, captures answers, shows routed plan + checkpoint button; honest state when classify fails.
- **Gauntlet:** `type-check`, `lint`, `test` green on the integrated tree.

## 9. Risks & assumptions (Fabel register)
- `[UNCONFIRMED]` `cc_tasks.metadata` is JSONB and freely extensible without a migration — **verify** the column type before implementation; if not JSONB, fall back to a single JSONB `front_half` column add (still gated) or a scoped table.
- `[UNCONFIRMED]` Exact request/response shapes of `/api/command-centre/ideas`, the board route, and the Nexus router signature — **verify by reading** during planning; this spec assumes the explore-scan summary is accurate.
- `[INFERENCE]` Unit tests prove wiring, not live classification quality — classifier accuracy is validated manually with real ideas before trusting it.
- `[UNCONFIRMED]` "Distribute through Synthex" concretely means publishing via the Synthex Campaign Engine channels; the marketing lane (next sub-project) depends on the Track-A marketing-table prod reconciliation being completed first.

## 10. Out of scope / next sub-projects
1. **Marketing lane** (real `execute()` → campaign build → Synthex distribution) — depends on Track-A schema reconciliation.
2. Software lane, Content lane.
3. Autonomous build loop beyond the checkpoint; typed schema for clarifications/routing; multi-round clarify.
