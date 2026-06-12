---
type: wiki
updated: 2026-05-15
---

# Research — browser-use Org Full-Sweep (2026-05-15)

Org-wide deep-dive across every public repo in `github.com/orgs/browser-use` excluding `browser-harness` (already covered: see [[research-browser-harness-pm-synthesis-2026-05-14]] + [[board-deliberation-browser-harness-2026-05-14]]). 43 repos cataloged via `gh repo list browser-use --limit 100 --json …` on 2026-05-15. Per [[feedback-audit-verification]] every marketing claim is interrogated and tagged either CONFIRMED (cited from README), CLAIMED (vendor copy without independent confirm), or NOT-FETCHED (README sparse). Per [[feedback-quality-over-quantity]] every fit verdict carries the README/Doc line that justified it.

Cross-refs read first: [[master-plan-2b-by-2028-v3]] · [[pi-ceo-architecture]] · [[autonomy-gap-audit-2026-05-14]] · [[unite-group-nexus-architecture]] · [[hermes-agent]] · [[mcp-ecosystem]] · [[project-contextbot-platform]] · [[ccw]] · [[carsi]] · [[restore-assist]] · [[dr-nrpg]] · [[synthex]] · [[research-browser-harness-pm-synthesis-2026-05-14]] · [[board-deliberation-browser-harness-2026-05-14]].

Memory rules honoured: [[feedback-no-slack]] (template-library ships a Slack template — flagged, NOT adopted) · [[feedback-secrets-handling]] (Browser-Use Cloud free-tier credential flow is the SaaS funnel risk Contrarian flagged) · [[feedback-model-routing-max-first]] · [[feedback-design-preferences]] · [[feedback-autonomous-mandate]] · [[feedback-make-calls-not-questions]].

---

## §0 Headline (≤180 words)

43 repos. Two of them (`bux` + `desktop`) are structural twins of [[hermes-agent]] + [[project-contextbot-platform]] — Claude Code 24/7 on a remote box, Telegram-fronted, browser-attached. Magnus's stack now overlaps Phill's stack on the orchestrator layer, not just the browser layer. That's the strategic update versus the 2026-05-14 browser-harness deliberation.

Three repos are SHIP-WAVE-1 candidates: `bux` (study, do not adopt — confirms Hermes architecture is correct), `vibetest-use` (multi-agent QA MCP server — plugs into [[unite-group-nexus-architecture]] + CCW + CARSI CI as a pre-merge gate), `bubus` (Pydantic-typed async event bus — drop-in replacement for the ad-hoc event plumbing across `swarm/`).

Three are SKIP: `workflow-use` ("not for production" — vendor admits), `macOS-use` (Hermes `screen_dispatch` already covers, plus MLX dependency lock-in), `n8n-nodes-browser-use` (n8n isn't in Phill's stack and would add a SaaS-substrate the Board would have to ratify).

The single most-strategic finding: **Magnus is building a Claude-Code-on-a-box agency — `bux` is `agency-bot-design-2026-05-14` shipped 8 weeks ahead of Phill's plan, only with Browser Use Cloud as the SaaS dependency.** Phill's [[agency-bot-design-2026-05-14]] plan is correct; do not pivot to `bux`, but study its install script for the parts Pilot still has to invent.

---

## §1 Org snapshot

**Total repos:** 43 public (per `gh repo list` 2026-05-15).

**Language distribution:**

| Language | Count | Examples |
|---|---|---|
| Python | 22 | browser-use, browser-harness, web-ui, video-use, macOS-use, agent-sdk, bubus, cdp-use, vibetest-use, workflow-use, … |
| TypeScript | 11 | desktop, sdk, qa-use, agent-studio, browsercode, browser-harness-js, n8n-nodes-browser-use, chat-ui-example, browser-use-examples, browser-use-node (archived) |
| Go | 2 | go-harnessless, mix-eval-go |
| HTML | 2 | stress-tests, contact-use |
| MDX | 1 | docs (archived) |
| Jupyter | 1 | eval |
| Unspecified | 4 | profile-use-releases, .github, nicehack69, vc-use, media (some have no detectable primary language) |

**Stars distribution:**

| Bucket | Count | Repos |
|---|---|---|
| 10k+ stars | 3 | browser-use (93,923), web-ui (15,966), browser-harness (12,630) |
| 1k–10k | 4 | video-use (7,548), workflow-use (4,008), macOS-use (1,941), awesome-prompts (921) |
| 100–1k | 9 | vibetest-use (792), agent-sdk (682), qa-use (536), desktop (481), browser-harness-js (453), bux (327), cdp-use (290), awesome-projects (123), bubus (106) |
| 10–100 | 13 | benchmark (80), browsercode (76), eval (43), n8n-nodes-browser-use (36), contact-use (35), browser-use-node-archived (30), stress-tests (26), agent-studio (27), template-library (24), online-mind2web (17), browser-use-python-archived (15), chat-ui-example (15), sdk (14), nicehack69 (12) |
| < 10 | 14 | go-harnessless (10), gemini-demo (9), webagents.md (9), docs-archived (9), browser-use-examples (7), profile-use-releases (5), vc-use (4), cc_compaction (4), mix-eval-go (3), browser-use-rsi (2), .github (1), media (1), evaluation-endpoint (1), media (1) |

**Archived count:** 3 (`docs`, `browser-use-python`, `browser-use-node`). All three superseded by the modern `sdk` mono-repo per the SDK README's "Python and TypeScript both listed in the comparison table" line.

**Recency check:** 13 repos have commits within the past 7 days (verified via `pushedAt` field 2026-05-15). 8 repos haven't been pushed in >6 months and look effectively archived-in-place even though not flagged: `vc-use`, `evaluation-endpoint`, `awesome-prompts`, `macOS-use` (2025-03-05), `eval`, `gemini-demo`, `nicehack69`, `browser-use-rsi`. Treat with skepticism.

---

## §2 Per-repo deep-dives

Each entry: name · stars · last-push · what-it-is · use-case · maturity · license · integration · killer-feature · admitted-limits · deps · adoption-shape-for-phill.

### 2.1 `browser-use` (93,923 ⭐, pushed 2026-05-13) — Python

- **What it is:** "AI browser agent" — the original Python library that turns LLM tool-calls into Playwright/CDP browser actions (README §intro).
- **Primary use case:** Form-fill, shopping research, web QA, "personal assistant tasks" (CONFIRMED, README §benchmarks).
- **Maturity:** Production. Benchmark page cites "100 real-world tasks" (CLAIMED — no independent verification).
- **License:** MIT (CONFIRMED, README §FAQ).
- **Integration model:** Python lib + CLI (`uvx browser-use install`); supports OpenAI / Google / Anthropic / custom LLMs; MCP shipped per header links.
- **Killer feature:** "ChatBrowserUse() — custom-optimized model 3-5× faster than competitors with SOTA accuracy" (CLAIMED, FAQ §). The 3-5× number is vendor marketing; not independently confirmed against published benchmarks.
- **Admitted limits:** Open-source variant has *lower accuracy* than cloud variant (CONFIRMED, benchmark chart); CAPTCHA solving requires Browser Use Cloud (CONFIRMED). This is the SaaS funnel knife from [[board-deliberation-browser-harness-2026-05-14]] §Knife 4.
- **Dependencies:** Python ≥3.11 · Chromium · LLM API key.
- **Adoption shape for Phill:** **OVERLAPS WITH `browser-harness`.** `browser-use` is the predecessor; `browser-harness` is the 2026 successor that adds self-editing helpers. If Phill installs browser-harness per the [[board-deliberation-browser-harness-2026-05-14]] verdict, browser-use need not be installed. **Verdict: SKIP — superseded.**

### 2.2 `web-ui` (15,966 ⭐, pushed 2025-08-31) — Python (Gradio)

- **What it is:** Gradio web UI wrapping browser-use functionality (README §intro).
- **Primary use case:** Visual-control browser agent sessions across multiple LLMs (Google / OpenAI / Azure / Anthropic / DeepSeek / Ollama).
- **Maturity:** Early-stage. Last push 2025-08-31 — **9 months stale.** Treat as effectively abandoned for the production lane.
- **License:** Not stated in README (FETCH GAP — would need LICENSE file check).
- **Integration model:** Standalone Gradio web app, `pip install` + `playwright install`.
- **Killer feature:** "Persistent Browser Sessions" — keep browser open between agent tasks, see complete state (CONFIRMED, README §features).
- **Admitted limits:** None explicit; persistent-session mode requires user closes own browser first.
- **Adoption shape for Phill:** **NO-FIT.** Phill has [[unite-group-nexus-architecture]] for any visual surface needed; he doesn't need a Gradio one. Gradio is a Python-only UI primitive — wrong substrate for Unite-Group's Next.js stack. **Verdict: SKIP.**

### 2.3 `video-use` (7,548 ⭐, pushed 2026-05-10) — Python

- **What it is:** "Edit videos with Claude Code" — transcript-driven cut-list generator that drops filler words, silences, false starts; outputs an ffmpeg edit list (README §intro).
- **Primary use case:** Talking-head edit pipeline (tutorials, interviews) without per-cut human review.
- **Maturity:** Beta. The README markets a "self-correction loop (max 3 iterations)" + "self-evaluates rendered output at every cut boundary" (CONFIRMED). No version number; latest push 5 days ago = alive.
- **License:** "100% open source" but specific licence not in the README excerpt (FETCH GAP).
- **Integration model:** Skill / plugin for Claude Code, Codex, Hermes, "agents with shell access". Symlinked into `~/.claude/skills/`.
- **Killer feature:** "LLM never watches the video" — transcript + on-demand PNG composites only. Cheap on tokens, no frame-by-frame multimodal cost.
- **Admitted limits:** Transcript-only — visual jumps depend on the eval loop catching them, not on the LLM watching frames; "Requires human approval before execution" (CONFIRMED).
- **Dependencies:** ffmpeg (required) · yt-dlp (optional) · ElevenLabs Scribe (transcription + diarization) · uv.
- **Adoption shape for Phill:** **OVERLAPS WITH [[remotion-orchestrator]] but in a DIFFERENT lane.** Phill's Remotion stack creates videos programmatically from templates. `video-use` edits already-recorded footage (Phill's voice memos, Toby walkthroughs, RestoreAssist field videos). Genuinely complementary. ElevenLabs is already in [[hermes-agent]] (line 65 `voice_compose.py`) so the dependency is free. **Verdict: PILOT — Synthex (creator-content workflow) + RestoreAssist (field-video edit-down for IICRC case studies) are the two real use cases.**

### 2.4 `workflow-use` (4,008 ⭐, pushed 2026-05-08) — Python

- **What it is:** "RPA 2.0" — record a browser interaction once via a Chrome extension, replay it deterministically; LLM only fires as fallback when the deterministic replay fails (README §intro).
- **Primary use case:** Repeating high-frequency browser tasks (invoice export, CRM data pull) without paying LLM tokens per run.
- **Maturity:** **"Very early development so we don't recommend using this in production"** — DIRECT QUOTE from README. (CONFIRMED) Vendor admits the LLM-fallback is "currently really bad."
- **License:** Not stated in README excerpt (FETCH GAP).
- **Integration model:** Python lib + FastAPI backend + Chrome extension (browser-recorder).
- **Killer feature:** Generation Mode — natural-language task description → reusable semantic workflow in one BrowserUse execution.
- **Admitted limits:** LLM fallback weak; self-healing remains roadmap; cloud-replay needs `BROWSER_USE_API_KEY`.
- **Adoption shape for Phill:** **WATCH-LIST.** Patterns Phill needs (recurrent CCW Cin7 exports, Xero bookkeeping uploads for Duncan-Dimitri) are exactly the workflow-use sweet spot — BUT the vendor explicitly says don't ship in production. Revisit in Q3 2026. **Verdict: WATCH.**

### 2.5 `macOS-use` (1,941 ⭐, pushed 2025-03-05) — Python (MLX)

- **What it is:** AI agent for macOS — let LLM control any Mac app (README §intro).
- **Primary use case:** Voice/text command → action across Finder, Mail, Safari, Numbers, etc.
- **Maturity:** **Last push 2025-03-05 — 14 months stale. Effectively abandoned.** README explicitly says "user discretion is advised" and "varying success rates."
- **License:** Not stated in README excerpt.
- **Integration model:** Local Python + MLX (Apple Silicon ML framework) + external LLM API key.
- **Killer feature:** Cross-app control without per-app integrations (CONFIRMED).
- **Admitted limits:** Can't reliably stop at CAPTCHAs; "Lower reliability with Gemini"; unsupervised operation not recommended.
- **Adoption shape for Phill:** **NO-FIT — REDUNDANT.** [[hermes-agent]]'s `computer_use` via `screen_dispatch` already covers macOS GUI driving (see [[autonomy-gap-audit-2026-05-14]] item #2 + [[computer-use-integration-2026-05-13]]). Adding macOS-use would create a second substrate for the same lane, and the MLX dependency lock-in is unhelpful. **Verdict: SKIP.**

### 2.6 `awesome-prompts` (921 ⭐, pushed 2025-03-26) — markdown only

- **What it is:** Curated collection of effective prompts for Browser-Use agents (README §intro).
- **Number of prompts:** 13 categories, 50+ examples (CONFIRMED).
- **Maturity:** Last push 2025-03-26 — 14 months stale. Drift risk: prompts written for browser-use v1, current is v3+.
- **Categories notable for Phill's portfolio:** "Web Research" (Margot), "E-commerce" (CCW Cin7/Shopify), "Job Applications" (Synthex if recruiting), "Testing & QA" (CCW + CARSI), "Multi-Step Workflows" (general).
- **Adoption shape for Phill:** **PILOT-LITE — borrow patterns, not the repo.** Read the "Testing & QA" + "Web Research" categories once; lift any prompt patterns into Margot's system prompt or [[qa-lead]]'s rubric. Don't add as a dependency or git submodule. **Verdict: WATCH — single read-through.**

### 2.7 `vibetest-use` (792 ⭐, pushed 2025-09-02) — Python (MCP server)

- **What it is:** **MCP server** that spawns multiple Browser-Use agents to test a website in parallel for UI bugs, broken links, accessibility issues (CONFIRMED, README §intro).
- **Primary use case:** Automated QA of "vibe-coded" (rapidly built) websites at the end of a sprint.
- **Maturity:** Early-stage but the MCP shape makes it directly useful. Last push 2025-09-02 — 8 months stale, but the MCP contract is stable.
- **License:** MIT (CONFIRMED, README §License).
- **Integration model:** **MCP server** — integrates with Claude Code, Cursor, or any MCP host via standard config.
- **Killer feature:** Parallelised multi-agent testing — spawn 3-10+ agents simultaneously on one URL.
- **Admitted limits:** None explicit (vendor over-confidence, treat with care). Real limit: Gemini-only (Google API key required).
- **Dependencies:** Python 3.11+ · Playwright Chromium · **Google API key (Gemini 2.0 Flash)**.
- **Adoption shape for Phill:** **HIGH — pre-merge QA gate.** This fits the [[qa-lead]] role's "test changed surface before merge" workflow exactly. CCW + CARSI + Nexus all need pre-merge UI smoke tests; today Vercel preview + manual click-through is the gate. Wire vibetest-use as an MCP server in `~/.claude.json` and let [[pm-core]] invoke it before opening PRs. The Gemini API key is already available ([[reference-1password-index]]). **Verdict: SHIP-WAVE-1.**

### 2.8 `agent-sdk` (682 ⭐, pushed 2026-03-30) — Python

- **What it is:** "The simplest possible agent framework. No abstractions. No magic. Just a for-loop of tool calls." (README §intro)
- **Primary use case:** Build minimalist autonomous agents that loop on tool calls — demoed with a sandboxed coding assistant.
- **Maturity:** Early-stage, v0.x. Last push 2026-03-30 — alive but not weekly-active.
- **License:** MIT (CONFIRMED, README §License).
- **Integration model:** Pluggable LLM providers via `BaseChatModel` interface (Anthropic / OpenAI / Google).
- **Killer feature:** Dependency-injection system for type-safe tool params (FastAPI-style).
- **Admitted limits:** "The less you build, the more it works" — explicit minimalism trade-off; few guardrails.
- **Adoption shape for Phill:** **NO-FIT for the swarm — REFERENCE READING.** Phill's swarm (`Pi-Dev-Ops/swarm/`) is already 318 Python modules ([[autonomy-gap-audit-2026-05-14]] §8). Adding another agent framework is the opposite of consolidation. BUT — agent-sdk's *philosophy* (for-loop + minimal abstractions) is the right shape for the [[pi-ceo-architecture]] "Senior Agents / PM-Core" layer. Read the source; do not adopt the dependency. **Verdict: WATCH — extract pattern.**

### 2.9 `qa-use` (536 ⭐, pushed 2025-08-08) — TypeScript

- **What it is:** Production-ready E2E QA testing platform powered by Browser-Use agents (README §intro).
- **Primary use case:** Test web apps via natural-language test scenarios; AI agents execute + validate.
- **Maturity:** Last push 2025-08-08 — **9 months stale.** Marketing copy says "production-ready" but the stale push contradicts.
- **License:** MIT (CONFIRMED, README §License).
- **Integration model:** Docker compose · PostgreSQL · Inngest (background jobs) · Resend (email notifications).
- **Killer feature:** "AI-Powered Testing Engine — evaluate test cases in plain English."
- **Dependencies:** Docker · Browser Use Cloud API key (`cloud.browser-use.com`) · Inngest Cloud · Resend.
- **Adoption shape for Phill:** **OVERLAPS WITH `vibetest-use` but heavier.** `vibetest-use` is an MCP server (lightweight, plugs into existing tooling). `qa-use` is a full Docker stack with Inngest + Resend dependencies. Two strikes: stale repo + heavy SaaS dependencies. **Verdict: SKIP — `vibetest-use` covers the use case.**

### 2.10 `desktop` (481 ⭐, pushed 2026-05-14) — TypeScript (Electron)

- **What it is:** "Run a team of browser agents on your desktop" — standalone Electron app distinct from Phill's everyday browser (README §intro).
- **Primary use case:** Run BrowserUse agents in a Chromium that imports Phill's cookies (so the agent is logged in everywhere he is) without polluting his main Chrome.
- **Maturity:** Active — pushed 2026-05-14 (yesterday). Distributed as `.dmg`/`.exe`/`.AppImage`.
- **License:** MIT (CONFIRMED).
- **Integration model:** Electron app · "Built on Browser Harness" (CONFIRMED — so it's a Magnus front-end for the same harness Phill is piloting per [[board-deliberation-browser-harness-2026-05-14]]).
- **Killer feature:** "Ports your cookies into a fresh Chromium so agents are logged in everywhere you are, and spawns tasks from anywhere with a keyboard shortcut" (CONFIRMED).
- **Admitted limits:** Requires Anthropic Claude API or OpenAI ChatGPT key; no offline mode; WhatsApp integration mentioned but text-only.
- **Dependencies:** Claude API or ChatGPT key · go-task (`brew install go-task`) for `task up` install.
- **Adoption shape for Phill:** **OVERLAPS WITH [[hermes-agent]] computer_use + Chrome DevTools MCP.** The cookie-import trick is real and clever (Phill's [[feedback-secrets-handling]] would let him isolate this in a dedicated profile). But [[mcp-ecosystem|Chrome DevTools MCP]] already attaches to Phill's authenticated Chrome — no need for cookie-import-into-Chromium. **Verdict: WATCH — read install script for the cookie-import code; do not install.**

### 2.11 `browser-harness-js` (453 ⭐, pushed 2026-04-20) — TypeScript / Bun

- **What it is:** TypeScript/Bun port of `browser-harness` — "thinnest possible bridge from LLM to Chrome" exposing all 652 CDP methods as typed JS calls (README §intro).
- **Primary use case:** TypeScript-native agents that drive Chrome via CDP without abstraction layers.
- **Maturity:** Early. v0.x. Last push 2026-04-20 — 25 days ago, alive.
- **License:** Not in README excerpt (FETCH GAP). The org default is MIT but verify.
- **Integration model:** Bun runtime (auto-installed), Chrome with remote debugging. Installed via `npx skills add` Claude Code skill pattern.
- **Killer feature:** "One persistent WebSocket, 56 domains, 652 typed wrappers, zero wrapping of what Chrome already does."
- **Admitted limits:** "Recipes on the mechanics that are not obvious from the CDP method list" require manual learning — i.e. discoverability problem.
- **Adoption shape for Phill:** **OVERLAPS WITH `browser-harness`.** The Python flavour is already board-approved per [[board-deliberation-browser-harness-2026-05-14]] (PILOT-ONE scoped to RestoreAssist). If TS/Bun lanes appear (Synthex / Nexus Next.js agents needing browser drive), reconsider. **Verdict: WATCH.**

### 2.12 `bux` (327 ⭐, pushed 2026-05-14) — Python

- **What it is:** **"A 24/7 Claude Code agent with Browser Harness, on any box you own."** (README §intro) Remote VPS-hosted Claude Code session that drives a real browser, Telegram-fronted. (CONFIRMED via direct README quote.)
- **Primary use case:** "Email summaries, web checks" from anywhere via Telegram — the operator pattern.
- **Maturity:** Early-stage, MIT-licensed, GitHub-based. Pushed 2026-05-14 — yesterday. Managed cloud variant available; self-host primary.
- **License:** MIT (CONFIRMED, README §License).
- **Integration model:** Telegram bot + Claude Code sessions + browser-harness (Chromium via CDP). State persists in `/home/bux`.
- **Killer feature:** "When claude hits a login wall / 2FA / CAPTCHA, it hands you a live view URL and waits" (CONFIRMED, README §features) — interactive fallback avoiding credential stuffing. This is the **single highest-leverage UX pattern** in the whole org.
- **Admitted limits:** Requires operator intervention at auth barriers; no automatic 2FA bypass; Browser Use Cloud free tier (3 concurrent browsers) needed.
- **Dependencies:** Ubuntu 22.04+ · ≥2 GB RAM · Browser Use Cloud API key · Anthropic API key or Claude Max subscription · Telegram bot token.
- **Adoption shape for Phill:** **STRUCTURAL TWIN OF [[hermes-agent]] + [[project-contextbot-platform]] + [[agency-bot-design-2026-05-14]] (Pilot).** Magnus shipped what Phill is in the middle of building. Three responses:
    1. **Do NOT adopt bux as a substrate** — it would require ripping out Hermes, Composio, Pi-CEO swarm, ContextBot routing. Months of work for marginal gain.
    2. **Read the install script** (`install.sh`) for the live-view-URL pattern when Claude hits a 2FA. Phill's Pilot ([[agency-bot-design-2026-05-14]]) needs an equivalent: "if a swarm-driven web action hits 2FA, ping Phill on Telegram with a one-tap live-view URL." This pattern is worth more than the repo.
    3. **Treat bux as competitive validation.** Magnus and Phill are building the same architecture; Magnus is 8 weeks ahead. Phill's [[agency-bot-design-2026-05-14]] Pilot plan is correct directionally. Differentiation: Phill owns the portfolio + ATIA wedge; Magnus owns horizontal SaaS.
- **Verdict: WATCH (study) — extract 2FA-live-view pattern into [[agency-bot-design-2026-05-14]] Phase 2.**

### 2.13 `cdp-use` (290 ⭐, pushed 2026-02-22) — Python

- **What it is:** Type-safe Python client generator for Chrome DevTools Protocol — auto-generates bindings from the official protocol spec (README §intro).
- **Primary use case:** Programmatic browser automation with full type-safety for IDE support.
- **Maturity:** Early. Last push 2026-02-22 — 3 months stale; generator-driven so churn is low.
- **License:** Not in README excerpt (FETCH GAP).
- **Integration model:** WebSocket to Chrome DevTools; requires running Chrome with `--remote-debugging-port`.
- **Killer feature:** Full type hints with TypedDict for the entire CDP surface.
- **Adoption shape for Phill:** **TRANSITIVE DEPENDENCY of `browser-harness`.** If [[board-deliberation-browser-harness-2026-05-14]] PILOT-ONE proceeds, `cdp-use` ships as a sub-dep automatically. No direct install needed. **Verdict: SKIP (transitive only).**

### 2.14 `awesome-projects` (123 ⭐, pushed 2025-08-31) — markdown

- **What it is:** Curated list of OSS projects built on browser-use (README §intro).
- **Number of projects:** 10 across four categories. Notable: OpenManus (multi-agent), Saik0s/mcp-browser-use (MCP server), SDET-GENIE (test code from user stories), Rebrowse (recordings → workflows), A5-Browser-Use (REST API + Chrome extension).
- **Maturity:** 9 months stale. Curated, no churn signal.
- **License:** Not in README.
- **Adoption shape for Phill:** **READ-ONCE REFERENCE.** Useful as a scout-list for further deep-dives. The `Saik0s/mcp-browser-use` MCP server might overlap with [[mcp-ecosystem]] tier-1; check before adding browser-harness. **Verdict: WATCH — single read.**

### 2.15 `bubus` (106 ⭐, pushed 2026-02-22) — Python

- **What it is:** "Fully-featured, Pydantic-powered event bus library for async Python" (README §intro). Powers the browser-use library's internal event plumbing.
- **Primary use case:** Event-driven applications with FIFO + parent-child event tracking + WAL persistence.
- **Maturity:** "Production-ready" stated in README title (CLAIMED — but unlike most vendor claims, this one is backed by being the substrate under a 93k-star library, which is real production usage).
- **License:** MIT (CONFIRMED).
- **Integration model:** Pure Python lib, `pip install bubus`, Python 3.12+.
- **Killer feature:** Automatic parent-child event causality trees + strict FIFO with async handlers.
- **Admitted limits:** Parallel handler mode loses ordering guarantee; hard cap at 100 pending events (`max_history_size`).
- **Dependencies:** Pydantic.
- **Adoption shape for Phill:** **HIGH-FIT for swarm internals.** [[pi-ceo-architecture]]'s `swarm/board/wiring.py` parses sentinels (`[DISPATCH-TO: PM-X]`) and routes events ad-hoc; no central event bus. bubus would clean that up. Cost: ~1 week to refactor; benefit: replayable + audit-loggable event trail across all 318 swarm modules. Pydantic is already in the stack. Caveat: Python 3.12+ required — verify Pi-CEO env. **Verdict: SHIP-WAVE-1.**

### 2.16 `sdk` (14 ⭐, pushed 2026-05-11) — TypeScript

- **What it is:** Official Browser Use Cloud SDKs (Python + TypeScript) — unified replacement for the archived `browser-use-python` + `browser-use-node` packages.
- **Primary use case:** Programmatic access to Browser Use Cloud (the SaaS).
- **Maturity:** Active. README is sparse — UNDER-DOCUMENTED, manual exploration needed.
- **License:** Not in README excerpt (FETCH GAP).
- **Integration model:** API client to the Browser Use Cloud product.
- **Adoption shape for Phill:** **CONDITIONAL.** Required IFF Phill commits to Browser Use Cloud for the [[board-deliberation-browser-harness-2026-05-14]] RestoreAssist pilot (stealth + proxies + CAPTCHA solving). If self-hosted Chrome wins, skip. **Verdict: WATCH (conditional on Cloud adoption).**

### 2.17 `agent-studio` (27 ⭐, pushed 2025-07-31) — TypeScript

- **What it is:** Demo repo — reference impl for Browser Use Cloud API integration with Next.js / Vercel.
- **Primary use case:** Show developers how to embed an iframe-rendered live browser view in a custom web UI with step-by-step task tracking.
- **Maturity:** Demo-grade, not production. 10 months stale.
- **License:** MIT (CONFIRMED).
- **Integration model:** Next.js client + Node API route proxy → Browser Use Cloud.
- **Killer feature:** Real-time browser viewing via embedded iframe.
- **Adoption shape for Phill:** **STUDY-ONLY for Pilot UX.** The iframe-live-view pattern is exactly what [[agency-bot-design-2026-05-14]] Pilot Phase 2 needs (mirror Magnus's bux live-URL trick). Read the iframe code; do not adopt the repo. **Verdict: WATCH — extract iframe live-view code.**

### 2.18 `contact-use` (35 ⭐, pushed 2025-07-30) — HTML

- **What it is:** Browser-use-powered contact-finder — "Use the power of browser-use to contact any person or organization … by any means necessary" (README §intro).
- **Primary use case:** Find contact info + optimal channel for reaching individuals/orgs.
- **Maturity:** Proof-of-concept, 10 months stale.
- **License:** Not in README.
- **Adoption shape for Phill:** **NO-FIT.** Phill's outreach happens via Composio Gmail ([[reference-composio-connections]]) + manual founder-led outreach. A "contact anyone" agent is the kind of thing that fails [[feedback-no-slack]]-adjacent spam-norms. Also, Magnus's own demo is finding GitHub Codex's renaming-time email outreach — that's spam-volume use that doesn't suit a portfolio-CEO brand. **Verdict: SKIP.**

### 2.19 `n8n-nodes-browser-use` (36 ⭐, pushed 2026-05-09) — TypeScript

- **What it is:** n8n community node package exposing Browser-Use as an n8n node.
- **Primary use case:** Drop browser-use into n8n workflows (low-code automation).
- **Maturity:** Community-maintained, dual API v2/v3 support.
- **License:** MIT (CONFIRMED).
- **Dependencies:** n8n runtime · Browser Use Cloud API key (mandatory).
- **Adoption shape for Phill:** **NO-FIT — wrong substrate.** Phill's stack is Hermes + Composio + Pi-CEO swarm. n8n would add a third workflow-orchestration substrate. Per [[feedback-no-slack]]-style "don't add substrates Phill didn't ask for", skip. **Verdict: SKIP.**

### 2.20 `template-library` (24 ⭐, pushed 2025-11-25) — Python

- **What it is:** Project templates for the `browser-use init` CLI.
- **Primary use case:** Scaffold quickstart browser-use projects from named templates.
- **Templates featured:** `shopping`, `job-application`, `agentmail`, `llm-arena`, **`slack`**, `all-openai-jobs`.
- **Maturity:** Active enough to be a git submodule of the parent repo.
- **License:** "Same as browser-use."
- **Adoption shape for Phill:** **FLAGGED — contains a Slack template.** Per [[feedback-no-slack]] this is not adopted, but flagging that the broader browser-use ecosystem implicitly tilts toward Slack-as-a-default-comms-substrate. Phill's stack uses Telegram + Composio Gmail; the Slack template should not be invoked. **Verdict: SKIP.**

### 2.21 `benchmark` (80 ⭐, pushed 2026-05-14) — Python

- **What it is:** Open-source benchmarks for browser automation agents + stealth (README §intro).
- **Suites:** Stealth Bench V1 (71 tasks for anti-bot evasion) + BU Bench V1 (100 tasks drawn from WebBench / Mind2Web 2 / GAIA / BrowseComp / custom).
- **Maturity:** Active (pushed yesterday).
- **Dependencies:** API keys for whatever model you're benchmarking.
- **Adoption shape for Phill:** **READ FOR CALIBRATION — do not run.** Useful only if Phill wants to independently verify Magnus's "10×" claims; the [[board-deliberation-browser-harness-2026-05-14]] PILOT-ONE plan does not require benchmark validation upfront. **Verdict: WATCH — single read of the benchmark methodology.**

### 2.22 `go-harnessless` (10 ⭐, pushed 2026-04-17) — Go

- **What it is:** Go rewrite of harnessless — daemon-based CDP bridge with goroutine concurrency.
- **Primary use case:** Concurrent browser automation in environments where a Python runtime is unwanted.
- **Maturity:** Experimental.
- **Killer feature:** True parallel CDP reads via goroutines vs Python single-threaded asyncio.
- **Adoption shape for Phill:** **NO-FIT.** Phill's stack is Python + TypeScript; Go is not in the stack. The parallel-reads angle is appealing but irrelevant at his task volume (10s of CDP calls/min, not 1000s). **Verdict: SKIP.**

### 2.23 `mix-eval-go` (3 ⭐, pushed 2026-02-17) — Go

- **What it is:** Go evaluation orchestrator for Mix Eval tasks via browser automation.
- **Primary use case:** Internal Magnus tooling for benchmark runs.
- **Adoption shape for Phill:** **NO-FIT.** Internal tooling for Magnus's eval pipeline. Skip. **Verdict: SKIP.**

### 2.24 `webagents.md` (9 ⭐, pushed 2026-02-21) — Python

- **What it is:** Spec + Python SDK letting websites publish a Markdown file declaring tools that AI agents can call as JS functions in-browser (README §intro).
- **Primary use case:** "AI agents navigate the web by calling functions websites explicitly provide, not by clicking through UIs built for humans."
- **Maturity:** Early proposal-spec. Demo exists.
- **License:** MIT.
- **Killer concept:** "LLMs are better at writing code than tool calls." Have the LLM write TypeScript that calls declared functions — single-shot chaining + error handling.
- **Adoption shape for Phill:** **PROVOCATION — long-tail watch.** If this becomes a standard (analogous to robots.txt or sitemap.xml for AI), Synthex + Nexus could publish their own `webagents.md` files so portfolio brands become first-class targets for any browser agent. Cheap optionality. Not Wave-1 urgent. **Verdict: WATCH — Q4 2026 if the spec gets traction.**

### 2.25 `online-mind2web` (17 ⭐, pushed 2026-03-25) — Python

- **What it is:** Online variant of the Mind2Web benchmark. UNDER-DOCUMENTED — README sparse.
- **Adoption shape for Phill:** Benchmark-internal. **Verdict: SKIP.**

### 2.26 `browsercode` (76 ⭐, pushed 2026-05-13) — TypeScript

- **What it is:** "A streamlined coding agent that drives real browsers through unconstrained CDP" — built on OpenCode + Browser Harness. The agent writes JS that drives Chrome directly, persisting browser session across calls (README §intro).
- **Primary use case:** Autonomous price comparison, web scraping, QA where the agent generates reusable JS scripts.
- **Maturity:** v0.0.3, actively developed, pushed yesterday.
- **License:** Not in README excerpt.
- **Integration model:** OpenCode-based; any model via API key; runs via `curl … | bash` from `bcode.sh`.
- **Killer feature:** Agent writes JS → drives Chrome via CDP in-process → returns logs/values/screenshots; reusable script artifact.
- **Admitted limits:** Cloud browsers 3 concurrent; telemetry enabled by default (opt-out `DO_NOT_TRACK=1`).
- **Adoption shape for Phill:** **OVERLAPS browser-harness + adds OpenCode dependency.** Three substrates competing for the same agent-drives-browser lane. browser-harness already chosen per [[board-deliberation-browser-harness-2026-05-14]]. browsercode adds an OpenCode coding-agent abstraction Phill doesn't need (he has Claude Code + Codex). **Verdict: SKIP.**

### 2.27 `chat-ui-example` (15 ⭐, pushed 2026-03-30) — TypeScript

- **What it is:** AI chat app demo using Browser Use v3 SDK. UNDER-DOCUMENTED.
- **Adoption shape for Phill:** **NO-FIT — demo only.** **Verdict: SKIP.**

### 2.28 `browser-use-examples` (7 ⭐, pushed 2025-08-22) — TypeScript

- **What it is:** Example repo. UNDER-DOCUMENTED. 9 months stale.
- **Adoption shape for Phill:** Skip. **Verdict: SKIP.**

### 2.29 `eval` (43 ⭐, pushed 2025-01-18) — Jupyter

- **What it is:** Evaluation notebooks for browser-use. 16 months stale.
- **Adoption shape for Phill:** Internal Magnus tooling. **Verdict: SKIP.**

### 2.30 `stress-tests` (26 ⭐, pushed 2025-11-20) — HTML

- **What it is:** "Collection of particularly difficult test scenarios for evaluating browser-use" (README §intro). HTML pages with edge-case interactions.
- **Adoption shape for Phill:** **POTENTIAL TEST FIXTURES for Pilot.** Useful as a local-host test bed for the browser-harness PILOT-ONE plan ([[board-deliberation-browser-harness-2026-05-14]]) — clone, run, see which scenarios break. Cheap reference. **Verdict: WATCH — Pilot QA fixture.**

### 2.31 `gemini-demo` (9 ⭐, pushed 2025-11-28) — Python

- **What it is:** Demo of Gemini 3 filling out a mock application form. 6 months stale.
- **Adoption shape for Phill:** Marketing artifact. **Verdict: SKIP.**

### 2.32 `nicehack69` (12 ⭐, pushed 2025-09-03) — empty primary lang

- **What it is:** Hackathon repo. Probably ephemeral.
- **Verdict: SKIP.**

### 2.33 `vc-use` (4 ⭐, pushed 2025-07-24) — empty primary lang

- **What it is:** Unknown — likely VC-pitch deck or fundraising artifact ("vc-use"). UNDER-DOCUMENTED.
- **Verdict: SKIP.**

### 2.34 `evaluation-endpoint` (1 ⭐, pushed 2025-07-11) — empty primary lang

- **What it is:** "Connect external apps to internal evaluations in a way that keeps sensitive data private."
- **Adoption shape for Phill:** **POTENTIAL PATTERN for portfolio.** If [[ccw|CCW]] or [[carsi|CARSI]] ever needs to expose internal eval data to a third party (insurance auditor, IICRC compliance), this private-eval pattern is interesting. Not urgent. **Verdict: WATCH — pattern only.**

### 2.35 `profile-use-releases` (5 ⭐, pushed 2026-04-19) — no lang

- **What it is:** Release artifacts repo (binaries). Not a code library.
- **Verdict: SKIP.**

### 2.36 `cc_compaction` (4 ⭐, pushed 2026-04-01) — Python

- **What it is:** Likely a Claude Code conversation-compaction utility. UNDER-DOCUMENTED.
- **Adoption shape for Phill:** **WORTH 30-MIN INVESTIGATION.** Phill's swarm hits token-limit / context-window concerns regularly ([[autonomy-gap-audit-2026-05-14]] §3). A Magnus-internal CC compaction utility could be a free win or a duplicate of existing skills. **Verdict: WATCH — manual investigation needed.**

### 2.37 `media` (1 ⭐, pushed 2026-05-04) — Python

- **What it is:** Empty description. Likely a media-assets repo for the org's marketing.
- **Verdict: SKIP.**

### 2.38 `.github` (1 ⭐, pushed 2025-11-23) — no lang

- **What it is:** Org-level meta config (org README, default issue templates).
- **Verdict: SKIP.**

### 2.39 `browser-use-rsi` (2 ⭐, pushed 2025-09-17) — Python

- **What it is:** Internal experiment ("rsi" possibly "recursive self-improvement"). UNDER-DOCUMENTED.
- **Verdict: SKIP.**

### 2.40 `browser-use-python` (15 ⭐, pushed 2026-02-25) — Python — **ARCHIVED**

- **What it is:** Old Python SDK, superseded by `sdk`.
- **Verdict: SKIP (archived).**

### 2.41 `browser-use-node` (30 ⭐, pushed 2026-02-25) — TypeScript — **ARCHIVED**

- **What it is:** Old Node SDK, superseded by `sdk`.
- **Verdict: SKIP (archived).**

### 2.42 `docs` (9 ⭐, pushed 2025-01-14) — MDX — **ARCHIVED**

- **What it is:** Old docs site, now at `docs.browser-use.com`.
- **Verdict: SKIP (archived).**

### 2.43 `browser-harness` — **ALREADY COVERED**

See [[research-browser-harness-pm-synthesis-2026-05-14]] + [[board-deliberation-browser-harness-2026-05-14]] for the full deliberation. Verdict: PILOT-ONE scoped to RestoreAssist restricted-portal pipeline.

---

## §3 Cross-portfolio fit matrix

Rubric: HIGH = direct production wedge; MED = useful but not unique; LOW = niche / overlaps existing; NO = wrong lane.

| Repo | CCW | CARSI | RestoreAssist | DR/NRPG | Synthex | Nexus | Margot | Pi-CEO swarm | Duncan/ATO-APP | ATIA | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| browser-use (parent) | LOW | LOW | MED | LOW | LOW | LOW | MED | LOW | MED | LOW | SKIP (superseded by harness) |
| web-ui | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| video-use | NO | MED | **HIGH** | MED | **HIGH** | NO | NO | NO | LOW | LOW | **PILOT** |
| workflow-use | MED | LOW | MED | LOW | LOW | LOW | LOW | MED | MED | LOW | WATCH |
| macOS-use | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP (Hermes covers) |
| awesome-prompts | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (read-once) |
| **vibetest-use** | **HIGH** | **HIGH** | MED | MED | LOW | **HIGH** | NO | **HIGH** | MED | LOW | **SHIP-W1** |
| agent-sdk | NO | NO | NO | NO | NO | NO | NO | MED | NO | NO | WATCH (extract pattern) |
| qa-use | LOW | LOW | LOW | LOW | LOW | LOW | NO | LOW | LOW | LOW | SKIP (vibetest covers) |
| desktop | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (extract code) |
| browser-harness-js | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (conditional) |
| bux | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | WATCH (study, do not adopt) |
| cdp-use | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | SKIP (transitive) |
| awesome-projects | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (single read) |
| **bubus** | LOW | LOW | LOW | LOW | LOW | MED | LOW | **HIGH** | LOW | LOW | **SHIP-W1** |
| sdk | LOW | LOW | MED | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (conditional) |
| agent-studio | LOW | LOW | LOW | LOW | LOW | MED | LOW | MED | LOW | LOW | WATCH (extract iframe code) |
| contact-use | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| n8n-nodes-browser-use | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| template-library | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP (Slack flag) |
| benchmark | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (read methodology) |
| go-harnessless | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| mix-eval-go | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| webagents.md | LOW | LOW | LOW | LOW | MED | MED | LOW | LOW | LOW | MED | WATCH (Q4 spec) |
| online-mind2web | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| browsercode | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| stress-tests | LOW | LOW | MED | LOW | LOW | LOW | LOW | MED | LOW | LOW | WATCH (Pilot fixture) |
| chat-ui-example | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| browser-use-examples | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| eval | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| gemini-demo | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| nicehack69 | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| vc-use | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| evaluation-endpoint | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | LOW | WATCH (pattern only) |
| profile-use-releases | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| cc_compaction | NO | NO | NO | NO | NO | NO | LOW | MED | NO | NO | WATCH (investigate) |
| media / .github / browser-use-rsi | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | SKIP |
| browser-use-python / -node / docs | — | — | — | — | — | — | — | — | — | — | ARCHIVED |
| browser-harness | — | — | — | — | — | — | — | — | — | — | ALREADY-COVERED (PILOT) |

**Marginal-cost-of-adoption summary for the SHIP-W1 + PILOT verdicts:**

| Repo | Effort | $ | Lock-in risk | Sunset clock |
|---|---|---|---|---|
| vibetest-use (MCP server in `~/.claude.json`) | 30 min install + 2 h per-repo wiring | $0 (uses existing Gemini key) | LOW — MCP contract is portable | None — MCP servers swap cleanly |
| bubus (swarm event-bus refactor) | 3-5 d swarm refactor + tests | $0 | MED — would touch 20+ swarm modules; rollback is real diff | None — Pydantic is forever |
| video-use (Synthex + RA pilot) | 1 d install + 1 d per workflow | ElevenLabs tokens (already in stack per [[hermes-agent]]:65) | LOW — symlinked skill | None |

---

## §4 Top 5 highest-leverage + Top 5 anti-recommendations

### Top 5 highest-leverage (rank-ordered)

1. **`vibetest-use`** — Multi-agent QA MCP server. Plugs into [[pm-core]] pre-merge gate for CCW + CARSI + Nexus + future portfolio. Single biggest leverage point because today's QA is manual click-through + Vercel preview eyeball. Wave-1 install. **$-value: 6-10 h/week swarm hours saved at ~$250/h = $1.5-2.5k/week = $6-10k/month** once Phase 2 ([[unite-group-nexus-architecture]]) lands.

2. **`bubus`** — Pydantic event bus. The swarm's `wiring.py` sentinel parser is single-substrate today; bubus gives replayable + WAL-persisted causality. Pairs naturally with [[autonomy-gap-audit-2026-05-14]] item #4 (PM-Senior-Scoper) — every scoping decision becomes a tracked event. **$-value: indirect** but enables observable autonomy, which is the [[master-plan-2b-by-2028-v3]] L4 ladder requirement.

3. **`video-use`** — Transcript-driven video edit. Synthex creator-content pipeline + RestoreAssist field-video → IICRC case-study workflow. **$-value: ~4 h/week Synthex output + ~6 h/month RA documentation** = $1-1.5k/month.

4. **`browser-harness` (already approved per [[board-deliberation-browser-harness-2026-05-14]])** — included for completeness. PILOT-ONE on RestoreAssist restricted-portal pipeline. **$-value: $4-7k/month** per Revenue Officer's call.

5. **`bux` install-script-as-reading** — Read `install.sh` for the 2FA-live-view URL pattern; lift it into [[agency-bot-design-2026-05-14]] Phase 2. **$-value: doesn't save money directly — saves the build time of inventing the pattern from scratch.** Maybe 1-2 days saved.

### Top 5 anti-recommendations (do NOT adopt despite surface appeal)

1. **`qa-use`** — Looks like a production-ready QA platform but: (a) 9 months stale, (b) heavy Docker + Inngest + Resend SaaS stack, (c) `vibetest-use` covers the same lane lighter. Skip.

2. **`workflow-use`** — RPA 2.0 sounds compelling and would map onto CCW Cin7 exports + Duncan-Dimitri Xero workflows, BUT the vendor explicitly says **"very early development so we don't recommend using this in production"** + "LLM fallback currently really bad." Vendor-admitted not-ready. Skip until Q3 2026 minimum.

3. **`macOS-use`** — Looks like a free macOS-driving substrate but: (a) 14 months stale, (b) MLX dependency lock-in, (c) [[hermes-agent]] `computer_use` already owns the lane. Adding it creates two-substrate-fight Linear tickets. Skip.

4. **`n8n-nodes-browser-use`** — Looks like a clean integration but it presupposes adopting n8n as a workflow orchestrator. Phill's stack already has Hermes + Composio + Pi-CEO swarm — three orchestrators is one too many. Skip.

5. **`bux`** — Looks like exactly what Phill is building, AND IT IS, which is why **adopting it would mean ripping out Hermes + Composio + ContextBot routing for one repo's framework.** Months of pivot cost for a few weeks of head-start. Study, do not adopt.

---

## §5 Composable bundles

Repos that pair well, and repos that conflict.

### Bundle A — "Browser autonomy" (already partially adopted)

`browser-harness` (Python, board-approved PILOT) + `cdp-use` (transitive dep) + `bubus` (event bus for the harness's internal events; same author, designed to pair) + `vibetest-use` (MCP server that uses browser-use under the hood). Four-repo bundle; one direct install (browser-harness), one MCP install (vibetest-use), one decision pending (bubus refactor). **Composes well.**

### Bundle B — "Cloud + UI demos" (do NOT adopt as a bundle)

`sdk` + `agent-studio` + `chat-ui-example` + `bux` + `desktop`. All five depend on Browser Use Cloud. Adopting any one of them is an effective vote for Browser Use Cloud as a SaaS dependency. Per [[board-deliberation-browser-harness-2026-05-14]] §Knife 4 (the SaaS funnel), avoid until pricing above the free tier is published.

### Bundle C — "Reference patterns to lift, not install" (high leverage, zero adoption cost)

`bux` install.sh (2FA live-view pattern) + `agent-studio` iframe component (live-view in custom UI) + `evaluation-endpoint` (private-eval pattern for portfolio brands) + `webagents.md` (forward-looking AI-discoverability spec). Four code reads, zero installs. **This is the cheapest leverage in the whole org.**

### Bundle D — "QA + benchmark stack" (Wave 2)

`vibetest-use` (MCP server, multi-agent QA) + `stress-tests` (edge-case fixtures) + `benchmark` (methodology reference). Compose for the [[qa-lead]] pre-merge gate. Wave 2 candidate once Wave 1 ships.

### Conflicts

- `browser-harness` vs `browser-use` — successor vs predecessor; pick harness.
- `browser-harness` vs `browsercode` vs `desktop` — three CDP-attached agents in the same lane; pick harness.
- `qa-use` vs `vibetest-use` — pick vibetest-use (lighter, MCP, no Docker).
- `macOS-use` vs Hermes `computer_use` — pick Hermes.

---

## §6 Wave plan

### Wave 1 — install / refactor NOW (next 14 days, alongside [[board-deliberation-browser-harness-2026-05-14]] PILOT-ONE)

| Item | Effort | $ cost | Owner | Acceptance |
|---|---|---|---|---|
| **`vibetest-use` MCP install** | 30 min install + 2 h CCW wiring + 2 h CARSI wiring + 2 h Nexus wiring | $0 (uses existing Gemini API key) | Builder bot ([[pi-ceo-architecture]] §Senior Agents) | Pre-merge: vibetest-use reports zero P0 issues on the PR's preview URL before [[qa-lead]] approves. |
| **`bubus` swarm refactor — Wave-1 PILOT** | 1 day — refactor `swarm/board/wiring.py` only (NOT all 318 modules) — single sentinel parser becomes a bubus event handler | $0 | PM-Core | All existing sentinel tests pass + WAL log generates causality tree readable from `~/.hermes/bubus_audit.jsonl`. |
| **Bundle C reading** — read `bux/install.sh` + `agent-studio` iframe component + `evaluation-endpoint` README + `webagents.md` spec | 90 min (1 sitting) | $0 | Phill solo (or Margot dispatch) | Notes captured to a new wiki page `Wiki/research-browser-use-patterns-2026-05-15.md` (this audit, not a new page yet). |

### Wave 2 — pilot (Q3 2026)

| Item | Effort | $ cost | Owner | Acceptance |
|---|---|---|---|---|
| **`video-use` Synthex pilot** | 2 d install + 1 d Synthex workflow integration | ElevenLabs tokens ($20-50/mo cap) | Synthex creator pipeline | 5 talking-head edits/week shipped without per-cut human review; CTR doesn't drop versus hand-edited baseline. |
| **`video-use` RA pilot** | 1 d wiring | Same | RA documentation | 3 IICRC case-study cuts shipped from field-video footage. |
| **`bubus` swarm refactor — full** | 5 d — extend to all event-emitting swarm modules | $0 | Builder + PM-Core | All swarm internal events flow through bubus; replay works; audit-log reviewable. |
| **`stress-tests` fixtures** | 2 h — clone, host locally, point browser-harness PILOT at it | $0 | RestoreAssist team | At least 10 stress-test scenarios pass on the PILOT browser-harness install. |

### Wave 3 — Q4 2026 / Q1 2027

| Item | Effort | $ cost | Owner | Acceptance |
|---|---|---|---|---|
| **`webagents.md` portfolio adoption (conditional on spec traction)** | 1 d per portfolio brand (6 brands) = 6 d | $0 | Brand-guardian per brand | Each portfolio brand publishes `/.well-known/webagents.md` declaring tools for AI agents. |
| **Re-evaluate `workflow-use`** | 2 h read of the changelog + 1 d pilot if production-claim now stands | $0 | PM-Core | Vendor confirms production-readiness in their own README or via a v1.0 release tag. |
| **`browser-harness-js` if Synthex / Nexus needs TS browser-drive** | 2 d install + pilot | $0 | Synthex / Nexus dev | Triggered only if a Wave-3 ticket actually requires TS-native browser drive. |

### Wave 4 — Watchlist only (no commitment)

- `bux` competitive monitoring (re-read README quarterly; if Magnus changes direction, re-evaluate).
- `desktop` if Phill ever wants a portable "agent on my laptop" surface (low likelihood — Hermes already covers).
- `cc_compaction` 30-min investigation when context-window pain becomes audible.
- `sdk` adoption only if Browser Use Cloud becomes load-bearing.

---

## §7 The 5 forks for Phill

These are the YES/NO calls the Board needs before any of the Wave-1 items above can be locked. Per [[feedback-make-calls-not-questions]] — these are framed as binary forks, not open-ended questions.

### Fork 1 — Adopt `vibetest-use` as the [[qa-lead]] pre-merge gate?

- **YES** = Builder bot calls vibetest-use MCP on every PR's preview URL before [[qa-lead]] approves; manual click-through is replaced; ~6-10 h/week saved.
- **NO** = Stay on manual + Vercel-eyeball QA; revisit in Wave 2 if [[qa-lead]] backlog grows.
- **Recommendation: YES** — single biggest Wave-1 leverage point, $0 marginal cost, MCP install rollback is one config-line.

### Fork 2 — Refactor `swarm/board/wiring.py` to use `bubus` (pilot) in Wave 1?

- **YES** = One module refactored as proof; if audit-replay works, extend to full swarm in Wave 2.
- **NO** = Defer all bubus work to Q3 2026 or later; live with ad-hoc event plumbing.
- **Recommendation: YES (limited pilot)** — minimum 1-day risk, enables L3+ autonomy maturity per [[autonomy-gap-audit-2026-05-14]].

### Fork 3 — Pilot `video-use` on Synthex or RestoreAssist first?

- **SYNTHEX-FIRST** = Volume play (5+ edits/week) tests the self-eval loop fast.
- **RA-FIRST** = Strategic play — IICRC case studies as the ATIA content moat.
- **Recommendation: SYNTHEX-FIRST** for technical de-risk (high volume, low stakes), THEN RA. Per [[master-plan-2b-by-2028-v3]] Synthex distribution is the wedge, RA is the moat. Test on the wedge, ship on the moat.

### Fork 4 — Read `bux/install.sh` and adopt its 2FA-live-view pattern in [[agency-bot-design-2026-05-14]] Phase 2?

- **YES** = Add 30 min to Phase 2 effort estimate; ship a tested-by-Magnus UX pattern.
- **NO** = Invent the pattern from scratch; risk shipping something less polished.
- **Recommendation: YES** — competitive-intel reading is free; the pattern is non-trivial to reinvent.

### Fork 5 — Commit to Browser Use Cloud as a SaaS dependency, or stay self-hosted?

- **CLOUD-YES** = Use Browser Use Cloud free tier (3 concurrent, CAPTCHA solving, proxies) for the [[board-deliberation-browser-harness-2026-05-14]] PILOT-ONE; accept the SaaS funnel risk; unblocks RA pilot fast.
- **SELF-HOSTED** = Run Chromium locally with `--remote-debugging-port` + no CAPTCHA solver; longer pilot ramp; no third-party dependency.
- **Recommendation: CLOUD-YES for the pilot, SELF-HOSTED for any production-volume work.** Use the free tier to validate the PILOT in 14 days; if the pilot ships, migrate to self-hosted before scaling concurrency beyond 3 browsers. The Cloud free tier IS the price-discovery instrument Contrarian called for in [[board-deliberation-browser-harness-2026-05-14]] §Knife 4.

---

## §8 Cross-refs

[[research-browser-harness-pm-synthesis-2026-05-14]] · [[board-deliberation-browser-harness-2026-05-14]] · [[agency-bot-design-2026-05-14]] · [[master-plan-2b-by-2028-v3]] · [[pi-ceo-architecture]] · [[autonomy-gap-audit-2026-05-14]] · [[unite-group-nexus-architecture]] · [[hermes-agent]] · [[mcp-ecosystem]] · [[project-contextbot-platform]] · [[computer-use-integration-2026-05-13]] · [[ccw]] · [[carsi]] · [[restore-assist]] · [[dr-nrpg]] · [[synthex]] · [[reference-composio-connections]] · [[reference-1password-index]] · [[qa-lead]] · [[pm-core]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-model-routing-max-first]] · [[feedback-design-preferences]] · [[feedback-autonomous-mandate]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-audit-verification]]
