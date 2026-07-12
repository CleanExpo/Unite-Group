# @unite/autopilot-runner

Design/test-only CRM/OWNEST policy and adapter code plus a one-file refusal container
for surviving legacy deployments. No host worker, presence bridge, Linear lane,
or user-level autonomous service is emitted by the reviewed build.

**Spec:** [`apps/spec-board/projects/stage3-autopilot-runner/spec.md`](../spec-board/projects/stage3-autopilot-runner/spec.md)
**Linear:** epic context under the [Duncan Perkins Ventures] / autopilot work; build issue [UNI-2143] lineage.

> No auto-push, merge, deploy, production-mutation, or autonomous service lane is
> enabled by this package.

## Status

- the old Stage-3 Linear author/publisher source and tests are deleted and have
  no package command, web handoff, build entrypoint, or image;
- `src/ownest/*` implements the strict CRM, policy, Hermes, receipt, STOP, and
  reconcile-first control-plane slices for one nominated advisory canary.
- `src/ownest-tick.ts` defines a bounded sweep for design and unit-test evidence.
  It has no package command or emitted host artifact.
- `operator_jobs` is a superseded queue surface. Its old LaunchAgent must remain
  unloaded; OWNEST does not consume that queue.

The broader hosted Linear authoring/gauntlet/deployment executor is permanently
retired in this build. Its former worker shared a Unix identity, PID namespace,
and linked Git administration directory with the privileged orchestrator, so an
environment allowlist could not provide a real credential boundary. The
`runtime-surface.json` is the reviewed allowlist. There is no `dist/host`
surface; `dist/container` contains only the refusal entrypoint. The image
receives only that one JavaScript file and contains neither
Git, Claude Code, Hermes, OWNEST, heartbeat, nor package dependencies. OpenClaw
is a migration source exposed through Hermes tooling, not the active executor or
a second model runtime.

Current activation state (2026-07-12): earlier profile-shape and MoA checks do
not prove safe execution capacity. The former user-level
`in.unite-group.ownest` LaunchAgent path is retired because a same-UID Hermes
child can recover user-readable repository, browser, SSH, and profile secrets.
The installer is uninstall-only, the service wrapper exits `78`, live admission
is hard-blocked, and the default completion verifier rejects all completions.
There is no live autonomous OWNEST worker.

## Develop

```bash
cd apps/autopilot-runner
npm ci
npm test          # vitest
npm run type-check
```

This package keeps its own lockfile/toolchain (root is not a pnpm workspace).
The retired Stage-3 Linear source and tests are deleted. The runtime manifest
records those forbidden paths, and the build fails if one is restored. Re-enabling
execution requires a new executor with separate UID/PID/filesystem/network
isolation and brokered, operation-scoped credentials; changing an environment
flag is intentionally insufficient.

## Guardrails (non-negotiable, from the spec)

- OWNEST currently has no production execution authority. A future admitted
  replacement could be granted only founder-scoped CRM mission-ledger, task-event,
  evidence-record, and deterministic-validation writes; it would still have no
  authority for product-domain data, deployment, spend, publication, deletion,
  access control, credential disclosure, or merge.
- The design/test CRM adapter models the former service-role contract so its
  founder scoping and failure semantics can be tested. It is not deployable: no
  agent process may receive the general service-role credential. A future
  runtime needs an operation-scoped brokered capability instead.
- `main` branch protection (1 required review) is kept; a distinct reviewer
  GitHub App satisfies it only after an independent gauntlet re-passes.
- `CC_LINEAR_LIVE` cannot activate hosted execution. Exact `1` is rejected with
  exit code 2 before any configuration, credential, filesystem, Git, subprocess,
  or network access; all other values drain with exit code 0.
- CRM `cc_tasks` is authoritative for OWNEST. Hermes Kanban is a disposable
  execution projection and cannot promote, reopen, or complete CRM work by
  itself.

## Retired presence heartbeat

The former presence writer and its TypeScript sources are deleted. Passing a
service-role key to a long-lived same-UID process exposed an RLS-bypassing
credential to the same account that runs Hermes and MCP children. The wrapper
and manual start command now exit `78`; the installer supports cleanup only:

```bash
bash scripts/install-heartbeat-service.sh --uninstall
```

A replacement must use a brokered, least-privilege heartbeat endpoint and a
credential that can write only the founder-scoped presence record. It must not
place a service-role key in a repository env file, Hermes profile, container,
or agent process.

## OWNEST CRM-to-Hermes control plane

The design-only state machine is reconcile-first. In unit tests,
`CC_OWNEST_LIVE=0` prevents admission while exercising cancellation, STOP,
lease, retry, dead-letter, receipt, and terminal-state repair. Production live
configuration is rejected until the separate-UID executor and independent
completion verifier are installed; setting `CC_OWNEST_LIVE=1` is not an
activation mechanism.

Any future canary would have to be queued, advisory, low/medium risk, owned by Hermes/Nexus/Empire,
approval-free, dependency-free, structurally valid, and free of gated action
language. Production/database mutation, spend, outbound messages/publication,
secrets or privilege changes, destructive/access-control work, merge, high-risk
work, and approval-required work always remain blocked.

Legacy design/test configuration schema — do not provision this as a host env,
Hermes profile, container secret set, or service configuration:

| Variable | Rule |
|---|---|
| `SUPABASE_URL` | Test input for the CRM-origin policy. Production-origin handling is covered by tests, not a host connection recipe. |
| `NEXT_PUBLIC_SUPABASE_URL` | Legacy parity input used by configuration tests. Do not copy it into an OWNEST host profile. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy test-contract name only. Never place the real RLS-bypassing key in an agent process, repository env, profile, or container. |
| `FOUNDER_USER_ID` | Test input proving founder scope is explicit. |
| `CC_OWNEST_WORKER_ID` | Test input for stable lease identity; no worker currently runs. |
| `CC_OWNEST_HERMES_BIN` | Test input for absolute-path validation; no Hermes binary is invoked by the emitted build. |

Reserved future canary controls:

| Variable | Default / canary rule |
|---|---|
| `CC_OWNEST_LIVE` | `0`; exact `1` remains blocked by the current isolation gate. |
| `CC_OWNEST_ROLLOUT_ID` | Reserved for a future approved replacement; binds quotas and receipts. |
| `CC_OWNEST_CANARY_TASK_ID` | Reserved for a future approved replacement; would be the only admissible task. |
| `CC_OWNEST_HERMES_PROFILE` | `ownest`; reserved profile identity. |
| `CC_OWNEST_HERMES_BOARD` | `unite-group-ownest`; reserved projection board. |
| `CC_OWNEST_CANARY_LIMIT` | `1`; the parser's hard ceiling is 3, but the canary requires 1. |
| `CC_OWNEST_MAX_IN_PROGRESS` | `1`; the canary requires 1. |
| `CC_OWNEST_DAILY_DISPATCH_LIMIT` | `1`; the canary requires 1. |
| `CC_OWNEST_LEASE_MS` | `300000`, bounded from 60 seconds to 30 minutes. |
| `HERMES_CWD` | Design/test cwd; any future runtime requires a sealed workspace, not the repository root. |

Run the offline tests/build. The build emits only the retirement tombstone; do
not compile or point a manual OWNEST sweep at any CRM:

```bash
npm run build
npm test
```

The summary contract is `ownest.tick.summary.v1` and contains no credential. A
future valid completion would require a structurally valid Hermes receipt plus
approval from a separately implemented verifier that independently retrieves
evidence, checks digests, and uses a different model family where required. The
current default verifier deliberately returns
`independentValidationVerified: false`, so Hermes self-attestation cannot
complete CRM work.

### Retired user-level service

The former one-minute LaunchAgent is not installable. Both the wrapper and
installer are security tombstones; all installer modes except cleanup return
exit `78`. The only supported command is reversible removal of a stale service:

```bash
bash scripts/install-ownest-service.sh --uninstall
```

Before a new service design can be proposed, it must provide all of: a dedicated
OS identity, sealed HOME/workspace, an immutable Hermes binary digest, brokered
operation-scoped CRM credentials, an enforceable egress/tool policy, and an
independent completion verifier. That replacement needs a new threat model,
tests, Board approval, and canary plan; it must not reuse the user LaunchAgent.

The former profile sanitizer is also a refusal tombstone. Its rollback design
copied removed credentials into plaintext files readable by the same UID, so it
did not provide isolation. A read-only host audit found existing credential
concentration and historic same-UID rollback copies outside this repository.
Their values were not read. Rotation and relocation into a brokered secret plane
is an operational security change requiring a separately authorised runbook;
do not try to repair it by creating another plaintext backup. This credential
migration is a blocker independent of the code/build gate: even a future
isolated executor cannot be armed until retained credentials have verified
replacements and the historic copies are safely revoked/removed under that runbook.

If a stale plist is discovered, block/cancel any CRM task first, confirm no
projection is active, then run the uninstall-only command above. It bootouts and
archives the plist and retains the log. Do not invoke `ownest-launchd.sh`; it is
expected to refuse execution.

## Legacy operator-jobs poller

This surface is superseded by the CRM-authoritative OWNEST design contract, not
by a replacement runtime. The package command is removed, its source and tests
are deleted, and both launcher/installer files are refusal tombstones that exit
`78` before configuration.
The quarantined `in.unite-group.operator-jobs` LaunchAgent must remain unloaded.
