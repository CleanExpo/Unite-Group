---
type: wiki
updated: 2026-05-15
---

# Board Deliberation — browser-use org adoption (2026-05-15)

Pi-CEO Board deliberation on which repos from the browser-use org enter Wave 1 / 2 / 3 adoption, on top of the already-locked [[board-deliberation-browser-harness-2026-05-14]] PILOT-ONE. Input: [[research-browser-use-org-2026-05-15]] (43-repo catalog, 5 forks, top-3 SHIP-WAVE-1, top-3 SKIP).

## Verdict (1 word): **WAVE-1 vibetest-use + bubus-gated**

Plus the bux 2FA-live-view URL pattern lifted into [[agency-bot-design-2026-05-14]] Phase 2.

## Locked decisions

- **Wave 1:** `vibetest-use` MCP install (immediate, no substrate touch) + bux 2FA-live-view pattern-lift into Pilot Phase 2 spec.
- **bubus W1-gated:** Phill rules whether `Pi-CEO/Pi-Dev-Ops` is "portfolio repo" or "infra repo" under the [[board-deliberation-browser-harness-2026-05-14]] sequencing constraint. If infra → W1 limited pilot (`swarm/board/wiring.py` + `swarm/board/dispatch.py` + tests, nothing else). If portfolio → W2.
- **Wave 2:** `video-use` Synthex-only pilot scope; bubus (if gated out of W1).
- **Wave 3 / watch-list:** `workflow-use` (re-evaluate when vendor lifts "not for production"), long-tail repos per research §2 appendix.
- **SKIP list:** `workflow-use` (now), `macOS-use` (14mo stale + Hermes owns lane), `qa-use` (covered by vibetest-use lighter), `bux` (orchestrator pivot — would rip out Hermes/Composio/ContextBot).
- **6-month sunset clock** applies to every new repo, not just browser-harness.
- **Browser Use Cloud free tier** stays as the 14-day price-discovery instrument; production-volume commitment is gated on the cloud-pricing roadmap.

## The single biggest risk accepted

`bubus` is a 106-star Pydantic event bus written by the same person (Magnus) who shipped a competing orchestrator (`bux`). If Magnus deprecates bubus to push everyone to bux, the swarm's spinal cord goes stale. Mitigation: fork-private the version we adopt; pure Python, MIT, no SaaS dep, worst case is "maintain our fork."

## The single biggest opportunity declined

Adopting `bux` as Phill's CEO orchestrator instead of finishing [[agency-bot-design-2026-05-14]] Pilot. Reason: would require ripping out [[hermes-agent]] + [[reference-composio-connections]] + [[project-contextbot-platform]] — the three substrates Phill already invested in. Lift the 2FA-live-view URL pattern only; never adopt the platform.

## 5 forks for Phill (Board-recommended locked)

| # | Question | Locked answer |
|---|----------|---------------|
| Q1 | Adopt `vibetest-use` as MCP gate? | **YES** — install today |
| Q2 | Wave-1 pilot `bubus` on `swarm/board/wiring.py`? | **YES** if Phill rules Pi-CEO = infra-repo; else **W2** |
| Q3 | `video-use` pilot Synthex-first or RA-first? | **SYNTHEX-FIRST** (Wave 2) |
| Q4 | Lift `bux/install.sh` 2FA-live-view pattern? | **YES** within 14 days |
| Q5 | Browser Use Cloud SaaS dep or self-hosted? | **CLOUD for 14d pilot, SELF-HOSTED for production-volume** |

## Cross-refs

[[research-browser-use-org-2026-05-15]] · [[board-deliberation-browser-harness-2026-05-14]] · [[research-browser-harness-pm-synthesis-2026-05-14]] · [[agency-bot-design-2026-05-14]] · [[master-plan-2b-by-2028-v3]] · [[autonomy-gap-audit-2026-05-14]] · [[pi-ceo-architecture]] · [[hermes-agent]] · [[reference-composio-connections]] · [[project-contextbot-platform]] · [[exit-thesis]] · [[feedback-tight-code]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-audit-verification]] · [[feedback-no-slack]]
