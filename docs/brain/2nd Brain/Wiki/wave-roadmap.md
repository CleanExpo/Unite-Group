---
type: wiki
updated: 2026-05-13
---
<!-- 2026-05-13 morning: Plan 4 marketing live + Wave 5.2 CCW + Margot voice -->


# Wave Roadmap

Build waves for Pi-CEO system. Q2–Q4 2026.

## Wave 5 — Q2 2026 (current)

Primary: [[ccw]] client success + Margot as real PA.

| Phase | Build | Status |
|---|---|---|
| 5.1 | Margot as Telegram personal assistant (text + voice) | ✅ done |
| 5.1+ | CoS HITL loop — reaction polling, fix_project handler, Layer 2 LLM classifier | ✅ done 2026-05-10 |
| 5.1+ | All 19 Hermes cron jobs running; Supabase MCP enabled | ✅ done 2026-05-10 |
| 5.1+ | Brain-1 wiki lint wired into orchestrator (weekly) | ✅ done 2026-05-10 |
| 5.1+ | Swarm dedup hygiene — 4 invariants enforced (PR #203): gap-audit cap, scout, builder, CI failure (see [[pi-ceo-architecture]]) | ✅ done 2026-05-10 |
| 5.1+ | Stripe billing scaffold — subscribe + webhook routes, businesses schema, MembershipTier; activation deferred to Q3 2026 | ✅ scaffolded 2026-05-10 |
| 5.1+ | SEMrush API wired for [[ccw]] portal SEO; Linear API live for Empire priorities | ✅ done 2026-05-10 |
| 5.1+ | Plan 2 Integration Mesh — 9 sync crons, `/en/empire/integrations` dashboard | ✅ done 2026-05-12 |
| 5.1+ | Plan 3 Developer Activity View — `developer_profile` + `developer_branch_map` schema, repository, API, UI pages, branch-map seeder, E2E test; visually verified on prod 2026-05-13 (Rana snapshot rendering) | ✅ done 2026-05-13 |
| 5.1+ | Plan 4 Voice Landing Rewrite — public marketing pages live at `/en/*`, brand-guardian 0 violations, middleware + layout split, og: inheritance | ✅ done 2026-05-13 |
| 5.1+ | Margot ElevenLabs voice — `compose_margot_voice_reply` wired via `MARGOT_VOICE_REPLY_ENABLED` + `ELEVENLABS_VOICE_ID` | ✅ done 2026-05-13 |
| 5.2 | [[ccw]] first-client treatment in CS-tier1 + 6-pager — `ccw_support_tickets` table, toby-watch persistence, `ccw_supabase.py` provider, CCW pinned first in 6-pager | ✅ done 2026-05-13 |
| 5.1+ | Agent Empowerment + Pathway Alignment (plan `docs/superpowers/plans/2026-05-13-agent-empowerment-pathway-alignment.md`) — T1 Margot model bump + T2 pathway hot-pin + T3 decision-rights tables + T4 Scout→Synthex bridge + T5 NotebookLM audit cron + T6 Pi-CEO Board scaffold | ✅ done 2026-05-13 (T6 scaffold only; Phase B = LLM-per-persona wiring queued) |
| 5.1+ | CMO no-ad-spend gate (`TAO_NO_AD_SPEND=1` default) — per founder directive 2026-05-13, Synthex is the in-house marketing engine | ✅ done 2026-05-13 |
| 5.1+ | 6-pager silent-on-clean (`SIX_PAGER_SILENT_ON_CLEAN=1` default) — Telegram only fires on 🔴/🚨 markers | ✅ done 2026-05-13 |
| 5.1+ | GitHub seeder daily-cadence gate — `shouldRunBranchSeeder()` saves 24× GitHub API quota | ✅ done 2026-05-13 |
| 5.4 | Pi-CEO Board (9-persona) wiring — Phase A scaffold shipped 2026-05-13 (`swarm/board/`), Phase B (LLM call per persona) queued | Phase A ✅ · Phase B queued |
| 5.3 | Honcho memory promotion → Margot's primary user model | queued |
| 5.4 | Pi-CEO Board wiring (ceo-board → Layer 3 dispatcher) | queued |
| 5.5 | First three Margot Senior Agents (Customer + Operational + Market Intelligence) | queued |
| 5.6 | Verifiability contract (citations + source registry) | queued |

## Wave 6 — Q3 2026

| Phase | Build |
|---|---|
| 6.1 | Phase B senior agents: Head of M&A, GC, CISO |
| 6.2 | Remaining Margot Senior Agents (Financial Intelligence + Legal & IP + Strategic Foresight) |
| 6.3 | Continuous refresh subscriptions + competitor watch-list (24h cadence) |
| 6.4 | Web dashboard Margot panel |
| 6.5 | 30-day-[[founder]]-absent dry run |

## Wave 7 — Q4 2026

| Phase | Build |
|---|---|
| 7.1 | Live data-room generator (Vanta + Stripe + Xero auto-feed) |
| 7.2 | M&A acquirer-pipeline scraper + outreach packet |
| 7.3 | IP-assignment audit + handover-pack skill |
| 7.4 | Quality-of-earnings packet draft |
| 7.5 | Board sign-off on diligence-ready state |

## Skills (Wave 5) <!-- updated 2026-05-08: previously said Skills queued (Wave 5) -->

`wiki-ingest`, `wiki-query`, and `wiki-lint` skills were built and verified on 2026-05-08, and wired into the Pi-CEO swarm to connect the Brain-1 wiki to Margot's `MARGOT_FILE_SEARCH_STORE`. <!-- updated 2026-05-08: previously said `wiki-ingest` · `wiki-query` · `wiki-lint` — connect Brain-1 wiki to Margot's `MARGOT_FILE_SEARCH_STORE` -->

## Infrastructure Dependencies: Anthropic Updates

Anthropic's "Code with Claude" developer conference introduced features directly relevant to building the Pi-CEO multi-agent swarm. A new "dreaming" capability allows agents to review past sessions and experiences to improve future decision-making over time. Anthropic launched native multi-agent orchestration, enabling a lead AI agent to delegate parallel tasks to specialized agents handling frontend, backend, debugging, and research. [[claude-code]] rate limits across all paid plans doubled the previous 5-hour limit, powered by a new compute and scalability partnership with [[SpaceX]]. Ecosystem releases include Claude Managed Agents, webhooks, and MCP workflows. Next-generation models, potentially the Claude 5 lineup or the rumored "Mythos" system, will prioritize "infinite" context windows for retaining memory across long-horizon reasoning systems and repositories, advanced multi-agent coordination, and higher engineering judgment or "code taste" focused on architecture and maintainability. Polymarket speculation targets September 2026 for the Claude 5 release, noting current Sonnet and Haiku models remain awaiting upgrades as of May 2026.

## Cross-refs

[[pi-ceo-architecture]] · [[operational-priorities-q2-2026]] · [[budget-constraints]] · [[anthropic]] · [[claude-code]] · [[SpaceX]]