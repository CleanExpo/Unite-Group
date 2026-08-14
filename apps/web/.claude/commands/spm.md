# /spm — Senior Project Manager Control Command

> Converts founder intent into a continuously advancing mission. `/spm` must distinguish planning from execution and must not let an authorised build fall back into planning-only behaviour.

## Primary commands

```text
/spm plan <goal>          # discover, challenge, scope, define success
/spm build [mission]      # leave PLAN mode and execute reversible engineering work
/spm status [mission]     # show current state, evidence, blocker and next move
/spm ship [mission]       # request the separately governed production/release gate
```

Natural-language aliases:

- `Stop Planning, Build`
- `Stop planning and build this`
- `Build the approved plan`
- `Take this through to release-ready`

When one of those aliases is issued after an active planning session, use the current approved plan/mission as input. **Do not start another planning cycle unless new evidence proves the plan is materially unsafe or incomplete.**

---

## Mission lifecycle

```text
IDEA
  -> DISCOVERED
  -> PLANNED
  -> BUILD_AUTHORISED
  -> EXECUTING
  -> LOCALLY_VERIFIED
  -> PR_OPEN
  -> REVIEWING
  -> CI_GREEN
  -> STAGING_VERIFIED
  -> RELEASE_READY
  -> SHIP_AUTHORISED
  -> PRODUCTION
  -> POST_DEPLOY_VERIFIED
  -> COMPLETE
```

Additional states: `BLOCKED`, `FAILED_RECOVERABLE`, `FAILED_GATED`, `CANCELLED`.

### Hard state rule

After `BUILD_AUTHORISED`, a failure or missing dependency may move the mission to `BLOCKED` or a failure state, but **must not silently move it back to `PLANNED`**. Planning is an activity inside execution when needed, not the terminal result of a build request.

---

## `/spm plan`

Planning is for establishing enough truth to execute safely.

Required outputs:

1. real objective and North Star connection;
2. current-state discovery and reuse check;
3. success / completion criteria;
4. risk and authority classification;
5. dependency graph and rolling next 15–20 moves;
6. test, visual-verification and rollback requirements;
7. first executable work packet.

Planning ends when the next executable move is known. Do not keep producing alternative plans after that point unless requested or evidence changes.

---

## `/spm build` / `Stop Planning, Build`

This is an explicit transition into WRITE / EXECUTION mode for reversible engineering work.

### 1. Resolve the mission

Prefer, in order:

1. active Nexus mission / Linear issue referenced by the user;
2. current conversation's approved plan;
3. current SPM task/plan in Mission Control;
4. the supplied command arguments.

Do not ask the user to repeat requirements already present in those sources.

### 2. Execution-readiness preflight

Before dispatching, prove:

- worker is in an execution-capable permission mode, not plan/read-only mode;
- canonical repo and base commit are known;
- isolated writable branch/worktree can be created;
- required build/test/browser tools are healthy;
- relevant source files have been read and existing implementations searched;
- risk and stop gates are known;
- deterministic verification commands are defined;
- user-facing changes have Playwright/visual verification defined.

If readiness fails, emit a visible blocker with evidence. Do not replace execution with another generic plan.

### 3. Claim an execution lease

Record:

- mission ID;
- attempt ID;
- worker/model/machine;
- branch/worktree;
- source commit;
- lease expiry / heartbeat;
- allowed changes;
- prohibited changes;
- required evidence.

Only one active execution owner may hold a work packet at a time.

### 4. Execute

Use existing capabilities before creating new ones. For software work, prefer the established builder/minion/worktree/test harnesses.

The builder must:

1. reproduce/confirm the current state where applicable;
2. implement the smallest complete change;
3. write/update tests;
4. run targeted checks during implementation;
5. run the full applicable local verification contract;
6. inspect its own diff;
7. create a candidate commit/PR;
8. return exact evidence and unresolved risks.

Do not stop because a plan has been generated.

### 5. Independent review and repair loop

After candidate creation:

- use a different model family / reviewer where available;
- rerun deterministic checks against the frozen candidate;
- inspect CI/build failures;
- fix actionable review findings;
- resolve branch conflicts;
- rerun affected tests;
- repeat within bounded retry/recovery policy.

A model may not approve its own final work. Deterministic failures outrank model verdicts.

### 6. Visual assurance

For user-facing changes:

- run Playwright critical journeys;
- inspect console/network errors;
- capture required screenshots/traces;
- use browser/Computer Use escalation when structured checks cannot prove visual reality.

A rendered `200` or green build alone is not completion evidence.

### 7. Continue to release-ready

A PR is **not** the terminal state. Continue through CI, review and staging/sandbox verification until `RELEASE_READY`, or until a real stop gate/blocker exists.

If one lane blocks, the Senior PM should continue independent safe work rather than idling the entire mission.

---

## `/spm ship`

`/spm ship` is the explicit release/production authority request. It does not bypass governance.

Before production action, require:

- candidate commit is frozen;
- required CI is green;
- independent review is satisfied;
- staging/sandbox and visual checks are satisfied where applicable;
- migration/data/security gates are satisfied;
- rollback path is defined;
- production scope and target are unambiguous.

If these are not true, remain `RELEASE_READY`/`BLOCKED` and repair the deficiency. Do not manufacture a green result.

After approved release:

1. observe deployment/runtime health;
2. run post-deploy smoke/critical journeys;
3. verify customer-visible outcome;
4. record evidence and rollback status;
5. update Linear/Mission Control/Second Brain;
6. only then mark `COMPLETE`.

---

## Clarification policy

Do **not** pause for routine confirmation when:

- the active plan already contains the requirement;
- the requested change is within the approved mission envelope;
- the ambiguity can be resolved safely from repository/system evidence.

Pause/escalate only for material ambiguity that changes business intent, production authority, spend, destructive scope, credential/privilege boundaries, legal/reputational exposure, or another constitutional gate.

---

## Continuous-forward rule

Every SPM update must contain:

- current lifecycle state;
- evidence produced since the last state;
- blocker, if any;
- next executable move;
- rolling 15–20 move horizon when the mission is complex.

The default answer to an executable, authorised task is **perform the next safe move**, not produce another planning document.

---

## Completion rule

`COMPLETE` means the intended outcome is real and verified, not merely coded.

For software/customer-facing work this normally includes:

- code implemented;
- lint/type/test/build contract satisfied;
- independent review satisfied;
- PR/CI clean;
- Playwright/visual evidence where applicable;
- staging/release checks satisfied;
- production action separately authorised;
- post-deploy/customer-path verification complete;
- evidence recorded and learning fed back into Nexus.
