---
type: wiki
updated: 2026-05-14
researcher: Anthropic Compute
source: Invest Like The Best — Krishna Rao (Anthropic CFO), pub 2026-05-13
verdict: SUPPORTS the $2B-by-2028 master plan with caveats. Anthropic trajectory is load-bearing.
---

# Research — Anthropic's $100B Compute Commitment (Krishna Rao interview)

> Deep-read of the 98 KB Invest Like The Best transcript with CFO Krishna Rao. Extracted Rao's specific numbers/claims/timelines and scored each against Phill's autonomy thesis and the [[master-plan-2b-by-2028-v3|$2B-by-2028 master plan]].

## 1. Hard numbers Rao actually stated

| Metric | Rao's figure | Quote / timestamp |
|---|---|---|
| Q1 2026 ARR jump | **$9B → $30B+ run-rate in one quarter** | "We started the year with about $9 billion of run rate revenue and we ended the quarter with… north of $30 billion of run rate revenue." (14:17) |
| Net dollar retention | **>500% annualised** | "Our net dollar retention rate is over 500% on an annualized basis." (54:28) |
| Enterprise penetration | **9 of Fortune 10** | "We now sell to nine of the Fortune 10." (49:00) |
| Capital raised (Rao tenure, 2 yrs) | **$75B** | "We've raised… $75 billion since I joined the company." (49:49) |
| Additional capital committed | **+$50B from Amazon + Google** | "Another $50 billion that'll come in into the future from the Amazon and Google deals we inked last month." (49:49) |
| Compute commitment scale | **>$100B** | "It was an over hundred billion dollar commitment." (23:30) |
| Google/Broadcom TPU deal | **5 GW, starting 2027** | "Last month, we signed a 5 gigawatt deal with Google and with Broadcom for TPUs… starting in 2027." (23:30) |
| Amazon Trainium deal | **Up to 5 GW** | "We also signed a deal with Amazon for trainium for up to 5 gawatts as well." (23:30) |
| xAI/SpaceX Colossus | **Memphis facility, near-term capacity** | "We announced a partnership with SpaceX for their Colossus facility in Memphis." (22:42) |
| Chip platforms used fungibly | **3** | AWS Trainium, Google TPU, Nvidia GPU — "we use these chips fungibly." (2:53) |
| Internal Claude-Code usage | **>90% of Anthropic's code written by Claude Code** | "90 plus % of our code is actually written by claude code." (16:26) |
| Opus 4.5 price cut → consumption | **Jevons paradox triggered** — "consumption went up way way more than what you would have expected" (35:19) |
| Janurary 2026 product releases | **30+ in one month** | "We had 30 different product and feature releases in January." (17:08) |
| Mythos cyber-vuln finding | **22 → 250** vulns vs prior model on same codebase | (1:00:16) |
| Time from $1 revenue → today | **~3 years** (first $ March 2023; frontier model March 2024) | (33:39) |
| CFO time on compute | **30-40%** | (2:45) |

## 2. Findings scored vs Phill's 24-month plan

### 🟢 LOAD-BEARING — Phill's autonomy thesis depends on these

1. **Inference efficiency is compounding per Opus generation.** Rao: "going from Opus 4 to 4.5, 4.6, and now 4.7… each one of those leaps has a multiplier in terms of how much more efficient it is at processing tokens." (9:10) → Pi-CEO swarm cost per agentic loop is dropping inside Anthropic's pricing, not just at API level. **Implication:** the agency unit economics underwriting $200M ARR get easier each model gen, not harder.

2. **Pricing is stable, not falling-and-volatile.** "Our pricing has been relatively stable across Haiku, Sonnet and Opus… we made very few pricing changes." (33:39) The only meaningful change was a **cut to Opus 4.5** that triggered Jevons paradox. → No surprise price hikes are coming. Hermes [[gemma4-cost-strategy|cost model]] can plan with confidence on the current $/MTok ladder.

3. **Frontier returns "extremely high especially in enterprise" is the explicit company thesis.** (0:00, 7:40, 47:48) Rao repeated this 4+ times. → Validates Phill's bet that staying on the frontier model (opus-4-7 → next) compounds vs commodity LLMs. The 6-month-old-model-at-fraction-of-cost play "just hasn't been the case." (12:32)

4. **Compute capacity lands progressively 2025→2027+.** Layer cake: Colossus near-term, 5 GW Google/Broadcom TPUs from 2027, 5 GW Amazon Trainium across the same window. → Anthropic will not be inference-capacity-limited through Phill's 24-month horizon. The "rate limit risk" to Pi-CEO is structurally falling.

5. **Scaling laws still hold (per Anthropic).** "We are seeing that even with releases more recently like Mythos… the scaling laws are not slowing down." (15:56) → Frontier-model cadence (Opus 4.7 today → 4.8 → 5) continues. Phill's reliance on Anthropic for the agentic top of the stack is currently rational.

### 🟡 INTERESTING — informs strategy, doesn't change tactics this week

6. **"Virtual collaborator" is Anthropic's stated north star** (1:08:27) — context-rich, tool-using, long-horizon, learns from mistakes. That is exactly the [[pi-ceo-board-deliberation|Pi-CEO Board]] + Senior PM swarm pattern. Phill is building what Anthropic believes the next 24 months looks like. Co-aligned.

7. **Co-work is now a named Anthropic product line** descended from Claude Code: "co-work… start[s] to unlock that co-working faster than claude code was if you index them to the same point in time." (1:10:01) → Worth re-reading [[hermes-agent|Hermes]] design against co-work primitives before next Hermes minor.

8. **Mythos phased release = template for government/safety gate on future capabilities.** (1:00:36) Pi-CEO should expect that the **most capable** Anthropic models may release behind a gated rollout. Plan: don't architect a critical-path dependency on day-zero access to a new frontier model.

9. **Anthropic uses 70+ internal "skills" library on the finance team.** (40:30) Validates Phill's [[wiki-ingest|skill-package]] pattern. Anthropic's own MFR skill = 90-95% ready output. Direct analog to Margot board memos.

### 🔴 ANALYST FILLER

10. Healthcare / biotech optimism, the "kindest thing" story, podcast sponsor reads, "race to the top" cultural framing. Quotable, not operational.

## 3. Strategic re-eval — does this interview SUPPORT or CHALLENGE the $2B-by-2028 plan?

**Verdict: SUPPORTS — strongly.**

The master plan's largest external dependency is "the frontier keeps improving and inference stays affordable." Rao confirms both — and adds a structural reason to believe it: **fungible 3-platform compute means Anthropic gets harder to commoditise**, not easier. Rao's own benchmark of return-on-compute (54:09) is the same framing Phill's swarm uses to justify Opus-on-hot-path.

Where it pressure-tests the plan:
- **Counter-positioning risk:** If Anthropic doubles down on enterprise + builds verticalised products like "Claude for Financial Services" (28:36), the gap between "platform" and "application" narrows over time. Phill's ATIA-vertical SaaS could one day compete with an Anthropic-shipped "Claude for Trade Services" reference app. Probability low, magnitude high. **Mitigation:** the moat is the standards body + certified-practitioner network, not the software. Reinforces [[industry-association-vision-2026|why ATIA is the real product]].
- **Capacity-allocation risk:** Rao admits Anthropic is "constrained across those use cases internally today" (26:55). When demand spikes (Q1 2026 went $9B→$30B), enterprise gets prioritised over consumer/Max tiers. Phill's Anthropic Max subscription is the lowest-priority bucket. **Mitigation:** route Pi-CEO swarm through API + first-party billing, not Max console; treat Max as a personal/dev tool only.

## 4. Proposed wiki updates

### 4.1 `master-plan-2b-by-2028-v3.md` — add §1.5

Insert after §1.4 ("Gaps relative to corrected thesis"):

```markdown
### 1.5 Anthropic trajectory dependency (verified 2026-05-14 via [[research-anthropic-100b-compute-2026-05-14]])

- **Compute supply:** Anthropic has >$100B committed across AWS Trainium (5 GW), Google TPU (5 GW from 2027), Nvidia GPU, plus near-term xAI/SpaceX Colossus. Inference capacity through Jun-2028 is structurally backed.
- **Pricing:** Stable across Haiku/Sonnet/Opus tiers; only directional move in last 18 months was a **price cut** on Opus 4.5. Plan with current $/MTok ladder; no buffer needed for hike risk.
- **Frontier cadence:** Scaling laws stated as "not slowing down" by CFO (15:56). Assume one frontier Opus generation every ~6 months through 2027.
- **Risk:** If Anthropic ships a "Claude for Trade Services" verticalised app, ATIA's software layer is exposed. Moat = standards body + certified-practitioner network, not the SaaS. Reinforces meta-product framing in §2.
- **Action:** route swarm via API + first-party billing (NOT Max console) so Pi-CEO sits in the priority queue with the Fortune-10 enterprises Rao described, not the consumer/Max tier.
```

### 4.2 New decision memo — `Wiki/decisions/2026-05-14-anthropic-stay-vs-hedge.md`

Decision: **STAY on Anthropic as primary frontier provider through Q2 2027.** Re-evaluate at the earlier of (a) Anthropic shipping a verticalised "Claude for Trades" app, (b) Sonnet/Opus pricing rising >15%, or (c) Gemini/Grok matching Opus on agentic-task benchmarks for >60 days. Hedge tactically: keep Hermes computer-use on `claude-sonnet-4-6` (no migration), keep Haiku 4.5 on cheap tier, but do not invest in a Gemini/OSS abstraction layer until trigger fires. Rationale: Rao's 90% internal Claude-Code use + 3-chip fungibility + Jevons-priced Opus = the bet that ships fastest is "ride the leader." Author: Researcher: Anthropic Compute.

### 4.3 Linear ticket

**INFRA-XXX — Migrate Pi-CEO swarm billing from Max console to API first-party** — Justification: Rao confirmed enterprise/API > Max in capacity allocation. Effort: S. Owner: Phill (read-only) / PM-Infra. P2 (not urgent, but compounding).

## 5. Filler-check ([[feedback_quality_over_quantity]])

Not filler. The interview contains 13+ quoted figures with operational implications. Two consequential strategic decisions are warranted (stay-vs-hedge memo, billing-tier migration). No short-circuit needed.

---

Researcher: Anthropic Compute
