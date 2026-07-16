# Nexus Runner (v1 — UNI-2383)

The executor half of the Command Centre loop: polls approved `cc_tasks`, claims one at a
time, executes it headlessly with the claude CLI at the **L2 ceiling** (branch → gates →
**draft PR** — never merge/migrate/deploy/spend), and emits redacted lifecycle events to
the Matrix wall. Decisions of record: grill `2nd Brain/Grills/13-nexus-how-it-should-be-set-up.md`
+ Linear UNI-2379 map (UNI-2383 lifecycle, UNI-2384 taxonomy).

## Architecture

```
tmux (user session — NOT launchd: claude CLI trips TCC there)
 └─ run.sh (env wrapper, HARD_STOP gate, own bin/ git+rm shims, Max-OAuth auth)
     └─ runner.mjs  ──HTTP──►  POST /api/agents/runner/claim    (dark until armed)
                    ──HTTP──►  POST /api/agents/runner/release
                    ──HTTP──►  POST /api/agents/events           (wall ingest, B1)
                    ──spawn──► claude --print (headless, worktree-isolated, L2 prompt)
```

One bearer secret (`AGENT_EVENTS_SECRET`) arms the whole plane. The runner holds **no**
database credentials.

## Safety envelope

`run.sh` prepends the runner's OWN committed `bin/` (git + rm shims) to `PATH` — portable,
no dependency on the machine-level `~/.claude/night-shift` shims (whose git guard blocks
ALL pushes to the prod repo, which would stop the runner ever opening its draft PR —
UNI-2399). The `bin/git` shim allows exactly what the L2 mandate needs — a plain
feature-branch push to origin — and blocks force-push (all forms), `merge`, `reset --hard`,
`branch -D`, and any push to the default branch (`main`/`master`), returning exit 3.
The `bin/rm` shim blocks recursive delete outside the scratch dir. Both hold even under
`--dangerously-skip-permissions`. Covered by `apps/web` vitest `runner-git-guard.test.ts`.

## Founder arming steps (one sitting, order matters — grill Q7)

1. Flip F1 (identity gate fail-closed).
2. Apply the migrations on prod via `supabase db push` (founder-gated):
   `20260715050000_cc_agent_events.sql` + `20260716010000_cc_tasks_claim.sql`.
3. `vercel env add AGENT_EVENTS_SECRET` (generate: `openssl rand -hex 32`) + redeploy
   (UNCHECK build cache).
4. Create `~/.claude/nexus-runner.env`:
   ```sh
   NEXUS_APP_URL="https://<the apps/web prod domain>"
   AGENT_EVENTS_SECRET="<same value as the Vercel env>"
   # optional: RUNNER_ID, POLL_SECONDS (60), TASK_TIMEOUT_SECONDS (3600), NEXUS_REPO_ROOT
   ```
5. Start: `tmux new-session -d -s nexus-runner "$HOME/Unite-Group/scripts/nexus-runner/run.sh"`

## Kill switch

`touch ~/.claude/HARD_STOP` — the loop exits at the next poll (same switch as nightshift).
`tmux kill-session -t nexus-runner` for immediate stop.

## Demo bar (grill Q2 — the loop is real when…)

Approve one task in the Command Centre UI and watch it go
**queued → running → draft-PR-opened on the wall with zero terminal touches.**

## Verification checklist

- [ ] `tmux capture-pane -pt nexus-runner` shows heartbeat polls, no 401s once armed.
- [ ] Before arming: claim returns 401 (dormant) — the runner logs "not armed; idling".
- [ ] After approving a task: `cc_tasks.status` walks queued → running → done, `claimed_by`
      set, `preview_url` carries the draft-PR URL.
- [ ] `cc_agent_events` receives `claimed / started / draft_pr_opened` (or `aborted`/
      `requeued` with a short snake code) + heartbeats.
- [ ] The draft PR exists on GitHub and was **not** merged by the runner.
- 2026-07-16: runner E2E loop proven on local stack (UNI-2383).
- 2026-07-16: runner armed in prod and demo-proven (UNI-2385).
