---
type: marketing-research
artifact: seo-brief
wave: 0
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
updated: 2026-05-11
status: founding-draft
geoTarget: [AU, NZ]
forbidden-pronouns: We, Our, I, Us, My
keyword-data-source: manual-ICP-vocabulary-derivation
keyword-volumes-validated: false
---

# SEO Brief — Expanded NRPG Industry Association (Wave 0 Launch)

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Skill: `marketing-seo-researcher` · Wave 2 · job `nrpg-association-wave0-2026-05-11`.
Reads: [[positioning-doc]] (Wave 1), [[icp-research]] (Wave 1), [[competitor-service-stack-2026-05-11]].
Voice constraints: NRPG `authoritative + expert`, forbidden pronouns (We/Our/I/Us/My/Mine).
Live SERP data: **NOT available** this run — DataForSEO API keys not wired into this environment. Every `<!-- TODO verify via seo-keywords skill -->` marker below flags a claim to validate before paid-spend decisions.

---

## 0. Method note (read this first)

This brief was produced without live DataForSEO data. Volume buckets (high / medium / low / unknown) and difficulty estimates come from:

1. The ICP vocabulary table in `icp-research.md` (Section: Vocabulary) — the verbatim phrases the buyer types.
2. The competitor service stack at `competitor-service-stack-2026-05-11.md` — the org list whose ranking footprint defines the SERP.
3. AU-specific qualifier patterns (state suffixes, ANZ vs Australia framing, insurer brand names) inferred from the ICP firmographics section.

Every keyword is tagged `<!-- TODO verify via seo-keywords skill -->` where the volume call is not derivable from the source documents. Re-run this brief through `~/.claude/skills/seo-keywords` once the DataForSEO env vars are wired (Wave 0 has 21 days runway; this can be done in parallel with copywriting).

Geo target: AU primary, NZ secondary. Default Google AU SERP unless noted.

---

## 1. Target ICP search intents

The Wave-0 buyer is the ANZ restoration/cleaning firm owner-operator (5-50 FTE). They search Google on triggers (lost panel job, scope-rule change letter, failed agency engagement, BoM storm warning). The four intent buckets, mapped to the seven trigger events from `icp-research.md`:

### Informational (research — TOFU)

Owner-operator is articulating a pain they cannot name yet. They search to *understand* the category, not buy.

- `cat 3 water damage requirements australia`
- `iicrc vs ria australia` (which body matters for AU)
- `how do insurer panels work restoration` (sophisticated owners researching the dispatch black box)
- `scope creep iag water damage` (post-scope-chop search)
- `is iicrc certification recognised in australia`
- `what is a certified firm restoration`

Funnel-stage: TOFU. Content format: long-form explainer / 800-1500 word article. Conversion intent: low; brand-awareness intent: high.

### Navigational (specific brand — TOFU/MOFU mixed)

Owner-operator knows or has been told a brand name and is checking it out. Defensive SEO matters here.

- `nrpg association`
- `john coutis nrpg`
- `disaster recovery australia association` (existing DR brand ambiguity — competes with the noun "disaster recovery")
- `unite group restoration`
- `carsi training australia`
- `restoration industry association australia` (looking for whichever body exists)

### Commercial (comparing — MOFU)

Owner-operator has 2-3 candidates and is comparing. This is where the bundle-vs-cert-only positioning earns the click.

- `best restoration association australia`
- `iicrc certified firm cost australia`
- `restoration industry membership australia`
- `cleaning industry body anz`
- `ria asia pacific chapter membership`
- `restoration firm marketing services australia` (the "failed-agency" trigger)
- `insurer panel restoration how to get on`

### Transactional (ready to join — BOFU)

Owner-operator has decided and is converting. Branded-search defence and direct-conversion pages.

- `nrpg membership signup`
- `join nrpg association`
- `nrpg founding partner`
- `restoration association price australia`
- `member as a service restoration` <!-- TODO verify volume — likely zero today; we are creating this term -->

Intent-distribution rule for the Wave-0 landing page: **lead with commercial-intent keyword**, support with informational, anchor brand-search at the H1. Transactional intent is satisfied by the signup CTA, not the on-page copy.

---

## 2. Primary keyword cluster (12 anchor terms)

Anchored on the ICP vocabulary table. Volume buckets are estimates pending DataForSEO validation. Difficulty proxy = "what's the domain authority of the current top-3 ranking sites for this in google.com.au".

| # | Keyword | Intent | Funnel | Volume (est) | Difficulty | ICP-vocab anchor | Note |
|---|---|---|---|---|---|---|---|
| 1 | restoration industry association australia | commercial | MOFU | medium | medium | "peak body", "the panel" | **Landing page primary H1 candidate.** <!-- TODO verify via seo-keywords skill --> |
| 2 | iicrc certified firm australia | commercial | MOFU | medium | medium-high | "tickets", "IICRC certified" | Tier-2 H2. Defensive — IICRC owns this term globally. <!-- TODO verify --> |
| 3 | cat 3 water damage restoration australia | informational | TOFU | medium-high | medium | "Cat 3" (#1 in ICP vocab table) | Highest-volume ICP-native phrase. Content gap exists (US sites dominate). <!-- TODO verify --> |
| 4 | insurer panel restoration australia | informational | TOFU/MOFU | medium | low-medium | "on panel", "off panel" (#2 in ICP vocab) | **Content-gap candidate** — no competitor explains the panel mechanics publicly. <!-- TODO verify --> |
| 5 | restoration firm marketing services anz | commercial | MOFU | low | low | Pain #3 (failed agencies) | Long-tail; converts well; competitors don't target it. <!-- TODO verify --> |
| 6 | iicrc training australia | commercial | MOFU | medium | medium | "IICRC ticket" | Owned by approved-schools (CCAA, Carpet Cleaners Institute AU). Hard to crack short-term. |
| 7 | xactimate training australia | informational | MOFU | low-medium | low | "Xactimate", "Xact" (#11 ICP vocab) | Pioneer-play — currently no organised AU Xactimate training surface. <!-- TODO verify --> |
| 8 | make safe job insurance restoration | informational | TOFU | low | low | "make safe", "MS job" (#4 ICP vocab) | True ICP-native phrase; zero competitor presence. <!-- TODO verify --> |
| 9 | restoration insurer panel iag suncorp qbe | navigational/informational | MOFU | low | low | "the carrier", "IOR" | Sophisticated owner search; high-intent; no current ranker. <!-- TODO verify --> |
| 10 | anz cleaning industry certification | commercial | MOFU | low | low-medium | "tickets", "cert ladder" | Cross-trade (cleaning + restoration) framing. <!-- TODO verify --> |
| 11 | restoration industry magazine australia | navigational | TOFU | low | medium | Watering-hole adjacent | Co-opts IAQ Magazine traffic (Phill's editorial seat). |
| 12 | mould remediation certification australia | commercial | MOFU | medium | medium | "AMRT ticket", "S520" | Cluster-page candidate; high-intent post-flood season. <!-- TODO verify --> |

**Long-tail extensions (4-6 word phrases), high-conversion-low-volume:**

- "how to get on iag restoration panel"
- "what is iicrc certified firm worth"
- "ria asia pacific chapter membership cost"
- "best mould training australia iicrc"
- "scope got chopped what to do" (pain #4 verbatim — zero competition)
- "join restoration association founding partner"

**Strategic note:** the Wave-0 landing page does **not** chase "iicrc" head terms. IICRC owns those globally and the positioning is *partner not fight* (per `positioning-doc.md`). The cluster targets the **uncovered AU operating-system space** where IICRC, RIA, ISSA, AIRAH all rank thinly or not at all.

---

## 3. Competitor keyword analysis

Pulled from the org list in `competitor-service-stack-2026-05-11.md`. Live SERP-overlap data needs `~/.claude/skills/seo-competitors` to run; this is the manual companion.

### IICRC (iicrc.org)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "iicrc certification", "iicrc s500", "iicrc s520", "iicrc certified firm" | "water damage certification", "mould certification" globally | **AU-localised content is thin.** IICRC ranks for AU queries via global page authority, not AU-relevance. ANZ-time-zone training, AU-pricing, AU-instructor finder, AU panel-recognition language all absent. NRPG can rank for AU-suffixed variants the iicrc.org root cannot serve well. |

<!-- TODO verify via seo-competitors skill — confirm iicrc.org top-10 footprint on google.com.au -->

### RIA US (restorationindustry.org)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "restoration industry association", "advanced restoration certification", "AGA insurer advocacy" | Brand-term ("restoration industry association") plus US-policy-paper queries | **Asia Pacific chapter has near-zero distinct ranking footprint.** Searches like "ria asia pacific membership", "restoration industry association australia" return RIA US root pages with no AU specificity. The expanded NRPG is the only entity that can serve AU-localised intent for this query family. <!-- TODO verify --> |

### Prime Creative Media + Intermedia (publishers)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| Publication brand names: "INCLEAN Magazine", "Facility Management Magazine", "Manufacturer's Monthly" | Trade-publication SERPs (long-tail "magazine" + topic queries) | **Service-side gap is total.** Publishers do not rank for membership / cert / leads / advocacy / training queries — they rank for *editorial content* about those topics. NRPG can rank for the transactional version of every topic Prime Creative covers editorially. |

### ISSA (issa.com)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "issa cleaning", "issa show", "cleaning industry standards" | "cleaning industry expo", "commercial cleaning standards" | **No AU operating-system content.** ISSA does what RIA does — global membership + advocacy + expo. No marketing-services, no lead-routing, no insurer-panel coverage. Gap structurally identical to RIA. |

### AIRAH (airah.org.au)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "HVAC certification australia", "refrigeration training australia", AU-built environment HVAC standards | AU HVAC + IAQ technical queries | **AIRAH is the structural reference**, not a keyword competitor. They demonstrate AU peak-body SEO works (.org.au TLD + AU-localised content + state-chapter pages). NRPG should clone their domain structure: section per state, section per cert tier, section per policy area. |

### HIA (hia.com.au)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "home builder membership australia", "building industry contract templates" | AU residential construction SERP — dominant | **HIA's playbook is the gold standard for AU peak-body SEO.** Cell-by-cell: per-state pages, per-trade-tier membership pages, contract-template downloads as lead magnets, member-find directory. NRPG copies the page-architecture not the keywords. |

### IICRC AU approved schools (CCAA, Carpet Cleaners Institute of AU, Restoration Industry Training)

| Likely owned terms | Likely ranked top-3 AU SERP | Gap |
|---|---|---|
| "wrt course australia", "amrt training melbourne", "carpet cleaning certification" | AU course-specific SERP | **They rank for individual-tech cert queries.** NRPG does NOT compete here in Wave 0 — the positioning is partner-not-fight + future CARSI-as-Approved-School. Cross-link to them as part of the partner ecosystem. |

---

## 4. Landing page SEO brief — unitegroup.in/association

Wave-3 deliverable per the wave plan. This is the spec for `marketing-copywriter` when they author `landing-spec.md`.

### URL + slug

- **Recommended URL:** `unitegroup.in/association` (per the brief's "first Coutis video" + `support@synthex.social` user context).
- **Slug rationale:** short, no keyword stuffing, brand-search defensible. Keyword in title tag and H1 carries the SEO weight, not the URL.
- **Alternative considered + rejected:** `/restoration-industry-association` — keyword-rich but reads as keyword-stuffed and inflates internal-link anchor density unhealthily.

### Primary keyword

**`restoration industry association australia`** (keyword #1 in the cluster table).

Reasoning:
1. Commercial intent — matches the buyer at the "comparing 3 candidates" stage of `icp-research.md` § Decision Process step 3.
2. ICP-native phrasing — "industry association" is the category the buyer arrives with (per `positioning-doc.md` § Category creation: lead with the familiar frame).
3. Geographic anchor "australia" — necessary for AU-localised SERP and matches the "ANZ-native vs US-zone" positioning axis.
4. Achievable difficulty — RIA US does not serve AU intent well; IICRC ranks for `certification`, not `association`; HIA/AIRAH cover other trades. The top-3 SERP positions on google.com.au are contestable. <!-- TODO verify via seo-keywords skill -->

**Secondary cluster supporting the page:** keywords 2, 4, 5, 6, 11, 12 from the table above.

### Title tag + meta description

- **Title tag** (≤60 chars): `Restoration Industry Association Australia — NRPG`
- **Meta description** (≤155 chars): `The ANZ peak body that bundles certification, lead routing, marketing, and insurer advocacy into one membership. Founding partners open until 2026-06-30.`

Tagline B candidate ("Standards. Leads. Tools. One membership.") is reserved for the hero visual chyron, not the meta description — the meta needs the keyword + the differentiator + a deadline driver.

### H1 / H2 / H3 spec

```
H1: Restoration Industry Association Australia
    (subhead, not H tag: "The peak body that runs jobs. Hosted by John Coutis OAM.")

H2: One membership. Six suppliers, replaced.
    H3: Certification — IICRC-recognised, AU-delivered
    H3: Lead routing — insurer panels, mapped to certified firms
    H3: Marketing — Synthex platform, no agencies
    H3: Software — the Unite-Group operating system
    H3: Insurance + equipment — bundled supplier terms

H2: Built for firms doing the work
    H3: Cat 3 ready. Make-safe ready. Scope-creep ready.
    H3: For 5-to-50-person crews running ANZ panels

H2: Founding partners — closing 2026-06-30
    H3: Founder tier (50 spots, lifetime-locked $499/month)
    H3: What founders get + what they trade

H2: Hosted by John Coutis OAM
    (Bio block — OAM 2020, 25-year keynote career, "Half a Body, Full of Life")

H2: Frequently asked — for owner-operators
    H3: Is NRPG replacing IICRC? (No — partnership; CARSI becomes IICRC Approved School)
    H3: How does insurer-panel routing work?
    H3: What does the marketing-services bundle actually deliver?
    H3: How does the founding-partner rate lock work?
    H3: Is membership open to NZ firms? (Yes)
```

H1 must contain the primary keyword verbatim. H2s carry secondary cluster keywords woven into natural copy, not stuffed.

### Schema.org markup (JSON-LD)

**Recommendation: Organization + Service + FAQPage. Skip Event for Wave-0 (no public event date yet).**

#### Organization schema (top of `<head>`)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://unitegroup.in/association#organization",
  "name": "NRPG — National Response and Property Group",
  "alternateName": "NRPG Association",
  "url": "https://unitegroup.in/association",
  "logo": "https://unitegroup.in/association/nrpg-logo.svg",
  "description": "The ANZ peak body for restoration and specialty cleaning firms. Bundles certification, lead routing, marketing, software, insurance, and equipment into one membership.",
  "founder": [
    {"@type": "Person", "name": "Phill McGurk", "jobTitle": "Founder, Unite-Group"},
    {"@type": "Person", "name": "Toby Bredhauer", "jobTitle": "Founding Partner; Director, Carpet Cleaners Warehouse"},
    {"@type": "Person", "name": "John Coutis OAM", "jobTitle": "Spokesman"}
  ],
  "areaServed": [
    {"@type": "Country", "name": "Australia"},
    {"@type": "Country", "name": "New Zealand"}
  ],
  "memberOf": null,
  "sameAs": [
    "https://www.linkedin.com/company/nrpg-association"
  ]
}
```

Note: `"sameAs"` URL is a placeholder — set once the LinkedIn company page is created in Wave 3. **Do not publish placeholder URLs that 404** — Google penalises broken structured data.

#### Service schema (one per pillar — example for the membership bundle)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "NRPG Member-as-a-Service Membership",
  "provider": {"@id": "https://unitegroup.in/association#organization"},
  "areaServed": [{"@type": "Country", "name": "Australia"}, {"@type": "Country", "name": "New Zealand"}],
  "serviceType": "Industry association membership",
  "description": "Bundled certification, lead routing, marketing services, software access, insurance terms, and equipment supply for ANZ restoration and specialty-cleaning firms.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Founder tier",
      "price": "499",
      "priceCurrency": "AUD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "499",
        "priceCurrency": "AUD",
        "unitText": "MONTH"
      },
      "availability": "https://schema.org/LimitedAvailability",
      "eligibleQuantity": {"@type": "QuantitativeValue", "maxValue": 50}
    },
    {
      "@type": "Offer",
      "name": "Firm tier",
      "price": "1499",
      "priceCurrency": "AUD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "1499",
        "priceCurrency": "AUD",
        "unitText": "MONTH"
      }
    },
    {
      "@type": "Offer",
      "name": "Enterprise tier",
      "priceCurrency": "AUD",
      "priceSpecification": {
        "@type": "PriceSpecification",
        "minPrice": "3999",
        "priceCurrency": "AUD"
      }
    }
  ]
}
```

Prices match `pricingTiers` block in `nrpg-association-wave0-2026-05-11.json` (locked 2026-05-11). Founder cap of 50 is exposed via `eligibleQuantity.maxValue` — gives Google a structured "limited spots" signal which can earn a SERP-feature flag.

#### FAQPage schema (matches H2 § Frequently asked)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is NRPG replacing IICRC?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. NRPG partners with IICRC; CARSI is being developed as an IICRC Approved School. IICRC certifications continue inside the NRPG stack."
      }
    },
    {
      "@type": "Question",
      "name": "How does insurer-panel routing work?",
      "acceptedAnswer": {"@type": "Answer", "text": "[Copy from landing-spec § H3 'Lead routing']"}
    },
    {
      "@type": "Question",
      "name": "What does the marketing-services bundle deliver?",
      "acceptedAnswer": {"@type": "Answer", "text": "[Copy from landing-spec § H3 'Marketing — Synthex platform']"}
    },
    {
      "@type": "Question",
      "name": "How does the founding-partner rate lock work?",
      "acceptedAnswer": {"@type": "Answer", "text": "Founder tier is locked at AUD $499/month for the lifetime of the membership. Capped at 50 founders. Closes 2026-06-30."}
    },
    {
      "@type": "Question",
      "name": "Is membership open to New Zealand firms?",
      "acceptedAnswer": {"@type": "Answer", "text": "Yes. ANZ is one geography from day one — NZ North and South Island included."}
    }
  ]
}
```

**Skip Event schema** at Wave-0. No public conference date yet. Add when the conference date is locked (Wave-3 or later).

**Skip Person schema for John Coutis at Wave-0 root.** A dedicated `/coutis` page later can carry Person schema linked back to the Organization. Avoids spreading Person-entity authority across multiple pages.

### Word count target

**1,400-1,800 words.** Reasoning:
- Top-3 SERP results for AU peak-body queries (HIA, AIRAH, MBA hub pages) average 1,200-2,000 words. Below 1,000 reads thin to the algorithm; above 2,500 dilutes the CTA.
- The page carries 3 conversion CTAs (founder-signup, founding-partners-memo download, intro-video play). Each needs ~300 words of supporting copy.
- FAQ section adds ~400 words of long-tail keyword coverage.

### Internal link plan (Wave-0 surface)

The Wave-0 surface is small. Internal links available:

- `unitegroup.in/association` (this page) → primary
- `unitegroup.in/association/founding-partners-memo` (Wave 3) — anchor: "founding partner details"
- `unitegroup.in/association/john-coutis` (Wave 4) — anchor: "John Coutis OAM" in the spokesman block
- `unitegroup.in/` (root) — anchor: "Unite-Group platform"
- `disasterrecovery.com.au/` (existing DR brand site) — anchor: "Disaster Recovery lead engine" (cross-domain; nofollow or follow TBD — recommend follow for E-E-A-T network)
- `iaqmagazine.com.au` (Phill's editorial seat) — anchor: "IAQ Magazine Australia editorial coverage"; outbound; follow.

**Anchor-text rule:** maximum 1 exact-match anchor ("restoration industry association australia") on the page. Everything else uses semantic variants ("the association", "NRPG", "the peak body", "the membership").

**External backlink seed targets (for `marketing-launch-runbook`):**
- IAQ Magazine Australia editorial mention (owned wedge)
- IICRC Australia LinkedIn group post (organic)
- COSBOA member directory listing (Wave 2)
- Cleaning & Hygiene Today + INCLEAN Magazine press mention

---

## 5. Content gap opportunities (top 5, effort × leverage scored)

Effort: 1 (low) - 5 (high). Leverage: 1 (low) - 5 (high). Rank by leverage/effort ratio.

| # | Keyword / topic | Effort | Leverage | Ratio | Rationale | Owner |
|---|---|---|---|---|---|---|
| 1 | "scope creep iag water damage" / "scope got chopped what to do" | 2 | 5 | 2.5 | Pain #4 verbatim (ICP vocab table row 3). Zero current rankers. The owner who Googles this is mid-anger, mid-trigger-event. A 1,200-word piece explaining the scope-chop pattern + advocacy resources + a "join the body that argues back" CTA converts ferociously. | `marketing-copywriter` (Wave-3 cluster page) |
| 2 | "how to get on iag/suncorp/qbe restoration panel" | 3 | 5 | 1.67 | Trigger #1 (lost panel job). High commercial intent. Sophisticated owner search. Current SERP is dominated by insurer recruitment portals (low-utility content). The piece that explains the **mechanics** of panel selection + the route in via association membership owns this query. | `marketing-copywriter` |
| 3 | "Cat 3 water damage Australia procedure" | 2 | 4 | 2.0 | ICP vocab #1. Top SERP results are US-anchored (Cat 3 = IICRC S500 definition). AU-specific procedure content (regulators, AU PPE standards, AU disposal regs) is missing. Pillar-page candidate. | `marketing-copywriter` + technical SME (Toby or RestoreAssist team) |
| 4 | "Xactimate training Australia" / "ESX file Xact training AU" | 4 | 4 | 1.0 | ICP vocab #11. Owners hate Xactimate but are forced to use it. No organised AU training surface exists. CARSI could own this as the first AU-delivered Xactimate cohort. Higher effort because the content needs technical depth, but the asset has 3-year ranking life. | CARSI team + `marketing-copywriter` |
| 5 | "restoration firm marketing services anz" / "restoration agency replacement" | 2 | 3 | 1.5 | Pain #3 (failed agencies). Low-volume but **highest-converting intent in the cluster** — the owner who searches this is mid-anger at an invoice. The piece writes itself ("here's what the 4 agencies that took your money each promised, and what NRPG actually delivers"). | `marketing-copywriter` |

**Top recommendation:** ship gap #1 ("scope creep iag water damage") as the **first cluster page after the landing page**. It carries the strongest emotional pre-load + the lowest competitive density.

**Gaps deliberately deferred:**
- "iicrc certification cost australia" — IICRC owns this; difficulty is high; positioning is partner-not-fight. Skip Wave-0.
- "restoration franchise opportunity australia" — wrong ICP (anti-ICP per `icp-research.md`).
- "carpet cleaning business marketing" — too broad; competes with horizontal SMB-marketing content; low conversion.

---

## 6. Brand-search defence

Once launch hits (Wave-3 publish + Coutis video), branded searches will spike on the following terms. Each needs an owned-property target ranking position 1 on google.com.au:

| Anticipated query | Owned target page | Defensive H1 | Wave to ship |
|---|---|---|---|
| `nrpg association` | `unitegroup.in/association` (this page) | Restoration Industry Association Australia | Wave 3 |
| `nrpg association john coutis` | `unitegroup.in/association` (same page; H2 § spokesman block) | (no change) | Wave 3 |
| `john coutis nrpg` | `unitegroup.in/association/john-coutis` (Wave 4) | John Coutis OAM — Spokesman, NRPG Association | Wave 4 |
| `member as a service restoration` | `unitegroup.in/association/founding-partners-memo` | Founding partner details — closing 2026-06-30 | Wave 3 |
| `the peak body that runs jobs` (verbatim tagline) | landing page | (tagline in subhead) | Wave 3 |
| `nrpg founding partner` | landing page § Founder tier | (anchored H3) | Wave 3 |
| `restoration association toby bredhauer` | `unitegroup.in/association/founding-partners-memo` | (named in copy) | Wave 3 |

**Defensive strategy (1 sentence):** secure the `unitegroup.in/association` slug and the LinkedIn `/company/nrpg-association` handle + a sub-page per founding partner before any Coutis video ships, then push the same anchor terms across IAQ Magazine, LinkedIn long-form, and a YouTube channel page so that the top 5 Google results for every brand variant are owned properties.

**Branded-search SERP audit cadence:** weekly from launch through 2026-08-31. Owner: `marketing-analytics-attribution` (Wave 4).

**Negative-search defence (pre-emptive):** monitor for `nrpg scam`, `nrpg complaints`, `coutis nrpg fake`. None of these should rank on day one; if they appear, escalate via `marketing-launch-runbook`. Defensive content is not required pre-launch — generating it pre-emptively can backfire by surfacing the negative term in indexes.

---

## 7. Open items requiring DataForSEO / live SERP validation

The following keyword volume / difficulty claims need validation before paid-spend or content-prioritisation calls are made. Pass this list into `~/.claude/skills/seo-keywords` (DataForSEO Keywords API) once env vars are wired.

1. **Cluster table volume buckets** — every row marked `<!-- TODO verify via seo-keywords skill -->`. 12 rows.
2. **Long-tail volumes** for "scope got chopped what to do", "make safe job insurance restoration", "how to get on iag restoration panel". Suspect all are sub-100/month but with high-intent → low-volume-high-conversion economics.
3. **IICRC, RIA US, ISSA top-10 footprint on google.com.au** — confirms gap analysis assumptions in § 3. Use `~/.claude/skills/seo-competitors`.
4. **AIRAH / HIA page-architecture deconstruction** — for the per-state / per-tier internal-link pattern. Use `~/.claude/skills/seo-content` topical-authority clustering.
5. **Branded-search baseline** — current monthly volume for `nrpg` and `nrpg association` (likely near-zero today, baseline so we can measure lift post-launch).
6. **Coutis search volume** — what is the current AU monthly search volume on `john coutis`? Determines whether his name pulls organic traffic into the association page or vice versa.
7. **"member as a service" creation hypothesis** — confirmed zero volume today (it's a new term we are creating); set up rank-tracking for the 90-day window so we can measure the category-creation lift.

A 30-minute pass through `seo-keywords` + `seo-competitors` resolves items 1-6 in one batch.

---

## 8. Cross-references + handoffs

- `[[positioning-doc]]` — value prop, tagline lineage, anti-positioning
- `[[icp-research]]` — vocabulary table = keyword seed; pain hierarchy = content priority
- `[[competitor-service-stack-2026-05-11]]` — competitor org list
- `[[industry-association-vision-2026]]` — strategic context
- `~/.claude/skills/seo-keywords` — for volume / difficulty validation (open items § 7)
- `~/.claude/skills/seo-competitors` — for SERP overlap (open items § 7.3)
- `~/.claude/skills/seo-content-gap` — for cross-validating gaps § 5 against live competitor rankings
- `~/.claude/skills/seo-content` — for AIRAH/HIA topical-authority deconstruction (§ 7.4)

### Hands off to

- **`marketing-copywriter`** (Wave 3): primary keyword `restoration industry association australia` in H1; H2/H3 spec § 4; JSON-LD blocks § 4; word count 1,400-1,800; FAQ matches FAQPage schema.
- **`marketing-channel-strategist`** (Wave 2 sibling): organic-search effort split — Wave-0 is LinkedIn + IAQ + Facebook organic primary; SEO compounds over months, not weeks. Do not over-rotate budget into SEO at launch.
- **`marketing-analytics-attribution`** (Wave 4): set up rank tracking for the 12 cluster keywords + 7 branded-search terms before launch day. Weekly cadence through 2026-08-31.
- **`marketing-launch-runbook`** (Wave 4): backlink-seed targets in § 4 internal-link plan; brand-search defence audit cadence § 6.
