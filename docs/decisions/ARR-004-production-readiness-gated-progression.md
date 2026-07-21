# ARR-004 — Production Readiness and Gated Progression

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **CONDITIONAL HOLD** — until governance mechanisms are live
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-001](./ARR-001-nexus-engineering-baseline.md) · [ARR-002](./ARR-002-governance-and-engineering-foundations.md) · [ARR-003](./ARR-003-ecosystem-intelligence-build-vs-adopt.md)

> Normative language per **RFC 2119** / **RFC 8174**.

---

## 1. Purpose

**Define when it is safe to move forward without creating debt or drift.**

**Production readiness is not a vibe. It is a gated progression with evidence at each stage.**

A stage is complete when its **artefacts exist and are verifiable** — not when it feels done, not
when a document asserts it, and not when a ticket is marked Done. This estate has direct evidence of
all three failure modes (§4.1).

---

## 2. The stage ladder

| Stage | Contents | Claimed status | Evidenced status |
|---|---|---|---|
| **0** | **Constitutional foundation** | **Complete** | **⚠ CHALLENGED — see §2.1** |
| **1** | **Governance foundation** — Registry · Evidence Board · ADRs | **In progress** | **Confirmed in progress.** ADRs established today (ARR-001..004). Registry **0 rows**. Evidence Board **no substrate**. |
| **2** | **Capability intelligence · ecosystem evaluation** | Not started | **Confirmed not started.** Zero build-vs-adopt assessments ever recorded. |
| **3** | **Core platform** — identity · orchestration · learning loops | Not started | **⚠ Partially contradicted — see §2.2** |

**Stages MUST NOT be entered out of order.** Each depends on the prior stage's artefacts existing —
not on its tickets being closed.

### 2.1 CHALLENGE — Stage 0 is not complete by its own evidence standard

**FACT.** The EPIC-000 constitution exists in **neither the repository nor the tracker**.

- Repo: zero hits for `EPIC-000`, `Adaptive Control Plane`, `twenty-stage`, `Engineering Scorecard`
  across `.md/.mdx/.sql/.ts`. **Positive control:** the same tooling trivially finds `cc_tasks`
  (81 files) and `Nexus` (200+ files) — the null is real.
- Linear: **no ticket contains the literal token `EPIC-000`**. **Positive control:** the same queries
  returned full 25-issue result sets.

**The constitution has been binding in conversation only.**

Per ARR-001 §1: *a constitution that lives only in a session dies with the session.* Per EPIC-000 §15,
the Definition of Done is **unmeasurable** while there is no artefact to measure. Per §20 (*all
material technical decisions must remain explainable, reviewable, reversible, and attributable*), a
constitution nobody can open is not reviewable.

**This record cannot ratify Stage 0 as complete on the available evidence.** ARR-001 through ARR-004
now exist and carry the *architecture* baseline — but they are **downstream** of the constitution, not
a substitute for it. They cite an authority that has no artefact.

**Recorded as CHALLENGED, not rejected.** The gap is narrow and cheaply closed: **land EPIC-000 in the
repository and ticket it.** Once the artefact exists, Stage 0 completes and this challenge is
withdrawn. **Until then, Stage 1 is proceeding on an unratified foundation** — which is the exact
drift this ladder exists to prevent, occurring at the ladder's first rung.

### 2.2 CHALLENGE — Stage 3 work is already in progress, out of order

**FACT.** *"Only after that do we touch core platform like identity, orchestration, and learning
loops"* — but core-platform work is **live today**:

- **Orchestration:** `.spm/2026-07-17-mission-control-phase1-foundation.md` (UNI-2246,
  UNI-2403–2415) is **"APPROVED FOR SLICE A BUILD"** with **six tickets In Progress**, building a
  brokered three-machine CLI fleet.
- **Identity:** UNI-2434 (Google Identity Graph) is filed; UNI-2329 (Google connect via CRM) is Todo.
- **Learning loops:** `.harness/learning/` exists as a structure (empty, hooks never shipped).

**The ladder describes a sequence the estate is not currently following.** This is not an argument
against the ladder — it is evidence that **the ladder needs an explicit reconciliation with in-flight
work**, or it will be a document that describes an imaginary project while the real one proceeds
beside it. That is governance drift in its most common form.

**Ruling required:** does MC-P1 (a) pause pending Stages 0–2, (b) continue as an explicitly
grandfathered exception with its scope frozen, or (c) is it *reclassified* as the Stage 1 governance
foundation it substantially already is — noting **UNI-2409 is building ARR-002 §2's mechanism 4
(human approval at the tool-call boundary) right now**? **Recorded as OPEN.**

---

## 3. Readiness gates

Every stage transition and every release MUST pass:

| Gate | Requirement | Current estate evidence |
|---|---|---|
| **Auditability** | Immutable record of what happened, who authorised it, on what evidence | **Schema READY, unused.** `cc_task_events` + `cc_evidence_records` are append-only (SELECT+INSERT, no UPDATE/DELETE, RLS-enforced). `cc_evidence_records` = **0 rows**. `.harness/swarm/swarm.jsonl` **does not exist** despite `audit-emit` asserting it does. |
| **Reproducibility** | A result MUST be re-derivable by someone else from the recorded inputs | **Weak.** `20260604000000_cc_command_centre.sql:3-4` cites two design documents that **do not exist**; that schema's rationale is unreproducible. |
| **Observability** | The live system's behaviour is visible, not inferred | **Weak.** `cc_agent_events` migration adds the table to `supabase_realtime` so the wall's subscription receives rows — **no Realtime subscription exists anywhere in `src`**; the wall is a static fetch. |
| **Rollback** | Every action carries a stated reversal path, tested | **Partial.** DR-NRPG ran a rollback/PITR drill (precedent exists). Migrations are `FOUNDER-GATED APPLY` — a gate, not a rollback. UNI-2434 requires *"rollback per action"* by design. |

**Each release MUST produce evidence, not just code.**

**This is the sharpest gate in the ladder and the estate currently fails it.** Direct instance:
`scripts/nexus-runner`'s *"2026-07-16: runner armed in prod and demo-proven"* is **a one-line README
commit** — no code change, no test, no CI artifact, no `cc_agent_events` export — **contradicted by
the same day's handoff**, which listed arming as still-open and warned *"the E2E proof is LOCAL
evidence."* A release produced a **claim**, not evidence.

**The pattern that passes this gate — enforced refusal.** `apps/autopilot-runner`'s entrypoint is a
refusal tombstone and its build **fails** if any of ~30 retired paths is restored. It **proves**
non-execution in code rather than asserting it. **Generalise this: a gate whose only enforcement is a
document is not a gate.** UNI-2420's own fog section reaches the same conclusion — *"Convention is
what failed."*

---

## 4. Risk check — confirmed against evidence

| Risk (as stated) | Verdict | Evidence |
|---|---|---|
| **Empty registry breaks reuse logic** | **CONFIRMED — and it is worse than "breaks"** | It **inverts**. Stage 3 search against 0 rows returns nothing for every candidate, falls through to Stage 5, and concludes *"build new"* — with the full governance ceremony executing correctly. It does not fail safe; it **manufactures the wrong answer**. Live proof, today: `Nexus Concierge OS` (Phase 1 **100% done**) and stub **DR-854** already cover a capability being freshly framed — a registry search would have surfaced both in seconds; instead it took a 49-tool-call sweep. **Additionally**: population alone is insufficient — 13 real MCP servers are uncatalogued and 2 are misnamed (`chrome` is `claude-in-chrome`), so exact-match lookup returns "build new" for capabilities that exist. **Name reconciliation is in scope.** |
| **Model coupling creates long-term fragility** | **CONFIRMED, unmeasured** | ARR-003 §5 holds models as interchangeable capabilities. But **Lock-in risk is one of the 12 §7 dimensions omitted from ARR-003's 8-dimension scorecard** — the risk is named here and measured nowhere. |
| **Governance drift without ADR discipline** | **CONFIRMED — already occurred** | Exactly **one ADR** existed before today (2026-03-31, "Proposed", unrelated). **No ADR covered Nexus, OWNEST, Mission Control, or Atlas.** Consequences already materialised: three governance tracks that cannot see each other; three incompatible disposition sets (5 / 4 / 3); "Atlas" colliding with an existing agent persona; "Nexus 2.0" naming two different systems; a schema whose rationale is unreachable. **This is not a forward-looking risk. It is a present-tense description.** |

### 4.1 An unlisted risk this ladder MUST account for

**"Done" is not evidence in this estate — and the estate has proven it about itself.**

DR-NRPG's own evidence audits (DR-916, DR-915) found **183 Done tickets in Disaster Recovery Website
with zero merge evidence — 61 confirmed falsely marked** — plus 46 unverified in DR-NRPG Ops,
including a batch of identically-timestamped `2026-07-02T07:35:0x` "Done" tickets. Separately, UNI-2373
is marked **Done** while its own dependent migrations remain unapplied.

**Consequence for §2:** a stage MUST NOT be ratified on ticket status. **Stage completion requires
artefact verification.** This is also why §2.1 challenges Stage 0 rather than accepting "complete" —
applying the rule to the ladder's own first rung.

---

## 5. Decision — **CONDITIONAL HOLD**

**Held until governance mechanisms are live.** Not until they are designed, ticketed, or documented —
**live**, meaning enforced at a real boundary and producing artefacts.

| Mechanism (ARR-002 §2) | Live? | Evidence |
|---|---|---|
| Intent validation | **No** | Not built |
| Registry search | **No — inoperative** | 0 rows |
| Evidence review | **No — no substrate** | `cc_evidence_records` 0; `.harness/learning` 5-of-5 empty, 56 days stale |
| Human approval | **Partial** | `cc_approvals`/`cc_decisions` exist; **UNI-2409 In Progress** building the tool-call boundary; **3-of-5 dispositions unstorable** (ARR-003 §4.1) |
| Verification | **No** | Not built |
| Learning | **No** | Hooks never shipped |

**Zero of six are live. One is partial and is being built on a different track than the one
commissioning it.**

---

## 6. Open items requiring founder ruling — consolidated

| # | Item | Where |
|---|---|---|
| 1 | **Stage 0 challenged** — land EPIC-000 in-repo to close it | §2.1 |
| 2 | **Stage 3 work already in progress** — pause, grandfather, or reclassify MC-P1? | §2.2 |
| 3 | **Scorecard: 8 or §7's 20?** Lock-in risk, constitutional fit, confidence omitted | ARR-003 §3.1 |
| 4 | **Dispositions: 4, 5, or 3?** "Trial" dropped; Kimi K3's tier maps to nothing | ARR-003 §4.1 |
| 5 | **SPM placement** — constitutional, ACP, or Executive? | ARR-002 §1.2 |
| 6 | **66 canonical defects** — no disposition ledger; **62/100 NOT-READY** stands | ARR-001 §7.2 |
| 7 | **Track proliferation** — Atlas vs MC-P1 vs UNI-2379 | ARR-001 §7.2 |
| 8 | **`cc_decisions` migration** — founder-gated, on the critical path | ARR-003 §4.1 |

**Item 6 remains the one that outranks the ladder.** A standing 62/100 NOT-READY with 66 canonical
defects and no disposition ledger makes Stage 2 and Stage 3 moot regardless of Stage 1's progress.
**UNKNOWN** how many are closed — they were not walked against current `main`.

---

## 7. Revisit conditions

1. §5's six mechanisms live → hold lifts to a go/no-go on EPIC-001.
2. EPIC-000 landed in-repo → §2.1 challenge withdrawn, Stage 0 ratified.
3. Any §6 item ruled → this record updated or superseded.
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by ARR-001 §6.4 and EPIC-000 §12/§18. **Route to an independent non-Claude reviewer before
acting on §5.**

---

*Filed 2026-07-17. Status CONDITIONAL HOLD. No code written. No state changed. Every claim cites its
evidence or is labelled ASSUMPTION / UNKNOWN / OPEN / CHALLENGED.*
