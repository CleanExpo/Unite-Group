# Minions Protocol — Scoped Rule

> **Scope**: `.claude/blueprints/**` and `.claude/commands/minion.md` while a Minion invocation is active.
> **Authority**: Bounded worker protocol inside the current `/spm` mission. Current SPM, authority and completion contracts outrank stale Blueprint wording.

## One-shot engineering mandate

A Minion should execute a clear bounded engineering packet without routine mid-flight founder interaction.

- Do not ask technical clarification questions that current repo/runtime evidence or a specialist can answer.
- Do not request intermediate founder confirmation for reversible work already inside the execution lease.
- If genuine product/business intent is missing, return `BLOCKED_PRODUCT_DECISION` to SPM with the exact decision needed.
- If technical discovery exceeds the bounded context budget, return `BLOCKED_TECHNICAL_DISCOVERY` to the Orchestrator/SPM—not the founder.

## Context discipline

Pre-hydration uses `.claude/hooks/scripts/pre-hydration.mjs` and the current estate.

The manifest is the **initial** context set. It may be expanded only through the bounded expansion protocol defined by `/minion`:
1. identify the missing technical dependency/reference;
2. targeted search only;
3. add the exact required files;
4. record the reason;
5. remain inside `read_budget.expansion_max_files` or return technical discovery to SPM.

This preserves context economy without making an outdated manifest a blind source of failure.

Superseded/legacy material is excluded from normal context unless history is specifically required.

## Blueprint contract

Blueprints describe the local DAG. They do not redefine global mission states or authority.

Every agentic packet must carry:
- mission/task/attempt identity;
- current base/candidate provenance;
- exact objective/success criteria;
- allowed/prohibited scope;
- required evidence;
- authority/stop conditions.

A Blueprint reference to a missing file, retired architecture or superseded control is a conformance failure. Do not pretend the capability exists.

## Attempt budget

The live `iteration-counter.py` hook caps one Minion invocation at **3 Task-tool calls**.

Purpose: stop one tactic from looping indefinitely—not escalate the founder by count.

When the cap is reached:
- the hook blocks that over-budget Task call using the current Claude Code PreToolUse blocking behaviour;
- current Minion state is marked inactive with `technical_reroute_required: true`;
- the branch/worktree and evidence are preserved;
- control returns to Orchestrator/SPM for a different technical strategy.

Possible reroutes include alternate model/specialist, fresh environment/worktree, deeper CI/log/browser diagnosis or architecture/database/security review.

Do not immediately re-run the same Minion.

## Verification

Before candidate creation:
- run the current `/done` evidence contract;
- changed behaviour requires meaningful regression coverage;
- deterministic failures outrank model PASS;
- user-facing work requires applicable Playwright/visual evidence;
- final independent reviewer must not be the builder where required.

## GitHub boundary

Minion may produce a candidate **draft PR targeting `main`** only.

```text
gh pr create --draft --base main ...
```

Minion does not:
- mark the PR ready for review;
- merge it;
- call raw GitHub mutation APIs to bypass the local authority guard;
- deploy or promote production;
- claim the draft PR means task/misson COMPLETE.

The next lifecycle transition is owned by SPM/review/release controls and their authority receipts.

## Outcome states

A Minion invocation returns one of:
- `PR_OPEN`
- `BLOCKED_PRODUCT_DECISION`
- `BLOCKED_AUTHORITY`
- `BLOCKED_TECHNICAL_DISCOVERY`
- `MINION_TECHNICAL_REROUTE`
- `FAILED_ENVIRONMENT`

Do not use `MINION COMPLETE` unless the overall SPM mission has actually earned `COMPLETE` through its completion contract.

## State and evidence

`minion-state.json` is runtime attempt state only. Do not turn it or `.claude/memory/current-state.md` into another independent source of truth.

Return structured evidence to Orchestrator/SPM, which persists authoritative state in the mission/evidence ledger and projects it to Linear/Mission Control.

## Locale

Australian English and current project locale conventions.

## Cross-references

- `.claude/commands/minion.md`
- `.claude/commands/spm.md`
- `.claude/commands/done.md`
- `.claude/agents/orchestrator/agent.md`
- `.claude/rules/verification-gate.md`
