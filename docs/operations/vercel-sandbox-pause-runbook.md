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

| Window | Requests to cron paths |
|---|---|
| Last 2 h | 34 |
| Last 24 h | 879 (869 × HTTP 200) |

Labelled precisely: these are requests to `/api/cron/*`, which is what the tool
can measure (see the caveat in §6). Nothing but Vercel's scheduler calls those
paths on this project, and the counts match the schedules exactly, so they are
cron invocations in practice — but the measurement is of path traffic.

`[VERIFIED]` It tracks `main` live. The 2-hour counts match the **post-#1006**
schedules exactly — `video-status` and `social-publisher` 8 each (`*/15`),
`synthex-monitor` / `drip-process` / `brand-video-dispatch` 4 each (`*/30`),
`os-health-rollup` / `engagement-monitor` / `linear-queue-health` 2 each
(hourly). It redeployed after #1006 merged and is running current code.

`[VERIFIED]` It writes to the production database. Its `bookkeeper` cron logged
`Starting nightly run for founder c3f32c79-…`,
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

`[INFERENCE]` **Be clear about which link in that chain is inferred.** The Vercel
docs state that pause blocks the active production deployment, and separately
that crons run on the production deployment. They do **not** anywhere state "a
paused project's cron jobs stop" — that conclusion is mine, joining two
documented facts. It is a short and well-supported join, but it is not a quoted
guarantee, and the whole procedure rests on it. That is precisely what step 6a
measures: if the crons are still firing 70 minutes after the pause, the
inference was wrong, and the answer is to roll back and reach for D7 rather than
to keep waiting.

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

  ```text
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
- [ ] Nobody is using **any** domain returned by the live `get_project` lookup
      in §3 as a working URL (not just the bare `unite-group-sandbox.vercel.app`
      — the list has already changed once, and gating only the domain you
      remember is how you interrupt someone on one of the others)
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
#!/usr/bin/env bash
set -euo pipefail

# Pausing the WRONG project takes production down.
PROJECT_ID=prj_NigC5gA17UvX46n7YBUYSxM1vOh9   # unite-group-sandbox
TEAM_ID=team_KMZACI5rIltoCRhAtGCXlxUf
: "${VERCEL_TOKEN:?VERCEL_TOKEN must be set}"

# 1. Prove the ID is the sandbox BEFORE mutating anything.
name=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --url "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" | jq -r '.name')
[ "$name" = "unite-group-sandbox" ] || { echo "REFUSING: ${PROJECT_ID} is '${name}'"; exit 1; }

# 2. Pause. --fail-with-body turns any non-2xx into a non-zero exit.
curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --url "https://api.vercel.com/v1/projects/${PROJECT_ID}/pause?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" \
  --header "Content-Type: application/json"

# 3. Confirm the STATE, not the response body. A 200 with an empty body is
#    indistinguishable from several failure modes; `paused` is the ground truth.
curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --url "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" \
  | jq '{id, name, paused, live}'
```

**Do not record the decision until step 3 prints `"name": "unite-group-sandbox"`
and `"paused": true`.** The pause endpoint returns an empty body on success, and
an empty body is also what a silently failed request looks like — so the empty
body proves nothing on its own. `[VERIFIED]` `GET /v9/projects/{id}` exposes a
`paused` boolean; that is the check that actually confirms the mutation landed.

`[UNCONFIRMED]` The Vercel MCP's `get_project` returns a trimmed object
(`id`, `name`, `framework`, `live`, `latestDeployment`, `domains`) with **no
`paused` field** in the responses observed on 16/08/2026, and `live` was already
`false` on BOTH projects while neither was paused — so **`live` is not a pause
indicator**. Read `paused` from the REST endpoint above, or from the dashboard,
not from the MCP.

Record in the decision log only after that confirmation, stamping the real
execution time rather than the date this runbook was written:
`[<DD/MM/YYYY HH:MM AEST/AEDT>] DECISION: paused Vercel project
unite-group-sandbox | REASON: duplicate production deployment of
CleanExpo/Unite-Group — ~12,879 duplicate cron invocations/month and a second
writer racing social_posts | ALTERNATIVES REJECTED: repoint production branch
(does not retire the existing production deployment), rotate CRON_SECRET (still
billed), hard delete (premature — D7 after soak)`.

## 6. Verify — do not skip the negative control

Wait **70 minutes** after pausing so that at least one hourly schedule and four
`*/15` schedules would have fired.

**6-zero. The state check is step 3 of §5**, and it is the strongest evidence
available: `"paused": true` on the sandbox project. Everything below corroborates
that the *consequence* followed. If step 3 did not print `paused: true`, stop —
there is nothing to verify yet.

> **What the log queries below can and cannot prove.** `group_by: requestPath`
> counts **every** request to a path, not only cron-triggered ones. Vercel does
> tag cron invocations (`User-Agent: vercel-cron/1.0`, an
> `x-vercel-cron-schedule` header, and `requestType: cron` in the dashboard log
> filters), but `[VERIFIED]` the MCP `get_runtime_logs` tool exposes none of
> them: its filters are `environment`, `level`, `statusCode`, `source`,
> `requestId` and a full-text `query`, and a `query: "vercel-cron"` over a
> 2-hour window in which crons demonstrably fired returned **"No logs found"** —
> the full-text search covers log bodies, not request headers.
>
> So treat a path count as *traffic to a cron path*, not as proof of a cron
> invocation. That asymmetry is fine for 6a, where **zero** traffic is
> conclusive, and weak for 6b, where non-zero traffic is only strong evidence
> because nothing but Vercel's scheduler calls `/api/cron/*` on this project.
> For a decisive 6b, use the dashboard's Cron Jobs page (Project → Settings →
> Cron Jobs → View Logs), which applies the real cron filter.

**6a. The duplicate has stopped.** Expect an empty result, or non-cron paths only:

```text
Vercel MCP → get_runtime_logs
  projectId: prj_NigC5gA17UvX46n7YBUYSxM1vOh9
  teamId:    team_KMZACI5rIltoCRhAtGCXlxUf
  environment: production
  since: 1h
  group_by: requestPath
```

Baseline for comparison — the same query returned **34 requests to cron paths
over 2 h** on 16/08/2026 before the pause. Keep the window (`since: 1h`) shorter
than the elapsed time since the pause, or it will include pre-pause traffic and
look like a failure.

**6b. NEGATIVE CONTROL — the live project still runs.** This is the step that
catches "paused the wrong project", and a green 6a alone cannot distinguish the
two outcomes:

```text
Vercel MCP → get_runtime_logs
  projectId: prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0   # unite-group — LIVE
  teamId:    team_KMZACI5rIltoCRhAtGCXlxUf
  environment: production
  since: 1h
  group_by: requestPath
```

**Expect cron-path traffic still here.** An empty result means production is
down — go straight to rollback.

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

**Self-contained on purpose** — rollback gets run in a fresh shell, under
pressure, possibly by someone who did not run §5. It redefines its own
identifiers rather than inheriting them: an unset `PROJECT_ID` would otherwise
build `.../projects//unpause`, and a stale one would target whatever the last
person exported.

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=prj_NigC5gA17UvX46n7YBUYSxM1vOh9   # unite-group-sandbox
TEAM_ID=team_KMZACI5rIltoCRhAtGCXlxUf
: "${VERCEL_TOKEN:?VERCEL_TOKEN must be set}"

name=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --url "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" | jq -r '.name')
[ "$name" = "unite-group-sandbox" ] || { echo "REFUSING: ${PROJECT_ID} is '${name}'"; exit 1; }

curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --url "https://api.vercel.com/v1/projects/${PROJECT_ID}/unpause?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" \
  --header "Content-Type: application/json"

curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --url "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  --header "Authorization: Bearer ${VERCEL_TOKEN}" \
  | jq '{id, name, paused, live}'
```

Confirm `"paused": false`. Or Settings → General → Resume Project.

`[UNCONFIRMED]` Vercel's own documentation notes that `live` can remain `false`
after unpausing, and suggests triggering a new production deployment or using the
dashboard if the state does not settle. Judge the rollback on `paused`, and on
6b-style traffic returning — not on `live`.

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
