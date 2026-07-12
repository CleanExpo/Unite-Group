# @unite/autopilot-runner

Bounded execution and reconciliation workers for the Unite-Group control plane.
The package contains the Stage-3 Linear safety core, the Hermes presence bridge,
and the CRM-authoritative OWNEST projection worker.

**Spec:** [`apps/spec-board/projects/stage3-autopilot-runner/spec.md`](../spec-board/projects/stage3-autopilot-runner/spec.md)
**Linear:** epic context under the [Duncan Perkins Ventures] / autopilot work; build issue [UNI-2143] lineage.

> Auto-push infrastructure. The security model is the centre of gravity — see spec §7.

## Status

- `src/merge-policy.ts` is the fail-closed Stage-3 merge predicate. A merge still
  requires every independent contract, CI, authorship, history, and live gate.
- `src/ownest/*` implements the strict CRM, policy, Hermes, receipt, STOP, and
  reconcile-first control-plane slices for one nominated advisory canary.
- `src/ownest-tick.ts` performs one bounded sweep and exits; launchd supplies the
  cadence. New admission remains off until the canary is explicitly armed.
- `operator_jobs` is a superseded queue surface. Its old LaunchAgent must remain
  unloaded; OWNEST does not consume that queue.

The broader hosted Linear authoring/gauntlet/deployment executor remains outside
this cut. OpenClaw is a migration source exposed through Hermes tooling, not the
active executor or a second model runtime.

Current activation state (2026-07-12): the dedicated OWNEST profile is
sanitised and its MoA configuration validates, but the durable runtime checkout
and `in.unite-group.ownest` LaunchAgent are not installed and the canary remains
disarmed. The implementation is ready for gated verification; this document
does not claim a live autonomous worker.

## Develop

```bash
cd apps/autopilot-runner
npm ci
npm test          # vitest
npm run type-check
```

This package keeps its own lockfile/toolchain (root is not a pnpm workspace).

## Guardrails (non-negotiable, from the spec)

- OWNEST's only production write authority is the founder-scoped CRM mission
  ledger, task events, evidence records, and deterministic validation artifacts.
  It has no authority for product-domain data, deployment, spend, publication,
  deletion, access control, credential disclosure, or merge.
- The CRM adapter uses a service-role credential, which bypasses RLS; every read
  and write therefore binds the configured founder explicitly and fails closed
  on an unrecognised row, origin, redirect, response, or compare-and-set result.
- `main` branch protection (1 required review) is kept; a distinct reviewer
  GitHub App satisfies it only after an independent gauntlet re-passes.
- `CC_LINEAR_LIVE=0` drains the loop instantly.
- CRM `cc_tasks` is authoritative for OWNEST. Hermes Kanban is a disposable
  execution projection and cannot promote, reopen, or complete CRM work by
  itself.

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

## OWNEST CRM-to-Hermes control plane

One OWNEST tick always reconciles existing managed CRM missions first. With
`CC_OWNEST_LIVE=0`, cancellation, STOP, lease, retry, dead-letter, receipt, and
terminal-state repair remain active, but no queued task can be admitted. With
the switch on, the first rollout can admit only the exact configured canary; it
never scans for or falls back to another queued task.

The canary must be queued, advisory, low/medium risk, owned by Hermes/Nexus/Empire,
approval-free, dependency-free, structurally valid, and free of gated action
language. Production/database mutation, spend, outbound messages/publication,
secrets or privilege changes, destructive/access-control work, merge, high-risk
work, and approval-required work always remain blocked.

Required environment:

| Variable | Rule |
|---|---|
| `SUPABASE_URL` | Explicit CRM origin. Required when live; never inferred from a production default. |
| `NEXT_PUBLIC_SUPABASE_URL` | Required when live and must resolve to the same origin as `SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | CRM adapter credential; never logged or placed in Hermes/CRM metadata. |
| `FOUNDER_USER_ID` | Founder scope bound into every CRM operation. |
| `CC_OWNEST_WORKER_ID` or `HERMES_AGENT_ID` | Stable lease owner identity. |

Canary controls:

| Variable | Default / canary rule |
|---|---|
| `CC_OWNEST_LIVE` | `0`; only exact `1` enables admission. |
| `CC_OWNEST_ROLLOUT_ID` | Required when live; binds quotas and receipts. |
| `CC_OWNEST_CANARY_TASK_ID` | Required when live; the only admissible task. |
| `CC_OWNEST_HERMES_PROFILE` | `ownest`; must remain exact when live. |
| `CC_OWNEST_HERMES_BOARD` | `unite-group-ownest`; must remain exact when live. |
| `CC_OWNEST_CANARY_LIMIT` | `1`; the parser's hard ceiling is 3, but the canary requires 1. |
| `CC_OWNEST_MAX_IN_PROGRESS` | `1`; the canary requires 1. |
| `CC_OWNEST_DAILY_DISPATCH_LIMIT` | `1`; the canary requires 1. |
| `CC_OWNEST_LEASE_MS` | `300000`, bounded from 60 seconds to 30 minutes. |
| `HERMES_CWD` | Runtime repository root used for fixed-argv Hermes calls. |

Run one bounded sweep:

```bash
npm run build
npm run ownest
```

The single JSON log line is `ownest.tick.summary.v1` and contains no credential.
A valid completion requires the bound Hermes receipt, independent validation
rows, evidence record, `evidence_added` event, and `completed` event before the
CRM task can compare-and-set to `done`.

Install the one-minute launchd cadence in forced live-off mode:

```bash
OWNEST_NODE_BIN="$HOME/.nvm/versions/node/v22.22.3/bin/node" \
  bash scripts/install-ownest-service.sh --dry-run

VERIFIED_SHA="<full tested and pushed 40-character commit SHA>"
OWNEST_NODE_BIN="$HOME/.nvm/versions/node/v22.22.3/bin/node" \
  bash scripts/install-ownest-service.sh --verified-commit "$VERIFIED_SHA"
launchctl print "gui/$(id -u)/in.unite-group.ownest"
tail -f "$HOME/Library/Logs/unite-ownest.log"
```

Actual installation is accepted only from the clean dedicated checkout at
`~/Unite-Group-OWNEST`, pinned to the exact verified commit and carrying a local
`.env.local` that is not group/world-accessible. The plist pins the Node binary
resolved at install time and requires Node 22. The installer also attests the
GitHub origin, exact tested SHA, and an origin remote-tracking ref. A disposable
Codex/Claude worktree is not a durable launchd target; `--dry-run` remains
available there for build/plist verification.

The wrapper uses a non-blocking `lockf` lock, so a delayed tick, a manual run,
and launchd cannot execute concurrently. The plist contains no credentials and
sets `CC_OWNEST_FORCE_LIVE_OFF=1`; arming is deliberately not part of install.
The wrapper launches Node through a strict CRM/OWNEST environment allowlist, and
the Node adapter launches Hermes through a second environment that excludes the
CRM service-role and all ambient provider/application credentials.

Before the first canary, minimise and attest the dedicated Hermes profile:

```bash
bash scripts/sanitize-ownest-profile-env.sh
hermes --profile ownest config check
hermes --profile ownest moa list
```

The sanitizer accepts only the OWNEST OpenRouter route, optional Browser Use
route, and non-secret TAO runtime settings. It requires one non-empty
`OPENROUTER_API_KEY`, rejects symlinks and unsafe permissions, creates a private
timestamped backup, then atomically replaces the profile file. It removes direct
Anthropic keys and unrelated application, CRM, payment, social, email, GitHub,
and deployment credentials so Hermes cannot reload them after the child-process
environment has been scrubbed. The command prints counts and rollback paths,
never values. The config and MoA checks must show the expected profile without a
direct Anthropic credential before admission may be armed.

One-minute stop sequence:

1. close admission and block/cancel the canary in CRM;
2. run `CC_OWNEST_FORCE_LIVE_OFF=1 bash scripts/ownest-launchd.sh` and verify the
   active projection is stopped or safely dead-lettered;
3. unload only after that proof with
   `launchctl bootout "gui/$(id -u)/in.unite-group.ownest"`;
4. stop the shared Hermes gateway only for a runtime-wide emergency.

For a durable uninstall after the projection is safe:

```bash
bash scripts/install-ownest-service.sh --uninstall
```

The plist is archived and the log is retained. Re-install also backs up the
previous plist and restores it if launchd rejects the replacement.

## Legacy operator-jobs poller

Claims `operator_jobs` from prod Supabase, runs a SAFE gated execution, and
streams `operator_events` back so the command-centre shows live job progress.

This surface is superseded by CRM-authoritative OWNEST. The quarantined
`in.unite-group.operator-jobs` LaunchAgent must remain unloaded; do not install
or arm it as part of the OWNEST rollout. The code remains only for rollback and
historical compatibility until a separate deletion decision.

Historical safety boundaries retained in the dormant code:

- **Kill switch**: nothing runs unless `CC_OPERATOR_JOBS_LIVE=1` (default off → drains).
- **Founder-scoped**, lifecycle-legal transitions only (`queued→running→{done,blocked}`).
- **Hard-gated task types** (`production_deploy`, `production_db_write`, `payments`,
  `email_send`, `claims_orders`, `secrets_access`) and any `external/production/api_key`
  flag → job is **blocked** with a `gate_blocked` event. Never executed.
- **Tier 1 execution** = read-only introspection only (`diagnostic` / `evidence_audit`
  / `verification`) — no user-supplied commands, no `claude -p`. Other safe task
  types are blocked pending a Tier 2 executor (not wired).
