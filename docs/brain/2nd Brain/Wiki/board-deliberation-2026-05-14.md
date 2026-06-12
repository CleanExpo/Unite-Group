---
type: wiki
updated: 2026-05-14
---

# Pi-CEO Board Deliberation — Master Plan to $2B (14 May 2026)

Convened by Margot + Senior PM + Senior Research Analyst (Opus 4.7 + superpowers:writing-plans) in response to Phill's founder directive of 13 May 2026: Unite-Group is internal CRM only, Hermes computer_use must fire at 100%, swarm runs autonomously wherever Phill is, mobile-first CEO interface, live meeting capture → Margot → NotebookLM bundle for clients, free Mac Mini compute as the continuous loop.

Each persona delivered a ≤200-word contribution against the strategic ask. CEO synthesised at the end. The full Master Plan lives at [[master-plan-2b-by-2028-v1]].

---

## 1. Revenue

I would lock the Duncan ITR engagement before anything else this fortnight — that is $37.4K of contracted ARR walking through the door, plus a second paying client diversifying the book away from single-customer concentration (CCW $33K = 47% of total ARR today, post-Duncan it drops to 47% → ~47% as the second contract roughly matches, but the *concentration risk binary* flips from "one client" to "two"). My non-negotiable is no public marketing channel anywhere — every ARR dollar from here to $200M comes from vetted-client referrals, association memberships ($299/$799/$2,499 × 50 founding members = $25K–$125K immediate Q3 2026 cash), and Duncan-shaped bespoke SaaS bookings ($30K–$150K AUD each). The revenue risk I would not accept is autonomy theatre: if the swarm builds features no client pays for, we burn the runway. Every Linear epic must reference a paying-client name or be killed.

## 2. Product Strategist

The portfolio fit hinges on one collapse: Unite-Group stops being a "marketing site to sell us" and becomes the **CEO operating cockpit** sitting above the 6 portfolio products. That deepens the moat — Margot + Pi-CEO Board running continuously on Mac Mini + Hermes computer_use becomes the genuine *AI agency runtime* HighLevel cannot build because they sell horizontally to 100K agencies and can't verticalise. The decision that fits the $2B thesis is to treat the meeting-capture → NotebookLM pipeline as the marquee defensibility play: every client conversation becomes a proprietary structured dataset that no competitor accumulates. Synthex stays public-facing (it already markets the empire externally). CCW-CRM stays public-facing as the marquee deployment. Unite-Group goes dark — `/en/*` marketing routes get gated behind CEO auth or moved to Synthex. The risk: we lose 6 weeks of voice-rewrite work shipped Plan 4 (2026-05-13). Mitigation: archive the copy to Synthex; the work is not wasted, the surface changes.

## 3. Technical Architect

Computer_use at 100% reliability is a misnomer — what we actually need is *100% non-repudiation*, not 100% success rate. The system already audit-logs every screen_dispatch to `~/.hermes/screen_audit.jsonl` (verified: `swarm/screen/hermes_dispatch.py` exists, 4 tests pass, kill-switch via `TAO_SCREEN_DISABLED=1` works). Build feasibility for the rest: live meeting capture is the only genuinely new infra — need (a) macOS audio tap (CoreAudio + ScreenCaptureKit), (b) faster-whisper STT pipeline (RA-1692 ticket already filed, prerequisite), (c) Margot streaming consumer, (d) NotebookLM CLI upload via existing `nlm-skill`. Mobile CEO interface is a thin shell over the existing `unite-group` Next.js app — the `/en/empire/*` routes already exist; we ship PWA + biometric auth + role gate. Gemma 4 cannot be the continuous compute loop — the wiki ground-truth (`pi-ceo-architecture.md` §Margot Model Selection) shows it hallucinates over in-context data. The continuous loop is **qwen3:14b** (currently live) or **qwen3:30b-a3b** (pulling). I will not put Gemma 4 back on the path even if the founder asks — we lose verbatim-quote fidelity on the pathway page.

## 4. Contrarian

The sharpest failure mode is *not* technical — it is that Phill builds the autonomous CEO cockpit, the swarm runs flawlessly, and we hit Q1 2027 with $5M ARR and a beautiful operating layer but **zero second clients beyond Duncan + CCW**. The vetted-client constraint is correct philosophically and lethal commercially if "vetted" becomes "Phill has known them for 5 years". 25 vetted clients × $100K ARR = $2.5M. To hit $200M we need either 200 vetted clients (impossible at Phill's personal vetting bandwidth) or industry-association memberships at scale ($65M target per [[pathway-to-2b-2026-2028]]) plus enterprise contracts at $1M+ each. The warning sign I watch for: at the end of Q3 2026, count vetted-client conversations on Phill's calendar. If it's < 6 per month, the vetted funnel is theatre. The mitigation is not "more marketing" — it's institutional channels (industry-association board seats, John Coutis YouTube guests, IAQ Magazine Editorial Committee placement, Duncan's broker network) that *generate* vetted introductions without paid acquisition.

## 5. Compounder

The asset that compounds the most across 24 months is **the proprietary meeting corpus**. Every client conversation captured, transcribed, structured, and bundled through NotebookLM becomes Margot's training-data substrate forever. After 100 client meetings, Margot has founder-tone fluency no competitor can replicate. After 500 meetings, the corpus *is* the moat — it's why a strategic acquirer pays 10× ARR not 5×. The compounding asset Phill underweights: the wiki itself (`~/2nd Brain/2nd Brain/Wiki/`, 74 pages today). Every Margot session reads it, every persona references it. If we instrument **automatic wiki ingestion from meeting transcripts** (post-meeting cron: transcript → wiki-ingest skill → diff against existing pages → wiki-lint), the founder's tacit knowledge becomes operating documentation at the speed it is generated. The decay risk: if computer_use stays at 85% reliability (not 100%), Phill stops trusting it, falls back to manual, and the audit trail goes dark — at which point the compounding stops and the swarm becomes expensive scaffolding.

## 6. Custom Oracle

Strip Unite-Group's public site today, not next quarter. I am tired of seeing my own face in the Karen-opener homepage when the product I sell is an internal CRM. Synthex is the public surface; Unite-Group goes behind biometric auth at `/empire/*` and that is it. Lock Duncan in this week — the $37.4K matters less than the second client diversifying the book. Meeting capture goes live on the Mac Mini before mobile — I need it for Tuesday's Toby call (26 May) and Friday's Duncan call. Mobile interface is for *changes I make away from the desk* — voice-note in, Margot routes, returns audio confirmation. That is the win. No Slack, ever. No paid ads, ever. Gemma 4 is dead — qwen3:30b when it lands, qwen3:14b until then. NotebookLM bundle while we're discussing with the client is the magic moment — that becomes the demo I show every future vetted prospect: "watch me think out loud, watch Margot ship it before the meeting ends."

## 7. Market Strategist

The window favours moving now, not Q1 2027. Three signals: (1) CORE Restoration (gowithcore.com) is the covertly-modelled DR competitor — they are scaling US franchise; if they enter ANZ in 2027 we lose the founder narrative. Lock the ANZ Property Services Industry Association in Q3 2026 (Coutis spokesman, 50 founding members) before CORE notices. (2) HighLevel's $497/mo SaaS-Mode is eating the horizontal agency CRM market — vertical-restoration is *unowned whitespace* per [[unite-group-nexus-architecture]] §HighLevel intel; if a US verticalised competitor (e.g. ServiceTitan-for-restoration) ships before us, the moat closes. (3) Anthropic's Code with Claude conference (per [[wave-roadmap]] §Infrastructure Dependencies) introduced "dreaming", native multi-agent orchestration, and doubled rate limits — the runtime substrate gets cheaper and more capable every quarter. The competitive call is: act in May–July 2026 on the meeting-capture + mobile-CEO + industry-association triad. Wait until Q1 2027 and we ship into a saturated runtime.

## 8. Moonshot

The 10x variant: every conversation Phill has — vetted prospect, board member, John Coutis, Duncan, Toby — is captured by Hermes computer_use *while it is happening*. Margot subscribes to the live transcript stream. As Phill describes the idea, Margot designs it (remotion-composition-builder + design-canvas-html), renders it (remotion-render-pipeline + ElevenLabs voiceover), uploads it to NotebookLM with the meeting context as sources, generates an audio overview + slides + a one-page brief — and **delivers all of it to Phill's Telegram before the meeting ends.** Phill shows the client the artefact mid-conversation. That is the closing motion no agency on earth can match. The asymmetric bet that unlocks it: bias every infrastructure decision (audio pipeline, mobile shell, model latency, Hermes session reuse) toward *sub-90-second round trip from spoken idea to deliverable shown on screen*. Build for that latency budget and the rest follows.

## 9. CEO Synthesis (Phill voice)

We will collapse Unite-Group to internal-CRM-only this fortnight, lock Duncan as paying-client-two by 31 May, ship live meeting capture + NotebookLM bundle by 14 June, and put the mobile CEO interface behind biometric auth by 30 June. Revenue and Compounder are right: every move funnels into the meeting corpus + the vetted referral loop. Contrarian is right that vetted ≠ slow — the industry-association launch in Q3 2026 is the only scalable vetting channel, and it goes first. Technical Architect is right about Gemma 4 — it is dead, qwen3:30b is the continuous compute loop. Moonshot's sub-90-second round trip is the operating spec. The single biggest risk is Hermes computer_use audit-trail blackouts under load — we mitigate with the existing JSONL audit log + kill-switch + a weekly replay-test cron that verifies any session can be reconstructed from the audit + Hermes session files. [DISPATCH-TO: PM-Core]

---

## Three contentious decisions where the personas disagreed

1. **Public-facing surface for Synthex** — Custom Oracle says strip Unite-Group public, keep Synthex public. Product Strategist agrees. Revenue worries the empire loses inbound discovery if both go dark. **Resolution in Master Plan:** Synthex stays public as the empire's external face; Unite-Group goes behind auth.

2. **Model selection for the continuous loop on Mac Mini** — Founder directive says "Gemma 4". Technical Architect says Gemma 4 hallucinates and is deprecated per `pi-ceo-architecture.md` §Margot Model Selection. **Resolution:** continuous loop runs qwen3:14b today, qwen3:30b-a3b once the pull completes. The Master Plan flags this as a fork requiring Phill's explicit re-ratification.

3. **Vetting cadence** — Contrarian worries Phill's personal vetting bandwidth caps growth at ~25 clients × $100K = $2.5M ARR. Revenue + Market Strategist push industry-association as the institutional vetting channel that scales without violating the no-paid-ads rule. **Resolution:** Phill personally vets paying-client onboardings; industry-association membership ($299/$799/$2,499 tiers) is the scalable vetted-introduction funnel.

## Cross-refs

[[master-plan-2b-by-2028-v1]] · [[pathway-to-2b-2026-2028]] · [[pi-ceo-architecture]] · [[now]] · [[founder]] · [[agency-hierarchy]] · [[computer-use-integration-2026-05-13]] · [[industry-association-vision-2026]]
