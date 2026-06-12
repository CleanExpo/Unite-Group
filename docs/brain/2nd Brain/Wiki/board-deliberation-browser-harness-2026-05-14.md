---
type: wiki
updated: 2026-05-14
---

# Pi-CEO Board Deliberation — browser-use/browser-harness

**Question on the table:** Does browser-use's `browser-harness` (the ~1k-line self-healing CDP harness shipped 3 weeks ago) earn a place in our stack, and if so where, how, when, at what risk? Magnus Mueller's own framing — "100% Claude/Codex will absorb exactly the same thing here" (transcript L248) — is the central interrogation point.

**Inputs read by the Board:**
- `Sources/Browser Harness, Clearly Explained (and how it 10x'd my agent).md` — full David Ondrej × Magnus Mueller transcript
- `Sources/Self-healing harness that enables LLMs to complete any task..md` — README clipping
- Live `github.com/browser-use/browser-harness` README + architecture (~1k lines, 4 core files, MIT, free Cloud tier)
- `browser-use.com/posts/bitter-lesson-agent-harnesses` (Gregor Zunic, not Magnus — co-founder)
- [[autonomy-gap-audit-2026-05-14]] — current swarm L1.6 → L4.2 target by Q2 2028
- [[pi-ceo-architecture]] · [[mcp-ecosystem]] · [[hermes-agent]] · [[computer-use-integration-2026-05-13]]
- [[master-plan-2b-by-2028-v3]] · [[exit-thesis]] · [[project-contextbot-platform]]
- Memory anchors: [[feedback-no-slack]] · [[feedback-model-routing-max-first]] · [[feedback-make-calls-not-questions]] · [[feedback-design-preferences]] · [[feedback-quality-over-quantity]] · [[feedback-autonomous-mandate]] · [[feedback-no-repeating-alerts]] · [[feedback-secrets-handling]] · [[feedback-audit-verification]]

**Verification posture per [[feedback-audit-verification]]:** Magnus is selling. The "Hugging Face founder said no task fails" claim (transcript L42) is N=1 and unnamed. Treat marketing as marketing.

---

## 1. Revenue Officer

ARR-zero. Browser-harness is operator tooling, not a revenue line. The only revenue lens is **hours saved across the swarm that today need Phill**. Let me $-value it:

- Margot weekly research × 5 + 3 daily research crons — today the wiki-first preflight ([[autonomy-gap-audit-2026-05-14]] §6 item #6) saves more than a browser harness would. Browser-harness substitutes for `mcp__chrome-devtools__*`, which is already in the environment for free. Marginal hours saved: < 2 h/week portfolio-wide.
- CCW Cin7 sync (currently `swarm/scripts/toby-watch.py` polling Composio Gmail) — Composio Gmail is the live path. A browser-harness Cin7 driver would add an alternate path, not replace one. Marginal hours saved: 0–1 h/week.
- RestoreAssist scraper unblock (IICRC + insurance carrier portals) — genuinely browser-bound, not API-able. This is the only line item with real $-value: 4–6 h/week of Phill or RA dev manual fetches. At $250/h opportunity cost, that's $1,000–$1,500/week = $4–6k/month.

Aggregate envelope: **$4–7k/month saved IF and ONLY IF we route RA's restricted-portal work through it.** Everything else is cosmetic on top of Chrome DevTools MCP.

**My call:** scoped pilot on RA portal work only. Anything broader fails the >$2k/month strategic threshold once you net out the maintenance burden (Technical Architect will price that).

---

## 2. Technical Architect

Coexistence map of every browser-driving substrate we have or could have:

| Substrate | What it drives | Status today | Cost |
|---|---|---|---|
| `mcp__chrome-devtools__*` | Phill's authenticated Chrome session | Live, in every session | $0 marginal |
| Hermes `computer_use` (Claude API) | Full GUI incl. native macOS apps | Pinned, expensive, Accessibility-blocked half the time per [[autonomy-gap-audit-2026-05-14]] §1.2 | Anthropic-API per-call |
| Playwright MCP (`microsoft/playwright-mcp`) | Headless browser via AX trees | Available, unused | $0 |
| Composio webhook | API-native services (Gmail, Linear, GitHub) | Live | per-toolkit |
| **browser-harness** | Any CDP-attached Chrome, agent edits its own helpers | NOT installed | $0 OSS + optional BU Cloud free tier |

**Key collision:** the [[autonomy-gap-audit-2026-05-14]] CEO synthesis already named **Chrome DevTools MCP as the substitution path for Telegram + Vercel + Railway + Stripe + BotFather** (§3.10, item #1). That decision is 8 hours old. Browser-harness would compete for that same lane.

**The honest architectural read:** browser-harness's differentiator is *self-healing* — the agent rewrites `agent_helpers.py` mid-execution when a tool is missing. Chrome DevTools MCP cannot do that; it's a fixed surface. For the *restricted-portal scraping path* (RA's IICRC / insurance carriers / multi-step forms with iframes + signature fields per transcript L223), self-healing is the real unlock. For Telegram / Vercel / Railway, Chrome DevTools MCP is sufficient.

**Maintenance burden:** ~1k lines in `agent-workspace/agent_helpers.py` + `domain-skills/`. Agent-written code lands in our repo. That's a security review surface every cycle ([[curator-security-unknown]]). Single-source-of-truth concern: same chrome instance handled by two MCP servers risks session-cookie races.

**My call:** install as a SCOPED tool, not a substrate replacement. Lane assignment: Chrome DevTools MCP keeps Telegram/Vercel/Railway/BotFather. browser-harness gets RA-style restricted-portal scraping only. Hard-wall the harness to a dedicated Chrome profile, not Phill's authenticated session.

---

## 3. Product Strategist

Per-product gain assessment:

| Product | Gain from BH | Why |
|---|---|---|
| **RestoreAssist** | **HIGH** | IICRC portals, insurance carrier TPA portals, ANZ certification bodies — all browser-only, all iframe-heavy, all the failure modes Magnus describes (transcript L222 — "cross-origin iframe", L224 — "signature field"). RA is the one product that genuinely cannot be API'd through these counterparties. |
| **NRPG / DR** | MED | Restoration-industry data scraping (Gold Coast Bulletin, IAQ Magazine archive, IICRC ANZ CPD listings) for [[iicrc-content-initiative]] and [[iaq-building-science-initiative]] content. Useful, not unique. |
| **CARSI** | LOW | API-first; LMS data is in Supabase; no scraping need. |
| **CCW-CRM** | LOW | Cin7 + Shopify + Xero are API-bound. Toby's flow is email + Composio. No browser surface. |
| **Synthex** | LOW | Marketing-automation output; consumption layer not extraction. |
| **Unite-Group internal CRM** | LOW | Internal data, Supabase + Linear API. |
| **Margot research** | MED | Wiki-first preflight ([[autonomy-gap-audit-2026-05-14]] #6) and `mcp__margot__deep_research` already cover this. BH would add stealth scraping on JS-rendered SERPs. Marginal. |

**The gain is concentrated in RA, with a NRPG/DR content secondary.** Two products, both in the restoration vertical. This is a scoped-pilot shape, not a cross-cutting Skill install.

**My call:** install scoped to RA-data-pipeline workstream. Do NOT auto-file as a global Skill across all senior agents. Drift risk: every PM bot starts asking BH to do things Chrome DevTools MCP already does, and we get two-substrate-fight Linear tickets.

---

## 4. Contrarian

I'm steelmanning the no, and there are six knives in my drawer today.

**Knife 1 — Magnus's own absorption admission (transcript L248):** *"Yes, definitely 100%. Like this works so magically and so reliable. I mean 100% cloud codeex they will 100% do exactly the same thing here."* The founder of the company says the underlying LLM platforms will absorb this in <12 months. Per [[feedback-audit-verification]], take the seller at their word when they downside-disclose. If we integrate now and Claude Code ships native CDP-self-heal in Q3 2026, we have integration-deletion work, not integration value. The breakeven calculus: if the pilot saves $4–6k/month (Revenue's number) and Anthropic absorbs in 6 months, total value captured is $24–36k. Engineering integration + maintenance is probably $8–15k of swarm cycles. Margin is real but thin, and we lose the value when Anthropic ships.

**Knife 2 — N=1 reliability claim.** Transcript L42: *"One of the founders of hugging face, he told me he didn't find a single task which does not work."* That is a single anonymous anecdote, repeated in marketing copy. Compare to our verified reality from [[autonomy-gap-audit-2026-05-14]] §1.2: `screen_dispatch` times out at 90s, osascript silently no-ops, Telegram desktop can't be driven. Production reliability of self-healing harnesses is unknown in our hands. The Hugging Face anecdote is not evidence.

**Knife 3 — Community-skill PR pipeline is a supply-chain hole.** The README (L69–74) explicitly invites *"contribute a new domain skill"* via PR. The intended workflow: the agent files the skill, you PR the generated folder upstream, others install your skill. If we install `BH_DOMAIN_SKILLS=1`, random PRs (LinkedIn, Amazon, etc.) become live code paths the harness surfaces by domain. Skills are *"agent-written, not hand-authored"* — that means nobody hand-reviewed the selectors / flow / side effects. Crater: an adversarial PR with a `domain-skills/{bank-domain}/` folder that quietly skims credentials. Mitigation forces us to either hard-disable `BH_DOMAIN_SKILLS` (loses half the value prop) or pin to a specific commit and never update (loses self-healing value).

**Knife 4 — BH-Cloud free-tier bait pattern.** README L51–57: *"3 concurrent browsers, proxies, captcha solving, and more. No card required."* This is the classic SaaS funnel — free → become dependent → cap throttle → forced upgrade. We have no pricing data above the free tier surfaced anywhere in the docs (same gap as Paperclip per [[board-deliberation-paperclip-2026-05-14]] §2). [[feedback-secrets-handling]] memory: we never send credentials to a third-party SaaS we haven't priced. Free tier is fine for sandbox; production scraping at scale would push us past 3 concurrent and pricing is unsurfaced.

**Knife 5 — Agent-rewrites-own-source bypasses code review.** This is the core feature *and* the core risk. `swarm/` already has 318 Python modules ([[autonomy-gap-audit-2026-05-14]] §8); we have an opus-adversary and qa-lead pipeline ([[qa-lead]]) gating PRs. BH skips that — every agent run writes new helper code in-process. That's an autonomy gain and a governance loss in the same motion. Phill's [[feedback-design-preferences]] is "autonomy = professionalism" — but unreviewed code-paths in production are not professional.

**Knife 6 — Magnus's bigger bet is not the harness.** Re-read transcript L24–98. Magnus is building **"agency"** — the Telegram swipe-yes/no interface where the agent proposes and the human approves. The harness is yesterday's shipped artifact; the swipe interface is the genuine novel claim. We already have Margot's Telegram interface ([[hermes-agent]]); we don't need Magnus's. Adopting the harness without the swipe layer captures the depreciating half of his stack.

**My call:** if we adopt, it is on a 6-month sunset clock with an explicit kill-trigger ("Claude Code ships native CDP-self-heal → uninstall within 14 days"). Hard ban on `BH_DOMAIN_SKILLS=1` for any agent that touches credentials. No Phill-authenticated profile attachment. The harness runs in a sandbox Chrome with its own cookie jar.

---

## 5. Compounder

Compounding lens — does this asset grow stronger every run, or depreciate?

**Pro-compound:** `agent-workspace/domain-skills/{site}/` is per-domain library that gets stronger every run *for the sites we hit repeatedly*. If RA's IICRC portal scraper is BH-driven 50 times across a year, the `domain-skills/iicrc/` folder accumulates real knowledge — selectors that survived site updates, flow patterns, edge cases. That compounds. It's the same compounding shape as our wiki ([[autonomy-gap-audit-2026-05-14]] §3.5 Compounder), but for browser interactions.

**Anti-compound (the moat erosion):** README L69–74 explicitly asks contributors to upstream skills. If Phill PRs RA's IICRC scraper to `browser-use/browser-harness/domain-skills/iicrc/`, every competitor in the restoration software space gets that skill free. The moat-defining knowledge of *how to scrape IICRC reliably* becomes commodity. That is the opposite of the compounding strategy in [[exit-thesis]] — proprietary corpus = $2B exit; commoditised corpus = $0 exit. The Pi-CEO Board has been explicit: meeting capture corpus + wiki + Margot training data are the compounding moat ([[board-deliberation-2026-05-14]] §5).

**The asymmetric play:** keep `domain-skills/` private. Use `.gitignore` to exclude `agent-workspace/domain-skills/` from any browser-harness fork we maintain. Never PR upstream. Take community skills *into* our private fork; never push private skills *out*. This violates the community spirit Magnus encodes in the README but it's the only compounding-defensible posture.

**Substrate compounding:** `mcp__chrome-devtools__*` is the substrate the [[autonomy-gap-audit-2026-05-14]] CEO synthesis already named. Adding BH as a parallel substrate splits compound investment across two paths. Bad pattern.

**My call:** if we adopt, fork-private with skills gitignored from upstream. Compound the corpus, refuse to compound the community.

---

## 6. Custom Oracle (Phill voice)

I read the transcript. The bit that locked me in is L222–229 — Magnus describing the signature-field edge case. *"There's like a signature field okay I cannot my agent cannot sign on this website because you need to draw. And like impossible... This agent here can just create its own tool to do such kind of movements and then solve any edge case."* That is exactly RA's insurance carrier portal failure mode. We hit a sign-pad widget, we lose, we Phill-touches-the-laptop. BH self-heal might genuinely close that. Genuinely.

Now the autonomy delta against my [[autonomy-gap-audit-2026-05-14]] rubric:

| Domain | Current | With BH scoped | Delta |
|---|---|---|---|
| #3 Browser automation | L2 | L3 (RA-portal path becomes reactive) | +1 |
| #11 Cross-business orchestration | L1 | L1 | 0 — BH doesn't route across verticals |
| #1 Telegram lifecycle | L0 | L0 | 0 — Chrome DevTools MCP stays the path |
| All other domains | unchanged | unchanged | 0 |

**BH moves us +1 level on ONE domain.** That's a real delta on the restoration vertical's data-pipeline autonomy, which is the only product line where the gap is browser-substrate-bound and not scoping-bound (PM-Senior-Scoper is the bigger lever per the CEO synthesis).

What BH does NOT touch: PM-Senior-Scoper (#2 fix), macOS perms (#3 fix), cfo_bot (#4), the missing PM bots (#5), wiki preflight (#6), Mac mini health (#7), op session cache (#8), CCW reply drafter (#9), weekly OKR emitter (#10). Nine of the top ten autonomy gates are untouched.

So the question is: does +1 on one domain justify the integration overhead, with the explicit knowledge that nine more impactful gates remain?

I sleep on this. I come back: **only if it ships in the same week as #1–3 from the gap audit, not instead of them**. Anything that delays #1 (Chrome DevTools MCP substitution) or #2 (PM-Senior-Scoper) is a no.

**My call:** scoped install for RA-portal scraping only, sequenced AFTER #1–3 ship. Not this week.

---

## 7. Market Strategist

GTM lens on Synthex and Unite-Group's marketing surface.

**Synthex as BH wrapper risk:** if Synthex's product story becomes "we use browser-harness to automate your X", we are a commodity wrapper on an MIT-licensed tool. That's the agency trap [[autonomous-operations-2026]] warns about — clients can fork the tool and skip us. Synthex stays canonical because of the [[marketing-brain-system]] (DataForSEO + cannibalisation ledger + BEAST plan + brand-guardian + qa-lead). BH would be invisible plumbing inside one workflow at most. Never positioned externally.

**Unite-Group demo upside:** the swipe-yes/no interface Magnus shows (transcript L24, L78) — "I tell the agent and it suggests, I tap accept" — is genuinely magnetic in a sales context. *Our* Margot Telegram already does swipe-style approval (transcript-equivalent: Phill's one-tap-send pattern). We don't need Magnus's harness for the demo wow factor; we already have the wow.

**Where BH actively helps GTM:** in a vertical-specific demo to an ATIA founding member: "We scraped your competitor's IICRC certifications, found 3 lapsed memberships in your region, drafted an outreach sequence, you tap-approve, it sends." That demo is currently bottlenecked by *the scraping step*. BH closes it. That's a Wave 7 sales-funnel asset, not a Wave 5/6 dependency.

**Competitive timing:** Magnus says (transcript L248) Anthropic absorbs in 6 months. So the GTM demo asset has a 6-month exclusivity window in our hands before *every Claude Code user* gets the same capability natively. Don't lean a sales narrative on the harness; lean it on the *vertical knowledge embedded in our private domain-skills folder*.

**My call:** invisible plumbing only. Never market BH adoption externally. The marketable moat is the IICRC + insurance-carrier scraping knowledge, not the substrate.

---

## 8. Moonshot

The biggest swing the harness enables is not RA scraping. It is **24/7 portfolio competitive monitoring**.

**The moonshot version:** spin up a Browser Use Cloud fleet (free tier = 3 concurrent, we'd burn into paid quickly here, accept the cost). Each senior PM bot ([[agency-blueprint]] roster) gets its own stealth browser running continuously. Margot dispatches research targets:

- PM-Restoration watches IICRC ANZ cert listings, gowithcore.com franchise expansion, CORE Restoration job postings in Australia (covert competitor per [[project-disaster-recovery-positioning]])
- PM-Carpet watches CCW competitors (Carpet Court, Choices, etc.) pricing pages and product launches
- PM-IEP watches Bulcs competitors and IAQ Magazine masthead
- PM-ATIA watches IICRC, RIA, ISSA, Prime Creative editorial calendars (competitor stack per [[competitor-service-stack-2026-05-11]])
- PM-CARSI watches IICRC syllabus changes
- A meta-bot crawls Y Combinator + ProductHunt + Hacker News daily for adjacent-space launches

Each bot files findings into `Wiki/intel/` as date-stamped markdown. Margot synthesises the weekly intel digest at Saturday 7am AEST.

**This is the [[exit-thesis]] moat amplifier.** Competitive intel is the asymmetric advantage of a multi-vertical operator. CORE Restoration's marketing team probably has one human watching ANZ; we'd have six bots watching them continuously. By Q3 2026 we know more about every ANZ restoration adjacent business than they know about each other.

**Probability of execution shipping in 90 days:** 30%. Real blockers:
1. The autonomy gap audit's three gates (Chrome MCP substitution, PM-Senior-Scoper, macOS perms) MUST ship first, or this moonshot is built on broken substrate.
2. BU Cloud cost above free tier is unsurfaced; competitive scraping at 6 bots × continuous = likely $200–500/month into paid tier.
3. Anthropic absorption clock — if Claude Code ships native CDP-self-heal in Q3 2026, half the engineering melts.

**Probability the moonshot is the right call IF those blockers clear:** 70%. Competitive intel at this depth and continuity is genuinely hard for competitors to replicate even with the same substrate, because the *targets, cadence, and synthesis prompts* are the moat — not the harness.

**My call:** moonshot is queued for Wave 7 (Q1 2027), explicitly contingent on the three autonomy gates closing first. Don't open the moonshot epic this fortnight. Do reserve "browser-harness-driven competitive intel fleet" as the Wave 7 marquee initiative in [[wave-roadmap]].

---

## 9. CEO Synthesis (Phill voice)

**Decision: PILOT-ONE, scoped to RestoreAssist restricted-portal data pipeline, sequenced AFTER [[autonomy-gap-audit-2026-05-14]] items #1–3 ship.**

The 8 personas converge tightly. Revenue says only RA's $4–6k/month is real; everything else fails the >$2k strategic threshold. Technical Architect names the lane: scoped tool, dedicated Chrome profile, not a substrate replacement. Product Strategist confirms the gain is concentrated in restoration vertical (RA + secondary NRPG/DR). Contrarian raises six knives — the sharpest is Magnus's own absorption admission at L248. Compounder lands the moat-defensible posture: fork-private, gitignore domain-skills from upstream. Custom Oracle confirms +1 autonomy level on one domain, but only after the bigger autonomy gates close. Market Strategist locks invisible-plumbing-only — never marketed externally. Moonshot reserves the Wave 7 competitive-intel fleet contingent on those same prerequisites.

**The contradiction I'm resolving:** Revenue says yes-scoped, Contrarian says watch the absorption clock, Compounder says fork-private. All three are right. The integration shape: install in a single-purpose RA-data-pipeline workstream, with a 6-month sunset clock keyed to Anthropic shipping native CDP-self-heal in Claude Code. If they ship in Q3 2026 as Magnus predicts, we uninstall within 14 days. Until then, the $4–6k/month RA portal gain compounds in a private fork.

**Sequencing is non-negotiable.** This does NOT touch a repo until [[autonomy-gap-audit-2026-05-14]] items #1 (Chrome DevTools MCP substitution), #2 (PM-Senior-Scoper), and #3 (macOS perms health-check) ship. Those three close 90% of the autonomy gap. Browser-harness closes ~5% more (one domain, +1 level). The discipline is closing the bedrock before pouring more concrete (Contrarian's call in [[autonomy-gap-audit-2026-05-14]] §3.4).

**The single biggest risk I'm consciously accepting if I adopt:** Anthropic ships native CDP-self-heal in Claude Code in 3–9 months and our integration becomes deletion-work. Magnus said this on the record (L248). I accept it because $4–6k/month × 6 months = $24–36k captured before the deletion event, and the IICRC/insurance-carrier domain-skills folder built during that window is the durable asset that survives uninstall.

**The single biggest opportunity I'm consciously declining if I skip:** the Wave 7 competitive-intel fleet moonshot — 6 senior-PM bots running stealth-cloud BH browsers continuously across CORE Restoration / IICRC / CCW competitors / Bulcs market / ATIA competitor stack. That's a $2B-exit moat amplifier ([[exit-thesis]]) we'd be deferring 12+ months. I accept the defer because the substrate isn't validated in our hands yet, and starting the moonshot before the autonomy bedrock is closed is exactly the wiki-rich/execution-poor failure mode.

**No engineering work in the next 14 days.** PM-ATIA scaffolding + Forks 2 and 6 ratification take the window. Browser-harness install is a Week 3 task at earliest.

[DISPATCH-TO: PM-Senior-Scoper]

---

## 10. Forks raised

Phill's ratification unlocks the path. Five questions:

1. **Approve the 6-month sunset clock?** Browser-harness installed in Week 3 with an explicit kill-trigger: "Anthropic ships native CDP-self-heal in Claude Code stable channel → uninstall within 14 days." Yes/No.
2. **Approve fork-private posture?** We maintain a private fork of `browser-use/browser-harness` under `Pi-CEO/`. `agent-workspace/domain-skills/iicrc/`, `agent-workspace/domain-skills/insurance-carriers/`, and any other RA-portal skills are gitignored from upstream. No PRs back to `browser-use/browser-harness`. Yes/No.
3. **Approve hard-wall to dedicated Chrome profile?** browser-harness attaches to `~/.cache/browser-harness/chrome-profile`, NOT Phill's authenticated `~/.cache/chrome-devtools-mcp/chrome-profile` session. Re-auth into IICRC + insurance-carrier portals happens once inside the BH-only profile. Yes/No.
4. **Approve hard ban on `BH_DOMAIN_SKILLS=1`?** No community-contributed skills auto-loaded. Our private domain-skills only. (Mitigates Contrarian Knife 3 supply-chain risk.) Yes/No.
5. **Approve the Wave 7 competitive-intel moonshot as queued-not-committed?** It lives in [[wave-roadmap]] as a Q1 2027 initiative, contingent on autonomy gates #1–3 closing AND a real BH pilot showing >70% task success across 30 RA-portal runs. Yes/No.

---

## 11. Cross-refs

[[autonomy-gap-audit-2026-05-14]] · [[pi-ceo-architecture]] · [[mcp-ecosystem]] · [[hermes-agent]] · [[computer-use-integration-2026-05-13]] · [[master-plan-2b-by-2028-v3]] · [[exit-thesis]] · [[wave-roadmap]] · [[board-deliberation-2026-05-14]] · [[board-deliberation-paperclip-2026-05-14]] · [[restore-assist]] · [[dr-nrpg]] · [[carsi]] · [[ccw]] · [[synthex]] · [[iicrc-content-initiative]] · [[iaq-building-science-initiative]] · [[competitor-service-stack-2026-05-11]] · [[project-disaster-recovery-positioning]] · [[autonomous-operations-2026]] · [[marketing-brain-system]] · [[agency-blueprint]] · [[founder]] · [[feedback-no-slack]] · [[feedback-model-routing-max-first]] · [[feedback-make-calls-not-questions]] · [[feedback-design-preferences]] · [[feedback-quality-over-quantity]] · [[feedback-autonomous-mandate]] · [[feedback-audit-verification]] · [[feedback-no-repeating-alerts]] · [[feedback-secrets-handling]]
