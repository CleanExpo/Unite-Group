---
type: wiki
updated: 2026-05-14
---

# Unite-Group Video Agency — 15+ Year Specialised Agent Architecture

**Directive (Phill, 2026-05-14):** The net cost increase from richer tooling (Hyperframes + ElevenLabs Pro + dedicated stock + grading suite) is the right trade if it lets us build the **world's best 15+ year-experienced specialised agents** for video — not a hobbyist budget pipeline.

This page is the architectural anchor for the **Video Agency section** of Unite-Group. It supersedes (does NOT replace) the existing 10-skill Remotion pack — the Remotion pack becomes the **production substrate**; the new agents are the **creative leadership** on top.

## The 9-role Video Agency org chart

| Role | Years equivalent | What they own | Existing coverage | Gap to close |
|---|---|---|---|---|
| **video-director** | 15+ yr Creative Director (BBH / Wieden / Mother) | Brief intake, composition selection, narrative POV, what story gets told and why now | Partial — `remotion-marketing-strategist` covers channel/format; nothing covers narrative POV | **NEW skill** — the entry-point persona, replaces `remotion-orchestrator` as the brief receiver |
| **video-script-writer** | 15+ yr screenwriter (Pixar / Apple keynote / Nike spot) | Scene-by-scene voiceover, hook engineering (0-3s), retention beats (7-15s), CTA placement, narrative tension curve | Thin — `remotion-screen-storyteller` writes scenes but doesn't engineer hooks/retention | **EXTEND** existing skill with hook/retention/tension framework |
| **video-cinematographer** | 15+ yr DoP (Roger Deakins-tier) | Shot composition, framing, motion language, lens psychology, when to use Hyperframes vs Remotion vs raw b-roll | Partial — `remotion-designer` + `remotion-motion-language` cover motion + layout | **EXTEND** with shot-language framework + Hyperframes integration |
| **video-editor** | 15+ yr editor (Walter Murch-tier) | Assembly, cut points, b-roll-to-talking-head ratio, pacing rhythm, J-cuts + L-cuts, audio sync polish | **ZERO** — current pipeline jumps composition → render with no editorial pass | **NEW skill** — single biggest gap in current pipeline |
| **video-sound-designer** | 15+ yr sound designer (Skywalker Sound-tier) | Music bed selection, SFX library, ducking, room tone, audio-visual sync, mix levels | **ZERO** — ElevenLabs voiceover is the only audio today | **NEW skill** — second biggest gap |
| **video-colorist** | 15+ yr colorist (Light Iron-tier) | Per-brand LUT, grade pass, skin-tone protection (when relevant), warm-vs-cool palette decisions matching BrandConfig | **ZERO** — Remotion renders raw with whatever colours BrandConfig declares | **NEW skill** — visual signature consistency |
| **video-distribution-strategist** | 15+ yr platform expert (TikTok native + YouTube algo + LinkedIn Reels) | Per-platform aspect ratio, duration cap, caption format, hook-density, thumbnail composition | Partial — `remotion-marketing-strategist` covers some | **EXTEND** with platform-native specs locked per BrandConfig |
| **video-brand-guardian** | 15+ yr brand director | Frame-by-frame brand-mark integrity, Gun Metal + Candy Red consistency, no AI slop, no Lucide icons, real logos | Partial — generic `brand-guardian` gates content but not per-frame video | **EXTEND** brand-guardian with video-specific frame audit |
| **video-orchestrator** | 20+ yr Executive Producer | Reads the brief, dispatches the team in the right order, handles handoffs, manages budget + timeline + delivery | Partial — `remotion-orchestrator` does dispatch but no production-management lens | **REPLACE** `remotion-orchestrator` with a richer EP layer |

## The 4 production phases

Every video passes through 4 phases. Each phase has its lead agent + supporting cast.

### Phase 1 — Pre-production (Director-led)
**Lead:** `video-director` · **Support:** `video-distribution-strategist`, `video-brand-guardian`

- Brief intake. What story? What feeling? What ask of the viewer?
- Composition decision: talking-head explainer / b-roll cinematic / product demo / testimonial / case-study / social hook
- Channel decision: LinkedIn 1:1 (60s), YouTube 16:9 (3-min), IG/TikTok 9:16 (15s), client portal embed (16:9, 90s)
- Brand audit: which `BrandConfig` applies, what's locked, what's flexible
- Output: `production-brief.json` — the contract every downstream agent reads

### Phase 2 — Production (Cinematographer + Scriptwriter, in parallel)
**Lead:** `video-cinematographer` + `video-script-writer` · **Support:** existing Remotion pack

- Cinematographer plans shots: which compositions, which Hyperframes scenes (if any), which raw b-roll
- Scriptwriter writes scene-by-scene narration with engineered hooks + retention + CTA
- `remotion-composition-builder` + `remotion-designer` execute the technical Remotion build
- `remotion-render-pipeline` produces raw MP4 (no audio mix yet, no colour grade)
- Output: `raw-render.mp4` + `script-timed.srt`

### Phase 3 — Post-production (Editor + Sound Designer + Colorist)
**Lead:** `video-editor` · **Support:** `video-sound-designer`, `video-colorist`

- Editor passes the raw render — identifies dead spots, tightens cuts, asks Remotion to re-render specific scenes if needed
- Sound designer adds: music bed (royalty-cleared, brand-matched mood), SFX, ducking on voiceover, room tone for talking-heads, J-cuts and L-cuts where dramatic
- Colorist applies per-brand LUT (cinematic grade, not raw computer-generated colour) — adjusts white balance + saturation + film-grain texture if brand calls for it
- Output: `polished.mp4` ready for brand-guardian gate

### Phase 4 — QA + Delivery (Brand Guardian → Distribution)
**Lead:** `video-brand-guardian` · **Support:** `video-distribution-strategist`

- Frame-by-frame brand audit: Gun Metal + Candy Red consistency, brand-mark integrity, no AI slop, no Lucide icons, real logos correctly placed
- Per-platform cuts: 1:1 / 16:9 / 9:16 variants from same master, each with platform-native captions
- Upload to Supabase storage, generate signed URLs (~30-day TTL)
- Deliver: Resend email to client + Linear ticket + Telegram ping via `@PiCeoMarketingBot`
- Output: links + assets + retro template ready for the T+30 metrics review

## Critical design decisions

### 1. Why not just use Hyperframes / Sora / Veo end-to-end?
- **Brand-mark integrity** fails — these tools don't know `BrandConfig.tokens.gunMetal = "#1a1a1a"`. They drift creatively per generation.
- **Voice consistency** fails — Phill's ElevenLabs clone is a specific voice signature; Sora's voice generation can't match it.
- **Compliance** fails — for client work (Duncan ITR Demo Reel) we need the ability to redact specific data fields, which generative tools won't do reliably.
- They ARE useful for **b-roll / cinematic establishing shots / abstract texture** — those slot under `video-cinematographer` as one of several sources.

### 2. The Remotion pack stays — these new agents sit ABOVE it
The 10 existing Remotion skills are the production substrate. The new 4-NEW + 5-EXTEND skills are the creative leadership. Think:
- Remotion = the camera + the lights + the edit suite (tools)
- New agents = the director + DoP + editor + sound designer (the team)

### 3. Cost frame
Net per-60s social cut today (estimated): $0.50 (Remotion render + ElevenLabs).
Net per-60s social cut with full Video Agency: ~$3-5 (adds music licensing + LUT grading + post-production model time).
**Phill's directive:** the 6-10× cost is the right trade for world-class output that compounds brand value over 100+ pieces per client per year.

### 4. The Hyperframes question — answered
Per `[[research-codex-video-generation-2026-05-14]]`: Hyperframes is HeyGen-plugin HTML-in-canvas, architecturally identical to Remotion. Verdict reframed under the new directive:
- 🟡 **Add as one tool under `video-cinematographer`** — when a scene calls for HeyGen's stock-canvas style (rare; usually client-internal explainers)
- 🔴 **Never trust with client-facing brand work** — Brand Guardian's frame audit would reject it without a BrandConfig token bridge
- 🟢 **Allowed for internal Pi-CEO demo videos** where brand standards are relaxed
- Phill's earlier "Friday sandbox test" → reframe as "one-time evaluation under `video-director` to decide whether to commission a BrandConfig bridge"

## Build order

### Wave 1 — tonight (highest leverage, biggest gaps)
1. **`video-director`** — entry-point persona, dispatches the team. The brief receiver.
2. **`video-sound-designer`** — biggest gap (zero current coverage).
3. **`video-editor`** — second biggest gap (post-production pass).

These three close ~70% of the perceived-quality delta vs current pipeline.

### Wave 2 — Friday
4. **`video-colorist`** — third biggest gap.
5. **`video-orchestrator`** — replaces `remotion-orchestrator` as the EP layer.
6. **`video-brand-guardian` (extension)** — adds video-frame audit to existing brand-guardian.

### Wave 3 — next week
7. **`video-cinematographer` (extension)** — extends `remotion-designer` + `remotion-motion-language` with shot-language framework.
8. **`video-script-writer` (extension)** — extends `remotion-screen-storyteller` with hook/retention/tension framework.
9. **`video-distribution-strategist` (extension)** — extends `remotion-marketing-strategist` with platform-native specs.

## First test brief (Duncan Day-14 Demo Reel)

The Duncan Day-14 personalised Demo Reel (per `[[playbook-client-onboarding-7stage]]` + `[[project-duncan-perkins]]`) is the **inaugural test of the full Video Agency**:
- 3-min Remotion + ElevenLabs reel
- Showing Duncan's sanitised ITR data flowing through Dimitri end-to-end
- Closes on his chosen brand-mark (Lodgey or BeauHQ) animating in
- Voiced by Phill's ElevenLabs clone

Under the new architecture:
- `video-director` reads the brief from the Duncan playbook
- `video-script-writer` engineers the 3-min narrative arc (opening, ITR pain hook, Dimitri reveal, brand-mark close)
- `video-cinematographer` plans the shot list — including a Hyperframes test for the abstract "data flowing" b-roll if it passes Brand Guardian
- Remotion + ElevenLabs execute production
- `video-editor` cuts in the music bed reveal at the brand-mark moment
- `video-sound-designer` mixes a custom theme cue for Lodgey/BeauHQ (whichever wins the vote)
- `video-colorist` applies the Unite-Group "Gun Metal cinematic" grade (warm shadows, restrained saturation)
- `video-brand-guardian` audits every frame
- Delivered Day 14, 10:00 AEST to Duncan's portal + email

If this Demo Reel lands as designed, it's the proof point for every Unite-Group client engagement that follows.

## Cross-refs

- `[[project-duncan-perkins]]` — the inaugural test
- `[[playbook-client-onboarding-7stage]]` — where this slots in (Stage 5 Build sprints + Stage 6 Approvals)
- `[[research-codex-video-generation-2026-05-14]]` — the source that triggered the rethink
- `[[design-preferences]]` — the brand standards every agent enforces
- Existing 10 Remotion skills — the production substrate
- `[[board-synthesis-8-sources-2026-05-14]]` — the broader synthesis
