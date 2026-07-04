---
type: spec
product: nexus-concierge-os
pack: lodgey
status: draft
locale: en-AU
created: 2026-07-01
issue: UNI-2171
maps_onto: UNI-2170
sources:
  - apps/spec-board/projects/nexus-concierge-os/spec.md          # merged core (UNI-2170) — case/srt/provider/handoff/referral_ledger/nudge/consent/vertical_pack
  - apps/spec-board/projects/duncan-itr-button/spec.md            # Dmitri/Noah: srt, professionals, referral_ledger, nudges, no-TFN invariant
  - apps/spec-board/projects/duncan-diy-home-loan/spec.md         # Fitzy: broker_handoffs (SRT-style opaque token), facility/rule engine
  - apps/spec-board/CLAUDE.md                                     # Evidence Standard + Fable board rules
  - GATE: CleanExpo/Pi-Dev-Ops docs/nexus-concierge-os/validation-and-commit-gate.md (RA-6815, merged #431)
---

# Nexus Concierge OS — Lodgey Pack (build-ready mapping spec)

> This issue (UNI-2171) owns the **Lodgey vertical pack only**: how Lodgey's three products
> instantiate the merged core (UNI-2170) **with zero core changes**. It re-uses SRT, case,
> the provider panel, and the no-TFN invariant from core — it does **not** redefine them.
> Lodgey *is* where the core patterns came from, so this pack is the core's proof-of-fit.
> `[VERIFIED]` (core spec §5 Phase 2, `nexus-concierge-os/spec.md:132-135`; §Vertical-pack notes :224).

## 1. Finish line

A mapping that instantiates the UNI-2170 core for **Lodgey** — the Duncan product family
(**Dmitri** $30 ITR-intake, **Noah** post-NOA referral engine, **Fitzy** $1,000/yr DIY Home
Loan) — such that each Lodgey concept lands on a core table (`case`, `srt`, `srt_return`,
`consent`, `provider`, `handoff`, `referral_ledger`, `nudge`, `vertical_pack`) or on a
declared **pack-local** extension table in Lodgey's own data plane, and the core contract is
touched **nowhere**. Done when: the pack's `vertical_pack` manifest is specified, every
Lodgey table has an explicit core-or-pack-local disposition, the case-state and SRT mappings
are exact, and the "zero core changes" DoD is demonstrable by grep. `[VERIFIED]` scope mirrors
core Phase 2 DoD "Lodgey maps onto core with zero core changes" (`nexus-concierge-os/spec.md:134`).

## 2. Decision up front

**Lodgey is instantiated as a pack, in its own data plane, not by extending the core.**
`[INFERENCE]` — forced by the same hard boundary the core cites: Lodgey runs on its **own
Supabase project (AU-Sydney), no `founder_id`, RLS per `client_slug`/`professional_id`**,
explicitly not the Nexus CRM DB (`duncan-itr-button/spec.md:37`, `duncan-diy-home-loan/spec.md:140`)
`[VERIFIED]`. Therefore this pack delivers (a) a `vertical_pack` manifest row, (b) a
**core→Lodgey column mapping** for the nine core tables, and (c) a list of **pack-local**
tables that live beside the core in Lodgey's project and never alter the core contract.

**The SRT and the professional panel are re-used verbatim — Lodgey is their origin.** The
core's `srt`, `srt_return`, `provider` (generalised from `professionals`), `referral_ledger`,
`nudge`, and PII-free `handoff` were all lifted from these two Lodgey specs; the pack maps
back onto them 1:1. `[VERIFIED]` (`nexus-concierge-os/spec.md:169-171`, deriving from
`duncan-itr-button/spec.md:49-52`, `duncan-diy-home-loan/spec.md:158`).

**No code before Phill + Duncan sign-off**, matching both source specs' finish lines.
`[VERIFIED]` (`duncan-itr-button/spec.md:4`, `duncan-diy-home-loan/spec.md:82`).

## 3. Goals & non-goals

**Goals**
- Map **Dmitri** (intake→$30→encrypted-PDF) and **Noah** (post-NOA SRT referral engine) onto
  one core `case` each, with the core `srt`/`srt_return`/`nudge`/`referral_ledger` unchanged.
  `[VERIFIED]` (`duncan-itr-button/spec.md:17-19`).
- Map **Fitzy** (rule-engine + refund ledger + quarterly cadence) onto a core `case`, with its
  quarterly compliance review expressed as a core `srt` and its `broker_handoffs` as the core
  `handoff`. `[INFERENCE]` — Fitzy's quarterly review is Summary(compliance)/Recommendation
  (next rule action)/Timeline(next review, `next_action_at`), i.e. an SRT in all but name;
  basis `duncan-diy-home-loan/spec.md:111,126`.
- Declare the Lodgey **`vertical_pack` manifest** (slug, domain_map, kb_ref, panel_ref, regime,
  data_plane). `[INFERENCE]` — manifest shape from core §6 (`nexus-concierge-os/spec.md:154`).
- Carry the **no-TFN/no-government-ID invariant** as inherited-from-core, not re-declared.
  `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178-180`; origin `duncan-itr-button/spec.md:39`).
- List Lodgey's **pack-local** tables explicitly so "zero core changes" is checkable.

**Non-goals** (REQUIRED)
- **NOT** editing the core spec, the core migration template, or any core table's contract —
  if Lodgey needed a core change, that is a core issue (UNI-2170), not this pack. `[VERIFIED]`
  DoD boundary (`nexus-concierge-os/spec.md:134`).
- **NOT** re-defining SRT, the professional panel, the no-TFN rule, or the case states — all
  inherited. `[VERIFIED]` (core §Non-goals `nexus-concierge-os/spec.md:65`).
- **NOT** building the Lodgey app here — this is the pack **spec**; the two source specs own
  their own build phases. `[VERIFIED]` (`duncan-itr-button/spec.md:85`, `duncan-diy-home-loan/spec.md:118`).
- **NOT** lodging with or accessing any government system (myGov/ATO/SBR/PLS) — concierge
  guides, never lodges; inherited Lodgey invariant. `[VERIFIED]` (`duncan-itr-button/spec.md:24`,
  core `nexus-concierge-os/spec.md:63-64`).
- **NOT** resolving the Dmitri guide-only-vs-OAuth fork (that vertical's OQ1) or Fitzy's
  ACL/AFSL/Part-IVA gates — those stay in the source specs' risk registers. `[VERIFIED]`
  (`duncan-itr-button/spec.md:24`, `duncan-diy-home-loan/spec.md:120`).

## 4. Approach (plain language first)

Lodgey has three front-doors. **Dmitri** greets a taxpayer, guides their own myGov prefill,
captures general intake, takes $30, and releases an encrypted PDF on payment — that whole
lifecycle is **one `case`**. **Noah** reads the notice-of-assessment, writes **SRTs** for
general wealth/tax opportunities, and hands each off to a vetted **provider** (TPB-registered
agent, broker, planner, lawyer) under disclosed referral terms, never closing the file — those
SRTs, handoffs, nudges, and ledger rows are the **core** `srt`/`handoff`/`nudge`/
`referral_ledger` unchanged. **Fitzy** greets a borrower, presents the debt-recycling rules,
ingests their budget, and each quarter emits a compliance review — that review is a **core
`srt`** (summary of rules met, recommended next action, dated next review); when the borrower
needs the licensed broker, Fitzy hands off by opaque token — the **core `handoff`** — carrying
no PII, because ID/AML lives only in the broker's separate trust zone. Everything Lodgey-
specific that the core doesn't name (the $30 `payments`, the encrypted `documents`, the
`facilities`/`rules`/`refund_ledger`) stays as **pack-local** tables in Lodgey's own Supabase,
sitting beside the core tables, changing nothing in the core.

## 5. Phased plan (smallest first)

- **Phase 0 — Ratify the mapping.** Lock the core→Lodgey table map (§6), the case-state map,
  and the SRT re-use as-is. **DoD:** this pack spec approved (`needs-phill-signoff`), gate
  evidence comment posted to UNI-2170. `[VERIFIED]` gate exists (`nexus-concierge-os/spec.md:218`).
- **Phase 1 — Instantiate core tables in Lodgey's data plane.** Apply the core migration
  template (the nine core tables) to Lodgey's Supabase branch; add the pack-local extension
  columns/tables (§6). **DoD:** Lodgey project carries all nine core tables unmodified + its
  pack-local set; grep proves no core table's contract was altered.
- **Phase 2 — Wire Dmitri/Noah onto core.** `intake` → `case`; Noah output → `srt`/`srt_return`;
  `professionals` → `provider`; existing `nudges`/`referral_ledger` → core tables. **DoD:** a
  Dmitri intake opens a `case`; a Noah recommendation writes a core `srt` with `next_action_at`.
- **Phase 3 — Wire Fitzy onto core.** `borrowers`+`master_facility` lifecycle → `case`;
  quarterly review → `srt`; `broker_handoffs` → `handoff`; cadence reminders → `nudge`. **DoD:**
  a Fitzy borrower opens a `case`; a quarterly review writes a core `srt`; a broker handoff
  writes a core PII-free `handoff`. Two products, one core, zero core edits.

## 6. Data model — the core→Lodgey mapping

Lodgey owns its instance of the **nine core tables** (contract unchanged) plus **pack-local**
tables the core does not define. Core columns are the minimum contract; a pack MAY add columns
without changing the core `[VERIFIED]` (`nexus-concierge-os/spec.md:157` "minimum contract, not
exhaustive").

### 6a. Core tables — how Lodgey fills them

| Core table | Lodgey instantiation | Pack-added columns | Evidence |
|---|---|---|---|
| `case` | One per Dmitri intake **and** one per Fitzy engagement (universal container over `intake` / `borrowers`+`master_facility`) | `product` (`dmitri`\|`noah`\|`fitzy`) | `[INFERENCE]` core `case` is net-new (`nexus-concierge-os/spec.md:145,171`); wraps `intake` (`duncan-itr-button/spec.md:44`) / `borrowers` (`duncan-diy-home-loan/spec.md:149`) |
| `srt` | Noah referral SRTs **and** Fitzy quarterly-compliance SRTs; add `case_id`, reach `client_id`/`professional_id` via the case | `client_id`, `professional_id`, `summary_jsonb`, `timeline_jsonb` (all pre-existing Lodgey cols) | `[VERIFIED]` origin (`duncan-itr-button/spec.md:49`); Fitzy-as-SRT `[INFERENCE]` (§3) |
| `srt_return` | Dmitri/Noah `srt_returns` verbatim (provider's return-SRT) | — | `[VERIFIED]` (`duncan-itr-button/spec.md:50`) |
| `consent` | Dmitri payment + paid-referral-disclosure consent; Fitzy general-advice acknowledgement + budget-feed consent | `product`, `client_slug` | `[INFERENCE]` core `consent` net-new (`nexus-concierge-os/spec.md:145`); Lodgey disclosure/consent points (`duncan-itr-button/spec.md:65`, `duncan-diy-home-loan/spec.md:165`) |
| `provider` | `professionals` panel (generalised): `credential_ref`←`tpb_registration_ref`, `verified_at`←`tpb_verified_at`, `active`←`status='active'` | `category` (`tax_agent`\|`broker`\|`planner`\|`lawyer`), `firm`, `name` | `[VERIFIED]` (`duncan-itr-button/spec.md:48`; generalise-not-duplicate core R2 `nexus-concierge-os/spec.md:195`) |
| `handoff` | Noah SRT handoff **and** Fitzy `broker_handoffs` (opaque token, `carries_pii=false`) verbatim | `status` | `[VERIFIED]` (`duncan-diy-home-loan/spec.md:158`; core `handoff` `nexus-concierge-os/spec.md:150`) |
| `referral_ledger` | Dmitri/Noah `referral_ledger` (`kind='referral'`\|`'revenue'`, `disclosed` required) | `fee_aud` | `[VERIFIED]` (`duncan-itr-button/spec.md:52`) |
| `nudge` | `nudges` (Noah follow-ups) **and** Fitzy quarterly cadence reminders | `target` (`client`\|`professional`) | `[VERIFIED]` (`duncan-itr-button/spec.md:51`; Fitzy cadence `duncan-diy-home-loan/spec.md:129`) |
| `vertical_pack` | one manifest row for Lodgey (§6c) | — | `[INFERENCE]` core registry (`nexus-concierge-os/spec.md:154`) |

### 6b. Pack-local tables (Lodgey data plane only — NOT core, this is what proves zero-core-change)

Client identity: `clients` (Dmitri) / `borrowers` (Fitzy) — minimal-PII, no-TFN/ID, RLS per
`client_slug`/borrower; the `case` links to them, it does not absorb them. `[VERIFIED]`
(`duncan-itr-button/spec.md:43`, `duncan-diy-home-loan/spec.md:149`).
Dmitri/Noah: `intake`, `intake_events`, `payments` ($30 tool/intake/referral fee), `documents`
(encrypted return PDF + unlock-key). `[VERIFIED]` (`duncan-itr-button/spec.md:43-47`).
Fitzy: `master_facility`, `facilities` (typed GISI/purpose-LOC/investment-LOC), `rules`,
`rule_compliance`, `refund_ledger` (`min(1000, 250×floor(k/5))`), `budget_snapshots`,
`document_submissions`, `legislated_config`. `[VERIFIED]` (`duncan-diy-home-loan/spec.md:149-158`).
These carry Lodgey's commerce and domain logic; the core defines none of them, so they impose
**no** change on the core contract. `[VERIFIED]` (core §2 data-plane isolation `nexus-concierge-os/spec.md:34-42`).

### 6c. `vertical_pack` manifest — Lodgey

| Field | Value |
|---|---|
| `slug` | `lodgey` |
| `domain_map` | `dmitri_intake → case` · `noah_recommendation → srt` · `fitzy_engagement → case` · `fitzy_quarterly_review → srt` |
| `kb_ref` | Dmitri's closed/local tax KB (`duncan-itr-button/spec.md:73`) `[VERIFIED]` |
| `panel_ref` | the `provider` panel (TPB-verified tax_agent/broker/planner/lawyer) `[VERIFIED]` (`duncan-itr-button/spec.md:48`) |
| `regime` | TASA/TPB (tool-not-service, TPB register); Privacy (TFN) Rule 2015; AUSTRAC designated-service boundary; ACL s18 referral disclosure; ACL/NCCP credit assistance (Fitzy); AFSL personalised-advice line (Fitzy); Part IVA / TR 98/22 / *Hart* (Fitzy) — **all named, primary text UNCONFIRMED (R1)** |
| `data_plane` | own Supabase project, AU-Sydney, no `founder_id`, RLS per `client_slug`/`professional_id` `[VERIFIED]` (`duncan-itr-button/spec.md:37`) |

### Case states — Lodgey mapping

Core `intake → open → action_dated → awaiting_provider → provider_returned → rolled_forward`
(terminal `closed` only explicit) `[VERIFIED]` (`nexus-concierge-os/spec.md:162-164`).
- **Dmitri/Noah:** `intake.created`→`intake`; `payments.paid`→`open`; Noah SRT dated→`action_dated`;
  handoff→`awaiting_provider`; `srt_return`→`provider_returned`; next SRT→`rolled_forward`.
  `[INFERENCE]` from `duncan-itr-button/spec.md:44,46,49-50`.
- **Fitzy:** borrower+facility created→`intake`/`open`; quarterly review SRT→`action_dated`;
  `broker_handoffs`→`awaiting_provider`; broker return→`provider_returned`; next quarter→
  `rolled_forward`. `[INFERENCE]` from `duncan-diy-home-loan/spec.md:126,129,158`.
`next_action_at NOT NULL` (never-close) is inherited unchanged. `[VERIFIED]` (`nexus-concierge-os/spec.md:165`).

## 7. Security & cost guardrails

All inherited from core, re-used not re-declared:
- **No-TFN/no-government-ID invariant** — applies to every Lodgey table, route, log, and AI
  prompt (Dmitri/Noah *and* Fitzy). ID/AML PII lives only in the broker's separate trust zone,
  reachable from Fitzy by opaque token alone. `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178-180`;
  origin `duncan-itr-button/spec.md:39,61`, `duncan-diy-home-loan/spec.md:162-163`).
- **PII-free handoffs** — `handoff.carries_pii=false`, opaque token only. `[VERIFIED]`.
- **Disclosed referrals** — every `referral_ledger` row records `disclosed`; ACL s18 framing,
  regime text `[UNCONFIRMED]` (R1). `[VERIFIED]` (named) (`duncan-itr-button/spec.md:65`).
- **Data-plane isolation** — Lodgey's data stays in Lodgey's Supabase; the OS is shared
  spec+schema-template, not shared data. `[VERIFIED]` (core §2).
- **Human-in-the-loop; single-user/private/low-cost** — Fable board rules. `[VERIFIED]`
  (`apps/spec-board/CLAUDE.md`).
- **Cost** — one small Supabase project + Stripe + minimal serverless per source spec; no new
  standing cost introduced by the mapping. `[VERIFIED]` (`duncan-itr-button/spec.md:75`).

## 8. Risk & assumption register

| # | Risk / assumption | Evidence | Mitigation |
|---|---|---|---|
| R1 | Regime primary text (TASA/TPB, Privacy TFN Rule, AUSTRAC, ACL s18/NCCP, AFSL, Part IVA/TR 98/22/*Hart*) named but not fetched | `[UNCONFIRMED]` (inherited from both source specs + core R1) | per-pack Phase-0 legal map before Lodgey ships; mirrors core R1 (`nexus-concierge-os/spec.md`) |
| R2 | Fitzy has no SRT today — mapping its quarterly review onto core `srt` is an inference, not a verbatim Lodgey artefact | `[INFERENCE]` (`duncan-diy-home-loan/spec.md:111,126`) | validate in Phase 3: first Fitzy quarterly review must write a well-formed core `srt`; if it can't, raise a core issue (not a pack workaround) |
| R3 | `case` and `consent` are net-new core tables with no prior Lodgey definition — column fit is assumed | `[INFERENCE]` (`nexus-concierge-os/spec.md:171`) | Phase 1 proves both instantiate in Lodgey's plane with only additive pack columns |
| R4 | Dmitri guide-only-vs-OAuth fork (source OQ1) could change whether a `case` ever touches a lodgement surface | `[UNCONFIRMED]` (`duncan-itr-button/spec.md:24`) | out of this pack's scope; the case-state map holds under either fork (guide-only just never leaves `open`→`action_dated` via ATO) |
| R5 | Two payment models ($30 Dmitri, $1,000/yr refundable Fitzy) have no core table — assumed pack-local | `[INFERENCE]` (§6b) | keep commerce pack-local (OQ2); revisit only if a second vertical needs shared commerce |

## 9. Open questions (≤5)

1. Does Lodgey's `case` need one row per product interaction, or one long-lived `case` per client spanning Dmitri→Noah→Fitzy? (lean: one `case` per product engagement; a client may hold several) `[UNCONFIRMED]`
2. Is per-vertical commerce (`payments`/`refund_ledger`) always pack-local, or will a later vertical force a core commerce concept? (lean: pack-local) `[UNCONFIRMED]`
3. Is `vertical_pack.domain_map` a checked-in manifest file or a DB row for Lodgey? (inherits core OQ3; lean: checked-in) `[UNCONFIRMED]`
4. Does the Lodgey `provider` panel stay pack-local, or is it shared with later verticals (CARSI credentialing)? (inherits core OQ1; lean: pack-local) `[UNCONFIRMED]`
5. For Fitzy, does the broker return arrive as a core `srt_return`, or only as a `handoff.status` change? (lean: `srt_return`, to keep the bidirectional obligation) `[UNCONFIRMED]`

## 10. Verification plan

- **Zero core changes (the DoD):** `git diff main -- apps/spec-board/projects/nexus-concierge-os/`
  returns empty for this PR; no core migration-template file is modified. `[VERIFIED]` method.
- **Every Lodgey table has a disposition:** each table in the two source specs' §6 appears in
  §6a (core mapping) or §6b (pack-local) here — grep the two source specs' table rows against
  this file. `[VERIFIED]` method.
- **SRT non-redefinition:** this pack references the core SRT definition and adds no semantic
  column; cross-check §6a `srt` row against `nexus-concierge-os/spec.md:166-174`.
- **Evidence-tag integrity:** every claim carries `[VERIFIED]`/`[INFERENCE]`/`[UNCONFIRMED]`;
  every `[UNCONFIRMED]` appears in §8 or §9. `grep -nE '\[(VERIFIED|INFERENCE|UNCONFIRMED)\]' spec.md`.
- **Gate compliance:** PR passes the RA-6815 validation & commit gate (branch, CI green,
  evidence comment to UNI-2170). `[VERIFIED]` gate exists (Pi-Dev-Ops #431 merged).

---

[STATUS] gate: Phill signed off 2026-07-04 (core UNI-2170 approved same day — Phase 2 unlocked).
Awaiting Duncan sign-off; the ITR-Button core-adoption refactor (per
`nexus-concierge-os/migrations/RECONCILIATION-itr-button.md`) starts on his approval.
Maps onto approved core UNI-2170 (`nexus-concierge-os/spec.md`, commit 8bdc85b). Zero core changes.
