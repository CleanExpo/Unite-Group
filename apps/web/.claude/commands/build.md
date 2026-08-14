# /build — Execution-First Build Command

> Compatibility entry point for software changes. `/build` now means **build**, not "produce a plan and wait".
> Canonical lifecycle and authority rules live in `/spm build`.

## Usage

```text
/build <task description>
```

Natural-language equivalent: **Stop Planning, Build**.

If an active plan/mission already exists, consume it. Do not ask the user to repeat requirements already captured in the conversation, Linear, Mission Control or the current execution plan.

---

## Step 1 — Resolve requirements without re-planning

Normalise the task into:

```text
WHAT:       what is being built or changed
WHERE:      page/service/repo/area
WHO:        affected user/actor
TRIGGER:    action/event that invokes it
SHOULD SEE: observable successful behaviour
DON'T DO:   boundaries/non-goals
SUCCESS:    objective verification criteria
```

Fill missing non-material fields from current plans and repository evidence.

**Do not stop for routine confirmation.** Ask only when a missing answer materially changes business intent, irreversible scope, production authority, security/privilege boundaries, spend or another constitutional gate.

---

## Step 2 — Transition to BUILD_AUTHORISED

Treat `/build` as explicit authority for reversible engineering writes inside the stated mission envelope.

Run the `/spm build` execution-readiness preflight:

- confirm canonical repo/base;
- search existing implementation before creating anything;
- confirm worker is execution-capable rather than plan/read-only;
- establish isolated branch/worktree;
- define deterministic verification;
- define Playwright/visual evidence for user-facing work;
- identify real stop gates.

If readiness fails, report a specific `BLOCKED` state with evidence. **Do not return another generic plan as the result of `/build`.**

---

## Step 3 — Execute

Use the existing implementation harnesses (builder/minion/worktree/toolshed/skills) rather than inventing a parallel workflow.

Expected flow:

```text
BUILD_AUTHORISED
  -> EXECUTING
  -> LOCALLY_VERIFIED
  -> PR_OPEN
  -> REVIEWING
  -> CI_GREEN
  -> STAGING_VERIFIED
  -> RELEASE_READY
```

During execution:

1. inspect relevant existing code;
2. implement the smallest complete change;
3. add/update tests;
4. run targeted checks while working;
5. run applicable lint/type/test/build gates;
6. self-review the diff;
7. create candidate commit/PR;
8. obtain independent review where available;
9. repair actionable review/CI/conflict failures;
10. run browser/visual verification for user-facing changes;
11. continue until `RELEASE_READY` or a real blocker exists.

A PR is not completion.

---

## Step 4 — Verify real behaviour

For user-facing work, the system—not Phill—should perform the normal verification loop using Playwright and available visual/browser tooling.

Evidence should include, where applicable:

- expected navigation/route works;
- API/client integration works;
- auth/scope boundaries work;
- loading/error states are honest;
- console/network failures are absent;
- critical Playwright journey passes;
- required screenshot/trace evidence exists.

Escalate to Phill only when human judgement is genuinely required.

---

## Step 5 — Release boundary

`/build` proceeds through `RELEASE_READY`.

Production/irreversible release remains separately governed through `/spm ship` (or the approved release authority mechanism). Do not reinterpret build authority as blanket production authority.

After release is separately authorised, continue through post-deploy/customer-path verification before reporting `COMPLETE`.

---

## Reporting

Do not narrate every internal planning thought. Report state transitions and evidence:

```text
SPM BUILD
state: EXECUTING | BLOCKED | RELEASE_READY | COMPLETE
mission: <id>
worker: <worker/model/machine>
evidence: <tests / commit / PR / visual proof>
blocker: <specific blocker or none>
next_move: <next executable action>
```

## Hard rules

- Build intent should produce an execution attempt, not merely a plan.
- Do not require a redundant `go` after the user already issued `/build` or `Stop Planning, Build`.
- Do not silently regress from `BUILD_AUTHORISED` to `PLANNED`.
- Do not call a PR, green build or HTTP 200 "complete" without the applicable downstream verification.
- Never bypass a real production, destructive, spend, privilege or security gate.
