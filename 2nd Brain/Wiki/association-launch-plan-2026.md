---
type: plan
updated: 2026-05-11
status: drafting
---

# ANZ Industry Association — Launch Plan 2026

6–12 month execution roadmap for the [[industry-association-vision-2026]]. Five waves (0–4), each with deliverables, owning skill/agent, success metrics, and risk flags.

Owning-agent IDs are drawn from the live skill catalogue (108 skills, May 2026). Where a single owner is named, the skill leads; other skills feed into it.

## Wave 0 — Immediate (This Week, 11–18 May 2026)

**Goal:** lock the Coutis arrangement, stand up the founding brand assets, prove the model with one piece of public content.

> **Status 2026-05-11 — pivoted to INTERNAL-only.** All Wave-0 deliverables produced as an internal pitch deck for Phill to use with portfolio GMs; no public launch dispatch. Every artifact in `~/2nd Brain/2nd Brain/Wiki/marketing-wave0-association-2026-05-11/` carries an `INTERNAL — Unite-Group portfolio only — do not distribute publicly` banner. Coutis arrangement paused until public-launch unblocks (see [[john-coutis-content-kickoff]]). Runtime deliverables (CoutisIntro75 composition, storyboard JSON, founding-partners deck HTML) live on branch `feat/internal-pivot-2026-05-11` in Pi-Dev-Ops — pushed, no PR. Financial claims ($249/mo × 100 cap, $13.07M ARR ceiling, $12M moat math) retained as source-of-truth in `pricing-research.md` + `founding-partners-memo.md` but never exposed externally.

### Deliverables

1. **Coutis engagement contract drafted** — scope-of-engagement covering exclusivity, retainer, editorial control, image rights, term. Phill negotiates direct; legal review before signature.
2. **Coutis BrandConfig + design.md authored** at `Synthex/packages/brand-config/src/brands/coutis.ts` plus `.design.md`. Already in flight (separate agent: `remotion-brand-codify`). This page does not author — it depends.
3. **Association working name + provisional brand** — temporary name until governance entity registered. Brand-config seeds typography, palette, voice. Owner: `remotion-brand-codify`.
4. **Landing-page mock** at `unitegroup.in/association` or a holding domain. Single page: "ANZ's industry association for property services — coming soon, hosted by John Coutis." Lead-capture form to start a member-interest list. Owner: `frontend-design` + `marketing-copywriter`.
5. **First content commitment piece** — a 60–90s Coutis-to-camera video introducing the association concept. Distributed on LinkedIn + YouTube + Telegram (founder channel). Owner: `remotion-orchestrator` chain (`remotion-marketing-strategist` → `remotion-screen-storyteller` → `remotion-composition-builder` → `remotion-render-pipeline`).
6. **Wiki + AIP entity seeding** — create stub entries for the association entity, the Coutis spokesperson record, and an interest-list mailbox. AIP ontology extensions deferred to a separate task (see report).
7. **Founding-partners memo** — Phill + Toby + Coutis sign a one-page intent doc. Not legally binding; cultural-alignment instrument. Owner: `ceo-board` to draft.

### Success metrics (Wave 0)

- Coutis contract signed by 2026-05-25
- BrandConfig + design.md merged to `Synthex/packages/brand-config/`
- Landing page live with working lead form by 2026-05-18
- First Coutis video published by 2026-05-25 → ≥1,000 views in first 7 days
- ≥50 interest-list signups by 2026-05-31

### Risk flags (Wave 0)

- **Coutis brand mismatch risk** — his current brand is consumer-keynote-circuit, our audience is B2B trade. If the framing is wrong, his presence reads as gimmicky to contractors. Mitigation: brand-guardian gates every Coutis-anchored asset; first video tone-tested with 3 CCW contractor contacts before public publish.
- **Exclusivity gap** — if we don't lock category exclusivity in the contract, a competitor could pay him to host their podcast next quarter.
- **Brand-config rework risk** — if `Synthex/packages/brand-config/src/brands/coutis.ts` lands with wrong voice/motion, downstream remotion-orchestrator output will be off-brand. Hard dependency.

## Wave 1 — Weeks 2–4 (19 May – 8 June 2026)

**Goal:** launch the YouTube channel and lock the podcast format. Demonstrate consistent content velocity.

### Deliverables

1. **YouTube channel live** — branded, scheduled, with first 3 episodes published. Coutis-hosted. Cadence: 2×/week initially, daily by month 3. Owner: `marketing-channel-strategist` (cadence) + `remotion-orchestrator` (production).
2. **First 5 podcast episodes scoped** — guests selected (mix of contractors, an insurer, an IICRC office-bearer if accessible, an IAQ Magazine editor, Toby on CCW story). Format locked: 30 min weekly, audio + video, available on Apple/Spotify/YouTube. Owner: `marketing-copywriter` (briefs) + `remotion-screen-storyteller` (scripts).
3. **Member-interest list grown to 250+** — paid LinkedIn + organic Coutis distribution + IAQ Magazine cross-promo. Owner: `marketing-social-content`.
4. **Founding-member tier proposition drafted** — what does $X/year get you in the first 12 months? Includes: certified-firm status (deferred to Wave 2), branded marketing assets, podcast advertising spot, conference seat, member-only newsletter. Owner: `marketing-positioning` + `marketing-icp-research`.
5. **IAQ Magazine Australia cross-promo locked** — leverage Phill's editorial seat for masthead promo of the association launch. Owner: founder direct.
6. **Pricing model approved by ceo-board** — three tiers (Individual / Firm / Enterprise) with bundle of cert + member services. Owner: `ceo-board`.

### Success metrics (Wave 1)

- YouTube channel: ≥1,000 subscribers by end of Week 4
- Podcast: first 5 episodes scripted; 2 published by end of Week 4
- Interest list: 250+ signups
- IAQ Magazine cross-promo published in the June 2026 issue
- Pricing model signed off by Phill + Toby

### Risk flags (Wave 1)

- **Content cadence collapse** — 2×/week video + weekly podcast is aggressive. If Coutis availability is limited, we hit the wall in week 3. Mitigation: pre-record 4 weeks of evergreen Coutis-to-camera in a single shoot day.
- **Pricing too high too early** — without member-service deliverables live, charging high tiers risks churn at first renewal. Bias to free founding-member tier in Wave 1, charge from Wave 2 onward.

## Wave 2 — Months 2–3 (Jun – Aug 2026)

**Goal:** convert interest to paid members. Launch the first marketing-services package. Affiliate with COSBOA.

### Deliverables

1. **Membership tier launch — paid signups open.** Three tiers live with payment processing via [[unite-crm]] + Stripe. Founding-member discount for first 100 signups. Owner: `pm-core` (build) + `marketing-launch-runbook` (launch sequence).
2. **First cert program live** — repackage existing NRPG 100-point system as the association's flagship cert. Available through [[carsi]] LMS. Owner: existing NRPG team + `marketing-positioning` for re-framing.
3. **Marketing-services offering launched** — Marketing-as-a-Service package (powered by [[synthex]]) sold to members. Three sub-tiers: Done-for-You social, Done-with-You campaigns, Audit-only. Owner: `marketing-orchestrator` for package design.
4. **COSBOA affiliation submitted** — apply for COSBOA membership as a small-business industry association. Unlocks federal policy access. Owner: founder direct + `ceo-board` for go/no-go.
5. **First case-study content from members** — 3–5 member spotlights published in podcast + YouTube + magazine. Owner: `marketing-copywriter` + `remotion-orchestrator`.
6. **Telegram + LinkedIn member community live** — closed channels for members. Owner: `marketing-channel-strategist`.

### Success metrics (Wave 2)

- 50+ paid members by end of Wave 2 (target ARR: ~$50k-$100k depending on tier mix)
- 10+ active cert candidates in the LMS
- 5+ marketing-services contracts sold to members
- COSBOA affiliation accepted (or formally in process)
- Member retention: ≥90% in first 90 days

### Risk flags (Wave 2)

- **Member-services delivery capacity** — if 5+ contracts sell but Synthex back-end isn't ready to deliver, we churn members and damage brand. Hard gate: only sell what Synthex can deliver this week.
- **COSBOA application reject** — they may require existing membership base to admit us. Have a Plan B (apply to AICCM as alternative? <!-- TODO verify --> ).

## Wave 3 — Months 4–6 (Sep – Nov 2026)

**Goal:** launch the events calendar and publishing platform. Establish advocacy posture.

### Deliverables

1. **Annual conference Year 1 scheduled** — late 2026 / early 2027 date. Venue, sponsors, agenda. Coutis as opening keynote. Owner: `marketing-campaign-planner` + new event-ops capacity (likely a hire).
2. **Annual ANZ industry awards announced** — categories, nomination period, judges, gala dinner at conference. Owner: `marketing-campaign-planner`.
3. **Publishing platform — owned masthead launched** — separate from IAQ Magazine. Monthly digital magazine, weekly newsletter, podcast back-catalog hub. Owner: `frontend-design` + `marketing-copywriter` + `marketing-seo-researcher`.
4. **Advocacy positioning established** — first government-affairs submission. Topic: insurer–restorer equity (RIA AGA template), or industry licensing standard. Owner: `marketing-positioning` + founder direct.
5. **First insurer panel placement deal** — secure one major AU insurer to recognise NRPG-certified firms in their preferred-supplier panel. Owner: founder direct + `ceo-board` for pricing/strategy.
6. **Branding-services offering launched** — packaged via brand-config + remotion-orchestrator pipeline. Owner: `remotion-orchestrator` (entry) + `marketing-orchestrator` (sales).

### Success metrics (Wave 3)

- 200+ paid members
- Conference: 100+ registrations, 5+ sponsors signed
- Awards: 50+ nominations across categories
- Masthead: 5,000+ newsletter subscribers
- First insurer panel deal signed (or formally LOI'd)
- Branding-services: 3+ contracts sold

### Risk flags (Wave 3)

- **Conference logistics failure** — first event is reputation-make-or-break. Mitigation: partner with National Media or a similar AU event ops shop for production, rather than build in-house.
- **Insurer relationships are slow** — first panel placement may not land in Wave 3. Don't gate the rest of the wave on this.
- **Masthead vs IAQ Magazine collision** — we must not undercut the IAQ Magazine relationship that gives us E.E.A.T. anchor. Mitigation: our masthead is broader (full property services), IAQ stays specialist.

## Wave 4 — Months 6–12 (Nov 2026 – May 2027)

**Goal:** scale. Cross-trade expansion beyond restoration. Conference executed. Awards delivered. Member base scaled.

### Deliverables

1. **Annual conference executed** — first ANZ industry-association conference in the books. Coutis MC + keynote.
2. **First annual awards delivered** — at conference gala.
3. **Cross-trade expansion** — add commercial cleaning, duct cleaning, biohazard, building inspection, facilities management to scope. Hire or partner one new trade-lead per quarter.
4. **Member target: 500+ paid members.**
5. **Content volume: 100+ pieces per quarter across podcast, YouTube, magazine, newsletter, member-only.**
6. **State of the Industry annual report** published — first one. Distributed to members, regulators, insurers, COSBOA, IAQA, IICRC.
7. **Insurer panel placements: 3+ insurer partnerships.**
8. **Tech-as-a-service deployed to 50+ members** — [[unite-crm]] + [[restore-assist]] + [[dr-nrpg]] portal access bundled into membership.
9. **Regional roadshow scheduled** — Sydney, Melbourne, Brisbane, Perth + NZ leg.

### Success metrics (Wave 4)

- 500+ paid members
- ARR: $500k+ from membership alone, $1M+ blended with member-services
- Conference: 300+ attendees
- Awards: 200+ nominations
- 3+ insurer panel deals
- COSBOA seat at the federal table
- Coutis-hosted YouTube: 25k+ subscribers, podcast: 5k+ avg weekly downloads

### Risk flags (Wave 4)

- **Scale before fundamentals** — pushing into commercial cleaning etc. before restoration is locked is the classic dilution mistake. Mitigation: don't expand a trade until restoration cert + members + advocacy + media + events all hit Wave-3 success metrics.
- **Coutis bandwidth ceiling** — at 25k+ subs and a conference + awards + podcast, his calendar may collapse. Plan a co-host or guest-host rotation by Wave 4 start.

## Cross-references

- [[industry-association-vision-2026]] — the vision (parent page; rewritten 2026-05-11)
- [[competitor-service-stack-2026-05-11]] — 20-org competitor map; identifies Member-Services-Stack whitespace and Wave-2 sequencing implications
- [[dr-nrpg]] — existing certification scaffold
- [[ccw]] — Toby's company, founding partner
- [[carsi]] — LMS for cert delivery
- [[synthex]] — marketing-services engine
- [[unite-crm]] — CRM for member management + payment
- [[unite-hub-vision]] — member-facing portal
- [[iicrc-content-initiative]] — derivative content programme
- [[iaq-building-science-initiative]] — IAQ + Building Science content programme
- [[marketing-agency-blueprint-2026]] — feeds the member-services marketing layer
- [[exit-thesis]] — $2B by June 2028
- [[wave-roadmap]] — multi-quarter horizon
- [[now]] — what's firing right now
- [[loss-adjusters]] — counterparty for advocacy work
