# Mission Control × Hermes Agent OS — Phase 1: The 3-Column Shell

**Date:** 2026-06-22 · **Status:** Draft for review

## Vision (the hybrid)

Evolve the Unite-Group Command Centre (`apps/web`) toward the "Hermes Agent OS" Mission Control UX — a **mix**: keep our **engine** (autopilot runner, multi-provider router, Hermes Kanban, `docs/brain` vault, Synthex) and adopt his **shell** (3-column **Agents · Live Workspace · Brain/Context**, live status dots, goals/journal/memory, per-agent control rooms, Studio).

Phased (each its own spec → plan): **1) Shell** · 2) Agents sidebar wiring · 3) Live Workspace chat · 4) Brain/Context (goals·journal·memory) · 5) Per-agent control rooms.

**This spec = Phase 1 only: the shell. Layout restructure, reusing existing tiles. No new data sources, no chat.**

## Current state (verified)

- Route: `apps/web/src/app/(founder)/founder/command-centre/page.tsx` — a **Server Component** that fetches all data in parallel and renders a single vertical "deck" of 15+ sections inside `<details id="system-detail">`.
- Framed by `FounderShell` (Sidebar + Topbar + main).
- Tiles already exist and are wired: `LiveAgentOperationsMap` (agent nodes/queue/ships), `QueueBoard`, `IdeaConsole`, `EvidenceStreamTile`, `ActionQueueTile`, `BlockedLanesTile`, `OperatingHealthTile`, `ProviderUsageCockpit`, `ProviderAccountsTile`, `RepoCampaignsTile`, `BusinessFocusRail`, `HermesControlPanel`, portfolio/integration grids, capability bus.
- Theme: "Scientific Luxury" deck — candy green `#2dbb57`, white panels, `rounded-sm` only, Chakra Petch (`globals.css` + `command-deck.module.css`).

## Phase 1 design

### Layout
`page.tsx` keeps the server-side parallel fetch and passes data into a new client component **`MissionControlShell`** that renders a CSS-grid 3-column layout:

| Column | Width | Content (Phase 1 — reused tiles) |
|---|---|---|
| **Left — Agents** | ~260px, collapsible | Agent list from `LiveAgentOperationsMap` nodes; status dot (working/queued/blocked/idle); click → sets `selectedAgentId`. |
| **Center — Live Workspace** | flex-grow | Header = selected agent name + state; body = that agent's tasks/work-items + `QueueBoard` + `IdeaConsole`. (Real chat = Phase 3.) |
| **Right — Brain/Context** | ~300px | Stacked, scrollable: `EvidenceStreamTile`, `ActionQueueTile`, `BlockedLanesTile`, `OperatingHealthTile`, ship feed. |

**Secondary tiles** not in the three columns (`ProviderUsageCockpit`, `ProviderAccountsTile`, `RepoCampaignsTile`, `BusinessFocusRail`, `HermesControlPanel`, portfolio/integration grids, capability bus) stay in a collapsible **"System"** section below the fold — reuse the existing `<details>` so nothing is lost. They migrate into per-agent control rooms in Phase 5.

### State & interaction
- `selectedAgentId` lives in `MissionControlShell` (client). Default: first "working" agent, else an "Overview" pseudo-agent (global queue).
- Selecting an agent updates the center header and filters the center body to that agent; "Overview" shows the global queue.
- Reuse existing ⌘K / ⌘I / ⌘\ shortcuts; add none in Phase 1.

### Responsive
- ≥1280px: 3 columns · 768–1279px: left → icon rail, right → below center · <768px: single column, left/right become top tabs.

### Design / deps
- Reuse Scientific Luxury tokens; `rounded-sm` only; **no new dependencies**. One new `mission-control.module.css` for the grid.

### Error / loading
- Server fetch unchanged; each tile keeps its own loading/error states. Shell renders column scaffolding + skeletons during hydration.

### Testing
- `MissionControlShell.test.tsx`: renders three columns; selecting an agent updates the center header + body filter; "Overview" is the default. Data passed as props (no network).

## Units (isolation)
- `MissionControlShell` (client) — owns layout + selection state. One job.
- `AgentsColumn` / `WorkspaceColumn` / `BrainColumn` — thin arrangers of existing tiles; each understandable in isolation.

## Files
- **New:** `MissionControlShell.tsx`, `AgentsColumn.tsx`, `WorkspaceColumn.tsx`, `BrainColumn.tsx`, `mission-control.module.css`, `MissionControlShell.test.tsx` (under `command-centre/`).
- **Modify:** `page.tsx` — render `<MissionControlShell>` with fetched data; keep secondary tiles in the collapsible "System" `<details>`.

## Out of scope (later phases)
Live chat/streaming (P3); goals/journal/memory-search data + Obsidian sync (P4); per-agent control rooms — settings/skills/analytics (P5).

## Risks
`page.tsx` is large; restructuring risks regressions. Mitigation: Phase 1 only **re-parents** tiles into columns (no tile internals change) and keeps the "System" `<details>` as a safety net, so every current surface remains reachable.
