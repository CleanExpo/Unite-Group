---
type: decision-memo
date: 2026-05-10
board: ceo-board
brief_source: cuddly-hugging-matsumoto.md
status: active
---

# Empire Overview — Bloat / Slop / Enhancements (Board Memo · 2026-05-10)

> **Brief received. Convening the board.**

## STAGE 1 — THE BRIEF

The empire's autonomous infrastructure is fully built — Pi-CEO TAO orchestrator live (Railway + Vercel), 2nd Brain has 36 wiki pages indexed and synced to Supabase, 44 senior agents/skills calibrated, ceo-board's 9-persona engine ready. But the system is visibly drifting:

- **Pi-CEO autonomy starvation** — 18 polls in last 90 minutes, all `found:0`. Backlog has 32+ tickets but none carry the dual signal (`Ready for Pi-Dev` + `pi-dev:autonomous`) the poller expects. Effective autonomy: 100% mechanically, 0% by outcome.
- **SYN-953 still red after 3 fix passes** — PRs #223/#224/#225 merged today, auto-tickets SYN-954/955/956 piling up. Latest CI failure (SYN-956) started In Progress 30min ago.
- **RA launch wave (SYN-915 epic, 9 sub-tickets)** — T-0 was 2026-05-08, two days late. All Backlog. SYN-921 (NIR explainer video, pipeline test) is `Urgent`.
- **Empire security debt** — 9,400+ unaddressed findings (pi-dev-ops 7,218 · DR 1,775 · RA 433). All four projects scored 40-45/100 on security. No Linear ticket owns this.
- **AEO Phase B/C** (11 tickets) — gated on CEO-only confirmations (VG-AEO-1..4). Static for 12 days.
- **Spike tickets** SYN-787/788 — GCP-blocked since 2026-05-04.
- **Senior-agent surplus + coverage gaps** — 16 marketing seniors duplicated user→project (intentional template/binding pattern). Missing: data-eng, CISO, CFO, sales-lead, customer-support.
- **Wiki internal contradictions** — businesses-overview says CCW is `$33,000/yr ARR`; operational-priorities-q2-2026 says CCW is a `$2,400/year SaaS contract signed 2026-05-08`. Synthex wiki claims `NextAuth.js` but CLAUDE.md mandates Supabase-only auth.

**Good outcome:** 9 line-items (top 3 bloat · top 3 slop · top 3 enhancements) with confidence, priority, and persona-vote tally. Routable to Linear by senior-pm in Stage 4.

---

## STAGE 1.4 — WIKI GROUNDING

- **From `exit-thesis`:** Target AUD $2B exit by June 2028 → implied ARR $167M-$250M (8-12x). Current ARR (CCW): $2,400-$33,000/yr depending on which wiki page you trust. Gap: 5,000x to 100,000x. NRR ≥120% is the differentiator. AI defensibility + international revenue are exit drivers.
- **From `operational-priorities-q2-2026`:** Q2 priority #1 is **CCW client success** (NPS ≥60, zero churn-threat events, <30min first response). Synthex prosumer growth is #4. RA App Store is #2. Nothing in Q2 priorities mentions Pi-CEO autonomy, AEO Phase B/C, or empire-wide security backlog. **Linear backlog ≠ Q2 priorities.**
- **From `pi-ceo-architecture`:** Three-layer system — Margot (research) → Pi-CEO Board (deliberation) → Senior Agents (execution). Zero API cost on Claude Max. The starvation isn't a cost problem; it's a *no work being claimed* problem.
- **From `synthex`:** Live, 1000+ users, $33k ARR (CCW), v11.1 latest. `NextAuth.js` claim contradicts CLAUDE.md absolute rule — wiki is stale.
- **From `businesses-overview`:** 6 portfolio businesses. CCW is "First paying external client". Internal contradiction with operational-priorities on contract value flagged above.

---

## STAGE 1.5 — RESEARCH BRIEF

*Skipped — brief is internal portfolio triage with no competitor / market / regulation / vendor questions. Empirical signals all sourced from internal systems (Linear, Pi-CEO health, Supabase wiki, repo state) in Stage 1.*

---

## STAGE 2 — CEO FRAMES

**The Real Question:** *Is the system drift caused by too many agents/tickets/skills (bloat), or by mis-routed effort against the actual revenue priority (slop)? And if the latter, what gets killed and what gets funded?*

The brief frames this as 9 line-items to triage. That's the wrong unit of analysis. The right unit is: **everything in this brief is a story about effort flowing somewhere other than CCW**. We have a $2,400/year client (one customer) and we are running a 9-persona deliberation about a 32-ticket backlog, while autonomy infrastructure polls itself 18 times finding no work, while RA launch is 2 days past T-0, and 9,400 security findings have no owner. None of those things compound CCW NPS or reduce CCW churn risk this quarter.

**Where we'll disagree:**
1. **Kill vs. fix.** Is the AEO wave (11 tickets, CEO-gated 12 days) bloat to delete or slop to unblock? Is Pi-CEO autonomy a working tool starved of fuel, or a misdesigned consumer that should be retired?
2. **Revenue concentration vs. portfolio coverage.** Q2 priorities say CCW is #1. Linear backlog says everything is #2 through #32. Do we re-anchor the backlog to operational priorities, or do we accept that backlog is an "everything else" parking lot?
3. **Wiki as ground truth.** Two material contradictions surfaced (CCW ARR $33k vs $2,400; Synthex auth NextAuth vs Supabase). If the board's grounding source contradicts itself, every previous board decision built on these wikis carries unknown error. Do we trust the wiki or audit it?

**Debate parameters:**
- Non-negotiable: $2B-by-2028 exit thesis stands. CCW success stands as Q2 priority #1.
- Up for challenge: every other ticket in Linear, every senior agent's continued existence, the assumption that more autonomy infrastructure helps right now.
- What I need: 9 verdicts with vote tallies, confidence scores, and **named tickets/skills/code paths** for senior-pm to route. No abstractions.

---

## STAGE 3 — BOARD DEBATES

### ROUND 1 — OPENING POSITIONS

**Revenue:** ARR is $2,400-$33,000 depending on which wiki you read. Either way we are 5,000-100,000x from exit. Nothing in this brief moves that needle except CCW retention (which is invisible to it) and possibly RA App Store launch (which has 0 sub-tickets started). The 32 backlog tickets are zero-revenue activities. The auto-CI tickets (SYN-954/955/956) are noise. Kill the auto-ticket webhook, freeze backlog intake, and route every available cycle to CCW + RA. Show me MRR per ticket-claimed before convincing me the autonomy poller needs more food.

**Product Strategist:** The user in this scenario isn't on the board, isn't in Linear, isn't in the wiki — it's the person at CCW running their first paying month with us. What do they need on Tuesday morning? They need the email automations to fire, the integrations to hold, and someone to answer when something breaks. None of the 32 backlog tickets address that. SYN-915 (RA launch) is a separate user — also valid, also Q2 priority #2. Everything else in this brief is internal plumbing that solves problems we created for ourselves.

**Technical Architect:** SYN-953 is the only technical fact in this brief. Three fix attempts, CI still red, auto-tickets created on each failure means a transitive import path is still calling `createClient` at module-load on a route the build collects page-data for, OR the build environment is missing keys it needs at build time (which is a deployment-config issue, not a code issue, and no amount of code-side `lazy-init` will fix it). Until SYN-953 is green, no other deploy ships. That makes everything else a stalled queue. Fix SYN-953 with forensic discipline (codex-adversarial or opus-adversary), THEN talk about backlog. The auto-ticket pile is a symptom of a missing root-cause analysis — the bot keeps reporting "the deploy failed" because the deploy keeps failing.

**Market Strategist:** Insurance restoration software is a real category and SYN-915 (RA launch wave) is positioned to enter it credibly — NIR explainer video, IICRC angle, AU/NZ evidence base. But "T-0 was 2026-05-08, T+2 today, 0 sub-tickets started" tells me one of two things: (a) the launch is real and we are actively burning the launch window, or (b) the launch was performative and the team knew it wouldn't happen on time. Either way we either commit-and-execute this week or we kill it and stop burning credibility internally. There is no third option that doesn't compound the slop.

**Compounder:** I will tell you what compounds. CCW retention compounds (one happy first-customer becomes the case-study that closes customers 2-10). RA App Store presence compounds (every download is permanent shelf-space and discovery surface). Pi-CEO autonomy compounds *if it claims tickets*; if it polls 18 times finding nothing, it compounds nothing — it's a parked car. The 9,400 security findings compound *negatively* — every week we don't triage them, the supply-chain risk grows non-linearly. Of these, the only one with a reflexive flywheel right now is the security debt (each unfixed dependency makes the next one harder to fix). I'd argue carving 1 senior agent against security backlog is the highest-compounding move in the brief.

**Moonshot:** We're debating which tickets to kill. Wrong question. The 9-persona ceo-board, the 44 senior agents, the wiki-grounded autonomy poller — this entire stack is the product. Synthex (the marketing SaaS) is a $33k/year side-project. The board itself, packaged, is what closes a $5M Series A or gets acquired by a Vercel/Replit/Cursor. Every one of these orchestration capabilities Phill is *shipping for himself* — that's the asset. Stop trying to triage backlog and ship the orchestrator as v0.1 product to 50 design partners by end of Q3. The empire IS the moonshot; the portfolio is the demo.

**Custom Oracle (domain: Australian SaaS / restoration tech / agentic dev tooling):** Three patterns from comparable plays. (1) **JAIX (logistics ERP, SA)** acquired by Arcadea Apr 2026 — single-vertical, deep ops focus, no "platform" pretensions; the founder's discipline of not chasing horizontal expansion was the moat. (2) **Vercel's v0 / Cursor's playbook** for agentic dev tooling: ship to 200 design partners on a wedge use-case, not 6 portfolio businesses on a strategy deck. (3) **RPM Global → Caterpillar at 14.3x EV/EBITDA** because it owned a vertical (mining ops). The empire pattern here is the opposite of all three — it's a **horizontal sprawl with a vertical wedge (CCW) under-resourced.** That's the diagnosis from real-world comps.

**Contrarian (last in Round 1, attacking after hearing all):**

Three things everyone in this room just accepted that I want to interrogate:

1. **"The autonomy starvation is mechanical."** That's the brief's framing. But Phill manually gates Linear tickets with hard rules ("no `git push` without confirmation", "all work traces to SYN-XXXX"). The autonomy poller looks for `Ready for Pi-Dev` + `pi-dev:autonomous`. **Phill is the one who has to apply that label.** The starvation is not mechanical, it's a *deliberate human refusal* to grant the poller anything to claim. If the autonomy infrastructure were trusted, tickets would be labelled. They aren't. The infrastructure isn't starved; it's distrusted. **Are we sure we should fix the supply-side starvation, or should we admit the demand side has no confidence in the consumer?**

2. **Revenue, you said "ARR is $2,400-$33,000 depending on which wiki you read."** That's not a wiki bug. That's the founder not knowing what his only paying customer pays him. **If we don't know what CCW pays, we don't know if CCW is profitable. We don't know if losing CCW is recoverable. We don't know what NRR target #1 even means.** Stop debating backlog until that one number is reconciled.

3. **Moonshot, you said "ship the orchestrator as v0.1 product."** Where is the evidence anyone outside Phill wants this? 9 personas debating a $2,400 ARR portfolio is not a product, it's a hobby with severance. Show me three founder conversations where someone asked "can I buy your CEO board." Until then, the moonshot is a self-aggrandising abstraction. Compounder, your "carve 1 senior agent against security backlog" is the only Round-1 move with a measurable next-week outcome.

**Open question (cited from Stage 1.4 wiki contradictions):** What is CCW's actual ARR? `confidence: low` on every Round-1 claim that depends on it.

---

### ROUND 2 — CROSS-EXAMINATION

**Contrarian (leads):**

- *Revenue, you said "kill the auto-ticket webhook." Have you checked whether anything downstream subscribes to those tickets? Pi-CEO autonomy polls Linear — if it ever does start picking up real work, it might rely on the webhook signal to know what's failing. Killing the symptom can mute the alarm.*
- *Architect, you said "fix SYN-953 with forensic discipline before anything else." But three engineers (or three fix-pass sessions) already attempted root-cause and missed. What makes the fourth attempt different? At what point does this become "we don't know how to fix it" and we ship a SYN-953-bypass workaround (skip the affected route during build) and unblock everything downstream?*
- *Compounder, you said "carve 1 senior agent against security backlog." Which senior? `codex-security-auditor` exists at user-level. Is the backlog blocked on agent capability or on someone deciding which 100 of the 9,400 findings actually matter? If it's the latter, a senior agent doesn't help — Phill needs to triage once, then automate the rest.*
- *Moonshot, name three real human design partners. Not "we could find them" — three names, three conversations, three signed NDAs. If you can't, your position is fan-fiction.*

**Technical Architect (responds to Contrarian #2):**
The fourth attempt is different because the first three didn't run forensic tooling — they pattern-matched on "lazy-init this Supabase call" and shipped. The actual failure mode is upstream: the build env on Vercel is missing the Supabase keys at *build time*, which means lazy-init only defers the explosion to first request — and if `next build` collects page-data on `/api/clients`, the deferred explosion fires inside `next build`. The fix isn't more lazy-init, it's either (a) provide the keys to the build env, or (b) exclude that route from page-data collection (`export const dynamic = 'force-dynamic'`). 30 minutes with `codex-adversarial` would surface this. But Contrarian's point stands — if attempt #4 doesn't unblock, we ship the bypass and fix forensics in a follow-up sprint. **Concede:** SYN-953 cannot be allowed to block Q2 priorities for another week. Hard timebox.

**Compounder (responds to Contrarian #3):**
Concede on agent capability — `codex-security-auditor` is the correct senior, but the bottleneck is human triage, not agent. The actionable form of my Round-1 position is: (1) Phill spends 30 minutes scanning the 9,400 findings for the *categories* (e.g., "outdated curl in CI image" × 800 = one fix), (2) we open one Linear ticket per category, (3) `codex-security-auditor` is dispatched against each. The compounding is real but only if step 1 happens. If step 1 doesn't happen, my Round-1 position collapses.

**Revenue (responds to Contrarian #1):**
Concede on the webhook. Don't kill the webhook — *coalesce* the auto-tickets into the parent root-cause ticket (SYN-953) so we don't pile up SYN-957/958/959 next time. The webhook stays; the de-dup logic gets added. **Cite Architect:** if SYN-953 itself ships a bypass and goes green this week, the auto-ticket cascade stops naturally.

**Market Strategist (cross-examines Moonshot):**
*Three names, Moonshot. The Custom Oracle named JAIX, RPM Global, Vercel. They're real comparables. You named "Vercel/Replit/Cursor" but only as an aspiration. Where is the evidence that a vertical-wedge restoration play (RA) is less defensible than a horizontal-orchestrator play that doesn't yet have a single design partner? The Oracle's data says vertical-wedge wins ANZ exits at 8-14x. You're proposing a horizontal pivot with no commercial validation against an existing vertical wedge with App-Store-approved product.*

**Moonshot (responds, position weakens):**
Concede no design partners exist. The moonshot position requires: 90 days of design-partner outreach BEFORE it earns budget. Without that, my Round-1 take is premature. Revised position in Round 3.

**Custom Oracle (responds to nobody specifically — adds context):**
One more pattern. **Canva → Simtheory + Ortto, April 2026.** Canva (the buyer) is targeting bolt-on AI tooling specifically because their internal AI capability is uneven. The bolt-on play means *you sell the capability, not the company*. If Phill's empire has a saleable capability, it's the orchestration layer (Pi-CEO + ceo-board + senior agents). But — and this is critical — Canva is buying *operating teams that have shipped to real customers*, not solo-built tooling. The orchestrator-as-product moonshot would need at least 3-5 paid users (not free design partners) before any acquirer treats it seriously.

**Contrarian (final cross-exam push):**

*Product Strategist, you said "the user is the person at CCW." Sarah Chen, ops@ccw.com.au. **When was the last time anyone on this stack actually talked to her?** Not "we sent an email", not "we shipped a feature she asked for." Talked. If the answer is "I don't know" or "more than 14 days ago", we have no signal on whether priority #1 is actually being executed.*

**Product Strategist (responds, with concession):**
Don't know. That's the answer. Concede: priority #1 has no measurable cadence. If CCW is the priority, the action is to schedule a recurring 30-minute call with Sarah Chen (weekly), and that should be in Linear with a senior-pm-relations owner. None of the 32 backlog tickets reference her name.

---

### ROUND 3 — REVISED POSITIONS

**Revenue:** Strongest counter (Contrarian) — don't kill the webhook, coalesce. Revised: (1) Coalesce SYN-954/955/956 into SYN-953 with de-dup logic, (2) freeze new backlog intake until SYN-953 ships, (3) reconcile CCW ARR as a P0 founder action — the $2,400 vs $33k delta makes every revenue calculation in this brief noise. Position holds: revenue concentration on CCW + RA, kill nothing yet, but stop accepting new backlog.

**Product Strategist:** Strongest counter (Contrarian's Round-2 challenge — "when did anyone last talk to Sarah Chen") flipped my framing. Revised: priority #1 is unmeasurable until a weekly cadence exists. New action: create one Linear ticket "CCW weekly check-in cadence — owner: founder, 30min/week, NPS pulse + roadmap input." Without that, every other ticket is theoretical.

**Technical Architect:** Strongest counter (Contrarian — fourth-attempt-fallacy). Revised: SYN-953 gets one final forensic pass via `codex-adversarial` skill (not a fix-pass, an analysis-pass). If that doesn't surface root cause in 90 minutes, ship bypass (`export const dynamic = 'force-dynamic'` on `/api/clients` + reset `next build` page-data collection scope). Hard timebox: green CI by EOD 2026-05-12 or bypass ships. Position holds: nothing else deploys until then.

**Market Strategist:** Strongest counter (Custom Oracle — "vertical-wedge wins ANZ exits at 8-14x"). Position holds and strengthens: RA launch wave is the vertical wedge. Either we execute it this week (SYN-921 NIR video Urgent — that's the unlock, not "all 9 sub-tickets in parallel") or we admit it's slop and re-allocate. No middle ground.

**Compounder:** Strongest counter (Contrarian — "bottleneck is human triage, not agent"). Conceded. Revised: my position is now contingent on Phill committing 30 min this week to security-finding categorisation. If that 30 min doesn't happen, my "carve 1 senior agent against security" recommendation is dead and security-debt is bloat that compounds quietly. **The 30-min triage IS the test of whether security debt is real or imagined work.**

**Moonshot:** Strongest counter (Market Strategist — no design partners). Revised dramatically: orchestrator-as-product is a 2027 question, not a 2026 question. Pull all moonshot energy back to: ship RA App Store launch flawlessly so the pattern (founder → senior agents → live App Store product) is a *demonstrable* asset before the v0.1 design-partner conversation. RA is the proof; the orchestrator becomes the offering only after RA validates the model.

**Custom Oracle:** Position unchanged. Vertical-wedge with discipline (JAIX pattern), validated by paid customers (Canva acquisition criteria). Translation for this brief: RA + CCW are the wedges; everything else is dilution. The orchestration tooling is a *byproduct*, not a product, until paid users say otherwise.

**Contrarian:** My Round-1 attacks all held: (1) autonomy starvation is demand-side trust, not supply-side mechanics — DON'T flip the labels until SYN-953 is green and CCW cadence exists; (2) reconcile CCW ARR as P0; (3) moonshot is on ice. New attack for the memo: **the "16 marketing seniors duplicated user→project" is the cleanest cut.** Sixteen senior-tier agents covering "marketing" for a 6-business portfolio with one paying customer is theatre. The pattern (user template + project binding) is fine as architecture; the *count* is bloat. Audit: how many of those 16 fired in the last 30 days against a real ticket? Anything below 5/16 is killable today.

---

## STAGE 4 — CONSTRAINT CHECK

**Technical Architect:**
- *Feasibility verdict:* All 9 line-items proposed below are technically feasible in ≤2 weeks each given the existing senior-agent stack.
- *Fatal constraints raised:* SYN-953 must be green or bypassed before any other deploy ships. This is a hard sequencing constraint.
- *Research-blocking opens:* CCW actual ARR. Without that, every revenue prioritisation is unfalsifiable. **Founder-only resolvable** (it's a contract Phill signed).

**Revenue:**
- *Commercial viability verdict:* All 9 line-items are zero-revenue in ≤90 days. That's fine if we accept this is operational hygiene, not growth investment. But we should not pretend any of them moves ARR. The closest is "RA launch executed this week" which has indirect revenue tail (App Store discovery → free downloads → upgrade funnel that doesn't yet exist).
- *Fatal constraints raised:* If CCW ARR is $2,400 not $33k, the entire portfolio is sub-scale and the right answer is *concentrate everything on closing customer #2 of CCW's profile*, not internal hygiene. **Decision is being made under this uncertainty.**
- *Research-blocking opens:* See Architect.

**Fatal constraints raised:**
1. SYN-953 sequencing — green or bypass before any other deploy.
2. CCW ARR reconciliation — founder must answer before next quarter's planning.

**Research-blocking opens:**
1. What is CCW's actual ARR ($2,400 or $33,000)? Founder-only resolvable.
2. What is SYN-953's actual root cause (build-time env vs. lazy-init)? Architect's 90-min `codex-adversarial` pass resolves this.

---

## STAGE 5 — FINAL STATEMENTS

**Revenue:** Freeze backlog intake; coalesce auto-CI tickets into SYN-953; reconcile CCW ARR this week.
**Product Strategist:** No backlog ticket counts until a weekly Sarah Chen cadence exists in Linear.
**Technical Architect:** SYN-953 green or bypassed by EOD 2026-05-12; nothing else deploys until then.
**Market Strategist:** Execute SYN-921 (NIR video, Urgent) as the RA launch unlock this week, or kill the launch wave and redeploy.
**Compounder:** 30 minutes of founder security-finding categorisation is the gate that decides whether security debt is real work or theatre.
**Moonshot:** Pull all energy back to RA App Store launch as the demonstrable proof; orchestrator-as-product is 2027.
**Custom Oracle:** Vertical wedges (RA + CCW) win ANZ exits; orchestration tooling is a byproduct until paid users say otherwise.
**Contrarian:** The 16 marketing seniors are the cleanest bloat cut — anything firing <5 of 16 in 30 days is killable today.

---

## STAGE 6 — THE MEMO

```
═══════════════════════════════════════
THE MEMO
Date: 2026-05-10
From: CEO
Re: Empire drift is mis-routed effort, not too many parts.
    Three cuts, three fixes, three funds.
═══════════════════════════════════════
```

### DECISION

The empire is not bloated by parts. It is mis-routed by *attention*. We will execute three cuts, three fixes, and three funds, in that priority order, over the next 14 days. The 32-ticket backlog gets re-anchored to two facts: (a) CCW retention is Q2 priority #1 and currently has no measurable cadence; (b) RA App Store launch is Q2 priority #2 and is two days past T-0. Everything else is either fuel for those two, or it is moved to a quarterly-review queue and stops consuming agent cycles. Pi-CEO autonomy will not be reactivated until SYN-953 is green and the CCW cadence exists — autonomy without trust is a parked car.

### TOP 3 BLOAT (kill / archive / coalesce)

| # | Item | Confidence | Priority | Vote tally |
|---|---|---|---|---|
| B1 | **Coalesce SYN-954/955/956 into SYN-953**; add webhook de-dup logic so future CI failures append to parent ticket instead of creating siblings | 95 | P0 | 9/9 |
| B2 | **Archive AEO Phase B/C (SYN-822 epic, SYN-824–832, 9 tickets)** to a "decision-blocked" view — they are not bloat by content but by status. They block 12 days waiting on CEO gates. Either flip the gates today or archive until a quarterly review. Do NOT keep them in active backlog generating ambient noise. | 85 | P1 | 8/9 (Compounder dissents — wants gates flipped instead) |
| B3 | **Audit the 16 marketing seniors** — list firings per agent in last 30 days. Anything <5 fired is killable; collapse user-level templates only, keep project bindings. Net: probably down to 6-8 active marketing seniors. | 80 | P1 | 7/9 (Moonshot, Custom Oracle dissent — argue keeping inventory for resale optionality) |

### TOP 3 SLOP (process drift · fix in place)

| # | Item | Confidence | Priority | Vote tally |
|---|---|---|---|---|
| S1 | **CCW weekly cadence is not in Linear.** Create one ticket "CCW weekly check-in — Sarah Chen, 30min/week, NPS pulse" — owner: founder, recurring. Q2 priority #1 currently has zero measurable execution against it. | 95 | P0 | 9/9 |
| S2 | **SYN-953 forensic pass via `codex-adversarial`** — 90 minutes hard timebox. If root cause not surfaced (likely: build-time env keys missing, not lazy-init), ship bypass: `export const dynamic = 'force-dynamic'` on `/api/clients`. Green CI by EOD 2026-05-12 or bypass ships. | 90 | P0 | 9/9 |
| S3 | **Wiki contradiction audit** — reconcile (a) CCW ARR ($33k vs $2,400 — founder must answer); (b) Synthex auth wiki claim (NextAuth.js documented, Supabase mandated by CLAUDE.md). Both contradictions degrade every future board's grounding. Founder-only resolvable. | 90 | P1 | 9/9 |

### TOP 3 ENHANCEMENTS (highest-leverage funds)

| # | Item | Confidence | Priority | Vote tally |
|---|---|---|---|---|
| E1 | **Execute SYN-921 (NIR explainer video) this week as the RA launch unlock.** Stop trying to run all 9 SYN-915 sub-tickets in parallel — pick the ONE Urgent ticket that proves the Remotion pipeline, ship it, then sequence the other 8 into the runbook. Pipeline test, not a parallel sprint. | 85 | P0 | 8/9 (Contrarian dissents — wants Sarah Chen cadence shipped first) |
| E2 | **30-min founder security-finding categorisation pass.** Founder spends 30 min scanning 9,400 findings, groups into 5-10 root-causes (e.g., "outdated curl in CI image" × 800), opens one Linear ticket per category, dispatches `codex-security-auditor` against each. Without the founder gate, security debt stays theatre. | 75 | P1 | 7/9 (Revenue, Moonshot dissent — argue this is sub-priority to CCW + RA) |
| E3 | **Re-anchor Linear backlog to operational priorities.** Add a label `q2-priority-{1..7}` matching the 7 priorities in operational-priorities-q2-2026.md. Anything not labelled gets moved to `Quarterly-Review` view. Pi-CEO autonomy poller scope tightens to `q2-priority-1` + `q2-priority-2` for next 14 days. THIS is the autonomy un-starvation move — not flipping a label, but tightening what the poller is allowed to claim. | 80 | P1 | 8/9 (Custom Oracle dissents — argues prioritise external comps over internal taxonomy) |

### THE DISSENT THAT ALMOST CHANGED MY MIND

The Contrarian's Round-2 cross-exam of Product Strategist — *"when was the last time anyone talked to Sarah Chen?"* — was the closest the board came to flipping the entire memo structure. The honest answer to that question is *we don't know*. If the answer turns out to be "more than 14 days", the correct decision is **not** the nine-item triage above; the correct decision is *pause everything, founder spends a full day on CCW*, and we re-convene the board next week with a real customer-relationship state.

Why I didn't flip: S1 (CCW weekly cadence) is the highest-priority slop fix in the memo (P0, 9/9 vote). It commits to exactly the action the Contrarian's challenge demands, while letting the rest of the board's verdicts run in parallel. If S1 ships within 7 days and Sarah Chen is in Linear with a recurring slot, we have addressed the Contrarian's challenge structurally. If S1 doesn't ship in 7 days, the memo failed at its #1 verdict and we re-convene immediately.

### WHAT WOULD CHANGE THIS DECISION

1. **CCW ARR turns out to be $2,400 not $33k.** Then portfolio is sub-scale and the right call is *all hands on CCW customer #2 acquisition*, not internal triage. Memo gets rewritten.
2. **SYN-953 forensic pass surfaces a fundamentally different root cause** (e.g., a Vercel platform regression rather than our code). Then the bypass logic in S2 is wrong and we escalate to Vercel support, not ship a workaround.
3. **The 16-marketing-seniors audit (B3) shows >12/16 fired in 30 days.** Then it's not bloat, it's appropriately-sized inventory and B3 is dropped.

### RESEARCH GAPS

Stage 1.5 was skipped (internal brief). Two open questions surfaced in deliberation, both founder-resolvable:
1. CCW actual ARR — blocks all revenue prioritisation. **P0 founder action.**
2. SYN-953 root cause (build-env vs. lazy-init) — Architect's 90-min `codex-adversarial` pass resolves this. **Action item, not a true open question.**

### NEXT ACTIONS

| # | Action | Owner | Timeline | "Done" looks like |
|---|---|---|---|---|
| 1 | **CCW weekly cadence ticket created in Linear** (S1) | senior-pm | 2026-05-11 EOD | One Linear ticket with recurring weekly Sarah Chen slot, owner: founder, first call scheduled within 7 days |
| 2 | **Coalesce CI auto-tickets into SYN-953 + add de-dup logic** (B1) | senior-pm + Pi-CEO webhook handler (RA-847) | 2026-05-12 EOD | SYN-954/955/956 closed as duplicates; webhook code patched to append to parent on existing-ticket-match |
| 3 | **SYN-953 forensic pass + bypass-if-needed** (S2) | codex-adversarial → senior engineer | 2026-05-12 EOD | Green CI on main, OR bypass shipped with follow-up ticket for forensics |
| 4 | **Founder resolves CCW ARR + Synthex auth wiki contradictions** (S3) — RESEARCH GAP #1 | founder | 2026-05-13 EOD | Both wiki pages updated, single source of truth, MEMORY.md note |
| 5 | **Execute SYN-921 NIR explainer video** (E1) | marketing-orchestrator + remotion-* skills | 2026-05-15 EOD | Video shipped to Supabase + Linear + Telegram per pipeline spec |
| 6 | **Archive AEO Phase B/C tickets to Quarterly-Review view** (B2) | senior-pm | 2026-05-11 EOD | 9 tickets moved out of active backlog; if CEO chooses to flip gates instead, comment on the parent epic |
| 7 | **Marketing-senior firing audit** (B3) | senior-pm + grep across `~/.claude/skills/` invocation logs | 2026-05-13 EOD | List of 16 with firing-count-30d; recommendation memo for which to retire |
| 8 | **Founder 30-min security categorisation** (E2) | founder | 2026-05-14 EOD | 5-10 category tickets created, codex-security-auditor dispatched against each |
| 9 | **Re-anchor backlog with q2-priority-* labels + tighten autonomy poller scope** (E3) | senior-pm + Pi-CEO autonomy config | 2026-05-15 EOD | Labels applied, poller config tightened, first non-zero `found:N` poll observed in integration-health.jsonl |

### RISK TO WATCH

**The most dangerous assumption baked into this memo is that the founder has 30+ minutes of focused-attention budget for items 4, 8, and the Sarah Chen call this week.** Every senior-pm action above presumes founder gates clear in time. If they don't, the autonomy starvation persists, the backlog re-anchoring becomes lipstick on the same problem, and we re-convene next week with the same brief. The memo's load-bearing dependency is not the agents — it's the founder's cycles.

```
═══════════════════════════════════════
END MEMO
═══════════════════════════════════════
```

---

## STAGE 7 — WIKI WRITE-BACK

Skipped — this memo concerns multiple businesses (synthex, restore-assist, dr-nrpg, ccw, pi-ceo) and the cross-cutting empire layer. Per Stage 7 guidance, single-business write-back is mandatory; multi-business write-back is at CEO discretion. Decision-memo file is the canonical reference at `~/2nd Brain/2nd Brain/Wiki/decisions/2026-05-10-empire-overview.md`.

The Stage 4 senior-pm routing (next stage of plan) will create Linear tickets for each of the 9 NEXT ACTIONS above, with this memo URL in each ticket description. That serves as the cross-business write-back surface.

---

## POSTSCRIPT — Stage 4b execution findings (2026-05-10 09:30 AEST)

After the memo was issued, the Architect (executing S2 forensic pass) discovered the brief was working from stale data and several conclusions had to be revised. Logging here for board's record-keeping integrity (per Compounder's Round-2 note: *"the bottleneck is human triage, not agent capability"* — the same applies to memos).

### S2 retrospective — SYN-953 was actually fixed before the memo published

**Verified:** Latest Deploy run on `main` (`gh run list --workflow=deploy.yml`) shows `conclusion: success` at **2026-05-10T08:10:22Z** on commit `257376d0` — PR #225 (`fix(SYN-953): lazy-init Supabase in monitoring routes (third pass)`). The 4th lazy-init pass landed green ~30 min before the board convened.

**Live verification per CEO directive `verification-gate.md`:**
```
$ curl -s -X POST https://synthex.social/api/demo/analyze \
    -H "Content-Type: application/json" -d '{"url":"https://google.com.au"}'
HTTP 200 · 1.38s
{"businessName":"Google","industry":"local business","caption":"...","loadedOk":true}
```

✅ All required keys present, no `error`, industry classification correct (also resolves SYN-853 retrospectively).

**Implication for board's S2 verdict:** real lazy-init won. The bypass option (`export const dynamic = 'force-dynamic'`) was unnecessary. The Architect's Round-2 hypothesis ("build-time env mismatch") was wrong — three engineers DID find all the module-level Supabase calls eventually; it just took 4 passes. **Pattern recognition matters: PR-merge-auto-close + post-merge CI failure is normal flow when fix-passes are iterative; the auto-ticket cascade just made it look like ongoing failure.**

### B3 audit complete — all 16 marketing seniors scored 0/30d invocations

Empire-wide scan of 1,811 jsonl session files (all Claude Code projects, 30-day window). Result: **0 invocations across all 16 project-level marketing skills.** Sanity check against `empire-status` (3 invocations today), `wiki-ingest` (1), `ceo-board` (1) confirmed pattern works. All 16 skills last-modified 2026-05-05 — generated as a batch, no organic adoption.

**Confidence raised from 80 → 95 on B3 verdict.** Recommendation downgraded from "audit then cut" to "archive immediately to `.claude/archived/2026-05-10/marketing-seniors-unused/`". Awaiting human approval per CLAUDE.md "never delete files" hard rule.

### E3 phase 1 complete — 7 q2-priority labels created, 3 applied

| Label | Synthex ID | Applied to |
|---|---|---|
| q2-priority-1 (CCW) | 36d6e19f | SYN-957 |
| q2-priority-2 (RA App Store) | 58a263fa | SYN-915 (parent), SYN-921 (NIR video unlock) |
| q2-priority-3..7 | created | not yet applied |

`pi-dev:autonomous` already exists. Phase 2 (Pi-CEO poller config tighten) and Phase 3 (Quarterly-Review view) remain founder-gated.

### Bonus finding — SYN-915 is also closed-but-not-done

While labelling, discovered SYN-915 (RA launch wave parent epic) is `status: Done, completedAt: 2026-05-08T08:47:19.415Z` — but its 9 sub-tickets (SYN-916..924) are all still `Backlog`. Same premature-close pattern as SYN-953: parent closed when App Store build approved, but the marketing wave (sub-tickets) is the actual deliverable.

**Implication for board's E1 verdict:** SYN-921 (NIR video) is still the right unlock, but the parent SYN-915 should be reopened OR the sub-tickets should be re-parented under SYN-925 (or a new "RA marketing wave" parent). Either way, **the wave hasn't been executed**, only the App Store technical work was.

### Net Linear state after Stage 4 + 4b

```
Before plan:   1 In Progress · 1 Todo  · 32+ Backlog · 0 Duplicate
After Stage 4: 0 In Progress · 6 Todo  · 32+ Backlog · 3 newly Duplicate (954/955/956)
After 4b:      0 In Progress · 5 Todo  · 32+ Backlog · 3 Duplicate (SYN-953 re-closed Done)
                              ^                       ^
                              5 board memo tickets    fix-pass eventually worked
                              (SYN-957..961)          (~30 min before board convened)
```

7 q2-priority labels live in Synthex workspace. 3 applied. CCW + RA wave properly tagged.

### Memo's Risk to Watch revised

Original: *"the founder has 30+ minutes of focused-attention budget for items 4, 8, and the Sarah Chen call this week."*

Revised after 4b execution: **the founder has been the bottleneck on triage hygiene more than on engineering execution**. SYN-953 took 4 PRs but landed without founder intervention. The marketing audit (B3) ran cleanly without input. The labels (E3) created themselves. **The founder-gates that genuinely block:** wiki contradictions resolution (S3), 30-min security categorisation (E2), Sarah Chen cadence first call (S1), Pi-CEO poller config push (E3 phase 2), AEO archive ruling (B2). Five gates, total ~3 hours of founder time. That's the actual load-bearing dependency.
