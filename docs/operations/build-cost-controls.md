# Build & deploy cost controls

**Date:** 15/08/2026 · **Scope:** `CleanExpo/Unite-Group` CI and Vercel spend

Claims below carry the `.claude/rules/fabel-evidence-standard.md` tags. Read the
`[VERIFIED]` lines as fact, the `[INFERENCE]` lines as reasoning from them, and
the `[UNCONFIRMED]` lines as open questions that still need a founder decision or
a live reading.

---

## 1. The headline correction: GitHub Actions is not costing anything

`[VERIFIED]` The repository is public. Vercel deployment metadata for the
current production deployment (`dpl_Dsj4URJBCamTHac8cSZaXx6fP5Jg`) reports
`"githubRepoVisibility": "public"`.

`[VERIFIED]` Standard GitHub-hosted runners are unmetered on public
repositories on every plan, and the January 2026 per-minute price changes apply
to private repositories only —
[GitHub Actions pricing changes](https://github.com/resources/insights/2026-pricing-changes-for-github-actions),
[GitHub Actions billing docs](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions).

`[INFERENCE]` The CI matrix is therefore **not** a cost lever. This includes the
things that look expensive and are not:

- `mcp-windows` runs on `windows-2025`. On a private repo that carries a 2×
  minute multiplier; on this public repo it is free.
- 15 jobs run on every pull request with no path filtering. Wall-clock only.
- There is no `concurrency: cancel-in-progress`, so superseded runs finish
  instead of being cancelled. Wall-clock and queue contention only.

**Do not trim CI coverage to "save minutes" — there are none to save.** Adding
`concurrency` is still defensible for faster feedback and less queue noise, but
it is an ergonomics change, not a cost change, and should be argued as one.

## 2. Where the money actually goes: Vercel

Two distinct Vercel surfaces, addressed separately below.

### 2a. Builds on changes that cannot affect the build

`[VERIFIED]` Vercel builds a preview deployment on every push to a PR branch and
a production build on every push to `main`.

`[VERIFIED]` Of the last 50 commits to `main`, 16 (32%) changed nothing under
`apps/web`. Of the last 30 replayed through the new ignore step, 11 (37%) would
now skip the build entirely.

`[VERIFIED]` A production build takes roughly 1 minute of build execution plus a
~519 MB build-cache upload (measured on `dpl_Dsj4URJBCamTHac8cSZaXx6fP5Jg`).

**Control:** `apps/web/vercel.json` now sets
`"ignoreCommand": "node ../../scripts/vercel-ignore-build.mjs"`.

The script exits 0 (skip) only when it can prove no changed file affects an
`apps/web` build. Every ambiguous path — missing baseline SHA, a commit absent
from Vercel's shallow clone, a failed `git diff` — exits 1 (build).

`[INFERENCE]` The asymmetry is deliberate and not close: a needless build costs
about a minute of build time, whereas a wrongly skipped build leaves production
serving the previous deployment while the fix sits merged and undeployed. That
is a silent stale-production incident that looks exactly like a successful
merge. Ambiguity always builds.

`[VERIFIED]` The trigger set is wider than `apps/web/`. The app's `prebuild`
runs `sync-portfolio-registry.mjs` and `sync-capability-registry.mjs`, which
read `.portfolio/PORTFOLIO.yaml`, `.claude/agents`, `.claude/skills` and
`.mcp.json` from the repo root (confirmed in `apps/web/scripts/sync-*.mjs`).
Editing a skill definition changes the shipped bundle without touching one file
under `apps/web/`. That list lives once, in
`scripts/lib/web-build-inputs.mjs`, and a test asserts it still matches what the
sync scripts read.

`[INFERENCE]` Vercel's clone includes files outside the Root Directory. It must:
the existing `prebuild` already reads `../../.portfolio` and `../../.claude`, and
production builds succeed. So `../../scripts/` will resolve the same way.

### 2b. Cron invocations — the recurring cost

Run `npm run cron:audit` for the live figures.

`[VERIFIED]` **Before (15/08/2026):** 31 crons, ~885 invocations/day,
~26,559/month, with 8 sub-hourly schedules producing ~25,920 of those —
**97.6% of all invocations**. The other 23, all daily or weekly, contributed
~639 between them.

`[VERIFIED]` **After:** ~429 invocations/day, ~12,879/month by the audit's
arithmetic. **A 51.5% reduction — 13,680 invocations/month removed.**

`[UNCONFIRMED]` That after-figure is computed from the cron expressions, not
read from a Vercel bill. It is exact arithmetic over the schedule, but it is a
projection of invocation COUNT, not a measured charge. Confirm against live
usage after a full billing period.

| Path | Before | After | Per month |
|---|---|---|---|
| `/api/cron/video-status` | `*/5` | `*/15` | 8,640 → 2,880 |
| `/api/cron/synthex-monitor` | `*/15` | `*/30` | 2,880 → 1,440 |
| `/api/cron/brand-video-dispatch` | `*/15` | `*/30` | 2,880 → 1,440 |
| `/api/cron/drip-process` | `*/15` | `*/30` | 2,880 → 1,440 |
| `/api/cron/os-health-rollup` | `*/15` | `0 * * * *` | 2,880 → 720 |
| `/api/cron/engagement-monitor` | `*/30` | `0 * * * *` | 1,440 → 720 |
| `/api/cron/linear-queue-health` | `*/30` | `0 * * * *` | 1,440 → 720 |
| `/api/cron/social-publisher` | `*/15` | **unchanged** | 2,880 — see below |

### Why seven were safe, and why social-publisher was not

`[VERIFIED]` The first version of this section claimed two properties made all
eight safe: no interval-coupled lookback, and no per-run throughput cap. The
first holds. **The second was wrong, and review on PR #1005 caught it.**

`[VERIFIED]` **1. No interval-coupled lookback (holds for all eight).** None
selects work by a time window tied to its own cadence. They drain by STATE —
`status = 'scheduled' AND scheduled_at <= now()`, `status = 'generating'`,
`status = 'queued'`, `status = 'active'`. The only time window anywhere is
os-health-rollup's `MARGOT_WINDOW_DAYS`, measured in days and cadence-independent.

`[VERIFIED]` **2. The absence of a `.limit()` does NOT mean unbounded-safe.**
`maxDuration` is itself an effective per-run cap, and the real hazard is not
throughput — it is **claim-then-finalise state**. `social-publisher` iterates
posts SERIALLY, sets each row to `status = 'publishing'` BEFORE attempting its
platforms, and only writes the terminal status afterwards. `maxDuration` is 60s.
A batch killed at that limit strands every already-claimed row: the next run
selects `status = 'scheduled'` and will never see it again, and **nothing in the
codebase re-claims stale `'publishing'` rows** (`bookkeeper` has such a sweep;
social_posts has none). Halving the cadence doubles the batch, so it *raises*
that risk rather than lowering it. It stays at `*/15`.

`[VERIFIED]` The other seven do not have that shape. `video-status` writes only
TERMINAL states (`ready`, `failed`) after polling, so a killed batch leaves rows
in `generating` to be re-polled. `drip-process` and `brand-video-dispatch` hold
their selection state (`active`, `queued`) throughout. No claim, no strand.

### The test to apply before slowing any cron

`[INFERENCE]` Ask, in order:

1. Does it select work by a window tied to its own interval? → do not slow it.
2. **Does it write a transient status that removes the row from its own
   selection query, without a recovery sweep for rows stuck in that status?**
   → do not slow it; a bigger batch means more stranded rows.
3. Otherwise slowing it delays work but cannot drop it.

Question 2 is the one that is easy to miss, and the one that was missed here.
"No `.limit()`" is not the same as "safe to stretch".

`[UNCONFIRMED]` The remaining user-visible cost is latency on the seven that did
change — all monitoring, dispatch or polling loops. None publishes to an external
audience on a schedule a human is watching, which is why social-publisher was the
only one worth protecting.

`[VERIFIED]` Two routes are dormant-gated and still invoked on schedule:
`/api/cron/email-draft` (`MARGOT_DRAFTS_ENABLED`) and `/api/cron/cost-ingest`
(`COST_METERING_ENABLED`). Both are daily — 60 invocations/month combined, 0.2%
of total. They fail closed correctly and are **not** a meaningful lever today.
The audit reports them so that a future dormant route on a tight schedule is
caught before it runs for a month.

`[VERIFIED]` Every configured cron path resolves to a real route file — there
are no scheduled 404s. Asserted by `scripts/__tests__/cron-cost-audit.test.mjs`.

## 3. Pre-testing PRs locally

`npm run preflight` runs the CI gates your diff actually trips, on your own
machine, before the push that spends money.

```
npm run preflight          # gates your diff vs origin/main trips
npm run preflight:list     # show what would run, run nothing
npm run preflight:all      # every gate, ignore the diff
```

Cheap gates (seconds in CI) always run; expensive `verify:*` chains run only
when the change touches something they cover. Uncommitted and untracked files
count, so it is useful before the commit, not just before the push.

`[VERIFIED]` Four CI jobs cannot run on a developer machine and are reported as
such rather than silently omitted: `mcp-windows` (Windows runner), `mcp-musl`
(Alpine container), `e2e` (needs `E2E_SUPABASE_*` secrets), `gitleaks` (needs the
binary). A green preflight does not claim these passed.

`[VERIFIED]` `scripts/__tests__/preflight.test.mjs` asserts every job in
`ci.yml` is either mirrored in `scripts/lib/preflight-jobs.mjs` or listed as
explicitly unreproducible. It runs in the `project-readiness` CI job.

`[INFERENCE]` That test is the load-bearing part. Preflight's entire value is a
claim about CI — "green here means green there" — and a stale preflight is worse
than none, because it green-lights a push whose failure rides along with a
Vercel build that has already been paid for.

## 4. Known gaps

`[VERIFIED]` `verify:web` was **not** run locally while preparing this change.
This container has Node v22.22.2; the repo requires `>=24.14.1 <25`. The
`apps/web` edit is confined to `vercel.json`, which is configuration rather than
compiled input, and CI runs the full gate. On a machine with Node 24, preflight
runs it normally.

`[VERIFIED]` Three tests in `scripts/__tests__/workflow-supply-chain.test.mjs`
fail on this container — "operator launcher scrubs unrelated ambient secrets",
"operator launcher resolves a symlink before exposing the gateway key",
"workspace installer resolves its own symlink before invoking the pinned
helper". They fail identically on a clean `origin/main` worktree, so they are
pre-existing and unrelated to this change. `[UNCONFIRMED]` The cause is likely
running as root in a container affecting the symlink/permission assertions;
that has not been confirmed and they pass in CI.

`[UNCONFIRMED]` There are 21 Vercel projects on the `unite-group` team,
including six `*-sandbox` projects. Idle projects do not bill for builds, but
any carrying their own crons or ISR would. Not audited here — `cron:audit`
currently covers `apps/web` only.
