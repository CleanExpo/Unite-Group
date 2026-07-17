# ARR-005 — Strategic Roadmap and Production Readiness

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **HOLD** — proceed only once governance capabilities are operational
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-001](./ARR-001-nexus-engineering-baseline.md) · [ARR-002](./ARR-002-governance-and-engineering-foundations.md) · [ARR-003](./ARR-003-ecosystem-intelligence-build-vs-adopt.md) · [ARR-004](./ARR-004-production-readiness-gated-progression.md)
**Supersedes:** **ARR-004 §2 (the four-stage ladder) only.** ARR-004's gates (§3), risk check (§4),
decision (§5), and open items (§6) remain live and are **not** restated here.

> Normative language per **RFC 2119** / **RFC 8174**.
>
> **Scope note — deliberately short.** This record carries only what is new. ARR-004 already holds the
> evidenced gate analysis, risk confirmation, and mechanism status. Restating them would duplicate a
> live record under a new number — the drift these records exist to prevent, and a Principle 2
> violation inside the series that mandates Principle 2.

---

## 1. Principle — decided

**Nexus advances by evidence-based maturity, not by feature velocity.**

This is the governing cadence rule and it MUST override delivery pressure. A stage advances when its
**evidence exists**, not when its tickets close, not when a document asserts completion, and not when
the work feels finished.

**The estate has direct evidence that velocity-based advancement fails here** (ARR-004 §4.1): DR-NRPG's
own audits found **183 Done tickets with zero merge evidence — 61 confirmed falsely marked** — and
UNI-2373 is marked Done while its dependent migrations remain unapplied. **Velocity was recorded.
Maturity was not.** The two diverged silently, and only an adversarial audit found the gap.

**Corollary (from ARR-004 §3):** *each release MUST produce evidence, not just code.* A release that
produces a claim — `scripts/nexus-runner`'s one-line *"armed in prod"* README commit — has produced
velocity, not maturity.

---

## 2. Stage ladder — reconciled and authoritative

Supersedes ARR-004 §2's four-stage form. ARR-004 folded platform, control plane, and learning into a
single Stage 3; this separates them, which is a **refinement, not a reversal** — the ordering and
dependencies are unchanged.

| Stage | Contents | Evidenced status |
|---|---|---|
| **0 — Constitutional foundation** | Principles · authority · evidence requirements | **⚠ CHALLENGED.** EPIC-000 exists in **neither repo nor tracker** (both positive-controlled). Binding in conversation only; §15 DoD unmeasurable. **Closes cheaply: land EPIC-000 in-repo.** (ARR-004 §2.1) |
| **1 — Governance foundations** | **Registry · Evidence Board · ADRs** | **In progress.** ADRs established today (ARR-001..005). Registry **0 rows**. Evidence Board **no substrate — a build, not a population**. |
| **2 — Capability intelligence** | Continuous ecosystem monitoring · scorecards · dispositions | **Not started.** Zero build-vs-adopt assessments ever recorded. Scorecard scope and disposition set both **OPEN** (ARR-003 §3.1, §4.1). |
| **3 — Foundation platform** | Identity (Google is Phase One) | **⚠ Out of order.** UNI-2434 filed; UNI-2329 Todo. |
| **4 — Adaptive control plane** | Orchestration · enforcement at real boundaries | **⚠ Out of order and live.** MC-P1 (UNI-2246 / UNI-2403–2415) is **"APPROVED FOR SLICE A BUILD"**, six tickets In Progress. **UNI-2409 is building Stage 1's own enforcement mechanism.** |
| **5 — Organisational learning** | Learning records → knowledge graph → improved orchestration | **Not started.** `.harness/learning/` 5-of-5 **0-byte**, 56 days stale; hooks never shipped. **One real asset exists: `wiki_pages` at 681 rows with a tested graph builder** — the estate's strongest reuse candidate for this stage. |

**Stages MUST NOT be entered out of order. Stages 3 and 4 are already occupied.** The ladder currently
describes a sequence the estate is not following — ARR-004 §2.2 refers, and the ruling it requests
(pause / grandfather / reclassify MC-P1) **governs this ladder too**. It is the single most consequential
open item after the defect ledger, because a roadmap that contradicts live work is not a roadmap.

**Sequencing note for Stage 5:** learning feeds the registry; the registry is the substrate reuse
depends on; reuse is inverted while the registry is empty (ARR-003 §6). **The cycle breaks at Stage 1
population and nowhere else.** Stage 5 cannot be pulled forward to compensate.

---

## 3. Readiness gates

**Auditability · Reproducibility · Observability · Rollback.**

Unchanged from ARR-004 §3, which holds the evidenced per-gate analysis and is **not restated here**.
Every stage transition and every release MUST pass all four.

**The binding rule from that analysis, restated because everything depends on it:** *a gate whose only
enforcement is a document is not a gate.* The estate's one working pattern is
`apps/autopilot-runner`'s **enforced refusal** — a build that **fails** if any of ~30 retired paths is
restored, proving non-execution in code rather than asserting it. UNI-2420's own fog section reached
the same finding independently: ***"Convention is what failed."***

---

## 4. Status — **HOLD**

**Proceed only once governance capabilities are operational.**

**Zero of six governance mechanisms are live; one is partial and is being built on a different track
than the one commissioning it** (ARR-004 §5). Operational means **enforced at a real boundary and
producing artefacts** — not designed, not ticketed, not documented.

**Outranking everything on this ladder** (ARR-001 §7.2, unchanged): a standing **62/100 NOT-READY with
66 canonical defects** has **no disposition ledger**. **UNKNOWN** how many are closed — they were not
walked against current `main`. Until dispositioned, Stages 2–5 are moot regardless of Stage 1's
progress. **That is Foundation 0, and it is not on this ladder.**

---

## 5. Open items

**Consolidated in ARR-004 §6 (eight items). Not duplicated here.** Two are load-bearing for this
record specifically:

- **§6.1 — land EPIC-000 in-repo** → ratifies Stage 0 and withdraws the challenge.
- **§6.2 — rule on MC-P1** → determines whether Stages 3–4 are a violation, an exception, or a
  misclassification of work that is substantially Stage 1.

---

## 6. Revisit conditions

1. Governance capabilities operational → hold lifts to a go/no-go on EPIC-001.
2. EPIC-000 landed in-repo → Stage 0 ratified.
3. MC-P1 ruled → §2's ladder reconciled with live work.
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by ARR-001 §6.4 and EPIC-000 §12/§18. **Route to an independent non-Claude reviewer before
acting.**

---

*Filed 2026-07-17. Status HOLD. No code written. No state changed. Every claim cites its evidence or
is labelled ASSUMPTION / UNKNOWN / OPEN / CHALLENGED.*
