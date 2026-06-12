# Proposal — Dimitri ITR Platform

**From:** Phill McGurk — Unite-Group / Synthex
**To:** Duncan Perkins — Home Loan Essentials
**Date:** 13 May 2026
**Subject:** The ITR app — what I'd build, what it costs, what we're locking in

---

## Hey Duncan,

Putting this in writing so we've both got it straight: here's what I'd build for the ITR app, what it costs, and the terms for the next 12 months. Read through, push back where it doesn't sit right, and we'll fix it. I've laid it out apples-to-apples against the Lumine pack you forwarded so the comparison is straight up — no marketing.

To be clear up front: this proposal covers **the ITR app specifically**. The other ideas you mentioned (DIY Home Loans piece, and the others on your list) are separate conversations under similar terms when you're ready. The aim is to ship this one well, then keep building together.

---

## What we're building

Two AI agents living behind a button. The button sits on any approved partner website — finance brokers, banks, tax agents, financial planners, lawyers, payroll-tax employers — and walks the client end-to-end from pre-fill to lodgement to post-lodgement wealth planning.

**DIMITRI — the pre-fill agent**

Connects to the ATO via MyGov OAuth and pulls pre-fill data. Then walks the client through their ITR one question at a time. Responses constrained to **Yes / No / Tell me more** — not free chat. Handles the curly questions (FBT, CGT, crypto, D13 deductions). When the return is complete, sends the full packet to the chosen Tax Agent in **XPM (Xero Practice Manager)** so the agent's team can run ID/AML/TFN and lodge.

**NOAH — the post-lodgement agent**

Triggers when the Notice of Assessment lands. Order of operations:

1. Fee payment gate — client clears payment before anything else
2. Delivers the NOA
3. Walks the 11 wealth-planning questions
4. Books referrals — financial planners, brokers, lawyers — as the answers warrant
5. Sets the forward diary (next-year reminders)
6. Sends an encrypted ZIP envelope to the client containing everything, no platform retention

**Hard stops baked in from day one**

- TASA s90-5 — the app is a tool, not a tax-agent service. Tax agents own the tax advice.
- TFN custody — TFNs never enter an LLM context window. Hard regex + LLM detector + soft shutdown UX if one slips into a free-text field.
- Deterministic tax calcs — the LLM never produces a tax figure. Pure functions read from the current FY rate file.
- en-AU spelling, DD/MM/YYYY, AUD, AEST/AEDT, Sydney data residency.

**Approved-website button**

A one-line `<script>` embed that any approved partner can drop on their site. Per-partner config and attribution so the data flows back correctly and revenue share is traceable. White-label option for brokers who want their own brand on the button.

---

## Button naming

DIMITRI and NOAH are the **internal agents** — the names live in code. What we're choosing is the **button label** the public sees on broker / bank / tax-agent sites.

| Name | Vibe | Sample slogan |
|---|---|---|
| **Otto** | Universal, neutral, friendly | "Otto — your tax, sorted." |
| **Sorted** | The most Australian of the set | "Get Sorted." |
| **Beau** | Warm, personable | "Meet Beau — he does your tax." |
| **Tick** | Punchy, completion-feel | "Tick. Done." |
| **Lodgey** | Playful, on-the-nose | "Lodgey lodges." |

My read: **Otto** for universality if you want to grow beyond Aus eventually, **Sorted** if you want the most Australian voice in market. We lock it in early so the brand work doesn't sit on hold. Happy to run a trademark and `.com.au` sweep on both before we commit.

---

## The build approach

Small team, weekly cadence, evidence over claims. No giant Gantt nobody reads — just rolling 2-week sprints with a written status note Friday afternoons so you always know where we are. You log into the Unite-Group CRM portal any time to see the live status, deliverables, and what's coming next.

You'll have direct line to me throughout — you talk to Phill, not an account manager.

---

## Rough phasing

These are realistic windows, not hard deadlines. Quality over rushing — we ship when the work is right, not when a date says so.

| Months | Focus |
|---|---|
| 1–2 | Discovery, architecture review, brand and button-name lock-in, ATO partner application kicks off (their timeline is outside our control — start early) |
| 3–4 | DIMITRI build — interview UI, the MyGov OAuth connection once ATO approves, D13 flow, TFN custody layer |
| 5–6 | Tax-agent handoff to XPM, NOAH post-lodgement flow, Stripe fee gate, encrypted ZIP envelope |
| 7–8 | The embed button, first approved-partner pilot (Sams Home Loans if you want them in the test) |
| 9–12 | Production hardening, additional tax-agent partners, marketing engine via Synthex |

Working MVP target lands somewhere in the Month 4–5 window. Production launch around Month 8–10. We adjust as the ATO partner timeline becomes clearer — that's the only piece outside our control.

---

## Commercial terms

| | |
|---|---|
| **Setup fee** | AUD **$4,400 inc GST** (one-time, due on signing) |
| **Monthly retainer** | AUD **$2,750 inc GST** per month |
| **Invoiced** | 1st of each month |
| **Minimum term** | 12 months |
| **Total over 12 months** | $4,400 + (12 × $2,750) = **$37,400 inc GST** |

**What's included monthly:**

- All engineering — me, hands-on
- Full agent team running daily on the build (PM, architect, privacy/compliance, data, AI agent engineer, AppSec, tax SME, brand/UX, QA)
- Unite-Group CRM client portal — you log in and see live status, deliverables, weekly written reports
- Synthex marketing engine — launch content, broker outreach assets, partner pitch decks when you're ready to recruit partners
- Direct founder access — phone, email, message, whatever's fastest
- Hosting and AI execution costs (Claude API, Supabase Sydney, Vercel) within reasonable usage. True-up only if third-party spend goes over $1,000/month, which it shouldn't.

**Not included:**

- ATO partner-program enrolment fees (if any — that's between you and the ATO)
- XPM API costs (paid directly to Xero)
- Stripe processing fees (paid directly to Stripe)
- Paid advertising — we go organic. Synthex creates content, not paid campaigns.
- Optional external TPB-registered legal review if you want a second set of eyes on the TASA copy.

**IP ownership:** 100% yours. Every line of code, every agent, every design asset — yours. No platform-rent trap, no lock-in.

---

## How this stacks against Lumine

A fair side-by-side. Lumine's team has real depth and the AiDA roadmap is real. Honest read below.

| | **Mine** | **Lumine Opt 1** | **Lumine Opt 2** | **Lumine Opt 3** |
|---|---|---|---|---|
| **Setup** | $4,400 inc GST | $10K–$30K | $50K–$70K | $150K+ |
| **Ongoing** | $2,750/mo inc GST | "Small" (unspecified) | "Small" (unspecified) | "High" (unspecified) |
| **12-month total** | $37,400 inc GST | $10K–$30K + small | $50K–$70K + small | $150K+ + high |
| **Timeline to working app** | Month 4–5 MVP | "Ready July 2026" (their infra still maturing) | 1 year | 1–2 years |
| **Platform you depend on** | None — your code, your hosting, your call | Lumine's AiDA (you tenant on it) | Lumine's AiDA backend | None (build everything) |
| **IP ownership** | 100% yours | Agents yours, AiDA Lumine's | Agents yours, AiDA Lumine's | 100% yours |
| **Roadmap control** | Yours | Lumine Labs governs (their words) | Lumine Labs governs | Yours |
| **Marketing / launch help** | Synthex engine included | Not included | Not specified | Not included |

The honest tell from Lumine's own pack: their fastest option is "ready July 2026" and the platform is "in active refinement" (their words). My version: working app by Month 4–5, every line of code in your name, every roadmap call yours.

The cost-of-reversal point worth weighing: if you start with me and decide in 6 months you'd rather run on Lumine's AiDA, you cancel, keep everything we built, and hand a working Next.js + Anthropic codebase to Lumine as the spec. If you start with Lumine and decide in 6 months that platform tenancy isn't for you, extracting your custom agent behaviour from AiDA and rebuilding on independent infrastructure is itself a 6-month project. First direction is reversible. Second isn't. That asymmetry is why I think the locked 12-month commitment with me is the safer place to start — you have the option of leaving and taking everything; with Lumine you don't.

---

## Where this goes long-term

Mate, this is the first app. Whether it's Otto or Sorted or something else, what we're really building is the working relationship — and the playbook for shipping the next idea on your list, and the one after that.

Best outcome from where I sit: we ship the ITR app well, you start seeing what it does for your conversion rate and your tax-agent partner pipeline, and we line up Project 2 (DIY Home Loans, or whichever idea you want to take next). Over the next 12–24 months I'd like to be the person you ship apps with — and at some point on the road, if both of us are getting good value out of it, we have a conversation about a more structured partnership on these ventures. Today is not the time for that conversation, but I want it on the table so you know where my head is.

For now: the ITR app, signed retainer, 12 months, and we ship.

---

## Next steps

1. Read this. Ring me if anything reads wrong.
2. If we're good, reply "in" and I'll send the signing pack — engagement letter + first invoice + access to the Unite-Group CRM portal.
3. First invoice goes out 1 June 2026. Setup fee due on signing.
4. We kick off Discovery week of 19 May 2026. First written status note Friday 23 May.
5. ATO partner application starts week 1 — earlier is better, their queue is the slowest piece of the whole thing.

— Phill

Phill McGurk · Founder · Unite-Group / Synthex
contact@unite-group.in · +61 …
