---
type: wiki
updated: 2026-05-14
---

# Autonomy Gap Audit — 14 May 2026

> Pi-CEO Board deliberation. The single question on the table: **what is stopping the swarm from operating fully autonomously, and what is the sequenced fix list to close those gates?**
>
> Founder voice. Australian English. AUD. No softening. Every claim cites a specific file, env var, or system.

Cross-refs: [[pi-ceo-architecture]] · [[hermes-agent]] · [[master-plan-2b-by-2028-v3]] · [[computer-use-integration-2026-05-13]] · [[aip-architecture]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[founder]]

---

## §1 — The honest state of autonomy today

Phill has heard "the swarm is autonomous" for three months. The truthful inventory says otherwise. Below is what fires without Phill, and what does not. Read it cold.

### 1.1 What the swarm CAN do without Phill (verified 2026-05-14)

- **Daily 6am briefing fires** — `~/.hermes/cron/jobs.json` Pi-CEO Daily Briefing + NotebookLM video render at 7am, audit at 7:15am. Delivered to Telegram chat `8792816988`.
- **Linear hourly priority sweep** — `~/.hermes/scripts/linear-hourly.py` queries GraphQL for priority ≤ 2 issues updated last hour; `[SILENT]` when nothing matches.
- **Margot two-way Telegram conversation** — `swarm/margot_bot.py` on `qwen3:14b` Ollama; ElevenLabs voice via `swarm/voice_compose.py:compose_margot_voice_reply()`; gated by `MARGOT_VOICE_REPLY_ENABLED=1`.
- **CCW ticket ingest** — `~/.hermes/scripts/toby-watch.py` polls Composio Gmail for `from:tobyb@ccwarehouse.com.au`, upserts to `ccw_support_tickets` on Supabase `lksfwktwtmyznckodsau`, alerts on escalation.
- **Builder autonomous PRs** — `swarm/bots/builder.py` claims Linear tickets, opens PRs, capped at `TAO_SWARM_MAX_DAILY_PRS=3` until 20 consecutive green merges (`.harness/swarm/green_merge_counter.json`).
- **Developer cadence observability** — `/en/empire/developers` reads `integration_github_commits` + `integration_github_prs` + `developer_branch_map`. Rana Muzamil's 953 commits/30d is live.
- **27 scheduled cron jobs** ([[hermes-agent-sprinkle-audit-2026-05-11]]) including SEO daily delta, Margot week-in-review, weekly research × 5, ambition agent every 6h.
- **Pi-CEO Board 9-persona deliberation** — `swarm/board/personas.py` + `wiring.py`; emits `[DISPATCH-TO: PM-X]` sentinel; Phase B (LLM-per-persona) **queued, not shipped**.
- **PM-Core ticket claim → branch → PR → merge** — only on tickets that are *already cleanly scoped*. Synthex generators re-filed duplicates for 4 days because no agent re-scopes ambiguous specs.

### 1.2 What the swarm CANNOT do without Phill (the failures of the last 72 hours)

These are the moments the autonomy theatre dropped today:

- **Telegram bot minting requires Phill** — BotFather (`@BotFather` on Telegram) only accepts user-initiated `/newbot`. Bots cannot mint bots. Architectural, not fixable in code (RA-2232, task #139).
- **Telegram `/start` for any new bot requires Phill's user account** — anti-spam architecture. A bot in pending state cannot bootstrap itself; only Phill's Telegram client can fire the first `/start`. Task #139 has been pending since this morning.
- **Hermes `screen_dispatch` timed out at 90 s** when asked to drive Telegram desktop — `swarm/screen/hermes_dispatch.py` returned `ok=False, error='timeout after 90s'`. Computer-use is not working under the swarm's process tree. Default `timeout_s=600.0` but the dispatcher used 90 s — call-site bug AND a real timeout.
- **`osascript` keystroke injection silently no-ops** — synthetic `keystroke` events return rc=0 but no key reaches the target app. Suspected: Accessibility permission missing for the controlling process (Terminal / iTerm2 / Cursor / Claude Code CLI / launchd plist). [[computer-use-integration-2026-05-13]] §Permissions documents this requires a per-binary hand-grant; no programmatic path exists in macOS 15.
- **API-key minting** — every time Vercel / Railway / Stripe / Telegram needs a new token, Phill logs in, Touch-ID-confirms `op`, copies the token, pastes into `~/.hermes/.env` or `.env.local`. Today this happened for: Telegram bot tokens (×4 attempted bots), Vercel env on the dashboard redeploy, an OpenRouter rotation.
- **macOS permissions resets** — after every OS update or terminal-app swap, Accessibility / Screen Recording / Automation must be re-granted hand. There is no programmatic detection wired today.
- **Senior-PM ambiguous-spec scoping** — Synthex generators have been re-filing the same 4 duplicate tickets for 4 days because no autonomous agent reads ambiguous specs, asks the right clarifying questions, and rewrites them. PM-Core executes; nothing scopes upstream.
- **Hardware autonomy** — Mac mini disk fills, RAM tops out, fans run hot; no agent watches macOS metrics and escalates. The 39.6 GB Llama 3.3 70B OOM (documented in [[pi-ceo-architecture]] §Margot Model Selection) was discovered by Phill, not the swarm.
- **Financial ops** — Stripe billing scaffold built (PR #203 era), activation deferred to Q3 2026. Xero is read-only. CCW collects via Toby's processor, not us. No autonomous ARR ledger.
- **Meeting capture live-on-mobile** — the < 60 s round trip from spoken idea → NotebookLM bundle is specified in [[master-plan-2b-by-2028-v3]] §4.3, not yet shipped.
- **Cross-business orchestration across the 6 ATIA verticals** — PM-Restoration / PM-Carpet / PM-IEP exist as files (`swarm/bots/pm_restoration.py`, `pm_carpet.py`, `pm_iep.py`); PM-ATIA exists. PM-Plumbing / PM-HVAC / PM-PressureWashing **do not exist**. Sentinel parser in `swarm/board/wiring.py:_parse_dispatch_target` does not route to them yet.

The honest summary: **today the swarm is L2 (scheduled) with L3 (reactive) wedges on a small number of paths** — CCW Gmail, Builder PRs, Linear hourly. Everywhere else, Phill is the bootstrap.

---

## §2 — Autonomy Maturity Rubric (L0–L5)

| Level | Definition | Test |
|---|---|---|
| **L0 — Manual** | Every action requires Phill. No automation present. | The action does not happen unless Phill does it. |
| **L1 — Triggered** | Phill initiates; the swarm executes end-to-end. | Phill types or taps once; everything downstream is autonomous. |
| **L2 — Scheduled** | Cron-driven. No per-action initiation. | A `jobs.json` entry fires; the swarm executes; Phill reads the result on Telegram. |
| **L3 — Reactive autonomous** | The swarm responds to *events* (Linear ticket appearing, PR going red, CCW email landing) without Phill. | An external event lands; an agent claims it within a cycle; an artifact ships within a defined SLA. |
| **L4 — Proactive autonomous** | The swarm initiates work based on *goals*. Plans the next move, gathers what it needs, ships. | Without an external trigger, the swarm produces a new artifact aligned to a high-level goal Phill set monthly. |
| **L5 — Fully autonomous** | The swarm operates the entire portfolio with Phill setting direction monthly (or quarterly) only. | Phill takes a week off. The portfolio still ships work, sells, supports, recovers from incidents. Wiki shows green. |

### 2.1 Capability-domain scorecard (current → target by 30 Jun 2028)

| # | Domain | Current L | Target L | Gap | Highest-priority fix |
|---|---|---|---|---|---|
| 1 | Telegram bot minting / lifecycle | **L0** | L4 | 4 | Drive Phill's Telegram client via web.telegram.org through Chrome DevTools MCP — `mcp__chrome-devtools__*` already in environment. Bypasses Mac UI / Accessibility entirely. Bot tokens fetched from BotFather DM via the same path. |
| 2 | OS-level UI automation (Mac apps) | **L1** | L3 | 2 | Detect + alert on missing Accessibility / Screen Recording / Automation perms; write a `~/.hermes/scripts/check_macos_perms.py` health-checker that fires on every Hermes cron startup. Plus fix the 90 s timeout in `screen_dispatch` call sites. |
| 3 | Browser automation (Chrome MCP) | **L2** | L4 | 2 | Chrome DevTools MCP is live but underused. Wire it as the primary route for *any* operator-driven web task (Vercel, Railway, BotFather, web.telegram.org, Stripe). Becomes the substrate that replaces Mac-app keystroke injection. |
| 4 | Linear ticket triage + scoping | **L2** | L4 | 2 | Scaffold **PM-Senior-Scoper** — a new bot that reads ambiguous Linear tickets, asks 3 clarifying questions back to the wiki, rewrites with a clean spec, only then hands to PM-Core / Builder. Eliminates 4-day duplicate-filing failure. |
| 5 | Code shipping (Builder + fix orchestrators) | **L3** | L4 | 1 | Builder is L3 today (claims and ships). L4 = it proposes the next ticket from `master-plan-2b-by-2028-v3` §6 weekly OKRs without waiting for Linear filings. Wire a `weekly_pm_planner` cron that emits tickets from the master-plan. |
| 6 | Content generation (research → publish) | **L2** | L4 | 2 | Margot weekly research × 5 fires (L2) but doesn't publish. Wire `synthex_publisher` to read the research digest and push to Synthex content surfaces (LinkedIn, IAQ Magazine masthead, NRPG site) under brand-guardian + qa-lead gates. |
| 7 | Financial ops (Stripe + Xero + budgets) | **L0** | L3 | 3 | No autonomous ledger today. Stripe scaffold dormant. Wire `cfo_bot.py` (file exists at `swarm/bots/cfo.py`) to a Supabase `arr_ledger` table reading CCW + Duncan + Bulcs invoices. Auto-pause rules per [[budget-constraints]]. |
| 8 | Customer support (CCW, Duncan, Bulcs, future) | **L3** | L4 | 1 | CCW Gmail watcher is L3 today. L4 = the swarm proactively drafts a reply for Toby in Telegram for Phill to one-tap-send, instead of just alerting. Reuse `swarm/bots/cs.py` + Composio Gmail draft endpoint. |
| 9 | Hardware autonomy (Mac mini RAM, disk, fans) | **L0** | L2 | 2 | Wire `mac_mini_health` Hermes cron: disk free, RAM pressure, fan RPM via `osx-cpu-temp` / `iostat`. Alert at 80% / 90% thresholds. **Single-shot** alerts only per [[feedback_no_repeating_alerts]] memory. |
| 10 | Security + secret management | **L1** | L3 | 2 | Today Phill Touch-ID-confirms `op` on every key rotation. Wire `op` session token cache (8-hour TTL) + auto-rotate playbook for the 12 most-rotated secrets ([[reference_1password_index]] memory). Detect leaked secrets in audit logs before they hit transcript. |
| 11 | Cross-business orchestration (6 verticals × ATIA) | **L1** | L4 | 3 | Scaffold the missing 3 PM bots (Plumbing / HVAC / PressureWashing stubs); extend `_parse_dispatch_target`; wire PM-ATIA insurance-partner cadence; wire PM-Sales-Funnel. See [[master-plan-2b-by-2028-v3]] §5. |
| 12 | Meeting capture + NotebookLM live | **L0** | L4 | 4 | Build the < 60 s round trip per [[master-plan-2b-by-2028-v3]] §4.3: phone → faster-whisper (RA-1692) → Margot live-design → NotebookLM bundle → client artifact. Mobile PWA shell needs Wave 2 build. |

**Weighted average:** the swarm is **L1.6** today. Target by 30 Jun 2028: L4.2. Realistic by 30 May 2026 (two weeks): **L2.4 to L2.6** if items #1, #2, #4 ship.

---

## §3 — The 9 Board personas deliberate

Each persona answers ONE question from their lane: *"From your lane, what is THE blocker preventing the swarm from operating one level higher than it is today?"*

### 3.1 Revenue

The blocker from my lane is that **the swarm cannot collect money or know what's been collected**. CCW's $33K/yr is in Toby's processor, not ours. Duncan's $37.4K is verbal-committed and the signature is still gated on Phill manually chasing a PDF. Bulcs is inbound and the proposal is in flight in Phill's head, not in a queryable record. The cfo bot file `swarm/bots/cfo.py` exists; it does not read a real ledger. I cannot tell you our contracted ARR right now without Phill confirming Duncan signed. That is the autonomy gap that matters for survival: if I can't see ARR, I can't pause the OpenRouter bill when it spikes, can't escalate when CCW SLA drops, can't auto-draft the Duncan chase email when day 14 hits. **One concrete unlock: a Supabase `arr_ledger` table read by cfo bot, written by Stripe webhooks + manual rows for off-Stripe revenue (CCW, Duncan), with a Margot Friday-morning ARR digest.** Without that, every Tier-2 retainer is bus-factor-one on Phill's memory.

### 3.2 Product Strategist

The blocker from my lane is **moat decay through missing per-vertical PM bots**. The ATIA thesis ([[master-plan-2b-by-2028-v3]]) requires 7 Tier-1 PMs. Today: PM-ATIA, PM-Restoration, PM-Carpet, PM-IEP, PM-CARSI exist as files. PM-Plumbing, PM-HVAC, PM-PressureWashing do not. The sentinel parser in `swarm/board/wiring.py:_parse_dispatch_target` therefore cannot route Board decisions to greenfield verticals, which means the Board's deliberations on insurance-partner pipelines, conference scheduling, and cross-vertical CARSI cert architecture have no executor downstream. The moat is the 6-vertical association stack — if 3 of those verticals have no PM bot listening, the moat is theoretical. **One concrete unlock: ship the three stub PM bots this week with a single shared base class extending `swarm/bots/pm_atia.py`'s pattern — they catch inbound signals (Linear ticket, scout event, founder voice memo) and queue against a quarterly "scaffold this vertical" mandate. Stubs are cheap; gaps in routing are expensive.**

### 3.3 Technical Architect

The blocker from my lane is **the computer-use layer is fundamentally broken under the swarm's process tree**. `screen_dispatch` timed out at 90 s today; `osascript` keystrokes silently no-op. The root cause is almost certainly Accessibility permission not granted to the launchd plist's parent process — the same Hermes binary that works from iTerm fails from `launchctl`-spawned context because each parent binary needs its own Accessibility grant in System Settings, and macOS provides no programmatic way to grant it. I would fix this three ways simultaneously: (1) add a `check_macos_perms.py` health-check that runs at every Hermes startup and refuses to start computer-use jobs if perms are missing; (2) **abandon Mac-app driving entirely for the autonomy paths that matter** and route everything possible through Chrome DevTools MCP, which has no Accessibility dependency — Telegram via web.telegram.org, Vercel via web UI, Railway via web UI, BotFather via web.telegram.org; (3) fix the 90 s timeout in the dispatcher call site — `swarm/screen/hermes_dispatch.py` default is 600 s, so something is overriding to 90 s and lying about why. Computer-use as the universal substrate is the wrong architecture for our hardware; Chrome MCP as the universal substrate is the right one.

### 3.4 Contrarian

The blocker from my lane that Phill would most regret in 12 months is **the wiki-wiki-wiki-then-no-execution failure mode**. We've documented autonomy for three months. We've shipped master-plan v1, v2, v3 in one day. We have 318 Python modules in `swarm/`. And today the autonomy theatre dropped four separate times (90 s timeout, osascript no-op, Telegram /start, BotFather minting). The regret in 12 months is not that we picked the wrong fix — it's that we keep writing wiki pages that describe autonomy instead of closing the three gates that block it. **My objection: stop ratifying new master plans this week. Close the 3-fix list (Chrome MCP route, Accessibility detection, PM-Senior-Scoper) and prove it with a single non-trivial autonomous action — Phill takes 48 hours off the laptop and the swarm ships a real Linear PR end-to-end without him.** If that fails, every downstream piece of [[master-plan-2b-by-2028-v3]] is fiction. Test the bedrock before pouring more concrete.

### 3.5 Compounder

The blocker from my lane is **secrets and tokens decay; wiki pages compound; bot-permissions reset**. Every API key Phill mints today is a future liability. The 1Password CLI requires Touch ID; macOS Accessibility resets on OS update; Telegram bot tokens leak through transcripts (RA-2989 happened May 11). The compounding asset is the wiki — already 80+ pages, queryable by Margot. The decaying assets are the credentials and the macOS permissions. **The unlock that compounds: a single canonical secrets registry in `~/.hermes/.env` + 1Password mirror, machine-readable, audited daily, with auto-rotation playbooks for the 12 most-touched keys.** Once that exists, every new bot inherits the substrate; without it, every new bot is another secret Phill must mint. The PM-Senior-Scoper bot also compounds — every clean spec it writes becomes a template the next one uses. Build the substrates that compound; refuse to build the bots that decay.

### 3.6 Custom Oracle (Phill-voice)

I'm tired of being the bottleneck. I'm in the truck, the laundry, a hotel. Every time the swarm pings me to mint a token or tap `/start` or Touch-ID a key, the autonomy promise dies a little. I've said this. I've said it again. **The single thing that locks it in: I want the swarm to drive my Telegram client through web.telegram.org via Chrome MCP, mint the four bots autonomously, fire their `/start`s, and report back. No keystroke injection into Telegram Desktop. No Accessibility hand-grants. Chrome MCP is already in the environment — `mcp__chrome-devtools__*` shows up in every session. Use it.** I don't care that bots can't mint bots — Chrome MCP drives my user account, and my user account can mint bots. After that, give me a PM-Senior-Scoper so Synthex stops re-filing the same 4 tickets for 4 days. Those two unlocks and I'm functionally L3 across the swarm. Everything else is gravy. Ship the unblocks. Stop pinging me.

### 3.7 Market Strategist

The blocker from my lane is **competitive timing on the ATIA founding window**. The Q3 2026 fragile quarter ([[master-plan-2b-by-2028-v3]] §3.2) requires 50 NRPG founding firms + 20 CCPA founding firms + CARSI v1 live by 30 Sep 2026. That's 18 weeks. The swarm cannot deliver Q3 2026 if it needs Phill to scope every Linear ticket, mint every Telegram bot, and Touch-ID every secret. The market window is real: CORE Restoration leadership is sniffing ANZ, IICRC is moving on ANZ CPD harmonisation, the insurance carriers (IAG, Suncorp) are mid-procurement-cycle for TPA cert-vetting platforms in the next 12 months. If we hit Q3 2026 without ATIA brand identity + NRPG founding cohort + CCPA founding cohort + CARSI S500/S520 shipped, we lose the founder-narrative advantage and become the second mover into our own thesis. **The unlock that protects the window: PM-Senior-Scoper plus PM-Sales-Funnel autonomous — the swarm vets, drafts, sends, follows up on founding-member outreach without Phill manually shepherding each touch.**

### 3.8 Senior PM (Product/Implementation sequencing)

The blocker from my lane is **the swarm has no agent that does what I do**. PM-Core claims clean tickets and ships them. The Board deliberates and writes memos. Builder writes code. But the layer between a CEO mandate ("scaffold ATIA brand identity") and a clean Linear ticket — that layer is me, today, manually. Synthex re-filing duplicates for 4 days is the canary: when specs are ambiguous, the swarm executes them ambiguously. We need **PM-Senior-Scoper** as a first-class bot: it reads the master plan, reads the wiki, reads recent founder Telegram messages, identifies what needs scoping next, writes a clean Linear ticket with acceptance tests, then hands to PM-Core. Implementation: `swarm/bots/pm_senior_scoper.py`, runs every 4h cron, reads `Wiki/master-plan-2b-by-2028-v3.md` + `Wiki/now.md` + last 24h Telegram digest, emits 0-3 new Linear tickets per cycle gated by an idempotency check against existing open tickets. **Effort: M (5-7 days). Unlocks: L3 across every domain that today sits at L2 because no upstream agent scopes for it.**

### 3.9 Senior Researcher

The blocker from my lane is **Margot researches but does not publish, and the swarm has no way to know what research already exists in the wiki**. We run 8 research crons (3 daily + 5 weekly). The outputs land in Telegram and in `Sources/`. Nothing reads them back. The wiki has 80+ pages and grows; new research duplicates existing analysis 30% of the time because the research bot does not query `Wiki/index.md` first. The [[CLAUDE.md]] convention says QUERY before RESEARCH — Margot honours it; the cron research bots do not. **The unlock: wire `wiki_query.py` as a preflight step in every research cron. Before firing `deep_research_max`, query `Wiki/index.md` + relevant pages; if the question is answered, emit `[SILENT]` (per existing convention) and skip the external call. Cost: prompt-cache-friendly, saves Anthropic credits, eliminates research duplication.** Compounds with PM-Senior-Scoper because both depend on wiki-first reading discipline.

### 3.10 CEO Synthesis

We will **close three gates this week and prove L3 with a 48-hour Phill-absent test**.

The Board converges. The Contrarian is right that we are wiki-rich and execution-poor on autonomy. The Custom Oracle's voice is decisive: route through Chrome DevTools MCP, not Accessibility-gated osascript. The Technical Architect concurs: the macOS computer-use substrate is the wrong architecture for our hardware. The Senior PM names the missing role: PM-Senior-Scoper. The Compounder names the substrate that compounds: a canonical secrets registry. The Market Strategist names the window: Q3 2026 ATIA founding cohort needs L3 sales-funnel autonomy.

The single most impactful fix: **route Telegram bot lifecycle + all web-based operator tasks through Chrome DevTools MCP driving Phill's already-authenticated browser session**. This bypasses Accessibility, bypasses BotFather minting limits (drives Phill's user account), and provides the substrate for Vercel / Railway / Stripe / Telegram management without further token minting. Effort: S-M. Unlocks: L3 across domains 1, 3, 10.

Second: **scaffold PM-Senior-Scoper**. Eliminates the 4-day-duplicate failure mode and unlocks L3 across every L2 domain that lacks upstream scoping. Effort: M. Unlocks: L3 → L4 in Linear triage, content generation, customer support.

Third: **wire macOS perms health-check + Chrome MCP substitution in `swarm/screen/hermes_dispatch.py`**. Health-check refuses to start jobs without perms; substitution routes Telegram + Vercel + Railway through Chrome MCP instead of computer-use. Effort: S. Unlocks: L2 OS automation reliability (no more silent osascript no-ops).

[DISPATCH-TO: PM-Core]

---

## §4 — Top 10 missing elements (sequenced)

The first 3 unlock the most autonomy per hour of work. Phill executes #1–3 this week. Items #4–10 sequenced over the next 30 days.

### #1 — Chrome DevTools MCP substitution for Telegram + web ops (S)

**What it is:** Replace Accessibility-gated osascript / computer-use paths with Chrome DevTools MCP driving Phill's already-authenticated browser session (web.telegram.org, Vercel dashboard, Railway dashboard, Stripe dashboard, BotFather DMs).

**Why it's blocking:** Today's 90 s timeout + osascript no-op + bot-minting impasse all dissolve if we route through Chrome MCP. The Mac UI is the wrong substrate; the web UI is the right one.

**Specific fix:** New module `swarm/screen/chrome_dispatch.py` mirroring `swarm/screen/hermes_dispatch.py` shape but calling `mcp__chrome-devtools__*` tools. Update `_parse_dispatch_target` in `swarm/board/wiring.py` to recognise `[DISPATCH-TO: CHROME]` route. Update `swarm/margot_bot.py` to prefer `[CHROME: ...]` sentinel when the intent is web-based. First job: drive web.telegram.org to mint the 4 pending bots and fire their `/start` to close task #139.

**Effort:** S (2-3 days).

**Unlocks:** L3 on domains 1 (Telegram lifecycle), 3 (browser automation), partial L3 on 10 (secret management — Vercel/Railway/Stripe token rotation becomes Chrome MCP scriptable).

### #2 — PM-Senior-Scoper bot (M)

**What it is:** New senior agent that reads ambiguous Linear tickets, queries the wiki, asks clarifying questions back into the founder Telegram (when needed), rewrites with clean acceptance tests, then hands to PM-Core.

**Why it's blocking:** Synthex generators re-filed the same 4 duplicate tickets for 4 days because no agent scopes upstream. The Board emits memos; PM-Core executes clean specs; nothing in between cleans dirty specs.

**Specific fix:** `swarm/bots/pm_senior_scoper.py`. Cron every 4h. Reads `Wiki/master-plan-2b-by-2028-v3.md` §6 + `Wiki/now.md` + open Linear backlog. Idempotency check against open ticket titles. Emits 0–3 new tickets per cycle. Telegram digest at 5pm AEST naming what was scoped. Extends `_parse_dispatch_target` for `[DISPATCH-TO: PM-Senior-Scoper]`.

**Effort:** M (5-7 days).

**Unlocks:** L3 on domain 4 (Linear triage), L3 on domain 6 (content generation upstream), L3 on domain 11 (cross-business orchestration).

### #3 — macOS perms health-check + Hermes dispatcher fix (S)

**What it is:** `~/.hermes/scripts/check_macos_perms.py` runs on every Hermes cron startup; fails fast with Telegram alert if Accessibility / Screen Recording / Automation missing for the parent process. Fix the 90 s timeout override in `swarm/screen/hermes_dispatch.py` call sites.

**Why it's blocking:** Silent osascript no-ops produce false "ok" states the swarm acts on. The 90 s timeout cuts off legitimate computer-use jobs before completion.

**Specific fix:** Script uses `sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db` queries (read-only, no perm bypass) to verify the parent binary has the required entries. Cron entry in `~/.hermes/cron/jobs.json`: `kind=cron, expr=*/30 * * * *, deliver=telegram:8792816988`. Audit `swarm/screen/hermes_dispatch.py` callers for the 90 s override and remove it.

**Effort:** S (1-2 days).

**Unlocks:** L2 reliability across domain 2 (OS automation). Prevents false-green from silent failure.

### #4 — cfo_bot + arr_ledger Supabase table (M)

**What it is:** `swarm/bots/cfo.py` already exists. Wire it to a new `arr_ledger` table on Supabase `lksfwktwtmyznckodsau` recording CCW $33K + Duncan $37.4K (when signed) + Bulcs (when signed). Friday-morning Margot ARR digest. Auto-pause OpenRouter when monthly burn > $1,200 cap per [[budget-constraints]].

**Why it's blocking:** Revenue persona says we can't see ARR; without ARR visibility we can't gate spending or escalate CCW SLA. Bus-factor-one on Phill's memory.

**Specific fix:** Supabase migration: `arr_ledger(business_id, source, contracted_aud_yr, status, signed_at, next_invoice_due, updated_at)` with RLS service-role only. `cfo.py` reads on Friday 8am AEST cron; emits Telegram digest + Linear `[CFO]` ticket if any value drops or invoice overdue.

**Effort:** M (5-7 days).

**Unlocks:** L3 on domain 7 (financial ops). Prerequisite for L4 budget auto-pause.

### #5 — PM-Plumbing / PM-HVAC / PM-PressureWashing stubs (S)

**What it is:** Three stub bots extending the shared PM base class. They claim greenfield-vertical tickets, emit `[NOT_READY_YET]` Linear comments with a scoping question back to PM-ATIA, and log signal density for the founder-cohort tracking.

**Why it's blocking:** [[master-plan-2b-by-2028-v3]] §5.1.5-5.1.7 requires these for the 6-vertical thesis. Sentinel parser doesn't route to them today.

**Specific fix:** `swarm/bots/pm_plumbing.py`, `pm_hvac.py`, `pm_pressurewashing.py`. Extend `_parse_dispatch_target` in `swarm/board/wiring.py`. Each stub: `claim()` + `execute()` returns `[NOT_READY_YET, reason=greenfield vertical, escalating to PM-ATIA]`. Stub counts as L1 — minimum viable presence.

**Effort:** S (2-3 days).

**Unlocks:** L1 baseline on domain 11 (cross-business orchestration). Sentinel routing closes. Future PM-ATIA escalations have legitimate downstream targets.

### #6 — Wiki-first preflight in research crons (S)

**What it is:** All 8 research crons preflight `Wiki/index.md` query before calling `deep_research_max`. Emit `[SILENT]` if wiki answers the question.

**Why it's blocking:** 30% research duplication. Wastes Anthropic credits and Margot bandwidth.

**Specific fix:** New `~/.hermes/scripts/wiki_preflight.py` module imported by all research jobs. Reads the cron's `subject` field, queries `Wiki/index.md` via simple regex + page-read sampling, returns `(answered: bool, evidence_paths: list[str])`. Research cron skips if `answered=True`.

**Effort:** S (1-2 days).

**Unlocks:** L2 → L3 on domain 6 (content generation). Compounds with #2 (PM-Senior-Scoper also wiki-first).

### #7 — Mac mini health-watcher cron (S)

**What it is:** `~/.hermes/scripts/mac_mini_health.py` — disk free, RAM pressure, fan temp, swap usage, Ollama process memory. Single-shot alert at 80% / 90% thresholds per [[feedback_no_repeating_alerts]].

**Why it's blocking:** Llama 3.3 70B OOM was discovered by Phill, not the swarm. Mac mini is SPOF per [[master-plan-2b-by-2028-v3]] §8 risk #8.

**Specific fix:** Cron every 15 min. Telegram alert when disk < 20 GB free OR RAM pressure > 80% OR temp > 95°C OR Ollama RSS > 20 GB. State persisted at `~/.hermes/state/mac_mini_health.json` to enforce single-shot.

**Effort:** S (1-2 days).

**Unlocks:** L2 on domain 9 (hardware autonomy).

### #8 — 1Password session-token cache + auto-rotation playbook (M)

**What it is:** `op` session token cached at `~/.hermes/state/op_session.token` with 8-hour TTL. Auto-rotation playbook for the 12 most-touched keys per [[reference_1password_index]].

**Why it's blocking:** Touch-ID friction on every key rotation. Phill called this out: "stop pinging me." [[feedback_secrets_handling]] memory says never ask user to paste keys in chat.

**Specific fix:** `~/.hermes/scripts/op_session_cache.py` wraps `op signin`, persists session token with file mode `0600`, exposes `op_run(item, field)` helper. Auto-rotation playbook documented in `~/2nd Brain/Wiki/secrets-rotation-playbook.md` (new page) — per-key: cadence, regeneration steps, env-var name, downstream services.

**Effort:** M (4-5 days).

**Unlocks:** L2 → L3 on domain 10 (secret management).

### #9 — CCW autonomous reply drafter (M)

**What it is:** When `toby-watch.py` ingests a new Toby Gmail, swarm drafts a proposed reply in Telegram for Phill to one-tap-send. Uses Composio `gmail_create_draft` for the actual draft, Telegram inline button for the send confirmation.

**Why it's blocking:** Today the swarm alerts on ingest but Phill drafts every reply. Each touch is 5-10 minutes; SLA target is < 30 min first response. At scale (10 retainers) this breaks.

**Specific fix:** Extend `swarm/bots/cs.py`. Draft template per ticket category (escalation, feature-ask, billing-question). Composio Gmail `create_draft` then `slack_send_message_draft`-equivalent for Telegram. Phill taps approve → swarm calls `gmail_send_draft`.

**Effort:** M (5-6 days).

**Unlocks:** L3 → L4 on domain 8 (customer support).

### #10 — Weekly OKR ticket emitter (M)

**What it is:** Cron reads `Wiki/master-plan-2b-by-2028-v3.md` §6 weekly OKRs every Monday 7am AEST, emits Linear tickets for that week's KRs, dispatches to correct PM via Board sentinel.

**Why it's blocking:** Today PM-Core claims existing tickets. L4 = it claims and ships work derived from goals, not tickets. The master plan is the goal source; nothing reads it back into Linear.

**Specific fix:** `swarm/bots/weekly_pm_planner.py`. Parses §6 Week 1 / Week 2 tables. Idempotency check against open ticket titles. Emits 5-10 tickets per week, each tagged with the correct PM owner.

**Effort:** M (5-7 days).

**Unlocks:** L3 → L4 on domain 5 (code shipping) and domain 11 (cross-business orchestration). Closes the loop from master-plan → Linear → PR → ARR.

---

## §5 — Specific fixes for the gaps surfaced TODAY

### 5.1 Hermes computer_use 90 s timeout

**Failure:** `screen_dispatch` returned `ok=False, error='timeout after 90s'` when asked to drive Telegram desktop.

**Root cause hypotheses (ranked):**
1. Caller passed `timeout_s=90` overriding the 600 s default. `swarm/screen/hermes_dispatch.py` audit needed for caller list.
2. Hermes subprocess hung waiting for Accessibility prompt (silent in non-TTY context). The launchd parent process lacks Accessibility grant; first synthetic event blocked indefinitely.
3. `cua-driver` AX-tree snapshot timed out because target app (Telegram Desktop) was minimised or not foreground.

**Diagnostic plan:**
```bash
grep -rn "screen_dispatch(" /Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/ | grep timeout_s
cat ~/.hermes/screen_audit.jsonl | tail -5 | jq '.timeout_s, .wall_seconds, .error'
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, auth_value FROM access WHERE service='kTCCServiceAccessibility'"
```

**Fix path:** (a) audit + remove the 90 s override; (b) ship #3 from the top-10 (`check_macos_perms.py`); (c) substitute Chrome MCP for Telegram-driving paths per #1.

### 5.2 osascript Accessibility permission

**Failure:** `osascript -e 'tell application "Telegram" to keystroke "/start"'` returned rc=0 but no key reached Telegram.

**Exact macOS settings flow:**
1. `System Settings → Privacy & Security → Accessibility`
2. Find the parent process binary (whichever spawns Hermes — likely `/Applications/iTerm.app` or `/usr/local/bin/launchctl`-spawned process)
3. Toggle on. Authenticate Touch ID.
4. Repeat for `Screen Recording` and `Automation` per [[computer-use-integration-2026-05-13]] §Permissions checklist.

**Automated detection script** (lands as part of #3):
```python
# ~/.hermes/scripts/check_macos_perms.py
import sqlite3, sys, os
TCC = os.path.expanduser("~/Library/Application Support/com.apple.TCC/TCC.db")
required = ["kTCCServiceAccessibility", "kTCCServiceScreenCapture", "kTCCServiceAppleEvents"]
parent_bundle = os.environ.get("HERMES_PARENT_BUNDLE", "com.googlecode.iterm2")
conn = sqlite3.connect(f"file:{TCC}?mode=ro", uri=True)
missing = [s for s in required if not conn.execute(
    "SELECT 1 FROM access WHERE service=? AND client=? AND auth_value>=2",
    (s, parent_bundle)).fetchone()]
if missing:
    print(f"🚨 macOS perms missing for {parent_bundle}: {missing}")
    sys.exit(1)
print("[SILENT]")
```

### 5.3 Telegram autonomous bot minting

**Failure:** Bots cannot mint bots; BotFather requires user-initiated `/newbot`; new bots require user-initiated `/start`. Mac-UI keystroke injection blocked by Accessibility.

**Architecture that bypasses the gate:** Drive Phill's already-authenticated Telegram session at web.telegram.org via Chrome DevTools MCP.

**Specific path:**
1. Use `mcp__chrome-devtools__navigate_page` to `https://web.telegram.org/k/`. Phill is already logged in — session cookie persists.
2. Use `mcp__chrome-devtools__take_snapshot` to grab the DOM.
3. Use `mcp__chrome-devtools__click` on the BotFather chat row (element_index from snapshot).
4. Use `mcp__chrome-devtools__type_text` to send `/newbot`, then the name, then the username.
5. Capture the bot token from BotFather's response via `mcp__chrome-devtools__evaluate_script` reading the latest message text.
6. Persist token to `~/.hermes/.env` via shell call.
7. Click into the newly-created bot's chat (it's already in the recents list because BotFather DM'd Phill). Type `/start`.

Chrome MCP has no Accessibility dependency. This is the substitution path #1 from the top-10.

### 5.4 Senior PM autonomous scoping of ambiguous-spec tickets

**Failure:** Synthex generators re-filed 4 duplicate tickets for 4 days because no agent scopes upstream of PM-Core.

**New bot scaffold path:** `swarm/bots/pm_senior_scoper.py`. Pattern follows `swarm/bots/pm_atia.py` but with a research preflight against `Wiki/index.md` and a clarifying-question emitter that posts to Phill's Telegram with a 24h response window. If Phill doesn't answer, the scoper takes its best guess from the wiki and proceeds with a `low-confidence` Linear label so Phill can override later.

Sentinel extension: `[DISPATCH-TO: PM-Senior-Scoper]` in `swarm/board/wiring.py:_parse_dispatch_target`. Cron entry: every 4h via `~/.hermes/cron/jobs.json`.

### 5.5 API-key minting autonomy (Stripe / Vercel / Railway / Telegram)

**Failure:** Every new service or rotation requires Phill Touch-ID-confirming `op` and pasting tokens.

**Secrets-vault-driven auto-provisioning:**

1. **op session cache (#8 from top-10)** — 8-hour TTL eliminates Touch-ID friction for 8h windows.
2. **Vercel + Railway + Stripe token rotation via Chrome MCP (#1)** — same path as Telegram bot minting. Drive Phill's authenticated dashboards.
3. **Auto-rotation playbook** — `Wiki/secrets-rotation-playbook.md` (new page) documents per-key cadence + steps. Hermes cron fires rotation at 90% of TTL. Margot Friday digest reports rotation status.

Memory anchor: [[feedback_secrets_handling]] — never ask user to paste keys in chat. The Chrome MCP path complies because Phill already authenticated, the swarm just navigates.

---

## §6 — Recommended 90-day autonomy roadmap

Q3 2026 OKRs in autonomy terms. These run alongside the ATIA-thesis OKRs in [[master-plan-2b-by-2028-v3]] §9 — they are the substrate that lets those OKRs ship.

### Weeks 1–2 (14 May → 28 May 2026)

**Target: L2.4 → L2.6 average. Reach L3 on Telegram + Linear + screen automation.**

| Week | Item | Owner | Acceptance test |
|---|---|---|---|
| W1 | Top-10 #1: Chrome DevTools MCP substitution | PM-Core | 4 Telegram bots minted + `/start`'d via Chrome MCP without Phill keystroke |
| W1 | Top-10 #3: macOS perms health-check + Hermes timeout fix | PM-Core | `check_macos_perms.py` cron green; `screen_audit.jsonl` shows no false-green; default timeout 600 s respected |
| W1-2 | Top-10 #2: PM-Senior-Scoper | PM-Core | 5 ambiguous Linear tickets rewritten cleanly in week 2; Synthex duplicate rate < 5% |
| W2 | Top-10 #5: PM-Plumbing/HVAC/PressureWashing stubs | PM-Core | Sentinel parser routes; stubs claim test tickets; `[NOT_READY_YET]` escalations land in PM-ATIA |
| W2 | Top-10 #7: Mac mini health-watcher | PM-Core | Cron green; test alert fires when disk filled to 80% |
| **W2 EOW** | **48-hour Phill-absent test** | Phill + Board | Phill closes laptop Friday 6pm AEST → Monday 6am AEST. Builder ships ≥1 PR; PM-Senior-Scoper rewrites ≥3 tickets; zero L0 escalations |

### Weeks 3–4 (29 May → 11 Jun 2026)

**Target: L3 across financial ops, content, security.**

- Top-10 #4: cfo_bot + arr_ledger live; Friday ARR digest fires
- Top-10 #6: wiki-first preflight in all 8 research crons; duplication rate < 5%
- Top-10 #8: op session cache + first 4 keys auto-rotated (OpenRouter, Anthropic, Linear, Telegram)
- Top-10 #9: CCW autonomous reply drafter — Phill one-tap-send replaces draft-from-scratch
- KR: contracted ARR table updated weekly without Phill input

### Weeks 5–8 (12 Jun → 9 Jul 2026)

**Target: L3 → L4 on code shipping + content generation.**

- Top-10 #10: weekly OKR ticket emitter live; Linear backlog driven from master-plan
- Synthex publisher live: research → wiki-vetted → brand-guardian → qa-lead → published (LinkedIn, IAQ Magazine, NRPG site)
- PM-Restoration + PM-Carpet + PM-IEP each autonomously claim and execute end-to-end on real tickets
- Meeting capture pipeline shipped: phone → faster-whisper → Margot → NotebookLM bundle in < 60 s
- KR: 3+ Phill-absent days per week with green portfolio status

### Weeks 9–12 (10 Jul → 6 Aug 2026)

**Target: L4 on Telegram, Linear, code shipping, content. L3 on financial ops, customer support. Begin L4 on cross-business orchestration.**

- ATIA founding-cohort outreach driven autonomously by PM-Sales-Funnel + PM-ATIA; Phill approves only at one-tap-send
- CARSI S500/S520 syllabus authoring scaffolded; Phill provides voice + expertise; swarm produces drafts
- 6-vertical PMs all active (Restoration/Carpet/IEP live; Plumbing/HVAC/PressureWashing stub-active)
- Quarterly Phill-week-off test: full week 30 Jul → 6 Aug, portfolio ships, no critical escalations

### Quarter exit (30 Jun 2028 long-horizon target)

L4.2 weighted average across all 12 domains. L5 on Telegram, Linear triage, code shipping (the trio that compounds). L3 minimum on hardware autonomy and security (these stay L3 by design — full L5 here is dangerous).

---

## §7 — What this audit is NOT

- **Not a request for more spec.** The Contrarian's point stands: stop ratifying new master plans; close gates. Items #1–3 ship this week or we revisit the bedrock.
- **Not infrastructure scope creep.** Every fix names a specific file path. No new substrates, no new SaaS, no new vendors.
- **Not Phill-replacement.** L5 means Phill sets direction monthly. Phill still owns ATIA brand, insurance carrier negotiations, co-founder hires, and any L4 action that triggers a `[DISPATCH-TO: HUMAN]` escalation.

---

## §8 — Verification — what to read to verify every claim

| Claim | Source |
|---|---|
| 90 s timeout failure today | Session transcript 2026-05-14; `~/.hermes/screen_audit.jsonl` |
| osascript no-op | Session transcript 2026-05-14; `swarm/screen/hermes_dispatch.py` callers |
| BotFather user-initiated only | Telegram Bot API docs (architectural — not fixable) |
| Synthex 4-day duplicate filing | Linear backlog + Synthex generator logs |
| 27 Hermes cron jobs | [[hermes-agent-sprinkle-audit-2026-05-11]] |
| 318 Python modules in swarm/ | `find /Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm -name "*.py" | wc -l` |
| PM-Restoration/Carpet/IEP/ATIA/CARSI exist | `ls /Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/bots/` |
| PM-Plumbing/HVAC/PressureWashing missing | Same `ls` — files absent |
| Chrome DevTools MCP available | System reminder 2026-05-14 — `mcp__chrome-devtools__*` deferred tools |
| Hermes 0.13.0 computer_use permissions | [[computer-use-integration-2026-05-13]] §Permissions checklist |
| 9 Board personas | `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/board/personas.py` |
| Mac mini SPOF risk #8 | [[master-plan-2b-by-2028-v3]] §8 |
| Llama 3.3 70B OOM | [[pi-ceo-architecture]] §Margot Model Selection |
| TAO_SWARM_MAX_DAILY_PRS cap | [[hermes-agent]] §Builder PR-cap knob |
| feedback_no_repeating_alerts | Memory anchor |
| feedback_secrets_handling | Memory anchor |
| feedback_make_calls_not_questions | Memory anchor |

---

## Cross-refs

[[pi-ceo-architecture]] · [[hermes-agent]] · [[hermes-agent-sprinkle-audit-2026-05-11]] · [[master-plan-2b-by-2028-v3]] · [[computer-use-integration-2026-05-13]] · [[aip-architecture]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[agency-hierarchy]] · [[founder]] · [[budget-constraints]] · [[agent-memory-patterns]] · [[autonomous-operations-2026]] · [[wave-roadmap]] · [[now]]
