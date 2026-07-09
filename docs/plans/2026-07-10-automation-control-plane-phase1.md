# Phase 1 — Automation Control-Plane Cleanup

**Date:** 10/07/2026
**Branch:** `fix/automation-control-plane-phase1`
**Base:** `origin/main` at `0b421010`
**Production gate:** PR only; no merge or deployment without Phill's explicit approval.

## Win condition

Phase 1 is complete when the repository has:

1. No unattended five-minute Brand Video GitHub poller when its production queue has never contained a job.
2. Brand Video rendering remains callable through an explicit manual workflow; queue-driven delivery is deferred because the production GitHub credential is not connected.
3. The operator queue fallback installer emits a 900-second interval rather than 60 seconds.
4. Bookkeeper failed outcomes return a failing HTTP status, fresh overlapping runs are rejected, and stale `running` rows are marked failed before a new run starts.
5. Focused regression tests, package verification, workflow validation, and executable rollback instructions pass.
6. A PR targets `main` and remains unmerged.

## Evidence motivating the change

- `brand_video_jobs`: zero rows; GitHub's active scheduled workflow still runs repeatedly and reports transport success.
- `operator_jobs`: three rows in the previous 30 days; recent one-minute sweeps process zero jobs.
- `bookkeeper_runs`: 24 rows stuck at `running`; only five rows recorded as completed, with the latest completion on 16/03/2026.
- Vercel's bookkeeper route currently returns HTTP 200 when the orchestrator returns `status: failed`, creating a false-green scheduler signal.

## Scope

### A. Brand Video workflow

- Remove `schedule` from `.github/workflows/brand-video-render.yml`.
- Retain `workflow_dispatch`.
- Do not scaffold repository event delivery while production `GITHUB_TOKEN` remains unconfigured.
- Defer queue-driven dispatch until a real server-side GitHub credential is connected and can be canary-tested.
- Do not change worker, credentials, rendering, storage or queue semantics in Phase 1.

### B. Operator queue fallback

- Change the canonical installer-generated `StartInterval` from 60 to 900 seconds.
- Update operator comments/runbook.
- Add a deterministic test that renders or inspects the installer output without loading LaunchAgent state.
- The currently installed plist is changed only after the PR is approved and merged.

### C. Bookkeeper control integrity

- Add a thin control helper around the existing orchestrator.
- Before a run, mark founder-scoped `running` records older than the stale threshold as `failed`, set `completed_at`, and append a machine-readable timeout reason.
- Reject a fresh founder-scoped `running` record with HTTP 409 and do not start a second orchestrator.
- Apply founder-scoped overlap and stale-run recovery to both cron and authenticated manual bookkeeper entry points.
- Return HTTP 500 when the orchestrator reports `status: failed`; return HTTP 207 with `success: false` for partial outcomes.
- Fail closed with HTTP 500 when `CRON_SECRET` is missing, and reject incorrect bearer credentials with HTTP 401.
- Persist an empty JSON array, never `null`, to the non-null `bookkeeper_runs.error_log` column and fail the request if final run-record persistence fails.
- Preserve authentication and founder scoping.
- Do not add or apply a database migration in Phase 1. The overlap guard is operational, not a mathematically race-free distributed lock; a partial unique index or database lock is a later database-gated control.

## Out of scope

- Production database cleanup or schema changes.
- Starting the stopped Empire gateway.
- Changing Telegram ownership or starting another poller.
- Merging or deploying the PR.
- Deleting jobs, workflows, repositories or Vercel projects.
- Rebuilding the full event bus or automation dashboard.

## 18-move execution map

1. Capture immutable rollback copies and SHA-256 manifest.
2. Establish a clean worktree from latest `origin/main`.
3. Record live GitHub workflow state and recent scheduled evidence.
4. Write focused failing workflow/installer/bookkeeper regression tests.
5. Run RED and preserve the expected failures.
6. Remove the Brand Video schedule while retaining manual invocation.
7. Verify the production GitHub credential is not connected and record the event-driven path as deferred rather than scaffolding it.
8. Validate workflow syntax and trigger contract.
9. Refactor the operator installer so its plist output is testable without loading launchd.
10. Change the fallback interval to 900 seconds.
11. Verify the installer test and shell syntax.
12. Add founder-scoped stale-run recovery and fresh-run detection.
13. Reject fresh overlap before invoking the orchestrator.
14. Return non-2xx transport status for failed bookkeeper outcomes.
15. Run focused tests, then affected-package type-check/build.
16. Verify the rollback manifest and document exact restoration commands.
17. Commit and open one scoped PR against `main` with one controller gate comment.
18. Hold merge/deploy until Phill explicitly says `approve PR-<number>`.

## Rollout batches and approval gates

### Batch 0 — PR verification (current batch)

- PR CI must pass.
- Focused control tests, web type-check/lint, operator tests/build, shell syntax and workflow parsing must pass.
- Independent review must have no security or logic blockers.
- **Approval:** Phill says `approve PR-<number>` before merge. Nothing in this batch changes production.

### Batch 1 — repository schedules and HTTP semantics

- Merge the approved PR.
- Confirm the GitHub workflow no longer reports a `schedule` trigger on `main`.
- Confirm Vercel deploys the exact merge commit.
- Invoke the bookkeeper route once through the authorised production path and require one of: `200 completed`, `207 partial`, `409 already running`, or an honest `500`; a transport `200` with body status `failed` is a rollback condition.
- Observe for 24 hours before proceeding.

### Batch 2 — local operator backstop

- Rebuild and install the canonical LaunchAgent only after Batch 1 remains healthy:

```bash
cd /Users/phill-mac/Unite-Group
bash apps/autopilot-runner/scripts/install-operator-jobs-service.sh
plutil -p "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist" | grep StartInterval
launchctl print "gui/$(id -u)/in.unite-group.operator-jobs"
```

- Expected interval: `900` seconds.
- Confirm a bounded sweep exits successfully and logs an honest queue result.

### Batch 3 — evidence window

- Observe Brand Video, bookkeeper and operator evidence for seven days.
- No archive/deletion occurs in this phase.
- Empire scheduler ownership, cleanup-loop authentication and briefing consolidation remain blocked until their own reviewed change set because the Empire gateway is stopped and must not become a second Telegram poller.

## Rollback

Pre-change snapshot:

`/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/.harness/rollback/automation-phase1-20260710-063053`

### Repository rollback before merge

Close the PR. No runtime state has changed.

### Repository rollback after an approved merge

```bash
git fetch origin main
git switch -c revert/automation-control-plane-phase1 origin/main
git revert -m 1 <MERGE_COMMIT_SHA>
git push -u origin revert/automation-control-plane-phase1
gh pr create --repo CleanExpo/Unite-Group --base main \
  --head revert/automation-control-plane-phase1 \
  --title "revert: automation control-plane phase 1" \
  --body "Rollback of the approved Phase 1 automation change."
```

The revert PR must pass CI and requires the normal explicit merge approval. Vercel then redeploys the reverted revision.

### Stale-row correction is an approved irreversible repair

The first authorised cron or manual bookkeeper invocation after deployment will change founder-scoped `running` rows older than 15 minutes to `failed`, set `completed_at`, and append a structured `stale_timeout` entry to `error_log`. This is a correction of false runtime state, not disposable application data. Existing error history is preserved.

Explicit production approval for this Phase 1 rollout also authorises that stale-row correction. It must not run during PR review, and it must not be automatically reversed: restoring abandoned rows to `running` would recreate the false-green control failure. If a row is later shown to have been active at correction time, restore it only through a separately reviewed, row-specific SQL change backed by the pre-rollout evidence export.

Immediately before the first approved invocation, export the candidate rows (`id`, `founder_id`, `status`, `started_at`, `completed_at`, `error_log`) as rollout evidence. The invocation response must list the exact `recoveredStaleRunIds`; compare that list with the export and halt if they differ.

### Local operator rollback after an approved install

```bash
launchctl unload "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist"
cp "/Users/phill-mac/Pi-CEO/Pi-Dev-Ops/.harness/rollback/automation-phase1-20260710-063053/operator-jobs.plist" \
  "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist"
launchctl load "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist"
plutil -p "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist" | grep StartInterval
```

Expected restored interval: `60` seconds.

### Hermes rollback

No Hermes registry is modified by this PR. If a later ownership change is approved, restore the profile `jobs.json` snapshot only while its gateway is stopped, then validate the registry before starting any scheduler. Never start Empire with Telegram enabled while `default` owns the bot token.

## Known limitation

Without a database-level partial unique index or advisory lock, the bookkeeper preflight prevents normal schedule overlap but cannot eliminate a simultaneous distributed race. That stronger lock requires a Supabase branch and a separately approved schema migration.