# Autonomous Capability Factory

Date: 2026-06-17

## Purpose

Mission Control should expand a founder idea into useful production work without taking the words too literally or creating random one-off output. The loop is:

1. Capture the idea in Hermes Kanban or Linear.
2. Research adjacent advances, repos, model capabilities, marketplace patterns, and prior 2nd Brain context.
3. Convert the finding into a reusable capability, workflow, integration, or operating asset.
4. Create one canonical Linear issue with `mesh:auto` or `pi-dev:autonomous`.
5. Mirror the issue back to Hermes Kanban when the founder needs the visual board.
6. Route the issue to the best runner lane with `runner:<name>` when needed.
7. Run verification, commit, push, and update Linear.
8. Feed the decision, evidence, and lessons back into the 2nd Brain.

## Queue Contract

Linear is the canonical worker queue. Hermes Kanban is the operator-facing visual queue.

Work can start in either place, but it must become a Linear issue before autonomous execution starts. Hermes-originated work is eligible when the `/api/hermes/kanban` `linkLinear` action creates the Linear issue with:

- `mesh:auto`
- `pi-dev:autonomous`
- `source:hermes-kanban`

The loop should not create duplicate work items. If a Hermes task already has a `Linear link:` comment, reuse that issue.

## Runner Lanes

Mission Control routes execution through named runner lanes:

- `claude`: strong default coding and repo continuation lane.
- `codex`: local implementation, refactor, verification, and PR lane.
- `cursor`: IDE-assisted implementation lane when the CLI is installed and authenticated.
- `gemini`: long-context research, comparison, and alternate reviewer lane.
- `openrouter` or `minimax`: optional specialist lanes behind a local wrapper command.

Runner labels are advisory but binding when configured. A Linear issue with `runner:gemini` must use the Gemini lane if that runner exists. Otherwise the default runner handles the issue and records the fallback in Linear.

## Auto-Generation Standard

Generated work should become one of these assets:

- A production feature or integration.
- A reusable agent skill, prompt packet, or CLI runner preset.
- A verified research packet that creates follow-on Linear issues.
- A UI control that lets the founder see and steer the system.
- A test, guardrail, or verification harness that prevents regression.

Generated work should not become:

- A disconnected document with no queue link.
- A second source of truth outside Linear and Hermes.
- A task that needs secrets pasted into chat or logs.
- A pile of speculative tickets with no owner, runner, or verification path.

## Research-Informed Expansion

When the founder gives a simple idea, the system should expand it before implementation:

1. Restate the literal request.
2. Identify adjacent capabilities from GitHub, Hugging Face, AI product releases, and prior 2nd Brain notes.
3. Pick the smallest production-grade enhancement that compounds across projects.
4. Create or update the Linear issue with the chosen implementation path.
5. Include rejected options in the issue comment, not as separate bloat tickets.

## Completion Definition

A task is complete only when:

- Code or docs are committed.
- Verification evidence is recorded.
- The branch is pushed or the PR is opened.
- Linear is moved to In Review or Done.
- Hermes has a backlink or completion note when the task originated there.
- Any reusable lesson is ready for 2nd Brain ingestion.
