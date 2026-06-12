---
type: wiki
updated: 2026-05-19
---

# Synthex Media Assets Production Stack

## Technical Translation Blueprint

**User Intent:** Turn Synthex and the Unite-Group Nexus into a stronger media
asset machine: launch videos, overlays, thumbnails, source media, licensed music
and mini-app production tools, while keeping spend, publishing and licensing
controlled.

**Target Architecture:** The [[synthex-command-center-campaign-studio-2026-05-19]]
direction remains the product surface. The implementation target is
[[synthex|Synthex]] service modules under `lib/marketing-agency/*` and provider
adapters for Remotion, HyperFrames, Artlist, HeyGen and YouTube analytics. The
wiki and `/Users/phill-mac/Documents/Marketing Team` canvas are the operating
briefs, not duplicate app code.

**Token Optimisation Strategy:** Do not build bespoke media generation first.
Use deterministic render layers for repeatable assets, use Artlist only where
licensing/source quality justifies credits, and reuse the existing
[[artlist-mastery]], [[video-agency-architecture-2026-05-14]],
[[youtube-research-grounding]] and [[marketing-roi-learning-loop]] patterns.

**Autonomous Tool Selection:** Service Layer Pattern + Adapter Boundary +
Structured Run Manifest. The board decision is to treat media tools as gated
capabilities behind stable service contracts, not as logic inside UI routes.

## Board Decision

Synthex should adopt a three-layer media production stack:

1. **Deterministic composition layer:** Remotion for React-coded videos,
   branded overlays, captions, launch videos, proof animations, product
   walkthroughs and server-side rendering.
2. **HTML-to-video acceleration layer:** HyperFrames for agent-authored
   HTML/CSS/JS compositions, source-to-video explainers, docs-to-video,
   thumbnails, GIFs, data animation and frame-checkable exports.
3. **Licensed source media layer:** Artlist for licensed music catalog access
   and high-value source media through gated Studio/browser workflows. Artlist
   credits are not used for logos, captions, title cards, lower-thirds, end
   cards or simple motion graphics that Remotion or HyperFrames can render.

The commercial rule is simple: subscription ideation produces the brief,
research, storyboard and low-cost overlays; metered production only starts when
client approval, licence evidence and budget estimates pass.

## Current Docs Findings

### Remotion

Remotion is the strongest fit for Synthex-owned launch videos and overlay
systems because it creates real MP4 videos with React, supports dynamic
parameterized content, and can render locally, server-side or serverless.
The `@remotion/renderer` `renderMedia()` API renders video or audio
programmatically and exposes progress callbacks, browser log capture, audio
download callbacks and encoding options. This maps cleanly to a Synthex
`overlayRenderService` and `remotionRenderAdapter`.

Current official docs also show a commercial/licensing boundary: small teams
can use the free license, while larger company/collaboration and automation
use cases require Remotion commercial licensing. Synthex must treat render
volume, team size and SaaS automation as budget-gated.

### HyperFrames

HyperFrames is a useful second render layer where an agent needs to produce a
video from plain HTML, CSS and JavaScript. Current docs position it as
open-source and agent-native: write HTML, preview in the browser, and render to
MP4. Timing is deterministic: the renderer advances a seek clock per frame
instead of relying on wall-clock time. The docs also describe frame adapters
for GSAP, Lottie, Three.js, Rive, Anime.js, WAAPI and D3.

Synthex should use HyperFrames for source-to-video demos, docs-to-video
explainers, HTML thumbnails, animated charts, UI walkthroughs and bulk
variants where a simple HTML composition is cheaper than full React video
project setup.

### Artlist

Artlist's public developer docs currently expose the Artlist Enterprise API
as a music catalog API. The docs say it lets clients browse, stream, search
and download songs. The use-case page explicitly mentions generative media
apps as a use case for pairing videos with the right music, but the developer
surface shown today is music-centric.

Authentication is server-side. Artlist docs describe API-key issuance through
an account manager and OAuth 2.0 client-credentials flow using `client_id` and
`client_secret`. Secrets must live outside git. In the Marketing Team sandbox,
the credential slots are:

- `ARTLIST_CLIENT_ID`
- `ARTLIST_CLIENT_SECRET`
- `ARTLIST_API_KEY`
- `ARTLIST_ACCOUNT_EMAIL`

No current implementation should claim a public Artlist Studio AI video/image
API unless a same-session docs refresh proves one exists.

### YouTube Performance Grounding

YouTube's own guidance says titles and thumbnails are the first viewer-facing
signal and recommends accurate, succinct titles, readable thumbnail text,
thumbnail simplicity, audience fit, and analytics review after publishing.
The official engagement docs identify audience retention, average view
duration, watch time and views as core measures. The YouTube Data API can fetch
video metadata/statistics via `videos.list`, and the Analytics API can return
owned-channel reports, but it is not a magic live algorithm feed.

Synthex's performance loop should therefore optimize against observable
viewer behaviour: retention moments, click-through, traffic source, comments,
saves, profile clicks, product page clicks, leads, revenue and hypothesis
result.

## Missing Pieces Across Synthex + Unite-Group Nexus

- `mediaAssetPlanningService`: converts voice briefs and wiki research into
  required media assets by channel, aspect ratio, duration and approval gate.
- `productionBudgetService`: estimates subscription work versus metered
  production spend, including Artlist credits, HeyGen renders, manual review
  time and final export operations.
- `overlayRenderService`: canonical service for captions, lower-thirds,
  diagrams, logo-safe frames, end cards and thumbnail variants.
- `remotionRenderAdapter`: Synthex-owned React video rendering with local,
  queue, server and later cloud render paths.
- `hyperframesRenderAdapter`: HTML-to-video workflow for fast demos,
  documentation videos, animated UI flows, GIFs and thumbnails.
- `artlistMusicAdapter`: server-side music search, preview, download and
  licence metadata once valid credentials exist.
- `artlistStudioManualAdapter`: browser-harness/manual workflow for Studio
  source media until official public Studio APIs are verified.
- `assetLicenceLedger`: every asset carries source, prompt, model/tool,
  licence, consent, approval state, client, expiry and channel usage.
- `youtubePerformanceGroundingService`: owned-channel analytics and current
  docs refresh before claims about titles, thumbnails, retention or algorithmic
  performance.
- `mediaQaService`: visual, audio, legal, brand, evidence and platform-format
  review before export.

## Gen Media Mini Apps

These mini apps should sit inside Synthex as internal/client workflow surfaces:

- Storyboard Builder: frame, voiceover, product proof, risk and approval state.
- Overlay Pack Generator: lower-thirds, captions, diagrams, logo reveals,
  comparison frames and CTA end cards.
- Thumbnail Lab: title/thumbnail concepts, accurate promise checks and
  channel-format exports.
- Lead Magnet Preview: campaign-to-calculator/checklist/guide concepts.
- Website Ideation Preview: landing-page direction before web build.
- Production Meter: subscription allocation, paid generation estimate and
  client approval.
- Media QA Review: proof, consent, licence, brand, audio, visual and export
  checks.
- Asset Ledger: durable provenance and usage record for every generated or
  licensed asset.

## Runtime Reconciliation Lifecycle

- **Assess:** Pull wiki, current Synthex repo state, credentials present/absent,
  docs refresh and client objective.
- **Design:** Choose deterministic render first, licensed media second, AI
  source generation only when justified.
- **Layer:** Keep UI as request/approval surfaces; decisions live in services;
  provider calls live in adapters.
- **Code:** Build the smallest vertical slice: asset plan -> overlay render ->
  QA gate -> export manifest.
- **Verify:** Type-check, targeted unit tests, media smoke render, visual review
  and no-secret scan.
- **Deploy:** Local sandbox first, Vercel preview second, production only after
  approval.
- **Observe:** Measure retention, CTR, watch time, clicks, leads, revenue,
  asset costs and QA failures.
- **Compact:** Write the state back to wiki and the editable canvas before the
  next session.

## Operating Rules

- No public publishing or ad spend unless explicit repo/env approval exists.
- No Artlist, HeyGen or other paid media burn until the asset has a brief,
  budget estimate, approval and licence plan.
- No client logo, testimonial, product image or field footage is exported
  without consent/provenance.
- No "algorithm hack" claims. Ground video recommendations in current platform
  docs and observed analytics.
- Use Remotion/HyperFrames for repeatable branded overlays; reserve Artlist for
  licensed music and source media.

## Also Relevant To

[[synthex]] · [[synthex-command-center-campaign-studio-2026-05-19]] ·
[[synthex-marketing-agency-runtime-lifecycle-2026-05-19]] ·
[[social-media-researcher-platform-stack-2026-05-19]] ·
[[artlist-mastery]] · [[video-agency-architecture-2026-05-14]] ·
[[marketing-roi-learning-loop]] · [[youtube-research-grounding]] ·
[[ccw]]

## Sources

- Remotion home and pricing: `https://www.remotion.dev/`
- Remotion `renderMedia()`: `https://www.remotion.dev/docs/renderer/render-media`
- Remotion server-side rendering: `https://www.remotion.dev/docs/server-side-rendering`
- Remotion Lambda: `https://www.remotion.dev/docs/lambda`
- HyperFrames home: `https://hyperframes.video/`
- HyperFrames quickstart: `https://hyperframes.video/docs/getting-started/quickstart`
- HyperFrames render docs: `https://hyperframes.video/docs/workflow/render`
- HyperFrames timing and tracks:
  `https://hyperframes.video/docs/concepts/timing-and-tracks`
- Artlist Enterprise API welcome: `https://developer.artlist.io/welcome`
- Artlist authentication: `https://developer.artlist.io/authentication`
- Artlist use cases: `https://developer.artlist.io/use-cases`
- YouTube thumbnail and title tips:
  `https://support.google.com/youtube/answer/12340300`
- YouTube engagement docs:
  `https://support.google.com/youtube/answer/9313698`
- YouTube Data API `videos.list`:
  `https://developers.google.com/youtube/v3/docs/videos/list`
- YouTube Analytics API reports:
  `https://developers.google.com/youtube/analytics/reference/reports/query`
