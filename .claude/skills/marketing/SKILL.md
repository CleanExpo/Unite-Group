---
name: marketing
description: Marketing METHOD — the frameworks behind conversion optimisation, AI-search visibility (AEO/GEO), programmatic SEO, buyer psychology, and pricing/packaging. Use when the question is how a marketing mechanism works or how to approach one: "why isn't this page converting", "how do we get cited by ChatGPT/Perplexity", "should we build location pages at scale", "what should we charge", "how do we structure tiers", "which psychological principle applies here". This skill supplies the method only — it never writes brand copy. For voice, claims and brand facts, the per-brand skills (restore, dr, nrpg, ccw, carsi, ato) always win; load one of those alongside this when the output is copy for a specific business.
---

# Marketing method — CRO, AI search, programmatic SEO, psychology, pricing

Five marketing disciplines distilled into one skill. Method only: this tells you
how the mechanism works and how to approach the decision. It does not write copy
and does not carry brand facts.

## Non-negotiables (these outrank every tactic below)

**1. The claims guardrail.** Never assert a capability, accreditation,
credential, result, customer count, or testimonial that the business cannot
evidence. This is the same guardrail the per-brand skills carry, and it applies
to every technique here. Several of these tactics — social proof, scarcity,
authority signals — are *specifically* the ones that tempt fabrication. A
number you cannot source is not a number you may use.

Compliance-sensitive brands where an invented claim is a real-world problem, not
a style issue: `carsi` (IICRC/CEC accreditation claims are fail-closed and
opt-in per course), `ato` (a TASA s90-5 tool, NOT a tax agent, and NOT the
government ATO), `dr` and `nrpg` (consumer vs contractor claims must not be
mixed). Load the brand skill and follow it.

**2. Scarcity and urgency must be real.** Only state a deadline, a seat limit, a
stock level or a price rise if it genuinely exists and will be honoured. A
fabricated countdown is a lie to a customer, and in Australia it is also
potentially misleading conduct under the ACL. The same applies to fake "X people
viewing", invented review counts, and decoy tiers nobody can buy.

**3. Third-party statistics in this file are UPSTREAM CLAIMS, not verified
facts.** Percentages quoted below (citation lifts, AI-Overview prevalence,
click-through impacts) come from the source repo and are reproduced here as
orientation only. They are `[UNCONFIRMED]` by this repo. Before any of them
appears in a client deliverable, a proposal, or a public page, re-verify it live
and cite the primary source — see the `live-verify` skill and end such output
with `Verified live <date>: <fact> — <source URL>`. Marketing numbers age
badly and this field moves monthly.

**4. Australian context.** en-AU spelling, DD/MM/YYYY, AUD, AEST/AEDT. Pricing
examples in AUD unless the market is explicitly offshore. GST-inclusive display
where consumers are the audience.

**5. Diagnose before prescribing.** Every section below opens with what to
establish first. Recommending tactics before knowing the conversion goal, the
traffic source, or the constraint is how marketing advice becomes noise.

---

## 1. Conversion rate optimisation (CRO)

**Establish first:** page type; the single primary conversion goal; where the
traffic comes from (organic, paid, email, social). Message-match to the traffic
source is the most commonly missed factor.

Work the dimensions in this order — they are listed by typical impact, so
stopping early still leaves the biggest wins captured.

1. **Value-proposition clarity.** Can a visitor tell what this is and why it
   matters inside about five seconds? Failure mode: feature-led instead of
   outcome-led, or too clever at the cost of clarity.
2. **Headline.** Carries the value proposition, is specific enough to mean
   something, and matches the ad or email that sent the visitor. Outcome framing
   ("get X without Y") and concrete specifics beat cleverness.
3. **CTA hierarchy.** One obvious primary action, visible without scrolling,
   with button copy that names the value ("Start free trial", "Get my report")
   rather than the mechanic ("Submit"). Repeat it at natural decision points.
4. **Visual hierarchy and scannability.** Someone skimming should still get the
   message. Whitespace and prominence do more than more copy.
5. **Trust signals.** Logos, attributed testimonials, case-study numbers, review
   scores — placed next to CTAs and immediately after benefit claims, which is
   where doubt occurs. Subject to the claims guardrail above.
6. **Objection handling.** Price/value, "will this work for my situation",
   implementation effort, and "what if it fails". Handle via FAQ, guarantees,
   comparison content, and transparency about process.
7. **Friction.** Excess form fields, unclear next step, confusing navigation,
   mobile breakage, slow loads. Remove before adding anything.

**Deliverable shape:** quick wins (do now) · high-impact changes (prioritise) ·
hypotheses worth testing rather than assuming · two or three copy alternatives
for headline and CTA with the reasoning.

**By page type:** homepage serves both ready-to-buy and still-researching, so
give a fast path plus a slow one. Landing pages match one message and usually
drop navigation. Pricing pages must answer "which plan is right for me". Feature
pages connect feature to outcome. Blog posts want contextual CTAs at natural
stopping points, not a banner.

---

## 2. AI search visibility (AEO / GEO)

The shift: traditional SEO gets you **ranked**; AI search gets you **cited**. A
well-structured page can be cited without ranking on page one, because AI
systems select passages on structure and trustworthiness, not position alone.

**Google versus everyone else — do not conflate them.** Google's own guidance
says no special markup, chunking, or AI-specific content is required for AI
Overviews, that its AI features run on core Search ranking, and that writing
separate content "for AI" risks its scaled-content-abuse policy. Other engines
(ChatGPT, Claude, Perplexity, Copilot) do materially reward extractable
structure and machine-readable files. The safe resolution, and the one to
default to: **write for people, organise for clarity** — that satisfies both.

**Three pillars.**

- **Structure — make it extractable.** AI systems lift passages, not pages. Lead
  each section with the direct answer; keep key answer blocks short and
  self-contained (roughly 40–60 words is the commonly cited target); use
  headings phrased the way people ask; use tables for comparisons and numbered
  lists for processes; one idea per paragraph. Useful block types: definition,
  step-by-step, comparison table, pros/cons, FAQ, and cited statistic.
- **Authority — make it citable.** Cited sources, specific dated statistics,
  named expert quotes, demonstrated first-hand experience, visible "last
  updated" dates, and clear author identity. Upstream cites Princeton GEO
  research (KDD 2024) ranking these lifts — cite sources ≈ +40%, statistics
  ≈ +37%, quotations ≈ +30%, while keyword stuffing *reduces* AI visibility.
  Treat those figures per non-negotiable 3.
- **Presence — be where AI looks.** Citations often come from third-party
  surfaces rather than your own domain: Wikipedia, Reddit, industry roundups,
  review sites (G2/Capterra for B2B), YouTube. Participate authentically; never
  fabricate mentions or astroturf.

**Machine readability.** Check `robots.txt` actually allows the bots you want to
be cited by — GPTBot and ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended,
Bingbot. Blocking them means those engines cannot cite you; that is a business
decision, not an oversight to leave undiscovered. Consider a plain-text or
markdown pricing file and an `llms.txt`, and keep prices in text rather than
images or behind "contact sales" — agents increasingly shortlist tools before a
human ever visits, and they cannot quote what they cannot parse.

**Citation is not recommendation.** Being cited means your page was useful to
consult; being *recommended* onto a shortlist is driven by web-wide consensus
(reviews, forums, analysts) and is largely outside your own content. Upstream
notes self-promotional "best [category]" listicles can backfire for emerging
brands, earning citations inside answers that then recommend competitors.

---

## 3. Programmatic SEO

Building many templated pages from data. The failure mode is thin content at
scale, which is a penalty risk rather than a growth lever.

**Principles.** Every page must earn its existence with value specific to that
page, not swapped variables. Proprietary data beats product-derived, which beats
user-generated, which beats licensed, which beats public. Use subfolders, not
subdomains, so authority consolidates. A hundred genuinely good pages beat ten
thousand thin ones.

**Common patterns:** templates · curation ("best X") · conversions ("X to Y") ·
comparisons ("X vs Y") · examples · locations ("service in suburb") · personas
("product for audience") · integrations · glossary · translations · directories ·
profiles. Patterns can layer ("best coworking spaces in Brisbane").

**Choosing:** proprietary data suits directories and profiles; an integration
surface suits integration pages; multi-segment audiences suit personas; local
presence suits location pages; a utility product suits conversion pages.

**Build sequence:** identify and validate the keyword pattern and real demand →
secure the data and its refresh path → design a template with genuinely
conditional content, not just variable substitution → wire hub-and-spoke internal
linking with no orphan pages → manage indexation deliberately (prioritise
volume, noindex the thin tail, split sitemaps by type).

**Pre-launch checks:** unique value and intent match per page; unique titles and
meta descriptions; correct heading structure; schema; acceptable page speed;
reachable from the site; in the sitemap; no conflicting noindex. Then monitor
indexation, rankings, engagement and conversion — and watch for thin-content
warnings and crawl errors.

**Traps:** city-swapped duplicate content, keyword cannibalisation between
pages, generating pages with no demand, stale data, and building for crawlers
rather than people.

---

## 4. Buyer psychology

Thinking tools for why people decide. Apply them to understand behaviour, never
to manufacture pressure — see non-negotiables 1 and 2. Everything here is
ethical only when the underlying fact is true.

**Framing the problem.** First principles (ask why until you reach the real
constraint) · jobs to be done (people hire a product for an outcome) · inversion
(ask what would guarantee failure, then prevent it) · theory of constraints (fix
the actual bottleneck; more CRO will not fix a traffic problem) · local versus
global optima (do not perfect subject lines if email is the wrong channel) ·
second-order thinking (a flash sale lifts revenue now and trains customers to
wait for discounts later) · Pareto (find the 20% doing the work).

**How buyers actually behave.** Status-quo bias and switching costs make doing
nothing the default competitor — reduce the effort to switch. Loss aversion:
losses land roughly twice as hard as equivalent gains. The zero-price effect
makes free categorically different from cheap. Endowment and IKEA effects mean
trials and self-configuration raise perceived value. Paradox of choice: three
tiers beat seven. Goal-gradient and Zeigarnik: visible progress pulls people to
finish. Peak-end: people remember the best moment and the last one. Curse of
knowledge: what is obvious to you is opaque to a newcomer — test copy on someone
outside the category.

**Ethical influence.** Reciprocity (give real value first) · commitment and
consistency (small step before large) · authority (genuine credentials only) ·
liking and unity (shared identity, insider language) · social proof (real
numbers only) · framing and anchoring (same facts, clearer presentation).

**Where each bites:** low conversion → Hick's Law, activation energy, friction ·
price objections → anchoring, framing, mental accounting, loss aversion ·
trust → authority, social proof, reciprocity, admitting a genuine limitation ·
churn → endowment, switching costs, status-quo bias · stalled growth → theory of
constraints, local versus global optima, compounding · decision paralysis →
fewer options, sensible defaults.

**Behaviour needs all three:** motivation, ability, and a prompt (Fogg). High
motivation with a hard path produces nothing; an easy path with no prompt
produces nothing.

---

## 5. Pricing and packaging

**Establish first:** product type and market segment; current pricing and
performance (conversion, ARPU, churn); go-to-market motion (self-serve,
sales-led, hybrid); the alternatives customers actually weigh; and whether the
goal is growth, revenue or profitability.

**Three axes.** Packaging (what is in each tier) · pricing metric (what you
charge for) · price point (the number). They are separable decisions and are
usually confused with each other.

**Value-based, not cost-based.** The customer's perceived value is the ceiling;
the next best alternative is the floor; your cost to serve is a baseline, not a
basis. Price between the alternative and the perceived value.

**The value metric** is what you charge for, and it should grow with the value
received. Test it with one question: as a customer uses more of this metric, do
they get more value? Per seat suits collaboration; per usage suits variable
consumption; per contact or record suits CRM and email; per transaction suits
payments; flat fee suits simple products. A good metric is understandable and
hard to game.

**Tier structure.** Good / better / best, where "better" is the intended choice
and is priced to look reasonable between the other two. Differentiate by feature
gating, usage limits, support level, or access (API, SSO, branding) — pick one
primary axis rather than blurring all four.

**Research methods.** Van Westendorp's four questions (too expensive · too cheap ·
expensive but considerable · a bargain) identify an acceptable range. MaxDiff
identifies which features people actually value, which informs packaging.

**When to raise.** Prospects stop flinching, conversion is very high, churn is
very low, or significant value has shipped since the last change. Approaches:
grandfather existing customers, announce well ahead, tie the rise to added
value, or restructure plans entirely.

**Pricing page.** Clear comparison, recommended tier marked, monthly/annual
toggle, a CTA per tier, "who this is for" per tier, FAQ, and the annual discount
stated plainly. Anchoring, charm versus round pricing (charm reads value, round
reads premium), and the rule of 100 (percentage discounts feel bigger under
$100, absolute discounts over it) are presentation choices — they do not fix a
wrong price.

**AI readability of pricing is now a conversion surface.** If an agent cannot
parse your prices, you lose shortlist positions you never see. Keep prices in
text, cover objections in extractable FAQ form, and consider `Offer` structured
data. See section 2.

---

## Attribution

Distilled by Unite-Group from
[`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills)
(MIT, Copyright © 2025 Corey Haines) — specifically its `cro`, `ai-seo`,
`programmatic-seo`, `marketing-psychology` and `pricing` skills, read in full on
18/08/2026. This is a condensed, Australianised adaptation with house
guardrails added, not a verbatim copy; the upstream skills carry deeper
reference material (playbooks, teardown rubrics, platform ranking factors) at
the link above. Statistics reproduced here remain upstream claims — see
non-negotiable 3.
