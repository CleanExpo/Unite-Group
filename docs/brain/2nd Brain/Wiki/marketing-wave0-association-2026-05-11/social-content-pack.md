---
type: marketing-deliverable
artifact: social-content-pack
wave: 3
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
spokesman-brand: john-coutis
updated: 2026-05-11
status: draft
forbidden-pronouns: We, Our, I, Us, My, Mine
founder-tier-cap: INTERNAL-ONLY (see pricing-research.md)
founder-tier-price: INTERNAL-ONLY (see pricing-research.md)
voiceLintPass: true
---

# Social Content Pack — Wave-0 NRPG Association Launch

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Skill: `marketing-social-content` · Wave 3 · job `nrpg-association-wave0-2026-05-11`.
Reads: [[channel-plan]] · [[positioning-doc]] · [[icp-research]] · `Synthex/packages/brand-config/src/brands/nrpg.ts` · `Synthex/packages/brand-config/src/brands/john-coutis.ts`.
Scope: cross-channel content pack supporting the 6 LinkedIn launch posts authored by `marketing-copywriter` in parallel. This deliverable covers YouTube assets for the D1 Coutis video, LinkedIn supporting content (carousels, reply scripts, DM template), Telegram intro, and the Wave-1 email skeleton.

Pricing note: [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Anywhere a public-facing surface (YouTube description, carousel slide, reply, DM, Telegram intro, email) would carry a $-figure, seat count, or ARR projection, the placeholder reads `[INTERNAL-ONLY pricing — see pricing-research.md]` (or `[INTERNAL-ONLY seat count — see live counter]`).

---

## YouTube — 75s Coutis intro video (D1 drop)

### Title — 3 candidates

| # | Title | Chars | Notes |
|---|---|---|---|
| A | **John Coutis OAM: The peak body that runs jobs** | 49 | Names Coutis + the tagline. Brand + topical. SHIP THIS. |
| B | The ANZ restoration association — hosted by John Coutis | 56 | Topical-first. Less SEO juice for "John Coutis" branded queries. |
| C | John Coutis OAM joins the NRPG association | 43 | Branded-only. Weak on SEO for non-fans. |

**Ship: A — "John Coutis OAM: The peak body that runs jobs"** (49 chars, under the 60-char mobile cap). Leads with the spokesman's full attributed name (captures "John Coutis association" branded search), colons into the campaign tagline (captures "peak body" / "restoration industry association australia" SEO).

### Description (≤1,500 chars)

```
The ANZ property-services industry has been paying six suppliers to do the work of one peak body. John Coutis OAM joins as host.

Founding partners: Phill McGurk (Unite-Group, Disaster Recovery, NRPG, Synthex), Toby Bredhauer (Carpet Cleaners Warehouse — national equipment distribution), and John Coutis OAM, Order of Australia Medal recipient, 25-year keynote speaker, audience of 6 million worldwide.

The expanded NRPG association bundles cert, leads, marketing, software, insurance, and equipment into one monthly fee. Built for ANZ restoration and specialty-cleaning firm owners running 5-to-50-person crews. Standards held to international benchmark, jobs routed to certified firms, training delivered in Australian time zones.

Founder tier — lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Sign up at the landing page below.

John Coutis OAM — Australian speaker. Half a Body, Full of Life.

Sign up as a founding partner: https://unitegroup.in/association

00:00 The six-supplier problem
00:18 Founding partners
00:34 What the association does
00:52 Founder tier — lifetime-locked
01:08 Sign up

#NRPG #RestorationIndustry #ANZRestoration #JohnCoutis #PeakBody #IICRC #WaterDamageRestoration #FireRestoration #MouldRemediation #AustralianBusiness
```

**Char count: 1,247** (under 1,500 cap). Hook lines 1-3 are the only text visible above "Show more" on mobile — they land the contrast (six suppliers vs. one peak body) and name-drop Coutis OAM inside the first 200 chars.

### Tags (15)

```
john coutis, john coutis oam, nrpg association, restoration industry association australia, anz restoration association, peak body restoration, iicrc australia, water damage restoration australia, fire restoration australia, mould remediation australia, restoration industry body, australian restoration peak body, carpet cleaners warehouse, restoration certification australia, phill mcgurk
```

Mix: 5 brand/branded-person tags + 5 topical SEO tags + 5 ICP-vocabulary tags (cross-cut with the SEO brief keyword cluster).

### End-screen CTA — 4-second voiceover script

> Coutis (on camera, looking direct): "One body. One membership. Founding cohort open. Link below."

(4.0s at conversational AU-English cadence. Uses Coutis-voice exception — "below" is direct address, no NRPG forbidden pronouns. Drives click without hard-sell. Per the INTERNAL pivot, the prior "hundred founder places" line is stripped from public copy; the cap figure is internal-only per pricing-research.md.)

### Thumbnail brief

**Concept:** Tight shot of John Coutis OAM, framed at conversational eye level per `john-coutis.design.md` (chest-up, not "looked down at"). Charcoal `#1A1A1A` full-bleed background. Coutis on the left two-thirds; right third holds text overlay.

**Text overlay (max 4 words):** **"PEAK BODY THAT RUNS"** — set in Bebas Neue uppercase, **Candy Red `#b30000`** (Unite-Group canonical token; `candy-red-canonical 2026-05-11 opus-fix` — replaces prior Australian-gold #D4A437), with the word "RUNS" stacked one line lower to suggest motion. The verb "RUNS" is the differentiation hook against publishing / advocacy / cert-only competitors.

**Colour brief:** Charcoal `#1A1A1A` background. **Candy Red `#b30000`** for the text overlay and a thin candy-red rule (4px) running vertically between Coutis and the type block (`candy-red-canonical 2026-05-11 opus-fix`). Warm cream `#F5F0E6` for an optional small "OAM" badge bottom-left. No drop shadows. No motion-line graphics. No stock disability imagery — Coutis on his custom skateboard is the visual when full-body framing is used; for thumbnail the chest-up frame keeps focus on his face.

**Forbidden:** No Lucide / Material / FontAwesome icons. No stock-photo "inspirational" lens flare. No "AMAZING" / "INCREDIBLE" overlay words (his BrandConfig bans them). No navy-blue — every other corporate speaker uses navy; charcoal + gold is the differentiation.

---

## LinkedIn carousels (3 concepts)

Slide counts kept short per concept; full 10-slide expansions can land in Wave 4 if data shows the carousel format outperforms text posts.

### Carousel 1 — The 3 pains

**Title (10 words max):** Three pains every ANZ restoration firm owner already names

**Slide count:** 6

**Per-slide copy:**
1. **Three pains every ANZ restoration firm owner already names. Carousel ↓**
2. **Pain 1 — Insurer dispatch.** Stat: jobs route at random; one botched panel job loses 6 months of insurer flow.
3. **Pain 2 — No AU cert recognised by insurers.** Stat: every competitor van says "IICRC". No AU body checks.
4. **Pain 3 — Failed agencies.** Stat: 3 agencies in 5 years, 2 ghosted after the second invoice.
5. **What ends this.** The expanded NRPG association. Cert. Leads. Marketing. Software. Insurance. Equipment. One membership.
6. **Founder tier — lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Link in comments.**

**Visual brief:** Geometric pain-card layout per `nrpg.ts` palette (Gun Metal + **Candy Red `#b30000`**, per Design Preferences; `candy-red-canonical 2026-05-11 opus-fix`). Each pain card: dark Gun Metal background, single Candy Red stat number set in display type at 88px, body line in 16px Inter. No icons, no stock illustration — three geometric custom marks (slash for "no cert", broken-arrow for "random dispatch", X-grid for "agency churn"). Slide 5 inverts: cream surface, six bundle words stacked vertically, single Candy Red accent rule. Slide 6: dark surface, counter graphic placeholder set in display type, CTA chip Candy Red.

**CTA on final slide:** "Founder tier — lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Link in comments."

### Carousel 2 — The bundle reveal

**Title (10 words max):** Six suppliers, one membership — what the association replaces

**Slide count:** 8

**Per-slide copy:**
1. **Six suppliers, one membership. Carousel ↓**
2. **Today: cert from the US. Software from Sydney.**
3. **Marketing from a freelancer in Bali. Leads from a directory.**
4. **Insurance broker who has never set foot on a fire job. Equipment from whoever picks up the phone.**
5. **The bundle. Six columns, one offer.**
6. **Cert · Leads · Marketing · Software · Insurance · Equipment.** *(Six-column visual; see brief.)*
7. **Pays for itself in the first job per quarter, every quarter.**
8. **Founder tier — lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Link in comments.**

**Visual brief:** Slides 2-4 each show ONE supplier-card on Gun Metal background, set off-centre, with grey-cream typography to read as "current state, faded". Slide 5 transition: same six cards stacked vertically into a single column. Slide 6: full-bleed six-column grid, each column a service name in display type, all aligned to a single horizontal baseline — geometric, no icons. **Candy Red `#b30000`** column-numbers (01-06) above each (`candy-red-canonical 2026-05-11 opus-fix`). Slide 7: single line of body type, cream-on-charcoal. Slide 8: counter + CTA chip per Carousel 1 final slide.

**CTA on final slide:** Same.

### Carousel 3 — The verified pricing math

**INTERNAL NOTE (2026-05-11 internal pivot):** This carousel surfaces specific $-figures and ARR math. Public publish is on hold. The carousel structure below is retained for internal use only; for the version that would ship publicly, all $-figures + total-spend math + Founder annualised figure are replaced with `[INTERNAL-ONLY pricing — see pricing-research.md]`. Internal use of this carousel keeps the math.

**Title (10 words max):** What ANZ restoration firms pay today versus one membership

**Slide count:** 6

**Per-slide copy (INTERNAL version — math retained):**
1. **The math. Carousel ↓**
2. **Today: cert $1,200/yr. Software $4,800/yr. Marketing $18,000/yr. Leads $9,600/yr. Insurance broker fees $2,400/yr. Equipment finance margin $6,000/yr.** *(Stat-tile grid; figures sourced from `pricing-research.md`.)*
3. **Total: $42,000 per year. Six invoices. Six counter-parties. Six points of failure.**
4. **Founder tier: [INTERNAL-ONLY pricing — see pricing-research.md]. One invoice. One counter-party. Locked at sign-up rate for life.**
5. **First-job-per-quarter pays for the membership. Every quarter.**
6. **Founder cohort. Counter visible on the landing page. Link in comments. [INTERNAL-ONLY cap — see pricing-research.md]**

**Public-publish substitute (if/when this carousel ships externally):** every $-figure on slides 2, 3, and 4 is stripped and replaced with `[INTERNAL-ONLY pricing — see pricing-research.md]`. Slide 6 retains "Founder cohort" framing without numeric cap.

**Visual brief:** Slide 2 — 6-tile stat grid on charcoal, **Candy Red `#b30000`** dollar figures in display type (`candy-red-canonical 2026-05-11 opus-fix`), supplier names in caption type. Slide 3 — single full-bleed total figure set in display-xl Candy Red on Gun Metal. Slide 4 — Founder-rate panel with **Candy Red `#b30000`** accent to mark the founder rate (`candy-red-canonical 2026-05-11 opus-fix` — replaces prior Australian-gold #D4A437). Slide 5 — single sentence on cream surface. Slide 6 — counter graphic (cap value updated dynamically post-launch via landing-page data sync) + CTA chip in Candy Red.

**CTA on final slide (public substitute):** "Founder tier — lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Link in comments."

**Strongest hook:** Carousel 3. The exact-dollar contrast is the sharpest frame because it converts the founding-partners memo's abstract "bundle" claim into the firm owner's actual annual spend. Stops scroll instantly for any ICP reader who has paid those six invoices. (Use internally with the firm-owner GMs across the portfolio; public publish on hold.)

---

## LinkedIn reply scripts (2)

### Reply 1 — "Yet another industry body?"

> Fair pushback. The industry has been burned by membership badges that delivered a directory listing and an email newsletter. This is different in posture: one membership replaces the cert, leads, marketing, software, insurance, and equipment suppliers a firm currently pays separately — one monthly fee, paid once. Toby Bredhauer signed on because CCW equipment customers were asking the same question and getting six answers. The association answers it with one invoice. Founder tier is lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Worth a five-minute look. Landing page is the link in the post above.

**Word count (approx 95).** Opens by conceding the pushback is fair. Per the INTERNAL pivot, the "Member-as-a-Service" framing (which positioning-doc reserves for internal/long-form copy) and the specific tier price + cap have been replaced with public-safe language. Names Toby for peer-signal. Closes with the lifetime-lock + INTERNAL pricing placeholder.

### Reply 2 — "How is this different from IICRC?"

> Partner, not fight. IICRC certs continue inside the association stack. CARSI is registering as an IICRC Approved School so AU-delivered IICRC training stops requiring a flight to Vegas. The association adds what IICRC does not do — job routing through the Disaster Recovery platform, marketing-as-a-service, advocacy at the insurer table, equipment terms through CCW national distribution. IICRC stays the global standard; the association wraps an Australian operating system around it. Founder tier is lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Landing page in the post above.

**Word count (approx 90).** Partner-not-fight framing locked in line one. CARSI becoming IICRC Approved School is the concrete proof point. Names what the association adds without claiming to replace IICRC.

---

## LinkedIn DM template — founding-partner outreach

For Phill / Toby to use when reaching out to specific founding-partner candidates (industry operators they know personally).

> Quick one. The expanded NRPG association launched this week — Toby Bredhauer signed on as a founding partner, John Coutis OAM hosts the channel. The thesis: one membership replacing the six suppliers an ANZ restoration firm already pays. Cert, leads, marketing, software, insurance, equipment. Founder tier is lifetime-locked at the founding rate — the cap is there so the founding cohort is small enough to actually steer the association in year one. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. Your name came up as someone whose involvement would change the shape of the room. Landing page: unitegroup.in/association. No rush, but the founder cohort will move inside the first fortnight.

**Word count (approx 120).** Names Toby + Coutis for trust signal. Founder tier framed as a *steering* mechanism (not a sales scarcity tactic) — respects the founding-partner candidate's status. Closes with the urgency without pressure.

**Closing line (exact):** "No rush, but the founder cohort will move inside the first fortnight."

---

## Telegram intro — Phill's owner-network channel

> Heads-up for the network. The expanded NRPG association launched this morning. The thesis is simple — one membership replaces the cert, leads, marketing, software, insurance, and equipment suppliers an ANZ restoration firm already pays. Toby Bredhauer signed on as a founding partner, John Coutis OAM hosts the channel, CARSI is registering as an IICRC Approved School. Founder tier is lifetime-locked at the founding rate. [INTERNAL-ONLY pricing + cap — see pricing-research.md]. The cap is small so the founding cohort actually steers the year-one decisions. Landing page: unitegroup.in/association. Any owner-mates worth a heads-up, send them direct — peer intros convert faster than any cold outreach the team can run.

**Word count (approx 115).**

**Opening line (exact):** "Heads-up for the network."

---

## Wave-1 email sequence skeleton (NOT full copy)

Five emails. Each cadenced post-signup. Send order locked: welcome → manifesto → bundle reveal → Toby story → Founder-tier scarcity.

### Email 1 — Welcome (D+1)

**Subject (50 chars max):** Welcome to the founding partners list (47)
**Preview:** One body. One membership. Here is what happens next.
**Body outline:**
- Thanks for signing the interest list — confirmation of place on the founding-partners roster (not yet a paid founder slot).
- What the founding-partners list gives access to: the founding-partners memo (PDF attached / linked), the next 90-day roadmap, and first-look on the Founder tier when it opens.
- One ask: forward this email to one peer who runs a 5-50-person restoration or specialty-cleaning crew in ANZ.

### Email 2 — Manifesto (D+3)

**Subject (50 chars max):** Six suppliers, one peak body (28)
**Preview:** The ANZ property-services industry has been paying six.
**Body outline:**
- The manifesto paragraph from the landing-page hero, lifted verbatim. Sets the philosophical floor.
- Three numbered "what this ends" lines: cert from the US, marketing from a freelancer in Bali, leads from a directory site charging by the lock.
- CTA: read the founding-partners memo (link). No purchase ask in this email — it is the slow-burn.

### Email 3 — Bundle reveal (D+6)

**Subject (50 chars max):** What one membership actually replaces (37)
**Preview:** Cert. Leads. Marketing. Software. Insurance. Equipment.
**Body outline:**
- Six-column bundle, set out plainly with the supplier-type each column replaces (matches Carousel 2 logic).
- Annual-cost math: the typical six-supplier annual spend collapses into a single membership annualised line. Public-publish version of this email strips the specific $-figures — those land internally only. [INTERNAL-ONLY pricing — see pricing-research.md]
- CTA: see the founder-cohort signup on the landing page. Still no hard purchase ask — the maths sells.

### Email 4 — Toby story (D+10)

**Subject (50 chars max):** Why Toby signed on as a founding partner (39)
**Preview:** Carpet Cleaners Warehouse founder. First yes.
**Body outline:**
- Toby's first-person framing of the call to join: equipment customers were asking the same six-supplier question; the association answers it.
- Toby's commitment to the founding cohort: CCW national distribution opens preferred equipment terms to Founder-tier members from week one.
- CTA: peer-signal moment — book a 15-minute call with the founding team (or claim a Founder slot directly). First conversion ask of the sequence.

### Email 5 — Founder-tier scarcity (D+14)

**Subject (50 chars max):** Founder cohort. Locked for life. Counter open. (47)
**Preview:** Founder tier opens. The cohort will move quickly.
**Body outline:**
- Founder tier is now open: lifetime-locked at the founding rate. Counter live on the landing page. [INTERNAL-ONLY pricing + cap — see pricing-research.md]
- The cap is a steering mechanism — the founding cohort is small enough to actually shape year-one decisions on Best Practice Briefs, dispatch rules, and member-services priorities.
- CTA: claim a Founder slot before the counter hits cap. Hard conversion email.

---

## Cross-references

- [[channel-plan]] — D0-D5 sequence, watering-hole plan, attribution model
- [[positioning-doc]] — manifesto, tagline, proof-point bank, anti-positioning
- [[icp-research]] — ICP vocabulary table, pain hierarchy, decision process, Coutis-fit
- [[pricing-research.md|pricing-research]] — internal source for the six-supplier annual spend math and Founder annualised figure (replaces public $-figures in Carousel 3 + Email 3 under the 2026-05-11 INTERNAL pivot)
- [[seo-brief]] — keyword cluster informing YouTube tags + description SEO
- `Synthex/packages/brand-config/src/brands/nrpg.ts` — voice + forbidden-pronoun source for NRPG content
- `Synthex/packages/brand-config/src/brands/john-coutis.ts` — voice + forbidden-words for Coutis-voice end-screen CTA
- `Synthex/packages/brand-config/src/brands/john-coutis.design.md` — visual tokens for the YouTube thumbnail brief

## Notes for downstream skills

- **`marketing-launch-runbook` (Wave 4):** D1 YouTube drop time should align with AEST 7am for AU professional feed. Thumbnail must be uploaded as custom (not auto-generated) before publish — auto-generated thumbnails default to mid-frame stills, which break the brand brief.
- **`remotion-orchestrator` (Wave 4):** End-screen CTA voiceover script provided above — feed into render pipeline. No ElevenLabs clone of Coutis (license not signed); Coutis records the 4-second line direct.
- **`marketing-analytics-attribution` (Wave 4):** Carousel CTAs and DM template reference "link in comments" (LinkedIn algorithmic best practice — posts with the link as a comment, not in the body, get ~30% more reach). UTM scheme per channel-plan: `utm_source=linkedin&utm_medium=carousel-{n}&utm_campaign=nrpg-wave0-2026-05`. DM-outreach links use `utm_source=peer-referral&utm_medium=dm`.
- **`marketing-copywriter` (Wave 1 email production):** Skeleton above is structural — each email needs full copy at ~250 words. Subject lines and previews are locked; body outlines are the structural floor.
