# Unite-Group Nexus → A Self-Improving Software-Engineering Company

**Architecture blueprint · Board-grade · 2026-06-30**
**Author: Chief Architect (synthesised by a 12-agent research swarm)**

> **STATUS: DRAFT — adversarially reviewed, verdict `NEEDS_FIXES`.**
> The synthesis below is grounded in a 12-agent research swarm (5 OpenShell recon
> specialists, 3 model-landscape, 2 Nexus-state, 1 synthesis, 1 adversary).
> A ruthless adversarial pass found real defects — see **§11 Adversarial Review**.
> Treat §1–§10 as the proposed direction; treat §11 as the binding correction set
> that must be applied before any of this is funded or built. Where §11 contradicts
> §1–§10, §11 wins.

---

## 1. Executive summary

We are turning Nexus from a twice-weekly, human-gated, single-machine improvement loop into a **standing engineering company**: ~100 senior-grade autonomous agents, each carrying 6–8 specialised skills, continuously researching, building, reviewing, shipping, and re-tooling themselves — on the latest models, at near-zero marginal cost, exceeding what a human team of the same size could produce.

The keystone is **NVIDIA OpenShell**. Not because it orchestrates anything — it explicitly does not — but because it solves the one problem that otherwise blocks 100 autonomous agents from ever being safe enough to run unattended: **secure, policy-enforced execution with credentials the agent never holds.** OpenShell is the execution substrate (the bottom 1–2 layers). Everything that makes us a *company* — orchestration, planning, memory, model-routing, QA gates, observability, the self-improvement loop — we already half-own in Nexus and must finish building *above* the sandbox (Finding 5: OpenShell "deliberately declares multi-agent orchestration, planning, memory, model/cost routing, evaluation… OUT of scope").

The economic insight that makes 100 agents viable: our LLM substrate is **flat-rate, not metered**. Three Claude Max plans plus one OpenAI Max are OAuth capacity whose true cost is rate-limit consumption, not dollars (Finding 7). At scale the marginal cost of reasoning approaches zero, and cost *falls* per unit of work as we push low-stakes chatter onto free open models to protect the Max ceiling. This inverts the usual "more agents = more spend" curve. **[§11 disputes this — true only below the rate ceiling; see Adversarial Review.]**

One hard truth up front: **OpenShell is alpha, "single-player mode," with no published benchmarks, no third-party audit, and no shipped multi-tenant gateway** (Findings 1, 2, 4, 5). We adopt it as an *evaluation substrate for our own isolated dev agents first* — not as a production multi-client control plane. The blueprint is staged accordingly.

---

## 2. What NVIDIA OpenShell actually is — and what it gives us

OpenShell (github.com/NVIDIA/OpenShell, Apache-2.0, ~7.3k stars, ~90% Rust, alpha) is **the safe, private runtime for autonomous AI agents** (Finding 1, 2). It is *not* an agent framework and *not* a hosted execution sandbox like E2B/Daytona/Modal (Finding 4). It **wraps unmodified coding agents** — Claude Code, Codex, Copilot CLI, OpenCode — and governs them inside policy-enforced sandboxes. That distinction is the whole point: we keep our agents and brain; OpenShell gives them a cage.

**The three stable runtime components** (Finding 1):
- **CLI/SDK/TUI** — the user/operator surface.
- **Gateway** — authenticated gRPC/HTTP control plane, SQLite (local) or Postgres (HA), stores policy + credentials. Critically, it is *supervisor-initiated*: each sandbox dials **out** to the gateway and the gateway never dials sandbox IPs (Finding 1). Good for running agents behind NAT / on the Mac Mini.
- **Supervisor** (`openshell-sandbox`) — the in-workload security boundary. Starts as root, prepares isolation, then drops to an unprivileged child.

**What it actually gives us — four things, grounded:**

1. **Per-agent isolation across four enforcement layers** — filesystem (Landlock LSM), process (seccomp + privilege drop), network (deny-by-default L4/L7 CONNECT proxy + in-process OPA), inference (credential-isolating router). Filesystem/process lock at sandbox creation; network/inference hot-reload (Findings 1, 2).

2. **Credentials the agent never holds.** Keys are stored at the gateway as named bundles and injected as **runtime environment variables only — never written to the sandbox filesystem** (Findings 1, 2, 5). This directly answers our recurring secret-leak incidents (RA-2989 rotation, secrets-in-tracked-docs).

3. **The Privacy Router (`inference.local`).** Agent inference is intercepted: the proxy terminates TLS with an ephemeral per-sandbox CA, **strips the caller's credentials**, and forwards through `openshell-router` to a managed backend using a gateway route bundle. *"The agent never receives the provider API key"* (Findings 1, 2, 3). It is provider-agnostic — OpenAI-compatible, Anthropic, Bedrock SigV4, Vertex, local/Ollama, keyed off model prefixes (Finding 3). **[§11: documented for API-KEY bundles, NOT subscription-OAuth — unverified for our Max path.]**

4. **MCP governed method-by-method.** MCP is a first-class L7 policy protocol (`protocol: mcp`, `tools/call` name/param filtering) — OpenShell *governs* MCP egress, it is not itself an MCP server (Finding 3). This lets us policy-gate every connector call an agent makes.

Two patterns worth stealing even if we never fully adopt OpenShell: the **Z3-prover-gated policy advisor** (agent proposes a narrow egress rule; the `openshell-prover` blocks it if it would expand credential/capability reach — Findings 1, 2), and **OCSF structured audit logging with hard "never log secrets" rules** (Findings 1, 2).

**What it explicitly does NOT give us** (Finding 5, confirmed by the bundled `multi-agent-notepad` example where orchestration is a bash script and shared state is a GitHub repo): no orchestrator, planner, memory, scheduler, task queue, eval/QA gate, cost router, or agent-level observability. Its "router" routes for *privacy*, not cost. Its logs are *security audit* events, not reasoning/token/eval telemetry.

---

## 3. The current Nexus position — honest baseline

We are further along than a greenfield, and further behind than the marketing. The honest baseline from the findings:

**What works today:**
- A real, batch-mode, human-gated self-improvement loop. Two LaunchAgents on the Mac Mini: `data_ingestion.sh` (Tue/Fri 09:00 — mines session digests, refreshes 77 OKF vault indexes) and `improve_system.py` (Tue/Fri 18:00 — deterministic vault scan, emits graded checkbox proposals). Last run: **247 proposals, 62 need-signoff, 185 more-context, 0 auto-applied** (Finding 8).
- A mature skills library — pm-core, qa-lead, production-gate, opus-adversary, brand-guardian, the marketing/SEO/video packs — already pinned to sensible tiers (Sonnet 4.6 for senior agents).
- A tiered model router in code: `provider_router.py` ROLE_TIER mapping, `TAO_CHEAP_PROVIDER=openrouter`, new role = one env var `TAO_MODEL_<ROLE>` (Findings 6, 7).
- A live model substrate: 3 Claude Max plans (#1 and #2 wired, #3 token-pending) + OpenAI Max (Finding 6).

**What is broken or skeletal (the honest part):**
- **No automatic signal capture.** The RA-1745 design expects five `.harness/learning/*.jsonl` logs feeding weekly distillation — **all five are empty**; capture hooks "ship separately" and never shipped (Finding 8). The populated signal lives in an *older, unreconciled* single-file loop (`.harness/lessons.jsonl`, RA-552, 56 entries). Two generations of the loop coexist and disagree on schema, path, and schedule.
- **Cloud distillation engine not deployed.** Migration `177_knowledge_distillation_engine.sql` exists only in `migrations_backup/` — absent from active migrations (Finding 8).
- **Supabase sync broken** — stage 3/3 fails with "no service key," so learnings never reach the corpus Margot/inference reads (Finding 8).
- **Not always-on.** Twice-weekly, single-machine, dies if the Mac is asleep. **Auto-apply is OFF — 0/247 proposals self-apply.** A human ticks boxes.
- **The #1 blocker for everything:** the long-lived Max service token (`CLAUDE_CODE_OAUTH_TOKEN`) is **not provisioned** in `~/.hermes/.env`. The keychain token auto-rotates same-day. **Without it, no autonomous fleet can run on Max at all** — agents silently fall back to the dead, out-of-credit `sk-ant-api03` pool (Findings 6, 7, 8).

Net: we have the *parts* of a company brain, wired half-way, gated by a human, on one machine, blocked on one token.

---

## 4. The gap map — today → the 100-agent company

Layered, with the source finding for each gap. OpenShell fills the bottom two rows; everything above is ours to build.

| Layer | What the 100-agent company needs | Where we are | Source |
|---|---|---|---|
| **Runtime / execution** | Per-agent sandbox isolation, egress control, creds-off-disk, inference mediation | **OpenShell provides this** (alpha; pilot-scale only) | F1, F2, F5 |
| **Orchestration** | Scheduler, supervisor-of-agents, role/team model, work intake, handoffs, stall detection, contention resolution | No orchestrator exists in OpenShell; Nexus has LaunchAgents + Linear, no fleet orchestrator | F3, F5 |
| **Memory** | Persistent cross-session store, vector index, queryable corpus, knowledge base | Supabase + OKF/wiki exist but **sync broken**; distillation table not deployed | F5, F8 |
| **Self-improvement** | Event-driven signal capture, distillation, safe auto-apply, reward/feedback measurement | Batch, human-gated, 0 auto-apply; capture hooks never shipped; two unreconciled loops | F8 |
| **Model-routing** | Tiered dispatch by stakes×volume×latency; protect Max budget; spillover to cheap/free | Code seam exists (`provider_router.py`); only free Llama + local Gemma wired; **no Max service token** | F6, F7 |
| **QA gates** | Pass/fail rubric, test gate, PR-quality gate, regression eval, adversarial review | Skills exist (qa-lead, production-gate, opus-adversary) but not wired as mandatory fleet gates | F5 |
| **Observability** | Token/cost telemetry, eval scores, task success rates, per-agent throughput/latency | OpenShell gives **OCSF security audit only**; no agent-level metrics anywhere | F5, F8 |

The pattern is consistent: **OpenShell hardens the floor; the company is everything above the floor, and most of it is half-built in Nexus already.**

---

## 5. Target architecture — OpenShell as substrate, Nexus as the company above it

**Clean integration boundary (Finding 5's recommendation, adopted):** keep the orchestrator, memory, router, and eval gates **OUTSIDE the sandbox**. The Nexus orchestrator calls the OpenShell **gateway** (gRPC, generated from `proto/openshell.proto`: `CreateSandbox`, `ExecSandboxInteractive`, `WatchSandbox`, `AttachSandboxProvider`, `ApproveDraftChunk`) to spawn/destroy per-agent sandboxes and set policy (Finding 3). Agents run *inside*; the brain runs *outside*.

```
┌─────────────────────────────────────────────────────────────┐
│  NEXUS COMPANY BRAIN (outside the sandbox — we own/build)     │
│                                                               │
│  Orchestration plane ── Task queue (Linear + durable queue)   │
│       │                                                       │
│       ├── Planner / decomposer (goal → DAG → squad assign)    │
│       ├── Model-cost router (provider_router.py, extended)    │
│       ├── Memory (Supabase + OKF/wiki + vector corpus)        │
│       ├── QA gates (qa-lead, production-gate, opus-adversary)  │
│       ├── Self-improvement loop (capture → distil → auto-apply)│
│       └── Agent-level observability (token/cost/eval/throughput)│
│                          │ gRPC                                │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  OPENSHELL GATEWAY (supervisor-initiated control plane)       │
│   credentials store · policy store · route bundles            │
└──────────────────────────┬───────────────────────────────────┘
                           ▼  (one sandbox per agent)
┌─────────────────────────────────────────────────────────────┐
│  SANDBOX  (Docker/Podman on Mac Mini; K8s/microVM later)      │
│   Supervisor (root → drops priv) │ Landlock+seccomp+netns     │
│   Agent child (Claude Code / pm-core skill)  ── unprivileged  │
│   egress → deny-by-default OPA proxy → inference.local        │
│            (creds stripped, routed via openshell-router)      │
└─────────────────────────────────────────────────────────────┘
```

**Why this mapping is correct, by name from the findings:**

- **Credential planes** — our two-plane problem (Hermes local 107 vars vs Vercel prod 65 vars) collapses into OpenShell's provider bundles: keys at the gateway, injected as env, never on disk, stripped before forwarding (Findings 1, 2, 3). This structurally prevents the agent reading a raw key — the root cause behind RA-2989. **[§11: only verified for API-key bundles; our live credential is subscription OAuth — confirm compatibility first.]**
- **inference.local** routes through `openshell-router` to **whatever backend the route bundle names** — so our Max OAuth substrate, OpenRouter, and local Ollama all sit behind one mediated endpoint instead of per-agent key wiring (Findings 1, 3, 6). **[§11 flags this as a hallucinated claim — gate on a spike.]**
- **MCP governance** — every connector call (Linear, GitHub, Slack) from an agent is policy-gated method-by-method (`tools/call` param matchers), giving us the connector-routing trust boundary we keep needing (Finding 3).
- **Compute drivers** — Docker/Podman locally on the Mac Mini today; Kubernetes/microVM later without changing the policy or credential model (Finding 1). Fits the two-machine split (RestoreAssist = Mac Mini; DR/NRPG = Windows).

**What we do NOT delegate to OpenShell:** cost/model selection (its router is privacy-only — Finding 5), orchestration, memory, eval. Those stay in Nexus/Hermes/AI-Gateway.

---

## 6. The agent fleet model — ~100 senior agents, 6–8 skills each

**Org shape: divisions → squads → agents.** Each agent is a sandboxed Claude Code instance loaded with a *role bundle* of 6–8 skills drawn from our existing library (this is the load-bearing reuse — we already have ~28+ skills).

> **[§11 capacity correction — read before sizing.]** The division table below is the
> *target shape*, NOT a fundable plan on the current substrate. The adversary shows
> ~25 Opus-tier + ~60 Sonnet-tier *continuous* agents demand ~4–5× the weekly capacity
> three Max plans supply. Treat this as the org chart to grow into; the **fundable
> pilot is 5–10 agents** (see §11 required fixes 2–3).

**Divisions (≈100 agents total — aspirational target):**

| Division | Agents | Skill bundle (from existing library) | Default tier |
|---|---|---|---|
| **Build** (implementation) | ~35 | pm-core, production-gate, supabase, vercel:*, systematic-debugging, test-driven-development, code-review, verify | Sonnet 4.6 |
| **Quality/Adversary** | ~15 | qa-lead, opus-adversary, design-pressure-test, security-review, curator-security, verification-before-completion | Opus 4.8 |
| **Research/R&D** | ~15 | deep-research, source-ingest, evidence-board, seo, grill-with-docs | Mixed (free tier + Sonnet) |
| **Marketing/Content** | ~15 | marketing-orchestrator + sub-skills, brand-guardian, video-director, seo-content | Sonnet 4.6 |
| **Ops/Deploy** | ~10 | curator-deployment, vercel-prod-debug, curator-scheduled-tasks, connector-routing | Sonnet 4.6 |
| **Self-improvement** | ~5 | data-ingestion, improve-system, wiki-ingest, margot-align | Opus 4.8 |
| **Orchestration/PM** | ~5 | ceo-board, marketing-campaign-planner, parallel-delegate, session-handoff | Opus 4.8 |

**Spawning:** the orchestrator claims a unit of work from the queue (Linear ticket or durable queue lease), selects the division/role, calls `CreateSandbox` on the OpenShell gateway with the role's policy + provider bundle, and execs the agent CLI with its skill bundle pre-loaded. On completion the sandbox is destroyed — ephemeral by default.

**Coordination — heed the explicit warning (Finding 3, 5):** OpenShell's only native multi-agent story is "host script + GitHub repo as shared notepad," which is exactly our known *"parallel agents shared output collision"* failure mode. So coordination is a **first-class Nexus responsibility**, not papered over with shell scripts:
- **Work intake/arbitration:** durable queue with idempotent claim/lease semantics; Linear as the human-facing backlog.
- **Shared state:** Supabase corpus (not a GitHub notepad) — and **unique-artifact discipline enforced** (every parallel agent writes a uniquely-named output; this is a standing lesson, not optional).
- **Handoffs:** session-handoff / resume-from-handoff skills carry context between agents.

**"Senior-grade"** is enforced by the QA division and gates (§7's QA layer), not assumed from the model.

---

## 7. Model & cost strategy — flat-rate Max + cheap open models

> **[§11: the headline "cost falls with scale" is only true below the Max rate ceiling.
> Beyond a small pilot, more agents = more spend or less throughput. The tiering below
> is sound; the unbounded-scale economics are not. Resolve the open questions before
> committing ratios.]**

The core insight (Finding 7): **inside a Max plan the marginal per-token dollar cost is ~zero.** The scarce resource is **Max rate-limit budget** (5-hour rolling + two weekly caps per account), not money. So cost reduction is about minimising Max rate-limit consumption and metered-lane dollars — *not* model price.

**Tiered dispatcher, keyed on (stakes × volume × latency-tolerance):**

| Tier | Workload | Route | Why |
|---|---|---|---|
| **0** | High-volume, low-stakes: intent classification, routing, health/monitor cycles, dedup, label parsing | **OpenRouter FREE** (Llama 3.3 70B, Qwen3 Coder, GPT-OSS 120B, Gemma 4) + local Ollama Gemma overflow | $0/token; **biggest Max-budget protector** — keeps fleet chatter OFF the Max ceiling (F6, F7) |
| **1** | Routine senior work: PR implementation, content, QA gating, SEO reports | **Sonnet 4.6 on the Max pool**, effort low/med | Marginal $0 within rate limits; set effort explicitly (defaults high) to cut token-throughput (F7) |
| **2** | Workhorse reasoning, orchestration, long-horizon agentic, adversarial review | **Opus 4.8 on the Max pool**, effort high/xhigh | Mandated workhorse; opus-adversary review costs nothing extra on Max (F6, F7) |
| **3** | Precision-only highest-stakes one-offs | **Codex / OpenAI Max via CLI** | **NEVER in the loop or per-PR gate** — founder mandate (F6, F7) |
| **Spillover** | Async-tolerant bulk: overnight content, bulk classification | **Batch API, 50% off** (UNVERIFIED on Max OAuth path — F7) | Don't burn interactive Max budget on async work (F7) |

**Cross-cutting levers (F7):**
- **Prompt caching:** freeze a shared system-prompt + deterministic tool-list prefix across the fleet; every agent reads the prefix at ~0.1× and consumes far fewer tokens against the rate-limit ceiling. **Cache is account-scoped** — pin cache-heavy shared-prefix workloads to ONE Max account. **[§11: caching on the Max OAuth path is UNVERIFIED — confirm before relying on it.]**
- **Effort dial:** Tier 0/1 low/med, Tier 2 high, `max` only for correctness-critical.
- **Pool the 3 Max tokens** for raw throughput (round-robin to multiply the ceiling) — but keep identity-bound flows (Gmail/Drive/Chrome) on the single designated account. **[§11: per-account vs per-org pooling is UNVERIFIED.]**

**Hard constraints, restated:** Anthropic-first holds. Do **not** introduce Codex or paid OpenRouter models into autonomous loops. **Treat Fable 5 / Mythos 5 as UNREACHABLE** — the 2026-06-12 US export-control directive disabled them for foreign nationals; Unite-Group is Australian, so **Opus 4.8 is the de-facto top tier**. Audit all skill frontmatter / env pins for `claude-fable-5` and repin to `claude-opus-4-8` (Finding 6).

---

## 8. The continuous R&D / self-improvement loop — staying 1st-in-class

This is the difference between a fleet and a *self-improving* company. Today's loop is batch, human-gated, 0/247 auto-applied, with empty capture logs (Finding 8). The target loop is event-driven and closed.

1. **Capture (fix the empty logs).** Ship the RA-1745 capture hooks so signal is appended *during* inference, not mined twice a week: adversary disagreements, CI failures, user corrections, false positives, incident postmortems. Reconcile the two generations onto ONE canonical schema/path (the populated `lessons.jsonl`/RA-552 design is the pragmatic start) and point both `analyse_lessons.py` and `improve_system.py` at it (Finding 8).
2. **Persist (fix the corpus).** Repair the Supabase service-key so wiki/learnings reach the queryable corpus Margot reads, and deploy migration `177_knowledge_distillation_engine.sql` (or formally retire it) (Finding 8).
3. **Distil.** Cluster recurring signals (≥2 occurrences) into improvement proposals — new/updated skills, memory entries, policy rules, prompt fixes.
4. **Apply — with a safe auto-apply tier.** Move from 0/247 to a measured auto-apply lane with an explicit success criterion: *did the applied change reduce the recurrence it targeted?* Low-risk classes auto-apply; anything touching credentials/policy/capability stays human-gated — borrowing OpenShell's **Z3-prover pattern**: a change that would expand credential/capability reach is blocked from auto-approval (Findings 1, 2).
5. **Trigger continuously.** Replace twice-weekly LaunchAgents with event-driven firing (on PR merge / session end) plus a cloud-resident cron so it survives the Mac being asleep (Finding 8).
6. **Research frontier.** The R&D division runs deep-research/source-ingest on a standing cadence to track new models (registry already names DeepSeek V4 Pro, Kimi K2.6, Qwen 3.5) and new substrate (OpenShell GA, benchmarks, adopters — Finding 4). New capability flows back as updated routing policy and skills.

The reward signal — recurrence-reduction, eval pass-rates, task success, cost-per-unit — comes from the **agent-level observability layer** that OpenShell does *not* provide (Finding 5) and we must build.

---

## 9. Phased roadmap

### NOW (this week — the first build steps)

1. **Provision the long-lived Max service token.** Founder runs `claude setup-token`; add `CLAUDE_CODE_OAUTH_TOKEN` to `~/.hermes/.env` and per-account via `hermes auth add anthropic --type oauth`; verify Vercel prod redeploys no-build-cache to activate. **#1 unblock — the entire flat-rate-Max strategy is inert without it** (Findings 6, 7, 8).
2. **Credential-routing spike (§11 fix 1, go/no-go GATE):** empirically verify whether OpenShell's Privacy Router can route Claude Code Max-subscription OAuth traffic (not just an `ANTHROPIC_API_KEY`) to `api.anthropic.com`. *No agent goes behind `inference.local` until this passes.*
3. **Stand up one OpenShell gateway + one Docker-driver sandbox on the Mac Mini, running pm-core unmodified — with a NON-inference workload first** (§11 fix 4). Generate the gRPC client from `proto/openshell.proto`; prove `CreateSandbox → ExecSandboxInteractive → destroy`. Inference-through-router moves to NEXT, contingent on step 2.
4. **Fix the self-improvement loop's two hard breakages:** repair the Supabase service-key so wiki sync stage 3/3 passes, and reconcile the RA-552/RA-1745 loops onto one canonical signal schema (Finding 8).

### NEXT (4–8 weeks)
- Build the **tiered model-cost router** as a real dispatcher extending `provider_router.py`, with per-account Max consumption instrumentation and edge-triggered alerts only on limit-state change.
- Build the **orchestration plane**: durable queue + Linear intake, planner/decomposer, unique-artifact discipline. Spawn a **5–10 agent pilot squad** (Build division) — the capacity-honest scale.
- Wire **mandatory QA gates** (qa-lead → opus-adversary → production-gate) as a non-bypassable pipeline on every agent PR.
- Ship the **RA-1745 capture hooks**; deploy/retire migration 177.

### LATER (quarter+)
- Scale toward the division org chart — gated on OpenShell multi-tenant/HA gateway maturity AND a capacity-honest model/budget plan (§11 fixes 2–3).
- Add **agent-level observability** beyond OCSF audit.
- Introduce **safe auto-apply** with recurrence-reduction reward signal.
- Evaluate microVM/K8s drivers for client-portal isolation **only after** OpenShell hardening + an independent audit exist.

---

## 10. Risks & open questions

**Risks:** OpenShell maturity (alpha, single-player, no benchmarks/audit, experimental microVM ignoring CPU/mem limits, Landlock `best_effort` on kernels <5.13); single-token/single-machine fragility; prompt injection unaddressed by OpenShell (controls limit what a compromised agent can *do*, not whether it's manipulated); coordination collision at scale; Fable 5 unreachable.

**Open questions (must resolve before scale):** Do Batch API + prompt caching work through the Max OAuth token? Are pooled Max limits per-account or per-org? Real fleet request-rate vs OpenRouter free tier (20 RPM / 200 RPD per key)? OpenShell API-stability across alpha releases? Is OpenShell genuinely NVIDIA-engineered or community-badged? When does the HA/multi-tenant gateway ship?

**Unverified, flagged honestly:** the official docs site returned 404; several crate internals read only at architecture-doc level, not source. We have not live-probed which models the Max picker currently exposes. Treat every OpenShell capability above as *grounded in the repo's own docs, not independently benchmarked*.

---

## 11. Adversarial Review — verdict `NEEDS_FIXES`

An Opus-grade skeptic pressure-tested §1–§10 against the raw findings. Verdict: **NEEDS_FIXES** (sound at pilot scale; defective at the 100-agent headline). These are binding corrections.

### Hallucinated / unsupported claims
1. **Max-OAuth through OpenShell's Privacy Router is unverified and likely incompatible.** No finding supports routing a Claude Max *subscription OAuth* token through `inference.local`. Finding 3 documents OpenShell's Anthropic provider auto-discovering an injectable `ANTHROPIC_API_KEY`; Finding 6 says our only live Anthropic path is subscription OAuth (`sk-ant-oat01`) and the API-key pool is dead. OpenShell's documented credential model is **API-key injection, not subscription-OAuth pass-through.** §2.3/§5/§9 treat Max-behind-`inference.local` as a given — it is not.
2. **"Cost falls per unit of work as we scale" is unsupported.** Finding 7 establishes the opposite binding constraint — hard 5-hour rolling + two weekly caps per account. The inversion holds only *below* the ceiling.
3. The "never holds the key" guarantee is asserted in findings only for **API-key** bundles; the blueprint over-extends it to the Max path.
4. Implied transparent routing of pm-core's (Claude Code) OAuth inference through the Privacy Router is never demonstrated in findings.

### Feasibility issues
- **Rate-ceiling shortfall (~4–5×).** The org table commits ~25 Opus-tier + ~60 Sonnet-tier *continuous* agents. Three Max20x accounts supply ~900 Opus-hours/week; 25 continuous Opus agents demand ~4,200 agent-hours/week. **Continuous 100-agent operation on 3 Max plans is not achievable at the assigned tiers.**
- **The 100-agent target depends on OpenShell's unshipped multi-tenant/HA gateway.**
- **Credential-plane mismatch:** OpenShell injects an `ANTHROPIC_API_KEY` env bundle; our only working credential is subscription OAuth — the plane the blueprint says "collapses into provider bundles" may not accept the one credential that works.
- **NOW-step-2 was overscoped** (installing an alpha Rust runtime with empty READMEs + 404 docs, generating a gRPC client, AND proving end-to-end inference routing in one week) — re-scoped above.
- **macOS isolation caveat:** Landlock/seccomp/netns are Linux kernel controls — on the Mac Mini they apply only inside Docker's Linux VM, and Landlock degrades to `best_effort` on kernels <5.13. The "safe enough to run unattended" claim is weaker on the actual target machine than stated.
- **Subscription-plan usage-policy risk:** driving a headless 100-agent fleet through consumer Max subscriptions via a long-lived token may collide with Anthropic's acceptable-use; per-account-vs-per-org pooling is unknown.
- **Tier-0 "free" is capacity-bound** (20 RPM / 200 RPD per OpenRouter key) — needs many keys + local Ollama capacity, currently unquantified.
- **Batch API + prompt caching** (load-bearing cost levers) are unverified through the Max OAuth path.

### Cost realism
Optimistic and overstated at the claimed scale; directionally sound at pilot scale. Credible for a **5–10 agent pilot**; the "100-agent near-zero marginal cost" headline is **not supported by the rate-limit facts**. Once ceilings are hit the fleet must throttle (work stops), fall back to capped free tier, or spill to metered Batch/API (positive dollar cost) — beyond a small pilot, more agents means MORE spend or LESS throughput.

### Required fixes (apply before funding/build)
1. **Credential-routing spike as a NOW go/no-go gate** — verify Max-OAuth through the Privacy Router before any agent is placed behind it. *(Folded into §9 NOW-2.)*
2. **Re-scope the economic claim** to a ceiling-aware model — state the sustainable concurrent-agent count on 3 Max plans and where metered spillover begins.
3. **Right-size the fleet to capacity** — reduce Opus/Sonnet counts to what 3 Max plans sustain, or specify the additional accounts/metered budget for 100 agents.
4. **De-scope NOW-step-2** to a non-inference proof; move inference-routing to NEXT. *(Done in §9.)*
5. **Quantify Tier-0 capacity** — fleet request-rate, OpenRouter key count, local Ollama GPU capacity vs the per-key limits.
6. **Add the Linux/macOS isolation caveat explicitly** and confirm the Docker Desktop VM kernel meets Landlock's requirement, or downgrade the unattended-safety claim. *(Added to §10.)*
7. **Resolve Anthropic subscription usage-policy + pooling** before sizing throughput.
8. **Verify Batch API + prompt caching on the Max OAuth token**; if metered-only, remove from the Max-lane cost model or budget the metered path.

---

## Appendix — provenance

- **Swarm:** 12 agents, ~1.05M tokens, 130 tool calls, ~17 min wall-clock. 11/12 agents succeeded; 1 recon agent (nexus:current-architecture) failed its structured-output retries — its dimension is partially covered by the self-improvement auditor (Finding 8) and should be re-run for a complete current-architecture map.
- **OpenShell ground truth:** github.com/NVIDIA/OpenShell — Apache-2.0, ~7.3k stars / 897 forks, ~90% Rust, alpha "single-player." Last pushed 2026-06-29.
- **Findings 1–9** referenced inline are the swarm's structured outputs (recon ×5, model-landscape ×3, nexus-state ×1 successful).
