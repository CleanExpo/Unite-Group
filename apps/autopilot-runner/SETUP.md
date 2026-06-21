# Stage-3 Autopilot Runner — Phase-0 setup (Phill)

The runner code is built + tested ([spec](../spec-board/projects/stage3-autopilot-runner/spec.md)).
This is the one-time setup that makes it live — ~15 min. Everything that could be
automated is done; what remains needs **your** GitHub/Railway auth + secrets
(which I'm not permitted to handle).

## Already done (by Claude)

- **Railway project + service shell** created (kill switch off, drains until you flip it):
  - Project: **autopilot-runner** — <https://railway.com/project/b24894fe-8197-4c01-a96b-f366cd72e1c6>
  - Service: `autopilot-runner` · env `production`
  - `CC_LINEAR_LIVE=0` set.
- Dockerfile + entrypoint + adapters in `apps/autopilot-runner/`.

## Step 1 — Connect the Railway service to the repo

1. Railway dashboard → **autopilot-runner** → the service → **Settings → Source**.
2. Connect GitHub repo `CleanExpo/Unite-Group` (authorise Railway's GitHub app on the repo if prompted).
3. **Root Directory** = `apps/autopilot-runner` · **Branch** = `main`. Railway auto-detects the Dockerfile.
4. Don't deploy yet — secrets first (Step 3).

## Step 2 — Create TWO GitHub Apps (CleanExpo)

GitHub → Settings → Developer settings → **GitHub Apps → New GitHub App**. Two identities,
because GitHub forbids approving your own PR — the runner authors, the reviewer approves.

**App A — `unite-autopilot-runner` (author)**
- Repository permissions: **Contents: Read & write** · **Pull requests: Read & write** · **Metadata: Read-only**.
- Install **only on this account**, on `CleanExpo/Unite-Group`.
- Capture: **App ID** · a generated **private key** (.pem) · the **Installation ID** (in the install URL).

**App B — `unite-autopilot-reviewer` (approver)**
- Repository permissions: **Pull requests: Read & write** (to submit approving reviews) · **Contents: Read-only** · **Metadata: Read-only**.
- Install on `CleanExpo/Unite-Group`. Capture App ID · private key · Installation ID.

## Step 3 — Paste secrets on the Railway service

Railway → service → **Variables**. The adapter code is written to these exact names:

| Variable | Value |
|---|---|
| `HANDOFF_URL` | `https://unite-group.in/api/cron/linear-handoff` |
| `CRON_SECRET` | same value as `apps/web`'s `CRON_SECRET` (Vercel) |
| `ANTHROPIC_API_KEY` | a Claude key for the runner's authoring |
| `GH_RUNNER_APP_ID` · `GH_RUNNER_PRIVATE_KEY` · `GH_RUNNER_INSTALLATION_ID` | App A |
| `GH_REVIEWER_APP_ID` · `GH_REVIEWER_PRIVATE_KEY` · `GH_REVIEWER_INSTALLATION_ID` | App B |
| `CC_LINEAR_LIVE` | leave `0` for the first dry run; set `1` to go live |

Paste each `.pem`'s full contents (newlines and all) as the `*_PRIVATE_KEY` value.

## Step 4 — Tell me you're done

I'll wire the GitHub-App + Claude-authoring adapters to these exact var names, deploy, and
we watch one run with `CC_LINEAR_LIVE=0` (drains, proves the read-side) before flipping to
`1` on a seeded `mesh:auto` / `pi-dev:autonomous` issue.

## Safety recap (unchanged from the spec)

- `main` branch protection stays (1 review) — **App B** satisfies it only after the
  adversarial gauntlet re-passes. Branch protection is **not** relaxed.
- The runner holds **none** of: Supabase admin, prod DB, deploy, or deletion capability.
- `CC_LINEAR_LIVE=0` drains the loop instantly — your kill switch.
- Only `mesh:auto` / `pi-dev:autonomous`-labelled issues are claimable, so the regulated
  Duncan legal phases and any human-gated issue can never be auto-claimed.
