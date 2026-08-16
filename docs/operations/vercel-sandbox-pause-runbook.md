# Runbook — pause the `unite-group-sandbox` Vercel project

**Prepared:** 16/08/2026 · **Status:** PREPARED, NOT EXECUTED · **Owner:** Phill

> Executed by a human, or by an agent **with Phill present**. No agent executes
> this autonomously — it changes live external infrastructure. Companion to
> `docs/convergence/cutover-and-deletion-runbook.md`, where this same project is
> item **D7** (hard delete). This runbook is the **reversible predecessor** to
> D7, not a substitute for it.

Claims carry `.claude/rules/fabel-evidence-standard.md` tags.

---

## 1. Why

`[VERIFIED]` `unite-group-sandbox` (`prj_NigC5gA17UvX46n7YBUYSxM1vOh9`) and the
live `unite-group` (`prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`) both deploy
`CleanExpo/Unite-Group` from `main` as their **production** branch, root
directory `apps/web`. Full evidence in
`docs/operations/build-cost-controls.md` §2c.

`[VERIFIED]` It is not idle. Vercel runtime logs, production, 16/08/2026:

| Window | Cron invocations |
|---|---|
| Last 2 h | 34 |
| Last 24 h | 879 (869 × HTTP 200) |

`[VERIFIED]` It tracks `main` live. The 2-hour counts match the **post-#1006**
schedules exactly — `video-status` and `social-publisher` 8 each (`*/15`),
`synthex-monitor` / `drip-process` / `brand-video-dispatch` 4 each (`*/30`),
`os-health-rollup` / `engagement-monitor` / `linear-queue-health` 2 each
(hourly). It redeployed after #1006 merged and is running current code.

`[VERIFIED]` It writes to the production database. Its `bookkeeper` cron logged
`Starting nightly run for founder c3f32c79-0d4a-4607-a906-ba8ca08e83b6`,
completed in 6,111 ms, recorded `runId 09c5f41a-…` and emitted a
`bookkeeper_summary` notification.

`[INFERENCE]` Two consequences, and the second is not a cost issue:

1. Roughly **12,879 invocations/month** are duplicated — half of this repo's
   total Vercel cron volume.
2. Two workers race the same queues. `social-publisher` claims rows by setting
   `status = 'publishing'` **before** attempting them, with no sweep that
   re-claims stale `'publishing'` rows (see #1006). Two concurrent claimants
   make that strand risk materially worse than the single-worker case the
   `*/15` revert was sized against.

## 2. Why pause, and not "repoint off `main`"

`[VERIFIED]` Vercel cron jobs run on the **active production deployment**
([cron-jobs/quickstart](https://vercel.com/docs/cron-jobs/quickstart): "Deploy
the project to the production environment to activate the configured cron
jobs").

`[INFERENCE]` Changing which branch produces *future* production deployments
does not retire the one that already exists. Pointing the project at another
branch would **freeze** `dpl_2u1iWe5…` as the permanent production deployment —
still serving, still firing all 31 crons, still writing to the production
database, with nothing ever arriving to replace it. It would stop the duplicate
*builds* and none of the duplicate *invocations*.

`[VERIFIED]` There is also no branch to point at: `sandbox` does not exist on
`origin` (checked against all 107 remote heads). `apps/web/.portfolio/PORTFOLIO.yaml`
claims `sandbox_branch: sandbox` for every product; that is registry drift.

`[VERIFIED]` Pause is the instrument that matches the intent —
[`POST /v1/projects/{projectId}/pause`](https://vercel.com/docs/rest-api/projects/pause-a-project)
"disables auto-assigning custom production domains and **blocks the active
Production Deployment**."

`[VERIFIED]` Alternatives considered and rejected:

| Option | Why not |
|---|---|
| `vercel crons` disable | No such subcommand — only `ls`, `add`, `run`. |
| `vercel project update` | Covers framework / build command / output directory only. Not the production branch. |
| `git.deploymentEnabled: false` | Lives in the **shared** `apps/web/vercel.json`; would kill deployments for both projects. |
| Rotate the sandbox `CRON_SECRET` | Crons would 401 instead of working — stops the DB writes but still pays for every invocation. Viable belt-and-braces, not a substitute. |

## 3. Blast radius

**Stops:**

- `[INFERENCE]` All 31 cron schedules on this project — the ~12,879/month and
  the duplicate `bookkeeper` / `social-publisher` / `drip-process` writes.
- Its domains stop serving. **Read the current list at execution time rather
  than trusting this one** — it moved underneath this document while it was
  being written:

  ```
  Vercel MCP → get_project
    projectId: prj_NigC5gA17UvX46n7YBUYSxM1vOh9
    teamId:    team_KMZACI5rIltoCRhAtGCXlxUf
  ```

  `[VERIFIED]` Present at both readings on 16/08/2026:
  `unite-group-sandbox-unite-group.vercel.app` and
  `unite-group-sandbox-git-main-unite-group.vercel.app`.
  `[UNCONFIRMED]` The bare `unite-group-sandbox.vercel.app` was listed at
  00:42 UTC and absent at 04:50 UTC. Either it was removed, or the field is
  deployment-scoped and reports differently while a preview build is in flight
  (`latestDeployment.target` was `production` at the first reading and `null` at
  the second). Not resolved — which is exactly why the list is read live in
  Gate 4 rather than copied from here.
- `[VERIFIED]` Side benefit: its `strategy-daily` currently returns HTTP 500 on
  all seven businesses (`authentication_error` — stale `ANTHROPIC_API_KEY`).
  Those recurring 500s leave the error logs.

**Does NOT stop:**

- `[UNCONFIRMED]` **Preview deployments.** The Vercel docs describe pause only
  in terms of production domains and the active production deployment; they do
  not say previews stop. Duplicate preview builds on PRs may continue. Verify in
  step 6 rather than assuming — and if they do continue, the remaining build
  duplication is the argument for proceeding to D7.
- Anything on `unite-group` (the live project). Untouched.

**Unknown before you press it:**

- `[VERIFIED]` Something reached `/auth/login` on the sandbox twice in the last
  2 hours, and `/` twice. `[UNCONFIRMED]` Whether that is a person, a bookmark,
  a monitor, or a bot. Resolve in Gate 4 below.

## 4. Gate — all must be true before executing

- [ ] Phill present and executing, or explicitly supervising
- [ ] Nobody is using `unite-group-sandbox.vercel.app` as a working preview URL
- [ ] The `/auth/login` traffic above is accounted for (a bot or a stale
      bookmark is fine; an active human workflow is not)
- [ ] Domain list re-read live per §3, and no external monitor, uptime check,
      webhook or OAuth redirect URI points at any domain it returns
- [ ] `prj_NigC5gA17UvX46n7YBUYSxM1vOh9` still resolves to name
      `unite-group-sandbox`, and `prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0` to
      `unite-group` (both confirmed 16/08/2026 — re-confirm before pressing,
      because the whole procedure turns on not transposing them)
- [ ] The live project `unite-group` is currently healthy and serving production

**If any gate fails → stop.** Nothing here is urgent enough to skip a gate.

## 5. Execute

Dashboard (preferred — no token handling):

> Vercel → team `unite-group` → project **`unite-group-sandbox`** →
> Settings → General → **Pause Project**

Confirm the project name on screen reads `unite-group-sandbox` before
confirming. `unite-group` is one row away and is production.

REST equivalent, if you would rather script it:

```bash
# Pausing the WRONG project takes production down. Echo it first.
PROJECT_ID=prj_NigC5gA17UvX46n7YBUYSxM1vOh9   # unite-group-sandbox
TEAM_ID=team_KMZACI5rIltoCRhAtGCXlxUf

curl --request POST \
  --url "https://api.vercel.com/v1/projects/${PROJECT_ID}/pause?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```

Expected: HTTP 200, empty body.

Record in the decision log: `[16/08/2026] DECISION: paused Vercel project
unite-group-sandbox | REASON: duplicate production deployment of
CleanExpo/Unite-Group — ~12,879 duplicate cron invocations/month and a second
writer racing social_posts | ALTERNATIVES REJECTED: repoint production branch
(does not retire the existing production deployment), rotate CRON_SECRET (still
billed), hard delete (premature — D7 after soak)`.

## 6. Verify — do not skip the negative control

Wait **70 minutes** after pausing so that at least one hourly schedule and four
`*/15` schedules would have fired.

**6a. The duplicate has stopped.** Expect an empty result, or non-cron paths only:

```
Vercel MCP → get_runtime_logs
  projectId: prj_NigC5gA17UvX46n7YBUYSxM1vOh9
  teamId:    team_KMZACI5rIltoCRhAtGCXlxUf
  environment: production
  since: 1h
  group_by: requestPath
```

Baseline for comparison — the same query returned **34 cron invocations over
2 h** on 16/08/2026 before the pause.

**6b. NEGATIVE CONTROL — the live project still runs.** This is the step that
catches "paused the wrong project", and a green 6a alone cannot distinguish the
two outcomes:

```
Vercel MCP → get_runtime_logs
  projectId: prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0   # unite-group — LIVE
  teamId:    team_KMZACI5rIltoCRhAtGCXlxUf
  environment: production
  since: 1h
  group_by: requestPath
```

**Expect crons still firing here.** An empty result means production is down —
go straight to rollback.

**6c. Production still serves.** Load the live production URL and confirm the
founder login renders.

**6d. Preview behaviour.** On the next PR, check whether the Vercel bot comment
still lists `unite-group-sandbox`. That answers the `[UNCONFIRMED]` in §3.

**6e. After 24 h**, re-run `6a` over `since: 24h` and confirm the count is zero
against the 879 baseline.

## 7. Rollback

`[VERIFIED]` One call, and the inverse of the pause —
[`POST /v1/projects/{projectId}/unpause`](https://vercel.com/docs/rest-api/projects/unpause-a-project):
"enables auto assigning custom production domains and unblocks the active
Production Deployment."

```bash
curl --request POST \
  --url "https://api.vercel.com/v1/projects/${PROJECT_ID}/unpause?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```

Or Settings → General → Resume Project.

No data migration, no state to unwind: pause blocks a deployment, it does not
destroy one. The project, its env vars, its domains and its deployment history
are all still there.

**Rollback triggers:** anything in §3's "unknown" list turning out to matter, or
6b/6c failing.

## 8. Relationship to D7 (hard delete)

`docs/convergence/cutover-and-deletion-runbook.md` already lists **D7 — Vercel
`unite-group-sandbox` (if replaced by monorepo preview flow)** as a hard-delete
item requiring Phill's typed approval per item.

This pause is the **soak** that earns that decision. Suggested sequence:

1. Pause (this runbook).
2. Soak **5 days minimum**, per the deletion runbook's Step 6 convention.
3. If nothing broke, and step 6d showed previews also stop, D7 becomes a
   formality — take the env-var export to 1Password first, per Step 7.
4. If step 6d showed previews continue, D7 is the only way to end the duplicate
   build spend; decide then.

**Do not shortcut to deletion.** Pause is reversible in one call; deletion is
not reversible at all.

## 9. Open questions this runbook does not answer

- `[UNCONFIRMED]` Whether the other five `*-sandbox` projects
  (`ccw-crm-sandbox`, `synthex-sandbox`, `dr-nrpg-sandbox`,
  `restoreassist-sandbox`, `dimitri-itr-sandbox`) carry the same
  duplicate-production wiring. Their repos are outside this session's scope. If
  the pattern holds, each is its own instance of this runbook.
- `[UNCONFIRMED]` Why `unite-group-sandbox` was pointed at `main` rather than a
  sandbox branch in the first place. Worth knowing before recreating anything
  similar.
