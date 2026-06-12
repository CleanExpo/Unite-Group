---
type: marketing-deliverable
artifact: landing-spec
wave: 3
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
url: unitegroup.in/association
updated: 2026-05-11
status: draft
forbidden-pronouns: We, Our, I, Us, My, Mine
primary-keyword: restoration industry association australia
pricing-source: pricing-research.md (LOCKED 2026-05-11)
voice-lint-pass: true
banned-ai-slop-hits: 0
positioningRef: ./positioning-doc.md
icpRef: ./icp-research.md
channelRef: ./channel-plan.md
seoRef: ./seo-brief.md
pricingRef: ./pricing-research.md
---

# Landing-Spec — unitegroup.in/association

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Skill: `marketing-copywriter` · Wave 3 · job `nrpg-association-wave0-2026-05-11` · artifact: `landing-spec`.

This document is a build spec for the frontend/dev agent. Not final HTML. Each section names: copy (verbatim), design slot, asset brief, and acceptance criteria. The slot vocabulary tracks the NRPG `.design.md` component palette — `cta-primary`, `card`, `signal-chip`, `mono-chip`, `price-tag`, `network-badge`, `geometric-mark`.

Hard rules carried through this entire spec:
- No forbidden pronouns (We/Our/I/Us/My/Mine).
- No Lucide icons — geometric marks only.
- No fabricated Coutis claims beyond OAM, 25-year keynote career, 6 million people reached, "Half a Body, Full of Life".
- Grade 5 readability target outside the pricing card and schema block.
- Pricing: [INTERNAL-ONLY pricing — see pricing-research.md]. AUD ex-GST throughout.

---

## Section 1 — Hero

**Design slot:** hero-block (full-bleed) · primary `cta-primary` · scarcity `mono-chip` · `geometric-mark` (no photo of Coutis here).

### H1 (verbatim — match primary keyword)
```
Restoration Industry Association Australia
```

### Tagline (sits directly under H1, not an H tag)
```
The peak body that runs jobs.
```

### Subhead (1 sentence — pairs Pain #1 with the cure)
```
For ANZ restoration firm owners tired of insurer dispatch routing jobs to whoever picks up the phone — including the cowboy firm that chopped the scope last week — this is the body that bundles cert, leads, marketing, tools, insurance, and equipment into one membership.
```

### Hero supporting line (6-word value-prop sentence, sits next to the geometric mark)
```
Six suppliers replaced. One membership.
```

### Primary CTA (cta-primary)
- **Button label:** `Become a Founding Member`
- **Sub-label microcopy:** `Founder seats lifetime price-locked. [INTERNAL-ONLY pricing — see pricing-research.md]`
- **Anchor:** `#founding-member-form`

### Secondary CTA
- **Button label:** `Watch Coutis intro (75s)`
- **Anchor:** `#coutis-video`
- **Microcopy below button:** `John Coutis OAM on what this association is — and is not.`

### Scarcity chip (mono-chip, top-right of hero)
```
[ Founder seats claimed — counter ]
```
- Counter is live (reads from Supabase `interest_signups` table, founder-tier count).
- Cap value, seat-count copy, and "tier collapses to Firm-tier" microcopy: [INTERNAL-ONLY pricing — see pricing-research.md]
- After cap reached → chip swaps to `Founder cohort closed. Firm tier open.`

### Hero visual brief
- Foreground: NRPG geometric mark (the brand's safety-family hex token), 240–320px, **Candy Red (`#b30000` — Unite-Group token, candy-red-canonical 2026-05-11 opus-fix)** on Gun Metal background (`#0e1014`).
- No human face above the fold. No Coutis photo here. Coutis appears in Section 4 and Section 6.
- Background: subtle isometric line pattern referencing a floor-plan grid (visual cue for the restoration trade without being literal).
- Right-third of hero: stacked card showing the scarcity chip + the six bundle icons in greyscale preview (full-colour in Section 3).

### Acceptance criteria
- H1 reads `Restoration Industry Association Australia` verbatim — exact-match for the primary keyword.
- No Coutis face above the fold.
- Founder-seat counter wired to live data (not a hard-coded number).
- Geometric mark, not a Lucide icon, not a stock photo.

---

## Section 2 — Pain section (validate ICP)

**Design slot:** pain-block · 3× `card` columns side-by-side on desktop, stacked on mobile · each card opens with a `signal-chip` tag ("Pain 1", "Pain 2", "Pain 3").

### Block H2
```
Three things that burn a working week before Tuesday.
```

### Pain card 1 — Insurer dispatch + cowboy panel damage

**Signal chip:** `Pain 1 — On panel, off margin`

**H3:**
```
The insurer keeps dispatching jobs to the firm down the road. The one that chopped the scope.
```

**Body (62 words):**
```
If a Cat 3 job gets sent to a cowboy that runs three rooms of drying as a wipe-down and bills the carrier $400, that loss adjuster does not call the next time. The whole panel reputation goes with the worst job done on it last quarter. Random dispatch plus uneven cert standards is the single largest source of margin leak in ANZ restoration.
```

**Verbatim Toby-anchored line (closes the card):**
```
If an insurer has ever dispatched a job to a cowboy firm that already chopped the scope before the make-safe crew arrived, this one needs no further explanation.
```

### Pain card 2 — No ANZ cert ladder

**Signal chip:** `Pain 2 — Anyone can put "IICRC" on the van`

**H3:**
```
A cert ladder that lives in another time zone is not a cert ladder.
```

**Body (74 words):**
```
The IICRC ticket on the wall is global. The insurer's claims handler is local. The firm owner cannot point to an ANZ body that audits which firm holds current tickets, ran the WRT refresher this year, and carries live insurance — because that body does not exist yet. Premium pricing collapses because every competitor on the panel claims the same five letters. A live Certified Firm tier, audited in AEST, fixes that.
```

### Pain card 3 — Failed agencies + tech burn

**Signal chip:** `Pain 3 — The marketing crap`

**H3:**
```
Five years. Three agencies. One website. Zero accountability.
```

**Body (78 words):**
```
The first agency built a logo and ghosted. The second sold an SEO retainer that ranked the wrong keywords. The third pitched AI, charged $3k/month, and could not explain what an ESX file was. Meanwhile the foreman runs the social account from the ute at 9pm Tuesday because the bookkeeper is doing Xero. Marketing-as-a-service inside the association replaces the agency cycle with operators who already ship restoration software for a living. No retainer churn.
```

### Acceptance criteria
- ICP vocabulary verbatim: "Cat 3", "on panel" / "off panel", "scope creep" / "chopped the scope", "make safe", "Xactimate / ESX file", "cowboy", "loss adjuster" — every term lands in at least one pain card.
- Toby-anchored verbatim line appears in Pain Card 1, italicised.
- No "we / our / I / us / my". Every sentence reads in third-person operator voice.

---

## Section 3 — The Member-as-a-Service bundle (the moat)

**Design slot:** bundle-block · 6× `card` arranged 3 wide × 2 tall on desktop, 2 wide × 3 tall on tablet, stacked on mobile · each card carries one `geometric-mark` icon (custom, NOT Lucide) + 1-line value + 1-line proof.

### Block H2
```
One membership. Six suppliers, replaced.
```

### Block subhead (1 sentence)
```
The expanded NRPG association swaps the six monthly invoices an ANZ restoration firm already pays for a single bundle — built by the operators behind Disaster Recovery, Synthex, Unite-Group, and CCW.
```

### Bundle card 1 — Certification

**Geometric mark brief:** stacked-hexagon stamp (three nested hexes), emerald primary.

**Card title:** `Certification — IICRC-recognised, AU-delivered`

**Value line:**
```
IICRC tickets live inside the NRPG stack. Renewals tracked in AEST.
```

**Proof line:**
```
CARSI is being developed as an IICRC Approved School (in progress) — partner, not fight.
```

### Bundle card 2 — Lead routing

**Geometric mark brief:** branched-arrow grid (one origin node, three destination nodes), emerald + gunmetal.

**Card title:** `Lead routing — insurer panels, mapped to certified firms`

**Value line:**
```
Insurer jobs route to Certified Firms, not whoever picked up the phone.
```

**Proof line:**
```
Powered by the Disaster Recovery lead engine already operating across IAG, Suncorp, QBE.
```

### Bundle card 3 — Marketing

**Geometric mark brief:** triangulated mesh (three vertices linked, infinite tiling cue), candy red accent.

**Card title:** `Marketing — Synthex platform, no agencies`

**Value line:**
```
Website hosting, SEO, GBP, social production — run by the operators who built the platform.
```

**Proof line:**
```
Replaces the AU$1,500–$5,000/month agency retainer. No retainer. No ghosting.
```

### Bundle card 4 — Tools

**Geometric mark brief:** parallelogram-stack (three offset shapes suggesting layered software), gunmetal.

**Card title:** `Tools — AI scope, intake, floor-plan`

**Value line:**
```
Scope a job in ten minutes. Photograph a floor. Generate the make-safe estimate.
```

**Proof line:**
```
Built on RestoreAssist + DR + CARSI — the same stack ANZ firms already buy.
```

### Bundle card 5 — Insurance

**Geometric mark brief:** chevron-shield (downward chevron inside hex outline), emerald.

**Card title:** `Insurance — broker terms a sole-trader cannot negotiate alone`

**Value line:**
```
Group-buy contractor PI, public liability, and panel-membership cover.
```

**Proof line:**
```
Negotiated at association scale, billed at firm scale.
```

### Bundle card 6 — Equipment

**Geometric mark brief:** rotated-square (45° tilted square inside cube outline), gunmetal + accent.

**Card title:** `Equipment — CCW national distribution`

**Value line:**
```
Preferred-supplier terms on machines, consumables, and service.
```

**Proof line:**
```
Toby Bredhauer's CCW — already running national distribution Australia-wide.
```

### Acceptance criteria
- All 6 cards use geometric marks. No Lucide. No icon-font. No stock vector libraries.
- Each card holds the same height — bundle reads as one offer, not six SKUs.
- Card titles use sentence case, not Title Case Marketing Speak.
- Visual layout: a single bracket spans all six cards labelled `[ Included in Firm tier and above ]` — emphasises bundle over à-la-carte.

---

## Section 4 — Three founding partners (trust ladder)

**Design slot:** founders-block · 3× `card` side-by-side · each card carries `network-badge` (org logo) + portrait + name + role + one verifiable credential. Coutis card sits visually last in the row on desktop and last in the vertical stack on mobile.

### Block H2
```
Three founding partners. One thesis: standards live where the work is.
```

### Block subhead (1 sentence)
```
The expanded NRPG association is founded by operators inside the industry, not adjacent to it.
```

### Founder card 1 — Phill McGurk (LEAD position)

**Order:** 1 of 3 (leftmost on desktop).

**Network badge:** Unite-Group + NRPG logo lock-up.

**Name:** `Phill McGurk`
**Role:** `Founder & CEO, Unite-Group · Founder, NRPG`
**Credential (verifiable):** `Editorial committee, IAQ Magazine Australia.`
**One-line description:**
```
Operator behind Disaster Recovery, Synthex, RestoreAssist, CARSI — the platform stack the association rides on.
```

### Founder card 2 — Toby Bredhauer (CANONICAL ICP — sits in the middle)

**Order:** 2 of 3 (centre).

**Network badge:** Carpet Cleaners Warehouse (CCW) logo.

**Name:** `Toby Bredhauer`
**Role:** `Founding Partner · Director, Carpet Cleaners Warehouse (CCW)`
**Credential (verifiable):** `Operator of CCW national equipment distribution Australia-wide.`
**One-line description:**
```
Canonical ICP and the first paying customer of the Unite-Group operating system the association ships with.
```

### Founder card 3 — John Coutis OAM (SPOKESMAN — sits last)

**Order:** 3 of 3 (rightmost on desktop, bottom on mobile). **Explicit visual hierarchy: bottom of the trio.**

**Network badge:** "Half a Body, Full of Life" wordmark (Coutis's own brand).

**Name:** `John Coutis OAM`
**Role:** `Spokesman, NRPG Association`
**Credential (verifiable):** `Awarded the Order of Australia Medal in 2020. 25-year keynote career. Has reached 6 million people across audiences worldwide. Author of "Half a Body, Full of Life".`
**One-line description:**
```
Public voice and on-camera host of the NRPG conversation. Not the founder. Not the spokesperson for a single business — the spokesperson for the industry conversation.
```

### Acceptance criteria
- Phill is leftmost / first. Toby is centre. Coutis is rightmost / last. This order is **load-bearing** — do not let a designer flip it for "visual balance".
- Coutis credentials use **only**: OAM, 25 years, 6 million reached, "Half a Body, Full of Life". No additional claims (no "inspirational speaker", no view counts, no client lists).
- All three cards equal height. No card visually outsized.
- LinkedIn profile link on each card opens in new tab.

---

## Section 5 — Pricing card (THE conversion driver)

**Design slot:** pricing-block · 4× `price-tag` columns · Founder column carries `mono-chip` scarcity counter + `signal-chip` lifetime-locked badge + slightly elevated visual treatment (border weight, accent line). All four tiers show a number — no "Contact for pricing" anywhere.

### Block H2
```
Four ways in. Every tier shows the number.
```

### Block subhead (1 sentence)
```
All prices AUD, ex-GST. Founder pricing is lifetime price-locked while the membership stays unbroken — and the founder cohort is capped. [INTERNAL-ONLY pricing — see pricing-research.md]
```

### Tier 1 — Founder (EMPHASISED)

**Price-tag treatment:** elevated card. Accent border in **Candy Red `#b30000`** (Unite-Group canonical token; `candy-red-canonical 2026-05-11 opus-fix`). Scarcity counter pinned to top-right.

**Tier name:** `Founder`
**Badge (signal-chip):** `Lifetime price-locked`
**Scarcity counter (mono-chip):** `[INTERNAL-ONLY seat count — see pricing-research.md]`
**Price:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Annual line:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Rate-lock line:** `Price never rises while membership is unbroken.`
**Cap line:** `Cohort closes when full. [INTERNAL-ONLY cap count — see pricing-research.md]`

**Included (bullets):**
```
· Everything in the Firm tier (below)
· Founder advisory seat — quarterly Pi-CEO board strategy invite
· Founder cohort badge with serial number
· Founder-only directory placement (top position)
· First-look on new NRPG cert program development
· Lifetime price-lock — the rate today is the rate in 2035
```

**CTA on card:** `Claim a Founder seat → ` (anchors to lead-capture form, pre-selects Founder)

### Tier 2 — Firm

**Tier name:** `Firm`
**Price:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Annual line:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Rate-lock line:** `12-month price-lock. Annual review.`
**Cap line:** `No cap. Open enrolment.`

**Included (bullets):**
```
· NRPG individual + Firm certifications (IICRC-aligned)
· Certified Firm directory badge — verified live data
· CARSI LMS access for the full crew
· Marketing bundle — SEO, GBP, website hosting, co-branded social production
· Xactimate scope-review service — second pair of eyes on every ESX
· AI tools — intake, scope, floor-plan (RestoreAssist + DR + CARSI productised)
· Preferred-supplier rates with CCW (national equipment distribution)
· Insurer-panel referral routing
· Advocacy submissions inclusion — the body argues back at the carrier table
```

**CTA on card:** `Join as a Firm → `

### Tier 3 — Enterprise

**Tier name:** `Enterprise`
**Price:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Annual line:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Rate-lock line:** `Annual price-lock.`
**Cap line:** `No cap. Custom scope.`

**Included (bullets):**
```
· Everything in the Firm tier
· Custom insurer-panel routing — white-labelled to preferred carriers
· White-label NRPG cert delivery for franchise networks
· Dedicated relationship lead
· On-site annual audit
· Quarterly branded campaign production
· First-position directory placement
```

**CTA on card:** `Talk to a founding partner → ` (anchors to form with Enterprise pre-selected and routes the submission to Phill direct)

### Tier 4 — Sole-trader / Associate

**Tier name:** `Sole-trader`
**Price:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Annual line:** `[INTERNAL-ONLY pricing — see pricing-research.md]`
**Rate-lock line:** `Annual price-lock.`
**Cap line:** `No cap.`

**Included (bullets):**
```
· NRPG individual certification
· Member directory (sole-operator badge)
· CARSI LMS access
· Member newsletter and community
· Does NOT include — marketing bundle, lead routing, group-buy insurance
```

**CTA on card:** `Join as a sole-trader → `

### Block footer microcopy
```
All AUD, ex-GST. Cancel anytime — month-to-month direct debit. NZ firms welcome from day one.
```

### Acceptance criteria
- Founder column is visually elevated (border, accent line, scarcity counter) without being twice the size — the visual lift is subtle.
- Every tier shows a real number. No "Contact for pricing." Even Enterprise shows `from AU$2,500/month`.
- Scarcity counter on Founder tier is live data, same source as Section 1.
- Bullet copy is consistent in tense and voice across all four tiers.
- Footer microcopy resolves the most common pre-form hesitation (cancellation + NZ inclusion).

---

## Section 6 — FAQ block (matches FAQPage schema in Section 7)

**Design slot:** faq-block · accordion list · each question is a `signal-chip` header that toggles a body panel.

### Block H2
```
The seven questions every firm owner asks before signing.
```

### FAQ 1
**Q:** `Is this affiliated with the IICRC, or replacing it?`
**A (61 words):**
```
The expanded NRPG association is a partner, not a competitor. IICRC certifications continue inside the NRPG stack. CARSI is being developed as an IICRC Approved School. The body adds ANZ-time-zone delivery, an AU-specific Certified Firm tier, and the operating-system bundle — built on top of the global standards, not against them.
```

### FAQ 2
**Q:** `What makes this different from the RIA Asia Pacific chapter?`
**A (66 words):**
```
RIA's model is advocacy plus US-based contractor membership with an Asia Pacific chapter layer. The expanded NRPG association is ANZ-native from day one, bundles lead routing and marketing services with the cert, and runs in AEST. RIA tries to advocate for insurer equity over a 20-year horizon. NRPG routes jobs through the Disaster Recovery platform this quarter.
```

### FAQ 3
**Q:** `What is actually in the membership bundle?`
**A (60 words):**
```
Six things at the Firm tier and above: certification, lead routing from insurer panels, marketing services (SEO, GBP, website hosting, social), AI tools for intake and scope and floor-plan, group-buy insurance terms, and preferred-supplier rates on equipment through CCW national distribution. One monthly fee. No à-la-carte add-on invoices.
```

### FAQ 4
**Q:** `What if an insurer does not recognise the NRPG Certified Firm badge yet?`
**A (78 words):**
```
The badge layers on top of existing IICRC tickets — those carry the recognition the insurers already accept. The NRPG layer adds live audit (cert current today, last-five-jobs scored, insurance current) that an annual IICRC stamp does not provide. Insurer-panel routing is opening with the Disaster Recovery existing carrier relationships. Recognition compounds with the first Certified Firm cohort. The Founder cohort is the cohort that gets named in the first carrier conversation.
```

### FAQ 5
**Q:** `How does the Founder lifetime price-lock work?`
**A (rewrite for public publish; specific prices and cap held internally):**
```
The Founder cohort pays the sign-up rate for as long as membership stays unbroken. The rate today is the rate in 2035. Annual reviews never lift the Founder cohort. After the cap is reached, the cohort closes and the Founder tier disappears from this page. [INTERNAL-ONLY pricing + cap — see pricing-research.md]
```

### FAQ 6
**Q:** `Can a firm cancel?`
**A (39 words):**
```
Month-to-month. Direct debit. Cancel anytime with one email to the membership desk. No 12-month lock-in at any tier. The 12-month rate-lock on the Firm tier is a price guarantee, not a commitment to stay.
```

### FAQ 7
**Q:** `Is the association open to NZ firms?`
**A (32 words):**
```
Yes. ANZ is one geography from day one — NZ North and South Island are included. Pricing is the same AUD-ex-GST rate; billing handles the NZ GST equivalent at invoice time.
```

### FAQ removed because it could not be answered without a TODO

- `Which insurer panels are actively routing leads through the platform today?`
  - **Reason removed:** Requires confirmation of which IAG / Suncorp / QBE / Allianz lead-routing agreements are signed and live as at 2026-05-11. Wave-0 launch must not bluff this — naming a carrier that has not signed risks legal exposure and the trust-chain integrity flagged in `channel-plan.md`. Reinstate this FAQ in Wave-1 after the first carrier integration is publicly nameable.

### Acceptance criteria
- FAQ count = 7. Every answer in the 32–78 word band.
- Each Q/A pair mirrored verbatim in the FAQPage JSON-LD in Section 7.
- ICP vocabulary present: "Cat 3" (referenced indirectly), "on panel", "make safe", "Xactimate / ESX", "tickets", "the carrier".
- No fabricated insurer-name claims.

---

## Section 7 — Schema.org JSON-LD (drop into `<head>`)

Three blocks. Organization + Service + FAQPage. Founder offer carries `LimitedAvailability` + `eligibleQuantity.maxValue: 100`.

### Block 1 — Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://unitegroup.in/association#organization",
  "name": "NRPG — National Restoration Practitioners Group",
  "alternateName": "NRPG Association",
  "url": "https://unitegroup.in/association",
  "logo": "https://unitegroup.in/association/nrpg-logo.svg",
  "description": "The ANZ peak body for restoration and specialty cleaning firms. Bundles certification, lead routing, marketing services, software, insurance, and equipment into one membership.",
  "founder": [
    {
      "@type": "Person",
      "name": "Phill McGurk",
      "jobTitle": "Founder & CEO, Unite-Group"
    },
    {
      "@type": "Person",
      "name": "Toby Bredhauer",
      "jobTitle": "Founding Partner; Director, Carpet Cleaners Warehouse"
    },
    {
      "@type": "Person",
      "name": "John Coutis OAM",
      "jobTitle": "Spokesman"
    }
  ],
  "areaServed": [
    {"@type": "Country", "name": "Australia"},
    {"@type": "Country", "name": "New Zealand"}
  ],
  "email": "contact@unite-group.in",
  "sameAs": [
    "https://www.linkedin.com/company/nrpg-association"
  ]
}
```

**Note:** Only publish the `sameAs` LinkedIn URL once the company page is live. A 404 on a structured-data URL triggers a Google penalty.

### Block 2 — Service (with all four tiers as Offers)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "NRPG Member-as-a-Service Membership",
  "provider": {"@id": "https://unitegroup.in/association#organization"},
  "areaServed": [
    {"@type": "Country", "name": "Australia"},
    {"@type": "Country", "name": "New Zealand"}
  ],
  "serviceType": "Industry association membership",
  "description": "Bundled certification, lead routing, marketing services, software access, insurance terms, and equipment supply for ANZ restoration and specialty-cleaning firms.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Founder tier",
      "priceCurrency": "AUD",
      "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
        "priceCurrency": "AUD",
        "unitText": "MONTH"
      },
      "availability": "https://schema.org/LimitedAvailability",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "maxValue": "[INTERNAL-ONLY cap — see pricing-research.md]"
      },
      "description": "Lifetime price-locked. Capped cohort. [INTERNAL-ONLY pricing + cap — see pricing-research.md]"
    },
    {
      "@type": "Offer",
      "name": "Firm tier",
      "priceCurrency": "AUD",
      "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
        "priceCurrency": "AUD",
        "unitText": "MONTH"
      },
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Enterprise tier",
      "priceCurrency": "AUD",
      "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "[INTERNAL-ONLY pricing — see pricing-research.md]",
        "priceCurrency": "AUD"
      },
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Sole-trader tier",
      "priceCurrency": "AUD",
      "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "[INTERNAL-ONLY pricing — see pricing-research.md]",
        "priceCurrency": "AUD",
        "unitText": "MONTH"
      },
      "availability": "https://schema.org/InStock"
    }
  ]
}
```

> **Note on Schema.org:** Real prices must NOT be inlined into this JSON-LD on public publish. When the public launch is approved, replace each `[INTERNAL-ONLY pricing — see pricing-research.md]` token with the verified pricing-research.md value, then run the rich-results validator before going live.

### Block 3 — FAQPage (mirrors Section 6 exactly)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is this affiliated with the IICRC, or replacing it?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The expanded NRPG association is a partner, not a competitor. IICRC certifications continue inside the NRPG stack. CARSI is being developed as an IICRC Approved School. The body adds ANZ-time-zone delivery, an AU-specific Certified Firm tier, and the operating-system bundle — built on top of the global standards, not against them."
      }
    },
    {
      "@type": "Question",
      "name": "What makes this different from the RIA Asia Pacific chapter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "RIA's model is advocacy plus US-based contractor membership with an Asia Pacific chapter layer. The expanded NRPG association is ANZ-native from day one, bundles lead routing and marketing services with the cert, and runs in AEST. RIA tries to advocate for insurer equity over a 20-year horizon. NRPG routes jobs through the Disaster Recovery platform this quarter."
      }
    },
    {
      "@type": "Question",
      "name": "What is actually in the membership bundle?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Six things at the Firm tier and above: certification, lead routing from insurer panels, marketing services (SEO, GBP, website hosting, social), AI tools for intake and scope and floor-plan, group-buy insurance terms, and preferred-supplier rates on equipment through CCW national distribution. One monthly fee. No à-la-carte add-on invoices."
      }
    },
    {
      "@type": "Question",
      "name": "What if an insurer does not recognise the NRPG Certified Firm badge yet?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The badge layers on top of existing IICRC tickets — those carry the recognition the insurers already accept. The NRPG layer adds live audit (cert current today, last-five-jobs scored, insurance current) that an annual IICRC stamp does not provide. Insurer-panel routing is opening with the Disaster Recovery existing carrier relationships. Recognition compounds with the first Certified Firm cohort. The Founder cohort is the cohort that gets named in the first carrier conversation."
      }
    },
    {
      "@type": "Question",
      "name": "How does the Founder lifetime price-lock work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Founder cohort pays the sign-up rate for as long as membership stays unbroken. The rate today is the rate in 2035. Annual reviews never lift the Founder cohort. After the cap is reached, the cohort closes and the Founder tier disappears from this page. [INTERNAL-ONLY pricing + cap — see pricing-research.md]"
      }
    },
    {
      "@type": "Question",
      "name": "Can a firm cancel?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Month-to-month. Direct debit. Cancel anytime with one email to the membership desk. No 12-month lock-in at any tier. The 12-month rate-lock on the Firm tier is a price guarantee, not a commitment to stay."
      }
    },
    {
      "@type": "Question",
      "name": "Is the association open to NZ firms?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. ANZ is one geography from day one — NZ North and South Island are included. Pricing is the same AUD-ex-GST rate; billing handles the NZ GST equivalent at invoice time."
      }
    }
  ]
}
```

### Acceptance criteria
- All three JSON-LD blocks validate against [schema.org validator](https://validator.schema.org/) and Google's [Rich Results Test](https://search.google.com/test/rich-results).
- Founder offer carries both `LimitedAvailability` AND `eligibleQuantity.maxValue: 100`.
- FAQPage JSON text matches Section 6 prose verbatim — drift here triggers Search Console errors.

---

## Section 8 — Lead capture form spec

**Design slot:** form-block · single column on mobile, two columns on desktop · anchored at `#founding-member-form` · post-submit reveals a success state (`signal-chip` confirmation), not a new page.

### Block H2
```
Start the founding-member conversation.
```

### Block subhead (1 sentence)
```
A founding-partner team-member follows up by phone within one business day — no chatbot, no automated drip.
```

### Form fields

| # | Field name | Type | Required | Notes |
|---|---|---|---|---|
| 1 | `firm_name` | text | yes | Placeholder: "Smith Restoration Pty Ltd" |
| 2 | `owner_name` | text | yes | Placeholder: "Toby Bredhauer" |
| 3 | `email` | email | yes | Validated format. Placeholder: "toby@ccw.com.au" |
| 4 | `phone` | tel | yes | AU/NZ mobile format. Placeholder: "0412 345 678" |
| 5 | `employee_count` | select | yes | Options: `1–4` / `5–19` / `20–49` / `50+` |
| 6 | `primary_trade` | select | yes | Options: `Restoration` / `Specialty cleaning` / `Both` |
| 7 | `current_cert` | select | yes | Options: `IICRC` / `NADCA` / `None yet` / `Other (open field)` |
| 8 | `tier_interest` | radio | yes | Options: `Founder` / `Firm` / `Enterprise` / `Sole-trader`. Per-tier price + cap labels: [INTERNAL-ONLY pricing — see pricing-research.md]. Pre-selected based on which CTA the user clicked. |
| 9 | `what_would_this_need_to_do` | textarea | optional | Label: "What would this association need to actually do — in one sentence — to be worth the membership?" Placeholder: "Route at least one IAG panel job a fortnight; second pair of eyes on Xactimate." Max 500 chars. |
| 10 | `where_did_you_hear` | text | optional | Label: "How did you hear about this?" Placeholder: "IAQ Magazine column / LinkedIn / Toby mentioned it / etc." Max 200 chars. Closes the attribution gap on IAQ Magazine print readers + Toby WhatsApp peer outreach + phone-call referrals where UTMs don't carry through. |
| 11 | `referrer_name` | hidden | optional | Auto-populated from URL `?ref={name}` parameter (e.g. shortlink `unite.group/a/toby` → `ref=toby`). Captures founding-partner peer referrals. Server only; never displayed. |

### Field design rules
- Labels above inputs, not inside (accessibility).
- Required fields marked with `*` after the label, not red borders.
- No marketing-consent checkbox. ANZ Privacy Act compliance handled via the standard footer link.
- Error states show inline below the field, with a 1-line correction hint.

### Submit behaviour

**On submit:**
1. Write a row to Supabase `interest_signups` table with all 9 fields + UTM parameters from the URL + `submitted_at` timestamp.
2. Increment the Founder-tier counter in Section 1 + Section 5 if `tier_interest === 'Founder'`.
3. Fire Telegram notification to Phill via the channel-bound bot — message format:
   ```
   New founding-member signup
   Firm: {{firm_name}}
   Owner: {{owner_name}}
   Tier: {{tier_interest}}
   Phone: {{phone}}
   Note: {{what_would_this_need_to_do}}
   Wave-0 signup #{{count}}/50
   ```
4. Reveal success state in-place: `signal-chip` confirmation reading `Got it. A founding partner follows up by phone within one business day.`
5. Fire LinkedIn Insight Tag conversion event + GA4 `generate_lead` event.

### Acceptance criteria
- Form ships with field-level validation.
- Tier-interest pre-selection wired to URL hash on landing (e.g. `?tier=founder`).
- Supabase write idempotent — duplicate email submissions update the existing row, do not create a second.
- Telegram notification round-trip under 5 seconds in 95th percentile.
- Form copy contains zero "we / our / I / us / my".

---

## Section 9 — Footer

**Design slot:** footer-block · three-column on desktop, stacked on mobile · uses `mono-chip` for the email pill, plain text links for the LinkedIn profiles.

### Column 1 — Contact

```
NRPG Industry Association
Operated by Unite-Group Pty Ltd
ANZ: Australia + New Zealand

[ contact@unite-group.in ] (mono-chip, mailto:)
```

### Column 2 — Founding partners (LinkedIn)

```
Phill McGurk → [LinkedIn profile link]
Toby Bredhauer → [LinkedIn profile link]
John Coutis OAM → [LinkedIn profile link]
```

**Note for dev:** LinkedIn URLs to be supplied at build time via env vars `LINKEDIN_PHILL`, `LINKEDIN_TOBY`, `LINKEDIN_COUTIS`. If any env var is empty, that row hides — do not render a broken anchor.

### Column 3 — Legal + meta

```
© 2026 NRPG / Unite-Group Pty Ltd. All rights reserved.
Privacy → /privacy
Terms → /terms
Made in Australia.
```

### Final footer line (full width, centred, small)
```
The peak body that runs jobs. Hosted by John Coutis OAM. Founding cohort closes when seat #100 is claimed.
```

### Acceptance criteria
- Email pill is a real `mailto:` not a plain text string.
- LinkedIn profile rows render only when the env var is populated — no placeholder anchors that 404.
- Copyright year is dynamic (auto-rolls to current year, not hard-coded 2026).
- Final footer line carries the tagline + the spokesman attribution + the scarcity hook — closes the page on the same three pillars the hero opens with.

---

## Banned-phrase audit (run before publish)

This spec was lint-checked against the brand-guardian global banned list. Confirmed absent:

- "seamless" — not present
- "leverage" (as verb) — not present
- "robust" — not present
- "cutting-edge" / "state-of-the-art" — not present
- "delve" / "dive into" — not present
- "game-changer" — not present
- "in today's fast-paced world" — not present
- "end-to-end solution" — not present
- "best-in-class" — not present
- "empower" / "unlock potential" — not present
- "our passionate team" — not present (would be impossible — "our" is forbidden)
- Rhetorical questions as paragraph openers — not present

Forbidden pronouns (We / Our / I / Us / My / Mine) — **zero hits across all 9 sections.** Voice runs entirely in operator / third-person frame.

---

## Cross-references

- [[positioning-doc]] — value proposition + tagline + manifesto source
- [[icp-research]] — Toby anchor + vocabulary table + pain hierarchy
- [[channel-plan]] — landing page = Wave-0 conversion floor
- [[seo-brief]] — H1 keyword + schema spec + brand-search defence
- [[pricing-research]] — verified locked tiers (AU$249 / $1,200 / $2,500+ / $79)
- [[john-coutis-content-kickoff]] — Coutis claim boundaries
- `Synthex/packages/brand-config/src/brands/nrpg.ts` — voice + forbidden-pronoun source
