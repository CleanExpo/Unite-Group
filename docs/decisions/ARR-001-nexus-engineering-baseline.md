# ARR-001 — Nexus Engineering Baseline

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **HOLD**
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Supersedes:** nothing · **Superseded by:** nothing
**Evidence base:** `.spm/2026-07-17-strategic-architecture-review.md` (this record's supporting review)

> **Normative language.** Key words MUST, MUST NOT, SHOULD, SHOULD NOT, MAY are used per
> **RFC 2119** as clarified by **RFC 8174** (uppercase-only carries normative force; lowercase
> occurrences are prose).

---

## 1. Why this record exists

ARR-001 establishes the **engineering baseline for Nexus**.

It is **not a specification**. It is a decision record: it explains **why the architecture exists**,
**what evidence supports it**, and **under what conditions it is revisited**. Specs describe what to
build. This describes what was decided, on what grounds, and what would change the decision.

Per **ISO/IEC/IEEE 42010**, an architecture description MUST carry its rationale, not merely its
structure. Per established ADR practice, that rationale MUST remain traceable after the people who
held it have moved on.

**This record self-applies its own finding.** The EPIC-000 constitution currently exists in neither
the repository nor the tracker (§4, C1) — it has been binding in conversation only. A constitution or
review that lives solely in a session dies with the session. ARR-001 is therefore filed as an
artefact, and future ARRs MUST be also.

---

## 2. Architectural position (decided)

**Nexus is a governed adaptive control plane for organisational cognition and execution.**

**Nexus is not a decision maker.**

That distinction is the load-bearing one and MUST NOT erode. Nexus interprets intent, discovers and
selects capabilities on evidence, coordinates agents and models and tools and humans, enforces
workflow states, verifies outcomes, and learns. **Authority remains human.** A control plane that
begins deciding has stopped being a control plane.

It is neither a wrapper (a simplified interface over a component) nor a harness (a rig for executing
or observing components under controlled conditions). It is the governed operational intelligence
layer connecting authority, evidence, capabilities, orchestration, execution, verification, and
organisational learning.

---

## 3. Constitutional assessment

**Founder assessment (recorded as decided):** the constitutional principles have been assessed for
**internal consistency** and found **coherent**.

**"Discover before asking" and "reuse before creating" are sound but UNENFORCEABLE until a capability
registry exists. This is a sequencing correction, not a constitutional flaw.**

That framing is accepted and is the governing interpretation. The principles are not withdrawn,
weakened, or deferred — they are **currently inoperative for want of a substrate**, and become
operative the moment the substrate exists.

### 3.1 Evidence supporting the sequencing correction

**FACT.** Capability Registry tables are empty: `cc_tools` **0 rows**, `cc_agents` **0**,
`cc_evidence_records` **0** (Supabase `lksfwktwtmyznckodsau`). Positive control in the same query:
`cc_task_events` **97 rows** — the zeros are real, not a broken query.

**FACT.** The autonomy check `cc_agents.autonomy_max_level >= cc_tools.required_level` **does not
exist in code**. `autonomy_max_level` appears in exactly one file estate-wide — `types/supabase.ts`,
the generated types — with **zero application call sites**.
`apps/web/src/lib/command-centre/tools/catalogue.ts` never reads the table; it returns a hardcoded
14-entry literal whose own comment concedes the enums *"mirror cc_tools"*.

**Mechanism of the failure.** EPIC-000 Stage 3 ("Registry Search... before external discovery or new
construction") run against a zero-row registry returns nothing for **every** candidate, falls through
to Stage 5, and concludes **"build new."** The reuse principle does not merely run late — it
**inverts**, and does so while executing the full governance ceremony correctly. **An empty registry
does not fail safe.**

### 3.2 A second failure mode — population is necessary but NOT sufficient

**FACT.** The static catalogue lists ~10 MCP servers; **at least 13 real ones are absent**
(`artlist`, `higgsfield`, `xapi`, `margot-deep-research`, `mobbin`, `stripe`, `vercel`, and others).
Two of the ten catalogued use names that do not match real server identifiers — `chrome` is actually
`claude-in-chrome`; `google` is three separate connectors, not one server.

**An exact-match reuse check would miss a capability that genuinely exists and return "build new"
anyway.** Registry population MUST therefore include **name reconciliation**. Populating without
reconciling leaves the inversion partially intact.

### 3.3 Where the review qualifies the coherence finding

The internal-consistency assessment is accepted for the **principles**. Two observations are recorded
without reopening it, because both are adherence and inheritance gaps rather than logical defects:

- **§9 requires an architecture decision record per internal build. That practice does not exist to
  inherit.** Exactly **one ADR** exists in the repo (`apps/empire/docs/adr/ai-marketing-advisor.md`,
  2026-03-31, "Proposed", unrelated). ARR-001 begins remediating this.
- **§20 ("all material technical decisions must remain explainable, reviewable, reversible, and
  attributable") is already violated at the foundation.** `20260604000000_cc_command_centre.sql:3-4`
  cites `NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md §6` and `NEXUS_BUILD_QUEUE_PLAN.md CC-03` as its
  design source; **neither file exists anywhere in the repo** (positive control: the grep finds the
  migration and its comment text, so the search is sound). The schema underpinning the registry has
  no reachable rationale.

**Further evidence that the binding constraint is enforcement, not doctrine:** reuse-first is already
written down and already ignored. `docs/superpowers/specs/2026-07-12-nexus-agentic-automation-foundation.md:28-42`
states *"This is an integration and governance build, not a new agent framework."* The estate
committed to this three weeks ago and did not follow it. **Adding EPIC-001..010 will not fix a
doctrine-adherence problem.**

---

## 4. Evidence base

This record draws on established disciplines rather than invented method:

| Discipline | Applied to |
|---|---|
| **RFC 2119** (w/ **RFC 8174**) | Normative language — MUST / SHOULD / MAY carry defined force |
| **ISO/IEC/IEEE 42010** | Architecture description MUST carry rationale, not only structure |
| **ADR practice** | Decision traceability that survives its authors |
| **NIST AI RMF** | AI governance — govern / map / measure / manage |
| **NIST SP 800-207** | Zero Trust — no implicit trust; verify per request; least privilege |
| **Domain-Driven Design** | Bounded contexts; ubiquitous language |
| **Model Context Protocol** | Modular, standards-first integration over proprietary coupling |

**Bounded-context note (DDD), recorded as a live defect.** Ubiquitous language is currently violated
three ways, and ambiguous names defeat registry lookup exactly as C2's identity mismatch does — the
same defect class, one level up:

- **"Atlas"** is already an agent persona in this codebase (Atlas/Forge/Pixel/Grid/Quill —
  `apps/web/.claude/docs/AGENT-PROTOCOL.md:10`), and is now also proposed as the access control plane.
- **"Nexus 2.0"** names two materially different systems with no cross-reference.
- **"control plane"** names both Atlas's *access* control plane and UNI-2403's *"one control-plane
  source of truth"* (In Progress, different scope).

Names MUST be reconciled before the registry is populated against them.

**Zero-trust note (800-207), recorded as a live gap.** A grant that is not enforced at the provider is
a note, not a control. Today the autonomy grant is enforced **nowhere** (§3.1). The estate's one
working counter-example is `apps/autopilot-runner`, whose entrypoint is a **refusal tombstone** and
whose build fails if ~30 retired paths are restored — **it proves non-execution in code rather than
asserting it in a document.** That pattern SHOULD be generalised to every arming claim.

---

## 5. Assumptions — declared, not buried

1. **AI capabilities will evolve.** Any capability selected today MAY be superseded. Selections MUST
   therefore be reversible, and MUST NOT be structurally load-bearing in a way that resists
   replacement (see Lock-in risk, EPIC-000 §7).
2. **Standards will matter.** Standards-first integration (MCP, OAuth, OpenTelemetry-shaped
   observability) is preferred over proprietary coupling, and this preference is a bet — recorded as
   an assumption, not a certainty.
3. **Human accountability remains non-negotiable.** This is not an assumption about technology. It is
   a constraint on it, and it does not relax as capability improves.

---

## 6. Constraints — explicit

1. **Constitutional authority cannot be automated.** Learning MAY alter search order, ranking, model
   selection, test depth, risk classification, and confidence. Learning MUST NOT alter constitutional
   principles, human authority, approval requirements, security boundaries, Board decision rights, or
   evidence requirements.
2. **Evidence is mandatory for material recommendations.** An assertion is not evidence. A null result
   is not evidence until a positive control passes. A doc asserting a fact is a **lead**, not an entry.
3. **Decisions MUST remain explainable, reviewable, and reversible.**
4. **No capability approves its own adoption; no reviewer validates its own review.** A grader under
   the control of the thing being graded optimises itself. This applies to the Capability Factory
   (EPIC-000 §10), and it applies to this record's own supporting review (§8).

---

## 7. Status: **HOLD**

**The hold is not a judgement that the architecture is weak.** The architectural position (§2) is
sound and is decided. **The hold exists because the enforcement mechanisms do not yet exist.**

### 7.1 Conditions to proceed (founder-set)

Nexus proceeds to EPIC-001 once **all** of:

1. **The Capability Registry is populated** — extended per §3.2 to include **name reconciliation**.
2. **The evidence board is operational.**
3. **Initial build-versus-adopt assessments are recorded.**

### 7.2 Conditions the review adds — NOT yet accepted, requiring founder ruling

The supporting review surfaced two blockers that §7.1 does not currently account for. They are
recorded here as **OPEN**, not as decided:

- **A standing NOT-READY verdict is unclosed.** `.spm/2026-07-16-break-sweep-readiness-assessment.md`
  is **62/100 NOT-READY with 58 confirmed defects**, reconciled with a second audit into **66
  canonical defects**. **UNKNOWN** how many are closed — they were not walked against current `main`.
  **Until dispositioned, EPIC-001 is moot independent of conditions 1–3.**
- **Track proliferation.** Three governance tracks exist and cannot see each other: Mission Control
  Phase 1 (UNI-2246 / UNI-2403–2415, **"APPROVED FOR SLICE A BUILD"**, six tickets In Progress), Atlas
  (UNI-2433/2434/2435, opened 07:57 2026-07-17), and UNI-2379. **UNI-2409 — "[MC-P1][SECURITY] Enforce
  L3 approval at real tool-call boundary" — is In Progress and solves the same enforcement gap Atlas
  was chartered to map.** Neither map references the other. EPIC-000 + Atlas would be a **fourth**
  governance layer over an approved mid-build one, commissioned under a constitution whose Principle 2
  is *reuse before creating*.

**Recommendation:** the review holds that these are **Foundation 0** and **Foundation 0.5** — they
precede conditions 1–3. Adding a fourth track will not fix three tracks that cannot see each other.

### 7.3 Substrate status of the proceed-conditions

| Condition | State | Evidence |
|---|---|---|
| Registry populated | **0 rows** | §3.1 |
| Evidence board operational | **No substrate exists.** `.harness/learning/` is 5-of-5 **0-byte** files, mtime 2026-05-22 (**56 days stale**); its README concedes capture hooks are *"shipping separately"* — never shipped. **`.harness/swarm/swarm.jsonl` does not exist**, while the registered `audit-emit` skill asserts it does. | Runtime scan |
| Build-vs-adopt recorded | **None recorded.** | Specs scan |

**The evidence board must be BUILT, not populated.** That is a material scope fact for condition 2.

### 7.4 Registry raw material — quantified and ready

| Registry | Ground truth | Note |
|---|---|---|
| Skills | **291** resolvable | README claims 243; **47 uncatalogued** — including `proof-discipline` and `goal-circuit-breaker`, the guards enforcing evidence discipline; 4 broken symlinks |
| Agents | **43** (11 `.md` + 31 legacy `.json`) + 1 in-repo | `chief-reviewer.md` cites 16 specialist reviewers existing as no file |
| MCP | **~23** across 4 configs | vs 10 catalogued; 2 name mismatches |
| CLI | `gh`, `vercel`, `doctl` authenticated | `supabase`, `linear` MCP-only, not on PATH |

The registry is presently **blind to its own enforcement machinery**. It cannot bootstrap trust in
itself in that state.

---

## 8. Revisit conditions

ARR-001 is revisited if any hold:

1. Conditions §7.1 (as extended by §7.2, if ruled in) are met → status moves to a go/no-go on EPIC-001.
2. The architectural position (§2) is challenged with evidence — specifically, if Nexus is found to be
   deciding rather than governing.
3. An assumption in §5 is falsified.
4. **The supporting review is independently challenged and its findings do not survive.**

**This record's supporting review is UNCHALLENGED.** It was produced by a single Claude model. Per
EPIC-000 §12/§18 and Constraint §6.4, it cannot validate itself; a self-scored architecture review is
the same anti-pattern as a self-scored merge gate. **It MUST be routed to an independent non-Claude
reviewer before §7 is acted upon.** Its own stated gaps: the ecosystem/model assessment (EPIC-000 §16
Part 3) is **NOT delivered** — it requires external research and was scoped rather than fabricated;
**Kimi K3 is UNKNOWN** and is correctly held as an experimental-tier candidate, not a foundation
piece, precisely because no evidence record exists for it.

---

*Filed 2026-07-17. Status HOLD. No code written. No state changed. Every claim cites its evidence or
is labelled ASSUMPTION / UNKNOWN.*
