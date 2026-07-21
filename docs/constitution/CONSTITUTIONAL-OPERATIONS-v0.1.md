# CONSTITUTIONAL OPERATIONS — v0.1

**Chapter 2 of the Constitution**
**Status:** **LOCKED — v0.1. Ready for insertion.**
**Locked:** 2026-07-17 · **Author:** Phill McGurk (founder) · Filed verbatim by Claude Opus 4.8
**Derives from:** [Constitutional Foundation v0.1](./CONSTITUTIONAL-FOUNDATION-v0.1.md) — Chapter 1, the highest governing authority
**Governs:** [EPIC-000](./EPIC-000-nexus-engineering-constitution.md) and the [ARR series](../decisions/)

---

## 1. Constitutional status

**This chapter defines how constitutional authority is exercised.**

**The constitution is the highest authority. All governance, doctrine, policy, AI, products, and
decisions derive from it.**

## 2. Purpose

**Ensure every material action is aligned, evidence-based, traceable, and reviewable.**

---

## 3. Governance architecture

| Authority | Role |
|---|---|
| **Constitutional Guardian** | **Protects the founder's philosophy and core identity.** |
| **Governance Council** | **Interprets. Reviews evidence. Approves doctrine. Arbitrates grey.** |
| **Operational authorities** (human **and AI**) | **Execute within delegated authority. May propose — but never self-approve.** |

**"May propose but never self-approve" is the load-bearing clause**, and the estate has now written it
four times from four directions: *no capability approves its own adoption* (EPIC-000 §10); *no reviewer
validates its own review* (ARR-001 §6.4); *confidence MUST NOT be computed by the party that produced
it* (ARR-006 §4); and here, binding **human and AI equally**. **A grader under the control of the graded
optimises itself.**

**The symmetry is deliberate and it matters:** the clause does **not** privilege humans over AI. **Both
are operational authorities. Neither self-approves.**

---

## 4. Decision flow

```
proposal → evidence → constitutional assessment → governance review → decision → permanent record
```

**No exceptions.**

**Constitutional assessment is what distinguishes this flow from ordinary review.** Governance review
asks *is this a good decision?* **Constitutional assessment asks the prior question: is this decision
permitted at all?** A proposal that fails alignment **never reaches the merits** — which is precisely how
a constitution differs from a preference.

**Nothing skips forward.** Evidence precedes assessment; assessment precedes review; review precedes
decision; **a decision without a permanent record did not happen.**

---

## 5. Amendment classes

| Tier | Scope | Bar |
|---|---|---|
| **1** | **Founder's philosophy and preamble** | **Generational. Modify only with overwhelming evidence.** |
| **2** | **Principles and success framework** | **High bar — evidence, cooling-off.** |
| **3** | **Doctrine and policy** | **Adaptive, scheduled, continuous.** |

**Mapping to what exists in-repo:**

| Tier | Artefact |
|---|---|
| **1** | `CONSTITUTIONAL-FOUNDATION-v0.1.md` — Preamble |
| **2** | `CONSTITUTIONAL-FOUNDATION-v0.1.md` — the seven First Principles; the *dependency-vs-capability* success measure |
| **3** | `EPIC-000`, this chapter, the ARR series |

**Consequence, binding this session's own output:** the Foundation's open questions 1 and 2
(principle-collision ordering; the founding claim's exemption from Principle 7) are **Tier 2** — they
require **evidence and cooling-off**. **Recording them as open was therefore correct, not incomplete.
They must not be closed same-day.**

## 6. Change standard

Every change MUST carry: **owner · rationale · evidence · alternatives · impact · permanent log.**

**Silent edits are prohibited.**

**⚠ This ratifies a violation already logged against this session's own records.** ARR-006 §5.1 found
that **ARR-001..008 carry evidence, assumptions, consequences and revisit conditions — but largely NOT
alternatives.** Remediated in **ARR-010**, which also raises a gap in this standard: **§6 assumes the
record's author is the decider.** For a dictated constitutional block the alternatives exist **in the
founder's reasoning, unrecorded** — the record keeps the decision and **loses the deliberation**.
**Ruling required (ARR-010 §4).**

**Why alternatives rot first:** `20260604000000_cc_command_centre.sql:3-4` cites two design documents
that **do not exist**. The schema underpinning the registry, the Board's decision table, and the autonomy
model now has **no reachable rationale** — unexplainable, unreviewable, unreversible. **That is what a
change without alternatives decays into in eighteen months.**

---

## 7. The Continuous Cognitive Loop

**The loop senses and prepares evidence. It has NO amendment authority.**

**It observes, reasons, stages. Governance decides.**

**"Stages" is the precise word.** The loop's terminal output is **staged work** — evidence assembled,
options prepared, gaps surfaced. **Never a decision, never a change.** Consistent with ARR-007 §2's
*"prepare, do not select"*: **the moment "staged" reads as "decided unless overridden", the gate has
inverted from opt-in to opt-out and human authority has become a veto rather than a source.**

**⚠ Open, carried and unresolved (ARR-007 §2.1):** the loop is *"always on, but always bounded"* —
**bounded by what?** Its kill switch (`~/.claude/HARD_STOP`) **does not exist on this machine; the gate
has never fired here.** No spend or rate bound is stated, above **40 Vercel cron entries** whose live
execution is **UNKNOWN**. **An always-on loop whose stop mechanism has never been fired is not bounded —
it is merely not yet running.**

---

## 8. Review cycles

**Continuous evidence capture · monthly governance check · annual review · periodic reflection (3–5 years).**

### 8.1 ⚠ OPEN — conflicts with a standing founder constraint

**FACT.** UNI-2433 (founder, 2026-07-17): ***"Standing constraint: no calendar timeframes. State-based
only — phases advance on completion."*** UNI-2434: *"each state advances on completion, never on elapsed
time."*

**§8 is calendar-based** (monthly / annual / 3–5 years) and **§5's Tier-2 cooling-off is an elapsed-time
gate.**

**Both may be right** — a *review cadence* is not a *phase gate*, and "advance only on completion" does
not forbid "re-examine on a clock." **But the distinction is stated nowhere**, and the constraint carries
no qualifier.

**Ruling required:** does the standing constraint govern **phase advancement only**, or **all
timeframes**?

⚠ **The constraint lives only in Linear** (UNI-2433/2434 bodies) — **not in the repo** (grep-verified).
**A constraint that binds one system from inside another is this estate's dominant failure mode.**

**Note what §8 gets right that §5's tiers do not:** *"continuous evidence capture"* is **state-based, not
calendar-based**. It is the one review element with no clock — and the one the estate most needs.

---

## 9. Registers — five

**Decision · Evidence · Amendment · Governance review · Knowledge.**

**Every decision is discoverable.**

| Register | Substrate | State |
|---|---|---|
| **Decision** | `cc_decisions` | **0 rows.** ⚠ **Cannot store 3 of EPIC-000 §8's 5 dispositions** — `verdict CHECK IN ('APPROVED','HOLD','REJECTED')`; `adapt`, `trial`, `observe` raise a constraint violation. **Stage 19 is unrecordable in the schema that exists.** **"Every decision is discoverable" is currently false — none are recorded.** |
| **Evidence** | `cc_evidence_records` | **0 rows.** Exists, **append-only, RLS-enforced** — and is **live code** (`tasks.ts:86-96`, `:349-355`), so `kind`/`confidence` are an existing consumer contract. Extension design: ARR-009 §3. |
| **Amendment** | Foundation + EPIC-000 Amendments tables + this chapter | **✅ EXISTS.** Created 2026-07-17. Carrying **12 open conflicts** (UNI-2437). |
| **Governance review** | — | **⚠ Does not exist.** No substrate, no artefact, no mechanism. |
| **Knowledge** | **`wiki_pages` + `wiki-graph.ts`** | **✅ EXISTS AND IS REAL — 681 rows.** The graph builder is pure, tested, and built on the right doctrine: ***"unresolved links dropped — never fabricated."*** It refuses to invent an edge it cannot resolve. **⚠ But the wiki has no reader** — only `oracle_daily_brief.py` touches it, and it only *counts files*. |

**Two of five exist. One was created today. The other — Knowledge — is the best asset in the estate, and
nothing reads it.**

**The Knowledge register is the cheapest win in this chapter: it needs a READER, not a build.**
`wiki-graph.ts` already resolves `[[ARR-006]]` into an edge — which means **doctrine-linkage for the
Evidence register costs no new code** (ARR-009 §3.3).

---

## 10. Integrity

**The constitution is stable. Learning is continuous.**

> ### **Preserve the core. Improve the method. Never confuse the two.**

### 10.1 The sharpest line in the chapter — and it diagnoses today

**"Never confuse the two" is a live diagnosis, not an aphorism.**

**FACT.** As of 2026-07-17 the estate has produced a mission, two constitutional chapters, an engineering
constitution, and ten decision records — **and zero of six governance mechanisms are live** (ARR-004 §5).
**The Guardian's protection has no mechanism. The autonomy check has zero application call sites.
Doctrine does not inherit.**

**Reuse-first was already written down on 2026-07-12** — *"this is an integration and governance build,
not a new agent framework"* — **and was not followed.**

**The core is not what is failing. The method is.** Writing more constitution when the gap is
enforcement **is confusing the two** — and §10 now forbids it, in the founder's own words.

**UNI-2420 reached the same conclusion independently: *"Convention is what failed."***

### 10.2 The counter-example to generalise

`apps/autopilot-runner`'s entrypoint is a **refusal tombstone**; its **build fails** if any of ~30
retired paths is restored. **It proves non-execution in code rather than asserting it in a README.**

**That is method.** The Guardian's protection needs that shape.

---

## 11. ⚠ Governance model — THREE live, unreconciled. Blocks §3.

| Source | Model |
|---|---|
| **EPIC-000 §12** | **Board** — *"final decision authority"* · Margo · SPM (*"is constitutional"*) · Engineering Review · Independent Challenger · Judge · Nexus |
| **ARR-002 §1.1** | Constitution → **Board** → **Executive** → Adaptive Control Plane → Execution |
| **This chapter §3** | **Constitutional Guardian** → **Governance Council** → **Operational authorities** |

1. **Can the Guardian pause the Board?** EPIC-000 gives the Board *final* authority. **If yes, the Board
   is not final. If no, the Guardian cannot protect the philosophy from its highest authority.** Both
   cannot be true.
2. **Is the Governance Council the Board renamed, or a new body?**
3. **Where do Margo, the SPM, the Independent Challenger and the Judge sit?** EPIC-000 §12 calls the
   **SPM "constitutional"** — **is the SPM the Guardian?**
4. **Does "Executive" (ARR-002 §1.1) survive?**

**Ruling required. This is the same defect as the three governance tracks (Atlas / MC-P1 / UNI-2379) —
one level up, and now constitutional.**

---

## 12. Amendments

Per §6 and **ARR-008 §1**: evidence-backed, versioned, permanently logged. **Silent edits prohibited.**

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-07-17 | **v0.1** | Locked. Chapter 2: constitutional status, purpose, governance architecture, decision flow, amendment classes and change standard, loop boundary, review cycles, five registers, integrity stance. Filed verbatim. | Phill McGurk |
| 2026-07-17 | **v0.1 — AMENDMENT to the merged record** (PR #890, main `c05583e9`) | **Owner:** Phill McGurk (founder). **Rationale:** PR #890 merged at 11:42:39Z an **incomplete capture** of Chapter 2; the founder then supplied the **complete spec-form block**. **Evidence:** merged `c05583e9` grep-verified to contain **zero** instances of "constitutional assessment", "Knowledge" (as a register), or "Never confuse the two"; its decision flow reads `proposal → evidence → governance review → approval → decision log` and it lists **four** registers. **Alternatives:** (a) leave the merged partial standing and file the delta as a separate ARR — rejected: splits one chapter across two documents, and a reader of Chapter 2 would never see the missing gate; (b) silently edit the merged file — **prohibited, ARR-008 §1**; (c) supersede Chapter 2 with a v0.2 — rejected: the founder locked this as **v0.1**, and the delta is a **restoration of dropped content**, not an evolution of the text. **Impact:** restores three material elements — (1) **`constitutional assessment`** as a distinct step in the decision flow, the gate asking whether a decision is *permitted* prior to whether it is *good*; (2) a **fifth register, Knowledge**, which changes the substrate scorecard from 1-of-4 to **2-of-5** and identifies the estate's best asset (`wiki_pages`, 681 rows) as constitutionally mandated; (3) the integrity principle ***"Preserve the core. Improve the method. Never confuse the two."*** **Decision:** amend. **Cause of the omission, recorded:** the author filed a lock from a partial dictation rather than waiting for the complete block — **the record was locked before it was whole.** | Claude Opus 4.8 |

### Open questions — recorded, not resolved

| # | Question | Where |
|---|---|---|
| 1 | **Three governance models live.** Council = Board? Can the Guardian pause the Board? Where are Margo/SPM/Challenger/Judge? | §11 |
| 2 | **Calendar cycles vs the standing "no calendar timeframes" constraint.** Phase advancement only, or all timeframes? | §8.1 |
| 3 | **The loop is "always on, but always bounded" — bounded by what, enforced where?** `HARD_STOP` has never fired here. | §7 |
| 4 | **The Guardian's protection has no mechanism.** Code, role, or convention? *(Convention is what failed.)* | §10.1 |
| 5 | **`cc_decisions` cannot store 3 of 5 dispositions** — the Decision register cannot record what this chapter mandates, and **"every decision is discoverable" is false while it holds 0 rows.** Founder-gated migration, **on the critical path.** | §9 |
| 6 | **Governance-review register has no substrate.** | §9 |
| 7 | **§6 assumes the record's author is the decider** — for dictated blocks the founder's alternatives go unrecorded. | ARR-010 §4 |

**Twelve conflicts open in UNI-2437; four in the Foundation's table; seven in EPIC-000's.**

---

*Locked 2026-07-17 as v0.1. Chapter 2. Filed as an artefact because a constitution that lives only in a
conversation is not an operating system — it is a memory, and this estate has evidence about what
happens to those.*
