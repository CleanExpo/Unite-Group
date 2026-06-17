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

## Source Queues

Linear is the canonical execution queue. Hermes Kanban is the visual/operator queue.

When Founder OS links a Hermes Kanban task to Linear through `/api/hermes/kanban` with `action=linkLinear`, the created Linear issue is stamped with:

- `mesh:auto`
- `pi-dev:autonomous`
- `source:hermes-kanban`

That makes Hermes-originated work directly claimable by the Mission Control loop without a manual relabel step. The Hermes task receives a backlink comment in the form `Linear link: UNI-123 <url>`, so the operator board stays readable while Linear remains the worker source of truth.

Use this rule for cleanup: do not create a second autonomous queue. Create or discover work in Hermes when that is the easiest visual surface, link it to Linear, and let Mission Control claim the Linear issue.

## Required Environment

- `LINEAR_API_KEY`: Linear API token.
- `MISSION_CONTROL_RUNNER_CMD`: legacy local agent command. The token `{prompt}` is replaced with the generated issue prompt file.

Optional:

- `MISSION_CONTROL_HANDOFF_URL`: optional web handoff endpoint, for example `https://<app>/api/cron/linear-handoff`. When set, the worker uses the app’s read-only handoff packet for issue selection and prompt generation.
- `MISSION_CONTROL_CRON_SECRET` or `CRON_SECRET`: bearer token for `MISSION_CONTROL_HANDOFF_URL`.
- `MISSION_CONTROL_LINEAR_TEAM_KEY`: defaults to `UNI`.
- `MISSION_CONTROL_LINEAR_PROJECT`: defaults to `Unite-Group`.
- `MISSION_CONTROL_LINEAR_LABELS`: defaults to `mesh:auto,pi-dev:autonomous`.
- `MISSION_CONTROL_VERIFY_CMD`: defaults to `npm run type-check && npm run lint`.
- `MISSION_CONTROL_RUNNERS`: comma-separated runner lanes, for example `claude,codex,gemini`.
- `MISSION_CONTROL_RUNNER_CMD_<NAME>`: command template for a named runner, for example `MISSION_CONTROL_RUNNER_CMD_CLAUDE`.
- `MISSION_CONTROL_DEFAULT_RUNNER`: default runner lane when an issue has no `runner:<name>` label.
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

## Multi-Runner Mode

Use named runner lanes when you want Claude, Codex, Cursor, Gemini, OpenRouter, or other CLIs to operate as separate execution lanes under the same queue contract:

```bash
MISSION_CONTROL_LOOP=1 \
MISSION_CONTROL_PUSH=1 \
MISSION_CONTROL_RUNNERS='claude,codex,gemini' \
MISSION_CONTROL_DEFAULT_RUNNER='claude' \
MISSION_CONTROL_RUNNER_CMD_CLAUDE='claude -p "$(cat {prompt})"' \
MISSION_CONTROL_RUNNER_CMD_CODEX='codex exec "$(cat {prompt})"' \
MISSION_CONTROL_RUNNER_CMD_GEMINI='gemini -p "$(cat {prompt})"' \
npm run mission-control:linear-loop
```

Add `runner:codex`, `runner:gemini`, or another `runner:<name>` label to force a specific lane. If no runner label is present, the loop uses `MISSION_CONTROL_DEFAULT_RUNNER`.

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
- If `MISSION_CONTROL_HANDOFF_URL` is set, the loop does not run unless `MISSION_CONTROL_CRON_SECRET` or `CRON_SECRET` is also available.
- The loop does not push unless `MISSION_CONTROL_PUSH=1`.
- The loop does not mark Done unless `MISSION_CONTROL_COMPLETE_ON_SUCCESS=1`.
- Do not expose secrets in prompts, Linear comments, logs, or commits.
- Keep provider-specific CLIs behind `MISSION_CONTROL_RUNNER_CMD`; this script is the queue/ship contract, not the model runtime.
- Keep Hermes Kanban and Linear linked. Hermes is allowed to be the visual capture surface, but Linear must hold the claimable execution issue before the worker runs.
- Prefer one reusable capability or workflow improvement over a pile of one-off generated artifacts.
