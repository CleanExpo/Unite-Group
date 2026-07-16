# SPM Spec — Mission Control Phase 1: brokered three-machine CLI fleet

Date: 17/07/2026 · Epic: UNI-2246 · Tickets: UNI-2403–UNI-2415
Status: APPROVED FOR SLICE A BUILD; fleet activation and production merge remain founder-gated
Base: `origin/main` @ `08ec1048` · Worktree: `/Users/phill-mac/worktrees/unite-group-mission-control-p1`

## 1. Task

Turn the existing Mission Control lane UI, lane orchestrator, mesh-fleet telemetry and provider pool into one honest control plane for Claude Code, Codex and Hermes across the MacBook, Mac mini and Windows desktop. Prove seven continuous clean days before enabling revenue, finance, marketing, communications or community automation.

## 2. Problem

The repository already renders lanes and can launch CLI commands, but the control semantics are incomplete:

- `LaneAdapter.run()` exposes no run identity, event stream or control handle.
- `CliLaneAdapter` owns the spawned child only inside one promise; the orchestrator cannot stop it.
- `LaneOrchestrator.stop()` removes the worktree but does not terminate the CLI process.
- the backend picker probes real availability, while the singleton used by lane creation injects `isBackendAvailable: () => true`.
- the JSONL lane ledger has latest-record semantics but no run claim, lease, monotonic event sequence or restart reconciliation.
- Mission Control shows only final output; simultaneous tool/output streams and acknowledged control states are absent.
- the fleet surface is read-only and does not yet reconcile machine identity, host health and active CLI runs.

Calling that “fleet control” today would be false-green.

## 3. Desired outcome

A founder can see every active CLI run by machine and lane, inspect redacted ordered events, and issue pause/resume/stop/kill/retry with an acknowledged result. Every run has one canonical identity and durable evidence. Reboot, duplicate dispatch, stale lease, missing backend and quota-exhaustion cases fail closed. Seven clean days are recorded before Phase 2 is allowed.

## 4. Win condition

Phase 1 is complete only when all are true:

1. MacBook, Mac mini and Windows report canonical machine identity and fresh heartbeat.
2. Claude Code, Codex and Hermes are admitted only when their real backend is available.
3. every run has `runId`, `laneId`, `machineId`, backend/tool identity, monotonic sequence, timestamps and redacted event payloads.
4. stop/kill owns and terminates the process tree; worktree cleanup happens only after termination acknowledgement.
5. pause/resume/retry are explicit state transitions, not UI theatre.
6. duplicate claims and stale leases are deterministic and restart-safe.
7. quota admission blocks before spawn and explains the next safe action.
8. Mission Control renders simultaneous streams and one evidence timeline.
9. adversarial failure drills pass.
10. the soak harness records seven consecutive clean operational days with zero unauthorised L3 action.

## 5. Scope

### In

- canonical lane/run/tool-event contract;
- local supervised CLI process ownership;
- truthful admission, controls, claims, recovery and quota gates;
- redacted event streaming and evidence timeline;
- integration into the existing workspace lanes panel and existing web command centre;
- three-machine failure drills and seven-day proof harness.

### Out

- a new persistent presence writer;
- revival of the deleted legacy autopilot runner;
- direct production mutations;
- live L3 execution;
- secrets, provider-token export or proxying subscription OAuth outside sanctioned CLIs;
- deployment or merge to `main` without founder approval;
- Phase-2 business automation before the soak gate.

## 6. Existing capability to reuse

- `apps/workspace/src/server/lanes/lane-orchestrator.ts` — lane lifecycle and JSONL latest-record ledger.
- `apps/workspace/src/server/lanes/cli-adapter.ts` — sanctioned Claude Code/Codex spawning in isolated account homes.
- `apps/workspace/src/server/lanes/worktree-manager.ts` — per-lane Git worktrees.
- `apps/workspace/src/routes/api/lanes/*` — authenticated create/list/run/stop surface.
- `apps/workspace/src/screens/command-center/lanes-panel.tsx` — existing founder lane UI.
- `apps/workspace/src/screens/gateway/components/run-console.tsx` — existing multi-agent event rendering patterns.
- `apps/web/src/app/api/command-centre/mesh-fleet/route.ts` and `MeshFleetTile` — existing live fleet read path.
- provider pool quota/router modules — existing admission vocabulary.
- `agent_actions`, `agent_invocations`, `operator_agent_presence`, `desktop_agent_sessions` — existing evidence/presence data plane.

No parallel executor or dashboard will be introduced.

## 7. First-source findings

1. The backend picker is truthful, but lane creation is not: `apps/workspace/src/server/lanes/index.ts` wires `isBackendAvailable: () => true`.
2. `CliLaneAdapter.defaultSpawn()` captures child output and enforces a timeout, but exposes no abort/control handle.
3. `LaneOrchestrator.stop()` force-removes the worktree and then marks the lane stopped; it never asks the adapter to terminate a child.
4. `runMission()` writes `running`, awaits the adapter, then writes `idle` or `error`; there is no run ID or concurrency claim.
5. `LanesPanel` polls every five seconds and only renders `lastOutput` after completion.
6. The superseded 30/06/2026 Nexus completion spec explicitly forbids reviving the deleted presence-writer/persistent-host architecture.
7. Baseline on Node 24.14.1: workspace TypeScript PASS, four targeted workspace files 14/14 PASS; web TypeScript PASS, three targeted Mission Control files 33/33 PASS.

## 8. Judge Report

### Proposal judged

Build Slice A only: canonical local run contract, supervised process ownership, truthful backend admission and deterministic stop semantics. No remote activation, deploy, schema change or production write.

### Existing capability

The lane orchestrator, CLI adapter, worktree manager, authenticated APIs and UI already exist. Slice A repairs their control contract rather than adding a new system.

### Devil's advocate objections

- **“Just add Stop to the UI.”** Rejected: the button already exists; process ownership is the defect.
- **“Use the legacy presence writer.”** Rejected: explicitly retired by current architecture/security evidence.
- **“Persist PIDs and kill after reboot.”** Rejected for Slice A: PID reuse can kill unrelated processes. Recovery requires verifiable process identity and belongs in Slice B.
- **“Ship all 13 tickets in one PR.”** Rejected: impossible to review safely and violates the file-count/scope discipline.
- **“Treat a cancelled promise as a stopped process.”** Rejected: cancellation must terminate and acknowledge the process tree before cleanup.

### UX gaps addressed

Stop will mean “process termination acknowledged,” not “worktree removed.” Busy/stop states will be explicit. Later slices add stream panes, pause/resume and retry only after the backend control contract exists.

### Security/privacy

- command invocation remains argv-based without a shell;
- event output is bounded and redacted before persistence/display;
- already-authenticated CLI homes remain isolated;
- no credential content enters events or errors;
- backend admission fails closed;
- no L3 tool is enabled;
- process-group termination is bounded and verified.

### Loop/stress plan

- concurrent stop while a run is active;
- stop after natural completion;
- duplicate run request for one lane;
- timeout escalation TERM → KILL;
- adapter abort before spawn and during output;
- output flood truncation/redaction;
- malformed ledger lines;
- restart with a stale running record;
- backend becomes unavailable between picker and create;
- worktree cleanup failure after acknowledged termination.

### Score

| Dimension | Score |
|---|---:|
| First-source evidence | 20/20 |
| Reuse / no duplicate system | 15/15 |
| Safety and privacy | 20/20 |
| Honest UX semantics | 15/15 |
| Deterministic testability | 15/15 |
| Reversibility / rollback | 10/10 |
| Cost / vendor impact | 5/5 |
| **Total** | **100/100** |

**Decision: APPROVE SLICE A BUILD.** Full fleet activation remains HOLD until Slices B–E and the three-machine evidence gate pass.

## 9. Delivery slices

### Slice A — local control truth (UNI-2403, UNI-2404, UNI-2405, UNI-2408 partial)

Canonical run contract, real backend admission, supervised process ownership, acknowledged stop, bounded/redacted output, deterministic tests.

### Slice B — event and durable lifecycle (UNI-2406, UNI-2410)

Append-only ordered run events, lease/claim semantics, restart reconciliation and live stream endpoint.

### Slice C — admission and safety (UNI-2407, UNI-2409)

Quota preflight, L3 tool-boundary enforcement, denial evidence and recovery guidance.

### Slice D — Mission Control operating surface (UNI-2411, UNI-2412, UNI-2413)

Fleet/run join, simultaneous CLI panes, controls, evidence timeline and critical-only alerting.

### Slice E — proof gate (UNI-2414, UNI-2415)

Three-machine fault injection, reboot/network/quota tests and seven-day soak harness.

## 10. Twenty-move forward plan

1. Pin build evidence to the branch/base SHA and record the green baseline.
2. Add failing tests for one run identity and ordered lifecycle state.
3. Define the canonical lane/run/event types without schema changes.
4. Add failing adapter tests for abort-before-spawn and abort-during-run.
5. Refactor CLI spawn to own a process group and accept an abort signal.
6. Implement bounded TERM → KILL escalation and output limits.
7. Add redaction at the adapter/event boundary.
8. Add failing orchestrator tests for duplicate-run rejection.
9. Track active run controllers and completion promises by lane.
10. Make stop abort, await acknowledgement, then clean the worktree.
11. Replace singleton always-available admission with the existing availability check.
12. Run Slice-A unit, TypeScript, lint and build gates; independent review.
13. Add append-only `LaneRunEvent` ledger with monotonic sequence and replay tests.
14. Add verifiable run claims/leases and stale-run reconciliation without PID-only recovery.
15. Add quota admission using the existing provider-pool state vocabulary.
16. Add tool-boundary policy and explicit L3 denial events before dispatch.
17. Expose authenticated stream/control APIs and integrate the existing lanes panel.
18. Join mesh machine presence, run events and provider state in the existing web command centre.
19. Execute duplicate-dispatch, process-tree, network-loss, restart, stale-lease and quota drills on all three machines.
20. Start the seven-day soak; only a clean evidence record can move UNI-2415 to Done and unlock Phase 2.

## 11. Data contract

Slice A introduces repository-local TypeScript types only:

- `LaneRun`: run identity, lane identity, machine identity, status, attempt, started/finished timestamps.
- `LaneRunEvent`: run/lane IDs, sequence, timestamp, lifecycle/output/control/error type, bounded redacted message.
- `LaneControlAction`: stop initially; pause/resume/kill/retry added only when implemented end-to-end.

No database migration is allowed in Slice A.

## 12. API and UI behaviour

Existing authenticated routes remain. The stop route will return only after termination acknowledgement and worktree cleanup attempt. A duplicate run returns a conflict rather than launching a second child. The existing Stop button will surface pending/error state honestly. Streaming UI changes wait for Slice B.

## 13. Security

- no shell invocation;
- no secrets read, logged or persisted;
- no remote executable exposure;
- no production DB write;
- no service-role client;
- auth/CSRF checks retained;
- bounded output and errors;
- process tree, not just parent PID, terminated;
- backend and quota gates rechecked at dispatch time;
- L3 remains denied.

## 14. Testing strategy

RED → GREEN → REFACTOR for each behaviour. Slice A must pass:

- CLI adapter tests including abort, timeout, process-group escalation and output bounds;
- orchestrator tests including duplicate run, acknowledged stop, cleanup ordering and failure paths;
- route tests for auth, validation and conflict semantics where touched;
- workspace TypeScript and complete Vitest suite;
- workspace production build;
- independent adversarial review.

Later slices add API/component tests, replay/property tests, cross-machine drills and soak assertions.

## 15. Rollback

Each slice is independently revertible. Slice A changes no schema or production state. Revert restores the old local orchestrator/adapter behaviour. Feature activation is not required for merge; deployment remains founder-gated.

## 16. Dependencies and gates

- UNI-2365 credential cull: **resolved 16/07/2026; not a blocker**.
- UNI-2208 Max-plan pool and UNI-2247 machine enrolment gate live multi-machine validation, not Slice A code.
- Every slice requires its own tests and review.
- No deploy or merge without founder approval.
- No Phase 2 until UNI-2415 records seven clean days.

## 17. Acceptance criteria by ticket

- UNI-2403: canonical contract implemented and tested.
- UNI-2404/2405: sanctioned CLI backend process lifecycle owned by the broker.
- UNI-2406: ordered redacted events stream live and replay.
- UNI-2407: quota admission fails before spawn.
- UNI-2408: controls are acknowledged, not cosmetic.
- UNI-2409: L3 denial occurs at the tool boundary with evidence.
- UNI-2410: claim/recovery tests pass without unsafe PID-only assumptions.
- UNI-2411/2412/2413: one honest founder surface and critical-only alerts.
- UNI-2414: fault matrix passes on all three hosts.
- UNI-2415: seven-day evidence gate passes.

## 18. Session handoff seed

Start in `/Users/phill-mac/worktrees/unite-group-mission-control-p1` on `feat/uni-2246-mission-control-phase1`. Do not modify the founder's existing worktree. Do not revive the deleted presence writer or autopilot runner. Run Node commands under Node 24.14.1. Begin with Slice-A failing tests in `apps/workspace/src/server/lanes/`.

## 19. Goal command

`/goal Execute Slice A of .spm/2026-07-17-mission-control-phase1-foundation.md with strict TDD. Completion condition: canonical run contract, truthful backend admission, supervised Claude/Codex process ownership, duplicate-run rejection, acknowledged process-tree stop before worktree cleanup, bounded redacted output, workspace TypeScript/tests/build green, independent review complete. Do not deploy, merge, add schema, read secrets, revive the legacy presence writer, or enable L3.`

SPM spec complete. Next safe action: add the Slice-A regression tests before implementation.
