# Hermes Kanban Lifecycle and Audit Operating Guide

Updated: 17/05/2026
Owner: Margot / Pi-CEO operations
Board: `phoenix-docs`

## Purpose

This guide makes the Hermes Kanban flow visible and auditable so Phill can see how work moves from instruction to verified completion without losing control of production changes.

The point is not to create motion. The point is to create a durable execution trail that supports Unite Group's $2B by 30/06/2028 acquisition path: clear ownership, verified outcomes, review gates, and no silent production merges.

## Current operating state

- Board slug: `phoenix-docs`
- Board database: `/Users/phill-mac/.hermes/kanban/boards/phoenix-docs/kanban.db`
- Gateway dispatcher: enabled through `kanban.dispatch_in_gateway: true`
- Gateway service: managed by launchd as `ai.hermes.gateway`
- Dispatcher behaviour: the gateway enumerates all active boards each tick, so `phoenix-docs` does not need to be the shell's active board to be dispatched.
- Safety posture for starter cards: starter cards are parked in `triage`, so they document the flow without launching workers automatically.
- Available assignee profile verified on this machine: `default`.
- Current starter cards:
  - `t_92cf4050` — worker card lifecycle example.
  - `t_9d6a0ec0` — reviewer gate lifecycle example; child of worker card.
  - `t_35cdecbb` — PR and production approval gate example; child of reviewer card.

## The lifecycle

1. Intake / triage
   - A rough task starts in `triage` when it needs shaping before execution.
   - Use this for ideas, documentation lanes, or tasks that should not dispatch yet.
   - Command: `hermes kanban --board phoenix-docs create "title" --triage --body "..."`

2. Specification
   - The task is clarified into a concrete outcome, acceptance criteria, required files, and verification steps.
   - The operator can manually edit or replace the card body, or use the specifier flow where configured.

3. Assignment
   - Assign only to real Hermes profiles discovered with `hermes profile list` or `hermes kanban assignees`.
   - Do not invent profile names. Unknown assignees can leave cards stuck.
   - Command: `hermes kanban --board phoenix-docs assign <task_id> <profile>`

4. Dependency linking
   - Use links for real dependencies only.
   - Parent first, child second.
   - Command: `hermes kanban --board phoenix-docs link <parent_id> <child_id>`
   - A dependent child should not run until the parent has a usable handoff.

5. Dispatch / running
   - The embedded gateway dispatcher claims ready, assigned work and spawns the worker profile.
   - Workers receive the focused task context, linked parent results, and the `kanban-worker` lifecycle guidance.
   - Operators can inspect status with `hermes kanban --board phoenix-docs list` and `hermes kanban --board phoenix-docs show <task_id>`.

6. Worker handoff
   - Research/docs tasks can complete directly with a summary and metadata.
   - Code-changing tasks should usually block as `review-required` rather than complete outright.
   - Durable handoff commands:
     - `hermes kanban --board phoenix-docs comment <task_id> "handoff details"`
     - `hermes kanban --board phoenix-docs block <task_id> "review-required: ..."`
     - `hermes kanban --board phoenix-docs complete <task_id> --summary "..." --metadata '{...}'`

7. Review
   - Reviewer reads the task, comments, runs, logs, changed files, and test evidence.
   - Reviewer either completes the review, blocks with required changes, or creates follow-up cards.
   - Review is an explicit gate, not a vibe check.

8. PR and production gate
   - If a worker opens a PR, it is not merged by the worker.
   - Margot verifies CI, confirms scope with Phill, and only merges after explicit approval: `approve PR-[number]`.
   - No production branch push, deploy, or mandate closure happens without Phill's approval.

9. Audit and archive
   - `show` is the canonical task story: body, comments, events, status, and result.
   - `runs` shows attempt history and worker outcomes.
   - `log` shows worker logs when a worker actually ran.
   - Archive only after the task is genuinely closed and no longer needed on the active board.

## Operator commands

Board visibility:

```bash
hermes kanban boards list
hermes kanban --board phoenix-docs boards current
hermes kanban --board phoenix-docs stats
hermes kanban --board phoenix-docs list
hermes kanban --board phoenix-docs assignees
```

Task inspection:

```bash
hermes kanban --board phoenix-docs show <task_id>
hermes kanban --board phoenix-docs tail <task_id>
hermes kanban --board phoenix-docs runs <task_id>
hermes kanban --board phoenix-docs log <task_id> --tail 4000
```

Lifecycle operations:

```bash
hermes kanban --board phoenix-docs create "title" --triage --body "..."
hermes kanban --board phoenix-docs assign <task_id> <profile>
hermes kanban --board phoenix-docs link <parent_id> <child_id>
hermes kanban --board phoenix-docs comment <task_id> "comment"
hermes kanban --board phoenix-docs block <task_id> "review-required: reason"
hermes kanban --board phoenix-docs complete <task_id> --summary "summary" --metadata '{"verified": true}'
```

Dispatcher verification:

```bash
hermes gateway status
grep -i "kanban dispatcher" /Users/phill-mac/.hermes/logs/gateway.log | tail -20
hermes kanban --board phoenix-docs dispatch --max 0
hermes kanban --board phoenix-docs dispatch --dry-run --max 1
```

Audit command expectations:

- `show <task_id>` displays the card body, dependency links, comments, and event history.
- `runs <task_id> --json` returns attempt history; starter cards return `[]` until a worker has run.
- `log <task_id> --tail 4000` returns worker output after execution; starter cards correctly report no log because they have not spawned.
- `tail <task_id>` is for live following a running task, not a required starter-card check.

## Starter card pattern

Starter cards on `phoenix-docs` should demonstrate the flow without accidentally launching workers. Default starter cards stay in `triage` until Phill or Margot deliberately promotes and assigns them.

Recommended starter lane:

1. Worker example — draft one Phoenix documentation artifact.
2. Reviewer example — review that artifact against acceptance criteria.
3. PR / approval gate example — document how the reviewed artifact would be published, including CI and approval requirements.

## Review-required convention

For code or production-impacting work, workers should not mark a card done just because they changed files. They should comment structured handoff metadata, then block:

```text
review-required: change implemented and local checks pass — needs reviewer before merge/deploy
```

The reviewer or Margot then decides whether to unblock, create a fix card, or move it to completion.

## Production approval rule

No worker merges to main, pushes production branches, deploys live environments, or closes board mandates as complete. Phill's explicit approval is the only production gate.

When Phill says `approve PR-[number]`, Margot verifies CI, confirms the exact merge target, merges only after the final yes, then checks deployment status.

## Verification log — 17/05/2026 04:17 AEST

Verified commands:

- `hermes kanban boards list` — board is visible as `phoenix-docs` with `triage=3`.
- `hermes kanban --board phoenix-docs boards current` — board metadata, description, database path, and task count are visible.
- `hermes kanban --board phoenix-docs stats` — shows exactly three triage cards and zero ready/running/blocked/done cards.
- `hermes kanban --board phoenix-docs list` — shows the worker, reviewer, and PR/approval starter cards.
- `hermes kanban --board phoenix-docs dispatch --dry-run --max 3` — spawned zero workers, as expected, because starter cards are deliberately parked in triage.
- `hermes kanban --board phoenix-docs dispatch --max 0` — spawned zero workers and made no state changes.
- `hermes kanban --board phoenix-docs show <starter_id>` — proved bodies, comments, events, and parent/child links are visible.
- `hermes kanban --board phoenix-docs runs <starter_id> --json` — returned `[]` for all starter cards, which is correct before execution.
- `hermes kanban --board phoenix-docs log <starter_id> --tail 2000` — returned the expected "task may not have spawned yet" message for all starter cards.

Verified semantics:

- Worker card `t_92cf4050` demonstrates safe task shaping before dispatch: acceptance criteria, output path, verification commands, and a real assignee must be chosen before promotion.
- Reviewer card `t_9d6a0ec0` is linked as a child of the worker card and demonstrates independent verification of context, attempt history, logs, and output.
- PR/approval card `t_35cdecbb` is linked as a child of the reviewer card and states the production rule: workers may prepare PRs, but they do not merge, deploy, or close production mandates. Phill's explicit `approve PR-[number]` remains the gate.

## Why this matters to the exit path

Acquirers will not value a swarm because it is busy. They will value it if it proves controlled autonomy: clear intake, delegated execution, review gates, audit trail, and production discipline. This board is a proof system for that operating model.
