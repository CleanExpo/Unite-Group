---
type: wiki
updated: 2026-05-13
---

# Pi-CEO Architecture

Three-layer autonomous engineering system powered by Claude. Pi-CEO converts a GitHub repo URL and plain-English brief into an autonomous Claude Code execution session — clones the repo, runs Claude against it, streams live output to the browser, pushes result back to GitHub.

**Zero API cost on Claude Max.**

## Tiered Agent Orchestrator (TAO) Model

| Tier | Model | Role |
|------|-------|------|
| Orchestrator | Opus 4.7 | Plans, decomposes, reviews |
| Specialist | Sonnet 4.6 | Complex features, code review |
| Worker | Haiku 4.5 | Discrete tasks, fast execution |

## Three-Layer Architecture (Margot → Pi-CEO Board → Senior Agents)

- **Margot:** Research layer — reads wiki before any external research. Aligns corpus with latest wiki before sessions.
- **Pi-CEO Board:** 9 personas deliberate on briefs; CEO memo synthesises into decision
- **Senior Agents / PM-Core:** Claims Linear tickets, clones repo, implements, PRs

## Components

### Backend (FastAPI / Python)
- `app/server/` — deployed to Railway at `https://pi-dev-ops-production.up.railway.app`
- Decomposed into focused modules (≤300L each): `app_factory.py`, `models.py`, `routes/` (8 route modules: auth, sessions, webhooks, triggers, scan_monitor, pipeline, utils, health)
- **Stack:** Python 3.11+, FastAPI ≥0.111, Uvicorn, WebSockets, bcrypt 4.0, pyotp 2.9 (TOTP for `/api/swarm/{kill,resume}`)
- **Build:** hatchling, pyproject.toml

### Dashboard (Next.js)
- `dashboard/` — deployed to Vercel at `https://dashboard-unite-group.vercel.app`
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Octokit
- Dual-mode: CLI (Claude Max, zero cost) or SDK (Anthropic API key)

### MCP Server
- `mcp/pi-ceo-server.js` — stdio JSON-RPC 2.0 server
- Connects Claude Desktop and Cowork to Pi-CEO analysis outputs
- Tools: `get_last_analysis`, `generate_board_notes`, `get_sprint_plan`, `get_feature_list`, `list_harness_files`, `get_zte_score`

## Production URLs

| Service | URL |
|---------|-----|
| Dashboard | https://dashboard-unite-group.vercel.app |
| Backend API | https://pi-dev-ops-production.up.railway.app |
| Health | https://pi-dev-ops-production.up.railway.app/health |

## Skills (33 total)

- **Core (7):** tier-architect, tier-orchestrator, tier-worker, tier-evaluator, context-compressor, token-budgeter, auto-generator
- **Frameworks (6):** piter-framework, afk-agent, closed-loop-prompt, hooks-system, agent-workflow, agentic-review
- **Strategic (5):** zte-maturity, agent-expert, leverage-audit, agentic-loop, agentic-layer
- **Pi-SEO (3):** pi-seo-scanner, pi-seo-health-monitor, pi-seo-remediation
- **Ship Chain (2):** ship-chain, ship-release
- **Foundation + Ops (10):** big-three, claude-max-runtime, pi-integration, ceo-mode, tao-skills, maintenance-manager, scheduled-tasks, security-audit, architecture, define-spec

## Security

- Railway HTTPS: CSP, X-Frame-Options, X-XSS-Protection headers enforced
- PR#201 merged (2026-05-09): 3 security headers + dep patches
- HttpOnly + SameSite=None cookies; HMAC-signed tokens
- Rate limiting: 30 req/min per IP; bcrypt password hashing; HMAC verification on all webhook endpoints

## NodeJS Starter V1 (Internal Template)

**GitHub:** CleanExpo/NodeJS-Starter-V1  
**Version:** 1.0.0 (released 2026-03-13)  
**Purpose:** Production-ready monorepo template for AI-powered applications. Offline-first, no API keys required for local dev (Ollama default).

**Stack:** Next.js 15, FastAPI 0.115, TypeScript 5.7, Python 3.12, Tailwind v4, PostgreSQL 15+pgvector, Redis 7, LangGraph agent orchestration, Supabase (optional state backend), pnpm 9+, Turborepo  
**AI:** Ollama (local/free default), Claude API (optional — Opus 4.6/Sonnet 4.6/Haiku 4.5), Adaptive Thinking, Web Search v2 (GA Feb 2026), MCP Connector (beta), Agent Skills beta  
**Agent infrastructure:** Beads (git-backed task memory), Vault Index System (O(1) wiki-link lookup), Claude Code Hooks, Linear integration, 70 installed skills  
**Changelog v1.0.0:** Monorepo architecture, JWT auth with Supabase PKCE, 12 API routers, 516 test files, CI/CD with GitHub Actions, CodeQL, 8-phase multi-agent convergence loop

## Autonomy Trigger

Pi-CEO → Linear trigger activated with `DRY_RUN=false`, 15-min launchd cron (activated 2026-05-08).

## CCW First-Client Treatment (Wave 5.2, shipped 2026-05-13)

CS-tier1 + daily 6-pager now have a real CCW data path:

- **Source-of-truth table:** `ccw_support_tickets` on Unite-Group Supabase (`lksfwktwtmyznckodsau`). Columns: source (gmail/manual/linear), gmail_message_id, gmail_thread_id, received_at, first_response_at, resolved_at, state, priority, snippet, customer_org. RLS service-role only, updated_at trigger.
- **Ingest:** `~/.hermes/scripts/toby-watch.py` polls Composio Gmail (`from:tobyb@ccwarehouse.com.au newer_than:1d`), upserts via `gmail_message_id`. Backfill window 60d on first run via `backfill_done` state flag. Single-shot Telegram alert preserved via `~/.hermes/state/toby_watch.json`. Second pass per cycle matches Phill's outgoing (`to:tobyb@... newer_than:7d`) against `gmail_thread_id` to compute `first_response_at`.
- **Metrics provider:** `swarm/providers/ccw_supabase.py` (Pi-Dev-Ops `feat/internal-pivot-2026-05-11`) reads open tickets per cycle, emits `RawCsMetrics(business_id="ccw-crm", ...)` with `tickets_total`, `avg_first_response_minutes`, `open_enterprise_churn_threats=escalated_count`. NPS/FCR/GRR null until we survey CCW directly.
- **6-pager pin:** `swarm/six_pager.py` reads `SIX_PAGER_PRIORITY_BUSINESSES` env (default `ccw-crm`), pins matched rows first in CS section with `⭐` tag.

**Why this matters:** the empire's first paying client now has eyes on every touch from Phill's morning brief onwards. First-response < 30m goal becomes measurable; escalation = automatic critical alert. Operator-priority commitment is no longer manual.

Cross-ref [[ccw]] · [[operational-priorities-q2-2026]] · [[wave-roadmap]] Wave 5.2.

## Margot Voice (ElevenLabs, shipped 2026-05-13)

Margot now speaks via `swarm/voice_compose.py:compose_margot_voice_reply()`. Reply text → `margot_reply_friendly_text` transform (emoji strip + currency/percentage normalisation + abbreviation expansion) → POST `eleven_turbo_v2_5` at `ELEVENLABS_VOICE_ID`. 800-char cap (≈60s audio) keeps replies short. Gated by `MARGOT_VOICE_REPLY_ENABLED=1`. Auto-fallback to text-only on ElevenLabs failure or cap-exceeded. Used by `swarm/margot_bot.py` and `swarm/portfolio_pulse_telegram.py`.

## Margot Model Selection (current as of 2026-05-13)

**Active model:** `qwen3:14b` (8.6GB, 40K context, strong instruction-following). Set via `TAO_CHEAP_LOCAL_MODEL=qwen3:14b` in `~/.hermes/.env`.

Why not Llama 3.3 70B (per memory `feedback_current_data`): pulled, tested, **OOM'd this 24GB Mac mini**. 39.6GB model exceeds RAM ceiling; runner crashed with `model runner has unexpectedly stopped`. Deleted from disk; flagged for hardware-upgrade reconsideration.

Why not Gemma 4 family: `gemma4:latest` (8.9GB) and `gemma4:26b` (16.8GB) both fit, but both **hallucinate over their own in-context data** — fabricating pathway constraints, inventing filenames, substituting generic VC-speak ("data moats / network effects / switching costs") for the actual five operating constraints. Even with the pathway hot-pinned at the end of the prompt (recency attention), Gemma 4 ignored it. Gemma 4's 8K context also OOM'd the runner under 5K-token Margot prompts (runner crash, not generation failure).

Qwen 3 14B passes a 7/7 verbatim-quote test against the pathway page (filename + 5 constraints quoted exactly). 40K context handles the full Margot prompt without trimming. Cold-load ~77s; warm calls ~5s. The compact-pathway-pin + end-of-system placement from commit `a221ec5` is preserved as a defensive measure across model swaps.

**Pulling now (background, ~17GB):** `qwen3:30b-a3b-q4_K_M` — Qwen 3 MoE (30B total, 3B active params). MoE runtime footprint should fit RAM while delivering stronger synthesis than 14B. Promotion candidate once pull completes.

## Developer Activity Observability (Plan 3, shipped 2026-05-13)

Pi-CEO now sees per-developer engineering cadence end-to-end without leaving the empire dashboard. Architecture:

- **Schema:** `developer_profile` (active devs + git author emails + timezone + hire date) + `developer_branch_map` (PK `(repo, branch)`, FK to Linear by string `linear_issue_id`). RLS-locked to service_role.
- **Data path:** `src/lib/developers/repository.ts → buildSnapshot(profile)` joins `integration_github_commits` + `integration_github_prs` + `developer_branch_map` + `integration_linear_issues`. Parallelized via `Promise.allSettled` (tier-1: commits + PRs + branch-map; tier-2 depends on branch-map for ticket lookup). `.limit(5000)` cap on commits with warn-log to prevent silent PostgREST truncation.
- **Surface:** `/en/empire/developers` (list) + `/en/empire/developers/[email]` (drilldown). Server components calling shared `dashboard-state.ts` lib directly — no `fetch` round-trip, no `NEXTAUTH_URL` dependency.
- **Seeder:** wedged into the existing GitHub cron (`/api/cron/integrations/github`, `maxDuration=300`). Enumerates branches via Octokit, derives `(repo, branch, linear_issue_id?)` from `[A-Z]{2,5}-\d+` regex against branch + commit message, upserts with explicit `onConflict: "repo,branch"`.
- **First wired developer:** Rana Muzamil. Live snapshot 2026-05-13: 953 commits/30d (CCW-CRM 807 + CARSI 146), 95 today, 0 open PRs. Two branch-map rows seeded (RestoreAssist).

**Why this matters:** the empire's first full-loop autonomous engineering signal. Margot + Board can now reason about per-developer cadence (today / 7d / 30d / blocked-on-review / hrs-since-push) without scraping git or asking the contractor. Extends naturally to every future contractor + the autonomous Builder swarm. Cross-ref [[wave-roadmap]] Wave 5.1+.

## Linear Ticket-Generation Invariants (PR #203, merged 2026-05-10)

Four dedup rules now enforced — the swarm previously flooded Pi-Dev-Ops backlog (140 open, 8 spurious Urgent) by ignoring these:

| Generator | Rule | File |
|---|---|---|
| Gap audit (Board) | LLM severity `critical` → Linear priority **2 (High)** max; `high` → 3 (Medium). Linear priority 1 (Urgent) reserved for human-reported outages. Severity rubric tightened in the audit prompt. | `app/server/agents/board_meeting.py:798` |
| Scout (external intel) | Query open `[SCOUT]` tickets in Linear before creating; skip if title already exists. Local `.harness/scout-seen.json` cache demoted to cheap pre-filter. | `app/server/agents/scout.py` |
| Builder (autonomous PR) | Query `/api/mission-control/live` for in-flight `linear_issue_id`; skip any ticket already being built. Plus in-cycle `fired_ticket_ids` set. Prevents pool saturation when two orchestrator instances race. | `swarm/bots/builder.py` |
| CI failure webhook | Dedup against open `[CI FAILURE]` tickets with the same title (repo + workflow); append commit info as a comment instead of creating a new ticket per failing commit. | `app/server/routes/webhooks.py` |

Effect: backlog 140 → 43, Urgent 8 → 0 in a single session (2026-05-10).

## Context Management (cross-ref [[agent-memory-patterns]])

TAO decomposition (Opus → Sonnet → Haiku) is the **sub-agent-as-context-firewall** pattern in our stack. Heavy data tasks (Linear scan, gap audit, repo scan) live in the Specialist or Worker tier so they never pollute the Orchestrator context. The Arize / Alyx case study (`Sources/Hierarchical Memory Context Management in Agents…`) validates this: when one agent's context grows unbounded, sub-agents are the answer.

Practical rules now in effect:

- **No raw spans in Margot's main loop** — heavy queries (Linear GraphQL, Supabase) run as Python scripts in [[hermes-agent]] and return digests, not raw rows.
- **Head/tail truncation** with retrievable memory store — design target for [[wave-roadmap]] Wave 6 long-term memory layer (Arize reports their team still working on this; we should not be ahead of them blind).
- **Long-session evals** — load N turns, test turn N+1. Add to [[autonomous-sdlc]] gates before Wave 6 ships.
- **Prompt-cache discipline** — Claude Code goes to great lengths not to invalidate cache; current Margot daily-briefing routine busts cache on every model swap. Worth fixing before scaling beyond 19 cron jobs.
- **LLM-as-judge at the action boundary** — Specialist (Sonnet) and Worker (Haiku) tiers currently self-approve external actions. Wave 6 must interpose an Opus-4.7 judge at every class-3 (external message/PR) and class-4 (money/delete/merge) tool call, with four-way decision scope (allow / block / revise / escalate). Full spec in [[agent-memory-patterns#🛡️-llm-as-judge-at-the-action-boundary-ingested-2026-05-12|agent-memory-patterns]]. Correlated-judgment risk: do not use the same model + prompt on both sides.

## Cross-refs

[[wave-roadmap]] · [[agency-hierarchy]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[businesses-overview]] · [[agent-memory-patterns]] · [[claude-code-guide]] · [[board-deliberation-browser-use-org-2026-05-15]]

## Board Directives Log

### 2026-05-15 — browser-use org adoption Wave 1
**Decision:** Wave 1 = vibetest-use MCP install + bubus pilot (gated on Pi-CEO infra/portfolio ruling) + bux 2FA-live-view pattern lift into Pilot Phase 2.
**Directive to:** pm-core (vibetest-use install), superpowers:writing-plans agent (plan authoring), Phill (Pi-CEO classification ruling).
**Condition for revisit:** Pi-CEO classified as portfolio (not infra) under the prior [[board-deliberation-browser-harness-2026-05-14]] sequencing lock — bubus moves to Wave 2 automatically.
