---
title: "SEO/AEO/GEO Intelligence Brief — 2026-05-09"
source: "https://www.quantifimedia.com/google-algorithm-update-may-2026-what-changed-and-how-it-impacts-your-rankings"
author: ["Research Agent — Autonomous"]
published: 2026-05-09
created: 2026-05-09
tags: [clippings, research, autonomous, SEO, AEO, GEO, Google, AI-search, algorithm]
---

# SEO/AEO/GEO Intelligence Brief — 2026-05-09

## Google Algorithm: May 2026 Update

Source: Quantifimedia; ALM Corp; ClickRank.ai; Numinix; Rankly Media.

### What Changed (Confirmed — May 2026)

Google rolled a named algorithm update in May 2026 focused on **search intent alignment over keyword matching**. Key confirmed signal changes:

**1. Composite Core Web Vitals Scoring (new)**
- Google now evaluates LCP, INP (formerly FID), and CLS as a **composite score** — not three independent pass/fail gates
- Passing all 3 = compounding ranking benefit
- Failing even 1 = compounded negative effect (non-linear penalty)
- Previous model: passing 2/3 had near-neutral effect. New model: 2/3 now hurts

**2. E-E-A-T Reweighting: "Experience" Now #1 Signal**
- Google's May update elevated **Experience** (first E in E-E-A-T) to the most-weighted signal in the framework
- Practical implication: First-person case studies, practitioner-authored content, demonstrated field experience outweigh academic/aggregated content
- AI-generated content that lacks demonstrable author experience is being deprioritized in sensitive verticals

**3. Brand Trust as Measurable Ranking Signal**
- Repeat visitors, bookmarks, and brand-name queries now measurably feed into SERP position
- "Brand recognition" is being interpreted via behavioral signals: return visit rate, direct navigation, brand-name search volume growth
- Implication: Brand-building activity (not just backlink acquisition) now has direct SERP return

**4. AI-Powered Content Interpretation**
- Google's ranking layer now uses semantic AI understanding — not keyword density
- Over-optimized pages (keyword stuffing, exact-match anchor manipulation) are being deprioritized
- Naturally-written, intent-matched content is being rewarded — even without traditional SEO signals

### AI Overviews (AIO) Data — May 2026

- Google AI Overviews appear in **~25.8% of all US searches** (early 2026)
- Informational queries trigger AI Overviews **39% of the time**
- Google AI Overviews now appear in **~55% of all Google searches** (broader estimate including international)
- AIO selection criteria: E-E-A-T signals, structured data markup, answer-first content format, entity consistency

---

## Answer Engine Optimization (AEO) Best Practices — 2026

Source: HubSpot AEO Guide; CXL AEO Comprehensive Guide; Frase.io; Green Flag Digital; ALM Corp.

### Core Framework

AEO = structuring content so AI-powered answer systems (Google AI Overviews, ChatGPT, Perplexity, Gemini) can extract, trust, and cite it. Not the same as traditional SEO keyword targeting.

### 7 Actionable AEO Tactics (Priority Order)

**1. Answer-First Content Structure**
- Place a 40–60 word direct answer at the top of every page/section — before context, before supporting detail
- Structure: Question (H2) → 40–60 word answer → supporting body
- AI systems extract top-of-page answers preferentially

**2. Schema Markup Implementation (Critical)**
- Required schemas for AI citation: FAQ schema, Article schema, Organization schema, HowTo schema
- FAQ schema is the highest-leverage single markup for Perplexity and ChatGPT citation
- Machine-readable structured data = higher probability of being pulled into AI answer boxes

**3. Question-Based H2/H3 Headers**
- Every section header should match a natural language question users type into AI chatbots
- Not: "About Our Moisture Meters" → Yes: "What is the best moisture meter for water damage restoration in Australia?"
- Intent matching at the header level is interpreted by ChatGPT and Perplexity as topical relevance signal

**4. Technical Requirements for AI Crawlers**
- `robots.txt`: Explicitly allow `GPTBot`, `ClaudeBot`, `PerplexityBot` — do not leave these unaddressed
- Create an `llms.txt` file (new 2026 standard) — plain-text summary of site content for LLM indexing
- Time to First Byte: <200ms (AI crawlers deprioritize slow servers)
- Server-side rendering required for JavaScript-heavy content (client-side JS is not reliably indexed by AI crawlers)

**5. Third-Party Validation Signals**
- ChatGPT citation probability increases with: Google Reviews, Trustpilot listings, industry directory mentions, press coverage
- Perplexity draws heavily from Reddit, Quora, industry forums, and review platforms — presence on these feeds AI citations
- "Entities" (brand name, founder name, product names) must be **consistent** across all platforms for AI systems to resolve them

**6. Entity Consistency**
- Same business name, address, phone, URL across Google Business Profile, LinkedIn, industry directories, schema markup
- Inconsistent entity data causes AI systems to fail to resolve your brand to a definitive entity — reducing citation probability

**7. Recency Signals**
- Perplexity explicitly weights **recent content** — content published/updated within 30 days ranks higher in AI search
- Publishing cadence matters: weekly updates to key pages outperform static evergreen content in AI search

---

## AI Search Ranking Analysis: Empire Keywords

### Keyword: "restoration software Australia"

Current SERP landscape based on search results (May 9, 2026):
- **Top organic results**: Restore Solutions (restoresolutions.com.au), blog.protimeter.com, IAQ Direct (iaqdirect.com.au)
- **AI Overview likelihood**: HIGH — informational query ("what software") triggers AI Overviews 39% of the time
- **Perplexity ranking signal**: restoresolutions.com.au appears as domain authority in this niche
- **Gap**: No single ANZ brand owns the AI-cited answer for this query. The field is open.
- **AEO opportunity**: A FAQ schema page titled "What restoration software do Australian contractors use?" with a structured 50-word answer citing specific Australian certifications (IICRC, AS/NZS standards) would be highly citation-worthy

### Keyword: "IAQ equipment supplier Australia"

- **Top organic results**: IAQ Direct (iaqdirect.com.au), Air-Met Scientific (airmet.com.au), Agile Equipment (agileequipment.com.au)
- **AI Overview likelihood**: MEDIUM — commercial query, but informational intent is strong enough for AI Overviews
- **Perplexity landscape**: Air-Met Scientific and IAQ Direct appear as named entities with product depth
- **AEO gap**: No supplier has a dedicated "IAQ equipment guide for Australian conditions" with schema markup
- **GEO opportunity**: Google Business Profile optimization + FAQ schema citing Australian standards (e.g., AS 1668.2) would differentiate from US-centric IAQ content dominating AI Overviews

### Keyword: "moisture meter expert"

- **AI search reality**: This is an intent-ambiguous query — could mean "expert guide" or "expert to hire"
- **Perplexity top sources**: Protimeter blog (blog.protimeter.com), Tramex product pages, Restore Solutions
- **ChatGPT likely citation**: Protimeter and Tramex dominate because they have FAQ schema and answer-first blog content
- **Australian gap**: No ANZ-based brand owns the "moisture meter expert" entity in AI search
- **Recommended action**: Publish "Moisture Meter Expert Guide: Australian Water Damage Standards" with HowTo schema, IICRC certification references, and author bio demonstrating practitioner experience (E-E-A-T Experience signal)

---

## Generative Engine Optimization (GEO) Framework

Source: getpassionfruit.com GEO guide; almcorp.com GEO ranking guide; seosherpa.com.

GEO = optimization specifically for **generative AI outputs** (ChatGPT, Perplexity, Gemini, Claude answers) rather than traditional SERP positions.

**5 GEO Levers:**
1. **Cite your own sources**: Link to authoritative external sources within your content — AI systems prefer content that references other credible entities
2. **Data and statistics**: AI systems strongly prefer citing pages with specific numbers (percentages, dollar amounts, dates) over generalised claims
3. **Comparison content**: "X vs Y" format is disproportionately cited by AI answer systems because it directly resolves comparative questions
4. **Local authority**: Geographic specificity ("moisture meter for Queensland tropical conditions") improves AI citation for geo-targeted queries
5. **Platform-native presence**: Entries on platforms AI systems heavily index (Reddit r/waterdamagerestoration, Quora, industry directories) create citation pathways independent of your main domain

---

## Sources

- [Google Algorithm Update May 2026 (Quantifimedia)](https://www.quantifimedia.com/google-algorithm-update-may-2026-what-changed-and-how-it-impacts-your-rankings)
- [Google Algorithm Updates 2026 Ultimate Guide (ClickRank.ai)](https://www.clickrank.ai/google-algorithm-updates/)
- [May 2026 SEO Algorithm News (Numinix)](https://www.numinix.com/blog/may-2026-seo-algorithm-news-update/)
- [Google Algorithm Updates in 2026 (Rankly Media)](https://ranklymedia.com/google-algorithm-updates-in-2026-whats-changed/)
- [AEO Best Practices (HubSpot)](https://blog.hubspot.com/marketing/answer-engine-optimization-best-practices)
- [AEO Trends 2026 (HubSpot)](https://blog.hubspot.com/marketing/answer-engine-optimization-trends)
- [AEO Comprehensive Guide (CXL)](https://cxl.com/blog/answer-engine-optimization-aeo-the-comprehensive-guide/)
- [AEO Practical Playbook 2026 (ALM Corp)](https://almcorp.com/blog/answer-engine-optimization-2026/)
- [GEO Optimization Guide (getpassionfruit.com)](https://www.getpassionfruit.com/blog/generative-engine-optimization-guide-for-chatgpt-perplexity-gemini-claude-copilot)
- [How to Rank on ChatGPT, Perplexity, AI Search (ALM Corp)](https://almcorp.com/blog/how-to-rank-on-chatgpt-perplexity-ai-search-engines-complete-guide-generative-engine-optimization/)
- [Restore Solutions AU (restoresolutions.com.au)](https://restoresolutions.com.au/moisture-meters-devices/)
- [Air-Met Scientific AU (airmet.com.au)](https://www.airmet.com.au/products/indoor-air-quality-monitoring)
- [IAQ Direct AU (iaqdirect.com.au)](https://iaqdirect.com.au/product/tramex-moisture-meter-kit/)
