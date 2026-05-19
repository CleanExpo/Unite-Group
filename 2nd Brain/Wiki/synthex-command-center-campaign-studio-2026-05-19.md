---
type: board-directive
updated: 2026-05-19
business: synthex
client-context: ccw
status: decided
---

# Synthex Command Center Campaign Studio 2026-05-19

## 2026-05-20 UI/UX Implementation Update

Synthex landing-page UI now includes the first public-facing Campaign Command Studio experience slice. The new section makes the client journey explicit:

`Voice brief captured -> Business context linked -> Market signal checked -> Agency council decides -> Assets move to production -> Gated distribution`

It also introduces the ideation package deliverables as visible client value: website creation, lead magnets, thumbnail systems, brand planning, email campaigns, and video storyboards. This keeps the public experience aligned with the Command Center direction without referencing example-only client products.

Implementation files:

- `/Users/phill-mac/Documents/Synthex/app/page.tsx`
- `/Users/phill-mac/Documents/Synthex/components/landing/public-v2.tsx`

Verification:

- `npm run type-check`
- `npx eslint app/page.tsx components/landing/public-v2.tsx --max-warnings 0`
- Browser smoke at `http://localhost:3008`
- Desktop screenshot: `/Users/phill-mac/Documents/Synthex/.harness/synthex-landing-ui-2026-05-20-desktop.png`
- Mobile screenshot: `/Users/phill-mac/Documents/Synthex/.harness/synthex-landing-ui-2026-05-20-mobile.png`

## Technical Translation Blueprint

**User Intent:** Upgrade the Synthex Dashboard / Command Center from a status dashboard into a client-facing campaign operating room where a client can speak an idea through Telegram or WhatsApp and watch Synthex turn it into a researched, brand-aligned, approval-gated campaign.

**Target Architecture:** Presentation work belongs in the Synthex Command Center dashboard and marketing-agency pages. Domain decisions belong in `lib/marketing-agency/*` service modules. Provider integrations stay behind adapters for Shopify, Meta, YouTube, LinkedIn, Instagram, Reddit, Telegram, WhatsApp, HeyGen, Artlist, Apify, and search/social research providers.

**Token Optimisation Strategy:** Reuse existing Synthex campaign package surfaces: Board Memo, Persona Map, Media Guide, Media Testing, Storyboard, QA Gate, Export Manifest, client approval workflow, and provider-gated mock/live modes. Add a new journey model and UI flow before inventing new agent layers.

**Autonomous Tool Selection:** CEO Board deliberation + Service Layer Pattern + Adapter Boundary + Structured Campaign Journey manifest.

## WIKI GROUNDING (Stage 1.4)

- From [[ccw]]: CCW is the first paying external client; Toby Bredhauer is the practical point of contact; Shopify / ecommerce context matters because product data is the first campaign substrate.
- From [[synthex]]: Synthex is already a marketing-automation SaaS with client portals, collaboration, approval workflows, analytics, discovery, multi-platform scheduling, GEO/SEO, and social management ambitions.
- From [[marketing-agency-blueprint-2026]]: the agency process should run `Discovery -> Hypothesis -> Test -> Scale`; reports must explain performance against a hypothesis rather than just listing activity.
- From [[operational-priorities-q2-2026]]: CCW success is the quarter's top priority and ad spend is blocked by default.
- From [[unite-group-nexus-architecture]] and [[exit-thesis]]: CCW is the first ARR proof point, but the durable value is a repeatable client operating system, not bespoke fulfilment for one client.

## RESEARCH BRIEF (Stage 1.5)

```json
{
  "research_required": true,
  "completed_at": "2026-05-19T00:00:00+10:00",
  "questions": [
    "How are current creative platforms turning rough ideas into multi-format campaign assets?",
    "How are current social/ad platforms using AI automation for campaign setup and creative optimization?",
    "What official integration constraints matter for Synthex voice intake, product grounding, social research, and publishing?",
    "What UX gaps can Synthex exploit for a client-facing agency-grade experience?"
  ],
  "findings": [
    {
      "question": "How are current creative platforms turning rough ideas into multi-format campaign assets?",
      "claim": "Canva's 2026 direction is a single creative flow where team context and brand are built in from the start; Magic Studio and Brand Kit emphasize one idea becoming many branded outputs, while Magic Layers makes AI outputs editable instead of static endpoints.",
      "confidence": "high",
      "sources": [
        {
          "url": "https://www.canva.com/newsroom/news/canva-next-era/",
          "title": "The next era of Canva",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.canva.com/magic/",
          "title": "Meet Magic Studio",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.canva.com/pro/brand-kit/",
          "title": "Canva Brand Kit",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.canva.com/newsroom/news/magic-layers/",
          "title": "Introducing Magic Layers",
          "fetched": "2026-05-19"
        }
      ]
    },
    {
      "question": "How are current creative platforms turning rough ideas into multi-format campaign assets?",
      "claim": "Adobe's Firefly + Express social workflow is explicitly positioned as turning one brand-aligned image into platform-specific scheduled posts; the important UX move is reference images, brand styling, resizing, and scheduling in one guided path.",
      "confidence": "high",
      "sources": [
        {
          "url": "https://helpx.adobe.com/in/firefly/how-to/create-social-campaign-adobe-express.html",
          "title": "Create a social media campaign with Firefly and Adobe Express",
          "fetched": "2026-05-19"
        }
      ]
    },
    {
      "question": "How are current social/ad platforms using AI automation for campaign setup and creative optimization?",
      "claim": "Meta's Advantage+ suite now makes automation a first-class campaign setup pattern across audience, placement, budget, creative, and sales/lead objectives; Advantage+ creative can resize, generate text, create background/image variations, animate static images, and add music.",
      "confidence": "high",
      "sources": [
        {
          "url": "https://www.facebook.com/business/ads/meta-advantage-plus",
          "title": "Meta Advantage+",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.facebook.com/business/ads/meta-advantage-plus/creative",
          "title": "Meta Advantage+ Creative",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.facebook.com/business/ads/meta-advantage-plus/sales-campaigns",
          "title": "Meta Advantage+ Sales Campaigns",
          "fetched": "2026-05-19"
        }
      ]
    },
    {
      "question": "What official integration constraints matter for Synthex voice intake, product grounding, social research, and publishing?",
      "claim": "HeyGen v3 is the correct forward path for video-agent generation, CLI/MCP, webhooks, voice design, and lipsync; v1/v2 remain operational until 2026-10-31, but new agentic capabilities are v3-first.",
      "confidence": "high",
      "sources": [
        {
          "url": "https://docs.heygen.com/",
          "title": "HeyGen API Quick Start",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://docs.heygen.com/docs/quick-start",
          "title": "HeyGen API Legacy Documentation",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://docs.heygen.com/docs/using-heygens-webhook-events",
          "title": "HeyGen Webhook Events",
          "fetched": "2026-05-19"
        }
      ]
    },
    {
      "question": "What official integration constraints matter for Synthex voice intake, product grounding, social research, and publishing?",
      "claim": "Shopify product media should be grounded through the Admin GraphQL media model rather than legacy REST product-image assumptions; this matters for real product photos and approved campaign assets.",
      "confidence": "high",
      "sources": [
        {
          "url": "https://help.shopify.com/en/partners/manage-clients-stores/creating-media/product-media-API-liquid",
          "title": "Shopify Product media API and Liquid syntax",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://shopify.dev/docs/api/admin-rest/latest/resources/product-image",
          "title": "Shopify Product Image REST resource",
          "fetched": "2026-05-19"
        }
      ]
    },
    {
      "question": "What UX gaps can Synthex exploit for a client-facing agency-grade experience?",
      "claim": "Hootsuite, Later, HubSpot, and Adobe/Canva prove demand for AI-assisted content, captions, summaries, scheduling, and brand-consistent outputs, but they do not present a transparent 20-year-agency operating room with visible research, hypothesis, board review, storyboard, approval gates, production meter, and evidence ledger.",
      "confidence": "medium",
      "sources": [
        {
          "url": "https://www.hootsuite.com/platform/owly-writer-ai",
          "title": "Hootsuite OwlyWriter AI",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://www.hootsuite.com/platform/publishing",
          "title": "Hootsuite Publishing",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://help.later.com/hc/en-us/articles/12252569781015-Later-s-Caption-Writer",
          "title": "Later Caption Writer",
          "fetched": "2026-05-19"
        },
        {
          "url": "https://knowledge.hubspot.com/campaigns/generate-campaign-insights-using-ai",
          "title": "HubSpot Generate campaign insights using AI",
          "fetched": "2026-05-19"
        }
      ]
    }
  ],
  "open_questions": [
    "Synthex needs live verification of CCW's actual platform connection state before claiming YouTube, Facebook, LinkedIn, Instagram, Reddit, WhatsApp, Telegram, Shopify, or Meta publishing are connected.",
    "WhatsApp and Telegram intake support should be designed as voice-message capture plus transcription first; direct send/publish should stay approval-gated.",
    "Reddit and YouTube publishing have policy, OAuth, quota, and review constraints that should be treated as draft/export first until account-level approvals are confirmed."
  ]
}
```

## Current Synthex Dashboard Read

The existing dashboard already has a usable Command Center shell: autopilot status, stats, quick actions, activity feed, performance pulse, approval queue, and panels for insights, content studio, brand voice, A/B tests, and psychology. The marketing-agency route already has a campaign package model with board memo, persona map, media guide, media testing, storyboard, QA gates, and export manifest.

The gap is that the dashboard does not yet show the client journey from spoken idea to campaign workspace. It reads as a command/status cockpit, not as a guided agency production room. The next design step is to make the campaign lifecycle itself the primary object.

## CEO FRAMES

**The Real Question:** Should Synthex enhance the Command Center as a general dashboard or reposition it around a client-facing Campaign Command Studio that turns voice ideas into researched, approved, multi-channel campaign packages?

**Where the board disagrees:**

- Speed vs depth: fast idea-to-draft generation wins demos, but agency-grade trust requires evidence, approval, and provenance.
- Subscription value vs metered production: the monthly retainer must feel valuable without silently burning paid production credits.
- Platform automation vs client control: Meta/Canva-style automation is powerful, but the client needs visible control because Synthex is the agency of record.

**Debate parameters:** No public publishing, Meta ad spend, product claims, customer stories, or avatar/likeness usage without approval. CCW/Toby is the first concrete workflow, but the model must generalize to future Unite-Group clients.

## BOARD DELIBERATION

**Revenue:** Make the subscription include intake, research, strategy, campaign board, creative options, and approval-ready storyboard. Production rendering, video generation, paid stock, influencer packages, and ad spend belong in a metered production phase. This protects gross margin and makes the retainer feel like an agency brain rather than a content vending machine.

**Product Strategist:** The dashboard needs a campaign journey lane: Voice Brief -> Business Grounding -> Research -> Strategy Board -> Concept Kanban -> Storyboard -> Client Approval -> Production Meter -> Distribution Plan -> Performance Learning. Toby should see the campaign come alive in CCW colors with product cards, channel-specific cards, and visible next decisions.

**Technical Architect:** Reuse the current marketing-agency package primitives and add `CampaignJourney`, `CampaignStage`, `ClientVoiceBrief`, `ProductEvidence`, `ChannelPlan`, and `ProductionEstimate` models later. Keep Telegram/WhatsApp, Shopify, social APIs, HeyGen, and Artlist behind provider adapters. The first build should be mock/live-gated and evidence-first.

**Market Strategist:** Canva wins on ease, Adobe wins on creative suite integration, Hootsuite/Buffer/Later win on scheduling, HubSpot wins on CRM context, and Meta wins on automation. Synthex can win on the combination they do not show clearly: a transparent agency operating system for a real business owner with approval gates and commercial reasoning.

**Compounder:** The campaign workspace becomes reusable across CCW, RestoreAssist, NRPG, CARSI, ATIA, and future clients. Every approved brief, storyboard, asset, channel result, and performance postmortem trains the operating playbook.

**Moonshot:** The highest-value version is a mobile-first "talk to the agency" experience: Toby speaks, Synthex builds the board, specialists appear as live lanes, and the client approves or revises without learning marketing software. The desktop Command Center becomes the rich review surface.

**Custom Oracle:** The workflow must preserve founder/client trust. If Synthex invents product claims or hides uncertainty, it loses. The UI should show confidence, evidence, consent, licence, and approval state on every meaningful asset.

**Contrarian:** The biggest risk is making a theatrical dashboard that implies the whole agency worked when the system only produced AI drafts. The product must label draft vs approved vs production clearly and keep ad spend/publishing blocked until the client explicitly crosses the gate.

## DECISION MEMO

**Decision:** Build the next Synthex Dashboard direction as **Campaign Command Studio**, not as a cosmetic Command Center refresh.

**Product thesis:** The flagship experience should be "speak an idea, watch a 20-year agency process it." The client does not start from a blank content form. They start with a voice note, product context, business data, channel connections, brand system, and commercial objective. Synthex turns that into a visible campaign board with research, hypotheses, creative directions, storyboard, audio plan, asset needs, approval gates, and production cost boundaries.

**Toby / CCW reference flow:**

1. Toby sends a Telegram or WhatsApp voice note: "I want a Facebook campaign for APT meters. It should feel practical, trade-focused, and show why carpet cleaners should buy now."
2. Synthex transcribes and structures the brief: objective, product, audience, offer, tone, platforms, constraints, and uncertainty.
3. The Shopify adapter pulls approved APT meter product data, images, price, specs, inventory status, product page URL, and existing claims.
4. The research layer checks search, YouTube, Reddit, competitor ads/content, audience pain points, channel norms, and current platform constraints.
5. The Campaign Command Studio opens a branded CCW workspace: CCW logo/colors, product evidence cards, target personas, channel cards, campaign hypotheses, and a visible Kanban.
6. Synthex generates three campaign concepts with hook, angle, audience, proof, creative treatment, channel fit, and expected test metric.
7. Toby reviews the demo board, comments by voice/text, and requests changes before production starts.
8. After approval, the workflow enters Creator/Development mode: real product images, storyboard frames, audio plan, captions, aspect ratios, channel variants, legal/licence checks, and QA.
9. Production mode is a paid metered area: HeyGen/video generation, premium stock, final exports, and optional ad operations stay behind explicit approval.
10. Performance data returns to the learning loop: view rate, CTR, comments, saves, leads, revenue, hypothesis result, next iteration.

**UI/UX directive:**

- Replace quick-action-first thinking with an active campaign workspace: the primary CTA is "New campaign from voice brief".
- Show a horizontal lifecycle rail: Brief, Grounding, Research, Strategy, Concepts, Storyboard, Approval, Production, Distribution, Learning.
- Use animated stage cards only to explain real progress; no fake completion states.
- Show business identity immediately: client logo, colors, Shopify product cards, connected channels, budget state, approval state.
- Use Kanban for work-in-progress decisions, not generic task decoration.
- Keep visual storyboards central: frame, voiceover, product proof, caption, platform output, risk/approval state.
- Add a production meter: included subscription work vs paid generation/render/export work.
- Add a confidence/evidence overlay on every claim and asset.
- Label states as Draft, Needs Evidence, Needs Consent, Needs Licence, Ready for Client Review, Approved for Production, Export Ready.

**Architecture directive:**

- Keep entry routes thin. UI submits voice briefs and renders structured campaign state.
- Add service-layer contracts before deep UI build: `campaignBriefService`, `campaignGroundingService`, `campaignResearchService`, `campaignJourneyService`, `campaignApprovalService`, `productionMeterService`.
- Use provider adapters: `shopifyProductAdapter`, `telegramIntakeAdapter`, `whatsappIntakeAdapter`, `youtubeResearchAdapter`, `redditResearchAdapter`, `metaDraftAdapter`, `heygenVideoAdapter`, `artlistMusicAdapter`.
- Default every adapter to mock/draft mode unless credentials and account approvals are present.
- Publishing and ad spend remain disabled unless a reviewed server-side approval flag exists.

**ADLC implementation sequence:**

1. **Assess:** audit current Command Center and marketing-agency package components; identify reusable surfaces.
2. **Design:** produce Campaign Command Studio wireframe and journey data contract.
3. **Layer:** add service contracts and adapter interfaces without live provider calls.
4. **Code:** implement mock Toby / CCW campaign workspace using real-style product evidence and branded UI.
5. **Verify:** type-check, marketing-agency tests, visual smoke, accessibility, no secrets, no live publish/spend.
6. **Deploy:** preview-only for client/demo review.
7. **Observe:** capture client revisions, stage drop-offs, approval latency, production-meter usage.
8. **Compact:** update wiki, source map, session manifest, and implementation backlog.

## Next Build Backlog

- Create `Campaign Command Studio` product spec for Synthex.
- Add a Toby / CCW mock campaign fixture for APT meters.
- Extend existing marketing-agency types with journey/stage/production-meter objects.
- Redesign `QuickActionsBar` around voice brief intake and campaign continuation.
- Add `CampaignJourneyRail`, `CampaignKanban`, `ProductEvidenceShelf`, `StoryboardApprovalBoard`, and `ProductionMeterPanel`.
- Keep the first implementation preview-only and mock/live-gated.

## Wiki Links

[[synthex]] · [[ccw]] · [[marketing-agency-blueprint-2026]] · [[synthex-marketing-agency-runtime-lifecycle-2026-05-19]] · [[social-media-researcher-platform-stack-2026-05-19]] · [[youtube-research-grounding]] · [[search-aeo-geo-optimizer]] · [[marketing-roi-learning-loop]] · [[artlist-mastery]] · [[unite-group-nexus-architecture]] · [[exit-thesis]]
