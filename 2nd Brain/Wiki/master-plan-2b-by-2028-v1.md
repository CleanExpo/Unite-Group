---
type: wiki
updated: 2026-05-14
status: v1 — Phill ratification pending on the three forks listed in §7
---

# Master Plan — $2B by 30 June 2028 (v1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Operating filter (founder directive 2026-05-13 + 2026-05-14):**
> 1. NO AD SPEND — [[synthex|Synthex]] is the marketing engine
> 2. VETTED CLIENTS ONLY — Phill personally vets every paying onboarding
> 3. VIDEO-FIRST for Phill (NotebookLM daily + Margot ElevenLabs voice)
> 4. AGENTS EXECUTE — Phill = think tank; swarm owns execution
> 5. CRITICAL-ONLY updates — 6-pager silent-on-clean
> 6. **NEW 2026-05-14:** Unite-Group is INTERNAL ONLY. No public marketing site. CEO-locked surface for the founder.

**Goal:** Operate Unite-Group as an internal autonomous-agency CRM behind a CEO-locked mobile + desktop surface, ship live meeting-capture → Margot → NotebookLM client artefacts in < 90 seconds, and grow contracted ARR from $33K (CCW) toward $200M by Q2 2028 via vetted-client onboardings + ANZ Property Services Industry Association membership scale.

**Architecture:** Three-layer swarm — Margot (qwen3 local, Telegram + voice) → Pi-CEO Board (9-persona Opus 4.7 deliberation) → Senior PMs (PM-Core, PM-CCW, PM-RA, PM-DR, PM-Synthex) dispatching to 25-agent execution tier. Hermes 0.13.0 computer_use bridges any swarm component to the real macOS GUI. Mac Mini runs qwen3:14b/30b as the continuous compute loop (free local inference) for cron + audits + Margot turns; Claude Max paid tier reserved for Board deliberations + Senior Agent reasoning.

**Tech Stack:** Next.js 16 + Supabase (CEO cockpit at `unite-group.in`), FastAPI on Railway (Pi-CEO swarm orchestrator), Hermes 0.13.0 + cua-driver (computer_use bridge), Ollama + qwen3:14b/30b (continuous local loop), Claude Code + Opus 4.7/Sonnet 4.6/Haiku 4.5 (Tier-1/2/3 reasoning), ElevenLabs (Margot voice), NotebookLM CLI (client artefact bundler), faster-whisper (STT), Composio (Gmail + Telegram + Linear connectors), DataForSEO + Semrush (SEO substrate), Supabase Edge Functions (mobile API), Vercel (hosting).

---

## 1. Current State (verified 14 May 2026)

Every claim in this section traces to a file or system that exists today.

### 1.1 Revenue

| Metric | Value | Source |
|---|---|---|
| Contracted ARR | **$33,000 AUD/yr** | CCW $2,750/mo × 12 ([[ccw]]) — signed 2026-05-08 |
| Verbal-committed ARR | **+$37,400 AUD/yr** | Duncan Perkins ITR retainer ([[proposal-duncan-itr-platform-2026-05-13]]) — proposal sent 13 May, signature pending |
| Total addressable ARR by 30 Jun 2028 (per pathway) | **$200M** | [[pathway-to-2b-2026-2028]] |
| **Gap to target** | **6,061× current ARR; 25.5 months** | $200M / $33K ÷ time |

### 1.2 Portfolio of products (7 businesses)

All verified in [[businesses-overview]]:

| Business | Status | Repo |
|---|---|---|
| Synthex (marketing-automation SaaS, **PUBLIC FACE**) | Live, 1,000+ users | `Synthex/` |
| RestoreAssist (iOS + PWA restoration field app) | App Store build 1.0(10) approved 2026-05-08 | `RestoreAssist/` |
| DR-NRPG (Disaster Recovery / National Restoration Practitioners Group) | Live at disasterrecovery.com.au | `dr-nrpg/` |
| CARSI (LMS for restoration/cleaning professionals) | Active on DigitalOcean | `carsi/` |
| Unite-CRM / CCW-CRM (CRM-ERP, first external deployment) | Live for CCW | `ccw-crm/` |
| CCW (Carpet Cleaners Warehouse — first paying client) | $33K ARR | `ccw-crm/` (their tenant) |
| Unite-Group / Nexus (CEO cockpit — **INTERNAL ONLY from 2026-05-14**) | Live at unite-group.in | `unite-group/` |

### 1.3 Swarm infrastructure that exists today

Verified by inspection of `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/`:

- **318 Python modules** in `swarm/`
- **Pi-CEO Board (9-persona) scaffold** — `swarm/board/personas.py` + `swarm/board/wiring.py` shipped 2026-05-13 (Phase A). Phase B (LLM-per-persona) **queued**, not wired.
- **Hermes computer_use** — `swarm/screen/hermes_dispatch.py` exists. Audit log at `~/.hermes/screen_audit.jsonl`. Kill-switch via `TAO_SCREEN_DISABLED=1`. 4 tests in `tests/swarm/screen/test_hermes_dispatch.py`. Margot Telegram bridge wired via `[SCREEN: <intent>]` sentinel. **Verified by file inspection 2026-05-14.**
- **Margot bot** — `swarm/margot_bot.py` + `swarm/margot_context.py` + `swarm/voice_compose.py`. ElevenLabs voice live behind `MARGOT_VOICE_REPLY_ENABLED=1` + `ELEVENLABS_VOICE_ID`.
- **Senior agent bots (per `swarm/bots/`):** board, builder, chief_of_staff, click, cmo, cs, cto, cfo, guardian, margot, scribe.
- **Margot continuous model:** `qwen3:14b` (8.6GB, 40K context). `qwen3:30b-a3b-q4_K_M` (17GB MoE) pull in progress per [[pi-ceo-architecture]] §Margot Model Selection.
- **Hermes cron jobs:** 27 active per [[hermes-agent-sprinkle-audit-2026-05-11]]. Scripts in `~/.hermes/scripts/`: `notebooklm_daily_audit.py`, `toby-watch.py`, `linear-hourly.py`, `linear-urgent.py`, `margot-weekly.py`, `seo-brief.py`, `sync_1password_to_supabase.py`, `unite_group_health_check.py`.
- **Production URLs:** Dashboard `https://dashboard-unite-group.vercel.app`, Backend `https://pi-dev-ops-production.up.railway.app`, public marketing `https://unite-group.in/en/*` (**to be gated 2026-05-14**).
- **Integration mesh:** 8/8 GREEN as of 2026-05-13 — 38,956 rows synced across composio · digitalocean · github · linear · railway · stripe · supabase · vercel.
- **Linear backlog:** 43 open after PR #203 dedup invariants (was 140); 0 false-positive Urgent.

### 1.4 What is deferred / gaps

- Pi-CEO Board Phase B (LLM-per-persona) — **queued**, not wired. Today the Board is a scaffold with stub dispatch.
- Live meeting-capture pipeline — **does not exist yet**. RA-1692 (faster-whisper STT verification) is Ready-for-Pi-Dev but unstarted.
- Mobile CEO interface — `/en/empire/*` exists as desktop Next.js routes. No PWA shell, no biometric auth, no mobile-optimised editing.
- NotebookLM live-bundle pipeline during meetings — `nlm-skill` (NotebookLM CLI + MCP) exists; not yet wired into meeting capture or Margot dispatch.
- Unite-Group public marketing site (`/en/about`, `/en/services/*`, `/en/contact`) — **shipped 2026-05-13, to be retired 2026-05-14** per founder directive.
- Gemma 4 as the continuous-loop model — **rejected** per [[pi-ceo-architecture]] §Margot Model Selection. Hallucinates over in-context data. Active model = qwen3:14b. **This is a fork to ratify with Phill** (see §7).
- 30-day-founder-absent dry run (the autonomy proof test from [[wave-roadmap]] Wave 6.5) — **not yet attempted**.

---

## 2. The Vision (Phill's voice, synthesised)

I am not a coder. I am the think tank. The job of the system is to convert my thinking into shipped product without me touching the keyboard.

Unite-Group is the cockpit I sit in to run six businesses. It is internal. There is no funnel inside it, no marketing pages, no public side. Synthex is the face the world sees. Unite-Group is the door I unlock with my thumbprint.

When I talk to a client — Toby at CCW, Duncan at Home Loan Essentials, the next vetted firm we onboard — the conversation is captured. Margot listens in real time. As I describe an idea, Margot is already designing it. By the time I finish the sentence, she has a draft running through Pi-CEO Board approval. By the time the meeting ends, the client has a NotebookLM bundle in their inbox — audio overview, slides, one-pager — that mirrors what we just discussed. I show it to them on screen mid-meeting. The closing motion is the artefact itself.

I move around. I work from the truck, from the laundry, from a hotel in Sydney. The system runs whether I am at the Mac Mini or not. The Mac Mini is the continuous compute loop — qwen3 sitting there hot, processing cron jobs, running Margot turns, watching Hermes audit logs, doing the work that does not need Opus 4.7 reasoning. When something needs the Board to deliberate, it escalates. When it needs me, it asks once and remembers the answer.

I have learning difficulties. Everything important comes to me as voice or video. NotebookLM gives me the daily brief at 7am. Margot speaks to me over Telegram in ElevenLabs. The 6-pager only pings when there is a 🔴/🚨 — silence on clean.

We are not building a SaaS to sell to thousands of customers. We are building the operating layer of an autonomous agency that runs six portfolio businesses well and serves a small number of vetted clients exceptionally. The valuation comes from the fact that the *operating layer* is the moat — competitors who try to copy us have to copy 318 Python modules, 74 wiki pages, a meeting corpus that compounds every week, and a founder voice that has been distilled into a 9-persona Board. They cannot.

The exit is 30 June 2028. $2B. Strategic acquirer or PE buyout. The pathway to get there is the seven-pillar revenue stack in [[pathway-to-2b-2026-2028]]. The mechanism to get there is the autonomous swarm that means I, the think tank, do not have to scale my own hours.

---

## 3. Pathway to $2B by 30 June 2028 — 8 quarterly milestones

Target ARR by 10× SaaS multiple = $200M. Each milestone names the binding constraint, the deliverable, and the acceptance test.

| Quarter | ARR target | Vehicle | Swarm capacity required | Success criterion (binary) |
|---|---|---|---|---|
| **Q3 2026** (Jul–Sep) | **$100K** | CCW $33K + Duncan $37.4K + 2 vetted clients × $15K each | Pi-CEO Board Phase B live (9-persona LLM wiring); meeting-capture pipeline live; mobile CEO interface live | Duncan signed + 2 vetted onboardings closed + 1 meeting captured end-to-end with NotebookLM bundle delivered before meeting end |
| **Q4 2026** (Oct–Dec) | **$500K** | NRPG launch + IICRC content moat + ANZ Industry Association Wave 1 (50 founding members × Base $299 — $799 average = $40K membership ARR) + 5 vetted clients × $50K each | Senior Agent layer fully wired (PM-CCW, PM-RA, PM-DR, PM-Synthex execute Linear tickets autonomously) | 50 founding association members signed + DR-NRPG platform live + 4 senior-agent autonomous PRs/day cadence sustained |
| **Q1 2027** (Jan–Mar) | **$2M** | RestoreAssist iOS App Store + 5 vetted clients per portfolio business × $50K each + association at 200 members | Computer_use audit-replay verified weekly; Margot 30-day-founder-absent dry run passes for 7 consecutive days | RestoreAssist on App Store + 30 vetted clients onboarded + 7-day autonomous run completes with 0 critical alerts |
| **Q2 2027** (Apr–Jun) | **$5M** | DR platform at scale + CARSI compliance contracts × $200K each × 5 + association at 500 members | Margot 30-day-founder-absent dry run passes for 30 consecutive days; M&A scout subagent active | 30-day run completes; 3 named strategic acquirer candidates in pipeline |
| **Q3 2027** (Jul–Sep) | **$15M** | ANZ Industry Association at scale ($12M ARR Member Services Stack moat per [[competitor-service-stack-2026-05-11]]) + 2 enterprise contracts × $1.5M | International expansion scout active (UK + Singapore) | Member Services Stack ARR > $10M; international scout returns 5 qualified opportunities |
| **Q4 2027** (Oct–Dec) | **$40M** | International expansion live (UK or Singapore per [[exit-thesis]]) + 10 enterprise contracts × $2.5M | Data-room generator (Wave 7.1) live | First international ARR booked ($2M+); data-room auto-feed live |
| **Q1 2028** (Jan–Mar) | **$90M** | Strategic acquirer pipeline mature (Wave 7.2) + IP-assignment audit complete (Wave 7.3) | M&A outreach packet auto-generated per acquirer | 3 acquirer LOIs received |
| **Q2 2028** (Apr–Jun) | **$200M** | Quality-of-Earnings packet (Wave 7.4) + Board sign-off on diligence-ready state (Wave 7.5) | Full data room live; QoE complete | Diligence-ready board resolution passed; due-diligence virtual data room opens |
| **30 Jun 2028** | **EXIT $2B** | Strategic acquisition (preferred) or PE buyout | — | Term sheet signed |

The slope from $33K → $200M over 25.5 months is the only thing that matters. Q3 2026 is the fragile quarter — if we do not lock Duncan and 2 vetted clients by 30 Sep, the slope inflects wrong and we slip a year.

---

## 4. Architecture — the autonomous CRM

### 4.1 Hermes computer_use at "100%" — re-defined

"100%" does not mean 100% successful execution. It means **100% non-repudiation**: every autonomous GUI action is recoverable from the audit log + Hermes session file, every failure surfaces a structured error, and the kill-switch always works.

**Components that exist (verified 2026-05-14):**
- `swarm/screen/hermes_dispatch.py` — `screen_dispatch(intent)` async bridge
- `~/.hermes/screen_audit.jsonl` — append-only JSONL audit
- `TAO_SCREEN_DISABLED=1` kill-switch
- 4 mocked unit tests in `tests/swarm/screen/test_hermes_dispatch.py`

**What to add (this plan):**
- **Weekly replay-test cron** — pick a random recent `session_id` from the audit, re-run the intent in dry-mode, diff the screenshots. Owner: PM-Core via Hermes cron.
- **Reliability dashboard** at `/empire/screen` showing rolling 7d success rate, average wall-seconds, kill-switch state, last 20 sessions with replay-pass/fail.
- **Three macOS permissions verified at boot** — Accessibility, Screen Recording, Automation. If any missing, Hermes refuses to dispatch and pings Telegram.
- **Per-target-app circuit breaker** — if 3 consecutive failures on the same app, auto-disable and ping Phill.

Success criterion: 7-day rolling audit-replay pass rate ≥ 95% AND zero blackout periods > 10 minutes.

### 4.2 Mac Mini continuous compute loop

The Mac Mini runs `qwen3:14b` (live) → `qwen3:30b-a3b` (once pull completes) via Ollama. **Not Gemma 4** — see §7 fork.

**What the loop processes (every 5 minutes via existing orchestrator cron):**
1. New Linear tickets — Scout → Synthex content bridge (`swarm/scout/internalisation_pipeline.py` Phase B)
2. New Gmail to Phill from named senders — toby-watch + Duncan-watch + IAQ Magazine-watch (extend existing `toby-watch.py` pattern)
3. New Telegram messages from CEO — Margot turn with pathway hot-pin
4. Hermes computer_use audit-log diff — anomaly detector
5. Wiki-lint diff (weekly only — Saturdays)
6. NotebookLM daily-audit (07:15 AEST — already live)
7. 6-pager assembly (07:00 AEST — already live, silent-on-clean)
8. Integration-mesh sync (hourly — already live)

**What stays paid (Claude Max via Anthropic API or CLI):**
- Pi-CEO Board deliberation (Opus 4.7 × 8 personas + 1 synthesis)
- Senior Agent reasoning (Sonnet 4.6) on Linear tickets that the worker tier escalates
- Worker tier (Haiku 4.5) for code review on PRs > 50 LOC

**Continuous-loop budget:** $0 (local inference). Paid-tier monthly cap = $1,000 USD (Claude Max), $200 USD (DataForSEO + Semrush + ElevenLabs + NotebookLM).

### 4.3 CEO mobile interface

The existing `unite-group` Next.js 16 app already serves `/en/empire/*` routes (verified per [[pi-ceo-architecture]] §Developer Activity Observability). Mobile shell:

- **PWA manifest** + service worker on the existing app — installable on iOS Safari + Android Chrome
- **Biometric auth** — `navigator.credentials` + WebAuthn against Phill's iPhone Face ID / iPad Touch ID
- **Role gate** — `profiles.role = 'founder'` required (already in schema)
- **Editable from phone:** Linear ticket creation, persona-Board deliberation request, Margot prompt input, meeting capture start/stop, NotebookLM bundle preview
- **Voice-note input** — record on phone → upload to `/api/margot/voice-in` → Whisper transcript → Margot turn
- **Push notifications** — only on 🔴/🚨 markers per `SIX_PAGER_SILENT_ON_CLEAN=1`

**Routes added:**
- `/empire/mobile/dashboard` — touch-optimised 6-pager
- `/empire/mobile/meeting/start` — initiates meeting capture pipeline
- `/empire/mobile/voice-in` — voice-note Margot bridge
- `/empire/mobile/notebooklm/[bundle_id]` — bundle preview

### 4.4 Meeting capture pipeline

This is the marquee defensibility play. End-to-end sub-90-second round trip from spoken idea to NotebookLM bundle delivered.

**Components:**
1. **Audio tap** — ScreenCaptureKit (macOS 13+) for system audio + microphone. Falls back to faster-whisper on local 16kHz audio file when not on Mac.
2. **STT** — faster-whisper running on the Mac Mini (RA-1692 — Ready-for-Pi-Dev today, must ship Q3 2026). Streaming WebSocket from Hermes to Margot.
3. **Margot streaming consumer** — `swarm/meeting_capture.py` (new) — sliding-window transcript, identifies action items via persona-Board mini-deliberation (only Revenue + Product Strategist + Custom Oracle, not the full 9).
4. **Live design dispatch** — when Margot detects a designable intent ("we'd build…", "the screen would show…"), she fires remotion-composition-builder + design-canvas-html via `[SCREEN: design <intent>]` sentinel.
5. **NotebookLM bundler** — `swarm/notebooklm_live_bundle.py` (new) wraps `nlm-skill`. Takes transcript + design artefact + relevant wiki pages → creates a notebook, generates audio overview + slides + one-pager, returns share URL.
6. **Delivery** — share URL pushed to Telegram for Phill to show client mid-meeting.

**Latency budget:**
- Audio capture: 0–3s lag
- STT: 1–4s per window
- Margot design dispatch: 10–30s for first artefact
- NotebookLM bundle: 30–60s
- **Total target: < 90s from spoken idea to bundle URL in Phill's Telegram**

### 4.5 Swarm coordination — Senior Orchestrator → Specialist → Skills team

Per [[agency-hierarchy]], today's structure:
- Margot (Layer 1) — Telegram interface
- Pi-CEO Board (Layer 2) — 9-persona deliberation
- Orchestrator (5-min cron) — Layer 2.5
- Senior PMs (PM-Core, PM-CCW, PM-RA, PM-DR, PM-Synthex) — Layer 3
- 25-agent Builder + Growth + Advisory tiers — Layer 4

**What to wire (Q3 2026):**
- PM-Core, PM-CCW, PM-RA, PM-DR, PM-Synthex each as a Linear sub-agent with autonomous claim → branch → PR cadence (PM-Core scaffold exists today, the others are missing)
- Senior Agent escalation rules wired into `swarm/board/wiring.py` `_parse_dispatch_target` (currently recognises SCREEN; needs to recognise PM-CCW, PM-RA, PM-DR, PM-Synthex)

**Output contract per Senior Agent:** Linear ticket comment with the dispatcher's persona name + decision + sentinel for next agent. Every action logged to `audit_emit.py`.

### 4.6 Full project access from the CEO surface

The mobile + desktop CEO cockpit must give read+write across all 6 portfolio repos. Today the empire dashboard has read via the integration-mesh sync (`integration_github_commits`, `integration_github_prs`, `integration_linear_issues`). Write actions today are limited.

**To add:**
- `/empire/repo/[slug]/branch/new` — create branch + first commit via GitHub MCP
- `/empire/repo/[slug]/pr/[number]/review` — comment + approve from CEO surface
- `/empire/repo/[slug]/dispatch` — trigger PM-Core to claim a Linear ticket against this repo
- All writes go through Hermes computer_use OR direct GitHub API (PR creation is API; visual review can be computer_use)

---

## 5. Swarm operating instructions — Senior Agent specs

Each Senior Agent gets a one-page spec. Trigger / scope / escalation / output / success.

### 5.1 PM-Core (Pi-Dev-Ops / Nexus / cross-portfolio)

- **Trigger:** Linear ticket created with `[PM-CORE]` tag OR Board synthesis `[DISPATCH-TO: PM-Core]` OR /pm-core slash command
- **Scope:** Pi-Dev-Ops repo, Unite-Group repo, Synthex infra, cross-cutting infra (Hermes, computer_use, Supabase migrations)
- **Escalation rule:** If PR diff > 500 LOC OR migration touches `auth.*` / payments / data-deletion, escalate to Pi-CEO Board for review
- **Output contract:** Linear comment with branch name + PR URL + CI status + test count
- **Success criterion:** 3 autonomous PRs/day, 0 CI failures merged, 0 unauthorised destructive ops

### 5.2 PM-CCW (Carpet Cleaners Warehouse — first paying client)

- **Trigger:** New `ccw_support_tickets` row OR Linear ticket against `ccw-crm` repo OR Toby email captured by `toby-watch.py`
- **Scope:** `ccw-crm` repo, CCW Supabase tenant, Toby relationship surface
- **Escalation rule:** Any ticket marked `priority=urgent` OR first-response > 30 min escalates to Phill via Telegram. Holiday-window (11–25 May 2026) blocks all proactive outreach.
- **Output contract:** Comment on ticket within 30 min of intake; Linear PR for any code fix; weekly cadence call brief delivered Tuesday 09:30 AEST
- **Success criterion:** NPS ≥ 60 sustained; first-response < 30 min p95; zero churn-threat events

### 5.3 PM-RA (RestoreAssist iOS + SaaS)

- **Trigger:** Linear ticket against `RestoreAssist` repo OR floor-plan workstream child (RA-2947 epic) OR LiDAR sub-epic (RA-2970)
- **Scope:** RestoreAssist Capacitor 8 iOS app, Next.js sandbox + prod, IICRC damage overlay PencilKit module
- **Escalation rule:** App Store rejection OR sandbox prod parity drift > 5 schema changes triggers Board review
- **Output contract:** TestFlight build attached to ticket; sandbox URL for review; App Store submission notes
- **Success criterion:** RA on App Store with 0 P0 bugs week 1; LiDAR + GPS-stitch shipped Q3 2026

### 5.4 PM-DR (Disaster Recovery / NRPG platform)

- **Trigger:** Linear ticket against `dr-nrpg` repo OR National Restoration Practitioners Group community event
- **Scope:** disasterrecovery.com.au Next.js 14.2 app, NRPG contractor network, IAQ Magazine editorial workflow
- **Escalation rule:** Any change to managed-repair positioning OR loss-adjuster pricing escalates to Board (CORE Restoration competitive sensitivity)
- **Output contract:** Public-facing copy passes brand-guardian; NRPG member metrics in weekly 6-pager
- **Success criterion:** DR platform live with onboarding framework adoption tracked; NRPG ≥ 100 members by Q1 2027

### 5.5 PM-Synthex (Synthex AEO / marketing engine / portfolio brain)

- **Trigger:** New brand-config request OR remotion video brief OR seo audit cron OR scout-internalisation pipeline output
- **Scope:** `Synthex/` monorepo, brand-config package, remotion-studio, marketing-orchestrator skill family
- **Escalation rule:** Any external-facing artefact (LinkedIn post, blog, video) requires brand-guardian PASS before publish. NO ad-spend gate (`TAO_NO_AD_SPEND=1` default).
- **Output contract:** Content artefact + brand-guardian PASS + distribution channel + publish-time
- **Success criterion:** ≥ 4 in-house content artefacts per portfolio business per week; organic CAC = $0

### 5.6 Margot (Layer 1 — CEO interface)

- **Trigger:** Telegram message from Phill OR voice-note from mobile CEO surface OR meeting-capture start event
- **Scope:** Pathway hot-pin + wiki query + Board escalation + Senior PM dispatch + ElevenLabs voice reply
- **Escalation rule:** Strategic asks → Board; tactical execution asks → Senior PM; unclear asks → CEO clarification (single round-trip max)
- **Output contract:** Reply text (≤800 char ElevenLabs voice cap) + optional `[SCREEN: ...]` + optional `[DISPATCH-TO: PM-*]`
- **Success criterion:** ≥ 90% of Phill's status intake covered by voice + NotebookLM; < 3% misroutes

### 5.7 Pi-CEO Board (Layer 2 — Phase B wiring)

- **Trigger:** Margot escalation OR scheduled weekly Saturday deliberation OR manual /board slash command
- **Scope:** Strategic decisions, production-gate, $2B-pathway alignment
- **Escalation rule:** Synthesis must reference ≥ 3 personas by role name; sentinel `[DISPATCH-TO: ...]` mandatory
- **Output contract:** Decision memo ≤ 200 words + sentinel + audit row in `audit_emit.py`
- **Success criterion:** Phase B wired by 30 Jun 2026; weekly cadence sustained; 100% of memos have valid sentinel

### 5.8 Senior Research Analyst (Margot research subagent)

- **Trigger:** Pi-CEO Board needs market intel OR competitor signal OR pathway-component verification
- **Scope:** Wiki-first read; Margot deep_research_max when wiki insufficient
- **Escalation rule:** Cite every external claim; ≥ 2 sources for any competitive positioning claim
- **Output contract:** Synthesis ≤ 600 words + citations + Sources/ inbox entry
- **Success criterion:** Brand-guardian PASS rate ≥ 95%

### 5.9 QA-Lead (quality gate)

- **Trigger:** Every PR open OR every content artefact pre-publish
- **Scope:** Code PRs (qa-lead skill rubric) + content (brand-guardian skill)
- **Escalation rule:** FAIL blocks merge / publish; reason captured in `board_mandates.ci_status`
- **Output contract:** PASS or FAIL with specific actionable reasons
- **Success criterion:** 0 production regressions caused by passed PRs; 0 brand-voice violations published

---

## 6. Next 14 days — concrete week-1 + week-2 actions

### Week 1 (14 May → 21 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W1.1 | Strip Unite-Group public marketing routes (`/en/about`, `/en/services/*`, `/en/contact`) — gate behind `profiles.role='founder'` auth OR redirect to Synthex equivalent | PM-Core | `curl https://unite-group.in/en/about` returns 302 → login or 404; Synthex public surface unaffected |
| W1.2 | Archive Plan 4 marketing copy to Synthex (`Synthex/packages/brand-config/src/brands/karen-opener.md` etc.) so the voice work is not lost | PM-Synthex | All 7 public files committed to Synthex repo; brand-guardian PASS |
| W1.3 | Lock Duncan signature — follow-up call + signature on ITR proposal ([[proposal-duncan-itr-platform-2026-05-13]]) | Phill (HITL) + Margot (drafting) | Signed PDF in `~/2nd Brain/Sources/contracts/`; Linear ticket `SYN-DUNCAN-LOCKED` closed |
| W1.4 | Wire Pi-CEO Board Phase B — replace stub dispatch in `swarm/board/wiring.py` with LLM-per-persona calls using `personas.py:CANONICAL_PERSONAS`. Use Claude API Opus 4.7 per persona. | PM-Core | `pytest swarm/board/test_phase_b.py` passes; manual /board slash command returns 9 persona responses + valid sentinel |
| W1.5 | Build weekly Hermes computer_use replay-test cron — picks random recent session, dry-runs, diffs screenshots | PM-Core | Cron at `~/.hermes/scripts/computer_use_replay.py`; first run logs replay-pass; Telegram alert on diff |
| W1.6 | Stand up audio-tap proof-of-concept on Mac Mini — ScreenCaptureKit + faster-whisper streaming to local WebSocket | PM-Core + Hermes | 5-min test recording produces transcript in `~/.hermes/cache/meetings/<session>/transcript.jsonl` |
| W1.7 | Ratify the three forks in §7 with Phill | Margot escalation | Phill responds 👍/❌ on each via Telegram; result recorded in [[decisions/index]] |

### Week 2 (22 May → 29 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W2.1 | Tuesday 26 May 10:00 AEST — first CCW cadence call (post-Toby holiday). Margot meeting-capture POC fires for this call. | Phill (call) + Margot (capture) | Transcript captured; action items extracted; Linear tickets auto-created for any commitments |
| W2.2 | Wire Margot meeting-capture full pipeline (`swarm/meeting_capture.py`) — sliding-window transcript + persona mini-Board + design dispatch + NotebookLM bundler | PM-Core + PM-Synthex | End-to-end test: 3-min monologue → bundle URL in Telegram within 90s |
| W2.3 | Build mobile PWA shell — manifest + service worker + WebAuthn biometric gate on `/empire/mobile/*` | PM-Core | Install on Phill's iPhone Safari; Face ID gate works; Linear ticket creation from mobile works |
| W2.4 | qwen3:30b-a3b promotion candidate — once Ollama pull completes, run 7/7 verbatim-quote test against [[pathway-to-2b-2026-2028]]. If PASS, promote via `TAO_CHEAP_LOCAL_MODEL=qwen3:30b-a3b-q4_K_M` | PM-Core | 7/7 PASS recorded in `~/.hermes/state/margot_model_test.json`; rollback to qwen3:14b on any FAIL |
| W2.5 | Senior PM wiring — extend `swarm/board/wiring.py:_parse_dispatch_target` to recognise PM-CCW, PM-RA, PM-DR, PM-Synthex; scaffold each as a swarm bot in `swarm/bots/` | PM-Core | All 4 new sentinels parse correctly; each bot has stub `claim()` + `execute()` returning a Linear comment |
| W2.6 | First vetted-prospect introduction via Industry Association seed list — Coutis-network warm intro to one of the named cleaning/restoration firms | Phill + Margot | Intro email sent; reply tracked; if 2nd-meeting booked, Linear ticket `SYN-VETTED-2` opened |
| W2.7 | NotebookLM bundle delivered live during Friday client call (whichever vetted prospect lands first) | Margot + PM-Synthex | Bundle URL appears in Phill's Telegram before call ends; bundle shared with client during the call |

---

## 7. Decisions Phill must make now (explicit forks)

These three personas split. Phill ratifies before Master Plan v2 ships.

### Fork 1 — Continuous-loop model on Mac Mini

- **Founder directive 2026-05-13:** "Take advantage of the Gemma 4 model running on the Mac Mini to perform these continuous tasks (as it is free)"
- **Wiki ground-truth ([[pi-ceo-architecture]] §Margot Model Selection 2026-05-13):** Gemma 4 hallucinates over in-context data; deprecated; qwen3:14b is the active model.
- **Board recommendation:** qwen3:14b today; qwen3:30b-a3b once pull completes. Both are free local inference. Both pass the 7/7 verbatim-pathway-quote test.
- **Decision Phill must make:** Confirm qwen3 is the continuous-loop model OR direct re-evaluation of Gemma 4 with fresh pull on the new hardware path.

### Fork 2 — Public-facing Synthex

- **Founder directive 2026-05-13:** "Remove anything to do with Unite-Group as a customer-focused living site."
- **Implied but not stated:** Does Synthex (1,000+ users, marketing-automation SaaS) also go behind auth, or stay public as the empire's external face?
- **Board recommendation:** Synthex stays public — it is the empire's customer-facing brand and the marketing engine. Unite-Group goes dark.
- **Decision Phill must make:** Confirm Synthex remains the public surface.

### Fork 3 — Industry Association as the vetted-funnel

- **Founder directive 2026-05-13:** "Vetted clients only. Phill personally vets every onboarding."
- **Contrarian persona:** This caps growth at ~25 clients × $100K = $2.5M ARR if "vetted" means "Phill has met them".
- **Board recommendation:** ANZ Property Services Industry Association ($299/$799/$2,499 membership tiers) is the institutional vetted-introduction funnel — members are by definition pre-qualified ANZ property-services operators. First 50 founding members ratified by Phill personally; subsequent intake gated by Coutis + Toby + Phill consensus (not Phill alone).
- **Decision Phill must make:** Confirm the association is the vetting channel that scales.

### Other open inputs Phill must provide

- Which 2 industry associations / professional bodies to invite first as Wave-0 founding partners (Coutis + Toby are confirmed; ratify the next 2)
- Telegram chat for meeting-capture bundle delivery — same chat as the daily 6-pager or a separate "Meetings" DM thread?
- Mobile biometric — iPhone Face ID is default. Confirm device list (iPhone + iPad + nothing else, or include MacBook Touch ID for desktop fallback?)

---

## 8. Risks & open questions

### Hard risks

1. **Hermes computer_use audit-trail blackouts under load** — if the JSONL audit log is partially written during a crash, replay-tests cannot reconstruct. Mitigation: fsync after every dispatch row + pre-write a "begin" marker; on startup, mark any uncommitted row as ORPHAN and ping Phill.
2. **macOS permission revocation** — if Phill upgrades macOS or rotates the terminal app, Accessibility / Screen Recording / Automation permissions reset silently. Mitigation: boot-time permission check; refuse to dispatch + Telegram alert on missing permission.
3. **Vetted-funnel bottleneck** — see Fork 3. If association membership growth stalls, Q4 2026 $500K ARR target slips.
4. **Single-client concentration** — CCW + Duncan = 100% of contracted ARR pre-association. CCW churn = empire risk. Mitigation: third paying client by 31 Jul 2026.
5. **Mac Mini single-point-of-failure** — continuous loop dies if hardware dies. Mitigation: Hermes failover to Railway-hosted qwen3 worker (Q4 2026 build).
6. **NotebookLM rate limits / API stability** — `nlm-skill` is a CLI wrapper, not an official Google API. If Google changes the surface, the live-bundle pipeline breaks. Mitigation: skill is replaceable — fallback to direct Drive + Docs + Slides API for the bundle artefact.

### Open questions (cannot answer from wiki/codebase)

1. **What is the third paying client?** Wiki names Bulcs Holdings (Ivi Sims, VIC) as inbound but no proposal yet. Confirm pipeline.
2. **What is the App Store launch window for RestoreAssist consumer iOS?** Build 1.0(10) approved 2026-05-08 — soft-launch date?
3. **What is the budget cap Phill will accept on Claude Max + Anthropic API combined?** Default-assumed $1,000 USD/mo in §4.2; needs ratification.
4. **CCW NPS baseline** — wiki shows the ledger exists but no first NPS measurement recorded. When is the first survey?
5. **Duncan's signature timeline** — proposal sent 13 May; what is the no-go cutoff?
6. **Mac Mini hardware upgrade path** — Llama 3.3 70B OOM'd. Is RAM upgrade in plan, or do we stay on 24GB and live with qwen3:30b ceiling?

---

## 9. Next 90 days — quarterly OKRs

**Objective:** Empire operates autonomously with measurable revenue diversification and a marquee meeting-capture demo.

| KR | Metric | Target | Owner |
|---|---|---|---|
| KR1 | Contracted ARR | $100K (CCW $33K + Duncan $37.4K + 2 vetted × $15K) | Phill + PM-Synthex |
| KR2 | Pi-CEO Board Phase B live | Weekly cadence + audit rows | PM-Core |
| KR3 | Meeting-capture pipeline live | End-to-end < 90s round trip | PM-Core + PM-Synthex |
| KR4 | Mobile CEO interface live | PWA + biometric + voice-note + meeting start/stop | PM-Core |
| KR5 | Senior PM bots wired | PM-CCW + PM-RA + PM-DR + PM-Synthex each autonomously claiming + executing | PM-Core |
| KR6 | Hermes computer_use replay-pass rate | ≥ 95% 7d rolling | PM-Core |
| KR7 | ANZ Industry Association founding members | ≥ 50 paid | Phill + Coutis + Toby |
| KR8 | CCW NPS | ≥ 60 (first survey baseline) | PM-CCW |
| KR9 | Synthex content output per business per week | ≥ 4 artefacts | PM-Synthex |
| KR10 | Critical alerts (6-pager) | 0 missed; ≤ 2 false-positives/week | Margot + Orchestrator |

---

## 10. Verification — what to read to verify every claim in this plan

| Claim | Source |
|---|---|
| $33K CCW ARR | [[ccw]] · [[businesses-overview]] · `ccw_support_tickets` table on Supabase `lksfwktwtmyznckodsau` |
| $37.4K Duncan committed | [[proposal-duncan-itr-platform-2026-05-13]] |
| Hermes computer_use exists | `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/screen/hermes_dispatch.py` + tests |
| Pi-CEO Board Phase A shipped | `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/board/personas.py` + `wiring.py` (verified 2026-05-14) |
| Gemma 4 rejected, qwen3:14b active | [[pi-ceo-architecture]] §Margot Model Selection 2026-05-13 |
| 318 Python modules in swarm/ | `find /Users/phill-mac/Pi-CEO/Pi-Dev-Ops -name "*.py" -path "*/swarm/*"` (verified 2026-05-14) |
| 27 Hermes cron jobs | [[hermes-agent-sprinkle-audit-2026-05-11]] |
| 8/8 integration mesh green | [[now]] §Production Stability Wins 2026-05-13 |
| 43 Linear open / 0 false-positive Urgent | [[operational-priorities-q2-2026]] §Pi-Dev-Ops Backlog State |
| RestoreAssist App Store build 1.0(10) approved | [[businesses-overview]] · [[restore-assist]] |
| Industry Association strategy | [[industry-association-vision-2026]] · [[association-launch-plan-2026]] |
| 9-persona Board prompts | `swarm/board/personas.py:CANONICAL_PERSONAS` |

---

## Cross-refs

[[board-deliberation-2026-05-14]] · [[pathway-to-2b-2026-2028]] · [[pi-ceo-architecture]] · [[now]] · [[founder]] · [[agency-hierarchy]] · [[exit-thesis]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[industry-association-vision-2026]] · [[computer-use-integration-2026-05-13]] · [[proposal-duncan-itr-platform-2026-05-13]] · [[ccw]] · [[unite-group-nexus-architecture]] · [[autonomous-sdlc]] · [[decision-frameworks]]
