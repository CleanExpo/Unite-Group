---
type: marketing-research
artifact: launch-runbook
wave: 0
campaign: nrpg-association-wave0-2026-05-11
brand: nrpg
spokesman-brand: john-coutis
launch-date: 2026-05-18
window: T-30 → T+30 (2026-04-18 → 2026-06-17)
updated: 2026-05-11
status: founding-draft
forbidden-pronouns: We, Our, I, Us, My
paid-media-wave0: false
---

# Launch Runbook — Expanded NRPG Industry Association (Wave 0)

> **INTERNAL — Unite-Group portfolio only — do not distribute publicly 2026-05-11**

Skill: `marketing-launch-runbook` · Wave 4 · job `nrpg-association-wave0-2026-05-11`.
Reads: [[positioning-doc]] · [[icp-research]] · [[channel-plan]] · [[seo-brief]] · [[pricing-research]] · [[landing-spec]] · [[founding-partners-memo]] · [[linkedin-launch-thread]] · [[social-content-pack]] · wave-plan JSON.

The single source of truth for the calendar that ships Wave 0. Not strategy — orchestration. Every drop has a named owner, an upstream gate, a verifiable success criterion, and a written contingency. Channel-plan locked the D0-D5 cadence; this runbook puts dates, hours, and dependencies against it.

T-0 launch day: **Mon 18 May 2026**. T-30 → T+30 window: **Sat 18 Apr 2026 → Wed 17 Jun 2026**.

---

## Header — success-gate dashboard

| Gate | Target | Deadline | Owner | Last-known status (2026-05-11) |
|---|---|---|---|---|
| Coutis engagement contract signed | 1 signature | 2026-05-25 (T+7) | Phill (lead) · Coutis (counterparty) · Legal review | DRAFT — 7 consent items outstanding ([[founding-partners-memo]] §Coutis consent items); negotiation in flight |
| First Coutis video views | ≥1,000 in 7d window | 2026-05-26 (T+8; D1+7) | Phill (LinkedIn post) · `remotion-render-pipeline` (production) · Coutis (native audio record) | NOT FILMED — audio not recorded; ElevenLabs clone NOT licensed; storyboard ready |
| Interest-list signups | ≥50 | 2026-05-31 (T+13) | `marketing-analytics-attribution` (tracking) · Phill + Toby (drive) | 0 — form not live (landing page not yet built) |

Cross-gate dependency: gate 1 (contract) unblocks gate 2 (video legitimacy on LinkedIn) which unblocks gate 3 (top-of-funnel signup volume). A contract slip is a launch-credibility wound, not just a milestone miss.

---

## T-30 to T-15: Foundation phase (Sat 18 Apr → Sun 3 May)

**Status check (today, T-7 / 11 May):** large slabs of foundation work landed late because the wave brief was set on 2026-05-11. Treat the items below as compressed and partly retroactive. Where work has already happened, mark as DONE; where it has not, the timeline is materially tighter than a normal product-launch curve.

### T-30 → T-22 (18 Apr → 26 Apr): kickoff + Coutis contract draft

| # | Task | Owner | Gate | Dependency | Status |
|---|---|---|---|---|---|
| F-01 | Coutis engagement contract — first draft | Phill | Section 1-7 covered (scope, exclusivity, IP, image rights, OAM protocol, editorial control, retainer/term) | Coutis verbal alignment | RETROACTIVE — must be drafted by T-21 (27 Apr) at the latest; **timing-risk flagged: signed-by date 25 May = T+7, so legal turnaround window is ~5 weeks total** |
| F-02 | Wave-plan brief locked | Phill + `marketing-orchestrator` | Wave-plan JSON committed to `Pi-Dev-Ops/marketing-studio/.research/wave-plans/` | — | DONE 2026-05-11 |
| F-03 | Positioning + ICP research | `marketing-positioning` + `marketing-icp-research` | Both artifacts pass `brand-guardian` minimum 7-mean rubric | Wave 1 inputs | DONE — [[positioning-doc]] + [[icp-research]] live |
| F-04 | Brand voice + forbidden-pronouns guard checked | `brand-guardian` | NRPG voice (authoritative + expert) verified; Coutis-spokesperson skin verified | nrpg.ts + john-coutis.ts BrandConfig | DONE |

**Risks (T-30 → T-22):**
- Coutis verbal alignment turning into a "we'll sort it later" handshake. If the contract is not in legal review by T-21 (27 Apr), the 25 May signature gate is mathematically at risk.
- Brand-guardian rubric failing on Coutis-related copy because the consent items (image, OAM, editorial control) are unresolved. The fix is upstream — contract before copy.

### T-21 → T-15 (27 Apr → 3 May): channel + SEO + copy + audio prep

| # | Task | Owner | Gate | Dependency |
|---|---|---|---|---|
| F-05 | Channel plan locked | `marketing-channel-strategist` | LinkedIn / YouTube / Web triad chosen; kill-list documented | Wave 1 outputs | DONE — [[channel-plan]] |
| F-06 | SEO brief — primary cluster validated | `marketing-seo-researcher` | "ANZ restoration association", "Australian restoration peak body", "Member-as-a-Service restoration" cluster ranked | Channel plan | DONE — [[seo-brief]] |
| F-07 | Pricing tiers verified + locked | `marketing-orchestrator` + Phill | 4 tiers anchored to ≥2 public competitor data points each | Pricing research call list | LOCKED 2026-05-11 — 6 outstanding competitor verification calls deferred to T-14 → T-7 (see F-12); Toby anchor MEDIUM confidence |
| F-08 | Landing-spec drafted | `marketing-copywriter` (artifact: landing-spec) | Section 1-7 covered (hero, proof, pricing, FAQ, schema, footer) | Positioning + pricing | DONE — [[landing-spec]] |
| F-09 | Founding-partners memo + LinkedIn launch thread + social pack drafted | `marketing-copywriter` + `marketing-social-content` | All Wave-3 deliverables present | Landing-spec, positioning | DONE |
| F-10 | Coutis audio recording session **scheduled** | Phill (organiser) · Coutis (talent) | Calendar invite confirmed, script delivered T-10, recording slot ≥45 min, backup slot T-9 | Storyboard from `remotion-screen-storyteller` | NOT SCHEDULED — **critical-path action this week**. Without an audio file by T-10 (8 May → actually 8 May has passed; revised target T-8 = 10 May → already missed; new floor T-7 = 11 May TODAY for booking, recording by T-5 = 13 May) |

**Risks (T-21 → T-15):**
- **F-10 is the single biggest gating risk in the foundation phase.** Coutis lives on the keynote circuit; his diary fills 6-8 weeks out. The booking conversation must happen today.
- ElevenLabs voice clone is NOT licensed (per wave-plan constraint). The 75s video must use Coutis's native voice. If he cannot record by T-5, the video drops to an on-screen-text-only composition — viable but lower halo-impact.
- Pricing-tier verification calls deferred (see F-12) leave the AIRAH / HIA / MBA / ISSA Oceania / CASANZ / RIA-US dues bands as inferred not verified. Any landing-page copy that quotes "$X cheaper than" needs to be defensible.

---

## T-14 to T-7: Pre-launch phase (Mon 4 May → Mon 11 May)

This phase compresses heavily under the 18-May launch date. Today (2026-05-11) is **T-7**. Everything below T-14 → T-8 has either already shipped or has slipped right.

### T-14 → T-10 (4 May → 8 May): asset production + verification

| # | Task | Owner | Gate | Dependency |
|---|---|---|---|---|
| P-01 | Landing page built end-to-end | `frontend-design` dispatch (Vercel + Next.js, `unitegroup.in` repo) | All landing-spec sections live; form posts to Supabase `interest_signups` table; LinkedIn Insight Tag + GA4 wired; Schema.org JSON-LD validates against schema.org validator + Google Rich Results Test (Organization + Service + FAQPage blocks) | [[landing-spec]] | IN FLIGHT — must hit dev complete by T-7 |
| P-02 | Founding-partners deck (8 slides) | `frontend-slides` Wave-4 dispatch | Per-slide brand-guardian pass; deck PDF + HTML version exported | [[founding-partners-memo]] + brand-config | IN FLIGHT |
| P-03 | Coutis 75s video — script + storyboard | `remotion-screen-storyteller` | Storyboard JSON committed to remotion-studio; script ≤180 words for 75s pace; OAM/Half-a-Body-Full-of-Life claim bank locked; on-screen text variant pre-written as fallback | Coutis editorial-control consent (item #6 of 7) | IN FLIGHT |
| P-04 | Coutis audio recording session **happens** | Coutis (talent) · Phill (producer) | WAV/MP3 master delivered to remotion-studio; ≥1 retake per scene; backup readthrough recorded | F-10 booking | **CRITICAL — must record no later than T-5 (Wed 13 May)** |
| P-05 | Coutis 75s video render | `remotion-orchestrator` → `remotion-composition-builder` → `remotion-render-pipeline` | MP4 1920×1080, ≤30MB for LinkedIn native upload, ≤90s duration, codec + resolution + size validated by pipeline; YouTube cut master ready | P-03 + P-04 | Triggers immediately upon audio receipt |
| P-06 | Founder-tier signup counter — backend wired | `frontend-design` (eng) | Counter increments on Supabase row insert; visible widget on landing page hero; default state "0 / 100"; admin can manually adjust if a peer signs offline | P-01 form working | Eng dep |

### T-9 → T-7 (9 May → 11 May): brand-guardian gate review + outreach prep

| # | Task | Owner | Gate | Dependency |
|---|---|---|---|---|
| P-07 | **Brand-guardian full-package gate review** | `brand-guardian` | Pass on ALL of: landing page, founding-partners memo, founding-partners deck, all 6 LinkedIn posts (D0-D5), YouTube video + description, Telegram intro, social-content-pack. Per-asset score ≥7 mean, no dimension <6. | All Wave-3 + P-01/P-02/P-03 drafts complete | **HARD GATE — nothing publishes without green-light** |
| P-08 | Schema.org JSON-LD validates clean | `frontend-design` + manual check | Three blocks (Organization, Service, FAQPage) pass schema.org validator + Google Rich Results Test with zero errors and zero warnings on schema.org-recommended properties | P-01 landing live in staging | Eng dep |
| P-09 | Founding-partner outreach starts — DM templates ready | `marketing-copywriter` + Phill | Personalised DM template for 25-35 named targets across LinkedIn + WhatsApp + email; outreach tracker spreadsheet live; target: 5-10 named founding partners confirmed signed up BEFORE public T-0 launch | Memo + deck approved (P-07) | Phill executes outreach personally |
| P-10 | **D4 scarcity-post fallback variant pre-written** | `marketing-copywriter` | Three variants drafted: A) "67 of 100 remaining" (assumes Founder signups ≥30 by Thu EOD); B) "early-mover wedge" reframe (no quoted number, assumes 15-29); C) Toby-amplification of D3 substitute (assumes <15). All three live in `/Users/phill-mac/2nd Brain/2nd Brain/Wiki/marketing-wave0-association-2026-05-11/social-content-pack.md` D4 variants section | Documented credibility risk per channel-plan §Wave-0 Measurement | **NON-NEGOTIABLE — write this before T-3** |
| P-11 | Telegram alert channel wired + LinkedIn Insight Tag firing | `marketing-analytics-attribution` | Telegram alert on every Supabase signup row; LinkedIn Insight Tag confirmed in LinkedIn Campaign Manager build-audience view (≥1 visit logged); GA4 event stream live | P-01 + P-06 | Cron dep |
| P-12 | Lead-capture form — end-to-end Supabase test | `frontend-design` + Phill (manual test) | Submit a test signup with `utm_source=runbook-smoketest`; confirm row lands in `interest_signups`, Telegram pings, LinkedIn Insight Tag fires, GA4 logs event, autoresponder sends | P-01 + P-11 | Pre-T-3 |
| P-13 | 6 competitor pricing verification calls completed | Phill (caller) | AIRAH / HIA / MBA / ISSA Oceania / CASANZ / RIA-US dues each confirmed or replaced with "[Founder verification call required]" footnote on landing page | Pricing-research outstanding list | If calls don't land by T-3, **all "$X cheaper than" comparison copy is downgraded to inferred-range language** |
| P-14 | Toby anchor confirmation call (30 min spend-audit) | Phill (caller) · Toby | Toby's full monthly SaaS + insurance + agency + cert spend confirmed; pricing-research Toby anchor moves from MEDIUM to HIGH confidence | Post-26 May per [[ccw-holiday-window]] — **slips past T-0 launch**. Workaround: launch quotes use the MEDIUM-confidence $5k/mo midpoint with conservative range | CCW holiday gate |

**Risks (T-14 → T-7):**
- **Coutis audio (P-04) is the single biggest critical-path item between T-7 and T-0.** If audio slips past T-5 (Wed 13 May), the video either ships on-screen-text-only (lower halo impact, reduces probability of hitting the 1k-views gate) or D1 slips. D1 slipping cascades to the entire D0-D5 cadence.
- Brand-guardian (P-07) failing any single asset blocks the launch package. Build in 24h re-review buffer.
- Toby anchor call (P-14) slipping past T-0 is acknowledged and accepted — copy uses MEDIUM-confidence language, not numeric specifics on the landing page.
- Founding-partner outreach (P-09) cannot start until P-07 brand-guardian gate passes on the memo — direct dependency.

---

## T-3 to T-0: Launch eve (Fri 15 May → Mon 18 May)

### T-3 (Fri 15 May)

| # | Task | Owner | Gate |
|---|---|---|---|
| E-01 | Final landing-page audit — mobile + desktop | `frontend-design` + Phill | Mobile screenshots (iPhone 14 baseline) + desktop screenshots (1440px baseline) reviewed; Lighthouse score ≥90 on Performance, Accessibility, Best Practices, SEO; Cumulative Layout Shift <0.1; Time-to-Interactive <3s | LIGHTHOUSE PASS = blocker if not hit |
| E-02 | D0 post copy pre-staged in LinkedIn drafts | Phill | Drafts ready in LinkedIn personal account; image attached if document-carousel; preview rendered | — |
| E-03 | D4 fallback variants A/B/C committed to social-content-pack | `marketing-copywriter` | All three variants live in [[social-content-pack]]; decision-tree threshold numbers locked (see launch-week section below) | P-10 |

### T-2 (Sat 16 May)

| # | Task | Owner | Gate |
|---|---|---|---|
| E-04 | Founding-partner pre-brief call — Phill + Toby | Phill (host) · Toby (founding-partner peer voice) | 30-min call; both review D0 thread + D1 video + D3 Toby amplification post; Toby's D3 copy approved verbatim or red-pen'd | Toby availability per CCW holiday — confirm pre-T-7 |
| E-05 | Coutis Q-A loop — does he see D0/D1/D2/D3 in advance? | Phill | Either YES with sign-off captured in writing, or explicit "no surveillance, ship without his review" decision logged | Coutis consent item #6 |

### T-1 (Sun 17 May)

| # | Task | Owner | Gate |
|---|---|---|---|
| E-06 | Brand-guardian green-light on full launch package | `brand-guardian` | Final pass over D0 thread + D1 video master + D2 carousel + D3 Toby ghost-written post + D4 (all 3 variants) + D5 brand-page recap | **HARD GATE — Phill does not post without this** |
| E-07 | Founder-tier counter — initialise visible state | `frontend-design` | Counter shows actual current state (e.g. "8 / 100" if 8 founding partners signed via outreach pre-launch) | P-06 + P-09 outreach status |
| E-08 | War-room channel pinned — Telegram + Linear | Phill | Telegram channel pinned for D0 status; Linear `nrpg-association-wave0-2026-05-11` project pinned with each D0-D5 drop as a ticket | — |
| E-09 | Kill-criteria reviewed | Phill | Written decision tree: pause launch if (a) brand-guardian flags critical voice violation discovered in production, (b) Coutis withdraws video consent at last minute, (c) landing page goes down >30 min, (d) press-leak surfaces NRPG positioning before D0 post lands | — |

### T-0 = Mon 18 May (launch day) — war-room mode

D0-D5 cadence is locked by [[channel-plan]] §Cross-Channel Sequencing. Hours below assume Sydney AEST (UTC+10); Phill's LinkedIn audience peaks 9-11am AEST per LinkedIn algorithm signal.

| Time | Drop | Channel | Asset | Owner | Pre-action gate | Contingency |
|---|---|---|---|---|---|---|
| 07:00 AEST | Landing page final smoke test | Web | `unitegroup.in/association` | Phill | Submit test signup, confirm Supabase row + Telegram ping + GA4 event + LinkedIn Insight Tag fire | If smoke fails → 30-min hold + eng on-call; if page-down >30 min → invoke kill-criteria E-09 |
| 09:00 AEST | **HERO POST: Phill launch post** | LinkedIn (Phill personal) | linkedin-launch-thread D0 post (per [[linkedin-launch-thread]]) | Phill | Brand-guardian green-light from T-1; landing-page link tested | If LinkedIn flags / shadow-bans → repost from NRPG brand page at 10:30 AEST with link-in-first-comment |
| 09:30 AEST | Founding-partner DM second wave | LinkedIn DM + WhatsApp | Personalised follow-up to anyone in P-09 outreach list who has not yet converted | Phill | DM template approved | — |
| End-of-day (17:00 AEST) | **KPI checkpoint** | All | Signups count, post impressions, profile views | Phill | Telegram alert digest | If signups <5 at EOD → escalate D1 amplification; if signups ≥15 → keep cadence |

---

## T+1 to T+5: Launch week (Tue 19 May → Sat 23 May)

D1-D5 cadence follows channel-plan §Cross-Channel Sequencing. Daily KPI checks at end-of-day (17:00 AEST) via Telegram alert digest.

### T+1 = D1 (Tue 19 May) — Coutis video drop

| Time | Drop | Owner | Pre-action | Contingency |
|---|---|---|---|---|
| 08:00 AEST | YouTube upload — Coutis 75s intro video | Phill (uploader) · `remotion-render-pipeline` (asset) | Video master + thumbnail + description ready from T-2 | If render bug discovered last-minute → ship on-screen-text-only variant; if Coutis withdraws consent overnight → swap to a 60s "founding-partners reveal" composition without his appearance |
| 09:00 AEST | LinkedIn native cross-post (not re-share) | Phill | Same video, separately uploaded to LinkedIn native; Coutis tagged on LinkedIn (his account) | Same as above |
| End-of-day | KPI checkpoint — views (LinkedIn + YouTube combined) | Phill | Telegram alert | If <100 combined views EOD D1 → escalate Phill personal DMs to 50 named contacts |

### T+2 = D2 (Wed 20 May) — Phill Pain #3 carousel

| Time | Drop | Owner | Pre-action | Contingency |
|---|---|---|---|---|
| 09:00 AEST | LinkedIn doc-carousel — 6 slides from founding-partners memo extract; pain-led copy (Pain #3 — failed agencies); Member-as-a-Service positioning | Phill | Brand-guardian green-light from T-1; PDF carousel rendered | If carousel rejected on technical grounds (file size) → ship as single-image post with 3-tier price block + memo PDF in comment |

### T+3 = D3 (Thu 21 May) — **TRUST-MULTIPLIER DAY** — Toby amplification

| Time | Drop | Owner | Pre-action | Contingency |
|---|---|---|---|---|
| 09:30 AEST | LinkedIn post from Toby personal account — "why I signed on as founding partner" peer voice | Toby (poster) · `marketing-copywriter` ghost-write reviewed by Toby T-1 | Toby availability (CCW holiday window ends 25 May; **D3 = 21 May, falls INSIDE Toby's holiday**) | **CRITICAL CONTINGENCY:** if Toby cannot post personally during holiday → either (a) pre-schedule post via LinkedIn scheduler T-3 with Toby's written consent on the exact copy, OR (b) Toby drops the post on D6 (Sun 24 May) just as he returns, cadence slips one day. **Holiday means scheduling is non-negotiable — must lock copy by T-5 (Wed 13 May)** |
| 10:00 AEST | Facebook Restoration Trade Talk Australia (closed group) — Toby peer-to-peer post | Toby | Group admin DM approval ≥48h in advance; copy synced with LinkedIn version | If group admin blocks → Toby posts to "Aussie Carpet Cleaners" + "Water Damage Restoration Australia" as fallback |

### T+4 = D4 (Fri 22 May) — **SCARCITY DAY — fallback decision tree**

**Decision threshold (Thu 21 May 17:00 AEST EOD):** check `interest_signups` table for `tier_interest = 'Founder'` count.

```
┌──────────────────────────────────────────────────────────────┐
│ D4 SCARCITY-POST FALLBACK DECISION TREE                       │
│ Decision time: Thu 21 May 17:00 AEST                          │
│ Decision-maker: Phill (final call); `brand-guardian` advises │
└──────────────────────────────────────────────────────────────┘

  Founder-tier signups by Thu EOD?
       │
       ├─── ≥30 ──────────→  VARIANT A: ship "67 of 100 remaining"
       │                     scarcity post as drafted in
       │                     [[social-content-pack]] D4.A.
       │                     Number quoted matches actual count.
       │                     Brand-credibility risk: ZERO if number is real.
       │
       ├─── 15-29 ────────→  VARIANT B: reframe to "early-mover wedge"
       │                     variant. No specific count quoted.
       │                     Copy line: "Founder tier filling — lifetime
       │                     rate-lock window closing as the first cohort
       │                     locks in." Hard-codes urgency without a number
       │                     that could read as manufactured.
       │
       └─── <15 ──────────→  VARIANT C: HOLD scarcity post entirely.
                             Switch D4 to a Toby D3 follow-up
                             amplification: Toby reposts his D3 with one
                             new sentence (a peer reply / firm name that
                             agreed overnight). Re-attempt scarcity D7-D9
                             if signups have climbed by then.
                             Brand-credibility prefers silence over a
                             manufactured number.
```

| Time | Drop | Owner | Pre-action | Contingency |
|---|---|---|---|---|
| 09:00 AEST | LinkedIn scarcity post — variant A / B / C per Thu EOD count | Phill | Decision logged Thu 21 May 17:00; chosen variant copy locked Thu 22:00 | If counter mechanism breaks (Supabase row count wrong) → revert to variant B by default |

**Why this decision tree matters:** documented in channel-plan §Wave-0 Measurement Plan failure-modes. The "67 of 100" line works only if the number is real. Manufactured-urgency lies are the fastest way to lose authoritative-voice credibility in a B2B trade audience that already distrusts marketing. The threshold of 30 is set to give a believable "majority filled" framing; below 30, the number reads thin even if accurate.

### T+5 = D5 (Sat 23 May) — brand-page recap

| Time | Drop | Owner | Pre-action | Contingency |
|---|---|---|---|---|
| 10:00 AEST | NRPG brand page recap post — week's announcements, landing-page link, no new info | `marketing-social-content` | Week-in-review copy drafted T-3 from social-content-pack D5 | If brand page has zero followers (likely) → cross-post from Phill personal as a "in case you missed this week" rollup |

---

## T+7 (Mon 25 May): Coutis contract gate

| # | Task | Owner | Pass criterion | Escalation |
|---|---|---|---|---|
| G-01 | Coutis engagement contract — signed | Phill | Counter-signed PDF in 1Password vault; Linear ticket closed | If unsigned → (a) founders-convene 24h call (Phill + Coutis + legal); (b) re-frame all post-D6 LinkedIn copy to remove "Hosted by John Coutis OAM" until resolved per channel-plan failure-mode; (c) consider 2-week extension to T+14 deadline with founder-override authorisation |
| G-02 | First-Coutis-video views ≥1,000 in 7d | Phill | LinkedIn analytics + YouTube analytics combined ≥1,000 cumulative views since D1 09:00 AEST | If <1,000 → paid amplification authorised (this is when paid-media organic-only Wave-0 constraint unblocks per [[channel-plan]] §Wave-0 Measurement Plan failure-modes); LinkedIn Boost on Phill's D1 post first, ~$200 AUD test spend |
| G-03 | Wave-1 paid-retargeting eligibility check | `marketing-analytics-attribution` | LinkedIn Insight Tag has logged ≥300 site visitors since T-0; retargeting pool can now be built | If <300 visitors → push to T+14; if pool ready, no paid spend yet — pool builds passively for Wave 1 |

---

## T+14 (Mon 1 Jun): Pivot decision

| # | Task | Owner | Pass criterion | Pivot trigger |
|---|---|---|---|---|
| V-01 | Founding-partner conversion rate vs target | Phill | ≥10 Founder-tier signups by T+14 (10% of 100-seat cap, healthy first-fortnight pace) | If <10 → review founding-partner outreach quality; re-run targeted DM wave to 50 named contacts |
| V-02 | Pillar 4 (Media) cadence locked for ongoing run | `marketing-social-content` | Week-3 onwards content calendar published: 3 Phill personal posts/week + 1 brand-page post/week + 1 founding-partner post/week | — |
| V-03 | Wave-1 dispatch trigger or HOLD | `marketing-orchestrator` + Phill | Decision logged: dispatch Wave 1 (paid retargeting + IICRC alumni outreach + Rolling Success podcast relaunch + cert program launch + broader event push) OR hold pending stronger Wave-0 signal | If 2 of 3 success gates green at T+14 → dispatch Wave 1; if 1 of 3 → hold Wave 1 paid spend, run a Wave-0.5 cycle of organic doubling-down; if 0 of 3 → emergency founders-convene |

---

## T+30 (Wed 17 Jun): Gate review

| # | Task | Owner | Pass criterion |
|---|---|---|---|
| R-01 | Three success gates assessed | Phill + `marketing-orchestrator` | Coutis contract: signed (Y/N); video views: ≥1,000 in 7d (Y/N); interest signups: ≥50 by 2026-05-31 (Y/N) |
| R-02 | Wave-1 plan locked | `marketing-orchestrator` + `marketing-campaign-planner` | Paid retargeting brief, cert program launch brief, broader event push brief — all three drafted and queued for Wave-1 dispatch |
| R-03 | Retro logged in wiki | Phill | `Wiki/marketing-wave0-association-2026-05-11/retro-2026-06-17.md` — what worked, what didn't, what surprised, attribution model assessment |

---

## War-room protocol

- **Telegram channel:** `nrpg-wave0-warroom` (private, Phill + Toby + brand-guardian agent + on-call eng). Pinned T-1 17:00.
- **Linear project:** `nrpg-association-wave0-2026-05-11` — each D0-D5 drop is a ticket; status updates flow into the Telegram channel via webhook.
- **Designated approver for in-flight changes:** Phill (sole). Brand-guardian advises; Phill calls.
- **Kill criteria** (any one triggers a launch pause):
  1. Brand-guardian flags a critical NRPG voice violation discovered post-T-0
  2. Coutis withdraws video consent at last minute or post-D1
  3. Landing page down >30 min during launch week
  4. Press-leak surfaces NRPG positioning before D0 post lands
  5. Toby (peer-voice pillar) personal credibility event during the holiday window

---

## Cross-skill dependency map

- **Founding-partner outreach (P-09) cannot start until brand-guardian green-lights the memo (P-07)** — which depends on Coutis consent items #4 (OAM) + #5 (image rights) being either resolved or unambiguously excluded from the memo wording. If contract is still in draft, the memo's Coutis-section must use generic spokesman language not bound to specific OAM honourifics.
- **D3 Toby amplification post falls inside Toby's holiday window (11-25 May 2026)** per [[ccw-holiday-window]]. Pre-scheduling with Toby's written copy approval at T-5 is mandatory, not optional.
- **Coutis 75s video render (P-05) blocks on audio (P-04) blocks on session scheduling (F-10).** Each step has roughly 24-48h slippage tolerance before the D1 cadence breaks.
- **Schema.org JSON-LD (P-08) blocks the landing page launch (P-01)** — Google Rich Results Test failure means brand-defence SEO on launch week is degraded.
- **Toby anchor confirmation call (P-14) slipping past T-0 is accepted** — landing page copy avoids quoting a specific Toby spend number; uses inferred range.

---

## Cross-references

- [[channel-plan]] — D0-D5 cadence (referenced; this runbook is the per-day execution layer)
- [[positioning-doc]] — manifesto, tagline, voice
- [[icp-research]] — Toby archetype, watering holes, Coutis fit
- [[seo-brief]] — primary cluster, on-page SEO requirements
- [[pricing-research]] — verified tier anchors, outstanding verification calls
- [[landing-spec]] — section-by-section build spec for `unitegroup.in/association`
- [[founding-partners-memo]] — outreach asset + 7 Coutis consent items
- [[linkedin-launch-thread]] — D0-D5 post copy
- [[social-content-pack]] — D4 variants A/B/C live here
- [[john-coutis-content-kickoff]] — Coutis-brand boundaries + consent items
- [[ccw-holiday-window]] — Toby availability constraint
- `Pi-CEO/Pi-Dev-Ops/marketing-studio/.research/wave-plans/nrpg-association-wave0-2026-05-11.json` — locked wave plan + success gates
