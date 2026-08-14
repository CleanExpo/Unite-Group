# Agent Harness — Multi-Agent Convergence Protocol

> **Purpose**: Coordinate complex cross-domain engineering while preserving one mission owner, independent verification and evidence-backed lifecycle state.
> **Authority**: The Harness may build and verify within the active `/spm` execution lease. It does not grant merge/deploy/business authority.

## When to use

Use the Harness for work that genuinely needs multiple specialist domains or coordinated parallel tracks. Use the simpler builder/minion path for bounded single-domain work.

Do not invoke multiple agents merely to make a task look more sophisticated.

---

## Phase 1 — Mission intake

Resolve the existing `/spm` mission first.

Required:
- mission ID and current lifecycle state;
- intended outcome and measurable success;
- active execution lease/authority boundary;
- current canonical context/evidence;
- known blockers/dependencies.

If the mission is already BUILD_AUTHORISED, do not restart a planning interview.

---

## Phase 2 — Bounded discovery

Search/reuse before creating:
- current implementation and tests;
- relevant active decisions/contracts;
- existing skills/capabilities;
- current runtime evidence where applicable.

Load only the context each specialist needs. Superseded/legacy context is excluded unless history is explicitly required.

---

## Phase 3 — Decomposition

Break work into independently ownable packets.

Rules:
- one owner per packet;
- explicit dependencies/critical path;
- parallelise only truly independent work;
- every packet has success criteria, allowed paths, prohibited paths and required evidence;
- the SPM/harness retains outcome ownership across packet boundaries.

---

## Phase 4 — Execution

Each worker receives a typed manifest containing at minimum:

```json
{
  "mission_id": "...",
  "attempt_id": "...",
  "agent": "...",
  "task": "...",
  "files": {
    "must_read": [],
    "allowed_write": [],
    "must_not_touch": []
  },
  "constraints": [],
  "success_criteria": [],
  "required_evidence": [],
  "candidate_base_sha": "..."
}
```

Workers return changed paths, candidate SHA/diff summary, verification evidence and unresolved risk—not a prose claim of completion.

Current design/schema/runtime facts must be read from current canonical sources rather than hard-coded historical assumptions in the manifest.

---

## Phase 5 — Aggregation

Before verification:
- resolve overlapping edits/conflicts;
- confirm every packet returned evidence or a truthful failure;
- review integrated diff against the mission scope;
- ensure no unauthorised scope expansion/dependency/configuration mutation occurred;
- freeze the candidate for independent review.

---

## Phase 6 — Independent verification

The final verifier must not be the builder of the candidate.

Apply the verification contract appropriate to the change:
- lint/type/tests/build;
- integration/data/security gates;
- Playwright and visual evidence for user-facing work;
- environment/release checks where applicable.

Deterministic failure outranks model judgement.

Failure routes to technical repair, not immediately to the founder.

---

## Phase 7 — Bounded repair and technical escalation

Use bounded repair cycles to prevent infinite loops, but **iteration exhaustion is not automatically a founder escalation**.

After the normal repair budget is exhausted, route through an appropriate technical escalation ladder, for example:
1. fresh diagnostic pass on the exact evidence;
2. alternate model family / specialist reviewer;
3. fresh worktree/environment or dependency/state reproduction;
4. architecture/security/database specialist as relevant;
5. CI/log/browser/Computer Use investigation;
6. SPM re-plan of the blocked technical packet while keeping independent lanes moving.

Escalate to Phill only when the remaining question is a genuine business decision, consequential authority decision, risk-appetite choice, or an irreducible blocker whose options are clearly stated.

A technical stack trace by itself is not a founder decision packet.

---

## Phase 8 — Candidate closeout / release-ready handoff

**This phase is not Production. A PR is not Production.**

For engineering work, close out the Harness by recording the strongest state actually earned, such as:
- `LOCALLY_VERIFIED`
- `PR_OPEN`
- `REVIEWING`
- `CI_GREEN`
- `STAGING_VERIFIED`
- `RELEASE_READY`

Required closeout:
- candidate SHA and branch/PR;
- verification receipts;
- independent-review state;
- visual/integration evidence where applicable;
- remaining blocker or next lifecycle transition;
- mission evidence written to the authoritative ledger/projection path.

Output:

```text
HARNESS RESULT
mission: [id]
candidate: [sha/pr]
agents_used: [...]
verification: [evidence refs]
EARNED STATE: [state]
blocker: none | [...]
next executable move: [...]
founder decision: none | [genuine decision]
```

Do not output `HARNESS COMPLETE` unless the `/spm` mission itself has earned `COMPLETE` through the full completion contract.

---

## Production / shipping boundary

Production action is a separate `/spm ship` / release-controller transition and must use the current authority contract. Harness verification may make a candidate `RELEASE_READY`; it does not make the Harness an approver or deployment executor.

After an authorised release, post-deploy/customer-path evidence is required before mission `COMPLETE`.

---

## Key invariants

1. No final self-verification.
2. One mission owner survives all specialist handoffs.
3. Planning does not silently replace BUILD after BUILD_AUTHORISED.
4. Bounded retries prevent loops; technical rerouting occurs before founder escalation.
5. PR/green CI are intermediate states, never synonyms for Production or Complete.
6. Current canonical evidence outranks stale memory.
7. User-facing verification is system-owned through Playwright/visual tooling by default.
8. Every claim carries evidence and an earned lifecycle state.

## Cross-references

- `/spm`: `.claude/commands/spm.md`
- Simple bounded execution: `.claude/commands/minion.md`
- Orchestrator: `.claude/agents/orchestrator/agent.md`
- Verification: `.claude/agents/verification/agent.md`
- Completion gate: `.claude/commands/done.md`
- Verification ownership: `.claude/rules/verification-gate.md`
