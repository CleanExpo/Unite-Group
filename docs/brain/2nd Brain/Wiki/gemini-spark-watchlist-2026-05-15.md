---
type: wiki
updated: 2026-05-15
status: watchlist
---

# Gemini Spark — Watchlist Entry (Pre-IO 2026)

Pre-announcement leak surfaced 2026-05-15 by [[Source/Google's NEW AI Agent LEAKS are WILD!]] (Julian Goldie YouTube). Pi-CEO Board deliberation same day returned **PASS 5/9** with watch-and-learn directive.

## What's leaked

A welcome screen labelled "Gemini Spark Beta" found in Gemini web app by site `testing catalog`. Items named in the leak:

- **Gemini Spark** — consumer agent, next step beyond current Gemini Agent (which sits behind Google AI Ultra paid tier).
- **Spark Robin** — model variant with "rich visual response" capability. No prior public reference.
- **MCP tool testing** in model selector — Spark may natively support Model Context Protocol.
- **Skills** — loadable workflow templates.
- **Autonomous purchase capability** without per-action confirmation.

Maturity = pre-announcement, undisclosed beta. Single Source (one YouTuber, paid-community CTA). Treat as unconfirmed until Google IO keynote.

## Board verdict (2026-05-15)

- **GTM** EXPLORE · **Tech-Architect** PASS · **Compliance** PASS · **CFO** PASS · **Brand** PASS · **Ops** EXPLORE · **Security** PASS · **Sales** EXPLORE · **Product** EXPLORE
- **Consensus PASS 5/9** — AU Privacy Act exposure from autonomous-purchase / sensitive-data warnings + zero substrate fit + Anthropic-stay decision active per [[decision-anthropic-stay-through-q2-2027]] make this a watch item, not a build item.

## Verification gate

**Google IO 2026 keynote — Mon 2026-05-19, 10:00 PT (Tue 2026-05-20 03:00 AEST).**

Read the keynote transcript morning of 2026-05-20. Re-score against three explicit triggers — any one of these flips PASS → ADOPT-track:

1. **Programmatic API** announced (not consumer UI only) with documented endpoints.
2. **AU region availability** for the agent runtime + data residency guarantee.
3. **Pricing published** with a business / enterprise tier (not just consumer AI Ultra Light).

If all three are no → keep PASS, no further attention until next major Google AI launch.

## If trigger fires — where Spark would slot

Per [[project-pi-ceo]] + [[project-ato-app]] + Senior PM scope 2026-05-15:

- **ATO-APP MYOB → BigQuery ETL** (highest-leverage fit) — Gemini CLI + Managed Spark on `unite-hub` GCP project (already provisioned, BigQuery API enabled, idle). New GCP surface; does NOT touch existing Pi-CEO swarm. Isolated experiment-able.
- **Pi-CEO Margot Gmail triage via MCP** — Spark MCP endpoint as additional caller in `hermes_dispatch.py`. Would be a new load-bearing substrate → all 5 disciplines from [[feedback-substrate-change-discipline]] apply (shadow-run ≥50 dispatches, fork-private pin, rollback drill, no-touch sprint, source-restore).
- **Pi-CEO Spark Skills → Discovery bot replacement** for Duncan / future client onboarding (low priority, evaluate-only).

## Sequencing

Parallel-track to current build queue. Does NOT displace:
- [[pilot-v1-implementation]] Phases 1-8 (cutover Tue 2026-05-19 18:00 AEST — same day as IO keynote, coincidence)
- Duncan Dimitri ITR delivery
- BotFather mint queue (Tasks 145, 148)

## Cross-refs

- [[decision-anthropic-stay-through-q2-2027]] — strategic model-stack stance. Spark is NOT a Q2-2027 re-evaluation trigger unless conditions above are met.
- [[feedback-substrate-change-discipline]] — adoption-time discipline if trigger fires.
- [[feedback-design-preferences]] — Brand-Director PASS reasoning re AI-slop.
- [[project-pi-ceo]] · [[project-ato-app]] · [[project-nexus]] — candidate integration surfaces.
- Sources: [[Source/Google's NEW AI Agent LEAKS are WILD!]] (only legitimate Spark Source; the Apache Spark + Unite-Hub Console files saved alongside are unrelated per researcher synthesis 2026-05-15).
