---
type: wiki
updated: 2026-05-12
---

# Hermes Agent

Local AI agent gateway running on Mac mini. Hosts cron jobs, MCP servers, and Telegram routing for the Pi-CEO system.

## Current Version

**v0.13.0 (release 2026-05-07, installed 2026-05-12)** — see `hermes version` + `~/.hermes/.update_check`. Behind=0.

## Documentation Sources

- Official docs: `https://hermes-agent.nousresearch.com/docs/`
- LLM-readable index: `/docs/llms.txt` (~17 KB) — safe to drop into a context window
- Full doc concatenation: `/docs/llms-full.txt` (~1.8 MB) — one-shot ingestion
- Source repo: `github.com/NousResearch/hermes-agent` (MIT) — built by Nous Research
- Last clip: `Sources/Hermes Agent Documentation  Hermes Agent.md` (2026-05-12)

## What Hermes Is

Autonomous self-improving AI agent. **Closed learning loop:** creates skills from experience, improves them during use, nudges itself to persist knowledge, and builds a deepening user model across sessions (FTS5 cross-session recall + LLM summarization + Honcho dialectic user modeling). Not tied to a single host — runs on $5 VPS, GPU cluster, or serverless infra.

## Capability Surface (this Mac mini, v0.13.0)

17 built-in toolsets enabled — `hermes tools list` for live state:

| Toolset | Notes |
|---|---|
| `web` | Search + scrape |
| `browser` | Browser automation; Browserbase backend with stealth + proxies (new in 0.13) |
| `terminal` | Persistent shell sessions (`TERMINAL_LIFETIME_SECONDS`, `TERMINAL_TIMEOUT` in env) |
| `file` | File operations |
| `code_execution` | Programmatic Tool Calling — collapses multi-step pipelines into single inference calls |
| `vision` | Image analysis |
| `image_gen` | Image generation |
| `tts` | Text-to-speech |
| `computer_use` | **macOS GUI control** — Accessibility + Screen Recording + Automation perms required |
| `skills` | agentskills.io-compatible procedural memory |
| `todo` | Task planning |
| `memory` | Persistent cross-session memory |
| `session_search` | FTS5 over past sessions |
| `clarify` | Clarifying-questions tool |
| `delegation` | Spawn isolated subagents for parallel workstreams |
| `cronjob` | Built-in cron with delivery to any messaging platform |
| `messaging` | Cross-platform delivery (see below) |

Disabled by default: `video`, `moa` (Mixture of Agents), `rl`, `homeassistant`, `spotify`, `yuanbao`.

## Terminal Backends (run-anywhere)

6 backends; we currently use #1. Switch via `hermes config`:

1. **local** (this Mac mini) ← current
2. Docker
3. SSH
4. Daytona — serverless, hibernates when idle
5. Singularity (HPC clusters)
6. Modal — serverless, near-zero idle cost

## Messaging Gateway (20+ platforms supported)

CLI, Telegram (current), Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, DingTalk, Feishu, WeCom, Weixin, QQ Bot, Yuanbao, BlueBubbles, Home Assistant, Microsoft Teams, Google Chat. All cron jobs can deliver to any of these.

## Config

- Config: `~/.hermes/config.yaml` (symlinked from Pi-CEO memory)
- Env: `~/.hermes/.env`
- Jobs: `~/.hermes/cron/jobs.json`
- Scripts: `~/.hermes/scripts/`

Restart: `launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway`

## Primary Model

`meta-llama/llama-3.3-70b-instruct` via OpenRouter.

**Known limitation:** Llama 3.3 70B cannot reliably invoke MCP tool calls — it outputs JSON text instead of invoking tools. **Fix pattern:** Python scripts pre-fetch data; model passes output through verbatim. All jobs that need external data (Linear, Supabase) use `script:` field in jobs.json.

### Local Ollama swap — DEAD END (2026-05-12)

Tried switching primary to local `qwen3:14b` via Ollama. Model loaded, gateway swapped, Hermes raised `ValueError: requires ≥64K context, qwen3:14b has 40K`. Combined with the May 3 finding that `gemma4:26b` failed tool-calling on Pi-CEO's `margot_turn` mandate: local Ollama + Hermes is dead on current hardware (24 GB Mac mini). The Venn intersection of ≥14B params + ≥64K native context + fits 24GB RAM is empty. Stay on llama-3.3-70b via OpenRouter (free tier, 128K context, reliable tool-calling). Revisit only when (a) a local ≥14B model ships with native ≥64K context AND fits 24GB, OR (b) Mac upgrades to ≥48GB.

## Cron Jobs (19 total — all green as of 2026-05-10)

| Job | Schedule | Notes |
|-----|----------|-------|
| Pi-CEO Daily Briefing | 6am AEST | Uses `linear-urgent.py` for step 4 |
| Pi-CEO Daily Briefing (NotebookLM) | 6am AEST | — |
| Linear Hourly Update → Telegram | Hourly | `linear-hourly.py` script |
| PM-Core Agent | Daily | Uses `mcp__supabase__execute_sql` |
| SEO Daily Delta Brief | Daily | No tool calls — verbatim output |
| Margot Week-in-Review | Weekly | — |
| Margot Quarterly SWOT | Quarterly | — |
| Margot Week-Ahead | Weekly | — |
| Margot Weekly Brain Sync | Weekly | `margot-weekly.py` script; `[SILENT]` when 0 stale |
| Empire Daily Briefing | Daily | — |
| Daily Research (×3) | Daily | M&A · AI/Tech · SEO |
| Weekly Research (×5) | Weekly | Marketing · Economics · Entrepreneurship · SaaS · Psychology |
| AMBITION AGENT | Every 6h | — |

## Python Scripts (`~/.hermes/scripts/`)

- `linear-hourly.py` — queries Linear GraphQL for priority≤2 issues updated last hour
- `linear-urgent.py` — queries Linear GraphQL for priority=1 unstarted issues
- `margot-weekly.py` — queries Supabase REST API wiki_pages for stale count; `[SILENT]` when healthy

All scripts output `[SILENT]` to suppress Telegram delivery on healthy-state runs.

## Builder PR-cap knob (RA-3019)

Pi-Dev-Ops Builder is rate-limited to `TAO_SWARM_MAX_DAILY_PRS` autonomous PRs per UTC day. Default `3`. The effective cap **auto-clamps to `3` regardless of env override** until `.harness/swarm/green_merge_counter.json` shows `consecutive_green ≥ 20`. Any revert or red CI after merge resets the counter — the cap drops back to `3` on the next cycle without operator action.

- Inspect: `GET /api/swarm/status` → `pr_quota: {used, limit, env_override, date, clamped}`
- Adjust: `scripts/raise_pr_cap.sh <N>` in `~/Pi-CEO/Pi-Dev-Ops` (`--dry-run`/`--show` supported)
- Progression once threshold met: `3 → 5 → 8 → 12`, ≥7d hold per rung
- Source: `swarm/config.py:effective_max_daily_prs()`

See [[pi-ceo-architecture]] for swarm overview, [[wave-roadmap]] for activation timeline.

## MCP Servers

| Server | Status | Notes |
|--------|--------|-------|
| pi-ceo | ✅ enabled | OBSIDIAN_VAULT set; filesystem fallback |
| margot-deep-research | ✅ enabled | Gemini API key |
| github | ✅ enabled | PAT in env |
| linear | ✅ enabled | lin_api key in env |
| supabase | ✅ enabled | PAT `sbp_6dac...` added 2026-05-10; project `lksfwktwtmyznckodsau` = Unite-Group |
| gmail | ❌ disabled | Needs Google OAuth client_id/secret/refresh_token |
| google-drive | ❌ disabled | Needs OAuth credential files |

## Telegram Routing

Channel prompt exceptions — cron reports pass through verbatim without Margot bridge call:
- Messages starting with 📋 📚 ✅ ⚠️ 🔧 🔀 or `=== Site:` are output verbatim

## Supabase (Unite-Group)

- Project: `lksfwktwtmyznckodsau`
- Service key: `SUPABASE_UNITE_GROUP_SERVICE_KEY` in `~/.hermes/.env`
- Tables used: `board_mandates` (PM-Core), `wiki_pages` (margot-weekly health check)

## Desktop App (Nous Research, May 2026)

Hermes Desktop dropped 2026-05-10 — native cross-platform UI (macOS / Windows / Linux, MIT) for the same persistent-memory + self-improving-skill loop the CLI exposes. Source: `Sources/Hermes Agent NEW Desktop App - The 247 Self-Evolving AI Agent!.md`.

- Repo: `github.com/fathah/hermes-desktop`
- Connects to a remote Hermes API server (URL + optional API key) OR installs local agent (~2GB).
- Built-in surfaces: session logs, multi-profile (multiple agents for different use cases), Office (3D agent visualisation — cosmetic), Skills, Personas, Memory, Tools, **Cron** (scheduled tasks parallel to our current `~/.hermes/cron/jobs.json`), Gateway (Telegram / Discord / iMessage / phone — matches our existing Telegram routing).
- **Migration path:** "Migrate to Hermes" button imports an existing OpenClaw / Claude Code session (configs, API keys, skills) — relevant if [[pi-ceo-architecture]] later evaluates Hermes as an alternative orchestration substrate.
- HyperFrames plugin baked in (HTML-native video generation; see [[tech-drops-q2-2026]]).

**Decision:** Current Mac-mini CLI deployment stays canonical (19 cron jobs all green). Track Desktop app as a fallback / UI for non-technical operators (e.g. when Margot needs a human-readable view of memory). Do not migrate production jobs.

## NotebookLM Daily Brief Audit (added 2026-05-13)

`~/.hermes/scripts/notebooklm_daily_audit.py` — fires 07:15 AEST (15 min after the existing 7am NotebookLM video render cron). Checks: file exists at `~/Pi-CEO/scripts/briefing_outputs/daily_briefing_<YYYY-MM-DD>.mp4`, size ≥1 MB, duration ≥30s via ffprobe. `[SILENT]` on pass; 🚨 alert via Telegram on miss/short/corrupt. Cron entry in `~/.hermes/cron/jobs.json` (kind=cron, expr `15 21 * * *`, deliver `telegram:8792816988`). Part of Pillar 5 (video-first surfaces) of [[pathway-to-2b-2026-2028]].

## Cross-refs

[[pi-ceo-architecture]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[claude-code-guide]] · [[tech-drops-q2-2026]] · [[agent-memory-patterns]]
