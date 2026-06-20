---
type: spec
product: duncan-itr-button (Lodgey)
status: draft
locale: en-AU
created: 2026-06-21
sources:
  - docs/brain/2nd Brain/Wiki/plaud/2026-06-20-06-20-the-itr-button-a-referral-based-financial-ecosystem.md
  - docs/legacy/authority-site/sows/duncan-itr-platform-sow-2026-05-14.md
  - docs/brain/2nd Brain/Wiki/proposal-duncan-itr-platform-2026-05-13.md
  - docs/brain/2nd Brain/Wiki/duncan-perkins-playbook-2026-05-14.md
  - docs/brain/2nd Brain/Wiki/duncan-tm-sweep-2026-05-14.md
  - docs/brain/2nd Brain/Wiki/ceo-board-duncan-partnership-2026-05-14.md
  - docs/brain/2nd Brain/Wiki/duncan-proposal-partnership-addendum-2026-05-14.md
  - docs/brain/2nd Brain/Wiki/duncan-fitr-venture-brief-2026-05-21.md
  - docs/brain/2nd Brain/Wiki/plaud/2026-05-20-05-20-business-venture-strategy-discussion-integrated-financial-services-and-ai-automation.md
  - docs/brain/2nd Brain/Wiki/plaud/2026-05-20-05-20-business-venture-strategy-discussion-integrated-financial-services-and-ai-automation-part2.md
  - docs/legacy/authority-site/superpowers/plans/2026-05-15-duncan-12q-discovery-intake.md
  - REGULATORY ANCHORS (NAMED, NOT YET FETCHED — see R2/R3/R4/R14): TASA s90-5 / s50-5 & TPB(GS) 14/2011 (tpb.gov.au / legislation.gov.au); AML/CTF Act 2006 table-6 designated services (austrac.gov.au); Privacy (Tax File Number) Rule 2015 (oaic.gov.au); ATO lodgment paths (ato.gov.au); ACL s18 + referral disclosure (accc.gov.au); ASIC RG 246 conflicted-remuneration (asic.gov.au). All UNCONFIRMED until the Phase 0 legal map fetches primary text.
---

# duncan-itr-button (Lodgey) — build-ready spec

> Independent venture. NOT part of the `apps/web` CRM. Duncan's IP. Standalone
> Next.js + Supabase app in the AU **Sydney** region, its **own** Supabase
> project — **not** `apps/web` prod `lksfwktwtmyznckodsau`. `founder_id` scoping
> does **not** apply here. Synthex's role is launch content only.

> **EVIDENCE NOTE (load-bearing).** The product corpus is a **Plaud voice
> transcript by a lay speaker** plus internal proposals/SOWs — **not** primary
> legislation. No external regulatory page (AUSTRAC, OAIC, legislation.gov.au,
> ACCC, ASIC, ATO) was fetched while writing this spec. Therefore **every
> regulatory conclusion below is `[INFERENCE]` or `[UNCONFIRMED]`, never
> `[VERIFIED]` as a statement of law.** "Clears AUSTRAC / clears the TFN Rule /
> stays the right side of the tax-agent-service line" are **design intentions to
> be tested by the Phase 0 legal map (R14)**, not legal facts this spec can
> assert. Treating them as fact is the single largest risk in this venture.

---

## 1. Finish line

**Done when** there is a build-ready spec for an AI-guided **$30 ITR intake (Dmitri)** plus a **post-NOA referral engine (Noah)** driving a **no-TFN/ID 'SRT' (Summary / Recommendation / Timeline)** handoff to a **vetted professional network**, with **AU regulatory guardrails** and the **commercial model specified to a phased plan** — **stopping at Phill + Duncan sign-off.** `[VERIFIED — task finish-line, locked]`

---

## 2. Decision up front

Build the **06-20 referral-ecosystem model as canonical** `[INFERENCE — it is the newest articulation (recorded 2026-06-20) and matches the finish-line verbatim; supersedes the 05-13 broker-SaaS proposal — but the two diverge on ATO access, see §7/OQ1]`, anchored on a single structural invariant: **no route, table, log, or AI prompt may persist a TFN or government ID.** The *design intent* is that this invariant keeps the product clear of the Privacy (TFN) Rule 2015 custody burden and AUSTRAC designated-service capture — but **whether it does is a legal question for the Phase 0 map, not a settled fact** `[INFERENCE — from corpus §1a/§1 "no TFN, no ID, no AML" framing (lay speaker); primary law UNCONFIRMED — R2/R3/R14]`. The platform is positioned as a **tool + referrer, never a tax-agent service**: Dmitri *guides* the user through their own myGov/ATO prefill and captures structured, general intake data for **$30**; in the canonical 06-20 model the platform never touches the ATO portal and never lodges `[INFERENCE — 06-20 corpus §1a "help Mary go to the myGov ATO portal", "she'll have to lodge"; NOTE the 05-13 proposal contradicts this with myGov OAuth + XPM lodgement handoff — OQ1 resolves the fork]`. Noah analyses the lodged return for **general** opportunities and emits **SRT** handoffs (no TFN/ID) to TPB-registered agents and licensed professionals, with **bidirectional SRT obligations**, **perpetual open files**, and a **calendar nudge engine** `[VERIFIED — 06-20 corpus §"Noah", §"never close"]`. We ship the **thinnest vertical slice first** (one Dmitri intake → one $30 payment → one SRT to one seeded professional), prove the no-TFN invariant structurally, then layer the referral network and commercial mechanics. The build commercial track is **Phase A milestone SOW (binding, AUD `<TBD>`)** `[VERIFIED — SOW §3, amounts `<TBD>`]`; the 85/15 NewCo partnership is **Phase B, non-binding**, negotiated post-traction `[VERIFIED — addendum "Aspirational framework, not legally binding"]`. **Stop at Phill + Duncan sign-off** — no code before this spec is approved.

---

## 3. Goals & non-goals

### Goals
- A **Dmitri** intake agent: intercepts the search, *guides* myGov/ATO prefill, explains tax concepts from a **closed/local KB**, captures general intake data, takes **$30**, and releases an **encrypted PDF + unlock-key on payment** (the soft lock-in). `[VERIFIED — 06-20 corpus §1a; "encrypted… released… once the thirty dollars is paid"]`
- A **Noah** post-NOA engine: analyses the return for **general** wealth/tax opportunities, authors **SRTs**, refers to a **vetted panel**, **never closes a file**, requires **return-SRTs**, and runs the **timeline nudge** engine. `[VERIFIED — 06-20 corpus §"Noah"/§"SRT"/§"never closes"]`
- The **SRT** as a first-class, append-only, **TFN/ID-free** artefact with an explicit state machine and a **bidirectional** obligation per professional. `[VERIFIED — 06-20 corpus §"SRT", "an SRT back from April"]`
- AU regulatory guardrails encoded as **structural constraints**, not just UX copy (no-TFN/ID at the data layer; tool-not-service framing; paid-referral disclosure; refer only to TPB-registered agents). `[INFERENCE — design response to corpus framing + named anchors; anchors themselves UNCONFIRMED until Phase 0 — R14]`
- A **phased commercial model**: product revenue ($30 fee + per-lead referral clips + button-embed fees + lead auction) and build/partnership track (Phase A SOW → Phase B NewCo). `[VERIFIED — 06-20 corpus §"pays for the ITR button on their website"/§"auction"; SOW; addendum]`

### Non-goals (REQUIRED)
- **In the canonical (guide-only) model the platform never lodges a return and never accesses the user's myGov/ATO portal.** No SBR/PLS integration. `[INFERENCE — 06-20 corpus guide-only flow; DIRECTLY CONTRADICTED by the 05-13 proposal's "MyGov OAuth… lodge… XPM" — this non-goal holds ONLY if OQ1 resolves to guide-only; tagged decision, not product fact]`
- **No personalised, reliance-grade tax advice from any AI.** Dmitri/Noah produce general information + structured data + referrals only — never a tax figure, never personal financial advice. `[INFERENCE — corpus "pass that inquiry on to a tax agent"; proposal "TASA s90-5 — tool not service" hard-stop; the TASA reliance test itself UNCONFIRMED — R1/R3]`
- **No TFN, no government ID, no client-money custody** — ever, anywhere in this system. `[VERIFIED — 06-20 corpus "do not under any circumstance hold tax file numbers… take ID"; proposal "TFN custody hard stop"]`
- **Not** an `apps/web` feature; no `founder_id` scoping; not on the shared prod mega-DB. `[VERIFIED — CLAUDE.md hard rules]`
- **No paid marketing** in scope — Synthex delivers organic launch content only. `[VERIFIED — proposal "Not included: Paid advertising — we go organic"]`
- **No Phase B partnership terms negotiated or committed** inside this spec — that is a human gate. `[VERIFIED — addendum "creates no current obligation"]`
- **FITR / satellite / lead-auction / geographic-satellite** mechanics are **out of MVP scope** (concept-only in corpus); deferred to Phase 4+. `[VERIFIED — 06-20 corpus §"satellite"/§"auction" are vision narration; fitr-brief lists them as open]`

---

## 4. Approach (plain language first)

A person Googles a cheap tax return and lands on the **Dmitri** chatbot. Dmitri does **not** do their tax for them and (in the canonical model) does **not** log into the ATO. It walks them through downloading their own ATO **prefill** in myGov, explains the concepts they ask about (from a local knowledge base, never inventing answers), and collects a plain-English profile — name, contact, income band, goals — **but never a TFN or ID**. They pay **$30**. Dmitri hands back an **encrypted PDF** of the prepared work; paying unlocks the key, after which they either lodge it themselves in myGov or hand it to a registered agent. Until they pay, it stays locked.

Once a return is lodged and the **Notice of Assessment** lands, **Noah** takes over. Noah reads the (non-TFN) summary, spots **general** opportunities ("you made no concessional super contributions"; "your savings are earning taxable interest while you save for a home"), and writes an **SRT** — a Summary, a Recommendation, and a Timeline — and routes it to a **vetted, TPB-registered** professional (a tax agent, then maybe a mortgage broker). The SRT carries enough to act on and **nothing sensitive**: no TFN, no ID. Noah **never closes the file** — every SRT must roll into a next dated action. It **requires an SRT back** from each professional ("I saw the client, next step is February") and **nudges** anyone who goes quiet. It's a circular, perpetual concierge.

The intended regulatory spine is structural: because the system **holds no TFN/ID and no client money**, the *design aim* is to sidestep the heaviest privacy and AML burdens; because it's a **tool + referrer** and never gives reliance-grade advice or lodges, the *aim* is to stay clear of the unregistered-tax-agent-service trip-wire. **Whether the design achieves this is the Phase 0 legal question (R1/R2/R14), not something this spec asserts.** Paid referrals are assumed lawful-if-disclosed pending confirmation (R4).

We build the **thinnest slice end-to-end first** and prove the no-TFN invariant before adding any network breadth.

---

## 5. Phased plan (smallest first; no later phase before the earlier DoD)

### Phase 0 — Compliance map + project skeleton (prerequisite gate)
The corpus names a legal/regulatory map as a hard prerequisite **before** product build `[VERIFIED — fitr-brief "Required Gates: Legal/regulatory map before product build"]`.
**Build:** new **separate** Supabase project (Sydney region); Next.js app scaffold; the named regulatory anchors written as lint/CI assertions; a one-page data-minimisation + consent model.
**DoD:** (a) Supabase project provisioned in AU Sydney, AES-256 at rest, RLS on by default; (b) `no-TFN` CI check exists and fails the build on any TFN-shaped persistence; (c) a **legal/regulatory map fetching the primary text** of TASA s90-5/s50-5 & TPB(GS) 14/2011, AML/CTF Act table 6, Privacy (TFN) Rule 2015, ATO lodgment paths, ACL s18, and ASIC RG 246 is produced (closes R2/R3/R4/R14); (d) tax-law reviewer (Duncan or his engaged adviser) signs that the *intended* Dmitri/Noah outputs stay the right side of the TASA "reliance" line `[INFERENCE — fitr-brief gate + proposal "external TPB-registered legal review" line item; legal conclusion design-dependent — R1]`.

### Phase 1 — Thinnest vertical slice: one intake → $30 → one SRT
**Build:** Dmitri intake constrained to **Yes / No / Tell me more** inputs `[VERIFIED — 12q-intake "locked per Phill 2026-05-13 proposal"]`; capture general profile to `intake`; **TFN/ID regex + LLM PII soft-block** on every free-text field; Stripe **$30** payment; encrypted-PDF generation + unlock-key-on-payment; a single hand-authored Noah **SRT** record routed to **one** seeded TPB-registered professional.
**DoD:** a test user completes intake, pays $30, receives an unlock key, and an `srt` row exists with state `open`, **provably containing no TFN/ID** (automated scan green); payment receipt is for "intake/tool/referral", not "tax advice" `[INFERENCE — proposal fee-framing hard-stop; the legal sufficiency of fee-framing is UNCONFIRMED — R1]`.

### Phase 2 — Noah engine: analysis, SRT state machine, bidirectional obligation
**Build:** Noah opportunity scan (general, deterministic rules — no LLM tax figures); SRT state machine (`open → action_dated → srt_returned → rolled_forward`); **return-SRT** capture from the professional; **never-close** invariant (every SRT must carry a `next_action_at`); nudge scheduler.
**DoD:** Noah cannot persist an SRT without a `next_action_at` (DB constraint proven on branch); a professional's return-SRT updates state and schedules the next nudge; a closed-without-next-action attempt is rejected at the data layer `[VERIFIED — 06-20 corpus "Noah is never allowed to close a file… always has to have a what's-next"]`.

### Phase 3 — Vetted panel + paid-referral disclosure + per-lead monetisation
**Build:** `professionals` panel (2–5 per category) with **TPB-register verification** field and status; routing/round-robin; **prominent paid-referral disclosure** in the UI and in the SRT; per-lead referral-fee ledger ($10–$20 placeholder).
**DoD:** every active professional row has a verified TPB registration reference; the UI shows the paid-referral disclosure before any match is presented `[INFERENCE — disclosure is the design response to ACL s18; the specific disclosure standard is UNCONFIRMED — R4]`; a referral event writes a ledger row. `[VERIFIED — corpus "panel of two or three or five tax agents"]`

### Phase 4 — Network/scale mechanics (deferred; concept-only in corpus)
**Build (only after Phase 3 DoD):** button-embed for partner sites; FITR/satellite model; lead auction at saturation; geographic satellites.
**DoD:** explicitly **gated** — not started until Phase 3 is signed off and the OPEN items in §9 are resolved. `[VERIFIED — 06-20 corpus presents these as future vision only]`

### Build/partnership commercial track (runs alongside, human-gated)
- **Phase A (binding):** milestone SOW — 4 milestones / 86 days, AUD amounts `<TBD>`, 30% non-refundable deposit, IP to Client (Home Loan Essentials / Duncan) on payment of the corresponding milestone `[VERIFIED — SOW §3/§4/§7/§8]`.
- **Phase B (non-binding):** 85/15 NewCo "Lodgey Group Pty Ltd", 4-yr vest / 12-mo cliff, KPI-gated, ~$30k Duncan cash subscription, ATIA carved 100% to Phill — negotiated post-traction `[VERIFIED — addendum + ceo-board reference]`.

> **NOTE — commercial-instrument conflict (R13):** the 05-13 **proposal** offers a **$4,400 setup + $2,750/mo retainer (12-mo, $37,400 inc GST)** model; the 05-14 **SOW** offers a **4-milestone fixed-price** model with amounts `<TBD>`. These are two different instruments for the same Phase A. Which one binds is an OQ for Phill + Duncan (OQ5). `[VERIFIED — proposal §"Commercial terms" vs SOW §3]`

---

## 6. Data model (separate Supabase project — branch-first)

> **DB rule.** This is a **separate app and Supabase project** (AU Sydney) — **NOT** `apps/web` prod `lksfwktwtmyznckodsau` and **not** the shared mega-DB. Prove every schema change on a **Supabase database branch** of *this* project before promoting to its prod; the standing sandbox is gone, so branch-first is the discipline. `founder_id` does **not** apply; tenancy is per `client_slug` / per-professional RLS. `[VERIFIED — CLAUDE.md DB rule; 12q-intake "RLS scoped per client_slug" precedent]`

**Hard schema invariant (structural guardrail):** **no column in any table may store a TFN or government ID.** Enforced by (a) a naming/CI check, (b) a `CHECK`/trigger PII guard on free-text columns, (c) review. `[VERIFIED — 06-20 corpus "no tax file numbers… no ID"; proposal "TFNs never enter an LLM context window"]`

| Table | Purpose | Key columns (no TFN/ID anywhere) | Notes |
|---|---|---|---|
| `clients` | end client (Mary) | `id`, `client_slug`, `full_name`, `email`, `phone`, `created_at` | minimal PII; APP-compliant; no TFN/ID |
| `intake` | Dmitri session | `id`, `client_id`, `fy`, `profile_jsonb` (age band, occupation, income band, goals), `status`, `created_at` | constrained Yes/No/Tell-me-more; free-text PII-scrubbed |
| `intake_events` | append-only revision history | `id`, `intake_id`, `event`, `payload_jsonb`, `created_at` | revision pattern from 12q-intake |
| `payments` | the $30 fee | `id`, `intake_id`, `stripe_pid`, `amount_aud` (3000c), `purpose` (`'tool_intake_referral'`), `paid_at` | fee framed as tool/intake/referral, **not** advice |
| `documents` | encrypted return PDF | `id`, `intake_id`, `enc_pdf_path`, `unlock_key_hash`, `unlocked_at` | key released only on `payments.paid_at` |
| `professionals` | vetted panel | `id`, `name`, `firm`, `category` (`tax_agent`/`broker`/`planner`/`lawyer`), `tpb_registration_ref`, `tpb_verified_at`, `status` | TPB-register verification mandatory for `tax_agent` |
| `srt` | the core handoff | `id`, `client_id`, `professional_id`, `summary_jsonb`, `recommendation`, `timeline_jsonb`, `state` (`open`/`action_dated`/`srt_returned`/`rolled_forward`), `next_action_at` **NOT NULL**, `created_at` | append-only; **never-close**: row invalid without `next_action_at` |
| `srt_returns` | professional's return-SRT | `id`, `srt_id`, `professional_id`, `action_taken`, `next_action_at`, `returned_at` | enforces bidirectional obligation |
| `nudges` | calendar engine | `id`, `srt_id`, `target` (`client`/`professional`), `due_at`, `sent_at`, `status` | drives follow-ups when parties go quiet |
| `referral_ledger` | per-lead monetisation | `id`, `srt_id`, `professional_id`, `fee_aud`, `disclosed` (bool), `created_at` | `disclosed=true` required before match shown |

**RLS:** per `client_slug` for client-facing rows; per `professional_id` for professional-facing rows; service-role only for ledger/nudge internals. **No** cross-tenant read. `[INFERENCE — from 12q-intake per-client_slug RLS precedent (verified) extended to the professional axis (new)]`

---

## 7. Security & cost guardrails

**The no-TFN/ID boundary (structural, load-bearing):**
- **No route, table, log, AI prompt, or analytics event may persist a TFN or government ID.** Enforced at the data layer (schema invariant §6), at ingress (regex + LLM PII detector soft-block on every free-text field, bouncing TFN-shaped strings back to the user), and in CI. `[VERIFIED — 06-20 corpus "no TFN… no ID"; proposal "Hard regex + LLM detector + soft shutdown UX"]`
- **No client-money custody and no entity formation** — the *design aim* is to stay out of AUSTRAC designated services; payments are a simple SaaS fee, never held client funds. `[INFERENCE — design response to corpus "not sanctioned under AML" framing; AUSTRAC designated-service boundary UNCONFIRMED — R2]`
- **Tool-not-service:** AI confined to general information + data capture; **the LLM never outputs a tax figure** (deterministic pure functions read a current-FY rate file); a prominent "general/tool-only, not a tax agent service" disclaimer; every circumstance-specific judgement routes to a **registered** agent; the **$30 is framed as the tool/intake/referral fee, not advice**. `[INFERENCE — proposal hard-stops "Deterministic tax calcs… LLM never produces a tax figure"; legal sufficiency of the framing UNCONFIRMED — R1/R3]`
- **No-hallucination rule:** outside its local KB, Dmitri must say "I don't have that — I'll pass it to the tax agent," never fabricate. `[VERIFIED — 06-20 corpus "immediately needs to pass that inquiry on to a tax agent"]`
- **Refer only to TPB-registered agents**, verified against the TPB public register; **paid-referral disclosure** shown before any match. `[INFERENCE — TPB-register verification is the design control; the obligation to disclose is from ACL — UNCONFIRMED standard, R4]`
- **Lodgment boundary:** in the canonical model the platform never lodges and never accesses myGov/ATO; UX offers only "you lodge in myGov" or "your matched registered agent lodges." `[INFERENCE — 06-20 corpus; contradicted by 05-13 proposal OAuth/XPM path — held only if OQ1 → guide-only]`

**Secrets & scoping:**
- Supabase service-role key, Stripe secret, any LLM key in the venture's **own** secret store / Vercel env — **never** committed, never shared with `apps/web`. `[INFERENCE — standard practice + CLAUDE.md no-cross-repo-writes]`
- AU **Sydney** region; Supabase AES-256 at rest; RLS tenant isolation; APP-8 cross-border notice if any processing is offshore. `[INFERENCE — proposal "Supabase Sydney" + SOW "AU-region, AES-256, RLS"; APP-8 offshore obligation UNCONFIRMED if any sub-processor is offshore — R2]`

**Cost / spend:**
- LLM token economy: Dmitri's tax KB on a **closed/local** store so routine answers cost **no tokens**; only novel questions escalate (to a human, not the open internet). `[VERIFIED — 06-20 corpus "his own closed server"]`
- Deterministic calc functions (no LLM) for any numeric output — zero inference cost and zero advice-risk. `[INFERENCE — proposal deterministic-calc hard-stop]`
- MVP infra is one small Supabase project + Stripe + minimal serverless — keep spend trivial until traction; no paid marketing in scope. `[INFERENCE — MVP scope + proposal "true-up only if spend > $1,000/mo"]`

---

## 8. Risk & assumption register (every [UNCONFIRMED] lands here)

| # | Item | Tag | Materiality | Action |
|---|---|---|---|---|
| R1 | Whether Dmitri/Noah outputs **as actually designed** stay the right side of TASA "reasonably expected to rely" — design-dependent legal question. | `[UNCONFIRMED]` | **High** | Tax-law review of real AI prompts/outputs before build (Phase 0 DoD gate). |
| R2 | AML/CTF Act table-6 / s6 designated-services wording + the "tax-return prep excluded" boundary — **AUSTRAC primary pages never fetched**; rests only on a lay-speaker transcript. | `[UNCONFIRMED]` | **High** | Fetch AUSTRAC designated-services page + AML/CTF Act table 6 in the Phase 0 legal map, before any build. |
| R3 | Verbatim TASA s90-5 / s50-5 text, TPB(GS) 14/2011 tool carve-out + current penalty units — **not read from any source this session**; only loosely referenced by the transcript and proposal. | `[UNCONFIRMED]` | **High** | Fetch legislation.gov.au + TPB guidance in Phase 0 map. |
| R4 | ACL referral-disclosure specifics — **no ACCC page fetched**; inferred from a general s18 standard. | `[UNCONFIRMED]` | Medium | Confirm disclosure wording with ACCC guidance / legal in Phase 0. |
| R5 | ASIC RG 246 conflicted-remuneration / Code referral-fee bar — only bites if a referral partner is an AFS-licensed adviser, not a plain tax agent. | `[INFERENCE]` | Low | Flag in partner-agreement model for planner-category partners. |
| R6 | Worked dollar figures ($2,000 refund vs prior $200, $220→$180 fee, ~$30k CommBank deposit) are a single hypothetical persona in the transcript — **not** validated unit economics. | `[INFERENCE]` | Medium | Build a real unit-economics model (named fitr-brief prerequisite gate). |
| R7 | **Two-product divergence is unresolved:** the 05-13 proposal builds **myGov-OAuth + XPM lodgement** (touches ATO); the 06-20 model is **guide-only / never touches ATO**. The whole no-ATO regulatory posture depends on which is built. | `[UNCONFIRMED]` | **High** | OQ1 (Phill + Duncan). §2 picks 06-20/guide-only as canonical *pending* this confirmation. |
| R8 | Canonical agent spelling "Dmitri" (06-20 title/summary) vs "Dimitri" (06-20 transcript body + all prior docs). | `[UNCONFIRMED]` | Low | OQ — Duncan to confirm public/code spelling. |
| R9 | Consumer price: **$30** is verified in the 06-20 corpus. Prior-doc alternatives ($80/$102/$105) were **referenced second-hand, not read**; do not treat as confirmed divergence. | `[UNCONFIRMED]` | Medium | $30 treated as current; confirm with Duncan; re-read 05-20 parts if the alternatives matter. |
| R10 | Referral-fee mechanic (per-lead vs subscription vs Xero-tier), Noah payment-gate timing, prefill scope for MVP, XPM-only vs multi-system — open discovery items. | `[UNCONFIRMED]` | Medium | Resolve before Phase 3 (monetisation) / Phase 1 (gate timing). |
| R11 | ATO partner-program / API access path & timeline — proposal's "slowest piece," outside Phill's control; only relevant if a future phase needs ATO integration. | `[UNCONFIRMED]` | Medium | MVP avoids it (guide-only). Re-assess only if OQ1 → OAuth model. |
| R12 | Vetted-panel governance, lead-auction mechanics, brand final clearance (TM sweep narrowed to **Lodgey / BeauHQ**; final clearance via TM attorney in Milestone 1), domain acquisition — concept/pending. | `[UNCONFIRMED]` | Medium | Phase 3/4 + human gate. |
| R13 | Phase A commercial instrument **unreconciled**: 05-13 proposal ($4,400 + $2,750/mo, $37,400/12mo) vs 05-14 SOW (4 milestones, AUD `<TBD>`). | `[UNCONFIRMED]` | Medium | Phill + Duncan pick one (OQ5, human gate). |
| R14 | **Regulatory-anchor completeness overall — no primary legal/regulatory map produced yet; the entire compliance posture rests on a lay transcript + internal proposals.** | `[UNCONFIRMED]` | **High** | Phase 0 prerequisite (fetch all primary sources). Closes R1–R4. |

---

## 9. Open questions (≤5, concrete, for Duncan/Phill)

1. **OAuth-vs-guide fork (R7):** does Dmitri use **myGov OAuth to pull prefill + hand off to XPM for lodgement** (the 05-13 proposal), or **only guide the user** through their own myGov so the platform never touches the ATO (the 06-20 model)? The guide-only model is what the canonical no-ATO regulatory posture depends on — confirm we build guide-only for MVP. `[VERIFIED — 06-20 corpus vs 05-13 proposal divergence, both read]`
2. **Price + spelling:** is the consumer fee **$30** (06-20), and is the canonical name **"Dmitri"** or **"Dimitri"** for public label vs code? `[VERIFIED — 06-20 title "Dmitri" vs transcript "Dimitri"; price $30 verified]`
3. **Noah payment-gate timing:** does Noah charge/refer **Stripe-upfront**, **broker-billed escrow at lodgement**, or **post-pay after NoA**? (Drives Phase 1 vs Phase 3 wiring.) `[VERIFIED — 12q-intake Q6, verbatim]`
4. **Referral monetisation model:** **per-lead ($10–$20)**, **subscription**, or **Xero-style provider tiers** — which do we build first? `[VERIFIED — fitr-brief "exact referral-fee model" open question]`
5. **Phase A commercial instrument (R13):** confirm **the milestone SOW** (with AUD amounts filled) **or** the **$4,400 + $2,750/mo retainer** as the binding instrument, Phase B NewCo deferred — and who signs. `[VERIFIED — SOW §3 vs proposal "Commercial terms", both read]`

---

## 10. Verification plan (exact checks that prove 'done')

The spec is **build-ready** (this deliverable's "done") when:
- **Structure check:** this file contains all 10 fable-engine sections in order, with non-goals present and every factual line tagged — `grep -nE '\[(VERIFIED|INFERENCE|UNCONFIRMED)\]' spec.md` returns a hit on every claim line; an untagged-claim audit returns none. `[VERIFIED — Evidence Standard]`
- **No `[VERIFIED]` legal conclusions:** an audit confirms no regulatory *conclusion* (clears AUSTRAC / clears TFN Rule / clears tax-agent-service line) is tagged `[VERIFIED]`; all such lines are `[INFERENCE]`/`[UNCONFIRMED]` and routed to R1–R4/R14. `[VERIFIED — Evidence Standard, this pass]`
- **Finish-line match:** §1 reproduces the locked sentence verbatim. `[VERIFIED]`
- **No-TFN invariant is structural, not prose:** §6 + §7 specify the data-layer ban, ingress PII soft-block, and a CI check — not merely UX copy. `[VERIFIED]`
- **Phase ordering:** §5 lists Phase 0 (incl. the primary-source legal map) first, each phase has a DoD, and no later phase may start before the earlier DoD (Phase 4 explicitly gated). `[VERIFIED]`
- **Separate-project DB rule honoured:** §6 states this is a separate Supabase project (AU Sydney), branch-first, not `lksfwktwtmyznckodsau`, no `founder_id`. `[VERIFIED]`

**At implementation time (per phase), the proving commands are:**
- Schema on a **branch first**: `supabase` MCP `create_branch` → `apply_migration` → `list_tables` confirms `srt.next_action_at NOT NULL` and **no** TFN/ID column on any table; `execute_sql` attempting to insert an SRT without `next_action_at` is **rejected**.
- **No-TFN CI gate:** `npm run check:no-tfn` (grep/AST for TFN-shaped column names + a runtime PII-scrub unit test) fails the build on any violation.
- **Build gauntlet** (orchestrator re-runs, per Evidence Standard — subagent green is `[UNCONFIRMED]` until re-run): `npm run build` && `npm run type-check` && `npm test` green on the integrated tree.
- **Regulatory assertions as tests:** unit tests prove (a) no LLM code path emits a numeric tax figure, (b) payment `purpose` is `tool_intake_referral`, (c) a match cannot render unless `referral_ledger.disclosed = true`, (d) only `professionals` with a non-null `tpb_verified_at` are routable.
- **Human gate:** Phill + Duncan typed sign-off on Decision (§2), the OAuth-vs-guide answer (OQ1), price/spelling (OQ2), the Phase A commercial instrument (OQ5), AND confirmation that the Phase 0 legal map (R14) has been produced before any production build.

[STATUS] gate: awaiting approval
