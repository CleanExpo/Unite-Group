# Spec — Command Center (Agentic-OS layout for Hermes Workspace)

> Gap analysis + design. Goal: make the Unite/Hermes command center **look and function like Chase AI's "Agentic OS"** (ref: youtube d86VCtQ_dN8; distilled in `2nd-brain/Sketches/06`), using **our own features**, not Chase's.

## Current state (captured live at localhost:3000, 2026-06-25)

- **Dashboard** (`/dashboard`): dark metric cards (`SESSIONS / TOKENS / API CALLS / ACTIVE MODEL`), Sessions Intelligence list, Skills Usage, hourly activity chart. Aesthetic already matches Agentic-OS (dark, uppercase labels, thin borders, cyan glow).
- **Swarm** (`/swarm`): Main Agent mission composer + live worker cards (18 workers) + Control/Board/Inbox/Runtime tabs.
- **Nav** (left sidebar, `workspace-shell.tsx`): Dashboard, Chat, Files, Terminal, Jobs, Tasks, Conductor, Operations, Swarm, Memory, Skills, MCP, Profiles. Chat-first; organized around *sessions & workers*, not *domains*.

## Target (Agentic OS, from research note + Sketch 06)

Top **connection/metric rail** → central **intelligence graph** → **domain cards** → **inspector** → **command composer + skill buttons**.

## Key insight — the backend already has the data

`src/server/mission-control-os.ts` (route `/api/mission-control-os`) already returns the Agentic-OS shape:

| Agentic OS element | Field in `mission-control-os` |
|---|---|
| Connection rail | `obsidian` (+ `mirror`) — extend with Hermes/Video/GitHub/Linear |
| Domain cards | `featureMap` — Memory Galaxy, Hermes Jarvis, News Radar, Video Agent, SEO Agent OS, Loop Engineering |
| Inspector | `decisionSurface` — headline, recommendation, why, **nextSafeAction**, **approvalGate** |
| Composer buttons | `quickCommands` — Daily priority brief, Source→Shape, SEO approval packet, Video command packet |
| Guardrails | `guardrails`, `operatorGates` |

So this is **rendering existing data in the Agentic-OS layout** — not a rebuild, and the features are ours.

## Layout

```
HERMES OS   Hermes●  Obsidian●  Video●  GitHub●  Linear●   mode · checkedAt
─────────────────────────────────────────────────────────────────────────
[ Intelligence Graph (slice 4) ]   │  Inspector  (decisionSurface)
─────────────────────────────────────────────────────────────────────────
Domain cards  (featureMap: status dot · source · description)
─────────────────────────────────────────────────────────────────────────
Command composer + quickCommands buttons + recent run feed
```

## Slices

1. **Done** — Obsidian/2nd-brain panel → PR #487 (Memory Galaxy tile).
2. **This slice** — `/command-center` route + screen rendering `mission-control-os`: connection rail (Obsidian live + others stubbed), `decisionSurface` inspector, `featureMap` domain cards, `quickCommands` composer buttons, guardrails footer. Read-only; clicking a quick command is display-only for now (no side effects).
3. **Connection rail** — extend `mission-control-os` (or compose `connection-status` + `gateway-status` + `swarm-health`) so Hermes/Video/GitHub/Linear dots are real.
4. **Intelligence graph** — nodes from local truth (Swarm workers + Obsidian folders + repos + Linear), reusing the Swarm visualization.

## Non-goals / guardrails

- No new vendors, no Sakana Fugu logic (per Sketch 06).
- No DB writes, deploys, public publishing, client comms, billing, or secret entry without operator approval.
- Quick-command buttons are display-only in slice 2 (no execution); wiring to real Hermes dry-run packets is a later, approval-gated slice.
