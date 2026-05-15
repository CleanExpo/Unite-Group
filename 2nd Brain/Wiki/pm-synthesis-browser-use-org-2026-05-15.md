---
type: wiki
updated: 2026-05-15
---

# PM Synthesis — browser-use Org Install Order (2026-05-15)

Senior PM ranked install order across the 43-repo browser-use sweep. Consumes [[research-browser-use-org-2026-05-15]] (no re-research). Defends Wave-1 deltas against [[board-deliberation-browser-harness-2026-05-14]] sequencing locks. Per [[feedback-tight-code]], [[feedback-quality-over-quantity]], [[feedback-make-calls-not-questions]].

---

## §1 Headline call

**Wave-1: install `vibetest-use` (MCP pre-merge QA gate), pilot-refactor one swarm module to `bubus`, alongside the already-locked `browser-harness` PILOT-ONE on RestoreAssist.** Three Wave-1 repos total — two new, one pre-locked. The single highest-leverage finding in the research: **lift the 2FA-live-view URL pattern from `bux/install.sh` into [[agency-bot-design-2026-05-14]] Phase 2** — do not pivot to `bux` itself (research §2.12 — adopting bux means ripping out [[hermes-agent]] + Composio + [[project-contextbot-platform]] routing). Magnus is 8 weeks ahead on the same architecture; the moat is portfolio + ATIA wedge, not the substrate. Skip `qa-use`, `workflow-use`, `macOS-use`, `n8n-nodes-browser-use`, `contact-use`.

---

## §2 Ranked install order

| Wave | Repo | What it unlocks | Effort | $-value capture | Risk | Sequencing dep |
|---|---|---|---|---|---|---|
| 1 | `browser-harness` (pre-locked) | Stealth CDP drive for RA restricted portals | 5 d PILOT-ONE | $4-7k/mo (research §4 #4) | MED — SaaS funnel knife per [[board-deliberation-browser-harness-2026-05-14]] §Knife 4 | None — Pilot is approved |
| 1 | `vibetest-use` (MCP) | Multi-agent pre-merge QA on CCW + CARSI + Nexus PRs | 30 min install + 6 h portfolio wiring | $6-10k/mo swarm hours (research §4 #1) | LOW — MCP swap-out is one config line | Existing Gemini key in [[reference-1password-index]] |
| 1 | `bubus` (pilot — wiring.py only) | Replayable WAL event causality for swarm | 1 d single-module refactor | Indirect — enables L3+ autonomy per [[autonomy-gap-audit-2026-05-14]] | LOW (pilot scope); MED (full swarm later) | Pydantic already in stack; verify Python 3.12+ on Pi-CEO host |
| 1 | `bux/install.sh` (READ-ONLY) | 2FA-live-view UX pattern for [[agency-bot-design-2026-05-14]] Phase 2 | 90 min read | 1-2 d build time saved (research §4 #5) | NIL — no install | None |
| 2 | `video-use` (Synthex pilot) | Transcript-driven edit loop, no per-cut human review | 2 d install + 1 d workflow | ~4 h/wk Synthex = $1-1.5k/mo (research §4 #3) | LOW — symlinked skill, ElevenLabs already in [[hermes-agent]]:65 | Autonomy-gap #1-3 closed first |
| 2 | `video-use` (RA pilot) | IICRC case-study cuts from field video | 1 d wiring | ~6 h/mo RA docs | LOW | Synthex pilot proves loop |
| 2 | `bubus` (full swarm) | All 318 modules → bubus event flow | 5 d refactor + tests | Audit-loggable autonomy | MED — touches 20+ modules; rollback is real diff | Wiring.py pilot ships clean |
| 2 | `stress-tests` (fixtures) | Local-host edge-case bench for harness PILOT | 2 h clone + host | $0 — derisks PILOT scaling | NIL | browser-harness PILOT live |
| 2 | `agent-studio` iframe (READ-ONLY) | Live-view component for Pilot bot UI | 60 min read | Saves 1 d invent-from-scratch | NIL | [[agency-bot-design-2026-05-14]] Phase 2 starts |
| 3 | `webagents.md` (portfolio adoption) | Each brand publishes `/.well-known/webagents.md` | 6 d (6 brands × 1 d) | Long-tail AI-discoverability moat | LOW — pure publish | Spec must hit Q3 2026 traction signal |
| 3 | `workflow-use` (re-evaluate) | Deterministic RPA replay for Cin7 / Xero | 2 h read + 1 d pilot IF v1.0 | $1-2k/mo CCW + Duncan | HIGH today — vendor admits "not production" (research §2.4) | Wait for v1.0 tag |
| 3 | `browser-harness-js` | TS-native browser drive (Synthex / Nexus) | 2 d install + pilot | Conditional | LOW | Only if a TS-native ticket actually appears |

Wave 1 = 3 install actions + 1 read · Wave 2 = 5 items · Wave 3 = 3 conditional items · Total = 12 rows (cap respected).

---

## §3 Bundle plays

### Bundle A — "Browser autonomy" (Wave 1 + 2)

`browser-harness` (PILOT) + `cdp-use` (transitive) + `bubus` (same author, designed to pair; event bus matches harness's internal events) + `vibetest-use` (MCP on top). Four-repo compose; one direct install (harness), one MCP install (vibetest), one refactor pilot (bubus). Composes cleanly because Magnus designed bubus AS the harness's event substrate (research §2.15).

### Bundle B — "Reference patterns to lift, not install" (Wave 1 — zero adoption cost)

`bux/install.sh` (2FA live-view URL pattern) + `agent-studio` iframe component (live-view in custom UI) + `evaluation-endpoint` README (private-eval pattern for portfolio brands). Three code reads, zero installs. **Cheapest leverage in the whole org** (research §5 Bundle C).

### Bundle C — "Browser Use Cloud free tier as price-discovery instrument" (Wave 1 — Pilot only)

`browser-harness` PILOT + Browser Use Cloud free tier (3 concurrent browsers, CAPTCHA solving, proxies). Use the Cloud free tier to validate the RA pilot in 14 days. If pilot ships, migrate to self-hosted Chromium BEFORE scaling concurrency past 3. The Cloud free tier IS the price-discovery instrument [[board-deliberation-browser-harness-2026-05-14]] Contrarian flagged (§Knife 4).

---

## §4 Anti-recommendations

Top 5 skips with kill reasons cited:

| Repo | Kill reason | Citation |
|---|---|---|
| `qa-use` | 9 mo stale; heavy Docker + Inngest + Resend SaaS stack; `vibetest-use` lighter-covers same lane | research §2.9 — last push 2025-08-08 |
| `workflow-use` | Vendor admits "very early development so we don't recommend using this in production" + "LLM fallback currently really bad" | research §2.4 — direct README quote |
| `macOS-use` | 14 mo stale + MLX lock-in; [[hermes-agent]] `computer_use` owns the lane | research §2.5 — last push 2025-03-05 |
| `n8n-nodes-browser-use` | Presupposes adopting n8n as a 3rd workflow orchestrator alongside Hermes + Composio + swarm | research §2.19 |
| `contact-use` | "Contact anyone by any means necessary" is the spam-norm-failing brand risk for a portfolio CEO; Composio Gmail covers legit outreach | research §2.18 — last push 2025-07-30 |

Honourable mention: `template-library` carries a Slack template — per [[feedback-no-slack]] the broader org tilts toward Slack-as-default-comms; flag, do not adopt (research §2.20).

---

## §5 Sequencing against existing locks

**[[board-deliberation-browser-harness-2026-05-14]] locked PILOT-ONE on `browser-harness` (RestoreAssist scope, fork-private posture, sunset clock, autonomy-gap prereq).** This synthesis adds `vibetest-use` + `bubus-pilot` to Wave-1. Defending the delta against each Board guardrail:

- **"No portfolio-repo touch in Wave 1"** — `vibetest-use` is an MCP server registered in `~/.claude.json`; zero portfolio-repo edit. `bubus-pilot` touches `Pi-Dev-Ops/swarm/board/wiring.py` (one swarm module), NOT a portfolio repo. Both honour the constraint.
- **"Fork-private posture"** — neither vibetest-use nor bubus require forking; vibetest-use is invoked as an MCP server (binary contract), bubus is a `pip install`. No fork surface required.
- **"Sunset clock"** — vibetest-use MCP swap is one config line. bubus pilot rollback is `git revert` of one module. Both reversible in <10 min.
- **"Autonomy-gap prereq"** — vibetest-use ACTIVELY MOVES gap #4 (PM-Senior-Scoper needs verified PR gate); bubus pilot ACTIVELY MOVES gap #5 (observable event flow for L3 autonomy). Neither is blocked by an open gap; both close gaps.

**[[agency-bot-design-2026-05-14]] Pilot bot — lift the 2FA-live-view pattern.** Specific file: `bux/install.sh` (research §2.12). The pattern: when an agent hits a 2FA wall, generate a live-view URL of the browser session, push it to Phill on Telegram, wait for the human tap. Phase 2 of the Pilot needs this; reinventing it costs 1-2 days. Reading Magnus's script costs 90 min.

**[[autonomy-gap-audit-2026-05-14]] — Wave-1 repo → gap delta:**

| Wave-1 repo | Audit gap moved | Delta |
|---|---|---|
| `browser-harness` PILOT | Gap #6 (browser-attached autonomy lane) | OPEN → IN-FLIGHT |
| `vibetest-use` | Gap #4 (PM-Senior-Scoper verified PR gate) | OPEN → CLOSED on CCW + CARSI + Nexus |
| `bubus` pilot | Gap #5 (observable event flow for L3+ autonomy) | OPEN → PROOF-OF-CONCEPT |
| `bux/install.sh` read | Gap #2 (Pilot 2FA UX) | OPEN → PATTERN LIFTED |

Four of the six top autonomy gaps move on Wave 1. None of the Wave-1 actions touch a portfolio repo.

---

## §6 The 5 forks for Phill

Format matching [[research-browser-harness-pm-synthesis-2026-05-14]] — binary calls with locked Board-recommended answers.

### Fork 1 — Adopt `vibetest-use` as the [[qa-lead]] pre-merge gate?

- **YES** — Builder calls vibetest-use MCP on every PR preview URL before [[qa-lead]] approves; 6-10 h/wk saved.
- **NO** — Stay on manual + Vercel-eyeball QA.
- **LOCKED: YES.** $0 marginal cost, rollback is one config line, single biggest Wave-1 leverage point.

### Fork 2 — Pilot-refactor `swarm/board/wiring.py` to `bubus` in Wave 1?

- **YES** — One module refactored as proof; extend to full swarm in Wave 2 if audit-replay works.
- **NO** — Defer all bubus work to Q3 2026; live with ad-hoc event plumbing.
- **LOCKED: YES (pilot scope only).** 1-day risk, enables L3+ autonomy maturity, doesn't touch portfolio repos.

### Fork 3 — Pilot `video-use` on Synthex or RestoreAssist first (Wave 2)?

- **SYNTHEX-FIRST** — Volume play (5+ edits/wk) tests the self-eval loop fast.
- **RA-FIRST** — Strategic play — IICRC case studies as ATIA content moat.
- **LOCKED: SYNTHEX-FIRST.** Per [[master-plan-2b-by-2028-v3]] Synthex distribution is the wedge, RA is the moat — test on the wedge, ship on the moat.

### Fork 4 — Read `bux/install.sh` and lift its 2FA-live-view pattern into [[agency-bot-design-2026-05-14]] Phase 2?

- **YES** — 90 min read; ship a tested-by-Magnus UX pattern.
- **NO** — Invent the pattern from scratch.
- **LOCKED: YES.** Competitive-intel reading is free; pattern is non-trivial.

### Fork 5 — Browser Use Cloud free tier for the harness PILOT, or self-hosted from day 1?

- **CLOUD-YES** — Use free tier (3 concurrent, CAPTCHA, proxies) for PILOT-ONE; accept SaaS funnel risk; unblocks RA pilot fast.
- **SELF-HOSTED** — Local Chromium `--remote-debugging-port`; longer ramp; no third party.
- **LOCKED: CLOUD-YES for pilot, SELF-HOSTED before production scaling.** Free tier IS the price-discovery instrument Contrarian called for ([[board-deliberation-browser-harness-2026-05-14]] §Knife 4).

**Conflict check vs prior Board locks:** None. Forks 1+2 honour "no portfolio-repo touch" (MCP config + single swarm module). Fork 4 is read-only. Fork 5 uses Cloud free tier inside the PILOT-ONE scope already approved. Fork 3 is Wave-2, downstream of autonomy-gap closures.

---

## §7 Anti-claim discipline

Per [[feedback-audit-verification]] the research surfaced these Magnus-marketing poses; flagged here:

- **"ChatBrowserUse 3-5× faster with SOTA accuracy"** (research §2.1) — CLAIMED, not independently verified. Treat as vendor copy.
- **"qa-use is production-ready"** (research §2.9) — CLAIMED but contradicted by 9-mo stale push. Vendor copy fails the verification test.
- **"workflow-use is RPA 2.0"** (research §2.4) — partially CONFIRMED by vendor's own "very early development, not for production" disclaimer — the README contradicts the marketing tagline. Honest by accident.
- **`bux` "24/7 Claude Code agent"** (research §2.12) — CONFIRMED by README, but the architecture is identical to [[hermes-agent]] + [[project-contextbot-platform]] (Phill shipped first, smaller stars). Magnus marketing doesn't acknowledge prior art in the agent-on-a-box pattern.

---

## §8 Cross-refs

[[research-browser-use-org-2026-05-15]] · [[research-browser-harness-pm-synthesis-2026-05-14]] · [[board-deliberation-browser-harness-2026-05-14]] · [[agency-bot-design-2026-05-14]] · [[autonomy-gap-audit-2026-05-14]] · [[master-plan-2b-by-2028-v3]] · [[pi-ceo-architecture]] · [[hermes-agent]] · [[project-contextbot-platform]] · [[unite-group-nexus-architecture]] · [[qa-lead]] · [[pm-core]] · [[feedback-tight-code]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]]
