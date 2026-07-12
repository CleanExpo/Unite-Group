# Legacy Linear Loop — Retired

Date retired: 12/07/2026

The Mission Control loop that treated Linear as the execution queue is
permanently retired. It previously combined credential loading, issue claim,
agent execution, verification, Git commit/push, and Linear completion in one
local process without the CRM authority and receipt boundaries required by the
Nexus control plane.

The retained entrypoint and starter scripts are refusal tombstones. They exit
with code `2` before reading configuration, credentials, files, Git state,
subprocesses, or the network. No environment variable can reactivate them.

Current authority:

- CRM `cc_tasks` owns mission state.
- Hermes Kanban is a disposable projection only.
- OWNEST design/tests model bounded reconcile-first ticks and independent
  completion validation; no OWNEST host worker or package command exists.
- Admission, service installation, production mutation, merge, spend, and
  publication remain separately gated.

Treat `docs/superpowers/plans/2026-07-12-crm-hermes-ownest-control-plane.md` as a
superseded implementation record; use `apps/autopilot-runner/README.md` and
`docs/security/credential-concentration-remediation-2026-07-12.md` for the
current design/test-only boundary. The
same-user OWNEST LaunchAgent installer and wrapper are security tombstones; live
activation is blocked, not merely awaiting a routine install. A replacement
requires a dedicated UID and sealed workspace/HOME, a pinned Hermes binary,
brokered operation-scoped CRM credentials, an enforceable egress/tool policy,
and an independent completion verifier before any new canary decision.
