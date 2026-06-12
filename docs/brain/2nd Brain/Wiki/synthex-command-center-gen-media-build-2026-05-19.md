---
type: wiki
updated: 2026-05-19
---

# Synthex Command Center Gen Media Build

## Decision

Build [[synthex|Synthex]] Command Center as a **Gen Media Command Center**:
a human-and-agent cockpit where the client voice brief, source grounding,
campaign strategy, media generation, storyboard approval, production meter and
licence/export gates live in one visible workflow.

This is the Riley Brown mini-app pattern adapted to Phill's actual stack. FAL,
Buffer, Paper and Readwise remain pattern references only. Synthex uses existing
approved surfaces: [[obsidian-agency-ingest]], Wiki/Supabase, OpenAI/AI SDK,
HeyGen, Artlist, Apify, Remotion, HyperFrames, YouTube grounding, and the
marketing-agency service modules already present in the Synthex repo.

## Source Processed

- `Sources/Completed/Codex Build Your Full AI Marketing Team Agents Skills.md`
  - YouTube: `https://www.youtube.com/watch?v=sL_KBnYB17I`
  - Author/channel: Riley Brown
  - Published: 2026-05-18
  - Pulled: 2026-05-19 with local transcript extraction.

## What Riley's Transcript Changes

- Skills are the repeatable workflow layer. A command center without skills is
  dashboard theatre.
- Grounding is mandatory before generation. YouTube transcripts and the user's
  second brain are used as reference points before scripts, diagrams and media.
- Mini-apps are the product pattern. The agent and the human use the same asset
  app; the agent generates options and the human finishes the final 10%.
- The strongest Gen Media idea is not "AI makes one image"; it is a local app
  with elements, reference assets, generated options, edits, and persistent
  state.
- Remotion and HyperFrames belong in the launch-video/overlay lane: reusable
  templates, product demos, UI animations, B-roll, phone demos, title cards and
  on-screen explainers.
- Automations come after repeatability. Build, improve, then turn the useful
  workflow into a skill/automation.

## What Synthex Already Has

- `lib/marketing-agency/*` service modules for evidence, licensing, QA, export
  manifests, storyboards, media guides, media testing, Artlist, HeyGen, Apify,
  Meta export checks and Remotion storyboard plans.
- Draft dashboard route: `/dashboard/marketing-agency`.
- Existing campaign package panels: board memo, persona map, storyboard, media
  guide, media testing, QA gate and export manifest.
- Dependencies already present for Remotion, FFmpeg/FFprobe, Apify, OpenAI,
  Anthropic/Google AI SDK, Supabase, Prisma and workflow approval.
- Sandbox visual boards in `/Users/phill-mac/Documents/Marketing Team/visuals`.

## What Is Missing

- `campaignCommandCenterService`
- `sourceGroundingService`
- `genMediaAssetService`
- `mediaAssetPlanningService`
- `overlayRenderService`
- `productionBudgetService`
- `assetLicenceLedger`
- `mediaQaService`
- client-facing route that turns voice brief -> grounded plan -> asset grid ->
  storyboard -> approval -> export manifest
- durable JSON state contract that both human and agent can use

## CEO Board Memo

═══════════════════════════════════════  
THE MEMO  
Date: 2026-05-19  
From: CEO  
Re: Build Synthex Command Center around Gen Media mini-apps  
═══════════════════════════════════════

### DECISION

Build the Command Center around Gen Media mini-apps, not a generic dashboard
refresh. The sandbox first slice is a local editable cockpit that proves the
workflow: voice brief, source grounding, campaign cards, Gen Media asset lab,
Remotion/HyperFrames overlay lane, approval gates and exportable state.

### RATIONALE

The Riley transcript confirms the product pattern: the moat is not one model or
one prompt; it is repeatable skills plus mini-apps that the human and agent both
operate. This fits Synthex better than adding another media platform because
Synthex already has the service layer, provider gates and media QA surfaces.

The hardest tension is speed versus architecture. A polished command center can
become theatre if the services behind it are weak. The correct move is to build
the sandbox cockpit now, then port the proven state contract into Synthex
service modules and thin dashboard routes.

### THE DISSENT THAT ALMOST CHANGED MY MIND

The Contrarian argument was that the Riley workflow uses extra tools and could
tempt us into copying FAL/Buffer/Paper instead of building with our approved
stack. That is valid, so the decision explicitly bans new addons in this slice
and maps the pattern onto existing Synthex assets.

### WHAT WOULD CHANGE THIS DECISION

- Synthex cannot pass service-layer tests for the command-center state contract.
- Provider credentials or approval gates force live media/spend before sandbox
  validation.
- The Gen Media cockpit cannot produce a clearer client approval path than the
  existing marketing-agency package route.

### RESEARCH GAPS

- The Riley source is a YouTube auto-caption transcript; exact wording may need
  review against the video if any quote becomes public-facing.
- Artlist live API use remains blocked until credentials exist.
- HyperFrames stays sandbox/reference until a concrete adapter is implemented.

### NEXT ACTIONS

1. **PM-Synthex:** Use the sandbox Gen Media Command Center as the canonical
   working surface. Done when localhost shows editable lanes, asset lab and
   exportable JSON.
2. **Technical Architect:** Define the Synthex TypeScript state contract for
   voice brief, grounding sources, Gen Media assets, storyboard beats, gates and
   export manifests. Done when unit tests can validate a mock CCW campaign.
3. **Creative Director + QA Lead:** Convert the Riley transcript learnings into
   storyboard and media QA acceptance criteria. Done when every generated asset
   has evidence, consent, licence, brand and QA fields.

### RISK TO WATCH

The dangerous assumption is that a good-looking cockpit means the agency
workflow is operational. The real proof is structured state, gates, tests and
repeatable output.

═══════════════════════════════════════

## Sandbox Artifact

Local editable cockpit:

`/Users/phill-mac/Documents/Marketing Team/visuals/synthex-gen-media-command-center.html`

Expected local URL:

`http://127.0.0.1:8200/visuals/synthex-gen-media-command-center.html`

## Also Relevant To

[[synthex]] · [[synthex-command-center-campaign-studio-2026-05-19]] ·
[[synthex-media-assets-production-stack-2026-05-19]] ·
[[synthex-marketing-agency-runtime-lifecycle-2026-05-19]] ·
[[social-media-researcher-platform-stack-2026-05-19]] ·
[[artlist-mastery]] · [[ccw]]
