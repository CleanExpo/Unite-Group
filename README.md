# Pi-CEO Operator MCP App

> Phase B POC of the Unite-Group Skybridge rollout. Read the strategic plan in [`Pi-CEO/skills/skybridge-rollout/SKILL.md`](../Pi-CEO/skills/skybridge-rollout/SKILL.md). Read this POC's design in [`SPEC.md`](SPEC.md).

A small MCP App that gives the Unite-Group operator (Phill) a portfolio snapshot inside Claude / ChatGPT without opening 8 browser tabs.

## What it does

Registers two read-only MCP tools:

| Tool | What it returns | View |
|---|---|---|
| `get-portfolio-health` | Per-repo latest-run conclusion + rolling-10 fail count for all 10 Unite-Group repos, fetched via `gh api` | `portfolio-health` card (React) |
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

- Node.js 22+
- `gh` CLI authenticated for the CleanExpo org (read access to Actions)
- (optional) Pilot V1 scheduler must be running — see [`Pi-CEO/skills/skybridge-rollout/SKILL.md`](../Pi-CEO/skills/skybridge-rollout/SKILL.md) and the Hermes cron job `7d9268aaa3ac` set up on 2026-05-25.

## What this POC proves

- Skybridge `npm create` + `npm run build` work locally with Node 22
- Type-safe tool → view binding actually works end-to-end
- Calling out to `gh` CLI from a tool handler returns useful real data
- Reading the local Pilot V1 log from a tool handler returns useful real data
- The view renders structured data without needing a separate API layer

## What's next

Per the rollout SKILL.md Phase G:

1. Add `trigger_shipit` tool with explicit confirmation pattern (Skybridge supports interactive confirmation flows)
2. Add per-repo drill-in view (last 10 runs by workflow with click-through to GitHub)
3. Add Vercel project-state data source
4. Decide on hosting (Alpic vs self-host) and deploy
5. Pull this POC's pattern into the Synthex flagship app build (next priority per SKILL.md §2)

## Related

- Skybridge framework: https://github.com/alpic-ai/skybridge
- Skybridge docs: https://docs.skybridge.tech
- Rollout plan: [`Pi-CEO/skills/skybridge-rollout/SKILL.md`](../Pi-CEO/skills/skybridge-rollout/SKILL.md)
- Technical how-to skill (installed via `npx skills add alpic-ai/skybridge -s skybridge`): `~/Pi-CEO/.agents/skills/skybridge/`
