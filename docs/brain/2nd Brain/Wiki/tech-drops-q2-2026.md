---
type: wiki
updated: 2026-05-11
---

# Tech Drops — Q2 2026

Critical platform and tooling changes relevant to the empire build. Updated via autonomous research agents.

## Anthropic / Claude — May 2026

### Managed Agents (GA May 7)
Three features launched that directly affect [[pi-ceo-architecture]]:
- **Dreaming** (research preview) — agents can run extended background research jobs, persisting state between invocations. Wave 5.5 Senior Agents should be re-architected to use Dreaming for overnight research cycles.
- **Outcomes** (beta) — goal-based agent evaluation; agents self-assess task completion against a defined success criterion. Wire into [[autonomous-sdlc]] sandbox gate.
- **Multi-Agent Orchestration** (beta) — native Anthropic orchestration layer for spawning sub-agents. This is Pi-CEO Layer 2 (Board) in native infrastructure — evaluate against current Railway setup.

### Claude Code Updates
- `--plugin-url` flag now live — remote skill loading without local install
- `PostToolUse` hooks available — can trigger Hermes cron on every tool call
- MCP/OAuth stability fixes shipped
- VS Code extension: multi-file edit now stable

### API Changes
- Opus 4.7 is GA and default for board-level tasks
- Rate limits doubled; peak-hour throttling removed
- Inference cost unchanged

### Implication for Pi-CEO
Managed Agents Orchestration could replace the current Railway + cron CCR pattern. Evaluate in Wave 6 — do not rip out Railway in Wave 5. Run parallel for 30 days.

---

## OpenAI — May 2026

- GPT-5.5 Instant set as default API model (May 5)
- 3 new realtime voice models released (consumer-oriented)
- No strategic threat to Anthropic position; Opus 4.7 leads on reasoning depth

---

## Google — May 2026

- **Google I/O: May 19** — Gemini 4.0 expected announcement. Watch for multimodal advances affecting [[seo-linkable-assets]] strategy.
- Gemini File Search now multimodal — can query PDFs, images, audio in corpus
- AI Overviews appear in 25.8% of US searches; 39% of informational queries now show AI overview

---

## SEO / AEO Platform Changes (May 2026)

See [[seo-linkable-assets]] for full AEO playbook. Critical rule changes:

**Google Core Update (May):**
- Composite Core Web Vitals: non-linear penalty if any single signal falls below threshold
- Experience is now the #1 E-E-A-T signal (not Expertise)
- Brand trust signals measurably feed SERP position

**AI Search (Perplexity, ChatGPT, Claude.ai):**
- `GPTBot`, `ClaudeBot`, `PerplexityBot` must be allowed in robots.txt
- Add `llms.txt` to root of all portfolio sites — machine-readable context file
- 40–60 word answer-first blocks at page top are the citation lever — FAQ/JSON-LD schema remains essential for rich snippets in classic SERPs, but **does not measurably lift AI citation frequency** per the Ahrefs 2026-05 controlled study (some sites declined 4.6%) — see [[research-tangential-2026-05-14]]
- "restoration software Australia" and "IAQ equipment supplier" — **unclaimed in AI search**. No ANZ brand owns the cited answer. Action: publish authority pages for RestoreAssist + Bulcs Holdings NOW.

---

## Industry Tooling: Floor Plan Creation

### Encircle Floor Plan
Encircle converts simple smartphone videos into professional, Xactimate-ready floor plans in under six hours, enabling immediate estimating.

**Key Features and Benefits:**
*   **Workflow:** Encircle automates the hardest part of documentation, requiring no training, tripods, or manual drawing.
*   **Efficiency:** It provides accurate, professional floor plans, allowing estimates to begin on Day 1.
*   **Comparison:**
    *   **Vs. DocuSketch:** Avoids unpredictable overage charges, hardware costs, and tour fees associated with Docusketch billing.
    *   **Vs. Magicplan:** Provides a complete platform, unlike Magicplan, which is clunky for full floor plans and requires techs to spend time on phones rather than restoration work.

### RoomScan Pro LiDAR
RoomScan Pro LiDAR is an app designed for iPhone Pro and iPad Pro, utilizing LiDAR technology for highly accurate and fast floor plan creation. It leverages a combination of proprietary scanning methods and Apple's built-in tools.

**Key Features and Benefits:**
*   **Technology:** Uses LiDAR to determine distance by measuring light reflection time, providing precision comparable to NASA-grade equipment.
*   **Scanning Modes:** Offers three modes: Apple RoomPlan (for 10% of rooms), Closet Mode (for 4% of rooms, effective in low light), and RoomScan's proprietary LiDAR scanning for the majority of rooms.
*   **Ease of Use:** The app is designed to be simple, allowing users to create accurate floor plans in seconds.
*   **Output:** Generates 3D models that can be shared via standard formats (USDZ & PLY) or posted to platforms like sketchfab.com.
*   **Patents:** Protected by US Patents [11,269,060](https://patft.uspto.gov/netacgi/nph-Parser?OS=11269060&RS=11269060&Sect1=PTO2&Sect2=HITOFF&co1=AND&d=PTXT&f=G&l=50&p=1&r=1&s1=11269060&u=%2Fnetahtml%2FPTO%2Fsearch-bool.html) and [8,868,375](https://patft.uspto.gov/netacgi/nph-Parser?Query=PN%2F8868375&RefSrch=yes&Sect2=PTO1&Sect2=HITOFF&d=PALL&f=G&l=50&p=1&r=1&u=%2Fnetahtml%2FPTO%2Fsearch-bool.html).

---

---

## Video Generation: HTML-in-Canvas (May 2026)

HyperFrames (by HeyGen) launched HTML-in-Canvas feature 2026-05-08 — video timeline becomes HTML/CSS code an AI agent can edit. Source: `Sources/Codex can now make videos…it's insane.md`.

- Codex / Claude Code / Hermes plugin available; prompt in plain English → MP4 render. ElevenLabs integrated for voiceover + SFX.
- Composition types from a single prompt: motion graphics, liquid-glass subscribe animations, 3D iPhone product showcases, audio waveform visualisers, website-to-product-label conversion, brand-fitted hero animations.
- Requires Chrome flag `canvas-draw-element`.
- Run time: ~10 min initial scaffold (Codex medium speed), ~2 min for edits since only changed sections re-render.

**Implication:** Confirms the [[iicrc-content-initiative]] AI multimodal pipeline thesis. Pairs with the Remotion skills package (`remotion-orchestrator`) — HyperFrames is the third-party-managed alternative to the in-house Remotion stack. Decision: Remotion stays primary (controllable, scriptable, cheaper); HyperFrames is a fallback for one-off campaign assets where speed matters more than brand-system fidelity.

## Abacus AI Studio — Agentic Design + Media (May 2026)

Source: `Sources/The New Agentic AI Workflow Feels Too Powerful.md`. Abacus AI Agent (previously Deep Agent) launched a Design vertical + Abacus Studio for agentic media generation.

- Design: sketch → app screens, 30+ screen user journeys (web + mobile + happy / pre-qualification / save-resume / error paths), full brand systems with do/don't rules, brand-reinvention with browser-driven competitor scrape.
- Studio media: Seedance / Kling / Veo 3 video models, Flux 0.2 Pro + GPT Image 2 image models, motion-transfer (live dancer → animated character), subject-consistency across edits and locations, Topaz AI upscale.

**Watching:** Not adopting yet. Worth monitoring as a competitor to in-house [[autonomous-sdlc]] for one-shot creative asset generation — but the agentic-design output lacks the brand-system rigour of [[nexus-design-system]] + Synthex brand-config.

## NotebookLM Inside Gemini (April 2026)

Google merged NotebookLM into Gemini 2026-04-08 (Ultra/Pro/Plus web first, mobile + free coming). Source: `Sources/Google Gemini + NotebookLM is INSANE!.md`.

- Notebooks in Gemini = folders with persistent cross-session memory. Two-way sync with NotebookLM (artifacts only generated in NotebookLM — audio overviews, video overviews, infographics, slide decks).
- Source limits: Pro tier 600 sources per notebook (PDFs, Google Docs, files, URLs, YouTube transcript-indexed, paste).
- Source grounding: NotebookLM = sources only; Gemini chat with notebook = sources + web. Pick per task.
- Custom instructions shared across both apps.
- Retroactive: drag old chats into a notebook so prior research isn't lost.

**Implication for [[iicrc-content-initiative]]:** This is the cheap content-pipeline substrate. 600-source-per-notebook ceiling × 13 IICRC standards × derivative angles = practical authoring workflow. NotebookLM video overviews replace some of the [[restore-assist]] training-video production. Test before next IICRC content sprint.

## Anthropic Natural Language Autoencoders (May 2026)

Anthropic published NLAs — translate Claude's internal activations into English text. Source: `Sources/we JUST figured out how AI thinks.md`. Captured under [[agent-memory-patterns]] (Interpretability section) for cross-link.

**Operational signal:** Claude knows it's being tested in 16–26% of eval runs. Production [[autonomous-sdlc]] gates must sample real user traffic too, not just synthetic evals.

## Systems Programming Shift: Rust (May 2026)

Source: `Sources/Systems Programming in 2026.md`. C++ still dominates installed base, but White House / NSA / CIA now name memory-unsafe languages including C++; ~70% of Microsoft/Google security vulnerabilities trace to memory bugs. Rust adoption confirmed in AWS, Microsoft, Google, Cloudflare, Linux kernel.

**Empire implication:** Zero current Rust footprint. No immediate action required (TypeScript / Python dominate the stack), but [[nexus-team-composition]] should flag Rust as a hireable skill for any future hot-path service (high-throughput WebSocket gateway for [[restore-assist]] field sync, real-time damage-overlay rendering). Note: `restore-assist` uses Swift/PencilKit, not C++; no migration pressure there.

## API Substrates Primer

Sources: `Sources/Why Big Tech Doesn't Always Use REST?.md`, `Sources/Why Every Developer Needs to Understand WebSockets.md`.

Quick reference for portfolio architecture choices:

| Pattern | When to use | Empire example |
|---|---|---|
| REST | CRUD, public APIs, ~90% of cases | All [[unite-group-nexus-architecture]] endpoints today |
| SOAP | Compliance / paper trail (banks, healthcare, gov) | Future ATO integration (see [[swot-infrastructure-2026]]) |
| gRPC | Microservices, real-time streaming, performance-critical | Candidate for [[restore-assist]] ↔ backend sync layer |
| GraphQL | Avoid over/under-fetching, self-documenting schema | Linear already uses (we consume it) |
| Webhooks | Event-driven, reverse APIs (Stripe, GitHub) | Stripe billing scaffold; GitHub webhooks into [[pi-ceo-architecture]] |
| WebSockets | Real-time bi-directional (chat, multiplayer, live updates) | Pi-CEO dashboard live agent stream (already in use) |
| WebRTC | Browser↔browser, peer-to-peer, <500ms latency | Future telephony for [[ccw]] / association events |

## OpenManus — Local-First Agent Fallback (May 2026)

Source: `Sources/OpenManus The Free Open Source Manus AI Agent You Can Run Locally.md`. MIT-licensed MetaGPT-team project; 56k stars / 10k forks. Mirrors the Manus product loop (plan → tool select → execute → observe → re-plan) in code you can read. Install via `uv` + `playwright install` for browser tool. Config takes any OpenAI-format provider (OpenAI / Anthropic / Gemini / DeepSeek / Ollama / Grok / Hyperbolic). Sister project `OpenManus-RL` uses GRPO for tool-use improvement.

**Empire position:** Not adopting. Direction-of-stack contradiction with [[gemma4-cost-strategy]] (Claude Opus 4.7 for board-level work, Gemma 4 for cheap high-volume). Documented as escape hatch only — if Anthropic Max ever hard-rate-limits us, OpenManus + Ollama is the known-good substitute. See [[system-opportunities-2026-05-11]] § Contradictions.

## App Scaling Cost Reference

Source: `Sources/How Much Does it Cost to Scale an App to 100,000 Users?.md`. FastAPI + Postgres + Locust load test on Sevalla, 100 → 100,000 users.

| Tier | Spend | Bottleneck | Fix |
|---|---|---|---|
| 100 users | $15/mo | none | ship |
| 1,000 users | $15/mo → $23/mo | DB call duplication; CPU 605 users | Vertical scale CPU; cache |
| 10,000 users | ~$50/mo | gunicorn workers (g-thread vs g-event); memory | Redis cache + g-event async |
| 100,000 users | $200–$300/mo + CDN | connection pool exhaustion | Horizontal scale (5–10 instances), PgBouncer, CDN for assets |

**Empire position:** Reference only. Our stack is Vercel-native (auto-scale, no virtual-machine sizing) + Supabase RLS — different cost curve. Confirms Synthex / Unite-Hub / CCW-CRM at 10k MAU each will stay well under [[budget-constraints]] ceiling. PgBouncer pattern noted for any future heavy-write Supabase workload.

## GitHub Marketplace Model Listings (May 2026)

Source: `Sources/GitHub Marketplace tools to improve your workflow.md`. Marketplace now hosts models (GPT-5, DeepSeek-V3-0324, Llama 4 Scout 17B 16E Instruct) alongside apps. Apps we already use: Linear, Vercel. Apps reviewed and skipped: CodeRabbit (duplicates Anthropic-internal review), Render (duplicates Vercel deploys), LovableBot (no use case). OpenCode app via Copilot login noted; OMX layer captured in earlier ingest. No new system primitive.

## Cross-links
- [[pi-ceo-architecture]] — Managed Agents may replace Railway orchestration in Wave 6
- [[autonomous-sdlc]] — Outcomes beta for sandbox gate
- [[seo-linkable-assets]] — AEO actions for all portfolio sites
- [[wave-roadmap]] — Wave 5.5 agent architecture update
- [[agent-memory-patterns]] — Context-management patterns from Arize + Anthropic NLA findings
- [[marketing-brain-system]] — SEO operating system pattern
- [[iicrc-content-initiative]] — NotebookLM-Gemini + HyperFrames pipeline candidate
- [[claude-code-guide]] — Working model for the engineering surface
- [[system-opportunities-2026-05-11]] — 14-source May 2026 batch opportunity scan