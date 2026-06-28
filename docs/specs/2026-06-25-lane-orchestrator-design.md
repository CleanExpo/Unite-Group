# Design — Lane Orchestrator (generate model-backed IDEs from one Mission Control)

> Status: design / approved for planning. Goal: from the single Hermes Workspace **Mission Control**, "generate a new IDE" = spawn a model-backed agent **lane**, mixing providers (MiniMax, OpenRouter, Claude Max ×3, OpenAI Pro), each isolated in its own git worktree.

## Background & constraints

- **Two kinds of provider access** (this drives the whole design):
  - **API providers** (MiniMax, OpenRouter, + any API-key Anthropic/OpenAI) — real APIs; routed through the existing **Hermes gateway**.
  - **Subscription plans** (Claude Max ×3, OpenAI Pro) — *not* general APIs; used by running their official CLIs (**Claude Code**, **Codex**). Proxying their OAuth through a gateway is unsupported/ToS-breaching, so they run as supervised CLI processes.
- **Claude Max ×3 = role-pinned accounts**: `builder→max-1`, `reviewer→max-2`, `research→max-3` (configurable). OpenAI Pro = a Codex lane.
- **Each lane runs in its own git worktree + branch** on a chosen repo (parallel-safe, mergeable).
- **One Mission Control**: every lane — regardless of kind — is created, observed, and stopped from the command center (`/command-center`).
- **Reuse** existing infra: `provider-catalog`, provider wizard, profiles, `swarm`, `terminal-sessions`/`claude-agent`, the worktree pattern, and `mission-control-os` (`decisionSurface`/`operatorGates`).
- **Guardrails**: no new vendors beyond these; no Sakana Fugu logic; side effects (push/PR/deploy/DB/billing/secrets) are operator-gated; **the assistant never enters credentials** — API keys via the provider wizard, plans via their own CLI logins. The orchestrator only *references* already-authed backends.

## Core model — `Lane`

```ts
type LaneKind = 'gateway' | 'cli'
type LaneStatus = 'creating' | 'idle' | 'running' | 'blocked' | 'error' | 'stopped'

interface Lane {
  id: string
  kind: LaneKind
  backend:
    | { kind: 'gateway'; provider: string; model: string }      // minimax, openrouter, ...
    | { kind: 'cli'; tool: 'claude-code' | 'codex'; account: string } // role→account
  role: string                 // builder | reviewer | research | ...
  repo: string                 // absolute repo path
  worktree: string             // own worktree path
  branch: string               // own branch
  status: LaneStatus
  mission?: string             // current prompt/task
  lastOutput?: string          // tail of agent output
  startedAt?: number
  usage?: { tokens?: number; note?: string } // best-effort cost/quota signal
  blockedReason?: string       // when status==='blocked'/'error'
}
```

One shape for both kinds → Mission Control renders and controls every lane identically.

## Components (`apps/workspace/src/server/lanes/`)

1. **LaneOrchestrator** — `create / list / get / stop`. Persists a `lanes.jsonl` registry (matches existing jsonl-ledger pattern). Pure coordination; delegates execution to adapters.
2. **BackendRegistry** — declares available backends from `provider-catalog` (API providers) plus the **role→account map** for Claude Code and the Codex/OpenAI-Pro entry. Reports `available`/`authed` per backend (references creds; never stores them). Blocks lane creation against an unauthed backend with a clear reason.
3. **WorktreeManager** — creates one git worktree+branch per lane on the chosen repo; removes it on stop if unchanged, else preserves the branch. (Same pattern used throughout the repo.)
4. **GatewayLaneAdapter** — runs an agent loop via the Hermes gateway against `{provider, model}`, `cwd = worktree`. Reuses `claude-api`/`claude-agent`.
5. **CliLaneAdapter** — spawns + supervises `claude-code` (with the role-account's config/profile) or `codex` as a child process via `terminal-sessions`, `cwd = worktree`; streams stdout → `lastOutput`; maps process state → `LaneStatus`.
6. **API routes** `apps/workspace/src/routes/api/lanes/` — `list`, `create`, `get`, `stop`, `stream` (SSE/poll). All `isAuthenticated`-gated; consistent `{ data }`/`{ error }` shapes.
7. **Mission Control UI** — a **Lanes** section in `command-center-screen.tsx`: uniform lane cards (role · backend · status dot · repo/branch · last-output tail · stop) + a **"New IDE" wizard** (step 1 kind → step 2 backend/role → step 3 repo). Live updates via the stream route.

## Data flow — "New IDE"

1. User opens the **New IDE** wizard → picks `kind`, `backend`/`role`, `repo`.
2. `POST /api/lanes/create` → `LaneOrchestrator.create()`:
   - `BackendRegistry.assertAuthed(backend)` (else `blocked` + reason).
   - `WorktreeManager.create(repo)` → worktree + branch.
   - `adapter.start(backend, worktree, role)` → lane registered (`creating`→`idle`).
3. Card appears in Mission Control. User sends a `mission` → `adapter.run(mission)` → output streams to the card (`running`).
4. **Stop** → `adapter.stop()`; worktree preserved on its branch (mergeable) or auto-removed if untouched.

## Role → account selection (Claude Max ×3)

`BackendRegistry` holds a config map (default `{ builder: 'max-1', reviewer: 'max-2', research: 'max-3' }`). Each Claude account = a distinct Claude Code config home/profile the user has logged in once. `CliLaneAdapter` selects that account's config dir per the lane's role. OpenAI Pro → the single Codex entry.

## Isolation & safety

- Every lane in its own worktree+branch → parallel builder/reviewer/research never collide on files.
- Lanes default to **local/dry-run**; side effects (push/PR/deploy/DB/billing/secrets) are **operator-gated** — reuse `mission-control-os` `operatorGates` + the `decisionSurface` approval gate. No side effect without explicit approval.
- **Credentials boundary**: assistant never enters keys/logins. API keys via the provider wizard; plans via their own CLI logins. Orchestrator references already-authed backends only.

## Error handling

- Backend not authed/available → creation returns `blocked` with the reason (e.g. "add MiniMax API key in the provider wizard").
- CLI process crash/non-zero exit → `error` + surfaced stderr + a restart action.
- Quota/rate limit (esp. a Max account) → `blocked` with reason; automatic pool-rotation is explicitly out of scope (role-pinned accounts were chosen instead).
- Worktree collision → `WorktreeManager` guards; unchanged worktrees auto-clean.

## Testing (vitest, matching repo conventions)

- `LaneOrchestrator`: create/list/stop + `lanes.jsonl` persistence and recovery.
- `WorktreeManager`: worktree create/remove, isolation, unchanged-cleanup.
- `BackendRegistry`: availability detection + role→account resolution + unauthed-block.
- Adapters: `start/run/stop` with a mocked child process (CLI) and mocked gateway (gateway) — assert `LaneStatus` transitions.
- Contract test: the `Lane` shape is identical across both adapters.

## Phased slices

1. **Lane core** — `Lane` model + `LaneOrchestrator` + registry + `WorktreeManager` + `/api/lanes/*` + Mission Control lane list/cards + "New IDE" wizard. Create/observe/stop a worktree-backed lane; **no execution yet**.
2. **GatewayLaneAdapter** — MiniMax/OpenRouter (fully supported); run a mission in a gateway lane.
3. **CliLaneAdapter** — Claude Code role-accounts + Codex; spawn/supervise real CLI agents.
4. **Orchestration polish** — role→account config UI, lane→lane handoff (builder→reviewer), approval gates wired to the inspector.

## Out of scope (YAGNI for now)

- Automatic load-balancing/rotation across the 3 Max accounts (role-pinned chosen instead).
- Cursor CLI integration (separate tool; global-base-URL limitation; doesn't orchestrate the subscriptions).
- Cross-machine/remote lanes.
