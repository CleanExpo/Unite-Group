# Pi-CEO Operator — MCP App

> **Status:** Phase B POC of the Skybridge rollout. The former external rollout
> skill is not present in this canonical monorepo; this document is the package's
> self-contained review source until a current rollout plan is added here.

## Value Proposition

**Problem:** The Unite-Group operator (currently Phill) has to context-switch across 10+ GitHub repos, the Hermes cron list, Railway deploy status, Vercel project status, and Pi-CEO API logs to answer "how's the portfolio doing right now?"

**Target user:** Phill primarily; eventually other Unite-Group operators (CEO, CTO, founder roles per `swarm/bots/`).

**Pain solved today by:** 8+ open tabs (`gh run list` × 10 repos, hermes cron list, Vercel dashboard, Railway logs, Pi-CEO `/health`).

**Core actions:**
1. **`get_portfolio_health`** — single snapshot: per-repo CI state (last 10 runs), Vercel project deploy state, Pilot V1 last cycle outcome, Hermes cron next-run timestamps. Returns structured data + a UI card.
2. **`get_pilot_v1_outcomes`** — last N cycles of the Pilot V1 scheduler (already cron-running every 30m). Pulls from `~/.hermes/logs/pilot_v1_scheduler.log`.
3. **`trigger_shipit`** — invoke /shipit for a chosen target with explicit confirmation. Returns a stream of progress events. *(Out of scope for POC — added in Phase B.2.)*

## Why LLM?

**Conversational win:** "How's the portfolio looking?" → instant snapshot vs. opening 8 tabs.

**LLM adds:**
- Reasoning over the data ("DR-NRPG has 3 reds — should I worry?" → contextual answer comparing to historical baseline)
- Natural-language /shipit invocation ("ship Pilot V1") → resolves to specific cron + confirms
- Anomaly detection ("anything weird?") → diff against expected state, surface only the new/strange items

**LLM lacks (so MCP server provides):**
- Real GitHub CI state (needs gh API)
- Hermes cron state (needs local filesystem read of `~/.hermes/cron/jobs.json`)
- Pilot V1 outcome log (needs local read of `~/.hermes/logs/pilot_v1_scheduler.log`)
- Pi-CEO API health (needs HTTP fetch to Railway)
- Vercel project deploy state (needs Vercel REST API — token-gated)

## UI Overview

**First view:** Portfolio Health Card
- Grid of current canonical repos (Pi-Dev-Ops, Disaster-Recovery, DR-NRPG, ATO, RestoreAssist, CARSI, Unite-Group, Synthex, CCW-CRM); the deleted Unite-Hub repo is not queried
- Per repo: latest-run conclusion (✅/⚠️/❌), rolling-10 fail count, last-deploy-state badge
- Sticky footer: Pilot V1 last cycle outcome + cron next-run

**Drill-in (Phase B.2):** Per-repo detail panel — last 10 runs by workflow, with click-through to the run URL.

**End state:** Operator has answer to "what's broken / what shipped / what's running" without opening a browser. If something demands action, the LLM offers a follow-up (e.g., "want me to dig into DR-NRPG's failing rollback?").

## Product Context

**Existing infrastructure:**
- **Pi-CEO API** (FastAPI, deployed Railway): `https://pi-dev-ops-production.up.railway.app` — `/health` returns 200
- **Pi-CEO dashboard** (Next.js, deployed Vercel `pi-dev-ops` project): mostly internal
- **Hermes cron** (local): `~/.hermes/cron/jobs.json`, `~/.hermes/logs/`
- **Pilot V1 scheduler** (Hermes cron, every 30m, job `7d9268aaa3ac`): logs to `~/.hermes/logs/pilot_v1_scheduler.log`
- **GitHub CLI** (`/Users/phillmcgurk/.local/bin/gh`): authenticated, scopes include workflow read for CleanExpo org

**APIs to call from MCP server:**
- `gh api repos/{owner}/{repo}/actions/runs?branch=main&per_page=10` — CI runs
- `gh api repos/{owner}/{repo}/commits/main/check-runs` — statuses
- Vercel REST API `/v9/projects/{id}` — project deploy state (token in `~/.vercel/auth.json`)
- HTTP GET `https://pi-dev-ops-production.up.railway.app/health` — Pi-CEO API
- Filesystem read of `~/.hermes/logs/pilot_v1_scheduler.log` — recent Pilot V1 outcomes (JSON-per-line)

**Auth method (POC):** None. This MCP server runs locally only via `npm run dev`, exposes itself to Phill's Claude Desktop or ChatGPT via Skybridge's tunnel. No external network ingress.

**Auth method (Phase B.2, if hosted):** Undecided. Hosting requires a new
threat model and explicit authentication design; the deleted Unite-Hub and a
missing historical rollout skill are not valid security gates.

**Constraints:**
- Tool calls should complete in <2s for "feel snappy" (10 parallel `gh api` calls cached for 60s should do it)
- Per-cycle GitHub API consumption capped at 100 requests (out of 5000/hr limit)
- Pilot V1 log reads should never block — file is owned by Hermes, may be open for write
- Vercel API needs token; fail-soft if absent and surface that in the UI ("Vercel data unavailable — configure token")

## Out of Scope (for this POC)

- `trigger_shipit` — destructive action, needs careful design + confirmation pattern
- Multi-operator support — assume single-user for now
- Historical trending — only "now" snapshot in POC; trend lines in Phase B.3
- Anomaly detection ML — Phase C+, needs baseline data first
- Notifications — Skybridge MCP Apps don't push; rely on existing Hermes cron + Telegram

## Acceptance Criteria (POC merge gate)

- [ ] `get_portfolio_health` tool registered + returns valid response from `gh api` for at least the Pi-Dev-Ops repo
- [ ] View renders the data as a Portfolio Health Card with at least repo name + latest-run conclusion
- [ ] `npm run dev` starts the dev server without errors
- [ ] `npm run build` produces a deployable artifact
- [ ] The MCP App connects to Claude Desktop via `npm run dev:tunnel` and the tool is callable
- [ ] `get_pilot_v1_outcomes` tool reads the last 5 lines of `~/.hermes/logs/pilot_v1_scheduler.log` and returns them as structured JSON

## Open Questions for Phill

1. Self-host (Vercel/Railway) or Alpic-hosted? POC is local-only; production target TBD.
2. Is auth needed even for internal use? Defaults to "no" for POC.
3. Trigger /shipit from inside the MCP App, or keep that gated to the existing CLI flow? POC defers.
4. Visual identity — should this match the Pi-CEO dashboard's existing design system, or render as Skybridge default? POC uses Skybridge default; refinement Phase B.3.
