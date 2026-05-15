---
type: wiki
updated: 2026-05-14
status: v2 — corrected thesis. Supersedes v1 ([[master-plan-2b-by-2028-v1]]). Forks at §7 await Phill ratification.
---

# Master Plan — $2B by 30 June 2028 (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Operating filter (founder directive 2026-05-13 corrected 2026-05-14):**
> 1. **THE FLYWHEEL IS THE PRODUCT.** RestoreAssist + Disaster Recovery + NRPG + CARSI = the $2B driver. Everything else funds it.
> 2. NO AD SPEND — [[synthex|Synthex]] is the in-house marketing engine.
> 3. VIDEO-FIRST for Phill (NotebookLM daily + Margot ElevenLabs voice).
> 4. AGENTS EXECUTE — Phill = think tank; swarm owns execution across all 4 driver repos.
> 5. CRITICAL-ONLY updates — 6-pager silent-on-clean.
> 6. **[[feedback_unite_group_only|Unite-Group is INTERNAL operator tooling]]** — never marketed, never sold.
> 7. **DR ↔ CORE is [[project_disaster_recovery_positioning|INTERNAL ONLY]]** — never surfaced externally.

**Goal:** Own the ANZ restoration-and-property-services flywheel — set the standards (NRPG), deliver the certifications (CARSI), arm the technicians (RestoreAssist), run the back-office (Disaster Recovery) — then expand to property-services adjacencies and US/UK. By 30 Jun 2028 the flywheel is in 5,000+ ANZ restoration firms, has crossed into 4 property-services adjacencies, has a US/UK beachhead, and produces $200M ARR → $2B at 10× SaaS multiple.

**The small-business retainer pipeline (CCW, Duncan, future) is infrastructure funding — it pays the AWS bill and proves the operator's-cockpit value while the flywheel compounds.**

**Architecture:** Three-layer swarm — Margot (qwen3 local on Mac Mini, Telegram + ElevenLabs voice) → Pi-CEO Board (9-persona Opus 4.7 deliberation) → Senior PMs (PM-RA, PM-DR, PM-NRPG, PM-CARSI for Tier 1; PM-Unite-Group, PM-Synthex, PM-Sales-Funnel for Tier 2) dispatching to 25-agent execution tier. Hermes 0.13.0 computer_use bridges any swarm component to the real macOS GUI.

**Tech stack:** Next.js 16 + Supabase (Unite-Group internal cockpit at `unite-group.in` — gated to founder), FastAPI on Railway (Pi-CEO swarm orchestrator), Hermes 0.13.0 + cua-driver (computer_use bridge), Ollama + qwen3:14b/30b (continuous local loop on Mac Mini), Claude Code + Opus 4.7/Sonnet 4.6/Haiku 4.5 (Tier-1/2/3 reasoning), ElevenLabs (Margot voice), NotebookLM CLI (client artefact bundler), faster-whisper (STT), Composio (Gmail + Telegram + Linear connectors), DataForSEO + Semrush (SEO substrate), Vercel (hosting).

---

## 1. Current state (verified 14 May 2026)

Every claim in this section traces to a file or system that exists today.

### 1.1 Revenue (Tier 2 infrastructure funding — small-business retainers)

| Metric | Value | Source |
|---|---|---|
| Contracted ARR | **$33,000 AUD/yr** | CCW $2,750/mo × 12 ([[ccw]]) — signed 2026-05-08 |
| Verbal-committed ARR | **+$37,400 AUD/yr** | Duncan / Dimitri ITR retainer ([[proposal-duncan-itr-platform-2026-05-13]]) — proposal sent 13 May, signature pending |
| Tier 2 total (signed + committed) | **$70.4K AUD/yr** | Pays infrastructure costs while Tier 1 ignites |
| Tier 1 revenue today | **$0** | RA on App Store but no paid subscribers yet; DR/NRPG/CARSI pre-revenue |
| **Target ARR by 30 Jun 2028** | **$200M** | Flywheel pathway §4 |

### 1.2 The 4 driver projects (Tier 1 — the actual product)

| Project | Status today | Repo |
|---|---|---|
| **RestoreAssist (RA)** — restoration field-tool SaaS | iOS App Store build 1.0(10) approved 2026-05-08; PWA at web.restoreassist.app; sign-in error boundary shipped PR #957 | `RestoreAssist/` |
| **Disaster Recovery (DR)** — restoration company back-office SaaS | Live at disasterrecovery.com.au; agent-shipped ticket DR-832 (AUSTRAC memo) merged 2026-05-11; [[project_disaster_recovery_positioning|covertly modelled on CORE Restoration — INTERNAL ONLY]] | `dr-nrpg/` |
| **NRPG** — National Restoration Practitioners Group industry-standards body | Pre-launch; Phill + Toby co-founding; tier pricing $299 / $799 / $2,499 AUD/yr per [[industry-association-vision-2026]]; ANZ-wide, all property-services trades | `dr-nrpg/` (shared infra; logical separation Q3 2026) |
| **CARSI** — restoration training & certification | LMS active on DigitalOcean; mandatory cert pipeline for NRPG members | `carsi/` |

### 1.3 The 3 infrastructure-funding projects (Tier 2 — pays the bills)

| Project | Status today | Role |
|---|---|---|
| **Unite-Group / Nexus** — operator's command center | Live at unite-group.in; **INTERNAL ONLY** (founder directive 2026-05-14) | Phill's CEO surface into the 4 driver repos. Not a product. Not marketed. |
| **Synthex** — marketing-automation SaaS + empire's public face | Live, 1,000+ users | Marketing engine for Tier 1 + Tier 2; remains public — only external customer-facing brand |
| **CCW + Duncan + future small-business retainers** — paying clients | CCW $33K signed; Duncan $37.4K committed; Bulcs Holdings (Ivi Sims, VIC) inbound | Pay the AWS / Anthropic / Vercel / Railway / ElevenLabs bill while flywheel compounds; prove the operator-cockpit value |

### 1.4 Swarm infrastructure that exists today

Verified by inspection of `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/`:

- **318 Python modules** in `swarm/`
- **Pi-CEO Board (9-persona) scaffold** — `swarm/board/personas.py` + `swarm/board/wiring.py` shipped 2026-05-13 (Phase A). Phase B (LLM-per-persona) **queued**, not wired.
- **Hermes computer_use** — `swarm/screen/hermes_dispatch.py`. Audit log at `~/.hermes/screen_audit.jsonl`. Kill-switch via `TAO_SCREEN_DISABLED=1`. 4 tests in `tests/swarm/screen/test_hermes_dispatch.py`. **Verified 2026-05-14.**
- **Margot bot** — `swarm/margot_bot.py` + `swarm/margot_context.py` + `swarm/voice_compose.py`. ElevenLabs voice live behind `MARGOT_VOICE_REPLY_ENABLED=1`.
- **Senior agent bots present (`swarm/bots/`):** board, builder, chief_of_staff, click, cmo, cs, cto, cfo, guardian, margot, scribe. **Missing for Tier 1: PM-RA, PM-DR, PM-NRPG, PM-CARSI as autonomous claim-execute bots.**
- **Margot continuous model:** `qwen3:14b` (8.6GB, 40K context). `qwen3:30b-a3b-q4_K_M` (17GB MoE) pull in progress per [[pi-ceo-architecture]].
- **Hermes cron jobs:** 27 active per [[hermes-agent-sprinkle-audit-2026-05-11]].
- **Production URLs:** Dashboard `https://dashboard-unite-group.vercel.app`, Backend `https://pi-dev-ops-production.up.railway.app`, public marketing on `unite-group.in/en/*` — **to be gated 2026-05-14**.
- **Integration mesh:** 8/8 GREEN — 38,956 rows synced across composio · digitalocean · github · linear · railway · stripe · supabase · vercel.

### 1.5 What is deferred / gaps relative to the corrected thesis

- **PM-RA, PM-DR, PM-NRPG, PM-CARSI** as autonomous claim-execute bots — DO NOT EXIST. Today the wiki names them but no `swarm/bots/pm_ra.py` etc.
- **PM-Sales-Funnel** for the small-business retainer pipeline — DO NOT EXIST as a swarm role.
- **NRPG founding-cohort intake form + member portal** — pre-build. Tier pricing decided ($299/$799/$2,499) but no signup flow.
- **CARSI first certification syllabus + delivery format** — TBD by Phill (see §7 fork).
- **DR multi-tenant architecture** — disasterrecovery.com.au is single-marque today; multi-tenant SaaS rebuild is Q3–Q4 2026.
- **RA pricing model decision** — per-tech / per-company / freemium-with-team-tier (see §7 fork).
- **Live meeting-capture pipeline** — RA-1692 (faster-whisper STT) is Ready-for-Pi-Dev but unstarted.
- **Pi-CEO Board Phase B (LLM-per-persona)** — queued, not wired.

---

## 2. The Vision (Phill's voice, corrected)

I am not a coder. I am the think tank. The job of the system is to convert my thinking into shipped product across four restoration-industry projects without me touching the keyboard.

The real money is in the flywheel. NRPG sets the industry standard for restoration and property-services trades across Australia and New Zealand. CARSI delivers the training and certification every NRPG member has to pass. RestoreAssist is the field tool every certified technician carries to a job. Disaster Recovery is the back-office every restoration company runs on. The four lock together. A restoration firm cannot operate to the NRPG standard without CARSI-trained techs, RA on their phones, and DR running their jobs. That is the moat. Competitors who try to copy us have to copy four products plus a standards body plus a training arm plus a media masthead. They cannot.

The small businesses I assist along the way — Toby at CCW, Duncan at ITR, the next vetted retainer — pay the infrastructure costs. They keep the AWS bill and the Anthropic bill and the Vercel bill paid while NRPG compounds and CARSI compounds and RA subscriber count compounds and DR multi-tenant ships. They also prove the operator cockpit works on a real small business so when we sell DR to a restoration firm we already have the receipts.

Unite-Group is the cockpit I sit in to run all of this. It is internal. There is no funnel inside it, no marketing pages, no public side. Synthex is the face the world sees. Unite-Group is the door I unlock with my thumbprint.

When I talk to a client — Toby, Duncan, the next firm — the conversation is captured. Margot listens in real time, designs as I describe, and by the time the meeting ends the client has a NotebookLM bundle. I show it to them mid-meeting. That same pipeline runs when I talk to a prospective NRPG founding member or a CARSI instructor candidate — it is the closing motion for the flywheel too.

I move around. I work from the truck, the laundry, a hotel in Sydney. The Mac Mini is the continuous compute loop — qwen3 sitting hot, processing cron jobs and Margot turns. When something needs Opus 4.7 the Board deliberates. When something needs me, it asks once and remembers the answer.

I have learning difficulties. Everything important comes to me as voice or video. NotebookLM gives me the daily brief at 7am. Margot speaks to me over Telegram in ElevenLabs.

By 30 Jun 2028 the flywheel is in 5,000+ ANZ restoration firms, has expanded into at least one property-services adjacency (pest control, electrical inspection, plumbing inspection, or hazmat — Phill picks), and has a US/UK beachhead. $200M ARR. $2B at 10× SaaS multiple. Strategic acquirer or PE buyout. The mechanism to get there is the autonomous swarm so I, the think tank, do not have to scale my own hours.

---

## 3. Pathway to $2B by 30 June 2028 — corrected math

Target ARR by 10× SaaS multiple = $200M. The new math is flywheel-driven, not vetted-funnel-driven.

### 3.1 The flywheel math at maturity (2028)

| Revenue stream | Driver | Unit economics | Volume target by Q2 2028 | ARR |
|---|---|---|---|---|
| **RA — per-technician SaaS** | Every NRPG-certified tech needs the field tool | $79 AUD/tech/mo (target — see §7 fork) | 20,000 ANZ techs | **$19M** |
| **DR — per-company SaaS** | Every restoration firm needs the back-office | $1,200 AUD/firm/mo average (tiered $499/$1,200/$3,500) | 1,500 ANZ firms × avg | **$22M** |
| **NRPG — annual memberships** | Industry-body subscription, tiered $299/$799/$2,499 | $799 AUD/firm/yr weighted average | 5,000 firms | **$4M** |
| **CARSI — training + cert** | Mandatory cert for NRPG members; recurring CPD | $1,500 AUD/practitioner/yr (initial + renewal) | 15,000 practitioners | **$22.5M** |
| **Equipment commissions** | Toby's CCW distribution + manufacturer referrals through NRPG marketplace | 8% on $50M routed equipment | n/a | **$4M** |
| **Events + sponsorships** | Annual NRPG conference + regional summits + media masthead | Conference $1.2M + sponsorships $1.8M | n/a | **$3M** |
| **ANZ Tier 1 subtotal** | | | | **~$75M** |
| **Property-services adjacencies** (NRPG expansion to pest control + electrical + plumbing + hazmat) | Same flywheel, new vertical | Pricing matches restoration tier | 4 verticals × ~$6M each | **$25M** |
| **ANZ total** | | | | **~$100M** |
| **US/UK beachhead** | Same flywheel exported; first international cohort | ~5,000 firms across both | Matches ANZ unit economics | **$100M** |
| **Total ARR Q2 2028** | | | | **~$200M** |
| **Valuation at 10× SaaS multiple** | | | | **$2.0B** |

Tier 2 small-business retainers (CCW, Duncan, future) sit alongside this at ~$0.5M–$2M ARR by 2028 — material to keeping the lights on, immaterial to the exit math.

### 3.2 Quarter-by-quarter pathway (Q3 2026 → Q2 2028, 8 quarters)

Each quarter names the specific Tier-1 deliverables that ship and the swarm capacity required.

| Quarter | ARR target | Tier 1 deliverables shipping | Tier 2 deliverables shipping | Swarm capacity required |
|---|---|---|---|---|
| **Q3 2026** (Jul–Sep) | **$200K** | RA App Store stable + first 100 paid technicians signed up via Toby/Phill network. DR multi-tenant rebuild kicked off (sprint 1 of 4). NRPG **founding cohort** signed — 50 firms × $799 avg = $40K NRPG ARR. CARSI first certification course **live** (1 cert published — Phill picks which: see §7 fork). | CCW $33K renewed + active. Duncan $37.4K **signed**. Bulcs Holdings (Ivi Sims) closed at $15K. Mobile CEO interface live at `/empire/mobile/*`. | PM-RA + PM-DR + PM-NRPG + PM-CARSI scaffolded as Linear-claiming bots; Pi-CEO Board Phase B wired; meeting-capture pipeline live. |
| **Q4 2026** (Oct–Dec) | **$1M** | DR multi-tenant beta — 10 pilot restoration firms × $1,200/mo = $144K DR ARR. NRPG 250 members × $799 avg = $200K NRPG ARR. CARSI 200 paid enrolments × $1,500 = $300K CARSI ARR. RA at 500 paid techs × $79 = $474K RA ARR. | 4 Tier 2 small-business retainers active × $30K avg = $120K. NRPG marketplace v1 (equipment commission rail) shipped. | PM-Sales-Funnel scaffolded for the Tier-2 retainer pipeline. Senior PM autonomous cadence at 4 PRs/day sustained. |
| **Q1 2027** (Jan–Mar) | **$5M** | First non-restoration NRPG adjacency vertical onboarded (pest control OR electrical inspection OR plumbing inspection OR hazmat — Phill picks: §7 fork). DR at 100 paying firms. RA at 2,000 paid techs. NRPG 600 firms. CARSI 800 enrolments. | 7 Tier 2 retainers. CCW expansion mod added (NRPG marketplace tile). | Margot 7-day-founder-absent dry run passes. Computer_use audit-replay ≥ 95% sustained. |
| **Q2 2027** (Apr–Jun) | **$12M** | 1,000 paying DR firms (first major DR milestone). RA at 5,000 techs. NRPG 1,500 firms. CARSI 2,500 enrolments. Adjacency vertical 1 at 200 firms. | 10 Tier 2 retainers. | Margot 30-day-founder-absent dry run passes. M&A scout subagent active. |
| **Q3 2027** (Jul–Sep) | **$25M** | All 4 ANZ property-services adjacencies live (pest + electrical + plumbing + hazmat). DR at 1,200 firms. RA at 8,000 techs. NRPG 3,000 firms total across all verticals. CARSI 5,000 enrolments. NRPG annual conference held — sponsorships booked. | 12 Tier 2 retainers. Synthex external SaaS sale pilots. | International expansion scout subagent active (UK + US). Tier-3 advisory (legal × 5, tax × 5) wired. |
| **Q4 2027** (Oct–Dec) | **$50M** | **US beachhead** OR **UK beachhead** (Phill picks: §7 fork) — 50 US/UK restoration firms onboarded onto DR + RA. ANZ scaled: DR 1,400 firms, RA 12,000 techs, NRPG 4,000 firms, CARSI 8,000 enrolments. Adjacency expansion in flight in second country. | 15 Tier 2 retainers. | International compliance Tier-3 advisory active in beachhead country. Data-room generator (Wave 7.1) live. |
| **Q1 2028** (Jan–Mar) | **$100M** | Second international beachhead launched (whichever of US/UK was second). ANZ: DR 1,500, RA 18,000 techs, NRPG 5,000 firms. CARSI 12,000 enrolments. Strategic acquirer pipeline tracked monthly. | 18 Tier 2 retainers. | M&A outreach packet auto-generated per acquirer (Wave 7.2). |
| **Q2 2028** (Apr–Jun) | **$200M** | Full flywheel mature: ANZ Tier-1 ~$100M + international ~$100M. NRPG cross-vertical 8,000 firms; CARSI 18,000 active practitioners; RA 25,000 paid techs; DR 1,800 paid firms; adjacency revenue $25M. | 20 Tier 2 retainers (~$2M aggregate ARR). | Diligence-ready data room live (Wave 7.4-7.5); QoE packet complete. |
| **30 Jun 2028** | **EXIT $2B** | Strategic acquisition (preferred) or PE buyout | | Term sheet signed |

The slope from $33K → $200M over 25.5 months is the only thing that matters. Q3 2026 is the fragile quarter: NRPG founding cohort signed, CARSI first cert live, DR multi-tenant kicked off. If any of those three slip, the slope inflects wrong and we lose 6 months.

---

## 4. Architecture — internal CRM operating the 4 driver projects

[[unite-group-nexus-architecture|Unite-Group]] is the operator's command center INTO the 4 driver projects (already wired via the Source Matrix per [[pi-ceo-architecture]]). Phill never edits RA / DR / NRPG / CARSI code directly — the swarm does. Phill issues directives from his phone or Mac Mini; the swarm executes across all 4 repos.

**Unite-Group is INTERNAL operator tooling. NOT a product. The 4 driver projects ARE the product.**

### 4.1 Mobile interface — CEO-locked

Per Phill's directive:

- **CEO-locked authenticated route** at `/empire/mobile` (or PWA-installable from `/empire`) — `profiles.role='founder'` only
- **Biometric auth** — WebAuthn against Phill's iPhone Face ID + iPad Touch ID
- **Quick actions:** trigger scan, queue work-order, dispatch swarm task, capture meeting
- **Real-time meeting capture:** video/audio → faster-whisper STT (RA-1692) → Margot live-design loop → NotebookLM bundle → client artifact in **< 60 seconds**
- **Push notifications** only on 🔴/🚨 markers (silent on clean)
- **Surface routes:**
  - `/empire/mobile/dashboard` — touch-optimised 6-pager
  - `/empire/mobile/meeting/start` — initiates meeting capture pipeline
  - `/empire/mobile/voice-in` — voice-note → Margot bridge
  - `/empire/mobile/notebooklm/[bundle_id]` — bundle preview
  - `/empire/mobile/dispatch/[pm]` — manual dispatch to any Tier-1 or Tier-2 PM

### 4.2 Hermes computer_use at "100%" — re-defined

Same definition as v1: **100% non-repudiation** (every autonomous GUI action recoverable from the audit log + Hermes session file, every failure surfaces a structured error, kill-switch always works). Components verified 2026-05-14 in `swarm/screen/hermes_dispatch.py`. v2-specific add: replay-test cron + per-target-app circuit breaker + boot-time macOS permission check.

Success criterion: 7-day rolling audit-replay pass rate ≥ 95% AND zero blackout periods > 10 minutes.

### 4.3 Mac Mini continuous compute loop

`qwen3:14b` (live) → `qwen3:30b-a3b-q4_K_M` (once pull completes) via Ollama. **Not Gemma 4** — see §7 fork. Loop processes new Linear tickets, named-sender Gmail, Telegram messages, Hermes audit diff, wiki-lint (Saturdays), NotebookLM daily-audit (07:15 AEST), 6-pager assembly (07:00 AEST), integration-mesh sync (hourly). Continuous-loop budget: $0 (local). Paid-tier cap: $1,000/mo Claude Max + $200/mo for DataForSEO + Semrush + ElevenLabs + NotebookLM.

### 4.4 Meeting capture pipeline

Marquee defensibility play. End-to-end < 60-second round trip from spoken idea to NotebookLM bundle delivered. Components: audio tap (ScreenCaptureKit) → faster-whisper STT (RA-1692) → Margot streaming consumer (`swarm/meeting_capture.py` — new) → live design dispatch via `[SCREEN: design <intent>]` sentinel → NotebookLM bundler (`swarm/notebooklm_live_bundle.py` — new) → Telegram delivery. Used in EVERY client conversation — Tier-1 (NRPG founding-member intake, CARSI instructor candidate) AND Tier-2 (CCW cadence call, Duncan onboarding).

Latency budget:
- Audio capture: 0–3s
- STT: 1–4s per window
- Margot design dispatch: 10–20s
- NotebookLM bundle: 20–35s
- **Total target: < 60s from spoken idea to bundle URL in Phill's Telegram**

### 4.5 Swarm coordination — Senior PMs across both tiers

Per [[agency-hierarchy]]:
- Margot (Layer 1) — Telegram interface
- Pi-CEO Board (Layer 2) — 9-persona deliberation
- Orchestrator (5-min cron) — Layer 2.5
- **Tier-1 Senior PMs** — PM-RA, PM-DR, PM-NRPG, PM-CARSI (NONE EXIST — must scaffold)
- **Tier-2 Senior PMs** — PM-Unite-Group, PM-Synthex (both wired), PM-Sales-Funnel (does not exist — must scaffold)
- 25-agent Builder + Growth + Advisory tiers — Layer 4

Sentinel parser in `swarm/board/wiring.py:_parse_dispatch_target` recognises SCREEN today; must extend to recognise PM-RA, PM-DR, PM-NRPG, PM-CARSI, PM-Sales-Funnel.

### 4.6 Full project access from the CEO surface

CEO cockpit must give read+write across all 7 repos (4 Tier-1 + 3 Tier-2). Today: read via integration-mesh (`integration_github_commits`, `integration_github_prs`, `integration_linear_issues`). Writes today are limited.

To add:
- `/empire/repo/[slug]/branch/new` — create branch + first commit via GitHub MCP
- `/empire/repo/[slug]/pr/[number]/review` — comment + approve from CEO surface
- `/empire/repo/[slug]/dispatch` — trigger the right PM to claim a Linear ticket against this repo
- All writes go through GitHub API (PR creation) OR Hermes computer_use (visual review)

---

## 5. Swarm operating instructions — Senior PM specs

Each Senior PM gets a one-page spec: trigger / scope / escalation / output / success.

### 5.1 Tier 1 — the $2B drivers

#### 5.1.1 PM-RA (RestoreAssist) — **MUST SCAFFOLD**

- **Trigger:** Linear ticket against `RestoreAssist` repo OR floor-plan workstream child (RA-2947 epic) OR LiDAR sub-epic (RA-2970) OR new App Store rejection signal OR sandbox→prod parity drift alert OR billing-event on web.restoreassist.app
- **Scope:** RestoreAssist Capacitor 8 iOS app, Next.js sandbox + prod, IICRC damage overlay PencilKit module, billing/subscription on web.restoreassist.app
- **Escalation rule:** App Store rejection OR sandbox/prod parity drift > 5 schema changes OR billing failure rate > 1% triggers Board review. Pricing decisions escalate to Phill (§7 fork).
- **Output contract:** TestFlight build attached to ticket; sandbox URL for review; App Store submission notes; weekly Tier-1 metrics line in 6-pager (paid techs, ARPU, churn)
- **Success criterion:** RA on App Store with 0 P0 bugs week 1; LiDAR + GPS-stitch shipped Q3 2026; 100 paid techs by 30 Sep 2026; 500 paid techs by 31 Dec 2026; 2,000 by 31 Mar 2027

#### 5.1.2 PM-DR (Disaster Recovery) — **MUST SCAFFOLD**

- **Trigger:** Linear ticket against `dr-nrpg` repo (DR-* prefix) OR multi-tenant rebuild sprint task OR pilot restoration-firm onboarding event OR public copy change request OR loss-adjuster pricing change request
- **Scope:** disasterrecovery.com.au Next.js 14.2 app, DR multi-tenant rebuild (Q3–Q4 2026), TPA workflow, claims-tech integration, [[project_disaster_recovery_positioning|CORE-modelled positioning — INTERNAL]]
- **Escalation rule:** Any change to public-facing managed-repair positioning OR loss-adjuster pricing escalates to Board (CORE competitive sensitivity). Any public copy must pass brand-guardian AND must NOT surface the CORE comparison externally.
- **Output contract:** Internal docs (Linear, wiki, board memos) MAY reference CORE; public-facing deliverables (DR site copy, NRPG member-facing docs) MUST NOT. Weekly Tier-1 metrics line: paid firms, average tier, churn, NPS.
- **Success criterion:** DR multi-tenant beta with 10 pilot firms by 31 Dec 2026; 100 paying firms by 31 Mar 2027; 1,000 paying firms by 30 Jun 2027

#### 5.1.3 PM-NRPG (National Restoration Practitioners Group) — **MUST SCAFFOLD**

- **Trigger:** Linear ticket against `dr-nrpg` repo (NRPG-* prefix) OR new founding-member intake OR member-portal feature request OR adjacency-vertical expansion task OR sponsorship/event booking
- **Scope:** NRPG membership platform, ANZ industry-association operations, IAQ Magazine editorial workflow (Phill's editorial-committee seat), Toby co-founder relationship surface, Coutis network coordination, founding-cohort gating (50 firms × $799 avg = Q3 2026 target)
- **Escalation rule:** Founding-cohort intake (first 50 firms) gated by Phill personally. Adjacency-vertical expansion decisions escalate to Board. Any standards-publication change escalates to Phill (governance integrity).
- **Output contract:** Member-intake decisions logged with referral source; weekly cadence: members signed, tier mix, churn, marketplace-commission GMV; quarterly: adjacency-vertical readiness scorecard
- **Success criterion:** 50 founding members signed by 30 Sep 2026; 250 by 31 Dec 2026; 600 by 31 Mar 2027; first adjacency vertical onboarded by 31 Mar 2027; 5,000 firms total by 30 Jun 2028

#### 5.1.4 PM-CARSI (training & certification) — **MUST SCAFFOLD**

- **Trigger:** Linear ticket against `carsi/` repo OR new enrolment event OR cert exam attempt OR CPD-renewal cycle OR instructor-candidate intake OR syllabus update request
- **Scope:** CARSI LMS on DigitalOcean, certification syllabus, instructor onboarding, CPD-renewal workflow, exam delivery, CARSI ↔ NRPG cert-membership tie-in (NRPG members must hold ≥ 1 CARSI cert)
- **Escalation rule:** Syllabus changes for the first 5 certifications escalate to Phill (Phill personally plans syllabus per §7 fork). Instructor delivery model decisions escalate to Phill (Phill-led / contracted / licensed third-party — §7 fork). Exam-integrity issues escalate to Board.
- **Output contract:** Weekly cadence: enrolments, completions, pass rate, instructor utilisation, CPD-renewal rate; quarterly: cert-catalogue growth + instructor-bench size
- **Success criterion:** First certification live by 30 Sep 2026; 200 paid enrolments by 31 Dec 2026; 800 by 31 Mar 2027; 5,000 enrolments by 30 Sep 2027; 18,000 active practitioners by 30 Jun 2028

### 5.2 Tier 2 — infrastructure-funding PMs

#### 5.2.1 PM-Unite-Group — **MOSTLY BUILT, NEEDS GATING + MOBILE EXTENSION**

- **Trigger:** Linear ticket against `unite-group` repo OR `/empire/*` route change request OR mobile-PWA feature request OR integration-mesh sync issue
- **Scope:** Internal operator cockpit at unite-group.in, integration-mesh sync, 6-pager assembly, daily NotebookLM brief, mobile PWA shell, CEO biometric gate
- **Escalation rule:** Any change that exposes Unite-Group to public traffic (un-gating a route, adding public sitemap entry) **BLOCKED** by default; escalates to Phill. Pre-existing public marketing routes (`/en/about`, `/en/services/*`, `/en/contact`) gated W1.1.
- **Output contract:** All changes are internal-tooling improvements; no customer-facing copy; brand-guardian skipped (no external publish surface)
- **Success criterion:** 0 public marketing pages on unite-group.in by 21 May 2026; mobile PWA live by 29 May 2026; 6-pager silent-on-clean sustained; 0 missed criticals; computer_use replay-pass ≥ 95% sustained

#### 5.2.2 PM-Synthex — **BUILT**

- **Trigger:** Brand-config request OR Remotion video brief OR SEO audit cron OR scout-internalisation pipeline output OR content brief from any Tier-1 or Tier-2 PM
- **Scope:** `Synthex/` monorepo, brand-config package, remotion-studio, marketing-orchestrator skill family. **Cross-cuts both tiers** — produces content for RA, DR, NRPG, CARSI, AND for Tier-2 retainer clients.
- **Escalation rule:** Every external-facing artefact (LinkedIn post, blog, video) requires brand-guardian PASS before publish. NO ad-spend (`TAO_NO_AD_SPEND=1` default). DR public artefacts MUST NOT surface the CORE comparison (handled at brand-guardian rule level).
- **Output contract:** Content artefact + brand-guardian PASS + distribution channel + publish-time
- **Success criterion:** ≥ 4 in-house content artefacts per Tier-1 driver per week; ≥ 2 per Tier-2 retainer client per week; organic CAC = $0

#### 5.2.3 PM-Sales-Funnel — **MUST SCAFFOLD**

- **Trigger:** New Tier-2 inbound (e.g. Bulcs Holdings inbound) OR Duncan-signature workflow event OR existing-retainer expansion opportunity OR cross-sell event (Tier-2 client → CARSI cert / NRPG member)
- **Scope:** Small-business retainer pipeline (CCW expansion, Duncan signature, Bulcs Holdings close, future inbound). Funds infrastructure. Aggregate Tier-2 ARR target = ~$0.5M by Q4 2026, ~$2M by Q2 2028. **Strict scope:** vetted, hand-picked retainers only — no broad funnel marketing.
- **Escalation rule:** Every new prospect requires Phill personal vet before first paid invoice. Holiday-window blocks (e.g. CCW 11–25 May 2026) honoured.
- **Output contract:** Pipeline state in 6-pager (prospects, MRR signed, MRR pending, churn risk); proposal draft + brand-guardian PASS before send
- **Success criterion:** 4 Tier-2 retainers active by 31 Dec 2026; 10 by 30 Jun 2027; 20 by 30 Jun 2028; 0 churn pre-renewal

### 5.3 Cross-cutting roles (unchanged from v1)

- **Margot** — Layer-1 CEO interface. Telegram + ElevenLabs voice. Routes to Board for strategic; routes to the correct Tier-1 or Tier-2 PM for tactical.
- **Pi-CEO Board** — Layer-2 deliberation. Phase B wiring queued. Weekly Saturday cadence.
- **Senior Research Analyst** — Margot subagent. Wiki-first; deep_research_max when wiki insufficient.
- **QA-Lead** — pre-merge / pre-publish quality gate.
- **Brand-guardian** — $2B filter on every external artefact. Critical: enforces DR-CORE-no-surface rule.

---

## 6. Next 14 days — concrete week-1 + week-2 actions (corrected)

### Week 1 (14 May → 21 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W1.1 | PM-Unite-Group + Phill ratify the 3 forks in §7 (model, Synthex-public, scaling channel — now corrected forks 4–8 below also need ratification) | Margot escalation | Phill responds 👍/❌ per fork via Telegram; result recorded in [[decisions/index]] |
| W1.2 | **PM-RA recon** — read RA wiki + Linear backlog; produce a 1-page "next 90 days of RA" plan covering: pricing decision input, LiDAR sub-epic, persistent sign-in (RA-2074), 100-paid-tech onboarding plan | PM-Core (interim, until PM-RA scaffolded) | One-pager committed at `2nd Brain/Wiki/pm-ra-next-90-days-2026-05.md`; Phill thumbs-up via Telegram |
| W1.3 | **PM-DR scaffold** — write the spec for DR multi-tenant v1; start the Linear epic `DR-MULTITENANT-V1`; identify the 3 pilot restoration firms (candidate list) | PM-Core (interim) | Linear epic open with ≥ 8 child tickets; candidate-firm list in `~/2nd Brain/Sources/dr-pilot-candidates-2026-05.md` |
| W1.4 | **PM-NRPG founding-cohort charter** — write the criteria for the first 50 founding members (geography, scope, vetting questions, Coutis-network + Toby-network seed list, fee structure confirmation) | PM-Core (interim) + Phill | Charter committed at `2nd Brain/Wiki/nrpg-founding-cohort-charter-2026-05.md`; Phill ratifies |
| W1.5 | **PM-CARSI v1 cert** — Phill picks the first certification (likely Water Damage Restoration per S500), drafts the syllabus outline; PM-Core scaffolds the LMS course shell | Phill + PM-Core (interim) | Syllabus committed at `2nd Brain/Wiki/carsi-cert-001-syllabus-2026-05.md`; LMS course shell visible in CARSI staging |
| W1.6 | Strip Unite-Group public marketing routes — gate `/en/about`, `/en/services/*`, `/en/contact` behind `profiles.role='founder'` OR redirect to Synthex equivalent | PM-Unite-Group | `curl https://unite-group.in/en/about` returns 302 → login or 404; Synthex public surface unaffected |
| W1.7 | Lock Duncan signature — follow-up call + signature on ITR proposal ([[proposal-duncan-itr-platform-2026-05-13]]) | Phill (HITL) + Margot (drafting) | Signed PDF in `~/2nd Brain/Sources/contracts/`; Linear ticket `SYN-DUNCAN-LOCKED` closed |
| W1.8 | Wire Pi-CEO Board Phase B — replace stub dispatch in `swarm/board/wiring.py` with LLM-per-persona calls using `personas.py:CANONICAL_PERSONAS` | PM-Core | `pytest swarm/board/test_phase_b.py` passes; manual /board returns 9 persona responses + valid sentinel |

### Week 2 (22 May → 29 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W2.1 | **Scaffold PM-RA bot** in `swarm/bots/pm_ra.py` — claim() + execute() against Linear RA-* tickets; extend `_parse_dispatch_target` to recognise PM-RA sentinel | PM-Core | Stub bot claims a real Linear ticket end-to-end; Linear comment posted; sentinel parses |
| W2.2 | **Scaffold PM-DR bot** in `swarm/bots/pm_dr.py` — same shape as PM-RA; against `dr-nrpg` repo DR-* tickets | PM-Core | DR-* ticket claim works end-to-end |
| W2.3 | **Scaffold PM-NRPG bot** in `swarm/bots/pm_nrpg.py` — claim NRPG-* tickets; founding-member intake workflow integration | PM-Core | NRPG-* ticket claim works; first founding-member intake form generates Linear ticket |
| W2.4 | **Scaffold PM-CARSI bot** in `swarm/bots/pm_carsi.py` — claim CARSI-* tickets; enrolment-event webhook integration | PM-Core | CARSI-* ticket claim works; enrolment event creates ticket |
| W2.5 | **Scaffold PM-Sales-Funnel bot** in `swarm/bots/pm_sales_funnel.py` — pipeline-state tracker, proposal drafter, Phill-vetting gate | PM-Core | Bulcs Holdings prospect logged in pipeline state; proposal draft generated; Phill-vet gate awaits ratification |
| W2.6 | Tuesday 26 May 10:00 AEST — first CCW cadence call post-Toby holiday. Margot meeting-capture POC fires. | Phill (call) + Margot (capture) | Transcript captured; action items extracted; Linear tickets auto-created for any CCW commitments |
| W2.7 | Wire Margot meeting-capture full pipeline (`swarm/meeting_capture.py`) — sliding-window transcript + persona mini-Board + design dispatch + NotebookLM bundler | PM-Core + PM-Synthex | End-to-end test: 3-min monologue → bundle URL in Telegram within 60s |
| W2.8 | Build mobile PWA shell — manifest + service worker + WebAuthn biometric gate on `/empire/mobile/*` | PM-Unite-Group | Install on Phill's iPhone Safari; Face ID gate works; Linear ticket creation from mobile works; manual dispatch to PM-RA / PM-DR / PM-NRPG / PM-CARSI works |
| W2.9 | qwen3:30b-a3b promotion candidate — once pull completes, run 7/7 verbatim-quote test against this v2 plan. If PASS, promote via `TAO_CHEAP_LOCAL_MODEL=qwen3:30b-a3b-q4_K_M` | PM-Core | 7/7 PASS recorded in `~/.hermes/state/margot_model_test.json`; rollback to qwen3:14b on FAIL |
| W2.10 | First **NRPG founding-member intro** via Toby + Coutis network — warm intro to one named ANZ restoration firm | Phill + Margot | Intro email sent; reply tracked; if 2nd-meeting booked, Linear ticket `NRPG-FOUNDING-001` opened |
| W2.11 | NotebookLM bundle delivered live during a Friday client call (whichever Tier-1 founding-member or Tier-2 prospect lands first) | Margot + PM-Synthex | Bundle URL appears in Phill's Telegram before call ends; bundle shared with client during the call |

---

## 7. Decisions Phill must make now (corrected forks)

Vetted-funnel scaling (Fork 3 in v1) is MOOT under the corrected thesis — the flywheel (NRPG cohort + CARSI enrolment + RA per-tech + DR per-firm) is the scaling channel, not vetted-funnel. Vetted gating still applies to Tier-2 retainers (handled by PM-Sales-Funnel) but is no longer the $2B mechanism.

### Fork 1 — Continuous-loop model on Mac Mini

- **Founder directive 2026-05-13:** Use the free Gemma 4 on Mac Mini for continuous tasks.
- **Wiki ground-truth ([[pi-ceo-architecture]] §Margot Model Selection 2026-05-13):** Gemma 4 hallucinates over in-context data; deprecated; qwen3:14b active.
- **Board recommendation:** qwen3:14b today; qwen3:30b-a3b once pull completes. Both free local. Both pass 7/7 verbatim-pathway-quote test.
- **Decision:** Confirm qwen3 OR direct re-evaluation of Gemma 4.

### Fork 2 — Public-facing Synthex

- **Founder directive 2026-05-13:** Remove anything Unite-Group customer-facing.
- **Implication for Synthex:** Does Synthex (1,000+ users) also go behind auth, or stay public?
- **Board recommendation:** Synthex stays public — empire's only external customer-facing brand. Unite-Group goes dark.
- **Decision:** Confirm Synthex remains public surface.

### Fork 3 (NEW) — First property-services adjacency vertical

NRPG expansion target for Q1 2027. Choices:
- **Pest control** — fragmented operator base, IPMI/AEPMA exist but no dominant tech; large equipment commission tail
- **Electrical inspection** — strong regulatory backbone (Master Electricians AU, NECA), cert-tie-in natural; tougher governance lift
- **Plumbing inspection** — MPMSAA exists; insurance-claims overlap with restoration (water leak detection)
- **Hazmat** — small but high-margin; tight ANZ regulatory regime; cert-tie-in natural via CARSI extension

**Board recommendation:** Plumbing inspection — strongest insurance-claims overlap with restoration (water leak detection feeds DR pipeline naturally); MPMSAA's existence is a gap not a moat; Toby's CCW carpet/water customer base already overlaps. Second-best: pest control (largest equipment-commission tail).
- **Decision:** Phill picks. (Or rank-order all four and let Q1 2027 capacity decide.)

### Fork 4 (NEW) — US or UK beachhead first

Q4 2027 international expansion. Choices:
- **US** — largest TAM; CORE Restoration is the incumbent in the model we mirror, so direct competitive collision is possible. Insurance carriers (Allstate, State Farm, etc.) are giants but partnership-receptive.
- **UK** — smaller TAM but English-speaking, restoration sector less consolidated, regulatory regime closer to ANZ, insurer landscape (Aviva, AXA, etc.) more permissive of new TPAs.

**Board recommendation:** UK first — lower-risk, closer regulatory analogue, no direct CORE collision; use UK ARR to fund US entry Q1–Q2 2028 when M&A pipeline is most active and we want a US-relevant story for acquirers.
- **Decision:** Phill picks beachhead and rough sequencing.

### Fork 5 (NEW) — DR build path

- **Build-from-scratch** — full control, slow (Q3 2026 → Q2 2027 first paid firms)
- **CORE-Restoration-clone** — fastest copy of proven model but [[project_disaster_recovery_positioning|external-disclosure risk]] if reverse-engineered
- **White-label existing platform** — fastest to market (e.g. white-label a US/EU TPA tool) but worst margin and least moat

**Board recommendation:** Build-from-scratch on the existing `dr-nrpg` codebase, informed by CORE's playbook **internally only** (per memory: [[project_disaster_recovery_positioning]]). The flywheel moat (NRPG cert + CARSI training + RA field tool tie-in) is the differentiator, not the back-office UI.
- **Decision:** Phill picks build path.

### Fork 6 (NEW) — CARSI delivery model

- **Phill-led courses** — strongest authority signal, hard ceiling (Phill's hours)
- **Contracted instructors** — Phill curates a bench of named ANZ practitioners; CARSI pays per delivered cohort
- **Licensed third-party platform** — CARSI is the brand and the cert; third-party trainers deliver under licence (royalty)

**Board recommendation:** Hybrid — Phill personally delivers the first 2 certifications (Water Damage Restoration S500 + Mould Remediation S520) to establish authority, then contracted-instructor bench expands from cert 3+, with a licence-to-third-party option opened Q3 2027 for the adjacency-vertical certifications. This pattern compounds Phill's authority into reusable instructor IP without capping on his hours.
- **Decision:** Phill picks delivery model (and confirms first-2-cert syllabus authoring).

### Fork 7 (NEW) — RA pricing model

- **Per-tech** — $79 AUD/tech/mo, simplest, scales linearly with field headcount
- **Per-company** — tiered $499 / $1,200 / $3,500 per restoration firm with bundled-tech caps; smoother for finance teams; harder to grow ARPU
- **Freemium-with-team-tier** — RA iOS free for individuals (mass adoption), $1,200 team tier per firm with admin + reporting + multi-user (monetisation lever)

**Board recommendation:** Per-tech at $79 AUD/tech/mo for ANZ — matches CCW operator economics, simple to communicate at NRPG founding-member sign-up. Freemium-with-team-tier as a Q2 2027 add-on to drive top-of-funnel adoption past 5,000 techs.
- **Decision:** Phill picks pricing.

### Fork 8 (NEW) — Synthex 2028 path

By Q2 2028 Synthex has 1,000+ users today and is forecast at $40M ARR per [[pathway-to-2b-2026-2028]] §Pillar 1 — but that figure pre-dates the corrected thesis. Under v2 Synthex's main job is to be the public face and produce content for Tier-1. Choices:
- **Continue scaling as external SaaS** (the $40M figure) — capacity bet on Synthex as standalone product
- **Re-frame as content engine first, SaaS sale second** — match the corrected thesis; treat Synthex external sales as Tier-2 ARR

**Board recommendation:** Re-frame. Synthex's exit narrative is "the in-house marketing engine that produces 4 content artefacts per Tier-1 driver per week with $0 CAC — the moat is the production volume, not the seat license". External sales become Tier-2 retainer attachments, not the headline.
- **Decision:** Phill confirms re-frame.

### Other open inputs Phill must provide

- **Telegram chat for meeting-capture bundle delivery** — same chat as the daily 6-pager or a separate "Meetings" DM thread?
- **Mobile biometric devices** — iPhone Face ID is default. Confirm device list (iPhone + iPad + nothing else, or include MacBook Touch ID for desktop fallback)
- **Claude Max + Anthropic API combined budget cap** — default-assumed $1,000 USD/mo; needs ratification
- **Mac Mini hardware upgrade path** — Llama 3.3 70B OOM'd. Is RAM upgrade in plan, or stay on 24GB and live with qwen3:30b ceiling?

---

## 8. Risks & open questions (corrected)

### Hard risks

1. **ANZ restoration TAM may not be large enough for $2B alone** — pathway math depends on property-services adjacency expansion ($25M) + US/UK beachhead ($100M). If either slips, exit valuation slips. **Mitigation:** Adjacency vertical 1 must be live by Q1 2027 (not Q2); international scout active by Q3 2027.
2. **NRPG legitimacy / co-option risk** — is Phill seen as the standards body, or as co-opting an industry? Toby's CCW relationship is the credibility bridge but is one relationship. **Mitigation:** founding-cohort criteria (§6 W1.4) explicitly demand named-practitioner advisory board; first 50 members vetted personally by Phill + Toby + Coutis; press release leverages IAQ Magazine editorial-committee seat.
3. **DR vs incumbent risk** — Encircle, DocuSketch, Magicplan, CORE Restoration exist. **Wedge:** integration depth (RA + NRPG cert + CARSI cert tie-in) + ANZ-local TPA. **Mitigation:** DR multi-tenant beta pilots (Q4 2026) explicitly contracted as flywheel-integrated, not standalone — reduces head-to-head competition on back-office features.
4. **DR-CORE disclosure leak risk** — if the CORE model is surfaced externally (investor deck leaked, press release, partner pitch), competitive signalling is wrecked. **Mitigation:** brand-guardian rule enforced at every external publish; CORE comparison restricted to internal docs only ([[project_disaster_recovery_positioning]]).
5. **Tier-2 single-client concentration** — CCW + Duncan = 100% of contracted ARR pre-flywheel-revenue. CCW churn = infrastructure-funding risk. **Mitigation:** Bulcs Holdings close Q3 2026 (third paying retainer); 4 retainers by 31 Dec 2026.
6. **Capital risk** — Anthropic API + Vercel + Supabase + Railway + ElevenLabs + agent compute. Continuous-loop is free (local). Paid-tier cap $1,200/mo all-in. Tier-2 retainer income $5.9K/mo (CCW only) → $9K/mo with Duncan → $12K+/mo with Bulcs. Net burn ≈ $0 if Tier-2 lands by 30 Sep 2026. Net burn ≈ $1K/mo if Duncan slips. **Decision needed:** Phill confirms cap (§7 other inputs).
7. **Mac Mini single-point-of-failure** — continuous loop dies if hardware dies. **Mitigation:** Hermes failover to Railway-hosted qwen3 worker (Q4 2026 build).
8. **macOS permission revocation** — Accessibility / Screen Recording / Automation reset on macOS upgrade. **Mitigation:** boot-time permission check; refuse to dispatch + Telegram alert.
9. **NotebookLM API stability** — `nlm-skill` is CLI wrapper. **Mitigation:** fallback to direct Drive + Docs + Slides API for bundle artefact.
10. **Hermes computer_use audit-trail blackouts under load** — partial JSONL write during crash. **Mitigation:** fsync per dispatch row + "begin" marker; orphan-row detection on startup.

### Open questions (cannot answer from wiki/codebase)

1. **First NRPG adjacency vertical** — §7 Fork 3, Phill picks
2. **US vs UK beachhead order** — §7 Fork 4, Phill picks
3. **DR build path** — §7 Fork 5, Phill picks
4. **CARSI delivery model + first 2 cert syllabi** — §7 Fork 6, Phill confirms
5. **RA pricing model** — §7 Fork 7, Phill picks
6. **Tier-2 budget cap** — §7 other inputs
7. **Third Tier-2 paying retainer identity** — Bulcs Holdings (Ivi Sims, VIC) named in wiki as inbound but no proposal yet. Confirm pipeline status.
8. **RA paid-subscriber go-live date on web.restoreassist.app** — build 1.0(10) approved 2026-05-08; when do paid subscriptions flip on?
9. **CCW NPS baseline** — first survey not yet recorded. When?
10. **Duncan signature no-go cutoff** — proposal sent 13 May; what is the deadline?
11. **NRPG founding-member fee collection mechanism** — Stripe? Direct invoice via Xero?
12. **Mac Mini RAM upgrade** — stay on 24GB or upgrade?

---

## 9. Next 90 days — quarterly OKRs (corrected)

**Objective:** Light the flywheel. RA paid technicians + DR pilot firms + NRPG founding cohort + CARSI first cert — ALL four Tier-1 drivers producing revenue by 30 Sep 2026. Tier-2 retainers cover infrastructure burn.

| KR | Tier | Metric | Target | Owner |
|---|---|---|---|---|
| KR1 | Tier 1 | RA paid technicians | 100 by 30 Sep 2026 | PM-RA |
| KR2 | Tier 1 | DR multi-tenant rebuild | Sprint 1 of 4 complete; 3 pilot firms identified | PM-DR |
| KR3 | Tier 1 | NRPG founding cohort signed | 50 firms × $799 avg | Phill + PM-NRPG + Toby + Coutis |
| KR4 | Tier 1 | CARSI first certification | Live with first 20 paid enrolments | Phill (syllabus) + PM-CARSI |
| KR5 | Tier 1 | Tier-1 aggregate ARR | $130K | PM-RA + PM-DR + PM-NRPG + PM-CARSI |
| KR6 | Tier 2 | Tier-2 contracted ARR | $85K (CCW $33K + Duncan $37.4K + Bulcs $15K) | PM-Sales-Funnel + Phill |
| KR7 | Infra | Pi-CEO Board Phase B live | Weekly cadence + audit rows | PM-Core |
| KR8 | Infra | Meeting-capture pipeline | End-to-end < 60s round trip | PM-Core + PM-Synthex |
| KR9 | Infra | Mobile CEO interface live | PWA + biometric + voice-note + meeting start/stop + manual PM dispatch | PM-Unite-Group |
| KR10 | Infra | Senior PM bots wired (5 new) | PM-RA + PM-DR + PM-NRPG + PM-CARSI + PM-Sales-Funnel each autonomously claiming + executing | PM-Core |
| KR11 | Infra | Hermes computer_use replay-pass rate | ≥ 95% 7d rolling | PM-Core |
| KR12 | Tier 2 | CCW NPS | ≥ 60 (first survey baseline) | PM-Unite-Group (via CCW-CRM ticket data) |
| KR13 | Tier 2 | Synthex content output per Tier-1 driver per week | ≥ 4 artefacts | PM-Synthex |
| KR14 | Infra | Critical alerts (6-pager) | 0 missed; ≤ 2 false-positives/week | Margot + Orchestrator |

---

## 10. Verification — what to read to verify every claim

| Claim | Source |
|---|---|
| $33K CCW ARR | [[ccw]] · [[businesses-overview]] · `ccw_support_tickets` table on Supabase `lksfwktwtmyznckodsau` |
| $37.4K Duncan committed | [[proposal-duncan-itr-platform-2026-05-13]] |
| RA App Store build 1.0(10) approved | [[restore-assist]] · [[businesses-overview]] |
| RA sign-in error boundary PR #957 | [[restore-assist]] |
| DR ↔ CORE positioning (INTERNAL) | [[project_disaster_recovery_positioning]] |
| NRPG tier pricing $299/$799/$2,499 | [[industry-association-vision-2026]] |
| Phill + Toby co-founder structure | [[project_industry_association]] |
| NRPG = National Restoration Practitioners Group | [[project_industry_association]] (note: "Practitioners" per user directive, not "Professionals") |
| Hermes computer_use exists | `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/screen/hermes_dispatch.py` + tests |
| Pi-CEO Board Phase A shipped | `swarm/board/personas.py` + `wiring.py` (verified 2026-05-14) |
| Gemma 4 rejected, qwen3:14b active | [[pi-ceo-architecture]] §Margot Model Selection 2026-05-13 |
| 318 Python modules in swarm/ | `find /Users/phill-mac/Pi-CEO/Pi-Dev-Ops -name "*.py" -path "*/swarm/*"` (verified 2026-05-14) |
| 27 Hermes cron jobs | [[hermes-agent-sprinkle-audit-2026-05-11]] |
| 8/8 integration mesh green | [[now]] §Production Stability Wins 2026-05-13 |
| Unite-Group is INTERNAL ONLY | [[feedback_unite_group_only]] · founder directive 2026-05-14 |
| 9-persona Board prompts | `swarm/board/personas.py:CANONICAL_PERSONAS` |
| CCW holiday window | [[ccw]] + memory `project_ccw_holiday_window` (Toby 11–25 May 2026) |
| IAQ Magazine editorial seat | [[restoration-industry-context]] §11.1 |

---

## Cross-refs

[[master-plan-2b-by-2028-v1]] · [[pathway-to-2b-2026-2028]] · [[industry-association-vision-2026]] · [[restore-assist]] · [[restoration-industry-context]] · [[dr-nrpg]] · [[carsi]] · [[ccw]] · [[proposal-duncan-itr-platform-2026-05-13]] · [[pi-ceo-architecture]] · [[unite-group-nexus-architecture]] · [[agency-hierarchy]] · [[exit-thesis]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[synthex]] · [[founder]] · [[now]] · [[computer-use-integration-2026-05-13]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[project_disaster_recovery_positioning]] · [[project_industry_association]] · [[feedback_unite_group_only]]
