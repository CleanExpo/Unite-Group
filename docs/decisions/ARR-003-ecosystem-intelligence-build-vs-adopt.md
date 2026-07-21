# ARR-003 — Ecosystem Intelligence and Build-versus-Adopt

**Type:** Architecture Review Record (decision record — **not** a spec)
**Status:** **HOLD** — production status held until initial evaluations and ADRs exist
**Date:** 2026-07-17
**Author:** Founder (Phill McGurk), dictated; captured and evidence-annotated by Claude Opus 4.8
**Follows:** [ARR-001](./ARR-001-nexus-engineering-baseline.md) · [ARR-002](./ARR-002-governance-and-engineering-foundations.md)

> Normative language per **RFC 2119** / **RFC 8174**.

---

## 1. Position — decided

**Nexus will not build by default.**

**Nexus MUST adopt or adapt first. Nexus MUST build only when evidence proves necessity.**

This is the operative form of EPIC-000 Principles 2 (*reuse before creating*) and 18 (*build only when
adoption or adaptation cannot satisfy the requirement*). Principle 19 binds equally: **internally
built capabilities MUST pass the same or higher standard as external ones**, and MUST NOT receive
preferential treatment because Nexus created them.

**Necessity MUST be proven, not asserted.** "We looked and found nothing" is a claim requiring the
same evidence as any other — and per ARR-002 §3, the **negative search result MUST be recorded**. An
unrecorded negative is how duplicate work looks novel.

---

## 2. Continuous Capability Intelligence Program

**MUST be continuous, not a one-time market scan** (EPIC-000 §4).

**Monitored surfaces:** GitHub · MCP servers · Hugging Face · OpenAI · Anthropic · Google · Mistral ·
Meta · open standards bodies.

**Why continuous is load-bearing, with evidence from this session:** a point-in-time scan rots
measurably fast in this estate. A five-day-old session handoff was **116 commits** stale and asserted
"nothing in flight" while six tickets were In Progress. Estate memory recorded a PR as unmerged that
had been squash-merged. `.harness/learning/` has been **56 days stale** since creation. **A scan is an
artefact with a half-life; the program is the thing that keeps it true.**

---

## 3. Scorecard

Every candidate MUST receive a scorecard with **traceable evidence per dimension**. Scores do not
replace judgement — **they make judgement inspectable** (EPIC-000 §7).

**Dimensions named in this block (8):** maturity · licence · security posture · test coverage · API
stability · documentation · cost · sustainability.

### 3.1 OPEN — scorecard scope requires a founder ruling

**EPIC-000 §7 specifies 20 dimensions.** This block names **8**. The 8 are a strict subset — but the
12 not carried forward include several that the evidence in ARR-001/002 suggests are load-bearing here:

| §7 dimension omitted from the 8 | Why its absence matters, given current findings |
|---|---|
| **Constitutional fit** | The only dimension testing whether a candidate supports explicit state transitions, evidence capture, independent challenge, approval boundaries, human authority, verification, and auditability. Without it, a technically excellent capability that cannot be governed scores well. |
| **Lock-in risk** | ARR-001 §5.1 declares reversibility an assumption-driven requirement. Nothing else measures it. |
| **Confidence** | Strength, freshness, independence, completeness of evidence. Without it a stale score and a fresh score are indistinguishable — the precise failure this estate keeps hitting. |
| **Supply-chain integrity** | §6 Stage 12 mandates an SBOM and transitive-dependency review; no listed dimension records the result. |
| **Interoperability**, **Data governance**, **Vendor risk**, **Performance**, **Operational maturity**, **Maintainability**, **Community health**, **Learning value**, **Architecture quality**, **Functional fit**, **Integration effort** | Not assessed against current evidence; listed for completeness of the diff. |

**Ruling required:** are the 8 an **operational minimum** (with §7's 20 remaining binding for material
candidates), or a **replacement** for §7? **Recorded as OPEN. Not silently resolved.** If a
replacement, §7 MUST be amended — a constitution and its operative scorecard disagreeing is exactly
the drift these records exist to prevent.

---

## 4. Dispositions

**This block: adopt · adapt · observe · reject — four.**

### 4.1 BLOCKER/OPEN — there are now three incompatible disposition sets

**FACT.** Three authorities, three answers:

| Source | Dispositions | Count |
|---|---|---|
| **EPIC-000 §8** (binding constitution) | adopt · adapt · **trial** · observe · reject | **5** |
| **This block (ARR-003)** | adopt · adapt · observe · reject | **4** |
| **`cc_decisions.verdict` CHECK** (the schema that must store it) | `APPROVED` · `HOLD` · `REJECTED` | **3** |

Verified by direct read: `20260604010000_cc_command_centre_phase2.sql:94` —
`CHECK (verdict IN ('APPROVED', 'HOLD', 'REJECTED'))`.

**"Trial" has been dropped between the constitution and this block.** EPIC-000 §8 defines it as *"a
time-bounded, isolated pilot because evidence is promising but incomplete."*

**Why its loss is material, specifically now.** Nexus's defining condition today is **incomplete
evidence**: the registry is empty, the evidence board has no substrate, and no build-versus-adopt
assessment has ever been recorded. *Trial* is the only disposition designed for exactly that state —
it lets evidence accumulate under a time bound without committing. **Removing it forces every
evidence-thin candidate into a premature adopt or reject.** Given Principle 5 (*evidence before
opinion*), a four-way set with no pilot lane pressures the Board toward opinion in precisely the cases
where evidence is weakest.

**It also strands Kimi K3.** §5 holds it as an *experimental-tier candidate*. **"Experimental
candidate" is not one of the four.** It maps naturally to *trial* and to nothing else — *observe*
means "do not integrate yet," which is not what an experimental tier is.

**Ruling required.** Options: (a) restore *trial*, making it 5 and matching §8; (b) amend §8 to 4 and
record that experimental-tier candidates live under *observe*; (c) confirm *trial* is intentionally
retired and state where experimental candidates sit. **Recorded as OPEN.**

**Regardless of the ruling, the schema blocks all three options.** `cc_decisions` stores 3 values and
maps cleanly to neither 4 nor 5. Remediation needs a migration, and that migration joins a
**founder-gated queue** behind `cc_agent_events` and `cc_tasks_claim`, which remain repo-only against
prod head `20260714023022`. **This is on the critical path for items 3 and 4 of ARR-002.**

---

## 5. Models are capabilities, not foundations

**Models — including Kimi K3 — MUST be treated as interchangeable capabilities, not foundations.**

This follows Principle 3 (*capability before model*) and ARR-001 §5.1 (*AI capabilities will evolve*).
A model that becomes structurally load-bearing has become a foundation by accident, and Lock-in risk
(§3.1) is the dimension that would have caught it — currently omitted.

**Kimi K3 — UNKNOWN, and stated as such.** No verified knowledge of this model is available to this
record's author; it is absent from training data and from estate memory. **No evidence record exists.**
It is therefore correctly held as an experimental-tier candidate and MUST NOT be foundation-bearing —
not because it is judged inadequate, but because **it has not been judged at all.** It SHOULD be the
Evidence Board's first genuine exercise. (Distinct from `kimi-k2.6`, recorded as the live Hermes brain
via OpenRouter.)

---

## 6. Learning loop

Nexus MUST learn from its own outcomes, feeding results back into the registry: which discovery
sources yield reliable candidates; which scorecard dimensions predict real production outcomes; where
humans overrode the automated evaluation; which adopted capabilities failed under operational load;
which internal builds outperformed adopted alternatives.

**Bounded by ARR-002 §1.1 and EPIC-000 §11 — restated because it is the guardrail that matters:**
learning MAY alter search order, ranking, model selection, test depth, risk classification, and
confidence. **Learning MUST NOT alter constitutional principles, human authority, approval
requirements, security boundaries, Board decision rights, or evidence requirements.**

**Substrate status — FACT.** The loop has nowhere to write. `.harness/learning/` is **5-of-5 0-byte
files, 56 days stale**, hooks *"shipping separately"* and never shipped. **`.harness/swarm/swarm.jsonl`
does not exist** while the registered `audit-emit` skill asserts it does. `cc_evidence_records` — **0
rows**. **The learning loop is a build, not a configuration.**

**And it is circular until the registry is populated:** learning feeds the registry; the registry is
the substrate reuse depends on; reuse is currently inverted by the registry's emptiness (ARR-001 §3.1).
**Population breaks the cycle. Nothing else does.**

---

## 7. Live proof of this block's thesis — found today, before any external scan

The strongest available evidence that adopt-or-adapt-first is correct **is not theoretical**. A
read-only recon of the Disaster Recovery Linear work, run today, found the estate had **already
specified** a near-identical capability to one being freshly framed:

- **`Nexus Concierge OS`** (Unite-Group team, project `1b1e85d1-2a4c-42d7-81b5-28eeb87211af`) is
  described verbatim as the *"parent architecture project for the reusable AI concierge, SRT, consent,
  referral, handoff, follow-up, and revenue-attribution engine across Lodgey, RestoreAssist, trades,
  CARSI, CCW, DR-NRPG, and Duncan products."* Its core pattern: **"Customer intent → intake →
  structured case → SRT → consent → provider match → handoff → follow-up → outcome →
  revenue/value attribution → nurture."** Phase 1 is **100% complete** (UNI-2170, 2026-07-01). It
  explicitly names DR-NRPG as a planned vertical, and states the boundary: ***"No vertical should own
  the whole concept."***
- **DR-854** is the already-filed, unbuilt DR-specific stub for exactly this, labelled
  `nexus-concierge-os` / `vertical-pack`.
- **DR-627** — a real contractor-matching engine (postcode/service-mix scoring, SLA tiers,
  escalation) — is **already built and shipped** (Done, PR #79).
- **DR-173** proposed substantially the same thing six months ago and was **killed as a Duplicate**.

**A registry search would have surfaced all four in seconds. There is no registry, so it took a
49-tool-call agent sweep to find them** — which is Stage 3's inversion (ARR-001 §3.1) demonstrated
at full cost, on live work, today. **This is the single best argument in these records for
Foundation 1**, and it was produced by the estate's own board rather than by argument.

---

## 8. Production status — **HOLD**

**Held until initial evaluations and ADRs exist.**

| Condition | State | Evidence |
|---|---|---|
| Initial evaluations recorded | **None. Zero build-vs-adopt assessments have ever been recorded.** | Specs scan |
| ADRs exist | **ARR-001/002/003 established today. 1 pre-existing, unrelated.** | ARR-002 §5.1 |
| Scorecard versioned + operational | **Not built; scope OPEN (§3.1)** | — |
| Disposition set agreed | **OPEN — three incompatible sets (§4.1)** | — |
| Registry populated | **0 rows** | ARR-001 §3.1 |
| Evidence board operational | **No substrate** | §6 |

**Carried forward, still requiring founder ruling** (ARR-001 §7.2, ARR-002 §7): the **66 canonical
defects** have no disposition ledger and a **62/100 NOT-READY** stands; **track proliferation** remains
unresolved, with UNI-2409 In Progress building the same enforcement point Atlas is chartered to map.

---

## 9. Open items requiring founder ruling

| # | Item | Where |
|---|---|---|
| 1 | **Scorecard: 8 dimensions or §7's 20?** Constitutional fit, lock-in risk, confidence, supply-chain integrity currently omitted | §3.1 |
| 2 | **Dispositions: 4, 5, or 3?** "Trial" dropped; schema stores neither; Kimi K3's experimental tier maps to nothing | §4.1 |
| 3 | **SPM placement** — constitutional, ACP, or Executive? | ARR-002 §1.2 |
| 4 | **66 defects** — disposition ledger | ARR-001 §7.2 |
| 5 | **Track proliferation** — Atlas vs MC-P1 vs UNI-2379 | ARR-001 §7.2 |
| 6 | **`cc_decisions` migration** — founder-gated, on the critical path | §4.1 |

---

## 10. Revisit conditions

1. §8 conditions met → go/no-go on EPIC-001.
2. Any §9 item ruled → this record updated or superseded.
3. An adopted capability fails under operational load → its evaluation record and the scorecard
   dimension that missed it are both revisited (§6).
4. The supporting review is independently challenged and its findings do not survive.

**This record and its supporting review remain UNCHALLENGED** — single Claude model; self-review
prohibited by ARR-001 §6.4 and EPIC-000 §12/§18. **§4 of EPIC-000's own §16 directive — the ranked
ecosystem report — is NOT delivered by this record.** It requires external retrieval across the
surfaces named in §2 and was scoped rather than fabricated. **Route to an independent non-Claude
reviewer before acting.**

---

*Filed 2026-07-17. Status HOLD. No code written. No state changed. Every claim cites its evidence or
is labelled ASSUMPTION / UNKNOWN / OPEN.*
