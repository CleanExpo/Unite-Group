# Continuous Linear Loop Runbook

Date: 2026-06-16

## Purpose

This runbook starts the Mission Control worker that keeps pulling the next eligible Linear task from the Unite-Group project and handing it to the local agent CLI.

The loop is intentionally explicit:

1. Find next claimable Linear issue in the Unite-Group project.
2. Require `mesh:auto` or `pi-dev:autonomous`.
3. Skip credential/manual/ambiguous/external blockers.
4. Move the issue to In Progress.
5. Write an issue prompt to a temp file.
6. Run the configured local agent command.
7. Run verification.
8. Commit and optionally push.
9. Move the issue to In Review or Done.
10. Repeat.

## Required Environment

- `LINEAR_API_KEY`: Linear API token.
- `MISSION_CONTROL_RUNNER_CMD`: local agent command. The token `{prompt}` is replaced with the generated issue prompt file.

Optional:

- `MISSION_CONTROL_LINEAR_TEAM_KEY`: defaults to `UNI`.
- `MISSION_CONTROL_LINEAR_PROJECT`: defaults to `Unite-Group`.
- `MISSION_CONTROL_LINEAR_LABELS`: defaults to `mesh:auto,pi-dev:autonomous`.
- `MISSION_CONTROL_VERIFY_CMD`: defaults to `npm run type-check && npm run lint`.
- `MISSION_CONTROL_PUSH`: set to `1` to push after commit.
- `MISSION_CONTROL_PUSH_TARGET`: optional push target, for example `origin HEAD:main`.
- `MISSION_CONTROL_COMPLETE_ON_SUCCESS`: set to `1` to mark Done instead of In Review.
- `MISSION_CONTROL_LOOP`: set to `1` for continuous mode.
- `MISSION_CONTROL_LOOP_INTERVAL_MS`: defaults to `60000`.

## One-Shot Test

Use this first to prove Linear claim, runner invocation, verification, and issue update work:

```bash
MISSION_CONTROL_RUNNER_CMD='claude -p "$(cat {prompt})"' npm run mission-control:linear-loop:once
```

## Continuous Mode

Use this for the ongoing worker:

```bash
MISSION_CONTROL_LOOP=1 \
MISSION_CONTROL_PUSH=1 \
MISSION_CONTROL_PUSH_TARGET='origin HEAD:main' \
MISSION_CONTROL_RUNNER_CMD='claude -p "$(cat {prompt})"' \
npm run mission-control:linear-loop
```

## Safer Continuous Mode

Use this when you want the loop to push the current feature branch but stop at In Review:

```bash
MISSION_CONTROL_LOOP=1 \
MISSION_CONTROL_PUSH=1 \
MISSION_CONTROL_RUNNER_CMD='claude -p "$(cat {prompt})"' \
npm run mission-control:linear-loop
```

## Guardrails

- The loop does not run if `MISSION_CONTROL_RUNNER_CMD` is missing.
- The loop does not push unless `MISSION_CONTROL_PUSH=1`.
- The loop does not mark Done unless `MISSION_CONTROL_COMPLETE_ON_SUCCESS=1`.
- Do not expose secrets in prompts, Linear comments, logs, or commits.
- Keep provider-specific CLIs behind `MISSION_CONTROL_RUNNER_CMD`; this script is the queue/ship contract, not the model runtime.
