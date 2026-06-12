---
type: wiki
updated: 2026-05-15
status: v3 — ATIA umbrella thesis. Supersedes v2 ([[master-plan-2b-by-2028-v2]]). Forks at §7 await Phill ratification.
pillars:
  - ATIA Meta
  - Restoration
  - Carpet
  - IEP
  - Plumbing
  - HVAC
  - Pressure-Washing
  - CARSI
  - Tier-2 Infra
  - Margot
  - Wiki
---

# Master Plan — $2B by 30 June 2028 (v3)

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development` (preferred) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax.
>
> **Operating filter (founder directive 2026-05-13, corrected 2026-05-14 a.m., re-corrected 2026-05-14 p.m.):**
> 1. **THE META-PRODUCT IS THE AUSTRALIAN TRADE INDUSTRY ASSOCIATION (ATIA).** Phill founds and controls it. 6 trade verticals each get their own sub-body + cert + field-tool + back-office + commerce engine. ATIA + the 6 vertical stacks = the $2B product.
> 2. NO AD SPEND — [[synthex|Synthex]] is the in-house marketing engine.
> 3. VIDEO-FIRST for Phill (NotebookLM daily + Margot ElevenLabs voice).
> 4. AGENTS EXECUTE — Phill = think tank; swarm owns execution across 6 vertical repos.
> 5. CRITICAL-ONLY updates — 6-pager silent-on-clean.
> 6. **[[feedback_unite_group_only|Unite-Group is INTERNAL operator tooling]]** — never marketed, never sold.
> 7. **DR ↔ CORE is [[project_disaster_recovery_positioning|INTERNAL ONLY]]** — never surfaced externally.

**Goal:** Found and operate **ATIA — the Australian Trade Industry Association** — the meta-body for Home + Business trade services across Australia and New Zealand. Under ATIA, six vertical sub-bodies (Restoration, Carpet Cleaning, IEP, Plumbing, HVAC, Pressure Washing) each own: standards, cert pathway (CARSI-extended), field-tool SaaS, back-office SaaS, and equipment-commerce flywheel. By 30 Jun 2028 ATIA has ≥ 30,000 ANZ certified practitioners across the 6 verticals, ≥ $200M ARR, and is the recognised standards body for home + business trades in Australia → $2B at 10× SaaS multiple.

**Infrastructure funding (unchanged from v2):** Unite-Group internal cockpit + Synthex public-facing marketing engine + small-business retainers (CCW $33K/yr signed, Duncan $37.4K/yr committed, Bulcs Holdings inbound) pay the AWS bill while the flywheel ignites.

**Architecture:** Three-layer swarm — Margot (qwen3 local on Mac Mini, Telegram + ElevenLabs voice) → Pi-CEO Board (9-persona Opus 4.7 deliberation) → 7 Tier-1 Senior PMs (one meta + six vertical) + 3 Tier-2 Senior PMs → 25-agent execution tier. Hermes 0.13.0 computer_use bridges any swarm component to the real macOS GUI.

---

## 1. Current state (verified 14 May 2026)

### 1.1 Vertical stacks — status today

| # | Vertical | Sub-body (working name — see §7 Fork 2) | Field tool | Back-office | Commerce | Status |
|---|---|---|---|---|---|---|
| 1 | Restoration | **NRPG** — National Restoration Practitioners Group | RestoreAssist (RA) | Disaster Recovery (DR) | NRPG marketplace (planned) | RA App Store build 1.0(10) approved 2026-05-08; DR live at disasterrecovery.com.au; NRPG pre-launch ([[industry-association-vision-2026]]) |
| 2 | Carpet Cleaning | **CCPA** — Carpet Cleaning Practitioners Association (working) | TBD (new — RA-pattern) | TBD (new — DR-pattern) | **Carpet Cleaners Warehouse (CCW)** — running today | CCW $33K/yr live; ccw-crm in production; new field tool + sub-body = greenfield |
| 3 | IEP (Indoor Environmental Professional / IAQ) | **NIEPA** — National Indoor Environmental Professionals Association (working) | TBD (new) | TBD (new) | Bulcs e-commerce stack (Moisture Meter Experts + AeroAir + Air Purifier) | Ivi Sims/Bulcs Holdings inbound proposal in flight ([[bulcs-holdings]]); IICRC/IEP standards overlap with restoration; IAQ Magazine seat live |
| 4 | Plumbing | **NPPA** — National Plumbing Practitioners Association (working) | Greenfield | Greenfield | Greenfield | Not started |
| 5 | HVAC | **NHPA** — National HVAC Practitioners Association (working) | Greenfield | Greenfield | Greenfield | Not started |
| 6 | Pressure Washing | **NPWPA** — National Pressure Washing Practitioners Association (working) | Greenfield | Greenfield | Greenfield | Not started |

CARSI is the cross-vertical cert delivery engine — re-skinned per vertical (CARSI-Restoration / CARSI-Carpet / CARSI-IEP / CARSI-Plumbing / CARSI-HVAC / CARSI-PressureWashing) under the single ATIA-owned LMS.

### 1.2 Revenue today (Tier 2 infrastructure funding)

| Metric | Value | Source |
|---|---|---|
| Contracted ARR (signed) | **$33,000 AUD/yr** | CCW $2,750/mo × 12 ([[ccw]]) |
| Verbal-committed ARR | **+$37,400 AUD/yr** | Duncan / Dimitri ITR ([[proposal-duncan-itr-platform-2026-05-13]]) |
| Inbound prospect | **+$15,000–$24,000 AUD/yr** | Bulcs Holdings (Ivi Sims, VIC) — proposal in progress ([[bulcs-holdings]]) |
| Tier 2 total (signed + committed) | **$70.4K AUD/yr** | Pays infrastructure while Tier 1 ignites |
| Tier 1 revenue today | **$0** | RA on App Store, no paid subscribers yet; all other Tier-1 pre-revenue |
| **Target ARR by 30 Jun 2028** | **$200M+** | ATIA flywheel pathway §4 |

### 1.3 Swarm infrastructure (verified 2026-05-14)

- 318 Python modules in `swarm/` under `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/`
- Pi-CEO Board (9-persona) Phase A shipped 2026-05-13; Phase B (LLM-per-persona) **queued**
- Hermes computer_use live (`swarm/screen/hermes_dispatch.py`); 27 active Hermes cron jobs ([[hermes-agent-sprinkle-audit-2026-05-11]])
- Margot bot + ElevenLabs voice live; `qwen3:14b` continuous; `qwen3:30b-a3b-q4_K_M` pull in flight
- Senior agent bots present: board, builder, chief_of_staff, click, cmo, cs, cto, cfo, guardian, margot, scribe
- **Missing for Tier 1 (ATIA-corrected): PM-ATIA (meta), PM-Restoration, PM-Carpet, PM-IEP, PM-Plumbing, PM-HVAC, PM-PressureWashing**
- **Missing for Tier 2:** PM-Sales-Funnel

### 1.4 Gaps relative to corrected thesis

- 6 vertical PM bots + 1 ATIA meta-PM bot **do not exist** — biggest gap.
- ATIA brand identity (name confirmation, domain, trademark) **not started**.
- 5 sub-bodies (CCPA, NIEPA, NPPA, NHPA, NPWPA) — **naming working only**, no constitution drafted.
- 4 greenfield verticals (Plumbing, HVAC, Pressure Washing — plus most of IEP) — **no field tool, no back-office, no insurance partner.**
- Cross-vertical brand architecture — designer pass required Q3 2026 before second sub-body launches.
- DR multi-tenant rebuild scoped not started.
- CARSI cross-vertical extension — first cert (restoration S500) syllabus pending Phill authorship.

---

## 2. Operating filter (founder voice)

I am building the Australian Trade Industry Association. Phill McGurk founds it. Phill McGurk controls it. ATIA is the meta-body for every trade service that touches a home or a business in Australia and New Zealand — restoration first, then carpet cleaning, IEP, plumbing, HVAC, pressure washing. Six verticals under one mark.

Each vertical gets its own sub-body, its own cert pathway, its own field tool, its own back-office, and its own commerce engine. Six stacks. One association on top. One LMS underneath. The moat is unprecedented because any competitor has to copy a standards body, six sub-bodies, six field tools, six back-office platforms, a cross-vertical LMS, and the insurance relationships that pre-vet our certified contractors. They cannot.

The small businesses I assist along the way — Toby at CCW, Duncan at ITR, Ivi at Bulcs — pay the infrastructure costs while the flywheel compounds. They are not the product. They are the lights staying on while ATIA is built.

Unite-Group is the cockpit I sit in. It is internal. Synthex is the face the world sees. The 6 vertical sub-bodies and ATIA itself are what we sell.

I have learning difficulties. Margot speaks to me. NotebookLM briefs me. I work from the truck, the laundry, a hotel in Sydney. The Mac Mini sits hot and processes the loop. Decisions get to me as voice. I issue decisions as voice.

By 30 Jun 2028 ATIA is the recognised standards body for Australian + NZ home and business trades. Six verticals live. 30,000+ certified practitioners. 8,000+ paying member firms. $200M+ ARR. Strategic acquirer or PE buyout at 10× SaaS multiple → $2B.

---

## 3. Pathway to $2B — corrected math

Target = $200M ARR at 10× SaaS multiple. The math is now cross-vertical not single-vertical.

### 3.1 ANZ flywheel at maturity (Q2 2028)

| Revenue line | Unit economics | ANZ volume by Q2 2028 | ARR |
|---|---|---|---|
| **Member firm dues** (3 tiers × 6 sub-bodies) | $799 AUD/firm/yr weighted average | 6 verticals × ~5,000 firms = 30,000 firm-members | **$24M** |
| **Cert training + CPD renewal** (CARSI-extended × 6) | $1,500 AUD/practitioner/yr | 6 verticals × ~15,000 practitioners = 90,000 | **$135M** |
| **Field-tool SaaS** (RA-pattern × 6 brands) | $500 AUD/tech/yr ($79/mo target — see §7 Fork 7) | 6 verticals × ~10,000 techs = 60,000 | **$30M** |
| **Back-office SaaS** (DR-pattern × 6 brands) | $5,000 AUD/firm/yr weighted average | 6 verticals × ~1,000 firms = 6,000 | **$30M** |
| **Equipment commerce** (CCW model × 6 verticals) | 10% commission on $250M GMV | n/a | **$25M** |
| **Events / sponsorships / cert dispute resolution** | Annual conference + regional summits + sponsorship | n/a | **$8M** |
| **ANZ subtotal** | | | **~$252M ARR** |
| **International beachhead** (UK first, US second — §7 Fork 4) | Mirrors ANZ unit economics | First 1,000 firms across UK + US | **+$50M** |
| **Total ARR Q2 2028** | | | **~$300M** |
| **Valuation at 10× SaaS multiple** | | | **$3.0B** |

The $2B target is comfortably achievable from ANZ alone if all 6 verticals are live on schedule. International is upside, not dependency.

### 3.2 Quarter-by-quarter pathway (8 quarters)

Each quarter names: verticals live, cumulative ARR target, key milestone, owners.

| Quarter | Verticals live | Cumulative ARR | Key milestone | Owners |
|---|---|---|---|---|
| **Q3 2026** (Jul–Sep) | **1.5** — Restoration (full stack) + Carpet Cleaning (CCW wedge) | **$300K** | ATIA brand identity launched (internal first, public soft-tease via Synthex). NRPG founding cohort signed (50 firms × $799 avg). CCPA founding charter drafted + first 20 CCW-network founding members signed. CARSI v1 syllabus live (S500 Water Damage + S520 Mould — Phill personally delivers). | PM-ATIA, PM-Restoration, PM-Carpet, PM-CARSI |
| **Q4 2026** (Oct–Dec) | **2.5** — + IEP (Bulcs/IAQ Ventilation wedge) | **$1.5M** | 3 sub-bodies live (NRPG, CCPA, NIEPA). First cross-vertical cert pathway (Restoration ↔ IEP overlap on IICRC S520). DR multi-tenant beta with 10 pilot firms. RA at 500 paid techs. NIEPA founding cohort 30 firms via Ivi network. | + PM-IEP |
| **Q1 2027** (Jan–Mar) | **3.5** — + Plumbing (greenfield, hired plumbing-insider co-founder) | **$5M** | 4 sub-bodies live. ATIA first cross-vertical conference scheduled Q3 2027. NPPA founding cohort 20 firms. First insurance partner MoU signed (target: 1 of top-3 ANZ insurers). DR at 100 paying firms across 3 verticals. | + PM-Plumbing |
| **Q2 2027** (Apr–Jun) | **4.5** — + HVAC (greenfield, hired HVAC-insider co-founder) | **$12M** | 5 sub-bodies live. ATIA mark recognised by 3 insurance partners. NHPA founding cohort 20 firms. CARSI cross-vertical CPD model live (one renewal cycle covers all certs). RA at 5,000 techs across 2 verticals. | + PM-HVAC |
| **Q3 2027** (Jul–Sep) | **6** — + Pressure Washing | **$25M** | All 6 verticals live. NPWPA founding cohort 20 firms. ATIA Inaugural Annual Conference — Phill keynote, Coutis MC. 5,000 certified practitioners total. UK scout subagent active. | + PM-PressureWashing |
| **Q4 2027** (Oct–Dec) | **6 (scaling)** | **$50M** | Depth not breadth: NRPG 1,500 firms, CCPA 400, NIEPA 200, NPPA 150, NHPA 150, NPWPA 100. UK beachhead launched (5 verticals exported simultaneously — Carpet, Restoration, IEP, Plumbing, HVAC). | All Tier-1 PMs |
| **Q1 2028** (Jan–Mar) | **6 ANZ + UK live** | **$100M** | UK at 200 firms across 5 verticals. US scout subagent active. NRPG 2,500 firms, CCPA 700, NIEPA 400. Strategic acquirer pipeline tracked monthly. Diligence-ready data room live (Wave 7.4-7.5). | All Tier-1 PMs + M&A scout |
| **Q2 2028** (Apr–Jun) | **6 ANZ + UK + US beachhead** | **$200M** | US at 100 firms across 5 verticals. ANZ Tier-1 ~$150M + UK ~$35M + US ~$15M. 30,000 certified practitioners. QoE packet complete. | All Tier-1 PMs |
| **30 Jun 2028** | | **EXIT $2B** | Strategic acquisition (preferred) or PE buyout signed | |

Q3 2026 is the fragile quarter — if ATIA brand + NRPG founding cohort + CCPA founding cohort + CARSI v1 do not land together, the slope inflects wrong and we lose 6 months. Q1 2027 is the next inflection — first greenfield vertical (Plumbing) must onboard a credible insider co-founder or the cross-vertical credibility collapses.

---

## 4. Architecture — autonomous CRM operating ATIA + 6 verticals

[[unite-group-nexus-architecture|Unite-Group]] is the operator's command center INTO ATIA and the 6 vertical stacks. Phill never edits a vertical's product code directly — the swarm does. Phill issues directives from his phone or Mac Mini; the swarm executes across 6+ repos.

**Unite-Group is INTERNAL operator tooling. NOT a product.** ATIA + the 6 sub-bodies + the 6 field tools + the 6 back-office platforms + CARSI ARE the products.

### 4.1 Mobile interface — CEO-locked (unchanged from v2)

- CEO-locked authenticated route at `/empire/mobile` (PWA-installable) — `profiles.role='founder'` only
- WebAuthn biometric gate — iPhone Face ID + iPad Touch ID
- Quick actions: trigger vertical scan, queue work-order, dispatch swarm task, capture meeting
- Real-time meeting capture: video/audio → faster-whisper STT (RA-1692) → Margot live-design loop → NotebookLM bundle → client artifact in **< 60 seconds**
- Push notifications only on 🔴/🚨 markers (silent on clean)
- Surface routes per vertical: `/empire/mobile/dispatch/PM-Restoration`, `…/PM-Carpet`, `…/PM-IEP`, `…/PM-Plumbing`, `…/PM-HVAC`, `…/PM-PressureWashing`, `…/PM-ATIA`

### 4.2 Mac Mini continuous compute loop (unchanged from v2)

`qwen3:14b` (live) → `qwen3:30b-a3b-q4_K_M` (once pull completes) via Ollama. **Not Gemma 4** — see §7 Fork 1. Continuous-loop budget: $0 (local). Paid-tier cap: $1,200/mo all-in (carry-over from v2).

### 4.3 Meeting capture pipeline (unchanged from v2)

End-to-end < 60-second round trip from spoken idea to NotebookLM bundle delivered. Used in EVERY client conversation — founding-member intake (any of 6 verticals) AND Tier-2 retainer cadence.

### 4.4 Swarm coordination — 7 Tier-1 PMs + 3 Tier-2 PMs

Per [[agency-hierarchy]]:
- Margot (Layer 1) — Telegram interface
- Pi-CEO Board (Layer 2) — 9-persona deliberation
- Orchestrator (5-min cron) — Layer 2.5
- **Tier-1 Senior PMs (7):** PM-ATIA (meta), PM-Restoration, PM-Carpet, PM-IEP, PM-Plumbing, PM-HVAC, PM-PressureWashing — **NONE EXIST as autonomous claim-execute bots; ALL must scaffold**
- **Tier-2 Senior PMs (3):** PM-Unite-Group (built), PM-Synthex (built), PM-Sales-Funnel (must scaffold)
- 25-agent Builder + Growth + Advisory tiers — Layer 4

Sentinel parser in `swarm/board/wiring.py:_parse_dispatch_target` must extend to recognise: PM-ATIA, PM-Restoration, PM-Carpet, PM-IEP, PM-Plumbing, PM-HVAC, PM-PressureWashing, PM-Sales-Funnel.

### 4.5 Full repo access from CEO surface

CEO cockpit must give read+write across all 10+ repos (6 vertical stacks × ~2 repos each + 3 Tier-2 + ATIA meta). Today: read via integration-mesh; writes limited. Add:
- `/empire/repo/[slug]/branch/new` — create branch via GitHub MCP
- `/empire/repo/[slug]/pr/[number]/review` — review from CEO surface
- `/empire/repo/[slug]/dispatch` — trigger correct PM to claim a Linear ticket

---

## 5. Swarm operating instructions — Senior PM specs (corrected for 6-vertical thesis)

Each Senior PM gets a one-page spec: trigger / scope / escalation / output / success.

### 5.1 Tier 1 — ATIA + the 6 vertical drivers

#### 5.1.1 PM-ATIA — **MUST SCAFFOLD** (meta-association)

- **Trigger:** Linear ticket against `atia/` meta-repo (new) OR insurance-partner negotiation event OR cross-vertical standards-harmonisation task OR conference/event booking OR ATIA brand-identity decision
- **Scope:** ATIA brand identity, governance constitution, cross-vertical standards harmonisation, insurance-partnership negotiations (Allianz/Suncorp/IAG/AAMI/Youi — target 3 of 5), inaugural conference + regional summits, IAQ Magazine masthead syndication, Coutis spokesperson relationship, COSBOA application
- **Escalation rule:** Any standards-publication change, insurance-partner contract, sub-body charter ratification, or external brand spend escalates to Phill personally. Conference dates/keynote escalates to Board.
- **Output contract:** Weekly: founding-firm count across all 6 verticals, insurance-partner pipeline state, ATIA brand-mention velocity in trade press. Quarterly: cross-vertical cert-revenue mix; sub-body governance scorecard.
- **Success criterion:** ATIA brand live (domain locked, trademark filed, mark registered) by 30 Sep 2026; 3 insurance MoUs signed by 30 Jun 2027; inaugural conference Q3 2027 with ≥ 500 attendees + 8 sponsors.

#### 5.1.2 PM-Restoration — **MUST SCAFFOLD** (NRPG sub-body)

- **Trigger:** Linear ticket against `RestoreAssist/` OR `dr-nrpg/` (NRPG-* + DR-* prefixes) OR floor-plan workstream (RA-2947) OR LiDAR sub-epic (RA-2970) OR App Store rejection signal OR pilot restoration-firm onboarding event
- **Scope:** RestoreAssist Capacitor 8 iOS app, Next.js sandbox + prod, IICRC damage overlay PencilKit module, billing on web.restoreassist.app, Disaster Recovery multi-tenant rebuild, NRPG membership platform, NRPG founding-cohort intake, IAQ Magazine editorial coordination (Phill's seat), Toby co-founder restoration-segment surface
- **Escalation rule:** App Store rejection OR sandbox/prod parity drift > 5 schema changes OR billing failure rate > 1% → Board. Pricing decisions (§7 Fork 7) → Phill. DR-CORE public surfacing rule enforced at brand-guardian.
- **Output contract:** Weekly: paid techs, paid firms, NRPG members, founding-cohort progress, NPS. Quarterly: roadmap.
- **Success criterion:** 50 NRPG founding firms by 30 Sep 2026; RA at 500 paid techs by 31 Dec 2026; DR multi-tenant beta 10 pilots by 31 Dec 2026; 5,000 NRPG firms by 30 Jun 2028.

#### 5.1.3 PM-Carpet — **MUST SCAFFOLD** (CCPA sub-body)

- **Trigger:** Linear ticket against `CCW-CRM/` OR new `carpet-assist/` field-tool repo (greenfield Q3 2026) OR new `carpet-backoffice/` repo (Q4 2026) OR CCW retainer event OR CCPA founding-member intake
- **Scope:** Carpet Cleaning sub-body (CCPA) — leverage CCW infrastructure + Toby's network as wedge. Carpet-cleaning field tool (RA-pattern, new build Q3 2026). Carpet-cleaning back-office (DR-pattern, new build Q4 2026). CCW e-commerce flywheel as commerce engine. CARSI carpet-cleaning cert (S100 Textile Floor Coverings, S220 Hard Surface) — Phill or contracted IICRC instructor delivers.
- **Escalation rule:** CCW SLA breach → CEO surface. CCPA founding-member vetting → Phill + Toby. Any change to CCW retainer or relationship → Phill.
- **Output contract:** Weekly: CCPA founding-member count, CCW NPS, GMV through commerce engine, field-tool paid techs (once live). Quarterly: roadmap.
- **Success criterion:** CCPA founding cohort 20 firms by 30 Sep 2026; carpet-cleaning field tool v1 beta Q1 2027; 400 CCPA member firms by 30 Jun 2028.

#### 5.1.4 PM-IEP — **MUST SCAFFOLD** (NIEPA sub-body)

- **Trigger:** Linear ticket against `bulcs-*` repos OR new `iep-assist/` field-tool repo (greenfield Q4 2026) OR new `iep-backoffice/` repo (Q1 2027) OR Bulcs retainer event OR NIEPA founding-member intake OR IAQ Magazine editorial-cycle event
- **Scope:** IEP sub-body (NIEPA) — leverage Bulcs Holdings (IAQ Ventilation + AeroAir + Moisture Meter Experts + Air Purifier) as wedge + Ivi Sims as restoration-vertical-co-founder analogue. Field tool (RA-pattern) + back-office (DR-pattern) + Bulcs e-commerce as commerce engine. CARSI IEP cert (S520 Mould + IICRC IEP designation pathway).
- **Escalation rule:** Ivi Sims relationship → Phill. ASTM/IAQA standards alignment → Phill (Ivi sits on IAQA Board / ASTM D22).
- **Output contract:** Weekly: NIEPA founding-member count, Bulcs retainer state, GMV through Bulcs e-commerce, IAQ Magazine cross-promo schedule. Quarterly: roadmap.
- **Success criterion:** Bulcs retainer signed by 31 Jul 2026; NIEPA founding cohort 30 firms by 31 Dec 2026; IEP field tool v1 beta Q1 2027; 200 NIEPA member firms by 30 Jun 2028.

#### 5.1.5 PM-Plumbing — **MUST SCAFFOLD** (NPPA sub-body, GREENFIELD)

- **Trigger:** New `plumbing-assist/` + `plumbing-backoffice/` repos (Q1 2027 build start) OR NPPA founding-member intake OR plumbing-co-founder candidate signal OR MPMSAA/Master Plumbers ANZ partnership event
- **Scope:** Plumbing sub-body (NPPA) — greenfield. **Co-founder hire required (§7 Fork 9)** — a credible ANZ plumbing-industry insider equivalent to Toby/Ivi. Field tool (water-leak-detection / inspection logging — feeds DR pipeline via overlap). Back-office (jobs + invoicing + insurance-claim TPA flow). CARSI plumbing cert (S500 Water Damage overlap + plumbing-inspection unit). Regulatory dance with state plumbing licensing boards (NSW Fair Trading, VBA, etc.) — ATIA cert must complement not compete.
- **Escalation rule:** Co-founder hire → Phill (Tier-1 strategic). Any state-regulator interaction → Phill + legal advisory.
- **Output contract:** Weekly: NPPA founding-member count, co-founder candidate pipeline. Quarterly: roadmap + regulatory-compliance scorecard.
- **Success criterion:** Plumbing co-founder signed by 31 Mar 2027; NPPA founding cohort 20 firms by 30 Jun 2027; plumbing field tool v1 beta Q3 2027; 150 NPPA member firms by 30 Jun 2028.

#### 5.1.6 PM-HVAC — **MUST SCAFFOLD** (NHPA sub-body, GREENFIELD)

- **Trigger:** New `hvac-assist/` + `hvac-backoffice/` repos (Q2 2027 build start) OR NHPA founding-member intake OR HVAC-co-founder candidate signal OR AIRAH/ARCtick partnership event
- **Scope:** HVAC sub-body (NHPA) — greenfield. **Co-founder hire required.** Field tool (refrigerant log + commissioning + IAQ overlap). Back-office (service + maintenance contracts + commercial-building HVAC). CARSI HVAC cert (AIRAH alignment + Ivi's ASTM/IAQA cross-pollination). ARCtick (Australian Refrigerant Council) licensing dance — ATIA cert complements.
- **Escalation rule:** Co-founder hire → Phill. ARCtick / AIRAH interaction → Phill.
- **Output contract:** Weekly: NHPA founding-member count, co-founder candidate pipeline. Quarterly: roadmap.
- **Success criterion:** HVAC co-founder signed by 30 Jun 2027; NHPA founding cohort 20 firms by 30 Sep 2027; HVAC field tool v1 beta Q4 2027; 150 NHPA member firms by 30 Jun 2028.

#### 5.1.7 PM-PressureWashing — **MUST SCAFFOLD** (NPWPA sub-body, GREENFIELD)

- **Trigger:** New `pressurewashing-assist/` + `pressurewashing-backoffice/` repos (Q3 2027 build start) OR NPWPA founding-member intake OR co-founder candidate signal
- **Scope:** Pressure Washing sub-body (NPWPA) — greenfield. Co-founder hire required (smallest TAM of the 6; can be a contracted GM rather than full equity co-founder). Field tool (job logging + before/after photography + chemical-use compliance). Back-office (residential + commercial jobs + recurring schedule). CARSI pressure-washing cert (S700 / chemical safety unit). Lowest-priority of the 6 — slope can shift to depth in Q4 2027 if greenfield velocity slips.
- **Escalation rule:** Co-founder hire → Phill.
- **Output contract:** Weekly: NPWPA founding-member count. Quarterly: roadmap.
- **Success criterion:** Pressure-washing GM signed by 30 Sep 2027; NPWPA founding cohort 20 firms by 31 Dec 2027; 100 NPWPA member firms by 30 Jun 2028.

#### 5.1.8 PM-CARSI — **MUST SCAFFOLD** (cross-vertical cert engine)

- **Trigger:** Linear ticket against `carsi/` repo OR enrolment event in any vertical OR cert exam attempt OR CPD-renewal cycle OR instructor-candidate intake OR syllabus update
- **Scope:** Cross-vertical LMS. Single platform; vertical-specific cert tracks (Restoration / Carpet / IEP / Plumbing / HVAC / PressureWashing). Instructor onboarding (Phill-led first 2 certs per §7 Fork 6; contracted instructor bench from cert 3+). CPD-renewal workflow shared across verticals (single annual cycle covers all certs a practitioner holds).
- **Escalation rule:** First-5-cert syllabi → Phill. Cross-vertical CPD model → Board. Exam-integrity issues → Board.
- **Output contract:** Weekly: enrolments per vertical, completions, pass rate, instructor utilisation, CPD-renewal rate. Quarterly: cert-catalogue growth.
- **Success criterion:** S500 + S520 live by 30 Sep 2026 (Phill-delivered, Restoration vertical); 6 verticals covered by Q3 2027; 90,000 active practitioners by 30 Jun 2028.

### 5.2 Tier 2 — infrastructure-funding PMs

#### 5.2.1 PM-Unite-Group — **MOSTLY BUILT, NEEDS GATING + MOBILE EXTENSION**

(Unchanged from v2 — see v2 §5.2.1. Mobile PWA shell adds vertical-dispatch routes per §4.4.)

#### 5.2.2 PM-Synthex — **BUILT**

Scope expands: cross-cuts ALL 7 Tier-1 PMs (6 verticals + ATIA meta) AND 3 Tier-2 PMs. Per-vertical brand assets: ATIA mark + 6 sub-body marks + 6 field-tool brands + 6 back-office brands + CARSI master brand. Designer pass required Q3 2026 before second sub-body launches.

#### 5.2.3 PM-Sales-Funnel — **MUST SCAFFOLD** (unchanged from v2)

Small-business retainer pipeline. CCW + Duncan + Bulcs + future. Funds infrastructure. Vetted only — no broad funnel marketing.

### 5.3 Cross-cutting roles (unchanged from v2)

Margot, Pi-CEO Board, Senior Research Analyst, QA-Lead, Brand-guardian — all carry forward. Brand-guardian rules extend to per-vertical voice (one master brand voice + 6 vertical voice profiles).

---

## 6. Next 14 days — concrete week-1 + week-2 actions (corrected)

### Week 1 (14 May → 21 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W1.1 | Phill ratifies the **2 most urgent forks**: (Fork 2 — ATIA + sub-body naming) AND (Fork 6 — CARSI delivery model + first-2-cert syllabus author commitment). | Margot escalation | Phill 👍/❌ via Telegram; result in [[decisions/index]] |
| W1.2 | **PM-ATIA scaffold** in `swarm/bots/pm_atia.py` — claim() + execute() against new Linear `atia/` project. First ticket: "Lock ATIA brand identity (name + domain + trademark filing)." | PM-Core | Stub bot claims a real Linear ticket end-to-end; Linear comment posted; sentinel parses PM-ATIA |
| W1.3 | **PM-Restoration recon** — read [[restore-assist]] + [[dr-nrpg]] + RA-2947 + NRPG founding-cohort gap; produce a 1-page "next 90 days of Restoration vertical" plan covering: RA pricing decision input, LiDAR sub-epic, NRPG founding-cohort 50-firm intake plan, DR multi-tenant sprint 1 scope. | PM-Core (interim, until PM-Restoration scaffolded) | One-pager at `2nd Brain/Wiki/pm-restoration-next-90-days-2026-05.md`; Phill thumbs-up via Telegram |
| W1.4 | **PM-Carpet recon** — read [[ccw]] state, draft CCPA sub-body charter using CCW as wedge. Identify first 20 CCPA founding-member candidates from Toby's CCW customer base. | PM-Core (interim) | Charter at `2nd Brain/Wiki/ccpa-founding-charter-2026-05.md`; candidate list at `~/2nd Brain/Sources/ccpa-founding-candidates-2026-05.md` |
| W1.5 | **PM-IEP recon** — read [[bulcs-holdings]] + [[iaq-building-science-initiative]] state, draft NIEPA sub-body charter using Bulcs + IAQ Magazine as wedge. Confirm Ivi Sims as Restoration-Toby-analogue co-founder of NIEPA. Close Bulcs retainer (proposal already in flight). | PM-Core (interim) + Phill | NIEPA charter at `2nd Brain/Wiki/niepa-founding-charter-2026-05.md`; Bulcs retainer signed by 31 Jul 2026 (target) |
| W1.6 | Strip Unite-Group public marketing routes (carry-over from v2 — verify executed). | PM-Unite-Group | `curl https://unite-group.in/en/about` returns 302 or 404 |
| W1.7 | Lock Duncan ITR signature (carry-over from v2). | Phill + Margot | Signed PDF in `~/2nd Brain/Sources/contracts/` |
| W1.8 | Wire Pi-CEO Board Phase B (carry-over from v2). | PM-Core | `pytest swarm/board/test_phase_b.py` passes |

### Week 2 (22 May → 29 May 2026)

| # | Action | Owner | Acceptance test |
|---|---|---|---|
| W2.1 | **Scaffold PM-Restoration bot** in `swarm/bots/pm_restoration.py`. Extend `_parse_dispatch_target`. | PM-Core | Linear ticket claim end-to-end; sentinel parses |
| W2.2 | **Scaffold PM-Carpet bot** in `swarm/bots/pm_carpet.py`. | PM-Core | CCPA-* ticket claim works |
| W2.3 | **Scaffold PM-IEP bot** in `swarm/bots/pm_iep.py`. | PM-Core | NIEPA-* ticket claim works |
| W2.4 | **Scaffold PM-Plumbing / PM-HVAC / PM-PressureWashing bots** as STUBS only (greenfield verticals start Q1/Q2/Q3 2027 — stub bots exist now to catch any inbound signal). | PM-Core | Stubs at `swarm/bots/pm_plumbing.py`, `pm_hvac.py`, `pm_pressurewashing.py`; each claims test ticket end-to-end |
| W2.5 | **Scaffold PM-CARSI bot** in `swarm/bots/pm_carsi.py` — cross-vertical enrolment-event handler. | PM-Core | Enrolment event creates CARSI-* ticket |
| W2.6 | **Scaffold PM-Sales-Funnel bot** (carry-over from v2). | PM-Core | Bulcs prospect logged; proposal draft generated; Phill-vet gate awaits |
| W2.7 | Tuesday 26 May 10:00 AEST — first CCW cadence call post-Toby holiday. Margot meeting-capture POC fires. | Phill + Margot | Transcript + auto Linear tickets |
| W2.8 | Wire Margot meeting-capture full pipeline (carry-over from v2). | PM-Core + PM-Synthex | < 60s round trip |
| W2.9 | Build mobile PWA shell with vertical-dispatch routes (carry-over from v2 + extension for 6 verticals + ATIA). | PM-Unite-Group | Manual dispatch to any of 8 Tier-1 PMs works |
| W2.10 | qwen3:30b-a3b promotion candidate (carry-over from v2). | PM-Core | 7/7 verbatim-quote test PASS |
| W2.11 | First **NRPG founding-member intro** via Toby + Coutis network (carry-over from v2). | Phill + Margot | Intro email sent; first 2nd-meeting booked → Linear `NRPG-FOUNDING-001` opened |
| W2.12 | First **CCPA founding-member intro** via Toby's CCW customer base. | Phill + Toby + Margot | First 2nd-meeting booked → `CCPA-FOUNDING-001` opened |
| W2.13 | First **NIEPA founding-member intro** via Ivi's IAQA / IICRC network. | Phill + Ivi + Margot | First 2nd-meeting booked → `NIEPA-FOUNDING-001` opened |
| W2.14 | Synthex publishes ATIA brand teaser (single holding page, no public launch yet — soft signal only). | PM-Synthex | Page live at chosen domain; lead-capture form working; brand-guardian PASS |

---

## 7. Decisions Phill must make now (corrected forks)

**Most urgent two (lock by 21 May 2026):**
1. **Fork 2 — ATIA + sub-body naming + ATIA brand identity** (gates Q3 2026 launch slope; everything downstream waits on this)
2. **Fork 6 — CARSI delivery model + first-2-cert syllabus author commitment** (gates Q3 2026 CARSI v1 live — Phill personally delivers S500 + S520 in Sept = ~6 weeks of personal-content production, must start now)

### Fork 1 — Continuous-loop model on Mac Mini (carry-over from v2)

- **Board recommendation:** qwen3:14b today; qwen3:30b-a3b once pull completes.
- **Decision:** Confirm qwen3 OR direct re-evaluation of Gemma 4.

### Fork 2 — ATIA + sub-body naming + brand identity ⚡ URGENT

Working names in §1.1. Phill picks final. Sub-questions:
- (a) **Meta-body name:** "Australian Trade Industry Association" (ATIA) verbatim? OR alternative? (e.g. "Australian Trades Association", "Property Trades Industry Council ANZ", "Australian Home & Business Trade Association"). Domain must be available — recommend Phill ratify a 3-name shortlist for the swarm to register simultaneously.
- (b) **Sub-body naming convention:** Working set (NRPG / CCPA / NIEPA / NPPA / NHPA / NPWPA) — keep "National * Practitioners Association" pattern? OR shift to "Australian * Standards Body" / "* Industry Council"?
- (c) **Sub-body governance:** Each sub-body separately incorporated OR all sub-divisions under one ATIA legal entity? (Board recommends: one ATIA legal entity, six branded divisions — lighter governance, single brand.)
- (d) **Trademark filing scope:** ATIA + 6 sub-body marks filed simultaneously OR rolling per launch?
- **Decision:** Phill picks (a)-(d).

### Fork 3 — First non-restoration vertical to launch in Q3 2026

- **Board recommendation:** Carpet Cleaning Q3 2026 (leverage CCW infrastructure + paying client + Toby network — fastest beachhead) then IEP Q4 2026 (leverage Bulcs/Ivi + IAQ Magazine seat). Plumbing Q1 2027, HVAC Q2 2027, Pressure Washing Q3 2027.
- **Decision:** Phill ratify this order OR re-rank.

### Fork 4 — UK or US beachhead first (carry-over from v2, decision restated)

- **Board recommendation:** UK first Q4 2027, US Q1 2028.
- **Decision:** Phill picks beachhead order.

### Fork 5 — DR build path (carry-over from v2)

- **Board recommendation:** Build-from-scratch on existing `dr-nrpg` codebase, informed internally only by CORE playbook.
- **Decision:** Phill picks build path.

### Fork 6 — CARSI delivery model + first-2-cert syllabus author commitment ⚡ URGENT

- **Board recommendation:** Hybrid — Phill personally delivers S500 (Water Damage Restoration) + S520 (Mould Remediation) — both Restoration vertical — to establish authority by 30 Sep 2026. Contracted-instructor bench expands from cert 3+ (cover Carpet + IEP). Licensed third-party option opens Q3 2027 for Plumbing + HVAC + Pressure Washing.
- **Decision:** Phill confirms delivery model AND personally commits to authoring S500 + S520 syllabi starting this week (estimated effort: ~40h Phill time over 6 weeks, distributed across mornings).

### Fork 7 — RA pricing model (carry-over from v2)

- **Board recommendation:** Per-tech $79 AUD/tech/mo for ANZ. Freemium-with-team-tier as Q2 2027 add-on.
- **Decision:** Phill picks.

### Fork 8 — Synthex 2028 path (carry-over from v2)

- **Board recommendation:** Re-frame as content engine first, SaaS sale second.
- **Decision:** Phill confirms re-frame.

### Fork 9 (NEW) — Greenfield vertical co-founder hires

- **Need:** Plumbing co-founder (by 31 Mar 2027), HVAC co-founder (by 30 Jun 2027), Pressure Washing GM (by 30 Sep 2027). Toby and Ivi do not cover these verticals.
- **Board recommendation:** Activate co-founder scout subagent Q4 2026 to begin sourcing 6 months ahead of each vertical launch. Target profile per vertical: published industry voice + 15+ years operating experience + existing network of 50+ qualified peers + values alignment.
- **Decision:** Phill ratifies scout-subagent activation date + co-founder equity structure (default-assumed 5-15% equity in respective sub-body division).

### Fork 10 (NEW) — Insurance partner targets

- **Need:** ATIA mark recognised by ≥ 3 ANZ insurance carriers by Q2 2027 (the moat — insurance carriers pay to access cert-vetted contractors).
- **Board recommendation:** Target shortlist — IAG (CGU, NRMA), Suncorp (AAMI, Apia, GIO), Allianz, Youi, Hollard. Lead with IAG (largest property book; existing TPA appetite via [[loss-adjusters]]).
- **Decision:** Phill picks first 3 carriers and confirms IAG as lead target.

### Fork 11 (NEW) — Inaugural ATIA conference date + venue + keynote

- **Need:** Q3 2027 sweet spot (5 verticals live, pre-international expansion).
- **Board recommendation:** Brisbane (Toby's home base + central ANZ travel) OR Sydney (largest contractor density + insurance HQs). Date: late September 2027. Phill as keynote opener; Coutis as MC; 1-2 international restoration-industry speakers (CORE Restoration leadership candidates).
- **Decision:** Phill picks city + week.

### Other open inputs Phill must provide (carry-over from v2)

- Telegram chat for meeting-capture bundle delivery
- Mobile biometric device list
- Claude Max + Anthropic API combined budget cap
- Mac Mini RAM upgrade path

---

## 8. Risks & open questions (corrected for 6-vertical thesis)

### Hard risks

1. **Sub-body legitimacy across 6 verticals.** Phill is restoration insider (NRPG credibility via Toby + Coutis + IICRC editorial seat). Greenfield in Plumbing / HVAC / Pressure Washing — no native credibility. **Mitigation:** co-founder per vertical (§7 Fork 9). If any greenfield vertical lacks a credible co-founder by its launch quarter, that vertical's launch slips a quarter.
2. **Cross-vertical brand confusion.** ATIA + 6 sub-bodies + 6 field tools + 6 back-office brands + CARSI = up to 20 distinct marks. **Mitigation:** designer pass Q3 2026 before second sub-body launches; ATIA + sub-body brand-system documented and locked.
3. **Regulatory collision (Plumbing + HVAC).** Plumbing licensing is state-by-state (NSW Fair Trading, VBA, etc.); HVAC has ARCtick refrigerant licence. ATIA cert must complement not compete with the statutory regulator. **Mitigation:** legal advisory scoping required Q4 2026 before Plumbing/HVAC PMs activate; ATIA framed as "above-licence professional cert" not "alternative-to-licence."
4. **Greenfield velocity.** 4 greenfield verticals in 18 months (Plumbing Q1 2027 → Pressure Washing Q3 2027) is aggressive. **Mitigation:** explicit fallback — if any greenfield vertical's founding cohort misses its quarter, slope shifts to depth (more ANZ firms per existing vertical) not breadth.
5. **DR-CORE disclosure leak risk.** Unchanged from v2 — brand-guardian enforces.
6. **Tier-2 single-client concentration.** Unchanged from v2 — Bulcs close + 4 retainers target by 31 Dec 2026.
7. **Capital.** Continuous-loop $0 local. Paid-tier cap $1,200/mo. Tier-2 income $5.9K/mo (CCW) → $9K/mo (+ Duncan) → $12K+/mo (+ Bulcs). Net burn ≈ $0 if Duncan + Bulcs land by 30 Sep 2026. **Decision needed:** §7 budget cap ratification.
8. **Mac Mini SPOF + macOS permission resets** — unchanged from v2.
9. **NotebookLM API stability** — unchanged from v2.
10. **Hermes audit-trail blackouts under load** — unchanged from v2.
11. **Insurance partner cycle length.** Insurer partnership conversations take 6-12 months. **Mitigation:** PM-ATIA opens conversations Q3 2026 (12 months ahead of Q2 2027 MoU target).

### Open questions

1. Final ATIA name + 6 sub-body names — §7 Fork 2
2. First non-restoration vertical to launch (Carpet vs IEP) — §7 Fork 3
3. UK vs US beachhead order — §7 Fork 4
4. DR build path — §7 Fork 5
5. CARSI delivery + Phill commit to S500 + S520 — §7 Fork 6
6. RA pricing model — §7 Fork 7
7. Synthex 2028 path — §7 Fork 8
8. Greenfield co-founder hires + scout-subagent activation date — §7 Fork 9
9. Insurance partner first-3 — §7 Fork 10
10. Inaugural ATIA conference city + week — §7 Fork 11
11. Tier-2 budget cap — §7 other inputs
12. Bulcs proposal close date — pipeline status per [[bulcs-holdings]]
13. RA paid-subscriber go-live date — TBD-by-Phill
14. CCW NPS baseline survey date — TBD-by-Phill
15. Duncan signature no-go cutoff — TBD-by-Phill
16. NRPG / CCPA / NIEPA founding-member fee collection mechanism (Stripe vs Xero) — TBD-by-Phill
17. Mac Mini RAM upgrade — TBD-by-Phill

---

## 9. Next 90 days — quarterly OKRs (corrected)

**Objective:** Light ATIA. Two verticals live (Restoration full stack + Carpet Cleaning via CCW). ATIA brand identity locked. First 50 NRPG founding firms + first 20 CCPA founding firms + CARSI v1 (S500 + S520) live with first 20 paid enrolments.

| KR | Tier | Metric | Target | Owner |
|---|---|---|---|---|
| KR1 | Tier 1 — ATIA | ATIA brand identity locked (domain + trademark filed + mark designed) | Done by 30 Sep 2026 | PM-ATIA + Phill |
| KR2 | Tier 1 — Restoration | NRPG founding cohort signed | 50 firms × $799 avg = $40K | PM-Restoration + Toby + Coutis |
| KR3 | Tier 1 — Carpet | CCPA founding cohort signed | 20 firms × $799 avg = $16K | PM-Carpet + Toby |
| KR4 | Tier 1 — Restoration | RA paid technicians | 100 by 30 Sep 2026 | PM-Restoration |
| KR5 | Tier 1 — Restoration | DR multi-tenant rebuild | Sprint 1 of 4 complete; 3 pilot firms identified | PM-Restoration |
| KR6 | Tier 1 — CARSI | CARSI v1 syllabus live (S500 + S520) | Both certs published; first 20 paid enrolments by 30 Sep 2026 | Phill (author/delivery) + PM-CARSI |
| KR7 | Tier 1 — IEP | NIEPA charter drafted + Bulcs retainer signed | Bulcs signed by 31 Jul 2026; NIEPA charter committed | PM-IEP + Phill + Ivi |
| KR8 | Tier 1 — aggregate | Tier-1 aggregate ARR | $80K (NRPG $40K + CCPA $16K + RA $20K + CARSI $30K minus overlap) | All Tier-1 PMs |
| KR9 | Tier 2 — retainers | Tier-2 contracted ARR | $85K (CCW $33K + Duncan $37.4K + Bulcs $15K) | PM-Sales-Funnel + Phill |
| KR10 | Infra | Pi-CEO Board Phase B live | Weekly cadence + audit rows | PM-Core |
| KR11 | Infra | Meeting-capture pipeline | < 60s round trip | PM-Core + PM-Synthex |
| KR12 | Infra | Mobile CEO interface live | PWA + biometric + voice-note + manual dispatch to all 8 Tier-1 PMs + 3 Tier-2 PMs | PM-Unite-Group |
| KR13 | Infra | Senior PM bots wired (8 new) | PM-ATIA + PM-Restoration + PM-Carpet + PM-IEP + PM-Plumbing-stub + PM-HVAC-stub + PM-PressureWashing-stub + PM-CARSI + PM-Sales-Funnel each autonomously claiming + executing | PM-Core |
| KR14 | Infra | Hermes computer_use replay-pass | ≥ 95% 7d rolling | PM-Core |
| KR15 | Tier 2 | CCW NPS baseline | ≥ 60 first survey | PM-Carpet (via CCW-CRM ticket data) |
| KR16 | Tier 2 | Synthex content output per Tier-1 driver per week | ≥ 2 artefacts per active vertical (Restoration + Carpet) + 1 per ATIA meta | PM-Synthex |
| KR17 | Infra | Critical alerts (6-pager) | 0 missed; ≤ 2 false-positives/week | Margot + Orchestrator |

---

## 10. Verification — what to read to verify every claim

| Claim | Source |
|---|---|
| $33K CCW ARR | [[ccw]] · [[businesses-overview]] · `ccw_support_tickets` Supabase `lksfwktwtmyznckodsau` |
| $37.4K Duncan committed | [[proposal-duncan-itr-platform-2026-05-13]] |
| Bulcs Holdings inbound, Ivi Sims IAQA Board Director | [[bulcs-holdings]] |
| RA App Store build 1.0(10) approved 2026-05-08 | [[restore-assist]] |
| DR ↔ CORE positioning INTERNAL ONLY | [[project_disaster_recovery_positioning]] |
| NRPG tier pricing $299/$799/$2,499 | [[industry-association-vision-2026]] |
| Phill + Toby co-founder structure | [[project_industry_association]] |
| NRPG = National Restoration Practitioners Group | Per user directive (v2 confirmation) |
| ATIA umbrella thesis | Founder directive 2026-05-14 p.m. (this v3) |
| 6-vertical scope (Restoration, Carpet, IEP, Plumbing, HVAC, Pressure Washing) | Founder directive 2026-05-14 p.m. |
| IAQ Magazine editorial seat | [[restoration-industry-context]] §11.1 |
| CCW holiday window 11–25 May 2026 | [[ccw]] · memory `project_ccw_holiday_window` |
| Hermes computer_use exists | `/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/swarm/screen/hermes_dispatch.py` |
| Pi-CEO Board Phase A shipped | `swarm/board/personas.py` + `wiring.py` |
| Gemma 4 rejected, qwen3:14b active | [[pi-ceo-architecture]] |
| 318 Python modules in swarm/ | `find` 2026-05-14 |
| 27 Hermes cron jobs | [[hermes-agent-sprinkle-audit-2026-05-11]] |
| Unite-Group INTERNAL ONLY | [[feedback_unite_group_only]] |
| ASTM D22 / IAQA Board / IAQ Magazine Australia (Ivi credentials) | [[bulcs-holdings]] |

---

## Cross-refs

[[master-plan-2b-by-2028-v2]] · [[master-plan-2b-by-2028-v1]] · [[pathway-to-2b-2026-2028]] · [[industry-association-vision-2026]] · [[association-launch-plan-2026]] · [[restore-assist]] · [[restoration-industry-context]] · [[dr-nrpg]] · [[carsi]] · [[ccw]] · [[bulcs-holdings]] · [[proposal-duncan-itr-platform-2026-05-13]] · [[pi-ceo-architecture]] · [[unite-group-nexus-architecture]] · [[agency-hierarchy]] · [[exit-thesis]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[synthex]] · [[founder]] · [[now]] · [[computer-use-integration-2026-05-13]] · [[autonomous-sdlc]] · [[decision-frameworks]] · [[project_disaster_recovery_positioning]] · [[project_industry_association]] · [[feedback_unite_group_only]] · [[iaq-building-science-initiative]] · [[loss-adjusters]] · [[competitor-service-stack-2026-05-11]]
