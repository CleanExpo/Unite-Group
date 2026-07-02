---
type: spec
product: nexus-concierge-os
pack: ccw
status: draft
locale: en-AU
created: 2026-07-02
issue: UNI-2172
maps_onto: UNI-2170
sources:
  - apps/spec-board/projects/nexus-concierge-os/spec.md          # merged core (UNI-2170) — case/srt/provider/handoff/referral_ledger/nudge/consent/vertical_pack; §2 data-plane isolation; §9 OQ5 (CCW data plane)
  - apps/spec-board/projects/nexus-concierge-os/migrations/0001_core_schema.sql # the nine-table core schema template (the shared contract, in DDL)
  - apps/spec-board/projects/nexus-concierge-os/registry/README.md # manifest field contract; OQ3 resolved (checked-in manifest = SSOT)
  - apps/spec-board/projects/lodgey-pack/spec.md                 # sibling pack (UNI-2171) — mapping-spec pattern + SRT/provider reuse
  - apps/spec-board/projects/restoreassist-pack/spec.md          # sibling pack (RA-6812) — pack pattern, guards-as-state, PII-free-handoff resolution
  - docs/legacy/authority-site/plans/2026-06-02-au-nz-market-dominance-architecture.md # CCW = CCW Carpet Cleaning Brisbane, live client portal + custom CRM on the Nexus-CRM tenant
  - apps/spec-board/projects/unite-group-platform-alignment/spec.md # UNI-2174 (MERGED to main, commit 501ada9e, PR #612) — core OQ5 disposition (CCW data plane): CARRIED, defaulting to isolation
  - apps/spec-board/CLAUDE.md                                    # Evidence Standard + Fable board rules
  - GATE: CleanExpo/Pi-Dev-Ops docs/nexus-concierge-os/validation-and-commit-gate.md (RA-6815, merged #431)
---

# Nexus Concierge OS — CCW Pack (build-ready mapping spec)

> This issue (UNI-2172) owns the **CCW sales & service concierge vertical only**: how CCW
> Carpet Cleaning's customer-and-product intent, equipment/service support, quote follow-up,
> service requests, and trade-customer retention instantiate the merged core (UNI-2170) **with
> zero core changes**. Like RestoreAssist (and unlike Lodgey), CCW has an existing custom CRM
> but **no formal `case`/`srt` schema** — so this pack **defines** the intent-intake → `case`
> mapping, then re-uses SRT, the provider panel, and the no-TFN / PII-free-handoff invariants
> unchanged. `[VERIFIED]` (core §5 Phase 4 + §Vertical-pack notes, `nexus-concierge-os/spec.md:137,232-234`).

## 1. Finish line

A mapping that instantiates the UNI-2170 core for the **CCW sales & service concierge** — the
AI-fronted intake for CCW Carpet Cleaning Brisbane that opens a **case** for a customer or
trade account, produces **SRTs** for product/service intent, follows up quotes, and routes
service/warranty work to a vetted **operator/supplier panel** — such that every CCW concept
lands on a core table (`case`, `srt`, `srt_return`, `consent`, `provider`, `handoff`,
`referral_ledger`, `nudge`, `vertical_pack`) or on a declared **pack-local** table in CCW's own
data plane, and the core contract is touched **nowhere**. Done when: the product-inquiry /
service-request → `case` mapping is defined, the customer-type classification and product/
service SRT are expressed as pack-local shape over core tables (not core edits), the quote and
service follow-up workflows are core `nudge`/`srt` loops, the CCW data-plane disposition is
recorded against core OQ5, and "zero core changes" is demonstrable by grep. `[VERIFIED]` scope
mirrors the UNI-2172 required outputs and core Phase 4 note (`nexus-concierge-os/spec.md:137,232-234`).

## 2. Decision up front

**CCW is instantiated as a pack, not by extending the core** — its logic stays separate from
Lodgey and RestoreAssist and is expressed entirely as a mapping onto the nine core tables plus
pack-local tables. `[INFERENCE]` — mandated by the core DoD "maps onto core with zero core
changes" and the two sibling packs' identical pattern (`nexus-concierge-os/spec.md:134,137`;
`lodgey-pack/spec.md:40`; `restoreassist-pack/spec.md:43`).

**CCW's data plane is the shared Nexus-CRM tenant, NOT an isolated project by default — and
that is exactly core §9 OQ5.** CCW today is a **live client portal + custom CRM whose tables
live in the Nexus CRM production Supabase** (`au-nz-market-dominance-architecture.md:47,78`)
`[VERIFIED]`. Core §9 OQ5 asks whether CCW/CARSI (Nexus-CRM-tenant) share the CRM data plane or
get isolated projects like Lodgey (`nexus-concierge-os/spec.md:206`) `[VERIFIED]`. The now-merged
platform-alignment spec (UNI-2174, merged to main at commit 501ada9e via PR #612) **carries** OQ5
as a Phase-4 per-vertical decision **defaulting to isolation**, made when each vertical is scoped
(`unite-group-platform-alignment/spec.md:240-242,278`) `[VERIFIED]`. This pack — scoping CCW —
therefore records CCW's data plane as **shared Nexus-CRM tenant today, isolation as the merged
default** and makes the final call a Phase-0-for-build decision; the mapping below holds under
either resolution because data-plane isolation is enforced by RLS regardless of which project
hosts the plane (§7).

**The concierge vertical ≠ the CCW operational CRM.** UNI-2172 is the *customer/trade-facing
sales & service concierge* (product intent, quote follow-up, service/warranty handoff); CCW's
existing job-scheduling / operations CRM is a **distinct surface** and is **not** the case-owning
concierge here — it may later be a provider-side/operator tool, out of scope (§3, R4).
`[INFERENCE]` — mirrors the RestoreAssist concierge-vs-SaaS split (`restoreassist-pack/spec.md:50-55`).

**No code before Phill sign-off** — this is a spec; the concierge additionally inherits the
`regime_status = named_unconfirmed` gate (Lens + a lawyer sign CCW's regime before build).
`[VERIFIED]` (`registry/README.md`; core R1 `nexus-concierge-os/spec.md:194`).

## 3. Goals & non-goals

**Goals**
- **Define** the product-inquiry / service-request → core `case` mapping (CCW has an ops CRM but
  no `case`/`srt` schema): one customer or trade intent opens one `case`; product/service intent
  is assessed as core `srt`s; a completed job or supplier answer is an `srt_return`. `[INFERENCE]`
  container/assessment shape from core §4/§6 (`nexus-concierge-os/spec.md:69,145-147`).
- Express **customer-type classification** (residential customer / trade account / franchise
  chain) as a pack-local `case` column, not a new core concept. `[INFERENCE]` — the AU/NZ ICPs
  name the sole-trader tradie and franchise/chain operator as distinct account types
  (`au-nz-market-dominance-architecture.md:130,132`).
- Provide the **CCW product/service SRT template** — Summary(what the customer wants / what's
  wrong with the equipment), Recommendation(product, service, or trade route), Timeline(dated
  next action: quote sent, callback, service visit). `[INFERENCE]` from core SRT definition
  (`nexus-concierge-os/spec.md:168-174`).
- Express **quote follow-up** and **service/warranty follow-up** as core `nudge` loops plus an
  evolving `srt`, so a quote or a service request **never goes dark**. `[VERIFIED]` never-close
  invariant (`nexus-concierge-os/spec.md:165`).
- Map **service / warranty handoff** and **supplier / product escalation** onto core `handoff`
  (PII-free token) + `provider` (operators for service, suppliers for product escalation).
  `[VERIFIED]` core handoff/provider (`nexus-concierge-os/spec.md:150,171`).
- Map **campaign lead follow-up** onto core `case` + `nudge` + disclosed `referral_ledger`
  (where a lead is referred out). `[INFERENCE]` from core follow-up + attribution
  (`nexus-concierge-os/spec.md:119-121`).
- Declare the CCW **`vertical_pack` manifest** (§6c) and the matching `registry/ccw.json`.
- Carry the **no-TFN/no-government-ID** and **PII-free-handoff** invariants as inherited-from-
  core, not re-declared. `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178-181`).

**Non-goals** (REQUIRED)
- **NOT** editing the core spec, the core migration template, or any core table's contract — if
  CCW needed a core change, that is a core issue (UNI-2170), not this pack. `[VERIFIED]` DoD
  boundary (`nexus-concierge-os/spec.md:137`).
- **NOT** re-defining SRT, the provider panel, the case states, or the no-TFN/PII-free rules —
  all inherited. `[VERIFIED]` (core §Non-goals `nexus-concierge-os/spec.md:65`).
- **NOT** Lodgey or RestoreAssist logic — CCW's mapping is independent; it shares only the core
  contract, never those packs' pack-local tables. `[VERIFIED]` sibling packs own their own
  planes (`lodgey-pack/spec.md:144`, `restoreassist-pack/spec.md:150`).
- **NOT** building the CCW concierge here — this is the pack **spec**; CCW's own build owns
  wiring against its data plane. `[INFERENCE]` (mirrors sibling packs `lodgey-pack/spec.md:80`,
  `restoreassist-pack/spec.md:85`).
- **NOT** the CCW operational/job-scheduling CRM (a distinct operator surface) — the concierge is
  the case-owning intake, not the ops tool. `[INFERENCE]` (§2; mirrors `restoreassist-pack/spec.md:87`).
- **NOT** finalising CCW's data plane (shared Nexus-CRM tenant vs isolated project) — the merged
  UNI-2174 disposition of core OQ5 is "carried, defaulting to isolation", the concrete call made
  when CCW is scoped for build (Phase 0). `[VERIFIED]` (`nexus-concierge-os/spec.md:206`;
  `unite-group-platform-alignment/spec.md:240-242,278`).

## 4. Approach (plain language first)

A customer reaches the CCW concierge with an intent: they want a carpet-clean quote, they have a
question about a product or a piece of cleaning equipment, they need a service or a warranty
call, or they are a trade account reordering. The AI greets them, classifies them (residential
customer, trade account, or franchise chain), and opens **one `case`** — the intent. As it
learns, it appends **core `srt`s**: a Summary of what the customer wants or what's wrong, a
Recommendation (which product, which service, or which trade route), and a dated Timeline with
`next_action_at` so a **quote or a service request can never go dark**. Quote follow-up and
service/warranty follow-up are core **`nudge`** loops against that `srt` (quote-sent → chase at
day 2, 5, 10; service booked → confirm, then post-service check). When the job needs a human —
a service or warranty visit — the concierge routes it to a vetted **operator** on CCW's panel
via a core **`handoff`** (opaque, PII-free token); when a product question needs the
manufacturer, a **supplier/product escalation** is a `handoff` to a supplier `provider`. The
operator's or supplier's answer is a **`srt_return`**; any referred-out lead or clipped fee is a
disclosed **`referral_ledger`** row. Campaign leads enter the same way — a campaign lead opens a
`case` and rides the `nudge` follow-up loop. All of this lives in CCW's **own** data plane (the
Nexus-CRM tenant today; an isolated project if OQ5 resolves to isolation), RLS-scoped per
customer/account; the core tables are instantiated there unmodified.

## 5. Phased plan (smallest first)

- **Phase 0 — Ratify the mapping + data-plane disposition.** Lock the intent-intake → `case`
  map, the customer-type-as-column design, the product/service SRT template, and record CCW's
  data plane against core OQ5 (shared Nexus-CRM tenant today; isolation as the merged UNI-2174
  default — the concrete call is this Phase 0's decision). **DoD:** this pack approved
  (`needs-phill-signoff`); gate evidence comment posted to UNI-2170; OQ5 data-plane call recorded
  (R2). `[VERIFIED]` gate exists (`nexus-concierge-os/spec.md:218`).
- **Phase 1 — Instantiate core tables in CCW's data plane.** Apply the core migration template
  (nine tables) to CCW's Supabase branch; add the pack-local extension columns/tables (§6b).
  **DoD:** CCW carries all nine core tables unmodified + its pack-local set; grep proves no core
  table's contract was altered.
- **Phase 2 — Wire intake + classification + SRT.** Product inquiry / service request → `case`;
  customer-type classification → `case.customer_type`; product/service intent → `srt`; consent
  capture → `consent`. **DoD:** an inquiry opens a `case`; a product/service SRT is written with
  `next_action_at`; a case cannot silently close.
- **Phase 3 — Wire follow-up + handoff + escalation.** Quote follow-up + service/warranty
  follow-up → `nudge` loops over an evolving `srt`; service/warranty handoff → `handoff` to an
  operator `provider`; supplier/product escalation → `handoff` to a supplier `provider`;
  answers/completions → `srt_return`; referred leads / clipped fees → disclosed `referral_ledger`;
  campaign lead follow-up → `case` + `nudge`. **DoD:** a quote and a service request each ride a
  never-close `nudge` loop; a service handoff carries no customer address PII (address released
  post-accept from CCW's plane, per §7). Three verticals (Lodgey + RA + CCW) share one core, zero
  core edits.

## 6. Data model — the core→CCW mapping

CCW owns its instance of the **nine core tables** (contract unchanged) plus **pack-local** tables
the core does not define. Core columns are the minimum contract; a pack MAY add columns without
changing the core. `[VERIFIED]` (`nexus-concierge-os/spec.md:157`).

### 6a. Core tables — how CCW fills them

| Core table | CCW instantiation | Pack-added columns | Evidence |
|---|---|---|---|
| `case` | One per customer/trade intent (product inquiry, service request, warranty call, campaign lead) — net-new: CCW has an ops CRM but no case schema | `customer_type` (`residential`\|`trade`\|`franchise`), `intent` (`product_inquiry`\|`service_request`\|`warranty`\|`quote`\|`campaign_lead`), `account_ref` | `[VERIFIED]` CCW = custom CRM, no case schema (`au-nz-market-dominance-architecture.md:78`); `[INFERENCE]` container shape from core §6 (`nexus-concierge-os/spec.md:145`); customer types from ICPs (`au-nz-market-dominance-architecture.md:130,132`) |
| `srt` | CCW product/service SRT (Summary=intent/fault, Recommendation=product/service/trade route, Timeline=dated next action) | `srt_kind` (`product`\|`service`\|`quote`\|`warranty`), `assessment_jsonb` | `[INFERENCE]` product/service-intent-as-SRT (core §4 `nexus-concierge-os/spec.md:69`); CCW has none today |
| `srt_return` | Operator service-completion report or supplier product answer (return-SRT) | — | `[INFERENCE]` from core `srt_return` (`nexus-concierge-os/spec.md:147`) |
| `consent` | Customer data-handling + marketing/follow-up consent; trade-account terms acknowledgement (Privacy Act 1988 + APPs; Spam Act 2003 for follow-up messaging) | `regime='privacy_act_app_spam'`, `account_ref` | `[INFERENCE]` core `consent` net-new (`nexus-concierge-os/spec.md:145`); regime named-not-fetched (R1) |
| `provider` | Vetted CCW operator (service/warranty visits) **and** supplier (product escalation): `credential_ref`←licence/insurance bundle or supplier account; `verified_at`←pre-dispatch check; `active`←onboarding passed | `provider_kind` (`operator`\|`supplier`), `service_area`, `trades[]` | `[VERIFIED]` core `provider` (`0001_core_schema.sql:58-65`); generalises panel per core R2 (`nexus-concierge-os/spec.md:195`) |
| `handoff` | Service/warranty dispatch to an operator **and** product escalation to a supplier: opaque, `carries_pii=false`; customer address released post-accept from CCW's plane (§7) | `status`, `accepted_at` | `[VERIFIED]` core PII-free `handoff` (`nexus-concierge-os/spec.md:150,179`; `0001_core_schema.sql` PII-free CHECK) |
| `referral_ledger` | Referred-out lead or clipped fee (`kind='referral'`\|`'revenue'`\|`'job_value'`, `disclosed` required) | `fee_aud` | `[VERIFIED]` core disclosed ledger (`nexus-concierge-os/spec.md:152,180`) |
| `nudge` | Quote follow-up (chase at day 2/5/10), service/warranty confirm + post-service check, campaign lead follow-up; template-bound | `target` (`customer`\|`operator`\|`supplier`), `template_ref` | `[VERIFIED]` core `nudge` never-close loop (`nexus-concierge-os/spec.md:153,165`) |
| `vertical_pack` | one manifest row for CCW (§6c / `registry/ccw.json`) | — | `[INFERENCE]` core registry (`nexus-concierge-os/spec.md:154`; `registry/README.md`) |

### 6b. Pack-local tables (CCW data plane only — NOT core; proves zero-core-change)

Customer/account identity: `customers` (residential) / `trade_accounts` (trade + franchise
chains) — minimal-PII, **no-TFN/no-gov-ID**, RLS per customer/account; the `case` links to them,
it does not absorb them. `[INFERENCE]` — mirrors Lodgey `clients`/`borrowers`
(`lodgey-pack/spec.md:146-148`). Sales/service domain: `quotes` (line items, price, expiry),
`products` / `product_catalogue` (for product inquiries + supplier escalation), `service_jobs`
(scheduled service/warranty visits — the ops surface the concierge hands to, not the concierge
itself), `campaigns` / `campaign_leads` (source of campaign-lead cases), `follow_up_templates`
(bound message set for `nudge`s), `operator_records` / `supplier_records` (vetting bundle behind
`provider.credential_ref`). `[INFERENCE]` from CCW CRM feature set (lead capture/scoring, contact
management, opportunity/conversion, quote/billing) (`au-nz-market-dominance-architecture.md:44,47`).
The core defines none of these, so they impose **no** change on the core contract. `[VERIFIED]`
(core §2 data-plane isolation `nexus-concierge-os/spec.md:34-42`).

### 6c. `vertical_pack` manifest — CCW

| Field | Value |
|---|---|
| `slug` | `ccw` |
| `domain_map` | `product_inquiry → case` · `service_request → case` · `product_service_intent → srt` · `quote_follow_up → nudge` · `service_warranty_handoff → handoff` · `completion_report → srt_return` |
| `kb_ref` | CCW product/service knowledge base (carpet-cleaning products, equipment, service scope) `[INFERENCE]` |
| `panel_ref` | the `provider` panel (vetted operators for service/warranty; suppliers for product escalation) `[INFERENCE]` (generalises core provider per R2) |
| `regime` | Privacy Act 1988 + APPs (customer data); Spam Act 2003 (marketing/follow-up consent); ACL (consumer guarantees + warranty for goods/services); GST; state contractor licensing / WHS (operator dispatch) — **all named, primary text UNCONFIRMED (R1)** |
| `data_plane` | shared Nexus-CRM tenant (CCW client portal on the Nexus CRM production Supabase) **today**; isolated project as the merged default per core OQ5 (UNI-2174, `unite-group-platform-alignment/spec.md:240-242`); RLS per customer/account either way `[VERIFIED]` today's plane (`au-nz-market-dominance-architecture.md:47,78`) + merged OQ5 disposition; concrete plane chosen at build Phase 0 (R2) |

### Case states — CCW mapping

Core `intake → open → action_dated → awaiting_provider → provider_returned → rolled_forward`
(terminal `closed` only explicit) `[VERIFIED]` (`nexus-concierge-os/spec.md:162-164`).
Inquiry/lead captured→`intake`; consent + classification→`open`; product/service SRT dated
(quote sent / service booked)→`action_dated`; service/warranty or supplier handoff→
`awaiting_provider`; operator/supplier `srt_return`→`provider_returned`; follow-up `nudge`
(retention / next campaign)→`rolled_forward`. `[INFERENCE]` from the CCW intent flow (§4) mapped
onto the core state machine. `next_action_at NOT NULL` (never-close) inherited unchanged — a
quote or a service request must never silently lapse. `[VERIFIED]` (`nexus-concierge-os/spec.md:165`).

## 7. Security & cost guardrails

Inherited from core, re-used not re-declared — plus CCW's dispatch-specific note:
- **PII-free handoff vs operator dispatch.** A service/warranty visit needs a customer address,
  yet core mandates `handoff.carries_pii=false`. Resolution **without a core change** (adopted
  from RestoreAssist, not re-invented): the `handoff` token stays PII-free; address + contact PII
  is released to the operator **only after acceptance**, fetched from CCW's own authenticated
  plane keyed by the opaque token — never embedded in the token or the ledger. `[VERIFIED]`
  pattern (`restoreassist-pack/spec.md:184-190`; core invariant `nexus-concierge-os/spec.md:179`).
- **No-TFN/no-government-ID** invariant applies to every CCW route/table/log/prompt (inherited).
  `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178`).
- **Disclosed referrals** — every `referral_ledger` row records `disclosed`; ACL framing, regime
  text `[UNCONFIRMED]` (R1). `[VERIFIED]` (named) (core §7 `nexus-concierge-os/spec.md:180`).
- **Follow-up consent (Spam Act 2003).** Marketing/follow-up `nudge`s require recorded consent in
  `consent`; template-bound messages only. `[INFERENCE]` from Australian marketing-consent law
  (named, text R1) applied to the never-close `nudge` loop.
- **Data-plane isolation holds under either OQ5 outcome.** Whether CCW's plane is the shared
  Nexus-CRM tenant or an isolated project, isolation is enforced by RLS per customer/account and
  the OS remains shared code+schema, not shared data across verticals. `[INFERENCE]` from core §2
  + template deny-all RLS (`nexus-concierge-os/spec.md:34-42`; `migrations/README.md` RLS).
- **Human-in-the-loop; single-user/private/low-cost** — Fable board rules. `[VERIFIED]`
  (`apps/spec-board/CLAUDE.md`).
- **Cost** — CCW is an existing live portal on the Nexus-CRM Supabase; the mapping introduces no
  new standing cost. `[VERIFIED]` (`au-nz-market-dominance-architecture.md:47`).

## 8. Risk & assumption register

| # | Risk / assumption | Evidence | Mitigation |
|---|---|---|---|
| R1 | CCW regime (Privacy Act/APP, Spam Act 2003, ACL consumer guarantees/warranty, GST, licensing/WHS) named but primary text not fetched; `regime_status` stays `named_unconfirmed` until Lens + a lawyer sign | `[UNCONFIRMED]` (named; `registry/README.md`; inherited core R1 `nexus-concierge-os/spec.md:194`) | per-pack Phase-0 legal map before CCW ships; no build against an unsigned regime |
| R2 | **CCW's concrete data plane (core OQ5) is not yet fixed** — the merged UNI-2174 disposition is "carried, defaulting to isolation", made per-vertical when scoped; today CCW runs on the shared Nexus-CRM tenant, so shared-vs-isolated is a real Phase-0-for-build choice | `[VERIFIED]` merged disposition (`unite-group-platform-alignment/spec.md:240-242,278`; core OQ5 `nexus-concierge-os/spec.md:206`); today's plane (`au-nz-market-dominance-architecture.md:47,78`) | mapping holds under either outcome (§2, §7); pack records "shared Nexus-CRM tenant today, isolation as merged default"; the concrete call is made in build Phase 0 |
| R3 | CCW has no formal `case`/`srt` today — mapping the intent flow onto them is definitional, not observed | `[VERIFIED]` CCW = custom ops CRM (`au-nz-market-dominance-architecture.md:78`) | Phase 2 proves a real inquiry writes a well-formed `case`+`srt`; failure → core issue (UNI-2170), never a pack hack |
| R4 | Concierge vertical vs CCW operational/job-scheduling CRM could be conflated, mis-scoping the pack | `[INFERENCE]` (§2; mirrors RA concierge-vs-SaaS `restoreassist-pack/spec.md:50-55`) | §3 non-goal fixes scope to the customer/trade-facing concierge; the ops CRM is a pack-local surface / future provider-side tool |
| R5 | Trade-customer retention + campaign-lead follow-up could tempt a shared cross-vertical customer store (portfolio view) | `[INFERENCE]` (over-centralisation risk, `unite-group-platform-alignment/spec.md` R4) | keep customer/contact vertical-local (UNI-2174 §6 disposition); retention is a `nudge` loop in CCW's own plane, never a cross-plane join |

## 9. Open questions (≤5)

1. Does one customer map to one long-lived retention `case`, or one `case` per intent (inquiry / quote / service / warranty)? (lean: one `case` per intent; a customer/account holds many) `[UNCONFIRMED]`
2. Is the product/service assessment one evolving `srt` (rolled forward through quote→service) or a new `srt` per intent stage? (lean: new `srt` per stage, per the append-only rule) `[UNCONFIRMED]`
3. Does the operator/supplier return arrive as a core `srt_return`, or only as a `handoff.status` change? (lean: `srt_return`, to keep the bidirectional obligation) `[UNCONFIRMED]`
4. Is the CCW `provider` panel pack-local, or shared with CARSI credentialing / a cross-vertical operator directory? (inherits core OQ1; UNI-2174 answer: pack-local by default) `[UNCONFIRMED]`
5. Does CCW's plane resolve to the shared Nexus-CRM tenant or an isolated project (core OQ5)? (merged UNI-2174 disposition: carried, defaulting to isolation; concrete call at build Phase 0) `[UNCONFIRMED]`

## 10. Verification plan

- **Zero core changes (the DoD):** `git diff main -- apps/spec-board/projects/nexus-concierge-os/`
  returns empty **except** the README-sanctioned added manifest `registry/ccw.json` (a new file,
  not a change to any core table/spec); no core migration-template file is modified. `[VERIFIED]`
  method (`registry/README.md` — one manifest per vertical, added by that vertical's pack PR).
- **No sibling-pack changes:** `git diff main -- apps/spec-board/projects/lodgey-pack/ apps/spec-board/projects/restoreassist-pack/`
  returns empty — CCW logic stays separate. `[VERIFIED]` method (UNI-2172 acceptance criterion).
- **Every CCW concept has a disposition:** each of the nine required-scope items (product inquiry,
  service triage, customer classification, product/service SRT, sales task, quote follow-up,
  service/warranty handoff, supplier escalation, campaign lead follow-up) appears in §6a (core
  mapping) or §6b (pack-local). `[VERIFIED]` method.
- **SRT non-redefinition:** this pack references the core SRT definition and adds no semantic
  column; cross-check §6a `srt` row against `nexus-concierge-os/spec.md:168-174`.
- **PII-free handoff (operator dispatch):** an operator `handoff` row carries no customer
  address/contact PII; address release is a separate post-accept fetch (§7). `[VERIFIED]` method
  (design-level here; test lands in CCW's plane).
- **Evidence-tag integrity:** every claim carries `[VERIFIED]`/`[INFERENCE]`/`[UNCONFIRMED]`;
  every `[UNCONFIRMED]` appears in §8 or §9. `grep -nE '\[(VERIFIED|INFERENCE|UNCONFIRMED)\]' spec.md`.
- **Gate compliance:** PR passes the RA-6815 validation & commit gate (branch, CI green, evidence
  comment to UNI-2172). `[VERIFIED]` gate exists (Pi-Dev-Ops #431 merged).

---

## Registry note

`registry/ccw.json` is added by this PR, following `registry/README.md` ("one checked-in
manifest per vertical … added until each is scoped as its own pack") and mirroring
`lodgey.json` / `restoreassist.json` exactly. `regime_status` stays `named_unconfirmed` (R1);
`data_plane` records the shared Nexus-CRM tenant today with the isolation default (OQ5 / R2).
`[VERIFIED]` (`registry/README.md`).

---

[STATUS] gate: awaiting approval — Phill sign-off required (`needs-phill-signoff`). CCW build
additionally gated on `regime_status` sign-off (Lens + lawyer, R1); CCW's concrete data plane
(core OQ5) is chosen at build Phase 0 under the merged UNI-2174 "carried, defaulting to isolation"
disposition (R2). Maps onto merged core UNI-2170 (`nexus-concierge-os/spec.md`) and merged
platform alignment UNI-2174 (`unite-group-platform-alignment/spec.md`). Zero core changes (except
the README-sanctioned `registry/ccw.json`). CCW logic separate from Lodgey and RestoreAssist.
