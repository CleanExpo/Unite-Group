---
type: spec
product: nexus-concierge-os
pack: restoreassist
status: draft
locale: en-AU
created: 2026-07-01
issue: RA-6812
maps_onto: UNI-2170
sources:
  - apps/spec-board/projects/nexus-concierge-os/spec.md          # merged core (UNI-2170) — case/srt/provider/handoff/referral_ledger/nudge/consent/vertical_pack
  - apps/spec-board/projects/lodgey-pack/spec.md                 # sibling pack (UNI-2171) — mapping-spec pattern + SRT/provider reuse
  - docs/plans/restoreassist/production-readiness-loop.md        # RA crisis-flow gates: dispatch/comms/onboard, vetting, regime, surge
  - apps/spec-board/CLAUDE.md                                    # Evidence Standard + Fable board rules
  - GATE: CleanExpo/Pi-Dev-Ops docs/nexus-concierge-os/validation-and-commit-gate.md (RA-6815, merged #431)
---

# Nexus Concierge OS — RestoreAssist Pack (build-ready mapping spec)

> This issue (RA-6812) owns the **RestoreAssist concierge vertical only**: how the crisis-
> intake → contractor-dispatch flow instantiates the merged core (UNI-2170) **with zero core
> changes**. Unlike Lodgey (which *is* the core's origin), RestoreAssist has **no formal case
> schema today** — so this pack **defines** the crisis-intake → `case` mapping, then re-uses
> SRT, the provider panel, and the no-TFN/PII-free-handoff invariants unchanged. `[VERIFIED]`
> (core §5 Phase 3 + §Vertical-pack notes, `nexus-concierge-os/spec.md:135-137,226-228`).

## 1. Finish line

A mapping that instantiates the UNI-2170 core for the **RestoreAssist concierge** — the AI-
fronted disaster-recovery intake that opens a **case** for a distressed homeowner, assesses
damage as **SRTs**, and dispatches a **vetted contractor** under the crisis-flow safety gates —
such that every RestoreAssist concept lands on a core table (`case`, `srt`, `srt_return`,
`consent`, `provider`, `handoff`, `referral_ledger`, `nudge`, `vertical_pack`) or on a declared
**pack-local** table in RestoreAssist's own data plane (`CleanExpo/Unite-Hub`), and the core
contract is touched **nowhere**. Done when: the crisis-intake → `case` mapping is defined, the
three safety gates (`G4-DISPATCH`/`G4-COMMS`/`G4-ONBOARD`) are expressed as pack-local state
guards (not core edits), the PII-free-handoff-vs-physical-dispatch tension is resolved without a
core change, and "zero core changes" is demonstrable by grep. `[VERIFIED]` scope mirrors core
Phase 3 DoD "RA maps onto core; two verticals share one core" (`nexus-concierge-os/spec.md:137`).

## 2. Decision up front

**RestoreAssist is instantiated as a pack in its own data plane (`Unite-Hub`), not by extending
the core.** `[VERIFIED]` — RestoreAssist's code lives in `CleanExpo/Unite-Hub`, a *separate
product* from the Nexus CRM (`production-readiness-loop.md:3,9`). This pack therefore delivers
(a) a `vertical_pack` manifest, (b) a **core→RA column mapping** for the nine core tables, and
(c) pack-local tables (dispatch guard, vetting records, crisis-comms templates) that live in
Unite-Hub beside the core tables and never alter the core contract.

**The concierge vertical ≠ the restoreassist.app restorer SaaS.** RA-6812 is the *homeowner-
facing crisis concierge* (content→lead→CRM→contractor dispatch) `[VERIFIED]`
(`production-readiness-loop.md:9`); the restoreassist.app product (restorer CRM + job-management
+ IICRC S500/S520 workflows, self-hosted) is a **distinct surface** and is **not** the case-
owning concierge here. `[VERIFIED]` (`restoreassist-product-facts` memory). It could later be a
provider-side tool, but that is out of scope (§3, R3).

**No code before Phill sign-off** — this is a spec, and the RA crisis flow additionally carries
a phase-0 compliance blocker (`P5.8-REGIME`) that Lens + a lawyer must sign. `[VERIFIED]`
(`production-readiness-loop.md:91,103`).

## 3. Goals & non-goals

**Goals**
- **Define** the crisis-intake → core `case` mapping (RA has none today): a homeowner incident
  opens one `case`; damage assessment appends core `srt`s; contractor completion is an
  `srt_return`. `[VERIFIED]` no-schema-today (`nexus-concierge-os/spec.md:227`); assessment-as-SRT
  `[INFERENCE]` (mirrors core §4 "appends SRTs", `nexus-concierge-os/spec.md:69`).
- Map the **vetted contractor network** onto core `provider`, carrying RA's re-verify-before-
  dispatch vetting as `provider.verified_at` freshness. `[VERIFIED]` (`production-readiness-loop.md:93,102`).
- Express the three crisis-flow **safety gates as pack-local state guards** on core transitions,
  not as core changes: `G4-DISPATCH` (no `handoff` until `provider.verified_at` fresh),
  `G4-ONBOARD` (a `provider` is inactive until credentials+insurance verified), `G4-COMMS`
  (crisis `nudge`s are template-bound + human-escalated). `[VERIFIED]` (`production-readiness-loop.md:74,77,78`).
- Resolve the **PII-free-handoff vs physical-dispatch** tension without a core change (§7).
- Declare the RestoreAssist **`vertical_pack` manifest** (§6c).
- Carry the **no-TFN/no-government-ID** and **PII-free-handoff** invariants as inherited-from-
  core, not re-declared. `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178-181`).

**Non-goals** (REQUIRED)
- **NOT** editing the core spec, the core migration template, or any core table's contract — if
  RA needed a core change, that is a core issue (UNI-2170), not this pack. `[VERIFIED]` DoD
  boundary (`nexus-concierge-os/spec.md:137`).
- **NOT** re-defining SRT, the provider panel, the case states, or the no-TFN/PII-free rules —
  all inherited. `[VERIFIED]` (core §Non-goals `nexus-concierge-os/spec.md:65`).
- **NOT** building the RA concierge here — this is the pack **spec**; the RA production-readiness
  loop owns build/gate execution against Unite-Hub. `[VERIFIED]` (`production-readiness-loop.md:9`).
- **NOT** the restoreassist.app restorer SaaS (CRM/job-management/IICRC workflows) — separate
  product surface. `[VERIFIED]` (`restoreassist-product-facts` memory).
- **NOT** resolving RA's own phase-0 blockers (compliance regime sign-off, surge target, payment
  cap) — those stay in the RA readiness loop's gate registry. `[VERIFIED]` (`production-readiness-loop.md:91,102`).

## 4. Approach (plain language first)

A homeowner in a flooded or fire-damaged house reaches the RestoreAssist concierge. The AI
greets them and opens **one `case`** — the incident. As it learns the damage, it appends
**core `srt`s**: a Summary of the situation, a Recommendation (make-safe / remediation / which
trade), and a dated Timeline with `next_action_at` so a crisis case can **never go dark**. When
a contractor is needed, the concierge matches a **vetted `provider`** from the panel and creates
a core **`handoff`** — an opaque, PII-free token. Because RA physically routes a stranger to a
vulnerable home, the safety gates bite here: the `handoff` **cannot be created** unless the
provider's vetting is fresh (`G4-DISPATCH`), a provider is not on the panel at all until
credentials + insurance are verified (`G4-ONBOARD`), and every crisis message is a template-
bound, human-escalated **`nudge`** (`G4-COMMS`). The homeowner's **address is never carried in
the handoff token**; it is released to the contractor only *after* they accept, from RA's own
authenticated surface in Unite-Hub — so the core PII-free-handoff invariant holds unchanged
(§7). The contractor's completion report is a **`srt_return`**; job value and any referral clip
is a disclosed **`referral_ledger`** row (payments capped at AUD $0 auto-approve in pilot). All
of this lives in RA's **own** Unite-Hub data plane; the core tables are instantiated there
unmodified.

## 5. Phased plan (smallest first)

- **Phase 0 — Ratify the mapping + regime.** Lock the crisis-intake → `case` map, the safety-
  gate-as-state-guard design, and confirm the PII-free-handoff resolution. **DoD:** this pack
  approved (`needs-phill-signoff`) + RA's `P5.8-REGIME` phase-0 compliance blocker acknowledged
  as a precondition to any RA build. Gate evidence comment posted to UNI-2170. `[VERIFIED]`
  (`nexus-concierge-os/spec.md:218`; `production-readiness-loop.md:91`).
- **Phase 1 — Instantiate core tables in Unite-Hub.** Apply the core migration template (nine
  tables) to RA's data plane; add pack-local extension tables (§6b). **DoD:** RA carries all nine
  core tables unmodified + its pack-local set; grep proves no core table's contract was altered.
- **Phase 2 — Wire crisis-intake + assessment.** Crisis lead → `case`; damage assessment →
  `srt`; consent capture → `consent`. **DoD:** an intake opens a `case`; an assessment writes a
  core `srt` with `next_action_at`; a case cannot silently close.
- **Phase 3 — Wire dispatch under the safety gates.** Vetted contractor → `provider`; match+
  dispatch → `handoff` (PII-free), guarded by `G4-DISPATCH`/`G4-ONBOARD`; crisis comms → `nudge`
  (`G4-COMMS`); completion → `srt_return`; job value → `referral_ledger`. **DoD:** no `handoff`
  is creatable against a provider with stale/absent vetting (test); address PII never appears in a
  `handoff` row (test). Two verticals (Lodgey + RA) now share one core, zero core edits.

## 6. Data model — the core→RestoreAssist mapping

RA owns its instance of the **nine core tables** (contract unchanged) plus **pack-local** tables
the core does not define, all in Unite-Hub. Core columns are the minimum contract; a pack MAY add
columns without changing the core. `[VERIFIED]` (`nexus-concierge-os/spec.md:157`).

### 6a. Core tables — how RestoreAssist fills them

| Core table | RestoreAssist instantiation | Pack-added columns | Evidence |
|---|---|---|---|
| `case` | One per crisis incident (net-new: RA has no case schema today) | `incident_type` (`water`\|`fire`\|`mould`\|`storm`), `property_ref` | `[VERIFIED]` no-schema (`nexus-concierge-os/spec.md:227`); `[INFERENCE]` container shape from core §6 |
| `srt` | Damage-assessment SRT (Summary=situation, Recommendation=make-safe/remediation/trade, Timeline=dated next action) | `assessment_jsonb` | `[INFERENCE]` assessment-as-SRT (core §4 `nexus-concierge-os/spec.md:69`); RA today has none |
| `srt_return` | Contractor completion/progress report (return-SRT) | — | `[INFERENCE]` from core `srt_return` (`nexus-concierge-os/spec.md:147`) |
| `consent` | Homeowner data-handling + dispatch-authorisation consent (Privacy Act 1988 + APPs) | `regime='privacy_act_app'` | `[VERIFIED]` regime (`production-readiness-loop.md:103`); core `consent` `[INFERENCE]` |
| `provider` | Vetted contractor: `credential_ref`←licence/insurance/police/reference bundle; `verified_at`←re-verify-before-dispatch; `active`←onboarding passed | `trades[]`, `service_area`, `insurance_expiry` | `[VERIFIED]` (`production-readiness-loop.md:78,102`; generalises panel per core R2) |
| `handoff` | Contractor dispatch: opaque, `carries_pii=false`; address released post-accept from RA plane (§7) | `status`, `accepted_at` | `[VERIFIED]` (core `handoff` PII-free `nexus-concierge-os/spec.md:150,179`; dispatch `production-readiness-loop.md:74`) |
| `referral_ledger` | Job value / referral clip (`kind='job_value'`\|`'referral'`); payment auto-cap AUD $0 in pilot (all human-approved) | `payment_status` (`queued`\|`approved`) | `[VERIFIED]` (`production-readiness-loop.md:102`) |
| `nudge` | Never-close follow-up **and** crisis-comms escalation (15-min ack → auto-escalate); template-bound | `template_ref`, `escalation_tier` | `[VERIFIED]` (`production-readiness-loop.md:77`) |
| `vertical_pack` | one manifest row for RestoreAssist (§6c) | — | `[INFERENCE]` core registry (`nexus-concierge-os/spec.md:154`) |

### 6b. Pack-local tables (Unite-Hub data plane only — NOT core; proves zero-core-change)

`dispatch_guard` (evaluates `G4-DISPATCH`: fresh-vetting + fairness before a `handoff` may be
created), `vetting_records` (licence, public-liability + workers-comp insurance, ID, police
check, reference — re-verified before every dispatch), `crisis_templates` (bound message set for
`G4-COMMS`), `compliance_attestations` (`P5.8-REGIME`: PCI-DSS SAQ-A, Privacy Act/APP + OAIC,
QBCC/state licensing + WHS, ACL, GST), `surge_policy` (~100 concurrent intakes + degrade ladder).
`[VERIFIED]` (`production-readiness-loop.md:74,92,93,102,103`). The core defines none of these,
so they impose **no** change on the core contract. `[VERIFIED]` (core §2 data-plane isolation).

### 6c. `vertical_pack` manifest — RestoreAssist

| Field | Value |
|---|---|
| `slug` | `restoreassist` |
| `domain_map` | `crisis_intake → case` · `damage_assessment → srt` · `contractor_dispatch → handoff` · `completion_report → srt_return` |
| `kb_ref` | RA crisis-flow knowledge base (make-safe / remediation guidance) `[INFERENCE]` |
| `panel_ref` | the `provider` panel (vetted contractors, re-verified before dispatch) `[VERIFIED]` (`production-readiness-loop.md:102`) |
| `regime` | PCI-DSS (SAQ-A); Privacy Act 1988 + APPs + OAIC breach notification; state contractor licensing (QBCC/equiv) + WHS; ACL; GST; **insurance = facilitate/refer only** (avoids AFSL claims-handling) — Lens + lawyer sign-off (R1) `[VERIFIED]` (`production-readiness-loop.md:103`) |
| `data_plane` | `CleanExpo/Unite-Hub`, AU-region, RLS per case/provider; **not** the Nexus CRM `[VERIFIED]` (`production-readiness-loop.md:9`) |

### Case states — RestoreAssist mapping

Core `intake → open → action_dated → awaiting_provider → provider_returned → rolled_forward`
(terminal `closed` only explicit) `[VERIFIED]` (`nexus-concierge-os/spec.md:162-164`).
Crisis lead captured→`intake`; consent + triage→`open`; assessment SRT dated→`action_dated`;
**guarded** dispatch (`G4-DISPATCH` passes)→`awaiting_provider`; contractor `srt_return`→
`provider_returned`; follow-up `nudge`→`rolled_forward`. `[INFERENCE]` from
`production-readiness-loop.md:74,77`. `next_action_at NOT NULL` (never-close) inherited unchanged
— load-bearing for a crisis case. `[VERIFIED]` (`nexus-concierge-os/spec.md:165`).

## 7. Security & cost guardrails

Inherited from core, re-used not re-declared — plus RA's crisis-specific structural gates:
- **PII-free handoff vs physical dispatch (the resolved tension).** RA must route a contractor
  to a home address, yet core mandates `handoff.carries_pii=false`. Resolution **without a core
  change**: the `handoff` token stays PII-free; the address + contact PII is released to the
  contractor **only after acceptance**, fetched from RA's own authenticated Unite-Hub surface
  keyed by the opaque token — never embedded in the token or the ledger. `[INFERENCE]` — the core
  invariant (`nexus-concierge-os/spec.md:179`) holds if PII delivery is a post-accept pack-local
  step; this is the pack's central design assertion (R2).
- **No dispatch on unverified/stale match (`G4-DISPATCH`, blocker).** A `case` cannot transition
  to `awaiting_provider` (no `handoff` row) unless `dispatch_guard` confirms fresh vetting +
  fairness — a pack-local state guard, not a core edit. `[VERIFIED]` (`production-readiness-loop.md:74,93`).
- **Onboarding verifies credentials + insurance (`G4-ONBOARD`, blocker).** `provider.active=false`
  until `vetting_records` complete. `[VERIFIED]` (`production-readiness-loop.md:78,102`).
- **Crisis comms template-bound + human-escalated (`G4-COMMS`).** Every crisis `nudge` uses a
  bound `template_ref`; 15-min ack → auto-escalate. `[VERIFIED]` (`production-readiness-loop.md:77`).
- **No-TFN/no-government-ID** invariant applies to every RA route/table/log/prompt (inherited).
  `[VERIFIED]` (core §7 `nexus-concierge-os/spec.md:178`).
- **Payments queue, never auto-fire in pilot.** `referral_ledger.payment_status` starts `queued`;
  auto-cap AUD $0; insurance facilitate/refer only. `[VERIFIED]` (`production-readiness-loop.md:102,103`).
- **Data-plane isolation + cost.** RA data stays in Unite-Hub; no new standing cost introduced by
  the mapping; surge target ~100 concurrent intakes owned by RA's load gate. `[VERIFIED]`
  (`production-readiness-loop.md:9,92`).

## 8. Risk & assumption register

| # | Risk / assumption | Evidence | Mitigation |
|---|---|---|---|
| R1 | RA compliance regime (PCI-DSS, Privacy Act/APP, QBCC/WHS, ACL, GST) named but primary text not fetched; Lens + lawyer must sign | `[VERIFIED]` named, text `[UNCONFIRMED]` (`production-readiness-loop.md:103`) | `P5.8-REGIME` is a phase-0 blocker in RA's own loop; no RA build ships before sign-off |
| R2 | The PII-free-handoff resolution (§7) is a design assertion — if the concierge cannot dispatch without embedding the address, it would force a core change | `[INFERENCE]` (`nexus-concierge-os/spec.md:179`) | Phase 3 test: a `handoff` row must contain no address/contact PII; if impossible, raise a **core** issue (UNI-2170), never a pack workaround |
| R3 | Concierge vertical vs restoreassist.app SaaS could be conflated, mis-scoping the pack | `[VERIFIED]` two surfaces (`production-readiness-loop.md:9`; `restoreassist-product-facts` memory) | §3 non-goal fixes scope to the concierge flow; SaaS-as-provider-tool deferred |
| R4 | RA has no formal `case`/`srt` today — mapping crisis-flow onto them is definitional, not observed | `[VERIFIED]` (`nexus-concierge-os/spec.md:227`) | Phase 2 proves a real intake writes a well-formed `case`+`srt`; failure → core issue, not pack hack |
| R5 | Surge (~100 concurrent crisis intakes) could stress the never-close `nudge` engine | `[VERIFIED]` target (`production-readiness-loop.md:92`) | RA's `P5.7-LOAD-TARGET` gate + degrade ladder owns this; pack only asserts the mapping |

## 9. Open questions (≤5)

1. Does one crisis incident map to exactly one `case`, or can a multi-trade job fan out to child cases per trade? (lean: one `case`, multiple `handoff`s) `[UNCONFIRMED]`
2. Is the damage assessment one evolving `srt` (rolled forward) or a new `srt` per site visit? (lean: append a new `srt` per visit, per the append-only rule) `[UNCONFIRMED]`
3. Does the contractor return arrive as a core `srt_return`, or only as a `handoff.status` change? (lean: `srt_return`, to keep the bidirectional obligation) `[UNCONFIRMED]`
4. Is the provider panel RA-local, or shared with CARSI credentialing / DR-NRPG contractor directory? (inherits core OQ1; lean: RA-local for now) `[UNCONFIRMED]`
5. Where does the post-accept address release run — Unite-Hub edge function or the contractor's authenticated portal? (inherits core OQ2; lean: contractor portal) `[UNCONFIRMED]`

## 10. Verification plan

- **Zero core changes (the DoD):** `git diff main -- apps/spec-board/projects/nexus-concierge-os/`
  returns empty for this PR; no core migration-template file is modified. `[VERIFIED]` method.
- **PII-free handoff (RA's headline invariant):** the Phase-3 acceptance test asserts a `handoff`
  row (and `referral_ledger` row) contains no address/contact PII; address release is a separate
  post-accept fetch. `[VERIFIED]` method (design-level here; test lands in Unite-Hub).
- **Safety gates are guards, not core edits:** `G4-DISPATCH`/`G4-ONBOARD`/`G4-COMMS` appear in §6b
  (pack-local) / §7, never as new core columns — grep the core `case`/`provider`/`handoff` rows.
- **Evidence-tag integrity:** every claim carries `[VERIFIED]`/`[INFERENCE]`/`[UNCONFIRMED]`; every
  `[UNCONFIRMED]` appears in §8 or §9. `grep -nE '\[(VERIFIED|INFERENCE|UNCONFIRMED)\]' spec.md`.
- **Gate compliance:** PR passes the RA-6815 validation & commit gate (branch, CI green, evidence
  comment to UNI-2170). `[VERIFIED]` gate exists (Pi-Dev-Ops #431 merged).

---

[STATUS] gate: awaiting approval — Phill sign-off required (`needs-phill-signoff`); RA build
additionally gated on `P5.8-REGIME` (Lens + lawyer). Maps onto merged core UNI-2170
(`nexus-concierge-os/spec.md`, commit 8bdc85b). Zero core changes.
