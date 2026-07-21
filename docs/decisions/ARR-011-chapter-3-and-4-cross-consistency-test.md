# ARR-011 — Cross-Consistency Test: Chapters 3 and 4

**Type:** Architecture Review Record — **validation gate**
**Status:** **NOT PASSED.** Chapters 3 and 4 **cannot be locked** by their own criteria.
**Date:** 2026-07-17 · **Author:** Claude Opus 4.8 · **Baseline:** `origin/main` @ `c05583e9`
**Discharges:** Chapter 3 §3.20 gate 1 · Chapter 4 §4.32 gates 1–3
**Tests:** [Chapter 3](../constitution/CHAPTER-3-decision-and-reasoning-framework-v0.1.md) · [Chapter 4](../constitution/CHAPTER-4-success-and-measurement-framework-v0.1.md) against [Foundation](../constitution/CONSTITUTIONAL-FOUNDATION-v0.1.md), [Operations](../constitution/CONSTITUTIONAL-OPERATIONS-v0.1.md), [EPIC-000](../constitution/EPIC-000-nexus-engineering-constitution.md), and the live schema

---

## 0. Verdict

**Both chapters are structurally strong and internally coherent. Neither can be locked.**

**Two concrete schema breaks. One mandated mechanism that does not exist. Five colliding vocabularies.
One register the Decision register structurally cannot hold. And — by Chapter 4's own definition — this
session's entire output is Level 4 activity.**

---

## 1. ⚠ BREAK 1 — §3.7's confidence vocabulary violates the live schema

**FACT, verified by direct read.**

| Source | Values |
|---|---|
| **Chapter 3 §3.7** | High · **Moderate** · Low |
| **`cc_evidence_records`** (`20260604000000_cc_command_centre.sql:96-97`) | `CHECK (confidence IN ('high', 'medium', 'low'))` |
| **Live code** (`tasks.ts:352`) | `confidence: input.confidence ?? 'medium'` |

**Writing `'moderate'` raises a CHECK constraint violation.** The schema stores **`medium`**.

**This is the second time the constitution has defined a vocabulary the database refuses.** The first:
`cc_decisions.verdict CHECK IN ('APPROVED','HOLD','REJECTED')` against EPIC-000 §8's **five**
dispositions — `adapt`, `trial`, `observe` all violate.

**The pattern is the finding:** the constitution names vocabularies; the schema enforces different ones;
**both times the constitution's own record cannot be written.** A constitution that cannot be recorded
in the register it mandates is a document, not an operating system (Operations §8).

**Resolution options (ruling required):** (a) amend §3.7 to `medium` — cheapest, and `medium`/`moderate`
are synonyms here; (b) migrate the CHECK — joins the **founder-gated** queue behind `cc_agent_events`
and `cc_tasks_claim` (prod head `20260714023022`); (c) map at the boundary — **rejected**: a translation
layer between the constitution and its own register is exactly the drift these chapters forbid.

**Recommended: (a).** The constitution should not require a migration to say "medium".

## 2. ⚠ BREAK 2 — the Decision register cannot hold a §3.14 decision record

**FACT.** `cc_decisions` has **9 columns**: `id`, `founder_id`, `task_id`, `subject`, `verdict`,
`rationale`, `personas`, `wiki_path`, `at`.

**§3.14 requires 16 fields.** Coverage:

| §3.14 field | In `cc_decisions`? |
|---|---|
| decision identifier | ✅ `id` |
| date and owner | ⚠ `at` only — **no owner** (`founder_id` is RLS scoping, not accountability) |
| question being decided | ⚠ `subject` (approximate) |
| recommendation / rationale | ✅ `rationale` |
| **decision class and materiality** | ❌ |
| **constitutional principles involved** | ❌ |
| **evidence and confidence** | ❌ |
| **assumptions and unknowns** | ❌ |
| **SWOT summary** | ❌ |
| **alternatives considered** | ❌ |
| **approving authority** | ❌ |
| **dissent or unresolved concerns** | ❌ |
| **implementation boundaries** | ❌ |
| **review date or trigger** | ❌ |
| **outcome and subsequent learning** | ❌ |

**4 of 16 — and the 12 missing include every field Chapters 3 and 4 treat as load-bearing:** class,
materiality, alternatives, dissent, authority, and outcome.

**Compounded by the disposition break:** `verdict` cannot store `adapt`, `trial`, or `observe`.

**So Chapter 2 §9's claim — *"Every decision is discoverable"* — is currently false twice over:** the
register holds **0 rows**, and it **could not hold a compliant record if it had any.**

## 3. ⚠ MECHANISM ABSENT — §3.12's first requirement cannot be met

**§3.12: agents "must inherit the current constitutional fingerprint."** It is listed **first**.

**FACT (ARR-007 §5.1, unchanged):** `~/.claude/hooks/` and `settings.json` are **gitignored and do not
propagate**; `bootstrap.sh` wires **1 of 3** enforcement installers and **swallows failure into a `note:`
echo**; **47 of 291 skills are uncatalogued — including `proof-discipline` and `goal-circuit-breaker`,
the guards that enforce this doctrine**; `brain.js`/`_system` are absent, so `CLAUDE.md` §6 recall
**cannot run on this machine**.

**Every one of those failures is silent.** A fresh agent inherits **nothing**, and **the absence is
indistinguishable from compliance.**

**§3.12 mandates something that cannot happen today** — and **§3.20 gate 2 ("agent inheritance testing")
therefore cannot run.**

**But §3.16 is the answer, and that is the good news.** The 10-item **Constitutional Fingerprint** is the
first concrete specification anywhere in this constitution of *what must survive*. **It is the mechanism
ARR-007 §5.1 said was missing.** It needs building, not designing.

## 4. Vocabularies — FIVE now live for "how sure are we?"

| Source | Scheme |
|---|---|
| **EPIC-000 §7** | strength · freshness · independence · completeness |
| **ARR-006 §4** | authority · reproducibility · operational validation · independence |
| **Chapter 3 §3.7** | High · Moderate · Low *(confidence in a **recommendation**)* |
| **Chapter 4 §4.24** | Strong · Sufficient · Weak · Unknown *(quality of **evidence**)* |
| **`cc_evidence_records`** | high · medium · low |

**§3.7 and §4.24 are NOT duplicates — they measure different things**, and the distinction is real:
confidence is a property of a **conclusion**; evidence quality is a property of an **input**. A
high-quality evidence base can still support only a moderate-confidence recommendation.

**But nothing says so**, and the names invite collapse. **Ruling required: are these two ratings or one?**
If two, **both need a home in the schema — which currently has one column, `confidence`, with three
values.**

**§3.6's nine evidence categories are ORTHOGONAL to ARR-006 §2's source classes — and this is the most
useful finding in this test.** §3.6 classifies **epistemic status** (verified fact · inference ·
assumption · preference · unknown). ARR-006/ARR-009 classify **source type** (standard · spec · NIST ·
vendor doc · peer-reviewed · OSS repo · ADR · production data). **Both are needed. They are different
axes.** An implementer reading only one will build half a classifier — **say so explicitly before anyone
codes it.**

## 5. Register count — five, or six?

| Source | Registers |
|---|---|
| **Operations §9** | Decision · Evidence · Amendment · Governance review · **Knowledge** — **five** |
| **Chapter 4 §4.27** | adds **Constitutional Success Register** — **six** |

**Substrate reality:**

| Register | State |
|---|---|
| Decision | **0 rows** · cannot hold §3.14 (§2 above) |
| Evidence | **0 rows** · is live code · confidence vocabulary breaks (§1) |
| Amendment | **✅ EXISTS** — created 2026-07-17 |
| Governance review | **❌ no substrate** |
| Knowledge | **✅ REAL — `wiki_pages` 681 rows + tested `wiki-graph.ts`** · **no reader** |
| **Constitutional Success** | **❌ no substrate. New.** |

**Two of six exist.**

## 6. Review rhythm — Chapter 4 adds a cycle Chapter 2 does not have

| Source | Cycles |
|---|---|
| **Operations §8** | continuous · monthly · annual · 3–5 years |
| **Chapter 4 §4.22** | continuous · monthly · **quarterly** · annual · 3–5 years |

**Chapter 4 introduces a quarterly strategic-outcome review absent from Chapter 2.** Minor, but it is
exactly the unstated exception §3.8's **Consistency Test** exists to catch — **so this test catches it,
which is the test working.**

**And both inherit the unresolved conflict:** UNI-2433's standing founder constraint — ***"no calendar
timeframes. State-based only"*** — against five calendar cycles and a Tier-2 cooling-off gate.
**Ruling required** (UNI-2437 conflict 8).

**Chapter 4 §4.22 "Continuous" is the one element that honours the constraint** — it is state-based, has
no clock, and is the cycle the estate most needs.

## 7. Fingerprints — FOUR now, with no composition rule

| Source | Fingerprint |
|---|---|
| **§3.16** | **Constitutional Fingerprint** — 10 items (philosophy, purpose, principles, authority, non-delegable matters, materiality/escalation, evidence standards, constraints, unresolved risks, provenance) |
| **§3.17** | **Constitutional Reasoning Fingerprint** — 9-line prose summary |
| **§4.28** | **compression-preservation list** — 10 items (capability, stakeholder, principles, success criteria, measures, baseline, evidence quality, risks, dependency, review trigger) |
| **§4.29** | **Constitutional Success Fingerprint** — 10-line prose summary |

**A compressor must retain all four?** They overlap (both 10-item lists name principles; both prose
summaries name capability-expansion) **but neither chapter says how they compose.**

**Ruling required: one composite fingerprint, or four?** **This matters more than it looks** — §3.16 says
*"a context compressor is a custodian of continuity, not an author of doctrine."* **A compressor forced
to reconcile four un-composed fingerprints is authoring.**

## 8. ✅ What Chapter 3 RESOLVES — recorded, because it is not all findings

- **§3.9 largely answers ARR-010 §4.** *"Material decisions should not begin with a preferred answer and
  work backwards"*; the decision package must include **at least one credible alternative** and the
  option to **defer, pilot, or take no action**. **This applies to material decisions generally —
  including constitutional ones. So the founder's Tier-1/Tier-2 blocks do carry the alternatives
  obligation.** ARR-010's open question is substantially closed; confirm and log.
- **§3.4's Class A–E authority mapping partially resolves the governance conflict** — Class A → Guardian;
  Class B → Guardian or Council; Class C → Council; Class D → delegated. **But it still does not place
  EPIC-000 §12's Board**, which holds *"final decision authority."* **UNI-2437 conflict 7 stands.**
- **§3.16 is the missing inheritance mechanism**, specified for the first time (§3 above).
- **§3.2's "no person, agent, model, or system may present inference as fact, confidence as certainty, or
  activity as progress"** is the sharpest sentence in either chapter, and it is directly testable — see §9.

## 9. ⚠ THE FINDING THAT MATTERS MOST — this session is Level 4

**Chapter 4 §4.5 Level 4 — Activity and Output — names *"documents created"* explicitly.**

**FACT.** As of 2026-07-17 this session has produced: a mission, four constitutional chapters, an
engineering constitution, eleven decision records, a 66-defect reconciliation, four capability specs,
one Linear strategy ticket, and twelve logged conflicts.

**Every one is a document created. That is Level 4.**

**§4.5:** *"Activity metrics... **must never be presented as evidence of impact without an established
connection to meaningful outcomes**."*

**§4.20 Anti-Gaming, first item:** ***"counting activity as impact."***

**§4.21 Drift Indicators:** ***"high activity accompanied by weak practical application"*** ·
***"output growth without stakeholder improvement."***

**§3.2:** ***"No person, agent, model, or system may present... activity as progress."***

**Level 1 constitutional outcomes produced today: none demonstrated.** Zero of six governance mechanisms
are live. The Guardian does not exist. The autonomy check has zero call sites. Doctrine does not inherit.

**By Chapter 4's own definitions, this session is a drift indicator.**

### 9.1 §4.4's equation makes it arithmetic, not rhetoric

> **Constitutional Success = Meaningful Capability Expanded × Integrity of Method × Durability of Value**

**It is multiplicative. Any zero zeroes the product.**

- **Integrity of Method** — genuinely high. Evidence-led, positive-controlled, errors self-reported.
- **Meaningful Capability Expanded** — **unproven.** No stakeholder has been shown to do anything new.
- **Durability of Value** — **approaching zero.** Doctrine does not inherit; a fresh machine gets
  **nothing**, silently.

**→ Constitutional Success ≈ 0.**

**This is not self-criticism as performance. It is the equation, applied.** And it independently
reproduces the Foundation's own falsifiable test — *"success is measured not by dependency created but by
capability expanded"* — which was **recorded as failing on the day it was locked.**

**Chapter 4 §4.6:** ***"A smaller body of work that solves the correct problem is superior to a large body
of work that creates noise."***

**Operations §10:** ***"Preserve the core. Improve the method. Never confuse the two."***

**Both point the same way: stop writing chapters. Build one mechanism.** §3.16's Constitutional
Fingerprint is the candidate — it is specified, it is the inheritance mechanism, and it converts
Durability of Value from ~0 to non-zero. **Nothing else in the stack does that.**

## 10. Gate status

**Chapter 3 §3.20 — 1 of 5 run, 0 passed.** **Chapter 4 §4.32 — 3 of 9 run, 0 passed.**

**Both blocked identically on gates that cannot run:**
- **Agent inheritance testing** — no mechanism (§3).
- **Context-compression integrity testing** — no compressor implements any fingerprint (§7).
- **Adversarial / metric-gaming review** — requires a **non-Claude** adversary. Chapter 2 §3: *never
  self-approve*.
- **Constitutional Guardian approval** — **the Guardian does not exist.**

**Neither chapter can reach locked status until something is built.** That is not a criticism of the
chapters. **It is the chapters working: they specified gates strong enough to fail.**

## 11. Rulings required

| # | Item | § |
|---|---|---|
| 1 | **§3.7 `Moderate` vs schema `medium`** — amend the chapter (recommended) or migrate | §1 |
| 2 | **`cc_decisions` holds 4 of §3.14's 16 fields** and cannot store 3 of 5 dispositions | §2 |
| 3 | **Confidence (§3.7) vs Evidence Quality (§4.24)** — two ratings or one? Schema has one column | §4 |
| 4 | **§3.6 epistemic categories vs ARR-006 source classes** — confirm **orthogonal**, both required | §4 |
| 5 | **Five registers or six?** | §5 |
| 6 | **Quarterly cycle** — Chapter 4 has it, Chapter 2 doesn't | §6 |
| 7 | **Four fingerprints** — composite, or four? | §7 |
| 8 | **§3.9 closes ARR-010 §4** — confirm and log | §8 |
| 9 | **Board placement still unresolved** despite §3.4 | §8 |

---

## 12. Revisit conditions

1. Any §11 item ruled → this test re-runs against the amended text.
2. **§3.16's Fingerprint is built and a cold start is proven to inherit** → gate 2 becomes runnable, and
   §9.1's Durability term becomes non-zero. **This is the single unlock for both chapters.**
3. A Guardian exists → the final gate becomes runnable.

**⚠ This test is itself UNCHALLENGED** — a single Claude model testing constitutional text authored by
the founder, against a schema it read itself. Per Chapter 2 §3, EPIC-000 §12/§18, and ARR-006 §4 it
**cannot validate itself.** **Note the recursion precisely: §3.20 gate 4 and §4.32 gate 6 require an
adversarial reviewer, and this document is not one.** Passing gate 1 while gate 4 is unrun proves only
that the text is internally consistent — **not that it is right.**

---

*Filed 2026-07-17. Verdict: NOT PASSED. No code. No schema change. Every claim cites its evidence or is
labelled ASSUMPTION / UNKNOWN / OPEN.*
