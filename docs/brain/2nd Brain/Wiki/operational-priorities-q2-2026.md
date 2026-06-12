---
type: wiki
updated: 2026-05-13
---

<!--
[[founder]] rulings 2026-05-10 applied:
- [[ccw]] contract value corrected: $2,400/yr → $2,750/month ($33,000/yr)
- [[ccw]] POC corrected: "Sarah Chen, ops@[[ccw]].com.au" was a wiki error — Sarah Chen is an
  ElevenLabs voice synthesizer (voiceId EXAVITQu4vr4xnSDxMaL, en-AU narration), not a
  human at [[ccw]]. Real human POC TBD by [[founder]] (tracked in SYN-957).
-->

# Operational Priorities — Q2 2026

Next 90 days. [[ccw]] is #1 — everything else is ordered relative to it.

## Founder directive — 2026-05-13 (non-negotiable)

Source: [[founder|Phill]] (2026-05-13). Carried in [[pathway-to-2b-2026-2028]]:

1. **NO AD SPEND.** Marketing is 100% in-house via [[synthex|Synthex]]. CMO bot ad-spend gate auto-blocks (`TAO_NO_AD_SPEND=1`).
2. **VETTED CLIENTS ONLY.** Phill personally vets every onboarding. Quality over volume.
3. **VIDEO-FIRST for Phill** (learning-difficulty accessibility) — NotebookLM daily brief at 7am AEST + Margot ElevenLabs voice for every reply.
4. **AGENTS EXECUTE.** Phill = think tank; Margot → Pi-CEO Board → 25 senior agents own execution.
5. **Critical-only updates.** 6-pager silent-on-clean (`SIX_PAGER_SILENT_ON_CLEAN=1`); only 🔴/🚨 markers ping Telegram.

| # | Priority | Goal | Pi-CEO surface |
|---|---|---|---|
| 1 | **[[ccw]] client success** | First-client NPS ≥ 60 · zero churn-threat events · first-response < 30 min | CS-tier1 bot · [[ccw]] row top of 6-pager · Telegram alert on any [[ccw]] ticket |
| 2 | **RestoreAssist App Store** | RA-1842 closed · TestFlight → App Store · 0 P0 bugs week 1 | CTO DORA + Platform Risk lessons memo |
| 3 | **NRPG market presence** | DR-NRPG platform live · onboarding framework adoption tracked | All four senior bots |
| 4 | **[[synthex]] prosumer growth** | NRR ≥ 100% · pricing discipline · churn root-cause | CFO + CMO + CS bots |
| 5 | **[[carsi]] compliance delivery** | First implementations stable · GP-team Linear hygiene | CTO bot · [[carsi]]-team Linear routing |
| 6 | **Unite CRM dogfood** | Used internally · refined for next external deployment | All four senior bots |
| 7 | **[[ccw]] marketing reference** | Case study draft · one-pager + video short ready when [[ccw]] signs off | CMO + `marketing-orchestrator` + `remotion-*` |

## Urgent Linear Tickets (as of 2026-05-10)

| Ticket | Title | State |
|--------|-------|-------|
| RA-1718 | [V1 CUTOVER] Phase 5 — production migration + pilot cutover | Todo |
| RA-1692 | Verify faster-whisper STT path on Mac mini | Ready for Pi-Dev |
| RA-1691 | Install Voicebox on Mac mini and verify TTS REST API | Ready for Pi-Dev |

RA-1692 and RA-1691 are prerequisites for Margot voice (Wave 5.1). RA-1718 is the RestoreAssist production cutover.

## Pi-Dev-Ops Backlog State (2026-05-10 EOD)

PR #203 merged — 4 swarm dedup invariants enforced (see [[pi-ceo-architecture]]). Effect:

- Backlog: 140 open → **43**
- Urgent: 8 (all auto-flagged false positives) → **0**
- 73 duplicate `[CI FAILURE]` tickets, 25 duplicate `[SCOUT]` tickets resolved as Duplicate state
- Unite-Group main CI: red 3 days → **green** (TS interface fix)

Of the remaining 43, only ~4 are real product items: RA-2026 (Hermes deploy, in progress), RA-2141 (Task Completion Gate — CASHE eliminated per founder directive for 100% green verified handoff), RA-2142 (hourly status), RA-2162 (daily briefing). Rest are auto-generated stubs the dedup rules will keep from regrowing.

## Billing Model (updated 2026-05-10)

Starter/Growth/Pro retainer plans removed. Two real revenue streams:
1. Bespoke SaaS contracts ([[ccw]] $33k/yr ARR)
2. [[industry-association-vision-2026]] memberships — Q3 2026 launch — Base $299 / Professional $799 / Master $2,499 yearly

Stripe scaffold built; activation deferred to Q3 2026. See [[unite-crm]] for code locations.

## Open [[founder]] inputs still needed

- [[ccw]] contract shape is a 12-month SaaS contract at $2,750/month ($33,000/year) signed on 2026-05-08. <!-- corrected 2026-05-10: previously said $2,400/year ([[founder]] ruling) -->
- [[ccw]] operational state (live+paying / in implementation / pending)
- [[ccw]] point-of-contact for escalation: **Toby Bredhauer** — `tobyb@ccwarehouse.com.au`. Wired into `nexus_clients` 2026-05-10 (SYN-957 closed). Weekly 30-min cadence first call **rescheduled Tue 26 May 10am AEST** — Toby on holidays 11–25 May 2026, no [[ccw]] outreach during this window.
- Each business's current MRR (so 6-pager uses real numbers from cycle 1)
- Telegram chat for Margot (same chat as Pi-CEO bot, or separate DM thread?)

## Tooling Updates: [[NotebookLM]]

- Google fully rolled out [[NotebookLM]] source auto-categorization and labeling to all users starting April 24, 2026.
- Auto-categorization triggers at ≥5 sources, automatically grouping related items and tagging overlapping topics.
- Users can manually override AI labels, rename categories, and assign emojis.
- Source limits per notebook are 50 (Free), 300 (Pro), and 600 (True).
- Bulk sharing now supports pasting a list of emails simultaneously instead of adding users individually.

## Infrastructure baseline (2026-05-13)

- [[sandbox-wizard-2026-05-12]] is the canonical prod→sandbox mirror path (Supabase `create_branch` fails on prod's unreproducible migration history).
- [[unite-group-rls-audit-2026-05-12]] Plan 1 sweep shipped 2026-05-12 — Unite-Group advisor count 2007 → 71 (ERROR 0).
- Plan 2 Integration Mesh shipped 2026-05-12 — 9 integration sync crons live (github · vercel · railway · linear · digitalocean · stripe · supabase · composio · onepassword-via-Hermes); `/en/empire/integrations` dashboard live.
- Plan 3 Developer Activity View shipped 2026-05-13 — first-class Pi-CEO observability of engineering cadence. See [[pi-ceo-architecture]] for architecture and the live Rana snapshot (953 commits/30d).
- Plan 4 Voice Landing Rewrite shipped 2026-05-13 — public marketing site live at `unite-group.in/en/*`. Karen-opener homepage, Phill-origin About, four named-operator services pages, Phill-on-the-desk Contact. Brand-guardian 0 violations.
- Wave 5.2 CCW first-client treatment shipped 2026-05-13 — `ccw_support_tickets` ledger + toby-watch persistence + CS-tier1 provider + CCW pinned first in daily 6-pager. Migration on prod. Backfill = 0 (Toby on holidays, expected).
- Margot now has ElevenLabs voice — `MARGOT_VOICE_REPLY_ENABLED=1` + `ELEVENLABS_VOICE_ID`. 800-char cap, ≈1-minute audio per reply.
- Vercel git integration re-linked 2026-05-13 from `CleanExpo/Unite-Hub` (the wrong repo, silently failing webhooks) to `CleanExpo/Unite-Group`. Push→deploy chain restored.

## Cross-refs

[[founder]] · [[ccw]] · [[businesses-overview]] · [[wave-roadmap]] · [[NotebookLM]] · [[sandbox-wizard-2026-05-12]] · [[unite-group-rls-audit-2026-05-12]]

## Board Directives Log

### 2026-05-15 — Senior Briefing Pattern: eliminate ask-the-founder-for-facts
**Decision:** Effective immediately, AskUserQuestion is banned for any question whose answer is discoverable via available tools in ≤ 3 tool calls. AskUserQuestion reserved for (a) stakeholder preferences between distinct valid options and (b) confirmation gates before irreversible actions. Every dispatched agent returns a 3-component briefing — investigated / decided-with-evidence / shipped-or-blocked-with-reason.
**Directive to:** Claude (top-of-conversation enforcement) + every dispatched subagent (top-of-brief instruction) + memory system ([[feedback_use_tools_dont_ask_questions]] in MEMORY.md).
**Condition for revisit:** Investigation-error rate climbs above 1-in-10 actions (agents shipping broken work because over-rotating toward action without evidence). If that happens, soften to "confidence < 70% must surface uncertainty and ask".