# ARR-008 — Evolution Control, Constitutional Continuity, Foresight, and Memory Lifecycle

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **APPROVED — permanent constitutional layer.** Binding; **not yet operational** (§9).
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-007](./ARR-007-organisational-knowledge-and-doctrine.md) — ARR-007 governs knowledge and doctrine; this governs **how doctrine changes, and how it survives.**
**Governs:** [EPIC-000](../constitution/EPIC-000-nexus-engineering-constitution.md) — §1 below is the amendment mechanism for the constitution itself.

> Normative language per **RFC 2119** / **RFC 8174**.

---

## 1. Evolution control — doctrine changes only by evidence

**Doctrine evolves only through evidence-backed, versioned proposals. Silent changes are prohibited.**

**MUST:** every doctrine change carries evidence (ARR-006 §3), a version, an author, a date, and a
rationale — recorded in EPIC-000's **Amendments** table or a superseding ARR.

**MUST NOT:** any change by edit-in-place, by convention, by a later block silently contradicting an
earlier one, or by an agent's learning loop (ARR-002 §1.1 / EPIC-000 §11).

### 1.1 "Silent change" is the failure this estate produces most, and it has three live instances

**FACT — silent contradiction is already happening, in this series, today:**
- **Dispositions:** EPIC-000 §8 says **five**; ARR-003's block says **four** ("trial" dropped);
  `cc_decisions` CHECK stores **three**. Nobody amended anything. **Three authorities, three answers,
  no amendment record.**
- **Scorecard:** EPIC-000 §7 specifies **20** dimensions; ARR-003's block names **8**.
- **Confidence:** EPIC-000 §7 and ARR-006 §4 define the same word with only **one** criterion in common.

**These are now recorded as open conflicts in EPIC-000's Amendments section rather than left to drift.
That recording IS this clause working.** Without it, the later block silently wins by recency — and
"trial" disappears from the constitution without anyone deciding to remove it.

**FACT — silent loss has already destroyed rationale.** `20260604000000_cc_command_centre.sql:3-4`
cites `NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md §6` and `NEXUS_BUILD_QUEUE_PLAN.md CC-03`. **Neither
exists.** Nobody decided to delete them. The registry, the Board's decision table, and the autonomy
model now rest on unreachable reasoning. **That is what silent change looks like eighteen months on.**

**FACT — and this record was itself an instance, caught in the act.** EPIC-000 was filed at 10:3x with
a cross-reference to this document, which did not exist for several minutes. **A dangling citation in
the constitution, created by the author of the rule forbidding it.** Recorded rather than quietly
fixed, because §2 requires it.

---

## 2. Decision integrity and transparency

**Significant decisions, authorities, exceptions, and outcomes remain observable and explainable.**

**Trust is evidenced.**

| Element | Requirement | State |
|---|---|---|
| **Decisions** | Recorded with options, evidence, rationale (ARR-007 §6) | `cc_decisions` **0 rows**; **3 of 5 dispositions unstorable** |
| **Authorities** | Who may decide what, explicit per layer (ARR-002 §1.1) | Schema exists (`autonomy_max_level` 0–5); **zero application call sites** |
| **Exceptions** | An exception is a **recorded decision**, never a quiet bypass | **UNI-2417 shipped today** closing two *"sibling promotion paths"* that bypassed `isLegalTransition` — **undocumented exceptions existed in code until 08:41 today** |
| **Outcomes** | Captured and fed back (ARR-007 §7) | `.harness/learning/` **5-of-5 empty, 56 days stale** |

**"Trust is evidenced" is the sharpest clause in this record, and it inverts the estate's default.**
Trust is not granted by seniority, by assertion, or by a green tick. **A claim without evidence is
untrusted regardless of who made it** — including the founder, including this record, including any
model.

**The canonical violation:** `scripts/nexus-runner`'s *"2026-07-16: runner armed in prod and
demo-proven"* — **a one-line README commit**, no code change, no test, no CI artifact, no
`cc_agent_events` export — **contradicted by the same day's handoff** listing arming as still-open.
**That claim asked for trust and offered none.**

**The canonical compliance:** `apps/autopilot-runner`, whose entrypoint is a refusal tombstone and
whose **build fails** if any of ~30 retired paths is restored. **It proves non-execution in code rather
than asserting it.** Generalise this.

---

## 3. Inheritance before action

**Every new participant — human or AI — inherits the doctrine, vocabulary, governance, and reasoning
BEFORE acting.**

**"Before acting" strengthens ARR-007 §5 materially, and makes it testable.** Inheritance is not a
resource a participant may consult. **It is a precondition of action.** A participant that has not
inherited **MUST NOT act** — and MUST fail loudly rather than proceed.

### 3.1 ⚠ CHALLENGE — carried from ARR-007 §5.1, unchanged and now sharper

**Nothing inherits today, and nothing blocks action on failure to inherit.**

`~/.claude/hooks/` and `settings.json` are **gitignored — they do not propagate**. `bootstrap.sh` wires
**1 of 3** installers and swallows failure into a `note:` echo. `brain.js`/`_system` are absent, so
`CLAUDE.md` §6 recall **cannot run on this machine**. **47 of 291 skills are uncatalogued — including
`proof-discipline` and `goal-circuit-breaker`, the guards enforcing this doctrine.** Four symlinks are
broken.

**Every one of those failures is silent.** A fresh machine, a new agent, or Rana would act **without
doctrine**, and **nothing would stop them or say so.**

**Under §3, that is now a constitutional violation, not merely a gap.** "Inherits before acting" is
**operationally false**, and making it true requires a **blocking** mechanism — not documentation.

**Vocabulary inherits worst of all:** "Atlas" is both an agent persona and the access control plane;
"Nexus 2.0" names two different systems; "control plane" names two scopes. **A participant inheriting
this vocabulary inherits ambiguity** — and ambiguous names defeat registry lookup, proven live by
`chrome` vs `claude-in-chrome`.

---

## 4. Preparation continuous, execution gated

**Preparation is continuous. Execution stays gated. Constitutional integrity remains intact.**

Restated from ARR-007 §2 and **not re-derived here**. The loop MAY sense, research, prepare, and
surface gaps. It **halts at governance and approval boundaries**. **Human judgement remains
sovereign.**

**Open, carried from ARR-007 §2.1:** *"always on"* remains **unbounded**. The kill switch
(`~/.claude/HARD_STOP`) **exists nowhere on this machine — the gate has never fired here.** Spend and
rate bounds are unstated. **Ruling required.**

---

## 5. Continuity across time, teams, and model changes

**Nexus is designed to survive across time, teams, and model changes — preserving reasoning and intent,
not just data.**

**"Reasoning and intent, not just data" is the whole distinction.** EPIC-000 §5.12 requires the same:
*"the graph must preserve why a decision was made, not merely what was selected."*

**Data survives. Reasoning is what evaporates**, and the estate has proof: the `cc_*` schema's data is
intact and its reasoning is gone (§1.1). **Rows without rationale are not continuity.**

**Model changes — a live constraint, not hypothetical.** ARR-003 §5 holds models as interchangeable
capabilities, not foundations. This record is authored by one model, on a knowledge cutoff, with no
verified knowledge of Kimi K3. **If reasoning lives in a model's context, a model change is an
extinction event.** Filing to disk is the mitigation.

### 5.1 ⚠ The continuity test is failing NOW, at five days

**The test is not whether documents exist. It is whether a cold start reaches the same understanding
without the session that produced it.**

**FACT — this session is the failed test.** Resuming from the estate's own handoff produced a picture
**116 commits stale**, asserting *"nothing in flight"* while six tickets were In Progress, on a branch
whose work had been squash-merged five days earlier. **The pause was five days. Not months.**

**A framework promising survival across time, teams, and model changes MUST first survive a working
week.** Until a cold start is positive-controlled, §5 is aspiration.

---

## 6. Foresight

**Foresight is continuous — evaluating future risks, opportunities, and dependencies, within
governance.**

**Bounded by ARR-007 §2:** foresight is a **prepare** activity. It MAY surface a future risk and cost
options. It **MUST NOT** pre-emptively remediate. **Foresight that acts is not foresight; it is
ungated execution with a justification.**

**Foresight has an evidence problem that MUST be stated:** predictions are **unfalsifiable until their
horizon arrives**. Per ARR-006 §4, confidence MUST be computed from stated inputs. **A foresight record
MUST therefore carry its falsifier and its horizon**, or it is opinion with a date on it. When the
horizon arrives, the prediction MUST be scored — that scoring is the only thing that makes foresight an
evidence discipline rather than a forecast column.

**Dependency foresight is immediately actionable and currently unmeasured:** Lock-in risk is one of the
12 EPIC-000 §7 dimensions **omitted** from ARR-003's 8-dimension scorecard. **The estate's single named
dependency risk has no measure.**

---

## 7. Curated memory

**Organisational memory is curated as a strategic asset, not a byproduct.**

**"Not a byproduct" is a direct indictment of what exists.** `.harness/learning/` was *designed* as a
byproduct — capture hooks appending automatically, *"shipping separately"*. **They never shipped. Five
0-byte files, 56 days stale.** A byproduct nobody curated produced nothing. **`.harness/swarm/swarm.jsonl`
does not exist** while the registered `audit-emit` skill asserts it does.

**Curated means:** an owner, a review cadence, explicit retention, and **explicit, recorded discard**
(ARR-006 §6). **Evidence MUST NOT be silently discarded** — and per §1, neither MUST doctrine.

**REUSE — curation already has its asset.** `wiki_pages` (**681 rows**) + `wiki-graph.ts`, which is
pure, tested, and built on exactly the right doctrine: ***"unresolved links dropped — never
fabricated."*** **It refuses to invent an edge it cannot resolve.** That is curation as an engineering
property, and it is the best asset in the estate.

**Its gap is the one that matters:** *"the Wiki has no reader."* **A curated asset nobody reads is a
byproduct with better manners.**

---

## 8. Continuous mission advancement

**Nexus maintains continuous mission advancement, preparing what's next within constitutional
boundaries — so that momentum never relies on ad hoc prompting.**

### 8.1 ⚠ This clause indicts the session that produced it. Recorded, not softened.

**FACT.** ARR-001 through ARR-008, EPIC-000's landing, the strategic architecture review, and DR-938
were **all produced by ad hoc prompting** — a human pasting blocks into a chat window, one at a time,
across a single session. **Momentum was 100% human-supplied.**

**Nothing in this estate would have produced any of it unprompted**, and nothing will continue it when
the session ends:
- The runner is **not armed on this machine** (no `zsh`, no `tmux`, no env file, no `HARD_STOP`).
- The two `nexus-official-docs` cron workflows have **never once fired on their schedule** — every
  historical run was manual or accidental.
- `.harness/learning/` has captured **nothing in 56 days**.
- **Zero of six** governance mechanisms are live.

**§8 is therefore the furthest of any clause in this series from operational.** It is also the one that
matters most, because **every other clause was delivered by the mechanism §8 says must not be relied
upon.**

**The honest read:** this session is **evidence for §8's necessity, not evidence of §8's existence.**
The doctrine is now excellent. **The momentum is a human pasting blocks.** When the pasting stops, the
advancement stops — and per §5.1, five days later the next session will resume from a stale handoff and
rediscover what today already knew.

---

## 9. Exit criteria

| # | Criterion | State |
|---|---|---|
| 1 | Amendment mechanism operational; **no silent change** | **PARTIAL** — EPIC-000 Amendments table exists (today); **3 unresolved conflicts already logged** |
| 2 | Decisions/authorities/exceptions/outcomes observable | **NOT MET** — `cc_decisions` 0 rows; authority unenforced; outcomes uncaptured |
| 3 | **Inheritance blocks action on failure** | **NOT MET** — fails silently; nothing blocks |
| 4 | Preparation bounded + kill switch proven | **NOT MET** — `HARD_STOP` never fired here; no spend bound |
| 5 | **Cold-start continuity proven** | **NOT MET — actively failing at 5 days** (§5.1) |
| 6 | Foresight records carry falsifier + horizon, scored on arrival | **NOT MET** — no mechanism |
| 7 | Memory curated: owner, cadence, explicit discard | **NOT MET** — `.harness` 56 days stale; wiki has no reader |
| 8 | **Momentum independent of ad hoc prompting** | **NOT MET — 0%** (§8.1) |

**0 of 8 met, 1 partial. Approved and binding; not operational.**

---

## 10. Open items

| # | Item | Where |
|---|---|---|
| 1 | **3 unresolved constitutional conflicts** logged in EPIC-000 Amendments — dispositions (5/4/3), scorecard (20/8), confidence (2 defs) | §1.1 |
| 2 | **Inheritance does not block action** — requires a blocking mechanism, not documentation | §3.1 |
| 3 | **"Always on" unbounded**; `HARD_STOP` never fired here | §4 |
| 4 | **Cold-start continuity unproven** — the single test that matters | §5.1 |
| 5 | **Lock-in risk unmeasured** — omitted from the 8-dimension scorecard | §6 |
| 6 | **Wiki has no reader** — 681 rows, unread | §7 |
| 7 | **Momentum is 100% human-supplied** | §8.1 |

---

## 11. Revisit conditions

1. §9's eight criteria met → **approved** becomes **operational**.
2. **A cold start is proven to inherit and act correctly** — positive-controlled → §3.1 and §5.1
   withdrawn. **This is the single test that matters.**
3. Any §10 item ruled → updated or superseded, **never silently edited** (§1).
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by ARR-006 §4, ARR-001 §6.4, and EPIC-000 §12/§18.

---

*Filed 2026-07-17. Status APPROVED — constitutional. Not yet operational (§9). No code written. No
state changed. Every claim cites its evidence or is labelled ASSUMPTION / UNKNOWN / OPEN / CHALLENGED.*
