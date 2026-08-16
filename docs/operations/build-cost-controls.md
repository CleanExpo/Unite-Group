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

> **Both figures are per-project, and the schedule runs on two projects.**
> Across `unite-group` and `unite-group-sandbox` the real totals are ~53,000/month
> before and ~25,758/month after. See §2c — that duplication is a larger lever
> than the schedule change documented here.

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

### 2c. Everything above is billed TWICE — `unite-group-sandbox`

`[VERIFIED]` Two Vercel projects build from `CleanExpo/Unite-Group` and both
treat `main` as their **production** branch: `unite-group`
(`prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`) and `unite-group-sandbox`
(`prj_NigC5gA17UvX46n7YBUYSxM1vOh9`). The last 20 deployments on each match
pair-for-pair, same commit SHAs, seconds apart — e.g. `#1006`'s merge commit
`0a2d3bf` produced `dpl_AfEe9zx…` at `1786840309475` and `dpl_2u1iWe5…` at
`1786840309692`, 217 ms apart, both `target: "production"`.

`[VERIFIED]` The duplicate is not idle. Vercel runtime logs for
`unite-group-sandbox`, production environment, last 24 h: **879 cron requests,
869 of them HTTP 200**, with per-path counts identical to the live project —
`video-status` 285, `social-publisher` / `synthex-monitor` / `drip-process` /
`brand-video-dispatch` 96 each, `os-health-rollup` 95, `engagement-monitor` and
`linear-queue-health` 47 each, plus every daily cron once.

`[INFERENCE]` **Every figure in §2b is therefore half the real number.** The
cron total for this repo is ~25,758 invocations/month across the two projects,
not ~12,879, and the pre-change figure was ~53,000, not ~26,559. Likewise every
build in §2a is paid for twice — build execution and the ~519 MB cache upload
alike. The `ignoreCommand` does apply to both, so the skip logic is not lost.

`[VERIFIED]` **It also writes to production data.** `unite-group-sandbox`'s
`bookkeeper` cron logged `Starting nightly run for founder
c3f32c79-0d4a-4607-a906-ba8ca08e83b6`, completed in 6,111 ms, recorded a run
(`runId 09c5f41a-…`) and emitted a `bookkeeper_summary` notification. That is
the real founder against the real database, from a second deployment. The
`social-publisher` claim-then-finalise hazard in §2b is materially worse under
two concurrent workers selecting the same `status = 'scheduled'` rows.

`[VERIFIED]` One route does fail closed there: `strategy-daily` returns 500 on
all seven businesses with `authentication_error / Invalid authentication
credentials` from the Anthropic API, so the duplicate is **not** doubling AI
spend on that route. `[INFERENCE]` The project holds a stale `ANTHROPIC_API_KEY`.

`[UNCONFIRMED]` Whether `unite-group-sandbox` serves any purpose. It has its own
`unite-group-sandbox.vercel.app` domain but deploys `main`, not a sandbox
branch, so it is a second copy of production rather than a staging surface.
Changing or removing a Vercel project needs the runbook gates and Phill's typed
approval, so nothing has been altered.

`[INFERENCE]` The reversible fix, cheapest first: repoint the project's
production branch away from `main` (crons only run on production deployments,
so they stop), or disconnect its Git integration, before considering deletion.

`[UNCONFIRMED]` Five other `*-sandbox` projects exist on the team
(`ccw-crm-sandbox`, `synthex-sandbox`, `dr-nrpg-sandbox`,
`restoreassist-sandbox`, `dimitri-itr-sandbox`). Whether they carry the same
duplicate-production wiring has not been checked — their repos are outside this
session's scope.

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

`[VERIFIED]` There are 21 Vercel projects on the `unite-group` team, including
six `*-sandbox` projects. One of them — `unite-group-sandbox` — is the duplicate
production deployment documented in §2c. `unite-hub`
(`prj_itIVI65mEaKlCtCnkjyrDq7k3Mvu`) has `latestDeployment: null` and no
domains: genuinely idle, so it bills nothing, but it is registry noise.
`[UNCONFIRMED]` The remaining projects have not been checked for their own crons
or ISR. `cron:audit` reads `apps/web/vercel.json` only, so it cannot see a cron
belonging to another project.

`[VERIFIED]` `apps/web/.portfolio/PORTFOLIO.yaml` has drifted from live Vercel
state: it records `unite-hub` as `prj_y8hsRwhZHe6ewe6wCbwMbBYx20yp` and
`carsi-web` as `prj_hIQAdXiHQGGec6nNKEGzn7SyMh9p`; the live IDs are
`prj_itIVI65mEaKlCtCnkjyrDq7k3Mvu` and `prj_Z1kVQZBIhFAR4JrGZ6rMrJ5zKvNF`. It
also lists `ato-app-sandbox`, `carsi-web-sandbox`, `pi-dev-ops-sandbox` and
`disaster-recovery-sandbox`, none of which exist on the team today. Not a cost
in itself — a reason not to trust the registry when sizing one.

## 5. AI spend — currently unmeasurable

`[VERIFIED]` Nothing in this codebase can report what the Claude API actually
costs. `apps/web/src/lib/ai/cost-tracker.ts` accumulates into a module-level
`const usageMap = new Map<string, UsageEntry>()`, which does not survive a
serverless invocation, and `/api/cron/cost-ingest` returns `{ dormant: true }`
while `COST_METERING_ENABLED` is unset, with `COST_FETCHERS` empty.

`[INFERENCE]` Every AI cost statement below is therefore sized from
configuration — model, `max_tokens`, call frequency — not from a bill. Arming
metering is the prerequisite for any AI cost decision worth making.

`[VERIFIED]` The largest identifiable recurring lever is `strategy-daily`.
`apps/web/src/lib/strategy/daily-analysis.ts:107` requests
`ANTHROPIC_MODELS.OPUS` (`claude-opus-4-8`) with `max_tokens: 16000` and
`thinking: { type: 'adaptive' }`, and `vercel.json` schedules it seven times a
day, one per business — **210 Opus calls/month**.

`[VERIFIED]` Anthropic list pricing, per million tokens: Opus 5 and Opus 4.8
$5 in / $25 out; Sonnet 5 $3 / $15 ($2 / $10 introductory through 31/08/2026);
Haiku 4.5 $1 / $5. Verified live 16/08/2026 — https://claude.com/pricing

`[UNCONFIRMED]` Whether Sonnet 5 is sufficient for daily strategy analysis is a
product judgement, not a cost one, and is left to the founder. No model has been
changed.

`[VERIFIED]` The coaches are already tuned and are **not** a lever: all four in
`apps/web/src/lib/coaches/types.ts` use `ANTHROPIC_MODELS.HAIKU` with
`maxTokens` between 1000 and 1500.

`[VERIFIED]` The Opus `coach` capability (12k tokens, adaptive thinking) is
called by `/api/coaches/ask` — on demand from the UI, not by a cron — so it is
not recurring scheduled spend.
