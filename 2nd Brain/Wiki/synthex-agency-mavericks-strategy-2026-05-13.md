---
type: wiki
updated: 2026-05-13
---

# Synthex × Agency Mavericks — Strategy (2026-05-13)

> Companion to `Wiki/agency-mavericks-research-2026-05-13.md` (verbatim extraction). This doc is the *strategic ruling* on what we do with that material. Hard-filtered through [[pathway-to-2b-2026-2028]].

## The strategic question we're answering

Does Troy Dean's "headless agency / Skills-orchestrated AI fulfilment" model give us a faster path to [[synthex|Synthex]] as a $40M ARR vehicle than what we already have — and if yes, which pieces do we ADOPT, REJECT, or ABSORB into the existing build?

## The Synthex thesis post-Mavericks

Synthex is **not** a 28-client lifestyle agency. It is the empire's in-house Skills-orchestrated marketing engine that serves the portfolio first and a small number of vetted external clients second. The Mavericks contribution is *architectural*: it validates that AI agents organised as **Skills (modular SOPs the AI executes)** + **brand-voice extraction up front** + **two human jobs only (sales + strategic check-ins)** can deliver agency-grade fulfilment without staff. We adopt the *operating shape*. We reject the *client mix, the GoHighLevel substrate, and the $3K/mo pricing anchor*. Synthex stays code-owned ([[synthex]] v11.1, Next.js 15, Supabase, Prisma 6, BullMQ — already built) and becomes the headless engine **for the portfolio**, with the [[industry-association-vision-2026|Industry Association]] member-services layer as the external monetisation channel ([[marketing-agency-blueprint-2026]] already aligns).

## What we ADOPT from Agency Mavericks

| Adopt | Why it fits | Replaces | Ship |
|---|---|---|---|
| **Skills = modular SOPs the AI executes end-to-end** (brand-voice extraction → ICP/strategy → blog → social → newsletter → PM → client comms) — *Source: part two §"The AI Skills That Run the Agency", 4:48; "skill file as a modern version of a standard operating procedure" §11:45* | Maps 1:1 onto Claude Code Skills already in use ([[claude-code-guide]]); turns scattered prompts into a versioned, testable skill library. The empire's `marketing-*` and `remotion-*` skill families ARE this pattern — Mavericks confirms it's the right one. | Ad-hoc CMO-bot prompts + scattered Synthex automation rules. | Wave 5.3 — formalise `synthex-skill-library/` repo, port existing prompts into Skill files with `WHEN/INPUT/OUTPUT/CALIBRATION` schema. |
| **Front-load brand-voice extraction in week 1** — *Source: part two §"AI Skills", 2:42; "interview your client and get your client talking a lot about what they know. Take the transcript and feed it to the AI" §7:30* | This is the single biggest quality multiplier Troy names. Eliminates AI-slop drift. Maps to [[brand-guardian]] + existing `remotion-brand-research` / `remotion-brand-codify` skills at `Synthex/packages/brand-config/`. Extend to portfolio brands first. | Per-business one-off voice docs that drift. | Wave 5.3 — run `remotion-brand-research` for all 6 portfolio brands; build identical artefact for written voice via new `synthex-brand-voice-extract` skill. |
| **90-day calibration arc with quality-control pass-rate as the metric** — *Source: part two §"What Happens When a Client Signs", 6:14: "Weeks 9 through 12 is autonomous operation… I'm watching the quality control pass rate go up, errors go down, revisions go down."* | Gives [[brand-guardian]] + [[qa-lead]] a concrete KPI per skill per client — pass-rate %, revision count, time-to-publish. Direct fit with the [[pathway-to-2b-2026-2028]] Pillar 2 KPI gap. | Soft "is it on-voice?" judgment. | Wave 5.3 — Supabase `synthex_skill_runs` table; pass-rate dashboard pinned to [[unite-group-nexus-architecture\|Nexus]] empire view. |
| **Dedicated Slack channel per client (AI posts updates, client approves/revises, AI handles revisions)** — *Source: part two §"What Happens When a Client Signs", 4:25, 4:48* | We are NO-Slack (see memory `feedback_no_slack`). Adopt the *pattern* — dedicated, per-account async channel — and ship it as a **Telegram channel + Nexus client portal** instead. Pi-CEO already uses Telegram as the founder loop. | Email loops + scattered approvals. | Wave 5.4 — Telegram-per-portfolio-business channel; Nexus portal for external vetted clients. |
| **MCP-first integration assumption** — *Source: part one §"Role of AI in Agency Operations", 8:41; "Salesforce, Meta, Anthropic, Open AI, Stripe, Notion, every major platform is racing to release… MCP"* | Validates our existing [[mcp-ecosystem]] direction. Every new platform connection ships as MCP, not click-bot. | One-off API integrations. | Already live — extend per [[hermes-agent]]. |
| **Productised content cadence: 1 long-form blog/wk + 4× social/wk + 1 newsletter/wk per business** — *Source: part one §"Mechanics", 4:18–5:09* | Direct match to [[pathway-to-2b-2026-2028]] acceptance criterion "≥4 in-house content artefacts per business per week". | Vague "content output". | Wave 5.3 — Synthex cron produces the cadence per portfolio business; first artefact CCW. |

## What we DON'T adopt

| Reject | Why | Instead |
|---|---|---|
| **The 28-clients-at-$3K/mo target** | Conflicts with VETTED CLIENTS ONLY ([[pathway-to-2b-2026-2028]] constraint 2). Volume play. 28 random agency owners is not the $2B pathway. | Synthex serves 6 portfolio businesses + ≤5 vetted external clients per portfolio brand by end of 2026 (acceptance criterion already exists). |
| **GoHighLevel as the platform** — *Source: part two §10:59, "A CRM. We use High Level. Yeah, it's clunky as fuck but it does the job."* | We OWN our stack ([[synthex]] v11.1 + [[unite-group-nexus-architecture\|Nexus]] CRM). GHL is rented infrastructure; gives us no IP, no $2B exit story. Troy himself calls it "clunky as fuck". | Synthex codebase remains the platform of record. The Solutions.md doc becomes a *spec sheet* — every capability GHL ships (AI Agent Studio, MCP server, Workflow builder, Snapshot system, white-label client portal, branded mobile app, reputation/GBP, dashboards) is a build-vs-buy decision on [[wave-roadmap]]. Default: build into Synthex/Nexus. |
| **"$1M lifestyle business" framing** | Direct conflict with $2B exit thesis ([[exit-thesis]]). Troy is capping at 28 by choice; we are not capping. | Synthex contributes $40M ARR by 2028 per [[pathway-to-2b-2026-2028]] table. |
| **Asana as PM tool** — *Source: part two §11:08* | We use Linear (already cross-portfolio standard). | Linear MCP — already wired via [[hermes-agent]]. |
| **Slack as comms tool** | Founder directive: no Slack (memory `feedback_no_slack`). | Telegram + Nexus portal. |
| **The "course + cohort" monetisation pivot** | We are not selling courses. Phill is the think tank, not a coach. | Synthex sells *outcomes* to vetted external clients via the Industry Association member-services layer ([[association-launch-plan-2026]] Wave 2). |
| **Paid media as a service line** — *Source: part two §"AI Skills", 5:05: "Paid media management is an example now that Meta has released their MCP."* | NO AD SPEND ([[pathway-to-2b-2026-2028]] constraint 1) — neither for us NOR for the clients we serve, if it would frame Synthex as "ad-spend-dependent" agency. | Synthex services are organic-only: SEO/AEO/GEO + content + email + social + reputation. |

## The 5 pillars of post-Mavericks Synthex

1. **Skill Library (the new IP)** — versioned `synthex-skill-*` files in a dedicated repo, each skill carrying its own KPIs (pass-rate, revision-count, time-to-publish). The portable asset that travels into Industry Association member services and the eventual acquirer due-diligence packet. → maps to **content engine** + **vehicle for $40M ARR**.
2. **Brand-Voice Engine** — extract once per brand (portfolio + external client), store as `BrandConfig` (already at `Synthex/packages/brand-config/`). Every downstream skill reads from this. → maps to **portfolio business multiplier** — same engine, 6 brands.
3. **Per-Business Production Cadence** — Synthex cron produces 1 blog + 4 social + 1 newsletter weekly for each of the 6 portfolio businesses. → maps to **portfolio business support**.
4. **Vetted-Client Channel via Industry Association** — Synthex is the fulfilment back-end for the [[industry-association-vision-2026|ANZ Industry Association]] Marketing-as-a-Service tier ([[marketing-agency-blueprint-2026]] cross-link). 50 founding firms × tiered MaaS pricing = the external scale path that respects the vetting constraint. → maps to **industry-association**.
5. **Two-Job Operating Model** — only two human jobs remain at the agent layer: (a) Margot does "strategic check-in" with each business once per fortnight; (b) [[founder|Phill]] does sales for new portfolio expansion + signing vetted external firms. Everything else is Skill-orchestrated. → maps to **portfolio business** (operating efficiency unlocks the founder's time for sales + ideas).

## Pricing + packaging

| Channel | Pricing | Rationale |
|---|---|---|
| **Internal portfolio** | $0 transfer price; cost amortised in Synthex P&L | Synthex is the empire's marketing engine. ARR contribution flows via the businesses it serves. |
| **External vetted-clients (direct)** | AUD $5K–$15K/mo retainer | Above Troy's $3K anchor — we are NOT volume; we are vetted, brand-owned, full-stack with [[unite-group-nexus-architecture\|Nexus]] CRM included. |
| **Industry Association MaaS tier** | Bundled into Association membership (tiered: Audit / Done-with-You / Done-for-You per [[marketing-agency-blueprint-2026]] cross-link) | Member-services moat — uncopyable. |
| **Synthex SaaS (synthex.social existing 1,000 users)** | Existing Pro/Growth/Scale tiers (AUD, Stripe live since v8.0) — keep as-is | Already shipped; separate revenue line; non-cannibalising. |

Reject Troy's $3K/mo anchor for our external direct work — it under-prices the moat.

## Tooling shape

**GoHighLevel: NO.** Reasoning above. The Solutions.md doc serves as a build-vs-buy checklist for [[wave-roadmap]] Wave 6:

| GHL capability | Synthex/Nexus equivalent | Status |
|---|---|---|
| Agent Studio | Claude Code Skills + Synthex AI workflow engine (v2.0) | Built |
| MCP Server | [[mcp-ecosystem]] (Linear / Supabase / Telegram / Gmail / Composio) | Built |
| Workflows | Synthex BullMQ background jobs | Built |
| White-label client portal | Nexus `/en/clients/*` | Wave 6.1 |
| Branded mobile app | [[restore-assist]] iOS pattern reusable | Wave 7 |
| Reputation Mgmt / GBP | New `synthex-reputation` skill | Wave 6.2 |
| Snapshots (account templates) | "BrandConfig snapshot" — already a typed TS file | Built |
| Dashboards | Nexus empire view + per-business 6-pager | Built |
| Phone System / SMS | Twilio direct via Composio | Wave 6.3 |

Net: GoHighLevel is a **feature-list spec**, not a substrate. Default decision: build into Synthex/Nexus.

## Each agent's role in the new Synthex

| Role | Owns | Mavericks-mapped task |
|---|---|---|
| [[founder\|Phill]] | Vetting, vision, sales conversations | Troy's "humans buy from humans" job (part two §9:33) — Phill is the face for every external client sign. |
| Margot | Fortnightly strategic check-in per business + per external client | Troy's "20–30 min strategic conversations twice a month" job — voice-delivered via ElevenLabs per [[pathway-to-2b-2026-2028]] Pillar 5. |
| Pi-CEO Board | Approves new external client onboarding; reviews monthly skill pass-rate dashboard | Troy doesn't have this — our differentiator + the $2B governance. |
| CMO bot (reframed) | Owns the Synthex skill library calibration; monitors pass-rate across all clients; surfaces drift | Troy's "supervise the system" job (part two §10:01). |
| PM-Synthex | Ships Skill files; owns skill versioning; runs the 90-day calibration arc per new client/brand | Troy himself, internalised. |
| [[brand-guardian]] | 5% editorial QC pass on every artefact before ship | Troy's "5% that requires human judgment" (part two §7:58) — already in our roster. |
| [[qa-lead]] | Skill-file CI: every skill has a test, every change runs CI | Troy doesn't have this — our reliability moat. |
| Tier-2 Growth (BG + GV agents per [[agency-hierarchy]]) | Execute skills under PM-Synthex direction | Troy's "team of skills"; we have them named. |
| `marketing-orchestrator` + sub-skills | Already the entry point ([[marketing-agency-blueprint-2026]]) | Wave 5.3 — refit the existing marketing-* skill family to the `WHEN/INPUT/OUTPUT/CALIBRATION` schema. |
| `remotion-orchestrator` + sub-skills | Video-first content for [[founder|Phill]] (constraint 3) and for clients | Troy doesn't ship video at all — our differentiator. |

## 90-day execution map

| Week | Deliverable | Owner | Verifies |
|---|---|---|---|
| 1 | `synthex-skill-library/` repo scaffolded; skill schema (`WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE`) ratified | PM-Synthex | Repo exists; schema doc in [[claude-code-guide]] |
| 1 | Run `remotion-brand-research` for all 6 portfolio brands (some exist) | BG-1 | 6 BrandConfig files at `Synthex/packages/brand-config/src/brands/*.ts` |
| 2 | `synthex-brand-voice-extract` skill (written voice; analogue of remotion-brand-codify for prose) | K-2 + BG-3 | Skill file + first run against CCW |
| 2 | `synthex_skill_runs` Supabase table + pass-rate dashboard | SD-1 | Table live; dashboard renders |
| 3–4 | Port `marketing-copywriter`, `marketing-social-content`, `marketing-seo-researcher` into skill schema with per-skill pass-rate KPIs | PM-Synthex | Each skill has documented pass-rate baseline after 5 runs |
| 4 | Per-business Telegram channel pattern (replaces Slack-per-client) | SD-3 | 6 channels live + Margot reaches all of them |
| 5–6 | Production cadence cron — 1 blog + 4 social + 1 newsletter per business per week, autonomous | PM-Synthex | 6 weeks of clean artefacts logged + brand-guardian pass-rate ≥ 85% |
| 7–8 | Skill calibration loop: every failed brand-guardian/qa-lead review feeds back into skill file | CMO bot | Pass-rate week-over-week trending up |
| 9 | First external vetted client (one of the firms identified for the [[association-launch-plan-2026]] founding cohort) | [[founder]] + Margot | Signed agreement; first kickoff call scheduled |
| 10 | External client week-1 onboarding executes the same 5-week ramp from Troy's part-two §"Client Signs" arc — adapted: discovery → BrandConfig → ICP → strategy → first batch | PM-Synthex | Week 1 documents shipped on time |
| 11–12 | Pi-CEO Board reviews 90-day skill pass-rate dashboard; ratifies "Synthex production-ready" | Pi-CEO Board | Decision memo committed to wiki |

## Risks + the founder's call

| # | Risk | Blast radius | How we'd know | Kill-switch |
|---|---|---|---|---|
| 1 | **AI-slop drift on real client artefacts erodes [[ccw\|CCW]] / portfolio brand equity** | High — CCW is the marquee case study; brand damage compounds. | brand-guardian pass-rate < 80% sustained 2 weeks OR a single client complaint about voice. | Pause autonomous production for that brand; revert to manual QC at 100%; investigate skill drift; rerun brand-voice extraction. |
| 2 | **Pricing-anchor contamination from Mavericks public content** — if we accidentally publish Synthex as "$3K/mo agency" the [[exit-thesis]] valuation gets compressed. | Medium-high — affects buyer narrative for 2028 exit. | brand-guardian + [[founder]] gate all external Synthex marketing; cross-check vs [[brand-guardian]] $2B filter. | Edit any artefact that frames Synthex as Troy-clone; reposition as "in-house empire engine + Industry Association MaaS". |
| 3 | **Skill-library lock-in to a vendor (Slack/Anthropic/GHL) reduces portability** — if a future model or platform shift breaks 40 skills at once. | Medium — recovery cost is 4–6 weeks of rebuild. | A skill outage > 24h that can't be fixed by config change. | Mandate every skill file declares its `MODEL_PROVIDER` + `MCP_DEPS` so portability audit is trivial; quarterly portability test as [[curator-deployment-unknown]] check. |

## Open decisions for the Pi-CEO Board (next step)

1. **Approve `synthex-skill-library/` as a separate repo** (not a subdir of Synthex) so it can later be sold as IP or licensed to Industry Association members. **YES / NO / REFRAME.**
2. **Set the external direct-client price floor at AUD $5K/mo** (vs Troy's $3K anchor). Confirms vetted-only positioning + protects $2B narrative. **YES / NO / REFRAME (different floor).**
3. **Adopt brand-guardian pass-rate ≥ 85% as the gate to autonomous production per brand** — i.e. no brand goes "hands-off" until 5 consecutive weeks > 85%. **YES / NO / REFRAME.**
4. **Refit `marketing-orchestrator` + child skills to the `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema in Wave 5.3** (vs Wave 6). **YES / NO / REFRAME (different wave).**
5. **Reject GoHighLevel as a substrate** — confirm Synthex/Nexus as the platform of record; use GHL Solutions.md only as build-vs-buy spec. **YES / NO / REFRAME.**

## Cross-refs

[[pathway-to-2b-2026-2028]] · [[synthex]] · [[marketing-agency-blueprint-2026]] · [[marketing-brain-system]] · [[agency-hierarchy]] · [[industry-association-vision-2026]] · [[association-launch-plan-2026]] · [[unite-group-nexus-architecture]] · [[brand-guardian]] · [[qa-lead]] · [[mcp-ecosystem]] · [[wave-roadmap]] · [[ccw]] · [[founder]]
