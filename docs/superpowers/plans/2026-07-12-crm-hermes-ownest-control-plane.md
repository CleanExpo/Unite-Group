# CRM–Hermes OWNEST Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Unite-Group CRM the authoritative mission ledger and continuously execute eligible background work through an idempotent, bounded, dedicated Hermes OWNEST/MoA mirror with leases, recovery, and CRM evidence.

**Architecture:** A new `apps/autopilot-runner/src/ownest` module reads founder-scoped `cc_tasks` through PostgREST, applies a pure fail-closed eligibility policy, invokes Hermes Kanban with fixed argv, and reconciles task state and evidence back to CRM. Existing tables and Hermes capabilities are reused; no schema or dependency is added.

**Tech Stack:** Node.js 22, TypeScript, Vitest, built-in `child_process.spawn`, Supabase PostgREST, Hermes Agent CLI/Kanban.

---

## File map

| File | Responsibility |
|---|---|
| `apps/autopilot-runner/src/ownest/types.ts` | CRM task, OWNEST state, Hermes task, config, and result contracts |
| `apps/autopilot-runner/src/ownest/policy.ts` | fail-closed eligibility, gates, deterministic IDs, redaction, state mapping |
| `apps/autopilot-runner/src/ownest/policy.test.ts` | policy, gate, redaction, and mapping tests |
| `apps/autopilot-runner/src/ownest/hermes.ts` | fixed-argv Hermes Kanban adapter and JSON validation |
| `apps/autopilot-runner/src/ownest/hermes.test.ts` | command construction, idempotency, and failure tests |
| `apps/autopilot-runner/src/ownest/crm.ts` | founder-scoped PostgREST reads/writes with strict non-2xx handling |
| `apps/autopilot-runner/src/ownest/crm.test.ts` | tenant scoping, compare-and-swap, event, evidence, and outage tests |
| `apps/autopilot-runner/src/ownest/tick.ts` | reconcile-first bounded lease/dispatch/dead-letter state machine |
| `apps/autopilot-runner/src/ownest/tick.test.ts` | crash recovery, duplicate prevention, canary limit, rollback, evidence tests |
| `apps/autopilot-runner/src/ownest-tick.ts` | one bounded production sweep and exit-code contract |
| `apps/autopilot-runner/src/ownest-tick.test.ts` | config and kill-switch entrypoint tests |
| `apps/autopilot-runner/scripts/ownest-launchd.sh` | secret-safe launchd wrapper |
| `apps/autopilot-runner/scripts/install-ownest-service.sh` | idempotent LaunchAgent installer and plist validation |
| `apps/autopilot-runner/package.json` | build/run script for the new worker |
| `apps/autopilot-runner/README.md` | authoritative operating, recovery, and canary runbook |

### Task 1: Establish the runner baseline

**Files:**
- Read: `apps/autopilot-runner/package-lock.json`
- Read: `apps/autopilot-runner/package.json`

- [ ] **Step 1: Install the pinned runner dependencies**

Run:

```bash
cd apps/autopilot-runner
npm ci
```

Expected: exit 0 with no lockfile mutation.

- [ ] **Step 2: Run the existing runner suite before changing code**

Run:

```bash
npm test
npm run type-check
npm run build
git status --short
```

Expected: all existing Vitest files pass, TypeScript exits 0, build exits 0, and only the already-committed design/plan work differs from `origin/main`.

### Task 2: Define the mission contract and fail-closed policy

**Files:**
- Create: `apps/autopilot-runner/src/ownest/types.ts`
- Create: `apps/autopilot-runner/src/ownest/policy.ts`
- Create: `apps/autopilot-runner/src/ownest/policy.test.ts`

- [ ] **Step 1: Write failing policy tests**

The tests must define these behaviours explicitly:

```ts
expect(evaluateEligibility(task())).toEqual({ eligible: true })
expect(evaluateEligibility(task({ human_approval_required: true }))).toMatchObject({ eligible: false })
expect(evaluateEligibility(task({ risk_level: 'high' }))).toMatchObject({ eligible: false })
expect(evaluateEligibility(task({ execution_mode: 'local-code' }))).toMatchObject({ eligible: false })
expect(evaluateEligibility(task({ title: 'Deploy production database' }))).toMatchObject({ eligible: false })
expect(idempotencyKey('task-1')).toBe('cc-task:task-1:v1')
expect(redactMissionText('email a@b.com token=abc123')).not.toContain('a@b.com')
expect(mapHermesStatus('done')).toBe('done')
expect(mapHermesStatus('blocked')).toBe('blocked')
```

Also test that owner matching is case-insensitive, unresolved dependencies gate, terminal/dead-letter tasks gate, and unknown Hermes states do not become `done`.

- [ ] **Step 2: Run the tests and verify red**

Run:

```bash
npx vitest run src/ownest/policy.test.ts
```

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Add the complete typed contract**

`types.ts` must define, without `any`:

```ts
export type CcTaskStatus = 'proposed' | 'queued' | 'running' | 'blocked' | 'awaiting_approval' | 'done' | 'failed'
export type HermesTaskStatus = 'archived' | 'blocked' | 'done' | 'ready' | 'review' | 'running' | 'scheduled' | 'todo' | 'triage'

export interface OwnestStateV1 {
  version: 1
  crmTaskId: string
  idempotencyKey: string
  hermesTaskId: string | null
  attemptId: string
  leaseOwner: string
  leaseExpiresAt: string
  lastHeartbeatAt: string
  dispatchedAt: string | null
  reconciledAt: string | null
  evidenceUri: string | null
  gateState: 'eligible' | 'gated' | 'dead_letter'
  lastError: string | null
}

export interface CcTask {
  id: string
  founder_id: string
  title: string
  objective: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  status: CcTaskStatus
  agent_owner: string | null
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  execution_mode: 'advisory' | 'local-code' | 'branch-preview' | 'overnight'
  dependencies: string[]
  human_approval_required: boolean
  validation_required: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

Add typed Hermes create/show responses, the worker config, CRM/Hermes dependency interfaces, and tick outcomes (`drained`, `idle`, `dispatched`, `reconciled`, `blocked`, `failed`).

- [ ] **Step 4: Implement the minimal pure policy**

`policy.ts` must:

- allow only queued, approval-free, low/medium-risk advisory work owned by Hermes/Nexus/Empire;
- gate unresolved dependencies and existing dead letters;
- gate case-insensitive high-risk phrases for production, payments, outbound publication, secrets, deletion, access control, branch protection, and merges;
- build the deterministic `cc-task:<id>:v1` key;
- redact email addresses, bearer/API/token assignments, and common credential labels;
- map only Hermes `done` to CRM `done`, Hermes `blocked`/`review` to CRM `blocked`, and all live/unknown states to non-terminal state;
- extract/validate `metadata.ownest` without trusting malformed objects.

- [ ] **Step 5: Run policy tests and type-check**

Run:

```bash
npx vitest run src/ownest/policy.test.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 6: Commit the policy slice**

```bash
git add apps/autopilot-runner/src/ownest/types.ts apps/autopilot-runner/src/ownest/policy.ts apps/autopilot-runner/src/ownest/policy.test.ts
git commit -m "feat(ownest): add fail-closed mission policy"
```

### Task 3: Add the fixed-argv Hermes adapter

**Files:**
- Create: `apps/autopilot-runner/src/ownest/hermes.ts`
- Create: `apps/autopilot-runner/src/ownest/hermes.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Inject a process runner with this contract:

```ts
type ProcessRunner = (command: string, args: readonly string[], cwd: string) => Promise<{
  exitCode: number
  stdout: string
  stderr: string
}>
```

The historical example below has been superseded by the hardening amendment. Current tests must pin `--profile ownest`, board `unite-group-ownest`, assignee `ownest`, the projection UUIDv8 key, ten-minute runtime, four goal turns, and the receipt contract, and must never use a shell string:

```ts
expect(run).toHaveBeenCalledWith('hermes', expect.arrayContaining([
  '--profile', 'ownest', 'kanban', '--board', 'unite-group-ownest', 'create',
  '--assignee', 'ownest',
  '--idempotency-key', expect.stringMatching(/^ownest:[0-9a-f-]{36}$/),
  '--skill', 'nexus',
  '--skill', 'forward-planner',
  '--skill', 'verify-test',
  '--max-runtime', '10m',
  '--max-retries', '2',
  '--goal', '--goal-max-turns', '4', '--json',
]), expect.any(String))
```

Test create success, idempotent existing-task success, malformed JSON, non-zero exit, show success, and show missing-task failure.

- [ ] **Step 2: Run the tests and verify red**

```bash
npx vitest run src/ownest/hermes.test.ts
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the adapter**

Use `spawn(command, [...args], { cwd, shell: false })`. The only public operations are:

```ts
createHermesMission(task: CcTask, config: OwnestConfig): Promise<HermesTask>
showHermesMission(taskId: string, config: OwnestConfig): Promise<HermesTask>
```

Build a redacted body that states:

- CRM is authoritative;
- the CRM task ID and validation requirements;
- no production, spend, secret, external-message, destructive, or merge action is authorised;
- the worker must return evidence and leave gated actions blocked.

The forced skill allowlist is exactly `nexus`, `forward-planner`, and `verify-test`. Do not accept arbitrary skill names from task metadata during the canary. The mission body instructs Nexus to use configured browser, Playwright, or computer-use tools when they materially help, while the ordinary Hermes approval and security policy remains authoritative.

Reject empty IDs and unrecognised JSON shapes. Include stderr/stdout in errors only after applying the redactor and capping detail at 800 characters.

- [ ] **Step 4: Run adapter tests and type-check**

```bash
npx vitest run src/ownest/hermes.test.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit the Hermes slice**

```bash
git add apps/autopilot-runner/src/ownest/hermes.ts apps/autopilot-runner/src/ownest/hermes.test.ts
git commit -m "feat(ownest): add idempotent Hermes adapter"
```

### Task 4: Add the strict founder-scoped CRM adapter

**Files:**
- Create: `apps/autopilot-runner/src/ownest/crm.ts`
- Create: `apps/autopilot-runner/src/ownest/crm.test.ts`

- [ ] **Step 1: Write failing CRM tests**

Cover:

- missing URL, service-role key, founder ID, or worker ID fails config loading;
- the live switch defaults off;
- every `cc_tasks` read and write includes `founder_id=eq.<configured-id>`;
- service-role credentials are headers only and never logged;
- candidate reads request queued tasks in priority/age order;
- mirrored reads include running/blocked tasks carrying OWNEST metadata;
- compare-and-swap update uses both task ID, founder ID, and expected current status;
- zero returned rows means a lost race, not success;
- every non-2xx GET/PATCH/POST throws;
- events append to `cc_task_events` and evidence appends to `cc_evidence_records`.

- [ ] **Step 2: Run the tests and verify red**

```bash
npx vitest run src/ownest/crm.test.ts
```

Expected: FAIL because the CRM adapter does not exist.

- [ ] **Step 3: Implement config and PostgREST operations**

Expose:

```ts
loadOwnestConfig(env?: NodeJS.ProcessEnv): LoadOwnestConfigResult
listCandidateTasks(config: OwnestConfig, deps: CrmDeps): Promise<CcTask[]>
listMirroredTasks(config: OwnestConfig, deps: CrmDeps): Promise<CcTask[]>
compareAndSetTask(input: CompareAndSetTaskInput, config: OwnestConfig, deps: CrmDeps): Promise<CcTask | null>
appendTaskEvent(input: AppendOwnestEventInput, config: OwnestConfig, deps: CrmDeps): Promise<void>
appendEvidence(input: AppendOwnestEvidenceInput, config: OwnestConfig, deps: CrmDeps): Promise<void>
```

Defaults:

```ts
live: env.CC_OWNEST_LIVE === '1'
canaryLimit: boundedInteger(env.CC_OWNEST_CANARY_LIMIT, 1, 1, 3)
maxInProgress: boundedInteger(env.CC_OWNEST_MAX_IN_PROGRESS, 1, 1, 3)
leaseMs: boundedInteger(env.CC_OWNEST_LEASE_MS, 300_000, 60_000, 1_800_000)
dailyDispatchLimit: boundedInteger(env.CC_OWNEST_DAILY_DISPATCH_LIMIT, 3, 1, 25)
```

All write helpers must check `Response.ok` before returning. Keep `founderId` explicit even though service-role auth bypasses RLS.

- [ ] **Step 4: Run CRM tests and type-check**

```bash
npx vitest run src/ownest/crm.test.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit the CRM slice**

```bash
git add apps/autopilot-runner/src/ownest/crm.ts apps/autopilot-runner/src/ownest/crm.test.ts
git commit -m "feat(ownest): add strict CRM mission adapter"
```

### Task 5: Implement reconcile-first bounded execution

> **Hardening amendment:** implement this task against `../specs/2026-07-12-ownest-canary-hardening-amendment.md`. In particular, claim CRM before Hermes, require `expectedUpdatedAt`, nominate one task and rollout, validate the closing-run receipt, repair deterministic audit records, and propagate cancellation. The earlier create-before-CAS pseudocode below is retained as historical context and is not authoritative.

**Files:**
- Create: `apps/autopilot-runner/src/ownest/tick.ts`
- Create: `apps/autopilot-runner/src/ownest/tick.test.ts`

- [ ] **Step 1: Write failing state-machine tests**

Use fully injected fake CRM and Hermes dependencies. Cover these complete scenarios:

1. kill switch off: no CRM or Hermes call;
2. reconcile a live Hermes task: renew lease and heartbeat only;
3. reconcile `done`: write evidence, append completion event, then set CRM done;
4. evidence write failure: never mark CRM done;
5. reconcile `blocked`/`review`: mark blocked with error and event;
6. expired lease + existing Hermes task: reclaim idempotently without duplicate create;
7. no capacity: reconcile only;
8. eligible candidate: create exactly once and persist mirror/attempt/lease;
9. create succeeds + CRM compare-and-set loses race: next tick can reuse the same idempotency key;
10. ineligible candidate: never reaches Hermes;
11. daily dispatch or canary limit reached: no new dispatch;
12. repeated Hermes failure: dead-letter in CRM, no routine founder escalation.

- [ ] **Step 2: Run the tests and verify red**

```bash
npx vitest run src/ownest/tick.test.ts
```

Expected: FAIL because the tick does not exist.

- [ ] **Step 3: Implement reconciliation before dispatch**

Expose one function:

```ts
export async function runOwnestTick(
  config: OwnestConfig,
  deps: OwnestTickDeps,
): Promise<OwnestTickSummary>
```

The order is mandatory:

```ts
if (!config.live) return { outcome: 'drained', reconciled: 0, dispatched: 0 }
const mirrored = await deps.crm.listMirroredTasks()
const reconciliation = await reconcileAll(mirrored)
const liveCount = reconciliation.liveCount
if (liveCount >= config.maxInProgress) return summary('reconciled')
const candidates = await deps.crm.listCandidateTasks()
const eligible = candidates.filter((task) => evaluateEligibility(task).eligible)
await dispatchUpToCapacity(eligible, config.maxInProgress - liveCount)
```

Generate `attemptId` using `crypto.randomUUID()`. A terminal task is written in evidence-first order. A lease heartbeat uses ISO timestamps from injected `now()`. Unexpected failures return a non-zero/failure outcome and retain the task in a recoverable state; they never fabricate completion.

- [ ] **Step 4: Run state-machine tests and type-check**

```bash
npx vitest run src/ownest/tick.test.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit the control-loop slice**

```bash
git add apps/autopilot-runner/src/ownest/tick.ts apps/autopilot-runner/src/ownest/tick.test.ts
git commit -m "feat(ownest): reconcile CRM missions with Hermes"
```

### Task 6: Add the bounded entrypoint and durable service wrapper

**Files:**
- Create: `apps/autopilot-runner/src/ownest-tick.ts`
- Create: `apps/autopilot-runner/src/ownest-tick.test.ts`
- Create: `apps/autopilot-runner/scripts/ownest-launchd.sh`
- Create: `apps/autopilot-runner/scripts/install-ownest-service.sh`
- Modify: `apps/autopilot-runner/package.json`

- [ ] **Step 1: Write failing entrypoint tests**

Assert:

- invalid configuration returns exit code 1;
- live off still invokes one reconcile-first tick so cancellation, STOP, lease, and terminal-state repair remain active, but cannot admit or create a new mission;
- a clean tick returns 0 and emits one secret-free JSON summary line;
- a failed tick returns 1;
- logs never contain the service-role key.

- [ ] **Step 2: Run the tests and verify red**

```bash
npx vitest run src/ownest-tick.test.ts
```

Expected: FAIL because the entrypoint does not exist.

- [ ] **Step 3: Implement the entrypoint and package script**

Add:

```json
"ownest": "node dist/ownest-tick.js"
```

The entrypoint performs exactly one bounded reconcile-first sweep and exits. `CC_OWNEST_LIVE=0` disables admission, not reconciliation. Continuous operation belongs to launchd, preventing a hung in-process loop from becoming immortal.

- [ ] **Step 4: Implement the wrappers**

`ownest-launchd.sh` must:

- source the runtime repo's `.env.local` without echoing it;
- prepend `$HOME/.local/bin` for Hermes;
- run `node dist/ownest-tick.js` from the runner directory;
- use `set -euo pipefail` and default live off.

`install-ownest-service.sh` must:

- build before installation;
- install `in.unite-group.ownest` with `StartInterval=60` and no `KeepAlive`;
- write no credentials to the plist;
- validate the plist with `plutil -lint`;
- unload/reload idempotently;
- log to `~/Library/Logs/unite-ownest.log`.

- [ ] **Step 5: Run tests, build, and shell syntax checks**

```bash
npx vitest run src/ownest-tick.test.ts
npm run type-check
npm run build
bash -n scripts/ownest-launchd.sh
bash -n scripts/install-ownest-service.sh
```

Expected: PASS.

- [ ] **Step 6: Commit the service slice**

```bash
git add apps/autopilot-runner/src/ownest-tick.ts apps/autopilot-runner/src/ownest-tick.test.ts apps/autopilot-runner/scripts/ownest-launchd.sh apps/autopilot-runner/scripts/install-ownest-service.sh apps/autopilot-runner/package.json
git commit -m "feat(ownest): add bounded runtime service"
```

### Task 7: Document operations and verify the whole runner

**Files:**
- Modify: `apps/autopilot-runner/README.md`

- [ ] **Step 1: Replace stale status claims and document OWNEST**

Document:

- CRM `cc_tasks` is authoritative and Hermes is a mirror;
- exact eligibility and hard gates;
- all required and optional environment variables;
- canary limit 1 and proven cap 3;
- launchd install/status/log/stop commands;
- Hermes and CRM reconciliation evidence;
- the one-minute kill path;
- the orphaned `operator_jobs` poller is legacy and must remain unloaded;
- OpenClaw is a migration source, not the active model/runtime.

- [ ] **Step 2: Run the complete package verification**

```bash
cd apps/autopilot-runner
npm test
npm run type-check
npm run build
git diff --check
```

Expected: every test passes and all checks exit 0.

- [ ] **Step 3: Commit documentation**

```bash
git add apps/autopilot-runner/README.md
git commit -m "docs(ownest): add CRM Hermes operations runbook"
```

### Task 8: Adversarial review and pre-runtime proof

**Files:**
- Review: all files changed by Tasks 2–7

- [ ] **Step 1: Run a clean-context implementation review**

The reviewer must check tenant isolation, service-role scope, shell injection, redaction, idempotency, lease recovery, evidence-first completion, kill-switch order, and whether any projection can overwrite CRM authority.

Expected: no P0/P1 finding remains unresolved.

- [ ] **Step 2: Run a kill-switch smoke test and fixture-backed state-machine proof**

Run the built entrypoint with `CC_OWNEST_LIVE=0` and real configuration present.

```bash
CC_OWNEST_LIVE=0 node dist/ownest-tick.js
```

Expected: exit 0, `drained`, and no CRM/Hermes writes.

- [ ] **Step 3: Record the verified commit**

```bash
git status --short --branch
git log --oneline --max-count=8
```

Expected: clean worktree, focused Conventional Commits, branch based on current `origin/main`.
