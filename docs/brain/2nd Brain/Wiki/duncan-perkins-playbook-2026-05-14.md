---
type: wiki
updated: 2026-05-14
---

# Duncan Perkins / "Otto" — 100% Green Delivery Playbook

**Client:** Duncan Perkins — Home Loan Essentials (Australian mortgage broker)
**Product:** Dimitri ITR Platform — Build Engagement (working name "Otto"; candidates Otto / Sorted / Beau / Tick / Lodgey)
**Status:** onboarding · signature pending · slug `dimitri-itr` · stripe_customer_id NULL
**Board verdict:** 2026-05-14, 4 parallel agent deliberation (Margot · CTO · CFO · CMO)

This page is the **single durable playbook** Pi-CEO uses for any new paying client. Duncan is its first instance.

## The 7-stage lifecycle (Margot)

| Stage | Owner | Outcome | Artefact |
|---|---|---|---|
| 1 — Qualify | Phill (30m call) | ICP fit + BANT confirmed | `client-brief.md` |
| 2 — Scope | Phill signs · Margot drafts | Fixed-price SOW + milestone schedule | Signed SOW |
| 3 — Kickoff | Phill (45m) · Hermes provisions | Linear + Supabase + Telegram channel + portal live | Hour-1 portal URL |
| 4 — Discovery | Swarm only | Architecture doc + risk register | 12-Q intake answers (Supabase) |
| 5 — Build sprints | Swarm only | Weekly Proof Video + staging URL | PR-triggered videos |
| 6 — Approval cycles | Swarm captures | Signed approvals per milestone | Magic-link portal (sha256 hash) |
| 7 — Renewal / Expand | Phill QBR | Month-3 NPS ≥ 9 | QBR deck + expansion SOW |

**Founder bottleneck audit:** Stages 1, 2, 3 require Phill (trust is sold by a human in 2026). Stages 4, 5, 6, 7-drafting are **100% agentic** — if Phill is doing anything other than reviewing in those stages, autonomy is broken.

## The 5 "wow vs my last agency" Duncan moments (Margot)

1. **Hour-1 portal** — Within 60 min of signature, Duncan has a live URL with Linear board, Supabase staging, and a Loom intro from "Margot".
2. **The unprompted Loom** — Friday opens with a 4-min walkthrough of the week's build, before he asks.
3. **Decision log he didn't write** — Every Otto design decision auto-logged with alternatives + his recorded approval clip.
4. **The mid-week save** — Day 9 agent detects + fixes Duncan's webhook before he notices.
5. **Numbers, not vibes** — Month-1 review opens with `47 tickets closed · 3.2-day cycle · 99.4% CI green · $X saved`.

## Green / Yellow / Red rubric

- **Green** — artefact exists, signed, on-schedule, CI green, no Duncan-side blockers >24h.
- **Yellow** — any artefact >24h late OR Duncan unresponsive >48h OR CI red >2h OR scope creep detected.
- **Red** — signed milestone missed OR Duncan asks the same question twice OR an agent ships without QA-Lead PASS.

Auto-escalation: Yellow at any stage → single-shot Telegram ping to Phill + Margot prepares recovery memo within 2h. **No silent yellows.**

## The 14-day client experience (CMO)

| Day | What Duncan touches |
|---|---|
| 0 (Wed) | Welcome email + portal link + Telegram pairing + 12-Q discovery (~9 min) |
| 1 | Telegram: "Brand-mark concepts drop tomorrow 10am" |
| 2 | Brand-mark reveal — 5 names × visual marks, in-portal vote |
| 3 | 60-second "what we heard" voiceover'd video |
| 4 | Architecture one-pager + scope-lock approval gate |
| 6 | First preview deploy: `dimitri-staging.unite-group.in` |
| 8 | Weekly Proof Video #1 (90-sec walkthrough) |
| 10 | Compliance pack: ASIC/AFSL handling + data-residency memo |
| 12 | Preview deploy v2 — end-to-end ITR draft flow |
| 13 | Approval-request: lock MVP scope for Sprint 2 |
| 14 | **THE DEMO REEL** (see Wow Moment) |

## The Wow Moment (CMO)

**Day 14, 10:00 AEST: "The Dimitri Demo Reel."**
3-minute Remotion video addressed to Duncan by name, ElevenLabs voiceover, opening on his chosen brand-mark animating in, then **his own sanitised ITR data** flowing through Dimitri end-to-end — broker dashboard → AI-drafted ITR → compliance check → lender submission — closing with "Duncan, this is Dimitri. Sprint 2 begins Monday." Delivered as a personalised landing page he can forward to one mortgage-broker friend.

Brokers don't get sent videos starring their own platform with their own data. He'll show it at every BDM meeting for six months.

## The portal — `unite-group.in/clients/dimitri-itr` (CMO)

Six sections, Linear-grade density, dark-mode default:

1. **Mission Counter** — live ticker "Day 3 of 14 · 4 deliverables shipped · 0 blockers"
2. **Brand-Mark Vote** (Day 0–2 only, then archived)
3. **The Build** — Linear-style project stream with screenshot thumbnails
4. **Preview Deploys** — current production vs `dimitri-staging.unite-group.in`
5. **Approvals Queue** — what Duncan needs to action this week (one item at a time)
6. **Compliance Vault** — ASIC/AFSL handling, data-residency, security memos

Day 0 state: 1, 2, 5 active. 3, 4, 6 visible-but-empty with "Arrives Day X" placeholders — empty states ARE the product.

## The discovery — 12 critical questions (CMO)

**Product Vision:**
1. In 18 months when a broker says "I use Dimitri," what does that mean to them?
2. If Dimitri can only replace ONE tool in your stack on Day 30, which one?
3. Who is the broker that should never use Dimitri — and why?

**Must-Haves:**
4. Walk me through the worst ITR you submitted last month — what step took longest?
5. Which integrations are oxygen (NextGen, ApplyOnline, Salestrekker, MyCRM, Equifax)?
6. What's the single feature that, if missing at launch, kills the product?

**Wish List:**
7. What would you build "if budget were no object" that we should park for v2?
8. Which competitor screen makes you jealous? Send a screenshot.
9. AI-assisted ITR drafting — must-have, nice-to-have, or scary?

**Constraints:**
10. AFSL/credit-licence number, ACL holder, who signs off on compliance copy?
11. Where must client PII live (AU-only? Specific cloud region? On-prem?) and which auditor checks?
12. What's the single thing — legal, partner, family, regulatory — that could pull the plug before Day 90?

## The automation stack (CTO) — ONE addition: Recall.ai

| Stage | Pattern | Cost |
|---|---|---|
| **Discovery intake** | ContextBot `duncan-discovery-bot` (Telegram conversational, 5-stage script, Gemini 3.1 Flash extracts to Supabase `discovery_intake`) | $0.003/turn |
| **Meeting capture** | **Recall.ai bot** joins Zoom/Meet → Whisper-v4 transcript + speaker diarization → webhook → Gemini 3.1 Pro extracts `{decisions, action_items, approvals, blockers}` → Composio creates Linear issues + Supabase `meetings` row | **~$0.30/meeting hour** |
| **Proof delivery** | PR-triggered (not time-triggered): GitHub webhook on merged PR labelled `client-visible=true` → Chrome MCP captures screenshots from Vercel preview → Remotion composition + ElevenLabs voiceover → Resend with signed Supabase URL | ~$0.10/video |
| **Approval workflow** | Magic-link Next.js portal at `portal.unite-group.in/approve/{token}` → token-as-auth (single-use, IP-logged) → 3 buttons → writes `signature_hash = sha256(token + status + timestamp)` to Supabase | $0 |

**AU legal status:** Signed-hash pattern is sufficient under *Electronic Transactions Act 1999* for weekly approvals. Escalate to DocuSign only for final sign-off + payment milestones.

## Billing — Stripe Invoicing with milestone line items (CFO)

**Live keys confirmed in `~/.hermes/.env`** (`sk_live_51SzE5K…`). Account active.

Structure:
```
Customer (Home Loan Essentials Pty Ltd, ABN captured, metadata.nexus_slug=dimitri-itr)
├── PaymentLink: "ITR Platform — Project Deposit" (30% upfront, AUD)
└── Invoice #1 — Discovery & Architecture (Net 7)
    ├── Discovery workshop                $X AUD (GST exclusive)
    ├── Architecture & data-model design  $X AUD
    └── Auto-applied: GST 10%
Later: Invoice #2 (Build), Invoice #3 (Launch)
```

**Why milestones, not subscription:** ITR Platform is a build engagement with a defined end. Subscriptions invite refund disputes.
**Why deposit before work starts:** 30% non-refundable, gates the kickoff. Last-agency abandonment doesn't happen if Duncan's already 30% in.

### The 5 concrete steps to invoice Duncan this week (CFO)

1. **Confirm live-key health:** `curl https://api.stripe.com/v1/balance -u sk_live_…:` → expect 200 + balance object.
2. **Enable Stripe Tax** (Dashboard → Settings → Tax → Australian GST, set ABN). Set tax behaviour on prices to GST-exclusive.
3. **Create Customer** in Dashboard (name: Home Loan Essentials Pty Ltd, email Duncan@homeloanessentials.com.au, ABN, metadata `nexus_slug=dimitri-itr`).
4. **Create one Product** "Dimitri ITR Platform — Build Engagement". Do NOT pre-create Prices — use ad-hoc line items per milestone.
5. **Draft Invoice #1** (Discovery milestone, collection method = Send invoice Net 7, currency AUD, automatic tax). Save as draft, review, then Send. Back-fill Supabase: `UPDATE nexus_clients SET stripe_customer_id='cus_…', plan='build-milestone' WHERE slug='dimitri-itr';`.

## TM sweep result (2026-05-14 — see [[duncan-tm-sweep-2026-05-14]])

| Name | Verdict | Reason |
|---|---|---|
| **Lodgey** | 🟢 **Primary** | Coined word, no fintech collisions, AU broker vernacular ("lodge the file"), .com.au acquirable from private holder ~A$2-4k |
| **BeauHQ** (compound) | 🟡 **Backup only** | "Beau" alone lacks distinctiveness; compound clears Class 9/42 |
| **Otto** | 🔴 DEAD | Canadian OTTO is an *active mortgage-broker SaaS* in the exact product category. Otto Group also has global TM enforcement. |
| **Sorted** | 🔴 DEAD | sorted.org.nz — 25-year NZ government finance/mortgage brand. Airtasker holds .com.au defensively. |
| **Tick** | 🔴 DEAD | Generali's Tick Travel Insurance sits in Class 36 (financial services) where Duncan must file. |

**Day-2 portal brand vote is now a 2-candidate vote: Lodgey vs BeauHQ.**
**Next gate:** before any design or domain spend, commission a paid TM-attorney ATMOSS knockout search on Lodgey in Classes 9/35/36/42 (~A$450).

## Risks (cross-Board)

- **"Otto" trademark collision** (Margot — confirmed by 2026-05-14 sweep) — Otto is DEAD as a brand candidate. Day-2 vote restricted to Lodgey + BeauHQ.
- **Duncan ghosts on approvals** (Margot) — swarm ships faster than he reviews; WIP piles; trust erodes silently. Mitigation: hard rule — **no new sprint starts until last sprint approved**, surfaced in portal as a blocker on Duncan.
- **GST liability ambush** (CFO) — verify Unite-Group ABN + GST registration in ABN Lookup before Step 5. If charging GST without registration, owe ATO 10%. If forgetting GST while registered, eat 10% of margin.
- **Stripe payout hold** (CFO) — first live-account payout held 7 days. Cash lands Day-8, not Day-1. Don't promise contractor/infra payments inside that window.

## Execution sequence (next 5 days)

| Day | Move | Owner |
|---|---|---|
| Today (Thu 14) | TM sweep on Otto · ABN verify · Stripe Tax enabled | Phill (≤1h) |
| Today (Thu 14) | 30% deposit Payment Link drafted + SOW finalised | Phill + Margot |
| Fri 15 | Deposit Payment Link **sent to Duncan** with SOW + 12-Q discovery intake | Phill |
| Fri 15 | `duncan-discovery-bot` minted (post-BotFather rate-limit @ 13:20) | Swarm |
| Fri 15 | Recall.ai account + webhook scaffold | Swarm |
| Sat 16 | Hour-1 portal template built · magic-link approval portal built | Swarm |
| Sun 17 | PR-triggered Proof Video pipeline ready · first proof video as smoke-test | Swarm |
| Mon 18 | Deposit clears (assumes Friday send) → Kickoff scheduled · Day-0 cadence begins | Phill |

## Cross-refs

[[autonomous-build-log-2026-05-14]] · [[project-contextbot-platform]] · [[bulcs-holdings]] (Ivi, separate client) · [[ccw]] · [[master-plan-2b-by-2028-v3]] · [[design-preferences]]
