# Nexus skill pack — Integration + Intelligence

The operating doctrine for the Unite-Group Nexus, encoded as Agent Skills.

**The architecture in one line:** MCP connectors are the Integration layer —
they give Claude hands into Vercel, Supabase, Linear, Google, Exa, and
Synthex. Skills are the Intelligence layer — they give those hands judgment,
encoding how the Nexus works so every session builds the same way without
re-explaining. Verification is the third property the pack enforces: no
time-sensitive fact is trusted from memory when a live source exists
(live-verify), and outputs carry an auditable `Verified live <date>` line so
skipped verification is visible. Connectors without skills rot silently (see
the July 2026 telemetry that motivated this pack); skills without connectors
can't act; both without verification drift stale. Together they compound.

## The skills

| Skill | Layer role | Fires when |
|---|---|---|
| `nexus-conventions` | Intelligence — the constitution | Any code, commit, or PR in the monorepo |
| `supabase-schema-gate` | Intelligence gating the Supabase integration | Any code touching a table, before it ships |
| `credential-triage` | Intelligence wrapping the Vercel MCP | Any integration failure, or the weekly health check |
| `live-verify` | Verification wrapping Exa / web search | Any time-sensitive fact: versions, model IDs, limits, pricing, status, "latest" anything |

Each skill is a folder with a `SKILL.md` (YAML frontmatter + instructions).
Claude loads only the name + description until a task matches, then pulls in
the body — so the pack costs almost nothing until it's needed.

## Installation

**Claude Code (recommended — versions with the code):** commit the three
skill folders into the monorepo under `.claude/skills/`. They ride along
with every checkout and every AI-assisted session in the repo.

**Claude.ai:** upload each skill in Settings → Capabilities (or open a
packaged `.skill` file in chat and click "Save skill"). Requires code
execution to be enabled.

**API:** attach via the code execution tool / skills parameter for any
automated pipeline (e.g. the strategy-daily crons could eventually load the
per-business context skills).

## Roadmap (next skills to add)

- `env-var-canon` — the authoritative environment variable registry
  (prevents the APIFY_API_KEY vs APIFY_API_TOKEN class of drift).
- `synthex-event-contract` — the witness-event handshake and allowed
  `agent_actions` sources.
- `go-live-arming` — the CRM_AUTO_EXECUTE / CRM_DISPATCH_ARMED checklist as
  executable procedure.
- Per-business context skills (`dr`, `nrpg`, `ccw`, `carsi`, `ato`,
  `restore`) — brand, tone, and key entities for on-voice content.

## Maintenance

Skills are documentation that executes — treat them like code. When a
convention changes (a new gate flag, a new provider, a renamed table),
update the skill in the same PR. The `credential-triage` inventory section
carries a snapshot date; refresh it whenever accounts or providers change.
