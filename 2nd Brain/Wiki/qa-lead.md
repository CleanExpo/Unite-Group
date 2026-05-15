---
type: wiki
updated: 2026-05-11
---

# QA Lead

Quality gate for every code deliverable before it ships to a client or merges to main. Sister gate to [[brand-guardian]] (which gates non-code output). Sourced from the Tier-1 agency gap analysis benchmarked against AKQA and Publicis Sapient.

Model: claude-sonnet-4-6 (standard tier). Triggered as the final wave-step in [[autonomous-sdlc]].

## What It Reviews

- Code PRs (any repo in the portfolio)
- Long-form content destined for client portals
- SEO reports before they go to a client
- Design outputs (Figma frames, Remotion compositions, brand assets)

## Pass / Fail Output

Returns **PASS** or **FAIL** with specific, actionable reasons. No middle ground. A FAIL blocks the merge or delivery.

Updates `board_mandates.ci_status` field on completion. The orchestrator checks this field before promoting work past the gate.

## Rubric (Code PRs)

1. **Tests pass locally and in CI** — verified, not assumed
2. **No new console.errors / hydration warnings / lint regressions**
3. **No secrets in diff** — `.env`, credentials, hardcoded API keys auto-block
4. **Breaking-change check** — any database migration, route rename, or env-var addition flagged for HITL
5. **Acceptance criteria mapped** — every requirement in the Linear ticket has a verifiable artifact in the PR
6. **Style match** — matches existing patterns in the repo; no gratuitous refactor

## Rubric (Content / SEO / Design)

1. **Brief satisfied** — every brief requirement explicitly addressed
2. **Accuracy** — claims verifiable; data sources cited
3. **Voice match** — defer to [[brand-guardian]] for brand-voice scoring
4. **Deliverable format** — exact format the client expects, not a near-miss

## Why It Exists

Without a hard gate, the autonomous swarm regresses to "works on my machine". The Tier-1 agency benchmark (AKQA, Publicis Sapient) shows that a named QA Lead role, with a pass/fail rubric and the authority to block, is the single highest-leverage role on a delivery team. [[agency-hierarchy]] places it directly above the specialist agents and below the Board.

## Integration

- Reads acceptance criteria from the Linear ticket attached to the PR
- Runs the rubric, writes the verdict to `board_mandates.ci_status`
- Posts the PASS/FAIL to Telegram with reasons
- On FAIL, opens a follow-up Linear ticket with the specific issues

## Cross-refs

[[brand-guardian]] · [[autonomous-sdlc]] · [[pi-ceo-architecture]] · [[agency-blueprint]] · [[agency-hierarchy]] · [[decision-frameworks]] · [[exit-thesis]]
