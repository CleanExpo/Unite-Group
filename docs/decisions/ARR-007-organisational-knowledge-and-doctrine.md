# ARR-007 — Organisational Knowledge and Doctrine Framework

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **APPROVED — permanent constitutional layer.** Binding; **not yet operational** (§9).
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated + consolidated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-006](./ARR-006-engineering-evidence-framework.md) — ARR-006 governs *evidence*; this governs *knowledge, reasoning, and doctrine* built from it, and depends on ARR-006's register as its substrate.

> Normative language per **RFC 2119** / **RFC 8174**.

---

## 1. Constitutional purpose

This framework converts organisational intelligence into a **permanent constitutional asset** —
ensuring **knowledge, evidence, reasoning, decisions, and lessons learned become institutional
property, not tribal memory.**

### 1.1 "Tribal memory" is not a metaphor here. It has failed three ways, all evidenced.

**Memory — FACT, three failures in one session.** A handoff asserted *"main @ `8585c147`, nothing in
flight"* while **116 commits** stale with six tickets In Progress. Estate memory recorded PR #763 as
unmerged; it had been **squash-merged five days earlier**. `Nexus Concierge OS` — **Phase 1 100%
complete** — was nearly rebuilt because nothing recalled it; a 49-tool-call sweep found what a register
returns in seconds.

**Individual models — FACT.** `CLAUDE.md` §0: the operating playbook *"previously lived solely in
`~/.hermes` (unsynced, one machine), so it loaded nowhere."* Doctrine present on one machine and
**nowhere else**. Nothing announced its absence.

**Undocumented convention — FACT.** UNI-2420's fog section, reached independently: ***"Where is it
enforced — code, hook, or convention? (Convention is what failed.)"*** Corroborated: the autonomy check
has **zero** application call sites; `catalogue.ts` mirrors `cc_tools` by convention rather than
reading it.

**This section does not name three risks. It names three post-mortems.**

---

## 2. Continuous cognitive loop

**Nexus maintains a continuous cognitive loop that SENSES · RESEARCHES · PREPARES · SURFACES GAPS, in
service of the mission. It stops at governance and approval boundaries. Human judgement remains
sovereign.**

| Stage | MAY | MUST NOT |
|---|---|---|
| **Sense** | Observe live systems, boards, repos, ecosystems | Change what it observes |
| **Research** | Gather + classify evidence per ARR-006 §3 | Treat a lead as an entry; assert a null without a positive control |
| **Prepare** | Assemble context, draft **options**, cost them, state rollback | **Select** among them — that is the Board's act |
| **Surface gaps** | Name what is missing, stale, contradicted, unverified | **Remediate** the gap it found |

**"Prepare, do not select" is the boundary.** The loop's terminal output is **options with evidence** —
never a decision, never a change. **Sovereign** is the operative word: judgement originates with the
human; it does not delegate upward to them.

**Why the loop stops at *prepare* rather than *recommend*.** Ranking is permitted — EPIC-000 §11 allows
learning to alter ranking — but a ranked list MUST remain a ranked list. **The moment "recommended"
reads as "decided unless overridden", the gate inverts from opt-in to opt-out and human authority
becomes a veto rather than a source.** That inversion is silent, and it is what this clause prevents.

**Precedent — build on it, not beside it.** UNI-2434 already encodes this split: **Discover · Normalize
· Analyze · Recommend are AFK; Approve is HITL** — *"Founder sign-off. The only human gate. Nothing
executes without it."* Its foundational rule: ***"Discovery precedes cleanup. Cleanup precedes
automation. Automation precedes autonomy. Authority is always human."***

**Continuous cognition is the remedy, not the risk.** This estate's failure is never *too much
discovery* — it is **execution outrunning evidence**: the nexus-runner *"armed in prod"* claim backed
by a one-line README commit; 61 falsely-marked Done tickets. **Gap detection MAY run unattended
forever. Gap remediation MAY NOT.**

### 2.1 ⚠ OPEN — "always on" is unbounded as written

The loop is **always on**. Nothing states **bounded by what**. Two things MUST be specified:

- **An enforced kill switch.** **REUSE — one exists:** `scripts/nexus-runner/run.sh` gates on
  `~/.claude/HARD_STOP` each cycle. **FACT: that marker exists nowhere on this machine — the gate has
  never fired here.** Per `CLAUDE.md` §0, *confirm the gate is registered on this machine and prove it
  fires with a positive control.* **An always-on loop whose stop mechanism has never been fired is not
  bounded; it is merely not yet running.**
- **A spend and rate bound.** Continuous sensing consumes tokens, quota, and third-party rate limits
  indefinitely. The estate already runs **40 Vercel cron entries**, several at `*/5` and `*/15`, whose
  live execution is **UNKNOWN**. Adding a continuous loop above an unmeasured load without a stated
  bound compounds it.

**Ruling required: bounded by spend, rate, scope, wall-clock, or a combination — and enforced where?**
Per ARR-004 §3: *a gate whose only enforcement is a document is not a gate.* **Fail closed by recent
precedent** — commits `872a2b58` (*"reject unset/blank CRON_SECRET across all cron surfaces"*) and
`05ef74a9` (*"fail closed when monitor secret is unset"*) hardened exactly this class within 48 hours,
implying it was previously fail-open. **Unset bound → loop does not run.**

---

## 3. Knowledge acquisition and evidence pipeline

**Knowledge is acquired continuously from approved sources, transformed into evidence-grade records,
and linked to the decisions and doctrine that rely on it.**

```
approved source → acquire → classify + rate (ARR-006 §3/§4) → evidence-grade record
                                                                      │
                                                    ┌─────────────────┴─────────────────┐
                                                    ▼                                   ▼
                                          linked to DECISIONS                  linked to DOCTRINE
                                          (which ADR relies on it)             (which rule rests on it)
```

**The linkage is the load-bearing half, and it is what makes this different from a document store.**
An evidence record that no decision points at is inert. **A decision whose evidence cannot be traced
back is the `cc_command_centre` schema** — whose migration cites two design documents that **do not
exist**, leaving the registry, the Board's decision table, and the autonomy model with **no reachable
rationale**. Nobody can now explain, review, or reverse it on its stated grounds.

**Bidirectional consequence, and this is the point of linking:** when evidence is refreshed or
falsified, **every decision and doctrine resting on it MUST surface for review.** Without the link,
stale evidence silently continues to support live decisions — which is the estate's dominant failure
mode with a new name.

**"Approved sources" implies an approval act** that does not yet exist. ARR-006 §2 lists source
classes; ARR-006 §7 records the classification standard as **NOT MET**. **Ruling required: who
approves a source, and against what?**

---

## 4. Orchestrated work

**Work is orchestrated around declared objectives, progresses through defined states, and requires
evidence to move forward.**

**"Requires evidence to move forward" is the strongest clause in this framework.** It converts every
state transition into an evidence gate, and it is the direct antidote to what the estate does today:
**61 Done tickets confirmed falsely marked**, 183 with zero merge evidence, UNI-2373 marked Done while
its own migrations remain unapplied. Those advanced through states on **assertion**.

**REUSE — the state machine substrate exists and is partly enforced (FACT):**
- `cc_tasks` + append-only `cc_task_events` (**97 rows** — live and writing).
- **UNI-2417 shipped today** (#885, #886): *"enforce task-lifecycle transition matrix on queue PATCH"*
  and *"close sibling task-promotion bypasses"* — `isLegalTransition` now guards the queue, and two
  bypass paths were closed within 30 minutes of discovery.

**This is the one place in the estate where "defined states" is already real and enforced in code.**
Build §4 on it. **What is missing is the evidence predicate** — transitions are currently legal-or-not,
not evidenced-or-not.

---

## 5. Inheritance by default

**Every project, agent, and future component inherits doctrine, terminology, evidence standards, and
decision history by default.**

### 5.1 ⚠ CHALLENGE — inheritance is asserted, and no mechanism delivers it

**This is the central finding of this record. Inheritance does not happen today. It is an accident of
one machine.**

**FACT.** `CLAUDE.md` §0 states it outright: *"`~/.claude/hooks/` and `settings.json` are gitignored —
they do **NOT** propagate through this repo. A hook only exists on a fresh machine if `bootstrap.sh`
installs it."*

**FACT — every doctrine-carrying path fails silently:**
- The routing map once used an absolute `/Users/phill-mac/...` path *"that existed on the Mini and
  nowhere else, so on any other machine the routing map — and the `proof-discipline` /
  `task-completion-gate` guards it routes to — silently did not load at all."*
- **`CLAUDE.md` §6's deterministic recall cannot run on this machine** — `brain.js` / `_system` absent;
  *"`bootstrap.sh` references none of `_system`/`brain.js`/`brain-1`/`swarm` — that's why the checkout
  stays missing silently."*
- **`bootstrap.sh` calls 3 installers; only 1 is wired**, and both call sites *"swallow failure into a
  `note:` echo."*
- **47 of 291 skills are uncatalogued** — including `proof-discipline` and `goal-circuit-breaker`,
  **the guards enforcing this doctrine**. 4 symlinks broken; 131 of 145 point into a *different
  repository*. `.claude/skills` is *"a view, not a store."*

**Nothing errors. Nothing reports.** A fresh machine, a new agent, or Rana inherits **nothing** — and
**the absence is indistinguishable from compliance.** That property is what makes it dangerous.

**"Inherits by default" is therefore operationally false, with a named cause.** Doctrine propagating
through gitignored machine-local files does not inherit; it merely happens to be present where it was
authored.

**Required to make §5 true:**
1. Doctrine artefacts in **version control**, not gitignored machine-local paths.
2. `bootstrap.sh` installs every artefact it claims, **proven by positive control** — *"the reviewer
   runs on the Mini" is not evidence it runs here.*
3. **Inheritance fails loudly.** A component starting without doctrine MUST error, not proceed quietly.
4. The catalogue sees its own guards.

### 5.2 What actually inherits today

| Layer | Artefact | Propagates? |
|---|---|---|
| Constitution | **EPIC-000** | **NO — exists in neither repo nor tracker** (ARR-004 §2.1) |
| Architecture doctrine | **ARR-001..007** | **YES — in-repo, versioned.** Created today |
| Operating doctrine | `CLAUDE.md`, `FABLE_PLAYBOOK.md` | **Partial** — loads only if imports resolve; previously loaded nowhere |
| Terminology | — | **NO — and actively colliding**: "Atlas" is both an agent persona and the access control plane; "Nexus 2.0" names two systems; "control plane" names two scopes |
| Evidence standards | **ARR-006 register** | **Approved, not operational** — `cc_evidence_records` **0 rows** |
| Decision history | `cc_decisions` | **0 rows** — and **3 of 5 constitutional dispositions are unstorable** (ARR-003 §4.1) |

**Two of six propagate reliably. Both were created today.**

---

## 6. Decisions record options, evidence, and rationale

**Significant decisions MUST record options, evidence, and rationale.**

**This ratifies ARR-006 §5.1 and confirms a live defect in this series.** ARR-001..007 carry evidence,
assumptions, consequences, and revisit conditions. **They largely do NOT record options considered.**
ARR-003 §1 states *adopt-or-adapt-first* without recording what was rejected; ARR-005 §2 presents one
stage ladder without the orderings that lost.

**Remediation is now mandatory, not advisory.** ARR-001..007 MUST be amended to record options and
rationale — or MUST carry an explicit statement that no alternative was weighed, which is itself an
honest record.

**Why this clause matters more than it looks.** An ADR without options records **what** was decided but
not **that a choice existed**. EPIC-000 §5.12 requires the graph to *"preserve why a decision was made,
not merely what was selected."* **The `cc_*` schema is what a decision without recorded options decays
into within 18 months: unreviewable, unreversible, unattributable — §20 violated at the foundation.**

---

## 7. Learning accumulates

**Operational outcomes are captured and fed back into the doctrine so learning accumulates.**

**Bounded by ARR-002 §1.1 / EPIC-000 §11:** learning MAY alter search order, ranking, model selection,
test depth, risk classification, confidence. **Learning MUST NOT alter constitutional principles, human
authority, approval requirements, security boundaries, Board decision rights, or evidence
requirements.**

**FACT — capture has nowhere to write.** `.harness/learning/` is **5-of-5 0-byte files, mtime
2026-05-22 — 56 days stale**; its README concedes the hooks are *"shipping separately"*; they never
shipped. **`.harness/swarm/swarm.jsonl` does not exist** while the registered `audit-emit` skill
asserts it writes to *"(existing immutable append)"*. `cc_evidence_records` — **0 rows**.

**REUSE — the one real asset. The Knowledge Graph works:**
- **`wiki_pages` — 681 rows.**
- **`wiki-graph.ts`** — pure, tested, built on the right doctrine: ***"unresolved links dropped — never
  fabricated."*** It refuses to invent an edge it cannot resolve.
- A live Plaud → Wiki embedding pipeline — **455/455 embedded**.

**This is the best asset in the estate and it is already built.** Per Principle 2, §7 MUST be built on
it. **Do not build a new knowledge store.** EPIC-000 §5.12 is substantially this.

**Known gap (FACT):** *"the Wiki has no reader — only `oracle_daily_brief.py` touches it, and it only
counts files."* **A knowledge asset nothing reads is not yet institutional property.** The graph exists;
the inheritance path to it does not — §5.1 from the other side.

---

## 8. Continuity across time

**Organisational intelligence is preserved across time, enabling continuity even after long pauses.**

**This is the clause the whole framework exists to deliver, and it is testable.** The test is not
whether the documents exist. **It is whether a cold start — a new machine, a new agent, a returning
human after months — reaches the same understanding without the session that produced it.**

**Today that test fails, and this session is the proof.** Resuming from the estate's own handoff
produced a picture **116 commits stale** asserting *"nothing in flight"* while six tickets were In
Progress. **The pause was five days.** Not months. **Five days.**

**A framework promising continuity after long pauses MUST first survive a short one.**

---

## 9. Exit criteria

| # | Criterion | State |
|---|---|---|
| 1 | Doctrine artefacts in version control | **PARTIAL** — ARR-001..007 yes; **EPIC-000 no**; hooks/settings gitignored |
| 2 | Inheritance exists and **fails loudly** | **NOT MET** — fails silently; `bootstrap.sh` wires 1 of 3 |
| 3 | Catalogue sees its own guards | **NOT MET** — 47 uncatalogued incl. `proof-discipline` |
| 4 | Knowledge graph readable by inheritors | **NOT MET** — 681 rows, no reader |
| 5 | Outcomes captured continuously | **NOT MET** — `.harness/learning/` 5-of-5 empty, 56 days |
| 6 | Options + rationale preserved | **NOT MET** — §6; `cc_*` rationale unrecoverable |
| 7 | Terminology unified | **NOT MET** — three live collisions |
| 8 | **Cold-start continuity proven** | **NOT MET — actively failing** (§8) |

**0 of 8 met, 1 partial. Approved and binding; not operational.** Per ARR-006 §7 these are different
states and MUST NOT be conflated.

---

## 10. Open items

| # | Item | Where |
|---|---|---|
| 1 | **Inheritance has no mechanism** — doctrine propagates through gitignored machine-local files | §5.1 |
| 2 | **"Always on" is unbounded** — bounded by what, enforced where? `HARD_STOP` never fired here | §2.1 |
| 3 | **"Approved sources" implies an approval act that does not exist** — who approves, against what? | §3 |
| 4 | **ARR-001..007 lack options + rationale** — amend, now mandatory | §6 |
| 5 | **Knowledge graph has no reader** | §7 |
| 6 | **EPIC-000 not landed** — the doctrine's root has no artefact | ARR-004 §6.1 |

**Twelve further items remain open across ARR-004 §6 and ARR-006 §9.**

---

## 11. Revisit conditions

1. §9's eight criteria met → **approved** becomes **operational**.
2. **A cold start is proven to inherit doctrine** — positive-controlled, not assumed → §5.1 withdrawn.
   **This is the single test that matters for this record.**
3. Any §10 item ruled → updated or superseded.
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by ARR-006 §4, ARR-001 §6.4, and EPIC-000 §12/§18.

**Closing note, recorded because it is this record's own subject.** This framework was authored by an
individual model, in a session, from context that will not survive it. It is filed to disk precisely so
it does not depend on the thing that produced it. **If §5.1 is not fixed, this document inherits
nowhere and the framework fails on its own terms** — a doctrine of inheritance that did not inherit.

---

*Filed 2026-07-17. Status APPROVED — constitutional. Not yet operational (§9). No code written. No
state changed. Every claim cites its evidence or is labelled ASSUMPTION / UNKNOWN / OPEN / CHALLENGED.*
