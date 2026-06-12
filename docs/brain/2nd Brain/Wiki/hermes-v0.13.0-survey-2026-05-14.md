---
type: wiki
updated: 2026-05-14
---

# Hermes v0.13.0 — What's New + Integration Plan
*Survey 2026-05-14, by Hermes Survey*

## Version delta

- **From:** v0.12.0 (~Apr 24 era; backups in `~/.hermes/.env.bak-v0.11-20260424-153253` confirm last touch)
- **To:** v0.13.0 — *The Tenacity Release* (tag `v2026.5.7`, released 2026-05-07)
- **Scope:** 864 commits, 588 merged PRs, 829 files changed, 8 P0 security closures, 282 issues closed
- **Repo:** `~/.hermes/hermes-agent/` HEAD at `52521c937` (post-release fix wave)

## What changed

### a. New CLI commands & flags

- **`hermes curator archive | prune | list-archived`** — manual curator state management; `hermes curator run` now synchronous instead of polling — PR #20200, #21236, #21216
  - Maps to: ContextBot daily preamble trainer + the swarm's curator runs
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: Replace any `hermes curator run` invocations in cron-triggers/LaunchAgents that currently poll for completion — output is now in-band. Plus add a weekly `hermes curator prune` to keep `~/.hermes/curator/` from bloating.

- **`hermes update --yes/-y`** — non-interactive update — PR #18261
  - Maps to: A scheduled-tasks routine that runs `hermes update` weekly (currently impossible because of the prompt)
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: Wire a weekly `hermes update --yes` into `.harness/cron-triggers.json` or a LaunchAgent — exactly the kind of [[no-repeating-alerts]]-friendly silent-when-fine job.

- **`hermes computer-use install --upgrade`** + auto-refresh of cua-driver on every `hermes update` — commit `ced1990c1` (#24063)
  - Maps to: Hermes-side cua-driver MCP that drives Telegram/Stripe/Linear
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: Run `hermes computer-use status` to confirm version, then `hermes computer-use install --upgrade` once. Future updates will keep it fresh automatically — locks in the Safari window-focus fix that has been missing.

- **`hermes gateway list`** — cross-profile gateway status — PR #21225
  - Maps to: Multi-bot Telegram router (general/dev/research/ops/marketing)
  - **Verdict:** 🟢 ADOPT NOW — replace any custom "which bot is up" snippets with this.

- **`/steer` and `/queue`** ACP slash commands — PR #18114
  - Maps to: VS Code / Zed ACP sessions; not currently used by Phill's swarm
  - **Verdict:** 🟡 EVALUATE LATER

### b. New / updated skills

- **kanban-video-orchestrator** (creative, optional, by @SHL0MS) — PR #19281
  - Maps to: `remotion-orchestrator` pipeline. Not bundled on disk yet (`~/.hermes/skills/creative/` doesn't contain it — optional install).
  - **Verdict:** 🟡 EVALUATE LATER — likely overlaps with Phill's existing `remotion-orchestrator` skill; read the SKILL.md before deciding whether to absorb patterns or ignore.

- **Linear skill — Documents support + Python helper script** — PR #20752
  - Maps to: `~/.hermes/skills/linear/` and `~/.hermes/skills/mcp_linear/` — Linear is the swarm's primary ticket queue
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: Pull the new Linear skill helper script into the swarm's Linear flows so issue bodies / Linear Documents can be written without bespoke GraphQL.

- **Anthropic financial-services bundle** — PR #21180
  - Maps to: Nothing in Phill's portfolio (no FS clients today)
  - **Verdict:** 🔴 SKIP

- **Shopify (Admin + Storefront GraphQL)**, **shop-app**, **here.now**, **searxng-search** — PRs #18116, #20702, #18170, #20841
  - Maps to: None of the 6 portfolio brands are e-commerce/Shopify; SearXNG covers the web-search role already filled by Tavily.
  - **Verdict:** 🔴 SKIP

- **EVM multi-chain skill** (8 chains, 14 commands) — commit `aa1e2edd3`, post-release
  - Maps to: Nothing in scope
  - **Verdict:** 🔴 SKIP

### c. New MCP servers / connectors

- **MCP SSE transport with OAuth forwarding** — PR #21227, #21323
  - Maps to: Any future remote MCP that uses SSE — currently the Hermes-side stack is all stdio
  - **Verdict:** 🟡 EVALUATE LATER — opens the door to remote MCP hosting for Pi-CEO when needed.

- **MCP image results surfaced as MEDIA tags** — PR #21328
  - Maps to: cua-driver returns screenshots; previously they may have been dropped
  - **Verdict:** 🟢 ADOPT NOW — no action needed, but verify Telegram delivery of cua-driver screenshots is now intact next time `hermes_dispatch.py` runs.

### d. New providers / models

- **`deepseek/deepseek-v4-pro`**, **`x-ai/grok-4.3`**, **`openrouter/owl-alpha` (free)**, **`tencent/hy3-preview`** — PRs #20495, #20497, #18071, #21077
  - Maps to: `hermes_dispatch.py` recently pinned to `claude-sonnet-4-6`; these don't displace that.
  - **Verdict:** 🟡 EVALUATE LATER — only relevant if cost or latency on Sonnet 4.6 becomes an issue.

- **Pluggable provider plugins** (`ProviderProfile` ABC + `plugins/model-providers/`) — PR #20324
  - Maps to: Future scenario where Pi-CEO needs a custom inference endpoint (e.g. a Together/Modal-hosted Hermes 4 model)
  - **Verdict:** 🟡 EVALUATE LATER

### e. New automation primitives

- **Multi-agent Kanban (durable)** — heartbeat, reclaim, zombie detection, retry budgets, hallucination gate — PRs #17805, #19653, #20232, #20332, #21330, #21183, #21214
  - Maps to: The Pi-CEO swarm (intake_router / preamble_trainer / provisioner workers). This is a direct conceptual overlap with what the swarm does today — *but* the swarm is already running in Python on LaunchAgent and writes to Linear.
  - **Verdict:** 🟡 EVALUATE LATER
  - Note: Don't migrate the swarm onto Hermes Kanban this week — it's a strategic question (Linear vs Hermes Kanban as source of truth). Hand to ceo-board if the swarm's reliability becomes a bottleneck.

- **`/goal` persistent cross-turn goals (Ralph loop)** — PR #18262
  - Maps to: Any long-running computer-use task (provisioner during Hour-1 portal flow, complex Stripe → Supabase reconciliation)
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: In `swarm/screen/hermes_dispatch.py`, prepend `/goal <one-line target>` to the prompt before the body. Keeps the agent locked on the objective across context compression.

- **`no_agent` cron mode** — script-only watchdog (silent on empty stdout, posts non-empty verbatim) — PR #19709, `tools/cronjob_tools.py:276`
  - Maps to: `.harness/cron-triggers.json` scheduled scans that currently fire the full agent just to run a shell check
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: Audit cron-triggers and flip every script-only check (e.g. "is service X up", "any unread Linear issues") to `no_agent: true`. Aligns directly with [[no-repeating-alerts]].

- **Auto-resume interrupted gateway sessions** + **Checkpoints v2** — PRs #21192, #20709
  - Maps to: General Hermes resilience; no integration step beyond `hermes update`.
  - **Verdict:** 🟢 ADOPT NOW (free; already in effect)

- **Platform allowlists** (`allowed_chats` on Telegram, Mattermost, Matrix, DingTalk) — PR #21251
  - Maps to: The multi-bot Telegram router — would lock each bot to its intended chat
  - **Verdict:** 🟢 ADOPT NOW
  - Integration step: For each profile under `~/.hermes/`, add `allowed_chats` to the Telegram block in `config.yaml` so the dev bot can never accidentally answer a marketing chat.

### f. Breaking changes

- **Secret redaction is ON by default** — PR #21193. Anything previously relying on raw secrets appearing in Hermes logs will now see them redacted.
  - Migration: confirm Pi-CEO log scrapers (if any) don't depend on raw key values. They shouldn't, per [[secrets-handling]].

- **`/provider` alias removed** — PR #20358. Use `/model` instead.
  - Migration: grep any prompt templates or runbooks for `/provider` and replace.

- **Discord `DISCORD_ALLOWED_ROLES`** is now guild-scoped (CVSS 8.1 fix) — PR #21241.
  - Migration: no impact (no Discord in stack).

### g. New observability

- **Context compression count in CLI + TUI status bar** — PR #21218
- **`hermes gateway list`** cross-profile status — PR #21225
- **`/status` token totals read from SessionDB** — PR #18206
  - **Verdict:** 🟢 ADOPT NOW (zero-effort wins; useful next time debugging a swarm slowdown)

## Top 3 wins to integrate this week

1. **`no_agent` cron mode** — collapses the cost and latency of every script-only scheduled check in `.harness/cron-triggers.json`. Aligns with [[no-repeating-alerts]] (silent on empty stdout).
   - Audit current cron-triggers, flag every job whose prompt is "run this script and tell me only if it errors"
   - Add `no_agent: true` to those entries
   - Drop the LLM call cost on watchdog cycles entirely

2. **`/goal` persistent goals (Ralph loop)** — directly lifts the reliability of `hermes_dispatch.py` and the provisioner worker during multi-turn computer-use flows.
   - Add a one-line `--goal "<target>"` prefix in `hermes_dispatch.py`'s prompt assembly
   - Confirms the agent doesn't lose the thread across compression in Hour-1 portal flow
   - Pair with the new context-compression counter in status bar for monitoring

3. **cua-driver auto-refresh + `hermes update --yes`** — closes the silent-staleness gap (Safari window-focus bug was unreachable to existing users before this).
   - Run `hermes computer-use install --upgrade` once today
   - Add a scheduled weekly `hermes update --yes` LaunchAgent
   - Future cua-driver releases land automatically without manual touch

## Things to skip

- All Slack-related PRs (#25355, #25014, #18198) — [[no-slack]]
- Shopify / shop-app / here.now / financial-services / EVM skills — no fit with portfolio brands today
- SearXNG search backend — Tavily already covers this role
- New paid models (Grok 4.3 / DeepSeek V4 Pro / Tencent HY3) — Sonnet 4.6 is pinned for swarm dispatch; revisit only if cost becomes an issue
- Multi-agent Kanban migration — direct overlap with the Pi-CEO swarm, but a strategic call ([[make-calls-not-questions]] applies — this one is large enough to warrant ceo-board, not a unilateral swap)

## Open questions for Phill

1. **Pi-CEO swarm vs Hermes Kanban as durable orchestrator** — Hermes Kanban v0.13 now offers everything the swarm hand-rolled (heartbeats, reclaim, hallucination recovery). Migrate, dual-run, or stay on Linear-as-queue? This is a ceo-board-tier decision, not a unilateral call.
2. **`allowed_chats` rollout** — willing to commit the multi-bot Telegram chat IDs to git (in each profile's `config.yaml`)? Locks down cross-bot bleed but encodes the chat IDs in repo state.
3. **`hermes update --yes` cadence** — weekly fine, or do you want manual control of when 800+ commits land in production each cycle?

---

*Signed: Hermes Survey*
