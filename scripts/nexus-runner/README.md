# Nexus Runner (v1 — UNI-2383)

The executor half of the Command Centre loop: polls approved `cc_tasks`, claims one at a
time, executes it headlessly with the Claude CLI at the **L2 ceiling** (branch → gates →
**draft PR** — never ready/merge/migrate/deploy/spend), and emits redacted lifecycle events to
the Matrix wall. Decisions of record: grill `2nd Brain/Grills/13-nexus-how-it-should-be-set-up.md`
+ Linear UNI-2379 map (UNI-2383 lifecycle, UNI-2384 taxonomy).

## Architecture

```text
tmux (user session — NOT launchd: Claude CLI trips TCC there)
 └─ run.sh (env wrapper, HARD_STOP gate, own bin/ git+rm+gh shims, Max-OAuth auth)
     └─ runner.mjs  ──HTTP──►  POST /api/agents/runner/claim    (dark until armed)
                    ──HTTP──►  POST /api/agents/runner/release
                    ──HTTP──►  POST /api/agents/events           (wall ingest, B1)
                    ──spawn──► claude --print (headless, worktree-isolated, L2 prompt)
```

One bearer secret (`AGENT_EVENTS_SECRET`) arms the whole plane. The runner holds **no**
database credentials.

## Safety envelope

`run.sh` prepends the runner's OWN committed `bin/` to `PATH`. These shims remain active even
when the Claude permission engine is bypassed; prompt text is not treated as an authority boundary.

- `bin/git` allows the plain feature-branch push needed for a candidate PR and blocks force-push,
  `merge`, `reset --hard`, branch deletion, and pushes to `main`/`master`.
- `bin/rm` blocks recursive delete outside the scratch boundary.
- `bin/gh` permits bounded read-only inspection plus **only** `gh pr create --draft --base main` as
  a GitHub mutation. It blocks `gh pr ready`, `gh pr merge`, PR edit/review/comment/close/reopen,
  raw `gh api`, release creation, secrets/variables, workflow dispatch, and other GitHub mutations.
  Higher-authority deterministic release tooling must use its own isolated real-`gh` path and
  machine-verifiable authority receipt; it must never depend on the L2 runner's CLI surface.

The git and GitHub guards are covered by hermetic Vitest suites under
`apps/web/src/lib/command-centre/__tests__/runner-*-guard.test.ts`.

### Known lifecycle defect being repaired separately

The current runner still maps a returned draft `PR_URL` to Command Centre task outcome `done`.
That status is **not** evidence that the mission is complete or shipped. UNI-2517/UNI-2530 replace
this with an evidence-backed lifecycle where draft PR creation is a candidate/PR-open state and
`COMPLETE` is derived only after the applicable review, CI, visual, release and outcome evidence.

## Founder arming steps (one sitting, order matters — grill Q7)

1. Flip F1 (identity gate fail-closed).
2. Apply the required runner migrations through the governed database-change path.
3. Set `AGENT_EVENTS_SECRET` in the approved runtime and redeploy through the governed release path.
4. Create `~/.claude/nexus-runner.env`:
   ```sh
   NEXUS_APP_URL="https://<the apps/web production domain>"
   AGENT_EVENTS_SECRET="<same value as the runtime env>"
   # optional: RUNNER_ID, POLL_SECONDS (60), TASK_TIMEOUT_SECONDS (3600), NEXUS_REPO_ROOT
   ```
5. Start: `tmux new-session -d -s nexus-runner "$HOME/Unite-Group/scripts/nexus-runner/run.sh"`

## Kill switch

`touch ~/.claude/HARD_STOP` — the loop exits at the next poll.
`tmux kill-session -t nexus-runner` for immediate stop.

## Demo bar

Approve one bounded L2 task in the Command Centre UI and observe:

**queued → running → draft-PR-opened**

with no terminal touches and no transition to ready-for-review, merge or deployment from the runner.

## Verification checklist

- [ ] `tmux capture-pane -pt nexus-runner` shows heartbeat polls and an armed runner identity.
- [ ] Before arming: claim fails closed and the runner idles.
- [ ] An approved bounded task creates an isolated worktree and candidate branch.
- [ ] A draft PR is created against `main` and the runner does **not** mark it ready or merge it.
- [ ] `gh pr ready`, `gh pr merge`, mutating `gh api`, releases, secret/variable mutation and workflow dispatch return the runner guard's blocked exit.
- [ ] `cc_agent_events` records claimed / started / draft_pr_opened (or a truthful failure/requeue) plus heartbeats.
- [ ] Until the lifecycle taxonomy repair lands, do not interpret the runner's legacy task `done` field as mission COMPLETE.
