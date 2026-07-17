# CONSTITUTIONAL OPERATIONS — v0.1

**Status:** **LOCKED — v0.1. Operations layer complete.**
**Locked:** 2026-07-17 · **Author:** Phill McGurk (founder) · Filed verbatim by Claude Opus 4.8
**Derives from:** [Constitutional Foundation v0.1](./CONSTITUTIONAL-FOUNDATION-v0.1.md) — the highest governing authority
**Governs:** [EPIC-000](./EPIC-000-nexus-engineering-constitution.md) and the [ARR series](../decisions/)

> **Purpose of this layer: decision rights, amendment process, and validation cycles.**
>
> **The constitution is an operating system, not a document.**

---

## 1. Decision rights — three layers of authority

| Layer | May | May NOT |
|---|---|---|
| **Constitutional Guardian** | **Protects the founder's philosophy and core principles.** **May PAUSE unconstitutional moves.** | **Not operational.** Does not build, decide strategy, or run work. |
| **Governance Council** | **Interprets the constitution. Arbitrates grey zones. Approves amendments within delegated thresholds.** | Amend beyond its delegated threshold. |
| **Operational agents** | **Execute doctrine. May propose, with evidence.** | **Cannot self-authorise.** |

**"Cannot self-authorise" is the load-bearing clause**, and it is the same rule the estate has already
written three times from different directions: *no capability approves its own adoption* (EPIC-000
§10); *no reviewer validates its own review* (ARR-001 §6.4); *confidence MUST NOT be computed by the
party that produced it* (ARR-006 §4). **A grader under the control of the graded optimises itself.**

**The Guardian's pause is the first genuine enforcement point named anywhere in this constitution.**
Every other layer advises, interprets, or executes. **Only the Guardian can stop something.** See §8 —
it does not exist yet.

---

## 2. Decision flow

```
proposal → evidence → governance review → approval → decision log
```

**Evidence precedes review; review precedes approval; approval precedes the log — and nothing skips
forward.** A proposal without evidence does not reach review. An approval without a logged decision did
not happen.

---

## 3. Amendment classes

| Tier | Scope | Bar |
|---|---|---|
| **Tier 1** | **Philosophy and preamble** | **Nearly frozen.** |
| **Tier 2** | **Principles and success framework** | **High bar — evidence and cooling-off.** |
| **Tier 3** | **Doctrine and policy** | **Adaptive — scheduled review.** |

**Mapping to what now exists in the repo:**

| Tier | Artefact |
|---|---|
| **1** | `CONSTITUTIONAL-FOUNDATION-v0.1.md` — Preamble |
| **2** | `CONSTITUTIONAL-FOUNDATION-v0.1.md` — the seven First Principles; the *dependency-vs-capability* success measure |
| **3** | `EPIC-000`, `CONSTITUTIONAL-OPERATIONS` (this file), the ARR series |

**Consequence, stated because it binds this session's own output:** the Foundation's four open questions
(principle-collision ordering; the founding claim's exemption from Principle 7) are **Tier 2** — they
require evidence and cooling-off, not a same-day answer. **Recording them as open was therefore correct,
not incomplete.**

---

## 4. Amendment standard

Every amendment MUST carry: **owner · rationale · evidence · alternatives · impact · decision ·
permanent log.**

**Silent edits are prohibited.**

**⚠ This ratifies a defect already logged against this session's own records.** ARR-006 §5.1 and ARR-007
§6 found that **ARR-001..008 record evidence, assumptions, consequences, and revisit conditions — but
largely do NOT record alternatives.** Under §4 that is now a **standard violation**, not a nice-to-have.
**Remediation is mandatory.**

**Why "alternatives" is the one that rots first:** an amendment without alternatives records **what** was
decided but not **that a choice existed**. `20260604000000_cc_command_centre.sql:3-4` cites two design
documents that **do not exist** — the schema underpinning the registry, the Board's decision table, and
the autonomy model now has **no reachable rationale**. Nobody can explain, review, or reverse it on its
stated grounds. **That is what an amendment without alternatives decays into in eighteen months.**

---

## 5. The Continuous Cognitive Loop is advisory only

**The loop scans and proposes. It CANNOT execute constitutional change. Material impacts trigger
governance.**

Consistent with ARR-007 §2 — *sense · research · prepare · surface gaps*, halting at governance
boundaries, **"prepare, do not select."** **Human judgement remains sovereign.**

**⚠ Open, carried from ARR-007 §2.1 and unresolved here:** the loop is *"always on, but always
bounded"* — **bounded by what?** Its kill switch (`~/.claude/HARD_STOP`) **does not exist on this
machine; the gate has never fired here.** No spend or rate bound is stated, above **40 Vercel cron
entries** whose live execution is **UNKNOWN**. **An always-on loop whose stop mechanism has never been
fired is not bounded — it is merely not yet running.**

---

## 6. Review rhythm

**Monthly alignment check · annual review · strategic reflection every three to five years.**

### 6.1 ⚠ OPEN — this conflicts with a standing founder constraint

**FACT.** UNI-2433 (the Atlas map, founder-authored 2026-07-17) carries: ***"Standing constraint: no
calendar timeframes. State-based only — phases advance on completion."*** UNI-2434 restates it: *"each
state advances on completion, never on elapsed time."*

**§6 is calendar-based** (monthly / annual / 3–5 years), and **§3's Tier-2 "cooling-off" is an elapsed-time
gate.**

**These may both be right** — a *review cadence* is not a *phase gate*, and "advance only on completion"
does not forbid "re-examine on a clock." **But the distinction is not stated anywhere**, and the standing
constraint says *no calendar timeframes* without qualification.

**Ruling required:** does the standing constraint govern **phase advancement only** (leaving review
rhythm and cooling-off free to be time-based), or **all timeframes**? **Recorded, not silently
resolved** — ARR-008 §1.

**Note:** the standing constraint lives **only in Linear** (UNI-2433/2434 bodies). It is **not in the
repo** (grep-verified). By the Foundation's own evidence, a constraint that lives in one system and
binds another is the estate's dominant failure mode.

---

## 7. Registers maintained

**Decision · Evidence · Amendments · Governance reviews.**

| Register | Substrate | State |
|---|---|---|
| **Decision** | `cc_decisions` | **0 rows.** ⚠ **And it cannot store 3 of EPIC-000 §8's 5 dispositions** — `verdict CHECK IN ('APPROVED','HOLD','REJECTED')`; `adapt`, `trial`, `observe` would raise a constraint violation. **Stage 19 is unrecordable in the schema that exists.** |
| **Evidence** | `cc_evidence_records` | **0 rows.** Exists, append-only, RLS-enforced — **and is live code** (`tasks.ts:86-96`, `:349-355`), so `kind`/`confidence` are an existing consumer contract. Extension design: ARR-009 §3. |
| **Amendments** | `CONSTITUTIONAL-FOUNDATION-v0.1.md` · `EPIC-000` Amendments table · this file | **✅ EXISTS — the only register that does.** Created 2026-07-17. Already carrying **7 open constitutional conflicts**. |
| **Governance reviews** | — | **Does not exist.** No substrate, no artefact, no cadence mechanism. |

**One of four registers exists. It was created today, and it is the one holding the record of the other
three not existing.**

---

## 8. Integrity stance

**Stable core. Adaptive edges. Every action traceable to principle.**

**The constitution is an operating system, not a document.**

### 8.1 ⚠ Today it is a document. Recorded at locking, not discovered later.

**An operating system enforces. A document asserts.** On the evidence, this constitution currently
asserts:

- **Zero of six governance mechanisms are live** (ARR-004 §5): intent validation, registry search,
  evidence review, human approval, verification, learning. One — human approval at the tool-call
  boundary — is **partial and being built on a different track (UNI-2409)** than the one commissioning
  it.
- **The Guardian's pause — the only enforcement point in §1 — does not exist.** No code, no role, no
  mechanism.
- **The autonomy check does not exist**: `cc_agents.autonomy_max_level >= cc_tools.required_level` has
  **zero application call sites**; `autonomy_max_level` appears in exactly one file estate-wide, the
  generated types.
- **"Every action traceable to principle" is currently false in the other direction too**: the
  `cc_command_centre` schema's own rationale is **unreachable** (§4).
- **Doctrine does not inherit** (ARR-007 §5.1) — gitignored paths, `bootstrap.sh` wiring 1 of 3
  installers and swallowing failure into an echo, **47 of 291 skills uncatalogued including the guards
  that enforce this doctrine**. A fresh machine inherits **nothing, silently**.

**UNI-2420's fog section reached the same conclusion independently: *"Convention is what failed."***

**The estate's one working counter-example is the pattern to generalise:** `apps/autopilot-runner`'s
entrypoint is a **refusal tombstone**, and its **build fails** if any of ~30 retired paths is restored.
**It proves non-execution in code rather than asserting it in a README.** That is an operating system.
The rest is a document.

**This is not an argument against §8. It is §8's own gap analysis, recorded on the day §8 was locked** —
because per the Foundation, *a test only cited when it passes is not a test.*

---

## 9. ⚠ Governance model — THREE now live, unreconciled

**This is the sharpest conflict this layer introduces, and it requires a ruling before §1 can operate.**

| Source | Model |
|---|---|
| **EPIC-000 §12** | **Board** (final authority) · **Margo** (executive, Telegram) · **Senior Project Manager** (*"constitutional"*) · Engineering Review Capability · Independent Challenger · Judge · Nexus |
| **ARR-002 §1.1** | Constitution → **Board** → **Executive** → Adaptive Control Plane → Execution |
| **This file §1** | **Constitutional Guardian** → **Governance Council** → **Operational agents** |

**Unanswered:**
1. **Is the Governance Council the Board, renamed — or a new body above/beside it?** EPIC-000 §12 gives
   the Board *"final decision authority."* §1 gives the Council *"approves amendments within delegated
   thresholds"* — **delegated by whom?**
2. **Where does the Constitutional Guardian sit relative to the Board?** It *"may pause"* — **can it
   pause the Board?** If yes, the Board is not final. If no, the Guardian cannot protect the philosophy
   from its highest authority.
3. **Where do Margo, the SPM, the Independent Challenger, and the Judge sit** in a three-layer model?
   The SPM is *"constitutional"* per EPIC-000 §12 — is it the Guardian?
4. **Is "Executive" (ARR-002 §1.1) the same as Margo?** And does it survive this model at all?

**Ruling required.** **Three governance models that cannot see each other is the same defect as the
three governance tracks** (Atlas / MC-P1 / UNI-2379) — one level up, and now constitutional.

---

## 10. Amendments

Per **ARR-008 §1** and **§4 above**: evidence-backed, versioned, permanently logged. **Silent edits
prohibited.**

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-07-17 | **v0.1** | Locked. Decision rights, decision flow, amendment classes and standard, loop boundary, review rhythm, registers, integrity stance. Filed verbatim — no textual change to the founder's text. | Phill McGurk |

### Open questions — recorded, not resolved

| # | Question | Where |
|---|---|---|
| 1 | **Three governance models live and unreconciled.** Is the Council the Board? Can the Guardian pause the Board? Where are Margo/SPM/Challenger/Judge? | §9 |
| 2 | **Calendar rhythm vs the standing "no calendar timeframes" constraint.** Phase advancement only, or all timeframes? | §6.1 |
| 3 | **The loop is "always on, but always bounded" — bounded by what, enforced where?** `HARD_STOP` has never fired on this machine. | §5 |
| 4 | **The Guardian's pause has no mechanism.** Code, role, or convention? *(Convention is what failed.)* | §8.1 |
| 5 | **`cc_decisions` cannot store 3 of 5 dispositions** — the Decision register cannot record the decisions this layer mandates. **Founder-gated migration, on the critical path.** | §7 |
| 6 | **The Governance-reviews register has no substrate.** | §7 |

**Seven further conflicts remain open in EPIC-000's Amendments table; four in the Foundation's; six in
UNI-2437.**

---

*Locked 2026-07-17 as v0.1. Operations layer complete. Filed as an artefact because a constitution that
lives only in a conversation is not an operating system — it is a memory, and this estate has evidence
about what happens to those.*
