---
type: wiki
updated: 2026-05-11
---

# IICRC Content Initiative

Programme to achieve E.E.A.T. 100% in the AU restoration vertical via derivative content built on IICRC standards. Binds [[carsi]] (LMS), [[dr-nrpg]] (authority site), [[restore-assist]] (field tool), and the [[industry-association-vision-2026]] (media + training pillar) into one editorial workstream.

**Sibling programme:** [[iaq-building-science-initiative]] — same derivative-content pipeline, IAQ + Building Science topical axis, anchored on [[founder|Phill]]'s IAQ Magazine Australia editorial committee seat. IICRC standards = "how to remediate"; IAQ science = "why it matters for occupant health". Run both pillars concurrently.

## Goal

Become the canonical reference for IICRC-aligned content in Australia and New Zealand — videos, podcasts, courses, marketing pages — without republishing IICRC standards verbatim. Captures search demand from contractors, loss adjusters, insurers, and property owners, and feeds the [[exit-thesis]] by establishing defensible topical authority.

## Coutis Distribution Vector (added 2026-05-11)

John Coutis (confirmed [[industry-association-vision-2026|association]] spokesman, 2026-05-11) hosts the YouTube channel and podcast that will distribute this derivative content at scale. The IICRC-derived material gets a recognisable presenter instead of being faceless technical writing. Pipeline: IICRC standard → derivative editorial angle → Coutis-hosted episode or short → multi-channel distribution. Owned by [[association-launch-plan-2026]] Wave 1 (channel launch) and Wave 2 (cert program live).

## The IP Constraint

IICRC standards (S100, S220, S300, S400, S410, S500, S520, S540, S590, S700, S800, S900, plus SOP) are copyright-protected. Cannot republish verbatim. The entire content programme is derivative — interpretation, case study, training application, plain-language summary, compliance walkthrough. Margot is currently scoping safe-harbour with a dedicated deep_research_max job (see below).

## Source Material

- `Sources/Completed/IICRC Standards.md` — index of the 13 active standards
- `Sources/Completed/CARSI Courses.md` — CARSI's existing course catalog, which already maps to IICRC content
- `Sources/Completed/Master Day 1 Visual Documentation with Encircle 2024 - Webinar.md` — competitive content benchmark

## Margot Research In Flight (2026-05-11)

Four parallel deep_research_max jobs scoping the programme:

1. **IICRC IP safe-harbour** — defines what derivative content is legal. Outputs an editorial perimeter document.
2. **E.E.A.T. AU roadmap** — concrete path to 100% Experience-Expertise-Authoritativeness-Trustworthiness across the AU restoration SERP.
3. **IICRC standards catalog mapping** — per-standard derivative angle map (video / podcast / course module / SEO page).
4. **AI multimodal pipeline** — content production pipeline using voice + vision + sensor data captured by [[restore-assist]].

Job IDs are tracked against this page when each lands. See [[now]] for current firing state.

## Content Output Channels

| Channel | Format | Owner Property | Volume Target |
|---|---|---|---|
| Video (YouTube) | Standard walk-through, case study | [[dr-nrpg]] | One per active S-standard, monthly cadence |
| Podcast | "The Restoration Industry" monthly | [[industry-association-vision-2026]] | 12/yr; each episode anchored to a standard |
| Course modules | Structured lessons | [[carsi]] | Aligned to CARSI's 22 NRPG modules (CSE + WRT) |
| SEO pages | Pillar + cluster on disasterrecovery.com.au | [[dr-nrpg]] | One pillar per standard + 5–10 cluster pages each |
| Marketing collateral | Compliance walkthroughs, contractor checklists | [[restore-assist]] | Per certification level |

## Why This Is The Moat

- ANZ restoration brands are absent from AI Overviews (AI Overviews appear in ~55% of restoration searches per [[restore-assist]] SEO note)
- IICRC standards are the technical vocabulary of the industry — owning derivative content owns the topical authority graph
- CARSI is already mandatory in the [[dr-nrpg|NRPG]] 100-point cert system → demand is captive once we publish
- Feeds [[seo-linkable-assets]] (calculators, checklists, micro-apps) for organic backlinks
- Compounds with the [[industry-association-vision-2026]] media pillar — the association is the trusted publisher

## Production Pipeline Candidates (May 2026 substrate updates)

The AI multimodal pipeline Margot research job (#4 above) now has named candidate substrates — captured in [[tech-drops-q2-2026]]:

- **NotebookLM-in-Gemini** — 600 sources per notebook × 13 IICRC standards × derivative angles fits inside the per-notebook ceiling. Produces audio overviews, video overviews, and infographics from NotebookLM's studio panel (Gemini-side chat does not render artifacts). Two-way sync means we can chat in Gemini, then jump to NotebookLM for the asset render.
- **HyperFrames + Codex / Claude Code** — HTML-native video timeline an AI agent edits. Pairs with ElevenLabs for voiceover. Use for short-form explainer / contractor-checklist videos that need brand control; pairs with the in-house `remotion-orchestrator` Remotion stack (Remotion stays canonical for brand-system fidelity; HyperFrames for one-off speed).
- **Marketing Brain** ([[marketing-brain-system]]) — Obsidian + DataForSEO skill that surfaces the cannibalisation ledger and PAA niche map. Decides what to write before the IICRC content programme produces it.

## Cross-refs

[[carsi]] · [[dr-nrpg]] · [[restore-assist]] · [[industry-association-vision-2026]] · [[exit-thesis]] · [[seo-linkable-assets]] · [[voice-klark-brown]] · [[restoration-industry-context]] · [[tech-drops-q2-2026]] · [[marketing-brain-system]] · [[iaq-building-science-initiative]] · [[founder]]