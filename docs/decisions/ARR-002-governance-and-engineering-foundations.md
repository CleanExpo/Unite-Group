# ARR-002 — Governance Hierarchy and Engineering Foundations

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **HOLD** — readiness unchanged until the Capability Registry and Evidence Board are operational
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-001 — Nexus Engineering Baseline](./ARR-001-nexus-engineering-baseline.md)
**Evidence base:** `.spm/2026-07-17-strategic-architecture-review.md`

> Normative language per **RFC 2119** / **RFC 8174**.
> **Position carried from ARR-001:** risks are **sequencing**, not constitutional. Restated and
> unchanged.

---

## 1. Governance hierarchy — LOCKED

```
CONSTITUTION          principles, authority boundaries, evidence requirements
      │               MUST NOT be altered by learning or by any automated process
      ▼
BOARD                 final decision authority — material adoption, adaptation,
      │               rejection, strategic dependency, production execution
      ▼
EXECUTIVE             executive interface + intent translation (Margot, via Telegram)
      │
      ▼
ADAPTIVE CONTROL      governed operational intelligence — interprets intent, searches
PLANE (Nexus)         registries, coordinates, enforces states, verifies, learns.
      │               Governs. Does NOT decide.
      ▼
EXECUTION             agents, models, tools, MCP servers, CLIs, runners, humans
```

Decision rights MUST be explicit at each layer. **Authority flows down; evidence flows up. Neither
inverts.**

### 1.1 Decision rights by layer

| Layer | MAY decide | MUST NOT decide | Escalates to |
|---|---|---|---|
| **Constitution** | Nothing — it *constrains*, it does not act | — | Amendment is a Board-plus-founder act; **never automated** |
| **Board** | Material adopt / adapt / trial / observe / reject; strategic dependency; production execution | Constitutional amendment unilaterally | Founder |
| **Executive (Margot)** | Translation of executive intent into governed requests; routing; prioritisation | Approval of material change; anything the Board owns | Board |
| **Adaptive Control Plane** | Search order, ranking, model selection, test depth, risk classification, confidence, recommended integration strategy | **Constitutional principles, human authority, approval requirements, security boundaries, Board decision rights, evidence requirements** — EPIC-000 §11, restated as binding | Executive → Board |
| **Execution** | Only what an explicit, scoped, time- or scope-bound grant permits | Anything ungranted; **self-approval of its own output** | Control Plane |

**Non-negotiable, restated from ARR-001 §2:** the Control Plane **governs**; it does not decide. If
it begins deciding, it has stopped being a control plane and the hierarchy has failed silently.

### 1.2 OPEN — an unresolved placement, requiring founder ruling

**EPIC-000 §12 states the Senior Project Manager "is constitutional" and owns orchestration.** The
hierarchy above places orchestration in the Adaptive Control Plane, *below* the Executive. These are
not obviously compatible: a constitutional role cannot sit beneath the Executive without either the
word "constitutional" or the hierarchy meaning something looser than it reads.

**Recorded as OPEN, not silently resolved.** Ruling required: is the SPM (a) a constitutional role
binding all layers, (b) the ACP's orchestration function, or (c) an Executive-layer role? This
determines who the SPM can overrule — which is precisely the kind of ambiguity a decision-rights
matrix exists to eliminate.

### 1.3 REUSE FIRST — the hierarchy has existing substrate. Do not rebuild it.

**FACT**, verified by direct read of the migrations:

| Governance need | Already exists | Location |
|---|---|---|
| Board verdicts + rationale + personas | **`cc_decisions`** — `subject`, `verdict`, `rationale`, `personas JSONB`, `wiki_path`, FK to `cc_tasks`. Comment: *"9-persona Board verdicts + rationale"* | `20260604010000_cc_command_centre_phase2.sql:89-100` |
| Human approval gate | **`cc_approvals`** — *"human approve/reject/edit/defer"* | same migration, §5 |
| Role → autonomy ceiling | **`cc_agents.autonomy_max_level`** INT 0–5 | same migration `:49-61` |
| Capability → required authority | **`cc_tools.required_level`** INT 0–5, `approval_required`, `risk_class`, `project_scope` | same migration `:66-84` |
| Immutable audit | **`cc_task_events`**, **`cc_evidence_records`** — SELECT+INSERT only, no UPDATE/DELETE, RLS-enforced | `20260604000000_cc_command_centre.sql:70-101` |
| Autonomy tiering doctrine | **`autonomy-ladder`** skill (L0 advise → L3 strategic/irreversible) | `~/.claude/skills/` |
| Board deliberation process | **`ceo-board`** skill | `~/.claude/skills/` |

**The decision-rights matrix in §1.1 MUST be expressed against this existing 0–5 model, not a new
one.** Inventing a parallel tier scheme would violate Principle 2 while implementing the document
that mandates it.

### 1.4 BLOCKER — the Board's own table cannot record the Board's own decisions

**FACT, verified by direct read** (`20260604010000_cc_command_centre_phase2.sql:94`):

```sql
verdict TEXT NOT NULL DEFAULT 'HOLD' CHECK (verdict IN ('APPROVED', 'HOLD', 'REJECTED')),
```

**EPIC-000 §8 mandates five dispositions: adopt · adapt · trial · observe · reject.**

The CHECK constraint permits three values, and they do not map. `adopt`→`APPROVED` and
`reject`→`REJECTED` are approximations; **`adapt`, `trial`, and `observe` have no representation and
would raise a constraint violation on write.**

**Consequence: EPIC-000 Stage 19 (Board Decision) cannot be recorded in the schema that exists.**
Three of five outcomes are unstorable. The most operationally useful dispositions — *adapt* and
*trial*, the ones that let evidence accumulate without committing — are exactly the ones missing. A
Board forced to choose APPROVED or REJECTED for a candidate that merits *trial* will produce a
distorted record, and the Evidence Board (§4) would then learn from distorted history.

**This blocks item 3 and item 4.** Remediation requires a migration.

**Sequencing constraint on that remediation (FACT):** prod migration head is `20260714023022`;
`cc_agent_events` and `cc_tasks_claim` are already **repo-only and unapplied**, their headers marked
`FOUNDER-GATED APPLY`. Any `cc_decisions` change joins a founder-gated queue — it is **not** a
merge-and-done. Founder authority is on the critical path here, not incidental to it.

---

## 2. Enforcement mechanisms — DEFINED

Six mechanisms. Each MUST have a named enforcement point, a produced artefact, and a failure mode
that **fails closed**.

| # | Mechanism | Enforcement point | Artefact produced | Current state |
|---|---|---|---|---|
| 1 | **Intent validation** | Executive → ACP boundary | Structured intent record: problem, outcome, authority boundary, success criteria (EPIC-000 Stage 1) | **Not built** |
| 2 | **Registry search** | Before any external discovery or new construction (Stage 3/4) | Search record incl. **negative results** — what was looked for and not found | **Inoperative — 0 rows** (ARR-001 §3.1) |
| 3 | **Evidence review** | Before recommendation (Stages 7–17) | Scorecard + evidence records w/ provenance | **No substrate** (§4) |
| 4 | **Human approval** | Before execution (Stage 19) | `cc_approvals` + `cc_decisions` row | **Table exists; §1.4 blocks 3 of 5 verdicts** |
| 5 | **Verification** | After execution, before "done" (Stage 20) | Observation of the **live system** — never inferred from a 200 | **Not built** |
| 6 | **Learning** | After verification | Structured learning record → knowledge graph | **`.harness/learning/` 5-of-5 empty, 56 days stale** |

### 2.1 The enforcement problem, stated plainly

**FACT.** Today, **enforcement exists nowhere.** The autonomy check
`cc_agents.autonomy_max_level >= cc_tools.required_level` has **zero application call sites**;
`autonomy_max_level` appears in exactly one file estate-wide — the generated types.
`catalogue.ts` never reads `cc_tools`; every entry is permanently `invocable: false`, so
`approval_required` and `risk_class` are decorative.

**Two rules follow, and both are load-bearing:**

1. **A grant not enforced at the provider is a note, not a control** (NIST SP 800-207). Enforcement
   MUST be at the tool-call boundary, not in documentation, and not in a convention.
2. **Convention is what failed.** UNI-2420's own fog section says it: *"which are gates vs advice?
   What artefact proves a stage ran? Where is it enforced — code, hook, or convention? (Convention is
   what failed.)"* A mechanism whose enforcement point is "the agent should remember" is not a
   mechanism.

**The pattern to copy — enforced refusal.** `apps/autopilot-runner` is the estate's one working
example: its entrypoint is a **refusal tombstone**, and its build **fails** if any of ~30 retired
paths is restored. It *proves* non-execution in code rather than asserting it in a README. Contrast
`scripts/nexus-runner`, whose *"armed in prod"* claim is **a single README line** contradicted by the
same day's handoff listing arming as still-open. **Enforced refusal beats a documented promise.**

### 2.2 REUSE — mechanism 4 is partly built and In Progress on another track

**UNI-2409 — "[MC-P1][SECURITY] Enforce L3 approval at real tool-call boundary" — is In Progress
today** and is building mechanism 4's enforcement point. Per ARR-001 §7.2, this MUST be reconciled
before Atlas or EPIC-000 commissions a second implementation of it.

---

## 3. Capability Registry — MANDATORY

**The Capability Registry is now mandatory.** It is a **living system of record**, not a scan output.

It MUST hold **permanent metadata** and **decision traces** — for every capability: what it is, who
owns it, what evidence supports it, what was decided about it, when, by whom, on what grounds, and
what would reverse that.

**MUST:**
- Be searched before external discovery or new construction (Stage 3/4). A search MUST record its
  **negative** results — "we looked and found nothing" is itself a decision trace, and its absence is
  what lets duplicate work look novel.
- Carry decision traces that outlive their authors. **Why**, not merely **what**.
- Be **populated and name-reconciled** before Principles 2 and 18 are operative (ARR-001 §3.1–3.2).

**MUST NOT:**
- Be a point-in-time scan. A one-time inventory rots. *Observed this session: a five-day-old handoff
  was **116 commits** wrong, and estate memory recorded a PR as unmerged that had been squash-merged.*
- Be trusted while blind to its own enforcement machinery (§3.1).

### 3.1 Population material — quantified, ready, and self-incriminating

| Registry | Ground truth | Note |
|---|---|---|
| Skills | **291** resolvable | README claims 243; **47 uncatalogued**; 4 broken symlinks |
| Agents | **43** (11 `.md` + 31 legacy `.json`) + 1 in-repo | `chief-reviewer.md` cites 16 reviewers existing as no file |
| MCP | **~23** across 4 configs | vs 10 catalogued; **13 missing**; 2 name mismatches |
| CLI | `gh`, `vercel`, `doctl` authenticated | `supabase`, `linear` MCP-only |

**Among the 47 uncatalogued skills are `proof-discipline` and `goal-circuit-breaker`** — the guards
that enforce evidence discipline. **The registry is blind to its own enforcement machinery.** Treat as
a finding, not an irony: a system of record that cannot see its own guards cannot be trusted to report
what exists.

**Name reconciliation is in scope, not a follow-up** (ARR-001 §3.2): `chrome` is really
`claude-in-chrome`; `google` is three connectors, not one server. Exact-match lookup returns "build
new" for capabilities that exist.

---

## 4. Engineering Evidence Board — MANDATORY

Every **model, MCP server, tool, and agent** MUST carry a **living evaluation record** with
**traceable evidence**.

**MUST:**
- Score against a **versioned** scorecard (EPIC-000 §7, 20 dimensions). Scores do not replace
  judgement — **they make judgement inspectable.**
- Cite provenance, timestamp, and source class for every input. **An unsourced score is decoration.**
- Record **confidence** — strength, freshness, independence, completeness of the evidence.
- Be **living**: re-assessed as versions, maintainers, threats, and requirements change. Evidence
  goes stale; the board MUST know how stale.
- Distinguish **facts, assumptions, recommendations, and unknowns** as separate classes.

**MUST NOT:**
- Be computed by the thing it scores. **A score Nexus computes about itself is the self-judged-gate
  trap** (UNI-2433's own fog section names this). Per ARR-001 §6.4: no reviewer validates its own
  review.

### 4.1 Substrate status — it must be BUILT, not populated

**FACT.** `.harness/learning/` holds **five 0-byte JSONL files**, mtime **2026-05-22** — **56 days
stale**. Its own README concedes the capture hooks are *"shipping separately"*. They never shipped.

**FACT.** **`.harness/swarm/swarm.jsonl` does not exist anywhere in the repo** — while the registered
`audit-emit` skill asserts it writes to *".harness/swarm/swarm.jsonl (existing immutable append)"*.
**A registered skill makes a false claim about live infrastructure.** That is the estate's dominant
failure mode reproduced inside the very mechanism meant to detect it.

**FACT.** `cc_evidence_records` — **0 rows**.

**This is a material scope correction:** the Evidence Board is not a population task. **There is no
substrate.** Item 4 is a build.

**First real test — Kimi K3.** No evidence record exists; no verified knowledge of it is available.
It is correctly held as an **experimental-tier candidate, not a foundation piece** — precisely because
the record does not exist. It SHOULD be the board's first genuine exercise rather than a question
settled by assertion.

---

## 5. Architecture Decision Records — FORMALIZED

Every material choice MUST be **explainable, reviewable, and reversible**, and MUST be recorded as an
ADR/ARR.

**Required content** (EPIC-000 §9; ISO/IEC/IEEE 42010 rationale):
context · decision · **evidence** · alternatives considered · **consequences** · **revisit
conditions** · owner · status.

**MUST:**
- Be filed as an **artefact in the repository**. *A decision that lives only in a session dies with
  the session* — ARR-001 §1, self-applied.
- State **revisit conditions**. A decision with no falsifier is a belief.
- Record **negative** decisions and **rejected** alternatives, with the evidence and the conditions
  that would justify reconsideration (EPIC-000 §8).

### 5.1 Baseline — what exists

**FACT.** Exactly **one ADR** exists in the repo: `apps/empire/docs/adr/ai-marketing-advisor.md`
(2026-03-31, status "Proposed", unrelated to this workstream). **No ADR covers Nexus, OWNEST, Mission
Control, or Atlas.** `.spm/*.md` is the **de facto** practice. **The practice EPIC-000 §9 requires does
not exist to inherit.**

**FACT — §20 is already violated at the foundation.**
`20260604000000_cc_command_centre.sql:3-4` cites `NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md §6` and
`NEXUS_BUILD_QUEUE_PLAN.md CC-03` as its design source. **Neither file exists anywhere in the repo.**
The schema underpinning the Capability Registry, the Board's decision table, and the autonomy model
has **no reachable rationale**. Nobody can now explain, review, or reverse it on its stated grounds.

### 5.2 The ARR series — established here

`docs/decisions/ARR-NNN-<slug>.md`. Sequential, immutable once decided; superseded by a later ARR
rather than edited. **ARR-001** and **ARR-002** are the first two entries.

**This remediates §5.1 going forward. It does not remediate it backwards** — the `cc_*` schema's lost
rationale (C10) remains an open gap requiring either reconstruction or an explicit ARR recording that
the rationale is unrecoverable and the schema is retained on other grounds.

---

## 6. Risk position — SEQUENCING, NOT CONSTITUTIONAL

**Restated and unchanged from ARR-001.** The principles are coherent. They are **inoperative for want
of a substrate**. The binding constraint is **enforcement**, not doctrine.

**Corroborating evidence that the problem is adherence, not principle:**
`docs/superpowers/specs/2026-07-12-nexus-agentic-automation-foundation.md:28-42` already states
*"This is an integration and governance build, not a new agent framework."* The estate committed to
reuse-first three weeks ago and did not follow it. **No quantity of additional doctrine fixes a
doctrine-adherence problem.** §2's enforcement points are the remedy; EPIC-001..010 are not.

---

## 7. Readiness — **HOLD**

**Unchanged.** Hold until the **Capability Registry** and the **Evidence Board** are operational.

| Condition | State | Evidence |
|---|---|---|
| Capability Registry operational | **0 rows; enforcement absent; names unreconciled** | §3.1, ARR-001 §3 |
| Evidence Board operational | **No substrate — must be built** | §4.1 |
| ADRs formalized | **Established this record; 1 pre-existing unrelated ADR; backward gap open** | §5 |
| Board can record its own decisions | **BLOCKED — 3 of 5 dispositions unstorable** | §1.4 |

**Carried forward from ARR-001 §7.2, still requiring founder ruling — neither is a sequencing item
these five foundations resolve:**

- **The 66 canonical defects have no disposition ledger.** A standing **62/100 NOT-READY** makes
  EPIC-001 moot independent of everything above. **UNKNOWN** how many are closed.
- **Track proliferation.** Three governance tracks cannot see each other; **UNI-2409 is In Progress
  building §2's mechanism 4** while Atlas is chartered to map it. Adding a fourth track will not fix
  three that are blind to one another.

**New this record:** §1.4 — the Board's decision table cannot store 3 of the constitution's 5
dispositions. This is a **prerequisite to items 3 and 4**, not a detail, and its fix sits in a
**founder-gated migration queue** behind an already-unapplied backlog.

---

## 8. Revisit conditions

1. §7 conditions met → go/no-go on EPIC-001.
2. §1.2 (SPM placement) ruled → §1.1 updated.
3. §1.4 remediated → items 3 and 4 unblock.
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model, self-review
prohibited by ARR-001 §6.4 and EPIC-000 §12/§18. **Route to an independent non-Claude reviewer before
acting.**

---

*Filed 2026-07-17. Status HOLD. No code written. No state changed. Every claim cites its evidence or
is labelled ASSUMPTION / UNKNOWN / OPEN.*
