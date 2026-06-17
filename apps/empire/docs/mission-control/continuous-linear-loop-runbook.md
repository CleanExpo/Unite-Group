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

- `MISSION_CONTROL_RUNNERS`: comma-separated named runner registry, for example `claude,cursor`. Built-in presets exist for `claude` and `cursor`.
- `MISSION_CONTROL_RUNNER_CMD_<NAME>`: command override for a named runner, for example `MISSION_CONTROL_RUNNER_CMD_CURSOR`.
- `MISSION_CONTROL_DEFAULT_RUNNER`: default named runner when no `runner:<name>` Linear label is present.
- `MISSION_CONTROL_HANDOFF_URL`: optional web handoff endpoint, for example `https://<app>/api/cron/linear-handoff`. When set, the worker uses the app’s read-only handoff packet for issue selection and prompt generation.
- `MISSION_CONTROL_CRON_SECRET` or `CRON_SECRET`: bearer token for `MISSION_CONTROL_HANDOFF_URL`.
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

## Continuous Mode With Web Handoff

Use this when the Unite-Group web app should own the next-work selection and runner prompt, while the local worker still owns the local CLI execution, verification, commit, push, and Linear status updates:

From the Unite-Group repo root, use the root alias so the command does not depend on `cd apps/empire`.

Preflight first:

```bash
MISSION_CONTROL_HANDOFF_URL='https://<app>/api/cron/linear-handoff' \
MISSION_CONTROL_CRON_SECRET='<same value as CRON_SECRET>' \
npm run mission-control:linear-handoff-loop:preflight
```

Then start the continuous handoff loop:

```bash
MISSION_CONTROL_HANDOFF_URL='https://<app>/api/cron/linear-handoff' \
MISSION_CONTROL_CRON_SECRET='<same value as CRON_SECRET>' \
npm run mission-control:linear-handoff-loop
```

From any other directory, point npm at the repo root:

```bash
MISSION_CONTROL_HANDOFF_URL='https://<app>/api/cron/linear-handoff' \
MISSION_CONTROL_CRON_SECRET='<same value as CRON_SECRET>' \
npm --prefix /Users/phillmcgurk/Unite-Group run mission-control:linear-handoff-loop
```

## Runner Registry

Use named runners when Mission Control should choose between local CLIs. A Linear label like `runner:cursor` selects that runner for a task; otherwise `MISSION_CONTROL_DEFAULT_RUNNER` or the first configured runner is used.

Built-in presets:

- `claude`: `claude -p "$(cat {prompt})"`
- `cursor`: `cursor-agent -p "$(cat {prompt})" --output-format text`

Claude default with Cursor available for labelled frontend/UI tasks:

```bash
MISSION_CONTROL_RUNNERS=claude,cursor \
MISSION_CONTROL_DEFAULT_RUNNER=claude \
npm run mission-control:linear-loop:preflight
```

If Cursor is not installed yet, preflight will report `runner:cursor` as missing. It only blocks startup when Cursor is the default runner.

Override any preset with `MISSION_CONTROL_RUNNER_CMD_<NAME>`:

```bash
MISSION_CONTROL_RUNNERS=cursor \
MISSION_CONTROL_RUNNER_CMD_CURSOR='cursor-agent -p "$(cat {prompt})" --model Composer-2.5' \
npm run mission-control:linear-loop:preflight
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

- The loop does not run if no legacy runner command or named runner is configured.
- The loop does not run if the default runner CLI is missing.
- If `MISSION_CONTROL_HANDOFF_URL` is set, the loop does not run unless `MISSION_CONTROL_CRON_SECRET` or `CRON_SECRET` is also available.
- The loop does not push unless `MISSION_CONTROL_PUSH=1`.
- The loop does not mark Done unless `MISSION_CONTROL_COMPLETE_ON_SUCCESS=1`.
- Do not expose secrets in prompts, Linear comments, logs, or commits.
- Keep provider-specific CLIs behind `MISSION_CONTROL_RUNNER_CMD`; this script is the queue/ship contract, not the model runtime.
