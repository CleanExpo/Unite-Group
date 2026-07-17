# ARR-006 — Engineering Evidence Framework and Register

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **APPROVED — permanent constitutional layer. Mandatory for all epics, capabilities, and systems.**
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-001](./ARR-001-nexus-engineering-baseline.md) · [ARR-002](./ARR-002-governance-and-engineering-foundations.md) · [ARR-003](./ARR-003-ecosystem-intelligence-build-vs-adopt.md) · [ARR-004](./ARR-004-production-readiness-gated-progression.md) · [ARR-005](./ARR-005-strategic-roadmap.md)

> Normative language per **RFC 2119** / **RFC 8174**.
>
> **This is the first APPROVED record in the series.** ARR-001..005 are HOLD or CONDITIONAL HOLD. That
> asymmetry is correct and deliberate: this framework is the mechanism by which the others become
> enforceable. It is not gated on them; **they are gated on it.**

---

## 1. Purpose — decided

**No material decision rests on habit, opinion, or memory.**

Every significant **recommendation**, **architectural choice**, **governance action**, and **strategic
direction** MUST be traceable to **verifiable evidence**.

This operationalises **Principle 5 — evidence before opinion**. Principles are inert without a
substrate; this is the substrate. ARR-005 §1 established that Nexus advances by **evidence-based
maturity**; that principle is unmeasurable without a register to measure against.

**Why "memory" is named explicitly, and why it is the sharpest word in this block.** Memory is the
failure mode this estate actually suffers, and it failed **three times in this single session**:

- A session handoff asserted *"main @ `8585c147`, nothing in flight"* — it was **116 commits stale**,
  with six tickets In Progress.
- Estate memory recorded PR #763 as unmerged; it had been **squash-merged five days earlier**.
- A capability (`Nexus Concierge OS`, Phase 1 **100% complete**) was nearly rebuilt from scratch
  because **no register existed to recall it** — it took a 49-tool-call sweep to find what a register
  would have returned in seconds.

**Habit and opinion are the visible risks. Memory is the one that feels like evidence and is not.**

---

## 2. Evidence sources

Including but not limited to:

**International standards** (ISO) · **official specifications** (RFCs, MCP specs) · **NIST**
frameworks · **vendor documentation** · **peer-reviewed research** · **open-source repositories** ·
**ADRs** · **production data** · **post-implementation reviews**.

**Rule inherited from ARR-002 §3 and binding here:** *a doc asserting a fact is a **lead**, not an
entry.* A source qualifies as evidence only once classified, dated, and confidence-rated per §3.
**Citing a source is not the same as having evidence.**

**Corollary — negative results are evidence and MUST be registered.** "We searched and found nothing"
carries the same registration burden as a positive finding. An unrecorded negative is how duplicate
work looks novel (ARR-003 §1). **And a null result is not evidence until a positive control passes** —
an empty result from a broken query is indistinguishable from an empty world.

---

## 3. Evidence item — required metadata

Every evidence item MUST carry:

| Field | Requirement |
|---|---|
| **Classification** | Source class per §2, against documented standards (§6 exit criterion) |
| **Provenance** | Where it came from, verifiably — repository, spec URL, console read, API response, live query |
| **Date** | When the evidence was **observed**, not when it was cited |
| **Version** | Of the source. Unversioned evidence cannot be refreshed, only replaced |
| **Owner** | A named human or role accountable for it |
| **Review cadence** | When it MUST be re-checked. **Evidence with no cadence is evidence with no expiry — the definition of drift** |
| **Confidence rating** | Per §4 |

### 3.1 Substrate — partially exists, correctly shaped, unused

**FACT.** `cc_evidence_records` exists (`20260604000000_cc_command_centre.sql:88-101`), is
**append-only** (SELECT + INSERT only; no UPDATE, no DELETE), and is **RLS-enforced**, founder-scoped.
**The immutability this framework requires is already built.**

**FACT.** It holds **0 rows**. Positive control: `cc_task_events` = **97 rows** in the same query.

**REUSE FIRST — this is the register's substrate. Do not build a new table.** What is missing is the
metadata columns of §3 and any write path. This is an **extension**, not a greenfield build — and it
is the cheapest foundation in the entire series.

**Sequencing constraint (FACT):** that extension is a migration, and it joins a **founder-gated queue**
behind `cc_agent_events` and `cc_tasks_claim`, which remain repo-only against prod head
`20260714023022`. **Founder authority is on the critical path.**

**Do NOT reuse `.harness/learning/`.** Five 0-byte JSONL files, mtime **2026-05-22** — **56 days
stale**; its README concedes the capture hooks are *"shipping separately"*; they never shipped. And
**`.harness/swarm/swarm.jsonl` does not exist** while the registered `audit-emit` skill asserts it
writes to *"(existing immutable append)"*. **A registered skill makes a false claim about live
infrastructure — inside the mechanism meant to detect exactly that.** That is not a substrate; it is
this framework's first case study.

---

## 4. Confidence — transparent criteria

Confidence MUST be computed from stated inputs, never asserted:

| Criterion | Question |
|---|---|
| **Authority** | Is the source authoritative for this claim? |
| **Reproducibility** | Can someone else re-derive it from the recorded inputs? |
| **Operational validation** | Has it held in production, or only in principle? |
| **Independence** | Is it corroborated by a source that does not share the original's interest? |

**A score with no inputs is decoration** (UNI-2433's own fog section). **A confidence rating that
cannot be recomputed is an opinion wearing a number.**

**Binding constraint — self-scoring is prohibited.** Per ARR-001 §6.4 and EPIC-000 §12/§18:
**confidence in an item MUST NOT be computed by the party that produced it.** *A score Nexus computes
about itself is the self-judged-gate trap.* **Independence is not one criterion among four — it is the
one that makes the other three trustworthy.**

### 4.1 OPEN — two confidence definitions are now live

**EPIC-000 §7** defines Confidence as *"strength, freshness, independence, and completeness of
supporting evidence."* **This block** defines it as *authority, reproducibility, operational
validation, independence.*

Only **independence** is common to both. **Freshness** appears only in §7 — and freshness is the
attribute this session broke three times (§1). **Reproducibility** and **operational validation**
appear only here — and both are stronger tests than §7 offers.

**Ruling required:** union, replacement, or two distinct ratings? **Recorded as OPEN, not silently
resolved.** The union is likely correct — it loses nothing — but that is a founder call, not mine.
Two live definitions of the same word is exactly the ubiquitous-language defect ARR-002 §4 flags
elsewhere.

---

## 5. ADR requirements — binding

Every ADR MUST cite:

1. **Supporting evidence** (registered per §3)
2. **Alternatives considered**
3. **Assumptions**
4. **Consequences**
5. **Review triggers**

### 5.1 This framework's first finding is against ARR-001..005 — including this record

**The ARRs filed today do not meet requirement 2.** They carry evidence (1), assumptions (3),
consequences (4), and revisit conditions (5). **They largely do not record alternatives considered.**

Concretely: ARR-001 §3 accepts the sequencing correction without recording what else was weighed.
ARR-003 §1 states *adopt-or-adapt-first* without recording the alternatives rejected. ARR-005 §2
presents one stage ladder without recording the alternative orderings considered and why they lost.

**This is a real defect in the series, not a formality.** An ADR without alternatives records **what
was decided** but not **that a choice existed** — which is precisely the traceability this framework
exists to guarantee, and precisely what was lost when
`20260604000000_cc_command_centre.sql:3-4` cited two design documents that **do not exist**. The
rationale for the schema underpinning the registry, the Board's decision table, and the autonomy model
is now unrecoverable. **That is what an ADR without alternatives decays into.**

**Required remediation:** ARR-001..005 MUST be amended to record alternatives considered, or MUST
carry an explicit statement that no alternative was weighed — which is itself an honest and useful
record. **Flagged by the framework on the day it was approved, against its own author's work.** That
is the framework functioning, and it is the strongest available evidence that it should be
constitutional.

---

## 6. Evidence is a living asset

**Evidence MUST be refreshed. Evidence MUST NOT be silently discarded.**

**"Silently" is the operative word**, and the estate has direct precedent for the failure it names.
`CLAUDE.md` §0 records that the operating playbook *"previously lived solely in `~/.hermes`
(unsynced, one machine), so it loaded nowhere"* — doctrine that vanished without anyone deciding to
discard it. **Nothing announced its absence.** The same pattern produced `.harness/learning/`'s 56-day
silence, the `audit-emit` skill's false claim, and the two vanished design documents.

**Therefore:**
- Discarding evidence MUST be an **explicit, recorded act** with a reason and an owner.
- **Staleness MUST be visible.** Evidence past its review cadence MUST surface as stale rather than
  continue to read as current. **Evidence that goes quiet is worse than evidence that goes missing** —
  the missing kind gets noticed.

---

## 7. Exit criteria

| # | Criterion | State |
|---|---|---|
| 1 | **Operational evidence register** | **NOT MET.** Substrate partially exists (`cc_evidence_records`, append-only, RLS, **0 rows**); §3 metadata columns and write path absent. Founder-gated migration. |
| 2 | **Documented classification standards** | **NOT MET.** §2 names source classes; the standard defining them is unwritten. |
| 3 | **ADR traceability** | **PARTIAL.** ARR series established today; **requirement 2 (alternatives) unmet across ARR-001..006** (§5.1); one pre-existing unrelated ADR; the `cc_*` schema's rationale is **unrecoverable**. |
| 4 | **Evidence review processes** | **NOT MET.** No cadence mechanism; nothing surfaces staleness. |

**0 of 4 met; 1 partial.** The framework is **approved and binding**; it is **not yet operational**.
Those are different states and MUST NOT be conflated — conflating them is the precise error this
framework exists to prevent.

### 7.1 OPEN — reconcile against two existing constructs

**Ruling required.** Three names now describe overlapping things:

| Construct | Defined in | Holds |
|---|---|---|
| **Evidence Register** | this record | Evidence *items* — provenance, date, version, confidence |
| **Engineering Evidence Board** | ARR-002 §4 | Living evaluation *records* scoring models, MCPs, tools, agents |
| **Evidence Registry** | EPIC-000 §5.11 | *"evidence records, provenance, timestamps, source classifications, quality scores, conflicts, supporting artefacts"* |

**EPIC-000 §5.11 and this record's register appear to be the same construct under two names.** The
Evidence Board appears to be a **consumer** of the register — it scores capabilities *from* evidence
items — but this is inference, not a decision. **Ruling required: are register and §5.11 registry one
thing? Is the Board a distinct layer above it?** Unreconciled, this is a third naming collision
alongside "Atlas" and "control plane" (ARR-002 §4) — and ambiguous names defeat registry lookup, which
is the failure mode ARR-001 §3.2 already proved with `chrome`/`claude-in-chrome`.

---

## 8. Constitutional status

**The Engineering Evidence Framework is a permanent constitutional layer, mandatory for all epics,
capabilities, and systems.**

**Consequences of constitutional status — stated, because they bind:**

- Per ARR-002 §1.1 and EPIC-000 §11, **learning MUST NOT alter this framework.** It sits above the
  adaptive layer, with human authority and approval requirements.
- It is **not gated on the registry or the evidence board.** ARR-005's Stage 1 depends on **this**,
  not the reverse.
- It applies to **internal builds equally** (Principle 19). Nexus's own output gets no exemption.
- **It applies to this series.** §5.1 is its first enforcement action, against its own author.

### 8.1 Its own artefact requirement — met here, deliberately

ARR-004 §2.1 challenged Stage 0 because **EPIC-000 exists in neither the repository nor the tracker** —
positive-controlled, binding in conversation only.

**A constitutional layer approved in conversation and never filed would be the identical defect**, and
this framework's own §1 forbids resting on memory. **This record is therefore the artefact.** The
framework exists on disk, in the repository, versioned, from the moment it is approved.

**EPIC-000 itself still MUST be landed** (ARR-004 §6.1). This record does not close that gap — it
demonstrates the standard the gap is measured against.

---

## 9. Open items — this record

| # | Item | Where |
|---|---|---|
| 1 | **Confidence: two live definitions.** Union, replacement, or two ratings? Freshness appears in only one | §4.1 |
| 2 | **Register vs Evidence Board vs §5.11 Evidence Registry** — one construct or three? | §7.1 |
| 3 | **ARR-001..006 lack "alternatives considered"** — amend or explicitly record that none was weighed | §5.1 |
| 4 | **`cc_evidence_records` extension** — founder-gated migration, on the critical path | §3.1 |

**Eight further items remain consolidated in ARR-004 §6**, unchanged.

---

## 10. Revisit conditions

1. §7's four exit criteria met → framework moves from **approved** to **operational**, unblocking
   ARR-005 Stage 1.
2. Any §9 item ruled → this record updated or superseded.
3. **Evidence produced under this framework is found to have been wrong** → §4's confidence criteria
   are revisited, because the criteria failed, not merely the item.
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by §4 of this record, ARR-001 §6.4, and EPIC-000 §12/§18. **A framework mandating
independent confidence assessment, authored and confidence-rated by one model with no independent
corroboration, is failing its own §4 at the moment of its approval.** **Route to an independent
non-Claude reviewer.** This is the highest-priority routing in the series, because everything
downstream now inherits from it.

---

*Filed 2026-07-17. Status APPROVED — constitutional. Not yet operational (§7). No code written. No
state changed. Every claim cites its evidence or is labelled ASSUMPTION / UNKNOWN / OPEN.*
