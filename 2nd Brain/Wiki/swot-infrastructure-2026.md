---
type: swot-analysis
updated: 2026-05-10
businesses: [Pi-Dev-Ops, NodeJS-Starter, ATO-integration]
---

# SWOT Analysis — Infrastructure Tier (May 2026)

Infrastructure tier = the three internal systems that underpin the $2B thesis: Pi-Dev-Ops (autonomous operations backbone), NodeJS-Starter-V1 (portfolio application template), and the ATO integration layer (compliance automation). None of these are consumer-facing; all of them create or destroy leverage across the entire portfolio.

---

## Pi-Dev-Ops Swarm

### Strengths

**TAO model with proven tier differentiation.** Opus 4.7 (planning), Sonnet 4.6 (complex features), Haiku 4.5 (discrete tasks) is a cost-efficient architecture that mirrors how high-performing human engineering teams actually work. Zero API cost on Claude Max is a structural advantage no SaaS competitor can replicate at this scale.

**33 skills across 4 layers.** The skill library (Core, Frameworks, Strategic, Foundation+Ops) covers the full engineering lifecycle — from `tier-architect` and `closed-loop-prompt` through `zte-maturity`, `ship-chain`, and `security-audit`. This codified methodology is proprietary IP that compounds with each new skill added.

**Deep integration stack already live.** GitHub, Linear, Supabase, Telegram, MCP stdio, TOTP-gated kill/resume endpoints, HMAC-signed webhooks, and 19 active Hermes cron jobs — all wired and green as of 2026-05-10. Most competitors are still in integration design phase.

**Real production deployments.** Backend on Railway (HTTPS, CSP hardened, rate-limited to 30 req/min). Dashboard on Vercel. PR#201 shipped security header + dep patch cycle. This is not a prototype.

**Autonomy trigger live.** Linear-to-Claude-Code pipeline activated with `DRY_RUN=false`, 15-min launchd cron. Pi-CEO is already claiming and executing tickets without human initiation.

**HITL loop with reaction polling.** CoS human-in-the-loop wired with emoji-reaction approval gate. Autonomy is gated, not unchecked — which is exactly what enterprise security frameworks (CSA Agentic Trust Framework, NIST AI RMF) now mandate.

**Hermes as edge node.** Local Mac mini gateway for cron, MCP routing, and Telegram delivery gives the swarm a persistent, low-latency local compute layer that doesn't incur cloud round-trip costs for every agent call.

**ZTE maturity scoring.** Built-in maturity framework (Zero-to-Enterprise) gives the system a self-assessment capability. Most autonomous platforms have no internal quality signal.

### Weaknesses

**Single-model dependency on Claude.** The entire TAO model is Anthropic-native. If Anthropic changes pricing, rate limits, or model availability (e.g., Claude Max terms), the swarm's cost basis collapses. No provider fallback beyond Ollama for trivial tasks.

**Llama 3.3 70B cannot invoke MCP tools.** Hermes primary model (via OpenRouter) outputs JSON text instead of invoking tools. This forces a Python pre-fetch workaround for every external data call. Blocks true LLM-native autonomy for Hermes-tier jobs.

**No agent identity management.** Agents operate without cryptographically verified non-human identities (NHIs). In 2026, NHIs in enterprise environments already outnumber human identities 40:1 to 100:1. Pi-Dev-Ops has no agent identity registry, no capability attestation, and no tamper-evident audit [[log]] per agent action. This is the single largest security gap.

**No structured observability layer.** Telegram is the primary alert channel; there is no centralised observability dashboard tracking hallucination rate, policy violations, escalation frequency, or audit trail completeness. These are the metrics security frameworks now require for production autonomous systems.

**No error propagation containment.** In multi-agent systems, errors cascade. There is currently no formal circuit-breaker pattern — if an agent produces a bad output that feeds into a downstream agent, the failure mode is undefined.

**Swarm skills not versioned or tested.** 33 skills exist but there is no evidence of automated skill regression testing, version locking, or compatibility matrices. A skill update can silently break a downstream workflow.

**Gmail and Google Drive MCP disabled.** Email and Drive integration is offline (OAuth credentials missing). This blocks Margot from using email or documents as inputs for analysis workflows.

**Wave 5.3–5.6 queued but unbuilt.** Honcho memory promotion, Pi-CEO Board wiring, senior agents, and verifiability contracts are all critical for the $2B autonomy thesis — and all still queued. The current swarm is operationally sound but strategically incomplete.

### Opportunities

**Claude 5 "Mythos" release (September 2026 target).** Infinite context, advanced multi-agent coordination, higher code taste. Pi-Dev-Ops is positioned to be first-mover on Mythos capabilities for autonomous engineering because the TAO architecture is already in place.

**MCP Registry now has 97 official servers.** Tier-2 servers (Context7, Serena, Netdata, DBHub) are immediately addable to the swarm to give agents real-time code context, semantic code retrieval, infrastructure monitoring, and token-efficient database access. These are free or low-cost upgrades.

**Agent-to-Agent (A2A) coordination standard emerging.** The 2026 trend is A2A interoperability. Pi-Dev-Ops can adopt A2A to make swarm agents composable with external tools and services — turning the swarm into a platform, not just an internal tool.

**ServiceNow's $B+ "Autonomous Workforce" validates the market.** ServiceNow shipping enterprise agent suites for IT, HR, finance, and legal proves the TAO architecture is commercially correct. Unite-Group can productise Pi-Dev-Ops for external clients before ServiceNow reaches SMB.

**Only 6% of firms are "High Performers."** 62% of enterprises are experimenters; just 6% have rebuilt operating models around autonomous agents. Pi-Dev-Ops already puts Unite-Group in the top 6%. This is a moat if leveraged externally.

**Agentic AI is the great equaliser for SMBs.** Autonomous swarm operations give Unite-Group enterprise-grade engineering capacity at SMB cost. This advantage compounds as the swarm adds skills.

**Swarms.ai framework.** Open-source enterprise multi-agent framework that could accelerate swarm scale without rebuilding orchestration primitives.

**RA-1692 / RA-1691 voice path.** Once faster-whisper STT and Voicebox TTS are installed on the Mac mini, Margot gains voice capability — enabling a fundamentally different operator interaction model.

### Threats

**Autonomous AI security is 2026's defining cybersecurity problem.** BVP and CISA both call autonomous agent security the #1 attack surface. An Alibaba-affiliated AI agent autonomously mined crypto and opened a backdoor in early 2026. A compromise of Pi-Dev-Ops would have blast radius across all 6 portfolio businesses.

**Prompt injection → RCE.** Microsoft Security (May 7, 2026) documented RCE vulnerabilities in AI agent frameworks via prompt injection. Pi-Dev-Ops agents interact with GitHub repos, which are untrusted third-party content. A malicious repo could hijack agent execution.

**No MCP identity layer.** OWASP GenAI and CSA's Agentic Trust Framework both note that MCP lacks a future-proof identity layer. Pi-Dev-Ops uses MCP extensively; if the protocol is exploited, all connected tools are compromised.

**Claude Max plan terms.** Zero API cost on Claude Max is contingent on Anthropic's terms remaining unchanged. Any shift to usage-based pricing would fundamentally alter the swarm's economics.

**Competitor velocity.** ServiceNow, Alibaba, and open-source frameworks (Swarms, CrewAI, LangGraph multi-agent) are all shipping fast. Pi-Dev-Ops' current lead is 12–18 months at most without continued aggressive development.

**Regulatory risk for autonomous systems.** US NIST AI RMF, EU AI Act, and Australian AI safety frameworks are tightening. Autonomous systems without governance documentation, audit trails, and human override mechanisms face increasing compliance exposure.

---

## NodeJS-Starter-V1

### Strengths

**Offline-first, zero-dependency local dev.** Ollama default, no API keys required. This removes the #1 barrier to adoption for new engineers joining the portfolio or external contributors. Setup under 10 minutes.

**Full-stack AI-native template.** Next.js 15 + FastAPI + LangGraph + pgvector + Redis + Supabase is a production-validated stack that covers 90% of portfolio build requirements without customisation.

**Provider abstraction layer.** Swapping Ollama for Claude (or vice versa) is a single env var change. This insulates portfolio apps from provider lock-in and allows cost-optimised model selection per task.

**343+ passing tests, 516 test files, CodeQL CI.** High test coverage for a starter template. The CI/CD pipeline (GitHub Actions + CodeQL) gives downstream projects a security scan from day one.

**Beads git-backed memory + Vault Index.** Proprietary agent memory system with O(1) wiki-link lookup is a significant differentiator over generic templates. It encodes the portfolio's preferred AI workflow patterns.

**70 installed skills + 33 Pi-Dev-Ops skills.** Skills are the fastest-compounding asset class in the portfolio. Each new skill installed reduces agent loop iterations and improves output quality.

**Adaptive Thinking on Opus/Sonnet 4.6.** Web Search v2 (GA Feb 2026), MCP Connector (beta), Agent Skills (Excel/Word/PDF beta) are already integrated. The template stays at the frontier of Anthropic capability.

**pnpm + Turborepo monorepo.** Industry-standard monorepo tooling with correct workspace isolation, lint-staged pre-commit gates, and Prettier/ESLint configuration baked in.

### Weaknesses

**Misnamed "NodeJS-Starter."** The backend is Python/FastAPI, not Node.js. The name creates confusion for engineers expecting a pure Node stack. Documentation and onboarding risk.

**JWT is HS256, not RS256.** Symmetric signing means any service with the secret can issue valid tokens. In a multi-service portfolio (6 businesses), HS256 creates shared-secret sprawl. RS256 or PKCE with asymmetric keys is the 2026 standard.

**Default login is hardcoded.** `admin@local.dev` / `admin123` in the README is a credential disclosure risk. Even in dev context, normalising weak defaults trains bad habits.

**LangGraph dependency.** LangGraph (LangChain ecosystem) has a track record of breaking API changes and opinionated abstractions that complicate debugging. In 2026, Claude's native multi-agent orchestration (Managed Agents, A2A) may make LangGraph redundant or create dual-framework complexity.

**No secrets management pattern.** The template uses `.env.local` files throughout. There is no integration with Vault, AWS Secrets Manager, or equivalent. For production deployments, this forces ad-hoc secrets patterns per project.

**Next.js 15 while Pi-Dev-Ops dashboard runs Next.js 16.** Version drift between the template and the Pi-Dev-Ops dashboard creates maintenance overhead and complicates shared component extraction.

**pgvector + PostgreSQL in Docker for dev only.** Production vector search at scale requires managed pgvector (Supabase) or dedicated vector DBs (Pinecone, Qdrant). The template doesn't document the production migration path.

**No RBAC.** JWT auth exists but there is no role-based access control layer. Portfolio apps built on this starter all need to build RBAC from scratch, duplicating effort.

### Opportunities

**TypeScript adoption crossed 70% of Node.js production in 2025.** NodeJS-Starter-V1 is already TypeScript-strict, positioned to receive the full benefit of the 2026 TypeScript ecosystem maturity: tRPC, Prisma type-flow, Zod runtime validation as standard.

**Upgrade to Next.js 16 + React 19 RSC patterns.** Next.js 16 is already in production on Pi-Dev-Ops dashboard and [[carsi]]. Standardising the template on Next.js 16 eliminates version drift.

**Add tRPC for end-to-end type safety.** Types flowing from PostgreSQL schema through Prisma through tRPC to the frontend component is the 2026 gold standard. Adding tRPC would eliminate a major class of runtime type errors across all portfolio apps.

**Replace LangGraph with Claude Managed Agents.** Anthropic's native multi-agent orchestration (announced at "Code with Claude" conference) can replace LangGraph dependency with first-party primitives — fewer breaking changes, better Claude integration, lower cognitive load.

**MCP Connector (beta) → full MCP tooling.** Once MCP Connector exits beta, the template can expose the full MCP registry (97 servers) to any app built on it. Every portfolio app gets MCP capability without additional wiring.

**Productise as open-source.** MIT-licensed, offline-first, Claude-integrated template could be released publicly to build developer mindshare for Unite-Group's technical brand. Community adoption drives talent pipeline and positions Unite-Group as an AI-native engineering leader.

### Threats

**Framework velocity obsolescence.** Next.js, FastAPI, and LangGraph all ship major versions 2-3x per year. The template can fall behind in 3-6 months without active maintenance. An outdated starter is worse than no starter — it normalises tech debt.

**AI Web IDE competition.** Vercel v0, Bolt.new, Lovable, and Cursor are generating complete stacks from natural language. The "starter template" category is under pressure from zero-shot generation. The template needs to lean into what generators can't do: opinionated architecture, test coverage, and Anthropic-native AI patterns.

**LangGraph API instability.** Multiple major breaking changes in LangChain/LangGraph history. A breaking change in LangGraph could halt all portfolio app development simultaneously.

---

## ATO Integration

### Strengths

**Real regulatory mandate.** ATO compliance is not optional for any Australian business. GST, PAYG, Single Touch Payroll (STP), BAS lodgement — every Unite-Group portfolio business and every [[ccw]]-tier client is legally required to interact with the ATO. The integration layer has captive demand.

**SBR2 API is mature and documented.** Standard Business Reporting 2 (SBR2) via ebMS3 in XML is the production-grade ATO integration protocol. Activity statement list, prefill, and lodgement interactions are available. STP Phase 2 is the payroll standard. These are stable, government-maintained APIs.

**ATO is pushing digital-first.** The ATO's stated goal is cleaner digital records, more accurate GST reporting, tighter BAS preparation, and payroll-linked compliance. The regulatory pressure is creating a market for automated compliance tooling.

**[[ccw]] as first client validation.** The $33K ARR [[ccw]] contract runs on the [[ccw]]-CRM + [[synthex]] stack. [[ccw]] has compliance obligations (GST, payroll, BAS). A working ATO integration layer would reduce [[ccw]]'s accounting overhead — a tangible ROI for client retention and upsell.

**OECD CARF from 2026.** The Crypto-Asset Reporting Framework enables international tax authority data exchange. ATO data-matching is now cross-referencing income, crypto, bank, and employer data automatically. The compliance surface area is expanding, which means the integration layer has growing addressable scope.

### Weaknesses

**No confirmed build state.** Unlike Pi-Dev-Ops and NodeJS-Starter (both live with documented tech stacks), there is no evidence in the wiki or source files of a deployed ATO integration. This appears to be a layer in planning/early stage, not a live system.

**SBR2 requires Digital Service Provider (DSP) registration.** The ATO requires formal DSP onboarding to access production SBR2 APIs. This is a regulatory compliance overhead that takes weeks to months. Without DSP registration, integrations can only use test environments.

**XML/ebMS3 is a legacy protocol stack.** SBR2 uses SOAP-era XML over ebMS3 messaging. Building modern REST-to-SBR2 bridges requires translation layers that add complexity and maintenance overhead. The ATO API Portal has newer REST endpoints but coverage is uneven.

**Talent gap.** SBR2/ATO integration expertise is a specialist skill. It sits at the intersection of tax law, government API compliance, and software engineering. The Pi-Dev-Ops swarm has no documented skill for ATO compliance automation.

**Data sensitivity.** ATO integration handles payroll, revenue, and tax data — the highest-sensitivity data class for any business. A breach or miscalculation in an automated compliance layer has legal, financial, and reputational consequences.

### Opportunities

**Automate BAS lodgement end-to-end.** SBR2 supports activity statement prefill (pull current obligations from ATO) and lodgement (submit BAS). A Pi-Dev-Ops skill that fetches from Xero/MYOB, validates, and lodges BAS via SBR2 would save [[ccw]] and every portfolio business 2-4 hours per quarter of accountant time.

**Single Touch Payroll automation.** STP Phase 2 requires per-pay-event reporting to the ATO. Automating STP payroll events from the CRM's payroll data would be a direct [[ccw]] upsell — [[ccw]] runs on the Unite CRM stack.

**ATO's own AI is expanding.** The ATO is using AI models to reduce taxpayer compliance costs. This creates a policy environment favourable to AI-assisted compliance tools — Unite-Group is aligned with government direction, not fighting it.

**Wave 7 data-room generator.** Wave 7.1 targets a live data-room with Xero auto-feed. ATO integration is a natural component of that — clean tax records are a due-diligence requirement for M&A and the $2B exit.

**Productise for restoration industry.** Restoration contractors (DR-NRPG, RestoreAssist network) are primarily small operators with limited accounting overhead. An automated BAS/STP layer inside RestoreAssist would be a genuine differentiator vs. generic field-service apps.

**Compliance as a moat.** Building a certified DSP integration with the ATO creates a regulatory moat. Most competitors in the SMB SaaS space offload compliance to Xero/MYOB integrations. Owning the ATO layer directly means lower cost, faster data, and a competitive capability that can't be quickly replicated.

### Threats

**DSP certification changes.** The ATO can alter DSP requirements, API versions, or authentication mechanisms (they migrated from SBR1 to SBR2; a SBR3 or REST-only future is plausible). Every major ATO API change requires re-certification.

**Incumbent integration providers.** Xero, MYOB, and Reckon already have deep ATO SBR2 integrations with thousands of clients. Competing in general-purpose accounting integration is capital-intensive. The opportunity is vertical-specific (restoration industry, field service) where incumbents don't have tailored workflows.

**Penalty risk.** Automated BAS lodgement errors can result in ATO penalties or interest charges. Any automated compliance layer requires a human-review gate before lodgement — the system must be advisory-first, not fire-and-forget.

**Privacy Act obligations.** Handling ATO data means handling personal and financial information under the Privacy Act 1988 and the Tax Administration Act. The integration layer requires a privacy-by-design architecture from day one.

---

## 10x Opportunities

### Codebase and Security

**1. Agent Identity Registry (Pi-Dev-Ops)**
Every agent in the swarm needs a cryptographically verified non-human identity (NHI). The 2026 zero-trust playbook is explicit: register each agent with a unique machine identity from deployment, scope access to least privilege, enforce just-in-time permissions, and produce tamper-evident audit logs per action. Files to add: `swarm/identity/agent_registry.py`, `swarm/identity/nhi_manager.py`. This is not optional — it is the threshold requirement for Pi-Dev-Ops to be trusted with sensitive data across 6 businesses.

**2. Structured Observability Layer (Pi-Dev-Ops)**
Telegram alerts are not observability. Add a metrics collection layer tracking: hallucination rate (agent outputs that contradict source data), policy violations, escalation frequency, audit trail completeness, and time-to-resolution. Recommended: ship a Supabase table `agent_telemetry` fed by all agents; surface on the Pi-Dev-Ops dashboard. This is the gap between "it works" and "we can prove it works."

**3. Circuit Breaker Pattern for Multi-Agent Errors (Pi-Dev-Ops)**
Error propagation in multi-agent chains is the #1 operational risk in 2026 autonomous systems. Implement a circuit-breaker at the orchestrator layer: if an agent returns an error or low-confidence output, halt propagation, [[log]] to telemetry, and escalate to HITL before continuing. Reference: `swarm/orchestrator.py` → add `CircuitBreaker` wrapper.

**4. RS256 JWT + RBAC (NodeJS-Starter)**
Upgrade from HS256 symmetric signing to RS256 asymmetric. Add a role-based access control layer so portfolio apps built on the starter get RBAC without rebuilding it. This eliminates a category of vulnerability that will affect every app in the portfolio.

**5. Secrets Management Integration (NodeJS-Starter)**
Replace `.env.local` patterns with a proper secrets management integration. HashiCorp Vault (self-hosted) or AWS Secrets Manager. The template should document the pattern; downstream portfolio apps should adopt it. Normalising secrets management now prevents a class of credential-exposure incidents at scale.

### Swarm Capability Gaps

**6. Add Tier-2 MCP Servers: Context7 + Serena + Netdata**
Three zero-cost MCP additions that would materially improve swarm output quality:
- **Context7**: Injects up-to-date library documentation into every agent prompt — eliminates hallucinated API calls.
- **Serena**: Semantic code retrieval and editing for coding agents — enables agents to find relevant code without whole-repo context loads.
- **Netdata**: Real-time infrastructure monitoring + ML anomaly detection — gives the swarm visibility into production health without Telegram polling.

**7. Build ATO Compliance Skill for Pi-Dev-Ops Swarm**
A dedicated `ato-compliance` skill covering: SBR2 prefill (fetch current BAS obligations), GST calculation validation, STP payroll event formatting, and lodgement via SBR2 API. This converts the ATO integration from a planning item into a swarm capability. Scope: 1 skill file + SBR2 Python client + test suite. Target deployment: Wave 5.4–5.5.

**8. Enable Gmail + Google Drive MCP (Hermes)**
Two critical MCP servers are disabled due to missing OAuth credentials. Enabling them unlocks: Margot reading and summarising email threads, Drive-based document workflows, and cron jobs that process documents without manual intervention. Fix: complete Google OAuth credential setup for both servers.

**9. Pi-CEO Board → Linear Dispatcher (Wave 5.4)**
The ceo-board skill produces decision memos but they don't yet feed back into Linear automatically. Wiring ceo-board output to the Layer 3 dispatcher (auto-create Linear tickets from board decisions) would close the strategy-to-execution loop. This is the single biggest operational leverage gap in Wave 5.

### Security Hardening

**10. Prompt Injection Defence (Pi-Dev-Ops)**
Microsoft Security documented RCE via prompt injection in AI agent frameworks on May 7, 2026. Pi-Dev-Ops agents process GitHub repo content — untrusted third-party text. Add a prompt sanitisation layer before any external content enters an agent context. Specifically: strip instruction-formatted text (system prompt mimicry), flag and quarantine suspicious patterns, and run external content through a sandboxed validation agent before passing to the main pipeline.

**11. MCP Transport Layer Security**
MCP currently lacks a first-party identity layer (confirmed by OWASP GenAI and CSA). Until Anthropic ships MCP with built-in auth, all Pi-Dev-Ops MCP connections should run over mTLS with server certificate pinning. Add to Hermes MCP config.

**12. TOTP Scope Expansion**
TOTP is currently implemented for `/api/swarm/{kill,resume}` only (pyotp 2.9, RA-1839). Expand TOTP requirements to all destructive or financial operations in the swarm — particularly any ATO lodgement operations, any GitHub push operations, and any database schema migrations triggered autonomously.

### ATO/Compliance Automation

**13. SBR2 Python Client as Pi-Dev-Ops Skill**
Build a reusable SBR2 client as a Pi-Dev-Ops skill. Minimum viable scope: DSP test environment connection, activity statement prefill, BAS data validation, mock lodgement. This gives the swarm a compliance capability that no competitor's autonomous platform currently has, and creates the foundation for productising compliance automation in the restoration vertical.

**14. Automated BAS Preparation Workflow**
Wire Xero API → SBR2 prefill → GST calculation → human-review gate → SBR2 lodgement. Target: [[ccw]] Q3 2026. This is a direct upsell to the $33K ARR contract — automated BAS prep for a small business saves $400-800/quarter in accountant fees. The feature pays for itself in year one.

**15. STP Phase 2 Payroll Automation**
Single Touch Payroll Phase 2 requires per-event payroll reporting. The Unite CRM ([[ccw]] deployment) has payroll data. Wire payroll events to STP Phase 2 reporting via SBR2. This is a compliance requirement that [[ccw]] currently handles manually — automating it is a concrete ROI story for the client.

### Developer Experience

**16. Upgrade NodeJS-Starter to Next.js 16 + Add tRPC**
Next.js 16 is already in production (Pi-Dev-Ops dashboard, [[carsi]], Unite CRM). Standardise the template. Add tRPC for end-to-end type safety — types flow from PostgreSQL schema through Prisma through tRPC to React components without manual type duplication. This alone eliminates a common class of runtime bugs across all portfolio apps.

**17. Rename and Reframe NodeJS-Starter**
The template is a Python/TypeScript full-stack AI platform, not a "NodeJS Starter." Rename to something accurate: `ai-platform-template` or `pi-stack`. Update README to reflect the actual stack. This eliminates onboarding confusion and positions the template correctly for external productisation.

**18. Skill Versioning and Regression Testing (Pi-Dev-Ops)**
33 skills with no version locking or regression tests. Add a `skills.lock` manifest (skill name, version hash, last-tested date) and a CI job that runs a minimal smoke test per skill on every Pi-Dev-Ops commit. Prevents silent skill breakage from propagating into production workflows.

---

## Priority Actions (Top 10, ROI-Ranked)

| Rank | Action | Business Impact | Effort | ROI Signal |
|------|--------|----------------|--------|------------|
| 1 | Agent Identity Registry + Zero-Trust NHI | Existential security — enables Pi-Dev-Ops to handle sensitive data across all 6 businesses | Medium | Risk elimination + $2B thesis dependency |
| 2 | Pi-CEO Board → Linear Dispatcher (Wave 5.4) | Closes strategy-to-execution gap; every board decision becomes a ticket automatically | Medium | Compounding operational leverage |
| 3 | Context7 + Serena MCP servers (Hermes) | Eliminates hallucinated API calls; improves code agent accuracy immediately | Low | Day-1 quality improvement, near-zero cost |
| 4 | Structured Observability (Supabase agent_telemetry) | Required to prove autonomous systems work; prerequisite for external productisation | Medium | Governance + external trust |
| 5 | BAS Automation Workflow for [[ccw]] | Direct Q3 2026 upsell to $33K ARR contract; concrete client ROI | High | Revenue expansion + client retention |
| 6 | Prompt Injection Defence Layer | RCE via repo content is a real 2026 vector (Microsoft Security, May 2026) | Medium | Existential security for GitHub-integrated swarm |
| 7 | RS256 JWT + RBAC in NodeJS-Starter | Every portfolio app benefits; prevents credential-sprawl class of vulnerabilities | Medium | Portfolio-wide security lift |
| 8 | Enable Gmail + Google Drive MCP (Hermes) | Unlocks Margot email/document workflows blocked since Wave 5.1 | Low | Margot capability expansion |
| 9 | Circuit Breaker Pattern (orchestrator.py) | Prevents error cascades in multi-agent chains; required for Wave 5.5+ senior agents | Medium | Reliability prerequisite for scale |
| 10 | SBR2 Client Skill + DSP Registration | Creates compliance automation moat; foundation for ATO vertical productisation | High | New revenue category + M&A defensibility |

---

## Cross-refs

[[pi-ceo-architecture]] · [[hermes-agent]] · [[mcp-ecosystem]] · [[wave-roadmap]] · [[businesses-overview]] · [[autonomous-operations-2026]] · [[exit-thesis]] · [[agency-blueprint]] · [[agency-hierarchy]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[qa-lead]] · [[brand-guardian]] · [[founder]]
