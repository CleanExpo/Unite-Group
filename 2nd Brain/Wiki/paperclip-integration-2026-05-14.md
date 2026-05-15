---
type: wiki
updated: 2026-05-14
---

# Paperclip.ai — Integration Proposal Across the Pi-CEO Stack

Honest assessment of how Paperclip.ai (https://docs.paperclip.ing/) fits into Phill's existing Margot → Pi-CEO Board → Senior Agents swarm. Written from the ingested source `Sources/Completed/Paperclip Docs.md` plus adjacent context. **Source caveat below — read first.**

## Source caveat — read this before deliberating

The file at `Sources/Completed/Paperclip Docs.md` is the **docs landing page only** — the index. Lines 11–121 contain the eight top-level section titles (Quickstart, Working Day-to-day, Your Org & Agents, Projects & Workflow, Power Features, How-to Guides, Administration, API, CLI, Skills, Adapters, Plugins, Deployment) with link-out copy ("8 pages", "6 pages", "15 pages") but **none of the underlying page bodies are in the captured clipping**. Every concrete claim in this wiki page about Paperclip's actual primitive behaviour is therefore inferred from:

1. The section titles + 1-line section descriptions (lines 13, 27, 33, 41, 49, 57, 65, 77, 83, 91, 99, 107, 115).
2. The product's one-line self-description: "a control plane for AI-run companies. Hire agents, delegate tasks, approve the risky ones, and watch the work happen" (line 13).
3. The named primitives surfaced by section titles: **companies, agents, issues, approvals, costs, skills, adapters, execution policy, plugins**.

Any board deliberation that hinges on Paperclip's specific behaviour (rate limits, pricing, adapter-protocol surface, plugin SDK shape) must commission a second-pass research run — either Margot deep-research crawling the eight sub-doc URL trees, or Phill pasting the underlying pages into a fresh INGEST. See §9 "What we DO NOT yet know" — this list is uncomfortably long, and the swarm should not commit engineering effort against inferred primitives.

---

## 1. What Paperclip IS (in 1 page, founder voice)

Per Paperclip Docs landing copy (line 13): "Paperclip is a **control plane for AI-run companies**. Hire agents, delegate tasks, approve the risky ones, and watch the work happen."

In our language: it is **an orchestration + governance layer that sits on top of the LLM substrate**, not an LLM substrate itself. The primitives surfaced in the docs index map roughly to:

| Paperclip primitive | What it appears to be |
|---|---|
| **Company** | The tenant — your "AI-run company" instance; org chart + delegation paths live inside one Company |
| **Agent** | A configured LLM worker bound to an Adapter (Claude, Codex, Gemini, or any HTTP service per line 101) |
| **Adapter** | The runtime bridge between an Agent and the underlying model API — 17 pages of reference suggest a serious plug-in protocol |
| **Issue** | The unit of work — agents claim issues, work them, return results (analogue to Linear ticket in our world) |
| **Approval** | The human-in-the-loop gate — risky/budgeted actions queue for operator approval before execution |
| **Cost** | First-class spend tracking — referenced in the API overview line ("companies, agents, issues, approvals, costs") and the "set monthly budget" how-to (line 65) |
| **Execution Policy** | Power-user rule layer governing what agents may do autonomously vs. what must escalate (line 51) |
| **Skill** | A reusable capability that can be installed and versioned (line 91, 1 page reference) — Anthropic-Agent-Skills-style mechanic, scope + install pipeline mentioned |
| **Plugin** | Third-party extension via a published Plugin SDK (line 113) — so Paperclip is positioned as platform, not closed product |
| **Activity log + Dashboard** | Day-to-day operational surface (line 27) |
| **Routine** | Recurring scheduled work (line 43 — "Projects, goals, routines, and execution workspaces") |

**Sweet spot:** an operator who wants a turnkey **dashboard + approval queue + budget cap + activity log + multi-agent org chart**, sitting on top of model-agnostic adapters, without writing any of it. Deployment options span laptop, Docker, server, with secrets + Tailscale support (line 117) — so it can run locally or self-hosted. Skills + plugins suggest extensibility ceiling is reasonably high.

**Blind spots (inferred — needs verification):**
- No surfaced doc on **prompt-cache discipline** — our Margot daily-briefing routine busts cache on every model swap (per [[pi-ceo-architecture]] §"Context Management") and Paperclip's adapter layer would need to preserve cache headers per provider.
- No surfaced doc on **per-agent context-firewall** (sub-agent-as-context-firewall pattern from Arize/Alyx). Our TAO model (Opus → Sonnet → Haiku) is already this; Paperclip's "agent" primitive may be a single-tier wrapper not a tier-stack.
- No surfaced doc on **headless / SDK / programmatic-from-CI** integration — there is a CLI (line 83, 4 pages) and an API (line 73, 15 pages), so this likely exists, but our integration depends on it.
- **Pricing is NOT surfaced** in the ingested clipping. Free? Paid SaaS? Open-source self-host? Unknown — see §8.

---

## 2. Where Paperclip fits in our existing stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 — SOURCES                                                       │
│   Brain-1 Wiki (~/2nd Brain) + Sources/                                 │
│   Brain-2 Wiki (~/Synthex-Brain-2)                                      │
│   ATIA / NRPG / CCPA / NIEPA founding-cohort intake (Q3 2026 →)         │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 — COMPUTE SUBSTRATE                                             │
│   • qwen3:14b (active, 8.6GB, 40K context — Mac Mini, free continuous)  │
│   • qwen3:30b-a3b-q4_K_M (pull in flight — promotion candidate)         │
│   • Claude Opus 4.7  (Orchestrator tier — paid premium)                 │
│   • Claude Sonnet 4.6 (Specialist tier — paid)                          │
│   • Claude Haiku 4.5  (Worker tier — paid cheap)                        │
│   • Gemini 2.5 Pro (grounded research — Margot deep-research server)    │
│   • Gemma 4 — REJECTED for Margot (hallucination + OOM, per             │
│     [[pi-ceo-architecture]]; usable for non-corpus-grounded local tasks)│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3 — AGENTIC ORCHESTRATION (our stack today)                       │
│   Margot (Telegram + ElevenLabs voice — qwen3 local)                    │
│       ↓                                                                 │
│   Pi-CEO Board (9-persona deliberation — Opus 4.7)                      │
│       ↓                                                                 │
│   Orchestrator (5-min cron) + Sentinel parser                           │
│       ↓                                                                 │
│   Tier-1 Senior PMs (7 — PM-ATIA + 6 vertical)                          │
│   Tier-2 Senior PMs (3 — Unite-Group + Synthex + Sales-Funnel)          │
│       ↓                                                                 │
│   25-agent Builder + Growth + Advisory tiers                            │
│   ┌──────────────────────────────────────┐                              │
│   │ fix_orchestrator + feature_orchestr. │                              │
│   │ Claude Code SDK (headless)           │                              │
│   │ Hermes computer_use (macOS GUI)      │                              │
│   └──────────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 4 — PAPERCLIP'S PROPOSED CONTRIBUTION                             │
│   IF adopted, Paperclip slots in as a **lightweight governance + UI     │
│   layer for HUMAN-FACING delegation surfaces only** — NOT a replacement │
│   for Pi-CEO Board or the Senior PM bots. Specifically:                 │
│                                                                         │
│   (a) Approval queue UI — visual "approve / block / revise / escalate"  │
│       for class-3 (external message) + class-4 (money/delete/merge)     │
│       actions. Currently we have Telegram approval prompts; Paperclip   │
│       gives a richer dashboard alternative.                             │
│   (b) Budget-cap surface — currently $1,200/mo cap is enforced in code; │
│       Paperclip's "set monthly budget" feature could expose per-agent / │
│       per-vertical caps without us writing it.                          │
│   (c) Activity log — currently scattered across Linear comments + the   │
│       Pi-CEO dashboard at dashboard-unite-group.vercel.app; Paperclip's │
│       dashboard could consolidate.                                      │
│   (d) Adapter layer — IF the adapter SDK is liberal, we wrap our        │
│       existing Margot+Board+PM bots as a "Paperclip-compatible Agent"   │
│       and the dashboard "just works" without re-architecting.           │
│                                                                         │
│   IF NOT adopted: we lose nothing — every primitive Paperclip exposes,  │
│   we already have a custom-built equivalent for. Paperclip is a         │
│   convenience layer, not a unique capability.                           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 5 — OUTPUTS                                                       │
│   Linear tickets (atia/* + 6 vertical projects + Pi-Dev-Ops)            │
│   GitHub PRs across 10+ repos                                           │
│   Wiki articles (Brain-1 + Brain-2)                                     │
│   Synthex public marketing assets (blog + social + video)               │
│   NotebookLM client deliverables (< 60s from meeting capture)           │
│   ATIA standards + CARSI cert content                                   │
│   Margot ElevenLabs voice replies (≤ 800 char, ≈ 60s audio)             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key reading of the diagram:** Paperclip is an **alternative governance/UI surface**, not a new layer. It does not unlock a capability we lack — it potentially replaces or duplicates parts of Layer 3 dashboard + approval-queue work that PM-Unite-Group already owns ([[pi-ceo-architecture]], [[unite-group-nexus-architecture]]).

---

## 3. Cross-cutting workstreams — does Paperclip add real lift?

### 3.1 Research (Senior Research Analyst pipeline)

**Current:** Margot deep-research MCP server + Gemini 2.5 Pro grounded + Brain-1 wiki reads-first.

**Does Paperclip extend this?** **Marginal at best.** Paperclip's primitives are orchestration + approvals + cost-tracking, not retrieval or grounding. Section titles in the docs index do not surface any retrieval / RAG / web-search / grounding primitive. Adapters could in theory wrap a Gemini-grounded call, but we already have that via the deep-research server.

**Verdict:** No lift here. Keep the existing Margot deep-research server.

### 3.2 Software Engineering (fix_orchestrator + feature_orchestrator + Claude Code SDK)

**Current:** Claude Code SDK invoked headless from `swarm/bots/builder.py` and the two orchestrators; PR #203 dedup invariants (per [[pi-ceo-architecture]] "Linear Ticket-Generation Invariants") prevent backlog flooding.

**Does Paperclip have a place?** **Tangential.** Paperclip's "Issue" primitive maps to Linear tickets — but we already use Linear directly via the Linear MCP connector. Paperclip would sit between us and Linear (or replace it), which is a downgrade — Linear is the contractor + insurance-partner + ATIA-cohort-tracking system of record by 2027, and we are not swapping it for a wrapper.

The one place Paperclip *could* contribute: the **approval queue + execution policy** for class-3/class-4 actions (per [[pi-ceo-architecture]] §"Context Management" — the LLM-as-judge gate planned for Wave 6). Today this is Telegram-prompt-based; a richer Paperclip approval UI is a real candidate. But cost-justifying that against our own dashboard work is the question.

**Verdict:** Engineering lane is already complete via Claude Code SDK + Linear + our orchestrators. Possible side-channel for approval UI (low priority).

### 3.3 Stack Building (provisioning new business platforms — Plumbing Q1 2027 from scratch)

**Current:** NodeJS-Starter-V1 template ([[pi-ceo-architecture]] §"NodeJS Starter V1") + Pi-CEO bootstrap skills. Greenfield repo creation is one-prompt-and-go.

**Does Paperclip slot in?** **Possibly useful as the per-vertical operator dashboard.** When PM-Plumbing scaffolds the Plumbing sub-body, each vertical needs its own operator-facing surface (founding-member intake, cert tracking, insurance liaison). Paperclip could be the "Plumbing Company" tenant inside one Paperclip instance — separate org charts, separate budgets, separate approval queues per vertical, all sharing one underlying control plane. This is *closer* to a real Paperclip use case than Research or Engineering.

**Verdict:** **Highest-genuine-fit workstream**, but blocked on Q1 2027 timing — Phill should not commit to Paperclip integration before the Plumbing scaffold conversation starts. Mark this for re-evaluation in Q4 2026.

### 3.4 UI/UX (design assets, component libraries, brand pattern systems)

**Current:** Synthex packages/brand-config + Remotion + brand-guardian + Margot pairing.

**Does Paperclip help?** **No.** Nothing in the docs index surfaces a design or generative-image primitive. Adapters could wrap an image-gen API but we have Margot image_generate already. This lane is closed.

**Verdict:** No lift.

### 3.5 SEO / AEO / GEO

**Current:** Marketing Brain ([[marketing-brain-system]]) — Obsidian + Claude Code SEO skill + DataForSEO + FLOW framework + ULTIMATE BEAST plan + cannibalisation ledger. Already running for CCW. Reads Brain-1 wiki first.

**Does Paperclip score for AEO (Answer Engine Optimization) or GEO (Generative Engine Optimization)?** **The docs index does not surface this.** Section titles cover orchestration, agents, issues, approvals — not content-scoring or LLM-search-positioning. Adapters could wrap an AEO-scoring service, but Marketing Brain already does this via Claude Code + DataForSEO without Paperclip in the loop.

**Critical reading:** Marketing Brain is **directly competitive with Paperclip in our use case**. Both are "Obsidian + Claude Code + a methodology stack." Marketing Brain owns the SEO/AEO/GEO lane; Paperclip owns the agent-governance lane. They could co-exist (Paperclip orchestrates *when* Marketing Brain runs, Marketing Brain produces the deliverable) but the seam is thin.

**Verdict:** Marketing Brain stays the SEO/AEO/GEO surface. Paperclip is not a substitute. Possible co-existence pattern: Paperclip routine triggers a Marketing Brain run weekly per active vertical.

### 3.6 Blog Posts (long-form content at Synthex)

**Current:** PM-Synthex + brand-guardian + Marketing Brain + claude-blog companion skill (referenced in [[marketing-brain-system]] line 67). Pipeline: Brain-1 wiki idea → Marketing Brain BEAST plan → claude-blog drafts → brand-guardian gate → Synthex publish.

**Does Paperclip add to this pipeline?** **Approval gating, yes. Generation, no.** A Paperclip approval queue could surface "draft ready for Phill review" more cleanly than the current Linear-comment approach. But the generation pipeline is already done — claude-blog produces "fantastic pages" per the source video transcript (`Marketing Brain My AI SEO System Walkthrough` line 166).

**Verdict:** Minor governance lift. Not foundational.

### 3.7 Magazine Articles (longer-form vertical-specific content — e.g. Restoration Industry Quarterly)

**Current:** Phill's IAQ Magazine Australia editorial committee seat ([[restoration-industry-context]] §11.1); Coutis-led editorial planned. Generation pipeline same as blog posts but with stricter E.E.A.T graded gate.

**Does Paperclip add to this?** **Same as blog posts — governance only.** E.E.A.T grading is a brand-guardian + Phill-personal-gate concern, not an orchestration concern.

**Verdict:** Same as 3.6. Minor lift.

### 3.8 Research Papers (original cert-pathway research for CARSI)

**Current:** Phill personally authors S500 + S520 syllabi by 30 Sep 2026 ([[master-plan-2b-by-2028-v3]] §7 Fork 6). Future certs delivered by contracted IICRC instructors with brand-guardian + peer review.

**Does Paperclip add to this?** **No.** Cert syllabus authorship is a Phill-personal-IP-creation task, not an orchestrated-agent task. The peer-review gate is human (industry instructor review), not a Paperclip approval queue.

**Verdict:** No lift. This lane stays Phill + contracted instructors.

### 3.9 Community Building (NRPG / CCPA / NIEPA member engagement, forum moderation)

**Current:** Member-facing portal vision under [[unite-hub-vision]]; CCW-CRM is the production analogue today; NRPG founding-cohort intake in flight.

**Does Paperclip help with the relational side?** **Marginal.** A Paperclip "Company" per vertical could expose a member-facing dashboard, but member-facing surfaces are *product*, not internal operator tooling — and Paperclip is positioned as an operator/admin control plane (line 13: "control plane for AI-run companies"). Surfacing it to members would be a misfit. The internal-side (member-engagement orchestration: who needs CPD renewal nudge, whose certification lapses next quarter) is a candidate for Paperclip routines.

**Verdict:** Possible Q4 2026+ fit as the per-vertical operator dashboard for community management. Same Q1 2027 re-evaluation window as 3.3 Stack Building.

### 3.10 Anything else surfaced in the docs

- **Plugin SDK (line 113)** — open extension surface. We could ship a Pi-CEO Paperclip plugin that exposes our Linear-aware swarm as a Paperclip Adapter. Two-way street.
- **Tailscale + secrets in deployment (line 117)** — interesting for self-host story; aligns with our "local-first, Mac Mini continuous loop" thesis.
- **Skills (line 91, 1 page reference)** — Anthropic-Agent-Skills-style mechanic with install pipeline + versioning + troubleshooting. If Paperclip Skills are import-compatible with Claude Code Skills, we get a single skill set across both surfaces (low effort). If they are a new format, that's a fragmentation cost.

---

## 4. Specific Paperclip features mapped to our priorities

| Paperclip feature | Pi-CEO mapping | First production use case | Effort to integrate |
|---|---|---|---|
| **Company tenant** | One Paperclip Company per vertical sub-body (ATIA / NRPG / CCPA / NIEPA / NPPA / NHPA / NPWPA) — 7 tenants | Q1 2027 — when PM-Plumbing scaffolds | Medium — depends on adapter SDK |
| **Agent + Adapter** | Wrap our existing Margot + Senior PM bots as Paperclip Agents (HTTP-service adapter per line 101) | Stub adapter for PM-ATIA first (lowest blast radius) | Medium — need adapter SDK details we don't have |
| **Issue (work unit)** | Mirror to Linear ticket via webhook — Linear stays system of record, Paperclip is read-replica | Pi-CEO Board deliberations published to Paperclip dashboard | Medium |
| **Approval queue** | Class-3 + class-4 actions queue here instead of (or in addition to) Telegram | Wave 6 LLM-as-judge gate ([[pi-ceo-architecture]] §"Context Management") | High — touches every external-action call site |
| **Budget cap** | Per-agent spend ceiling — currently $1,200/mo all-in cap is global ([[master-plan-2b-by-2028-v3]] §4.2) | Per-vertical paid-tier budget exposed in CEO surface | Low — wraps existing cost-tracking |
| **Execution Policy** | Power-user rule set governing autonomy boundaries — likely overlaps with our existing severity rubric (PR #203 dedup invariants) | Codify the four-rule dedup invariants as Paperclip Execution Policy | Medium |
| **Skill** | Reusable capability with install + versioning | If import-compatible with Anthropic Agent Skills, low effort; if not, do not invest | Unknown — needs verification |
| **Plugin SDK** | We ship a Pi-CEO plugin exposing our swarm as an Adapter; Paperclip ships a plugin exposing itself as an MCP server in our world | Two-way bridge | High — only worth it if Paperclip adoption is locked in |
| **CLI (4 pages)** | Operator CLI for local control plane setup; possible Mac Mini hosting fit | Replace some bash glue scripts in `~/.hermes/scripts/` if CLI is robust | Low — CLI evaluation only |
| **Deployment: laptop / Docker / server + Tailscale (line 117)** | Mac Mini self-host candidate; pairs with our existing Tailscale + Hermes loop | Self-host on Mac Mini to keep continuous-loop $0 budget intact | Low — well-trod path |

**Honest reading of this table:** roughly half the rows are "depends on adapter SDK we don't have details on." Until we have the actual adapter-protocol shape (an HTTP webhook? a Python class? a JSON-RPC service?) the integration effort is speculative. **This is the biggest reason to commission a second-pass ingest before engineering commits.**

---

## 5. Integration architecture — proposed (conditional)

**Pre-condition:** Phill ratifies Paperclip adoption AND a Margot deep-research pass produces concrete adapter-SDK + plugin-SDK + pricing data.

**If adopted:**

- **Module path:** `swarm/integrations/paperclip.py` — single-file adapter that exposes our Margot + Board + Senior PM bots to a Paperclip Company tenant.
- **Auth model:** API key stored in `~/.hermes/.env` as `PAPERCLIP_API_KEY` (1Password item to follow the existing convention — see memory `reference_1password_index`).
- **Sync vs async invocation:** Async — Paperclip pushes Issue events via webhook to a new FastAPI route `/api/webhooks/paperclip` on the Pi-CEO backend (Railway). The route enqueues a swarm task and returns 202. Polling-mode optional fallback if webhooks are unreliable.
- **Caching strategy:** Paperclip caches its own state; we cache nothing locally — Linear remains system of record. Read-through pattern: any Paperclip Issue lookup hits the Linear MCP first, falls back to Paperclip API only for Paperclip-native fields (approval state, budget consumption).
- **Error handling:** Three failure modes — (1) Paperclip API down → fail-open to direct Linear (current behaviour, zero degradation); (2) approval queue stale > 1 hour → Telegram fallback alert to Phill; (3) budget cap hit → block + Telegram critical alert.
- **Tests:** Contract tests against Paperclip API mock fixtures (need real API access first); end-to-end test loops one tenant ATIA Company through claim → execute → approval → close.
- **Owner:** **PM-Unite-Group** — Paperclip lives inside operator tooling, and PM-Unite-Group owns operator tooling per [[master-plan-2b-by-2028-v3]] §5.2.1.

**If NOT adopted:** zero integration effort. Existing stack continues. We re-evaluate quarterly via the Margot scout signal.

---

## 6. Risks & honest limitations

1. **Inferred-not-verified primitives.** The whole architecture above is inferred from section titles. Every concrete behavioural claim must be verified before engineering effort. **Highest risk.**
2. **Duplication of work PM-Unite-Group already owns.** Dashboard, approval queue, budget cap, activity log — these are scoped to the CEO surface ([[unite-group-nexus-architecture]]). Adopting Paperclip means deciding *not* to build (or to throw away) parts of that work. The opposite is also true — building our own means abandoning Paperclip. The "have both" path is the most expensive and least defensible.
3. **Linear remains system of record.** Any tool that wants to be the work-tracking surface competes with Linear. We will not migrate. Paperclip must integrate downstream of Linear, not replace it.
4. **Pricing unknown.** Until we see the pricing tier (free? $20/mo? $500/mo per Company? per Agent?) we cannot cost-justify against the $1,200/mo cap. **See §8.**
5. **Cache discipline cost.** Per [[pi-ceo-architecture]] §"Context Management" — Margot's prompt-cache discipline is fragile. Routing through a Paperclip adapter layer adds a hop that may bust caches we currently preserve.
6. **Self-host operational burden.** Mac Mini already runs qwen3 continuous + 27 Hermes cron jobs + Margot + ElevenLabs. Adding Paperclip server + Docker daemon may exceed the 24GB RAM ceiling (already at the edge — see qwen3:14b vs Llama 3.3 70B note in [[pi-ceo-architecture]] §"Margot Model Selection"). Mac Mini RAM upgrade is an open question in [[master-plan-2b-by-2028-v3]] §8.
7. **Single-vendor dependency.** Paperclip is a private startup (no funding / runway / status visible from the docs index). If they pivot or shut down, we have built integration against a dead surface. Mitigation: keep adoption thin (governance UI only, not work-tracking) so removal costs are bounded to one Python module.
8. **"Hire agents, delegate tasks" framing collides with our $2B thesis.** Per [[master-plan-2b-by-2028-v3]] operating filter #4: "AGENTS EXECUTE — Phill = think tank; swarm owns execution." Paperclip is positioned at exactly this seam and could either reinforce it (cleaner UI for delegation) or fragment it (Phill ends up with two delegation surfaces — Telegram + Paperclip). Founder-fit risk if voice/Telegram-first remains the canonical interface.

---

## 7. Cost analysis

**Pricing is NOT surfaced in the ingested clipping** — the docs landing page does not mention price, and there is no "Pricing" or "Billing" section title in lines 11–121. Estimates below are scenario-based.

| Scenario | Likely monthly cost | Fit with $1,200/mo paid-tier cap |
|---|---|---|
| Free + self-host (Docker / Mac Mini per line 117) | $0 + ops time | Fits — no API cost; trades $ for Mac Mini RAM headroom |
| SaaS — operator-tier (~$30–$50 /mo) | $30–$50 | Fits comfortably |
| SaaS — team-tier (~$200–$400 /mo) | $200–$400 | Fits but burns 20–35% of the cap on a UI layer |
| SaaS — enterprise / per-Agent ($50/Agent/mo × 8 Tier-1 PMs = $400/mo) | $400 | Fits but uncomfortably — equivalent to a junior contractor seat |
| Per-Issue or per-task pricing (any usage-based model) | Unknown — could be $0–$2k/mo depending on Linear ticket velocity | High risk — Pi-CEO Board generates 5–50 tickets/day; usage pricing could scale fast |

**Current Claude API spend:** capped at $1,200/mo all-in ([[master-plan-2b-by-2028-v3]] §4.2). Ollama local compute is $0. Free + self-host is the only Paperclip scenario that is unambiguously cost-neutral.

**Recommendation:** Margot deep-research must surface pricing as the **first** verification item before any other Paperclip work. If pricing is hostile (>$200/mo or per-issue scaling) the integration is not worth pursuing — our own dashboard at PM-Unite-Group already covers the use case.

---

## 8. What we DO NOT yet know from the Paperclip docs

Explicit gaps. The ingested clipping is the docs **index only**; everything below requires a second-pass research run before commitments are made.

1. **Pricing model** — free? SaaS tiers? Per-Agent? Per-Issue? Self-host licence?
2. **Adapter SDK shape** — HTTP webhook? Python class? JSON-RPC? OpenAPI? gRPC?
3. **Plugin SDK shape** — language? sandbox model? marketplace?
4. **Skill format** — import-compatible with Anthropic Agent Skills or new format?
5. **Approval queue protocol** — UI-only or programmatic-API for our LLM-as-judge gate (Wave 6) to consume?
6. **Budget cap granularity** — per-Company / per-Agent / per-Issue?
7. **Execution Policy expressiveness** — simple rules or full DSL?
8. **Multi-tenant isolation** — true Company-level isolation (RLS, separate datastores) or single-database multi-tenancy?
9. **Self-host operational footprint** — RAM / CPU / disk requirements on Mac Mini?
10. **Tailscale integration depth** — built-in or DIY?
11. **CLI capabilities** — operator-only or programmatic-from-CI?
12. **Activity log retention + export** — does data ever leave Paperclip, or do we get vendor lock-in?
13. **Founder + funding signal** — who runs Paperclip? VC-backed? Solo founder? Risk of disappearance?
14. **Comparable users** — case studies? Who else uses Paperclip in production?
15. **Roadmap visibility** — is this product mature or rapidly changing under our feet?

This list is the input to the second-pass ingest. Margot deep-research should crawl https://docs.paperclip.ing/#/ and produce a 1-page answer to all 15 questions before the Board deliberates a build decision.

---

## 9. Verdict — current recommendation (pre-Board)

**Conditional adoption, lowest-risk path:**

1. **Step 1 (this week):** Margot deep-research pass on https://docs.paperclip.ing/ — answers §8's 15 questions. Cost: ~$5–$10 Gemini grounded.
2. **Step 2 (after Step 1):** if pricing is **free + self-host** OR **operator-tier ≤$50/mo**, proceed to a thin proof-of-concept — one Paperclip Company tenant for ATIA-meta, wrapping PM-ATIA as a single Paperclip Agent via HTTP adapter. If pricing is hostile, **STOP**, mark Paperclip as "watch list — re-evaluate quarterly."
3. **Step 3 (Q4 2026):** if POC successful, expand to a Paperclip Company per active vertical (NRPG + CCPA + NIEPA) as the per-vertical operator dashboard.
4. **Step 4 (Q1 2027):** evaluate continuing Paperclip vs. extending PM-Unite-Group's own dashboard as the per-vertical surface — the decision should be one or the other, not both.

**Founder-voice summary:** Paperclip is an interesting orchestration + governance UI for someone who hasn't already built one. We have already built one (Pi-CEO + dashboard + Margot + approval-via-Telegram). The integration is worth a Margot research hour and a Phill 15-minute read, but it is **not** the leverage point that gets us to $2B. The leverage points are the ATIA + 6 vertical sub-bodies + CARSI delivery. Paperclip is convenience; ATIA is product. Don't confuse the two.

---

## 10. Cross-refs

[[pi-ceo-architecture]] · [[marketing-brain-system]] · [[master-plan-2b-by-2028-v3]] · [[unite-group-nexus-architecture]] · [[agent-memory-patterns]] · [[agency-hierarchy]] · [[claude-code-guide]] · [[gemma4-cost-strategy]] · [[hermes-agent]] · [[wave-roadmap]] · [[mcp-ecosystem]] · [[autonomous-sdlc]]
