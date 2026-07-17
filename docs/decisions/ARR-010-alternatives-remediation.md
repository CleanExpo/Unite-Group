# ARR-010 — Alternatives Remediation for ARR-001..009

**Type:** Architecture Review Record — **remediation record**
**Status:** **REMEDIATION COMPLETE for the records it covers. One gap in the standard itself is raised, not resolved.**
**Date:** 2026-07-17
**Author:** Claude Opus 4.8
**Remediates:** the violation logged by [ARR-006](./ARR-006-engineering-evidence-framework.md) §5.1, ratified by **Constitutional Operations §4**
**Baseline:** `origin/main` @ `d178e809`

> **Constitutional Operations §4:** every amendment MUST carry **owner · rationale · evidence ·
> **alternatives** · impact · decision · permanent log.**
>
> **ARR-006 §5.1 found — against its own author — that ARR-001..008 carry four of five: evidence,
> assumptions, consequences, and revisit conditions, but largely NOT alternatives.** Under §4 that is
> now a **standard violation**. This record closes it.

---

## 1. The finding that working the remediation produced

**The amendment standard assumes the record's author is the decider. For most of this series, they were not.**

**ARR-001 through ARR-008 are, in the main, *dictation capture*.** The founder authored constitutional
blocks in sequence; the author of the records **transcribed, evidenced, and annotated them.** The
author did not choose between options — **the founder did, and weighed the alternatives before
speaking.**

**So "alternatives considered: none" is not a gap in those records. It is an accurate description of
what happened** — and per ARR-006 §5.1, *an explicit statement that no alternative was weighed is itself
an honest and useful record.*

**⚠ But that exposes a real gap in the standard, and it is raised here rather than papered over:**
**§4's "alternatives" field silently assumes an authoring decider.** For a dictated constitutional
block, the alternatives exist — **in the founder's reasoning, unrecorded**. The record captures the
decision and loses the deliberation. **That is exactly the decay §4 exists to prevent, arriving through
the one door §4 does not watch.**

**Recorded as OPEN (§4 below). Not resolved by an agent.**

---

## 2. Where the author DID choose — alternatives now recorded

Four records contain genuine authorial decisions. Their alternatives:

### ARR-001 §3 — the sequencing correction

**Decision:** populate the Capability Registry **before** EPIC-000 §16's landscape scan.

| Alternative | Why rejected |
|---|---|
| **Follow §16 literally** — landscape scan first | Stage 3 against a **0-row** registry returns nothing for **every** candidate, falls through to Stage 5, and concludes *"build new"* — **inverting Principles 2 and 18** while executing the ceremony correctly. The scan's output would be **systematically biased toward building, and would look rigorous while being wrong.** |
| **Run both in parallel** | The scan's Stage 3 input is the registry. Parallelism does not remove the dependency; it hides it. |
| **Declare §16 unworkable and rewrite it** | Exceeds an agent's authority. §16 is constitutional; the correction is a **sequencing** matter, not a constitutional defect — the founder's own framing, and the right one. |

**Chosen because** an empty registry does not fail safe — **it manufactures the wrong answer.** Founder concurred.

### ARR-005 — a new record vs amending ARR-004

**Decision:** file ARR-005 and have it **supersede ARR-004 §2 only**.

| Alternative | Why rejected |
|---|---|
| **File ARR-005 as a full record**, restating ARR-004's gates, risks, and decision | **Duplicates a live record under a new number** — the exact drift the series exists to prevent, and a Principle 2 violation *inside the series mandating Principle 2*. |
| **Silently edit ARR-004's ladder** from four stages to six | **Prohibited by ARR-008 §1.** Silent change. |
| **Leave both ladders live** | Two contradictory ladders is governance drift by definition. |

**Chosen because** it keeps exactly one ladder authoritative while preserving ARR-004's still-valid gates.

### ARR-007 — piecemeal vs consolidated

**Decision:** **rewrite** ARR-007 as one consolidated section when the founder consolidated the block.

| Alternative | Why rejected |
|---|---|
| **Append the consolidated block** to the existing piecemeal ARR-007 | Leaves the same doctrine stated twice, in two shapes, in one record. |
| **File it as ARR-008** | A new number for a rewrite of the same subject — number inflation, and it would have stranded ARR-007's citations. |

**Chosen because** the founder's consolidation superseded the drafting order; one subject, one record.

### ARR-009 — amend-in-place vs a versioned amendment record

**Decision:** file ARR-009 as a **versioned amendment record**; touch no existing record.

| Alternative | Why rejected |
|---|---|
| **Edit ARR-001/002/006 in place** with the corrections | **ARR-008 §1: silent change prohibited.** The originals were on `main` by then. |
| **Amend only EPIC-000's conflict table**, skip the ARR corrections | Loses four substantive corrections (the `cc_projects` precedent, the skills split, `cc_evidence_records` being live code, the MCP missing-dimension). |
| **Fix "Margo" → "Margot" in EPIC-000 directly** | **A constitution is not edited on an agent's guess.** Typo vs deliberate rename is **unknowable from the artefact**. Logged as conflict 7. |

**Chosen because** the amendment mechanism *is* the point; using it correctly matters more than the speed of the fix.

### This record (ARR-010) — alternatives

| Alternative | Why rejected |
|---|---|
| **Append an "Alternatives" section to each of ARR-001..009** (nine edits) | Nine boilerplate sections reading *"none — dictation capture"* is **volume, not traceability**. It would also **edit nine records on `main`** to say nothing, and bury §1's actual finding. |
| **Record the gap and do nothing** | §4 is now binding. A known violation left open is the pattern this estate is trying to end. |
| **Leave it for the founder** | The violation is the author's. |

**Chosen because** the honest remediation is **one accurate statement plus the four real cases**, and because working it surfaced a gap in the standard worth more than the paperwork.

---

## 3. Records where no alternative was weighed — stated explicitly

**Per ARR-006 §5.1, an explicit statement is itself the record.**

| Record | Authorial decision? | Statement |
|---|---|---|
| **ARR-002** | No | **Dictation capture.** Governance hierarchy, enforcement mechanisms, registry/evidence-board mandates, ADR formalisation — all founder-authored. The author transcribed and evidenced. **No alternative was weighed by the author.** *(Its §1.3 "extend, do not replace" verdict was an authorial call — and was **corrected as too broad** by ARR-009 §2.4. Alternatives for the corrected position are in ARR-009.)* |
| **ARR-003** | No | **Dictation capture.** Adopt-or-adapt-first, the continuous programme, the 8-dimension scorecard, the 4-way disposition set — founder-authored. The author **flagged conflicts** (§3.1, §4.1) rather than choosing. **No alternative weighed.** |
| **ARR-004** | No | **Dictation capture.** The stage ladder, gates, risk check, conditional hold — founder-authored. The author **challenged** Stage 0 and Stage 3 on evidence (§2.1, §2.2) rather than choosing an alternative. **None weighed.** |
| **ARR-006** | No | **Dictation capture.** The evidence framework, sources, metadata, confidence criteria, ADR requirements — founder-authored, and **approved**, not held. **None weighed.** |
| **ARR-008** | No | **Dictation capture.** Evolution control, decision integrity, inheritance-before-action, continuity, foresight, curated memory — founder-authored. **None weighed.** |

**Constitutional Foundation v0.1 and Constitutional Operations v0.1 are likewise verbatim founder text**
and carry their own Amendments tables. **The same statement applies: the author weighed no
alternatives, because the author did not decide.**

---

## 4. Open — raised by this remediation

| # | Item |
|---|---|
| 1 | **§4's "alternatives" field assumes an authoring decider.** For dictated constitutional blocks the alternatives live **in the founder's reasoning, unrecorded** — the record keeps the decision and loses the deliberation. **Does §4 require the *founder* to supply alternatives for Tier-1/Tier-2 blocks, or does it apply only where the record's author decided?** **Ruling required.** *This is the same decay as `20260604000000_cc_command_centre.sql:3-4`, whose two cited design documents **do not exist** — arriving through the one door §4 does not watch.* |
| 2 | **Foundation's open questions 1 and 2 are Tier 2** (principles + success framework) — per Operations §3 they require **evidence and cooling-off**. **Recording them as open was therefore correct, not incomplete.** They must not be closed same-day. |

---

## 5. Revisit conditions

1. §4.1 ruled → this record and the standard are updated, **never silently** (ARR-008 §1).
2. A future ARR records an authorial decision → its alternatives belong **in that record**, not here.
   **ARR-010 is remediation, not a permanent home.**
3. The supporting analysis is independently challenged and does not survive.

**⚠ UNCHALLENGED** — single Claude model. Per EPIC-000 §12/§18 and ARR-006 §4 this cannot validate
itself. **Note the recursion honestly: this record's own alternatives (§2) were weighed by the same
author now certifying them as adequate.** That is precisely the self-judged gate the constitution
forbids — **it cannot be resolved by writing more of this record.** Route to an independent non-Claude
reviewer.

---

*Filed 2026-07-17 against `origin/main` @ `d178e809`. No code. No schema. No record silently edited.*
