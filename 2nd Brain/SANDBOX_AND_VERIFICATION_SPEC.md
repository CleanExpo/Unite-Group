---
type: spec
component: sandbox-verification
status: active-draft
created: 2026-06-04
owner: qa-test-agent
---

# Sandbox and Verification Spec

## Principle

The control plane is durable. Execution environments are disposable.

Coding agents should work in isolated sandboxes: git worktrees first, Docker when dependencies/runtime isolation requires it.

## Worktree strategy

1. Control plane creates task.
2. Build Worker creates a task-specific worktree or temporary clone.
3. Agent runs code changes inside that workspace only.
4. Agent captures diff, logs, tests, screenshots.
5. Agent prepares PR branch or patch artifact.
6. Human reviews before merge/deploy.

## Verification gates

For code/build tasks, capture:
- dependency install command and result
- lint result
- type-check result
- focused tests
- full tests where practical
- build result
- Playwright/browser checks for UI tasks
- screenshot paths for UI tasks
- git diff summary
- known blockers

## PR preparation

Allowed:
- create branch/patch artifact
- draft PR body locally
- create PR only if explicitly approved for that lane

Forbidden without approval:
- merge PR
- deploy production
- mutate env/secrets
- prod DB migration
- destructive cleanup

## Failure handling

Every failed build/test creates:
- failure evidence record
- artifact log
- platform improvement task if failure is due to Agentic Nexus tooling
- project task if failure is real product breakage

## Screenshot/log evidence

Artifacts live under:

`.agentic_nexus/artifacts/<task_id>/`

Run logs live under:

`.agentic_nexus/runs/<run_id>/run.log`

## v0 safe verification

The first vertical slice does not run arbitrary repo builds. It verifies the control plane itself by running:

```bash
python3 .agentic_nexus/scripts/agentic_nexus.py init
python3 .agentic_nexus/scripts/agentic_nexus.py create-task --project 2nd-brain --type research --outcome "..."
python3 .agentic_nexus/scripts/agentic_nexus.py claim --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py run --worker research-bi-worker
python3 .agentic_nexus/scripts/agentic_nexus.py status
```
