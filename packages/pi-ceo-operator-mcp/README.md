# Pi-CEO Operator MCP App

> Phase B POC of the Unite-Group Skybridge rollout. The former external rollout
> skill is not part of this canonical monorepo; [`SPEC.md`](SPEC.md) is the
> reviewable design source for this package.

A small MCP App that gives the Unite-Group operator (Phill) a portfolio snapshot inside Claude / ChatGPT without opening 8 browser tabs.

## What it does

Registers two read-only MCP tools:

| Tool | What it returns | View |
|---|---|---|
| `get-portfolio-health` | Per-repo latest-run conclusion + rolling-10 fail count for the current canonical portfolio list, fetched via `gh api` | `portfolio-health` card (React) |
| `get-pilot-v1-outcomes` | Recent Pilot V1 scheduler outcomes from `~/.hermes/logs/pilot_v1_scheduler.log` | (no view — JSON only) |

Both annotated `readOnlyHint: true`, `destructiveHint: false`. No tool mutates anything.

The `trigger_shipit` tool described in SPEC.md §Out-of-Scope is deliberately not implemented yet — destructive actions need a separate confirmation pattern design.

## Run locally

```bash
npm install
npm run dev               # local dev server
npm run dev:tunnel        # plus a tunnel so Claude / ChatGPT can reach it
```

In Claude Desktop, add this MCP server via the tunnel URL the dev server prints.

## Build

```bash
npm run build
```

Produces the `.skybridge/` output that's deployable to Alpic or any Node.js host.

## Deploy

Per the rollout SKILL.md §5 (deployment decision tree): this POC is **internal-only**, self-host on whatever Node.js platform you already use. `npm run deploy` would push to Alpic but the operator dashboard doesn't need Alpic's analytics + compliance-auditing features.

## Project structure

```
pi-ceo-operator-mcp/
├── SPEC.md                    # design + acceptance criteria
├── src/
│   ├── server.ts              # MCP server + 2 tool handlers
│   ├── helpers.ts             # type-safe React hooks (generated)
│   ├── index.css              # global CSS — themed for Claude/ChatGPT
│   └── views/
│       └── portfolio-health.tsx   # React view for get-portfolio-health
├── alpic.json                 # Alpic deploy config
├── Dockerfile                 # self-host fallback
└── package.json
```

## Requirements

- Node.js 24.14.1+
- `gh` CLI authenticated for the CleanExpo org (read access to Actions)
- (optional) Pilot V1 scheduler/log source must be independently confirmed
  current; the 2026-05-25 Hermes job ID in [`SPEC.md`](SPEC.md) is historical
  evidence, not proof that the scheduler is running now.

## What this POC proves

- Skybridge `npm run build` is supported by this package's declared Node
  24.14.1+ toolchain
- Type-safe tool → view binding actually works end-to-end
- Calling out to `gh` CLI from a tool handler returns useful real data
- Reading the local Pilot V1 log from a tool handler returns useful real data
- The view renders structured data without needing a separate API layer

## What's next

Follow-up work for this POC:

1. Add `trigger_shipit` tool with explicit confirmation pattern (Skybridge supports interactive confirmation flows)
2. Add per-repo drill-in view (last 10 runs by workflow with click-through to GitHub)
3. Add Vercel project-state data source
4. Decide on hosting (Alpic vs self-host) and deploy
5. Reassess whether this POC's pattern belongs in Synthex after its own current-state audit

## Related

- Skybridge framework: https://github.com/alpic-ai/skybridge
- Skybridge docs: https://docs.skybridge.tech
- Package design and acceptance criteria: [`SPEC.md`](SPEC.md)
