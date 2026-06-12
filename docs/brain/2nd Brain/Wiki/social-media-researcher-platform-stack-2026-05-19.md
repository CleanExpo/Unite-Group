---
type: wiki
updated: 2026-05-19
---

# Social Media Researcher Platform Stack

## Decision

[[synthex|Synthex]] and future portfolio projects need a dedicated Social Media
Researcher lens inside the [[synthex-marketing-agency-runtime-lifecycle-2026-05-19|Marketing Agency lifecycle]].
This role is question-led and evidence-led: it turns public conversation,
platform analytics, panel data, and cultural observation into strategy before
content, ad spend, or publishing decisions are made.

The role must never rely on stale model memory for platform access. Every
research result that depends on a social, marketing, analytics, creator, or ad
platform requires a same-session docs refresh against current official docs,
platform docs, changelogs, access rules, and terms.

## Source Processed

- `Sources/Social Media Researcher.md` - Google-generated role summary captured
  2026-05-19. It defined audience intelligence, trend and narrative tracking,
  social listening, fact verification, policy guidance, social intelligence
  tooling, panel validation, and digital ethnography.

## Role Definition

The Social Media Researcher owns:

- audience intelligence: psychographic profiles, values, interests, communities,
  platform behaviors, and creator affinities
- narrative tracking: how stories spread, mutate, fragment, and die across
  TikTok, YouTube, Reddit, X, LinkedIn, Instagram, Threads, search, news, and
  forums
- social listening and analytics: sentiment, topic clustering, engagement
  shape, creator/network influence, owned-channel performance, and competitor
  movement
- fact verification: source provenance, historical accuracy, content rights,
  public-claim support, and broadcast/editorial permission checks
- policy and strategy: ethical data boundaries, governance, public response
  posture, cultural risk, and channel-specific recommendations

The distinction from Social Media Manager is sharp: the manager publishes and
grows communities; the researcher asks better questions, validates evidence, and
turns historic and live signals into decisions.

## Current Platform Docs Gate

Before finalizing any research or tool recommendation, refresh official docs for
the relevant platforms.

Minimum checks:

- official developer docs or platform docs
- changelog or version page when available
- terms, data-policy, or app-review requirements
- available endpoints and missing endpoints
- access gate: public, OAuth, partner, enterprise, paid, approved researcher, or
  blocked
- rate limits, quota costs, storage limits, and retention rules when documented
- privacy, consent, licensing, and redistribution restrictions

If official docs are blocked or incomplete, say so and label secondary evidence
as secondary. Reddit's 2026 Data API page explicitly warns legacy docs may be
out of date and points to Developer Terms and Data API Terms; that warning is
the operating model for all platform research.

## Platform Reality Map

### X

X is the clearest API surface for real-time and historical conversation search.
Official docs expose Recent Search for the last 7 days to all developers,
Full-Archive Search back to 2006 for pay-per-use or Enterprise, and filtered
stream endpoints for real-time listening. Use X for trend detection, mention
tracking, and live narrative alerts when budget/access allows.

### TikTok

TikTok separates researcher access from normal creator/business access. TikTok
Research Tools expose public videos, users, comments, liked videos, followers,
following, reposts, playlists, TikTok Shop data, and Commercial Content API
surfaces, but access is limited to approved qualifying researchers. Treat TikTok
as high-value but access-gated; never assume full-funnel listening is available
without approval.

### Reddit

Reddit is essential for niche pain, buyer language, objections, and community
ethnography, but 2026 API access is policy-gated. Reddit's current Data API
support page says clients need registered OAuth and can be throttled or blocked
if unidentified. Use Reddit with explicit Responsible Builder and Data API
Terms checks. Browser/manual ethnography and approved APIs are separate modes.

### YouTube

YouTube Data API supports search and comment retrieval; Search list has a quota
cost and returns videos, channels, and playlists. YouTube Analytics and
Reporting APIs support owned-channel reporting, bulk reports, targeted queries,
metrics, dimensions, and reporting groups. Use YouTube for creator discovery,
comment mining, long-form narrative research, and owned-channel performance.

### LinkedIn

LinkedIn's official Marketing Developer Platform supports campaigns, campaign
performance reporting, leads, company Page growth, analytics, community
management, and mentions. It is governed by LinkedIn API Terms and access
programs. Use it for B2B audience and campaign analytics, but treat broad member
data extraction, prospect databases, and profile scraping as blocked unless
explicitly permitted.

### Meta, Instagram, Threads

Meta Graph/Marketing API docs were reachable by local HTTP checks on
2026-05-19, but the browser fetch returned limited content. Treat Meta as
official-doc-refresh-required every run. Known current surfaces include
Marketing API Insights, Instagram platform APIs, Graph API changelog, and
Threads API docs. Do not assume Instagram hashtag, mention, follower, or Threads
search availability without live docs and app-review confirmation.

## Social Intelligence Tool Stack

### Pulsar

Pulsar is a strong enterprise audience-intelligence and social-listening
candidate. Current platform material says it covers TikTok, Pinterest,
Instagram, Twitch, news, print, TV, radio, podcasts, forums, blogs, search, and
first-party data, with 195-country multilingual coverage and audience
segmentation. Use it for broad public conversation mapping and campaign
planning.

### Brandwatch

Brandwatch is a candidate enterprise API layer for consumer intelligence. Its
developer/API material includes Analysis API, Data Upload API, Consumer Research
API, Measure API, Publish API, and Engage API. Use it when Synthex needs
integrated listening, owned-channel metrics, inbox/conversation exports, and
system-to-system reporting.

### GWI

GWI is the panel-validation layer. Current integration material positions its
API and MCP access as privacy-compliant human insight that can be embedded into
dashboards and AI tools. Use GWI to validate whether noisy social conversations
match broader consumer attitudes.

### NodeXL Pro

NodeXL is the network-analysis layer. It supports conversation network mapping
from X, Reddit, YouTube, Instagram, Bluesky, Wikipedia, WhatsApp, and CSV imports
from Brandwatch, Meltwater, Talkwalker, and TweetBinder. Use it to find bridge
influencers, clusters, URLs, hashtags, and sentiment by community.

## 2026 Research Signals

- Hootsuite's 2026 trend material frames social as a first-party data and
  research engine, with creative pattern analytics, rapid-response content,
  authenticity, fragmented identities, LinkedIn's creative shift, and social SEO
  as major themes.
- DataReportal's Digital 2026 material says social media user identities now
  represent a supermajority-level global layer and notes GWI survey data showing
  96.9% of internet users aged 16+ use at least one social platform monthly.
- Sprout Social's 2026 content strategy research surveyed 2,300 consumers and
  1,200 marketers across the US, UK, and Australia, emphasizing human-created
  content, platform nuance, and customer joy.
- HubSpot's 2026 State of Marketing says AI is baseline rather than
  differentiator, with 80% of marketers using AI for content creation and 75%
  using it for media production; human taste and point of view remain the moat.

## Synthex Operating Pattern

For every client or portfolio project:

1. Define the research question before choosing tools.
2. Pull current platform docs for each required platform.
3. Separate owned-channel analytics from public conversation listening.
4. Separate social data from panel data; use GWI-style validation before major
   strategy claims.
5. Segment by community, not only by demographic.
6. Track narratives across origin, amplifier, mutation, counter-narrative, and
   decay.
7. Convert findings into campaign hypotheses, content briefs, risk notes, and
   measurement plans.
8. Send public claims through [[brand-guardian]] and QA through [[qa-lead]].
9. Keep publish, spend, scraping, identity, and credential gates explicit.

## Also Relevant To

[[marketing-agency-blueprint-2026]] · [[marketing-insights-2026]] ·
[[synthex-marketing-agency-wikilinks-2026-05-19]] ·
[[chorus-agent-platform-2026-05-19]] · [[mcp-ecosystem]] ·
[[seo-linkable-assets]] · [[artlist-mastery]]

## Sources

- X API Search Posts: `https://docs.x.com/x-api/posts/search/introduction`
- X filtered stream: `https://docs.x.com/x-api/stream/stream-filtered-posts`
- TikTok Research API codebook:
  `https://developers.tiktok.com/doc/research-api-codebook`
- Reddit Data API wiki:
  `https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki`
- YouTube Data API Search:
  `https://developers.google.com/youtube/v3/docs/search/list`
- YouTube Analytics API:
  `https://developers.google.com/youtube/analytics/`
- LinkedIn Marketing Developer Platform:
  `https://learn.microsoft.com/en-us/linkedin/marketing/integrations/marketing-integrations-overview`
- LinkedIn Marketing API overview:
  `https://learn.microsoft.com/en-us/linkedin/marketing/overview`
- Pulsar platform: `https://www.pulsarplatform.com/platform`
- Brandwatch APIs: `https://www.brandwatch.com/products/apis/`
- GWI integrations/API/MCP: `https://www.gwi.com/integrations`
- NodeXL Pro: `https://nodexl.com/`
- Hootsuite Social Media Trends 2026:
  `https://www.hootsuite.com/research/social-trends`
- DataReportal Digital 2026 Global Overview:
  `https://datareportal.com/reports/digital-2026-global-overview-report`
- Sprout Social 2026 Social Media Content Strategy Report:
  `https://sproutsocial.com/insights/data/2026-social-media-content-strategy-report/`
- HubSpot 2026 State of Marketing:
  `https://www.hubspot.com/state-of-marketing`
