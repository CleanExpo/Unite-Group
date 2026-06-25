# @unite/autopilot-runner

Stage-3 Autopilot Runner — the hosted executor that lets the deployed Unite-Group
app run the Linear autonomous loop **unattended, off the Mac**.

**Spec:** [`apps/spec-board/projects/stage3-autopilot-runner/spec.md`](../spec-board/projects/stage3-autopilot-runner/spec.md)
**Linear:** epic context under the [Duncan Perkins Ventures] / autopilot work; build issue [UNI-2143] lineage.

> Auto-push infrastructure. The security model is the centre of gravity — see spec §7.

## Status

Early build. This package currently ships the **safety core** only:

- `src/merge-policy.ts` — the pure, fail-closed predicate that decides whether a
  runner-authored PR may merge, must wait, or must be left for a human. The only
  path to `merge` is: green CI ∧ adversarial-evaluator approval ∧ an existing
  autonomous-contract label (`mesh:auto` / `pi-dev:autonomous`) ∧ base `main` ∧
  linear history ∧ live gate on ∧ runner-authored.

Not yet built (see spec §5): packet ingestion from `/api/cron/linear-handoff`,
ephemeral worktree + gauntlet, GitHub-App PR/merge wiring, tiered-context Claude
authoring, audit + kill switch, Railway deploy. Each lands as its own PR.

## Develop

```bash
cd apps/autopilot-runner
npm install
npm test          # vitest
npm run type-check
```

This package keeps its own lockfile/toolchain (root is not a pnpm workspace).

## Guardrails (non-negotiable, from the spec)

- No prod DB writes, no prod deploys, no deletions, no secret handling, no
  access-control changes — these capabilities are absent from the runner's
  environment, not merely "not called".
- `main` branch protection (1 required review) is kept; a distinct reviewer
  GitHub App satisfies it only after an independent gauntlet re-passes.
- `CC_LINEAR_LIVE=0` drains the loop instantly.

## Agent presence heartbeat

Separate from the Linear loop, the runner can publish a **presence heartbeat** so
the live Unite-Group command-centre (`/founder/command-centre/operator-gateway`)
shows this machine as a connected Hermes agent.

```bash
npm run build
npm run heartbeat        # node dist/heartbeat.js — loops until SIGINT/SIGTERM
```

It upserts `operator_agent_presence` (founder-scoped) every ~15s via PostgREST.
The command-centre derives `connected` (<30s) / `stale` (<5m) / `offline` from
`last_seen_at`.

Required env (same identity the CRM crons use):

| Var | Purpose |
|---|---|
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Write auth (bypasses RLS; `founder_id` still set explicitly) |
| `FOUNDER_USER_ID` | Single-tenant founder id |

Optional: `HERMES_AGENT_ID` (default hostname), `HERMES_AGENT_VERSION`,
`HERMES_AGENT_CAPABILITIES` (JSON), `HERMES_HEARTBEAT_INTERVAL_MS` (default 15000,
floor 1000). The agent dials **out** to Supabase — no inbound exposure. Missing a
required var fails closed (exit 1) rather than silently never beating.

### Run it persistently (macOS launchd)

To keep the heartbeat alive across reboots / terminal exit (not tied to a shell):

```bash
bash scripts/install-heartbeat-service.sh
```

This installs a LaunchAgent (`in.unite-group.hermes-heartbeat`) that runs
`scripts/heartbeat-launchd.sh` with `KeepAlive`. **No secrets in the plist** — the
wrapper sources them from the repo-root `.env.local`. Manage it with:

```bash
launchctl list | grep hermes-heartbeat                 # PID = running
tail -f ~/Library/Logs/hermes-heartbeat.log            # logs
launchctl unload ~/Library/LaunchAgents/in.unite-group.hermes-heartbeat.plist  # stop
```

## Operator-jobs poller (Step 2b — gated work dispatch)

Claims `operator_jobs` from prod Supabase, runs a SAFE gated execution, and
streams `operator_events` back so the command-centre shows live job progress.

```bash
npm run build
CC_OPERATOR_JOBS_LIVE=1 npm run operator-jobs    # one bounded sweep, then exits
```

Safety (gates reused from apps/web, not bypassed):
- **Kill switch**: nothing runs unless `CC_OPERATOR_JOBS_LIVE=1` (default off → drains).
- **Founder-scoped**, lifecycle-legal transitions only (`queued→running→{done,blocked}`).
- **Hard-gated task types** (`production_deploy`, `production_db_write`, `payments`,
  `email_send`, `claims_orders`, `secrets_access`) and any `external/production/api_key`
  flag → job is **blocked** with a `gate_blocked` event. Never executed.
- **Tier 1 execution** = read-only introspection only (`diagnostic` / `evidence_audit`
  / `verification`) — no user-supplied commands, no `claude -p`. Other safe task
  types are blocked pending a Tier 2 executor (not wired).

Env: `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`,
`FOUNDER_USER_ID`. Run on a schedule (launchd/cron) alongside the heartbeat.
