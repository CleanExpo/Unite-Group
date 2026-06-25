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
