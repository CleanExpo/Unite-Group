# Synthex Protected Launch Machine

> Date checked: 23 August 2026
> Owner: Synthex
> First launch lanes: CCW, CARSI, RestoreAssist
> Status: Locally verified. Live accounts and deployment are not yet connected or approved.

## Plain-English goal

- Synthex runs the marketing work.
- Each business keeps its own brand, customer, channel and analytics data.
- Synthex may research, draft and prepare work automatically.
- A person must approve the exact version before any external post or paid video job.
- Changing the words, image, call to action, hashtags or brand makes the approval stale.

## First three lanes

| Lane | First conversion goal | Default supported schema |
|---|---|---|
| CCW | Product, workshop and service enquiries | Organization, BreadcrumbList, Article, VideoObject, Product, Offer, LocalBusiness |
| CARSI | Training enrolments and trusted education | Organization, BreadcrumbList, Article, VideoObject, Course |
| RestoreAssist | Product launch, demos and subscriptions | Organization, BreadcrumbList, Article, VideoObject, SoftwareApplication |

Schema must match visible, truthful page content. There is no separate “GEO schema”.

## Media workflow

1. Research and evidence agent creates a source pack.
2. Brand guardian checks the correct business voice and data boundary.
3. SEO and schema agent prepares search, answer and generative discovery fields.
4. Script agent creates the long-form script and short-form cuts.
5. Safety reviewer checks claims, sources and disclosures.
6. HeyGen creates presenter footage only after exact campaign approval.
7. Higgsfield may create selected visual clips after a cost gate.
8. Remotion assembles the approved assets, captions and formats.
9. Synthex creates channel drafts.
10. A person approves the exact social post before external publishing.

## Connection truth

| Provider | Supported path | Current state |
|---|---|---|
| HeyGen | Video API v3 plus signed webhooks | Code-ready; live key and avatar still need confirmation |
| Higgsfield | Official MCP account sign-in | Connection requested; not confirmed in Synthex |
| NotebookLM | Manual source-pack hand-off today, or NotebookLM Enterprise API after licence check | Consumer NotebookLM automation is not assumed |
| Remotion | Local/Docker worker or a supported server-rendering host | Worker URL is not yet connected |

## Search and authority rules

- Treat AEO and GEO as part of strong SEO.
- Make content for people first.
- Add original photos, examples, tests and business data when available.
- Name the author and reviewer.
- Keep sources beside important claims.
- Use accurate published and reviewed dates.
- Add captions, image alt text, canonical URLs and internal links.
- Validate eligible structured data.
- Do not invent prices, stock, results, testimonials, qualifications or facts.
- Do not create thin pages for small keyword changes.
- Do not buy or manufacture backlinks.

## Approval and cost rules

- Research and drafts: automatic.
- Channel drafts: automatic after exact campaign approval.
- Paid media generation: exact campaign approval required.
- External publishing: exact post approval required.
- Ad spend, deployment and merging: separate founder approval required.
- Repeated requests for the same approved HeyGen version reuse one idempotency key.

## Specialist roles

- Research and evidence
- Brand guardian
- SEO and schema compiler
- Script and storyboard
- Factual and safety reviewer
- Visual director
- Provider and budget router
- Remotion render worker
- Captions and accessibility QA
- Publishing approval controller
- Performance and learning analyst

## Primary references

- Google Search: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- HeyGen Video API v3: https://developers.heygen.com/reference/create-video
- HeyGen webhooks: https://developers.heygen.com/docs/webhooks
- NotebookLM Enterprise API: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks
- Higgsfield MCP: https://higgsfield.ai/mcp
- Remotion server rendering: https://www.remotion.dev/docs/ssr

## Next live step

Connect and scan the three Brand DNA profiles, confirm the provider accounts, then prepare one CCW pilot for exact approval. Do not publish or spend until the founder approves it.
