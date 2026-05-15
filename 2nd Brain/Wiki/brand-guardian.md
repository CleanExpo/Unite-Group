---
type: wiki
updated: 2026-05-11
---

# Brand Guardian

Editorial-standards enforcer skill. Quality gate for all **non-code** output before it reaches a client portal, customer inbox, public site, or social channel. Sister gate to [[qa-lead]] (which gates code).

Model: claude-sonnet-4-6 (standard tier). Triggered as a wave-step in every marketing, content, and design pipeline.

## What It Reviews

- Marketing copy (landing pages, blog posts, email sequences, ads)
- Long-form content (case studies, whitepapers, podcasts, video scripts)
- Social posts, captions, threads
- Sales collateral (one-pagers, proposals, decks)
- Client-facing emails and replies
- AI-generated images, voiceovers, video stitches

Does not review code, infrastructure, or internal-only documentation.

## Per-Business Brand Voice

| Business | Voice Construct |
|---|---|
| [[restore-assist]] | [[voice-klark-brown]] — direct, contractor-first, anti-managed-repair |
| [[dr-nrpg]] | [[voice-klark-brown]] — same construct, applied at the contractor-network level |
| [[carsi]] | Education-led, IICRC-aligned, certification-credible |
| [[synthex]] | Marketing-operator voice — outcome-led, ROI-anchored |
| [[unite-crm]] | Calm, control-oriented, enterprise-suitable |
| [[ccw]] | Distributor voice — practical, machine-led, no-fluff |

Each voice is loaded from the brand's BrandConfig (`Synthex/packages/brand-config/src/brands/{slug}.ts`). Brand Guardian reads it before reviewing.

## Rubric

1. **Voice match** — does the copy sound like the brand's BrandConfig?
2. **Factual accuracy** — every claim verifiable. Statistics linked. Quotes attributed.
3. **$2B filter** — would this embarrass Phill in front of a strategic acquirer? See [[exit-thesis]]. If yes → block.
4. **Forbidden words** — per-brand list. AI-slop tells ("delve", "tapestry", "in conclusion", "it's important to note") auto-flagged.
5. **Hallucination check** — any unverifiable specific claim (named person, dollar amount, date) in client-facing copy triggers auto-reject.

## Pass / Fail Output

Same shape as [[qa-lead]]. Returns PASS or FAIL with specific, actionable reasons. Updates `board_mandates.ci_status` on completion. A FAIL blocks the merge / send.

## One-Hallucination Auto-Reject

For client-facing content, a single unverifiable specific claim is sufficient to fail. There is no "minor" hallucination when the brand is the moat.

## Cross-refs

[[qa-lead]] · [[voice-klark-brown]] · [[exit-thesis]] · [[autonomous-sdlc]] · [[pi-ceo-architecture]] · [[agency-blueprint]] · [[marketing-agency-blueprint-2026]]
