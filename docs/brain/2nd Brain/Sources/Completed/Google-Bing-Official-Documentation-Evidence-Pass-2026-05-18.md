---
type: source-note
created: 18/05/2026
author: Margot
scope: t3-google-bing-official-doc-pass
status: complete
---

# Google + Bing Official Documentation Evidence Pass (Schema, AI Visibility, Crawl/Index Prerequisites)

## Why this note exists
This is the standards pass required before finalising the Synthex SEO/AEO/GEO Master Generator architecture. Only official Google and Bing documentation is used here.

## Source set (official docs only)

1) Google Search Central — Robots.txt introduction
- URL: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Evidence captured:
  - "A robots.txt file tells search engine crawlers which URLs the crawler can access on your site... it is not a mechanism for keeping a web page out of Google. To keep a web page out of Google, block indexing with noindex or password-protect the page."

2) Google Search Central — Robots meta tags specifications
- URL: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Evidence captured:
  - noindex, nosnippet, max-snippet are valid page-level serving/index controls.
  - "In the case of conflicting robots rules, the more restrictive rule applies" (example in doc: max-snippet + nosnippet => nosnippet applies).

3) Google Search Central — Canonicalisation (rel=canonical and methods)
- URL: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Evidence captured:
  - "if you don't specify a canonical URL, Google will identify which version of the URL is objectively the best version to show to users in Search."
  - Canonical hints are strong signals for duplicate consolidation, not a substitute for crawl/index fundamentals.

4) Google Search Central — Meta tags and attributes Google supports
- URL: https://developers.google.com/search/docs/crawling-indexing/special-tags
- Evidence captured:
  - supported serving controls include nosnippet and max-snippet.
  - page-level presentation controls are explicit levers for search rendering behavior.

5) Bing Webmaster Guidelines
- URL: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Evidence captured:
  - "These guidelines describe how Bing discovers, crawls, indexes, evaluates, and surfaces content across Bing search experiences, Copilot, and grounding API results."
  - "Following these guidelines helps ensure your URLs are eligible for: Indexing and ranking; Grounding results and citations; Sustained visibility and qualified traffic."
  - "Bing and Copilot search experiences rely on the same core crawling, indexing, and ranking foundation as traditional search."

6) Bing Webmaster — Marking up your site with structured data
- URL: https://www.bing.com/webmasters/help/marking-up-your-site-with-structured-data-3a93e731
- Evidence captured:
  - supported structured data specifications include Schema.org in Microdata, JSON-LD, Microformats, RDFa, Open Graph.
  - "Our crawlers do not prefer one specification over another."

7) Bing Webmaster — Robots meta tags and attributes Bing supports
- URL: https://www.bing.com/webmasters/help/robots-meta-tags-and-attributes-that-bing-supports-5198d240
- Evidence captured:
  - "Do not index the page... Note that we need to be able to crawl the page to see this tag, so do not block access to the page."
  - confirms noindex semantics and crawl-before-rule-evaluation prerequisite.

8) Bing Webmaster — Which crawlers does Bing use?
- URL: https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0
- Evidence captured:
  - official crawler inventory includes bingbot user-agent variants and rendering updates.
  - operational implication: bot verification and crawl diagnostics remain first-order controls for inclusion and freshness.

9) IndexNow (Bing ecosystem)
- URL: https://www.bing.com/indexnow/getstarted
- Evidence captured:
  - official positioning is acceleration and freshness signaling (real-time indexing workflow enablement), not replacement for quality/crawl/index policy fundamentals.

## Standards-level conclusions (for architecture constraints)

1) Crawlability is prerequisite zero
- robots.txt manages crawl access, not deindexing intent.
- If critical content is blocked from crawl, engines cannot reliably evaluate other directives.

2) Index control is explicit and must be monitored
- noindex/nosnippet/max-snippet and header/meta variants require continuous state validation.
- Rule conflicts resolve to the stricter directive; accidental conflicts can suppress visibility.

3) Canonical discipline is mandatory for consolidation and attribution
- Duplicate clusters without explicit canonical hygiene increase split signals and ranking/citation ambiguity.

4) Structured data helps disambiguation and eligibility; it does not bypass core quality/crawl/index mechanics
- Bing confirms no preferred schema format; implementation quality/consistency matters more than markup style choice.

5) AI visibility and citation eligibility sit on top of traditional SEO technical health
- Bing explicitly ties Copilot/grounding eligibility to the same crawl/index/ranking base as traditional search.

## Synthex design implications (pre-spec constraints for t4)

- The Master Generator must treat AEO/GEO visibility as an outcomes layer dependent on:
  1) crawl access correctness,
  2) index eligibility correctness,
  3) canonical consistency,
  4) structured data integrity,
  5) content quality/entity coherence.

- Runtime reconciliation must include continuous policy drift checks for:
  - robots.txt, robots meta/X-Robots headers,
  - canonical mismatches,
  - schema coverage/validation,
  - citation-surface evidence deltas.

- Verification must report evidence by engine (Google/Bing), not generic pass/fail.

## Quality note
All claims above are bounded to official Google/Bing docs, captured 18/05/2026, and ready to feed t4 architecture synthesis without assumptions from third-party commentary.
