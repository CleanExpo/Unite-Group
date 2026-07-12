# Hermes Empire MoA Runtime Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely activate continuous, bounded MoA reasoning for CRM-owned background missions while removing duplicate/stale runtime work and retaining a one-minute rollback.

**Architecture:** The default Hermes gateway remains the fast Telegram/intake edge and dispatches CRM mirrors to the Empire profile. Only Empire persists the MoA provider. Runtime changes are scalar, reversible, backed up with original permissions, and applied only after queue hygiene; the canary runs at concurrency one before the operating cap can rise to three.

**Tech Stack:** Hermes Agent 0.18.2, launchd, Hermes Kanban/Cron/MoA CLI, YAML configuration, Unite-Group OWNEST runner.

---

### Task 1: Capture a rollback-safe baseline

**Files:**
- Read: `~/.hermes/config.yaml`
- Read: `~/.hermes/profiles/empire/config.yaml`
- Read: `~/.hermes/cron/jobs.json`
- Read: `~/Library/LaunchAgents/in.unite-group.operator-jobs.plist`

- [ ] **Step 1: Create timestamped, permission-preserving backups**

```bash
mkdir -p "$HOME/.hermes/change-backups/2026-07-12-ownest-moa"
cp -p "$HOME/.hermes/config.yaml" "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/default-config.yaml"
cp -p "$HOME/.hermes/profiles/empire/config.yaml" "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/empire-config.yaml"
cp -p "$HOME/.hermes/cron/jobs.json" "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/default-cron-jobs.json"
cp -p "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist" "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/operator-jobs.plist"
```

Expected: files exist, configuration backups remain mode `0600`, and no secret value is printed.

- [ ] **Step 2: Record read-only health and queue evidence**

```bash
hermes status
hermes gateway status
hermes cron status
hermes --profile empire moa list
hermes --profile empire kanban list --json --sort created-desc
curl --silent --show-error --max-time 3 http://127.0.0.1:8642/health | jq '{status,version}'
```

Expected: gateway healthy, MoA preset present but inactive, and the pre-change Kanban/cron counts captured without credentials.

### Task 2: Quarantine duplicate and orphaned work

**Files:**
- Modify through CLI: `~/.hermes/cron/jobs.json`
- Quarantine: `~/Library/LaunchAgents/in.unite-group.operator-jobs.plist`

- [ ] **Step 1: Identify the duplicate set by content, not by title alone**

Use a read-only parser to group active cron entries by `(name, prompt, script, schedule)`. Confirm there are exactly 21 identical active `claim job` entries and select the oldest job ID as the survivor.

Expected: one survivor ID and 20 pause IDs; abort this task if the group shape changed.

- [ ] **Step 2: Pause 20 duplicates and verify one survivor**

For each pause ID:

```bash
hermes cron pause <JOB_ID>
```

Then rerun the grouping check and `hermes cron status`.

Expected: exactly one active member remains; no job is deleted.

- [ ] **Step 3: Unload and quarantine the orphaned legacy poller**

```bash
launchctl unload "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist"
mkdir -p "$HOME/Library/LaunchAgents.disabled-2026-07-12-ownest"
mv "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist" "$HOME/Library/LaunchAgents.disabled-2026-07-12-ownest/"
launchctl list | rg 'in\.unite-group\.operator-jobs' && exit 1 || true
```

Expected: no loaded service and the plist remains recoverable in the dated quarantine directory.

- [ ] **Step 4: Diagnose, then resolve, the two 90-second bridge failures**

Inspect their last-run output and the invoked script. Classify each as one of:

- duplicate/obsolete bridge: pause it;
- valid long-running profile tick: run one observed manual tick with a bounded external timeout, capture actual duration, then set `cron.script_timeout_seconds` to at least twice the measured healthy duration and no more than 900 seconds;
- genuinely hung work: leave paused and create a CRM blocker with evidence.

Expected: no active bridge job remains in a known repeat-timeout state before canary.

### Task 3: Apply the fail-closed runtime baseline

**Files:**
- Modify through CLI: `~/.hermes/config.yaml`
- Modify through CLI: `~/.hermes/profiles/empire/config.yaml`

- [ ] **Step 1: Harden the default profile without changing its model**

```bash
hermes config set approvals.mode manual
hermes config set approvals.destructive_slash_confirm true
hermes config set security.tirith_fail_open false
hermes config set security.allow_lazy_installs false
hermes config set tool_loop_guardrails.hard_stop_enabled true
hermes config set agent.verify_on_stop true
hermes config set privacy.redact_pii true
hermes config set kanban.orchestrator_profile empire
hermes config set kanban.default_assignee empire
hermes config set kanban.max_in_progress 1
hermes config set kanban.max_in_progress_per_profile 1
hermes config set kanban.auto_decompose true
```

Expected: default model remains `openai-codex:gpt-5.6-sol`; only safety and canary orchestration change.

- [ ] **Step 2: Harden Empire and bound delegated leaves**

```bash
hermes --profile empire config set approvals.mode manual
hermes --profile empire config set approvals.destructive_slash_confirm true
hermes --profile empire config set security.tirith_fail_open false
hermes --profile empire config set security.allow_lazy_installs false
hermes --profile empire config set tool_loop_guardrails.hard_stop_enabled true
hermes --profile empire config set agent.verify_on_stop true
hermes --profile empire config set privacy.redact_pii true
hermes --profile empire config set delegation.provider openai-codex
hermes --profile empire config set delegation.model gpt-5.6-sol
hermes --profile empire config set delegation.max_concurrent_children 2
hermes --profile empire config set delegation.max_spawn_depth 1
hermes --profile empire config set delegation.orchestrator_enabled true
hermes --profile empire config set delegation.subagent_auto_approve false
hermes --profile empire config set kanban.max_in_progress 1
hermes --profile empire config set kanban.max_in_progress_per_profile 1
```

Expected: approvals are no longer off and delegated leaves cannot recursively multiply MoA.

- [ ] **Step 3: Validate configuration before activating MoA**

```bash
hermes config check
hermes --profile empire config check
```

Expected: both exit 0. On failure, restore both backup files and stop.

### Task 4: Persist the bounded Empire MoA provider

**Files:**
- Modify through CLI: `~/.hermes/profiles/empire/config.yaml`

- [ ] **Step 1: Bound the existing preset**

```bash
hermes --profile empire config set moa.presets.default.fanout user_turn
hermes --profile empire config set moa.presets.default.reference_max_tokens 600
hermes --profile empire config set moa.active_preset default
```

Expected: reference and aggregator model mappings are unchanged, fan-out is `user_turn`, advisor output is capped, and the preset is active.

- [ ] **Step 2: Persist MoA for Empire only**

```bash
hermes --profile empire config set model.provider moa
hermes --profile empire config set model.default default
```

Expected: Empire resolves to `moa:default`; the default profile still resolves to `openai-codex:gpt-5.6-sol`.

- [ ] **Step 3: Validate and restart the managed gateway**

```bash
hermes config check
hermes --profile empire config check
hermes gateway restart
hermes gateway status
hermes --profile empire moa list
curl --silent --show-error --max-time 3 http://127.0.0.1:8642/health | jq '{status,version}'
```

Expected: gateway healthy, Empire MoA active, no model change on the default profile.

### Task 5: Deploy the OWNEST worker in a reproducible runtime checkout

**Files:**
- Runtime checkout: `/Users/phill-mac/Unite-Group-OWNEST`
- Service: `~/Library/LaunchAgents/in.unite-group.ownest.plist`

- [ ] **Step 1: Create or update a registered runtime worktree**

Create the runtime checkout from the exact verified OWNEST commit. Do not reuse `/Users/phill-mac/Unite-Group-runner`. Preserve the existing `.env.local` by copying it without printing and retain its restrictive file mode.

Expected: `git -C /Users/phill-mac/Unite-Group-OWNEST status --short --branch` identifies a registered worktree at the verified commit.

- [ ] **Step 2: Build and install with the live switch still off**

```bash
cd /Users/phill-mac/Unite-Group-OWNEST/apps/autopilot-runner
npm ci
npm test
npm run type-check
npm run build
CC_OWNEST_LIVE=0 node dist/ownest-tick.js
bash scripts/install-ownest-service.sh
```

Expected: tests/build pass, shadow tick drains, LaunchAgent is loaded, and no CRM/Hermes mission is created.

### Task 6: Execute one low-risk advisory canary

**Files:**
- Modify at runtime: `/Users/phill-mac/Unite-Group-OWNEST/.env.local`
- Write through worker: founder-scoped CRM events/evidence and one Hermes mirror task

- [ ] **Step 1: Pin canary controls**

Set without printing secret values:

```text
CC_OWNEST_LIVE=1
CC_OWNEST_CANARY_LIMIT=1
CC_OWNEST_MAX_IN_PROGRESS=1
CC_OWNEST_DAILY_DISPATCH_LIMIT=1
CC_OWNEST_LEASE_MS=300000
HERMES_PROFILE=empire
```

Expected: one new dispatch maximum for the day.

- [ ] **Step 2: Trigger one bounded tick and capture evidence**

```bash
cd /Users/phill-mac/Unite-Group-OWNEST/apps/autopilot-runner
node dist/ownest-tick.js
hermes --profile empire kanban list --json --sort created-desc
```

Expected: exactly one eligible low-risk advisory CRM task receives one Hermes mirror ID and one started event. No second task is created.

- [ ] **Step 3: Reconcile to terminal evidence**

Allow launchd ticks to continue. Inspect CRM task, task events, evidence record, Hermes task JSON, service log, and gateway health.

Pass criteria:

- deterministic idempotency key;
- one Hermes task only;
- current lease/heartbeat while live;
- terminal status matches Hermes;
- evidence is written before CRM `done`;
- no secret/PII appears in body, output, or logs;
- no production/spend/external/destructive action occurs.

### Task 7: Prove the stop/restore path and widen only after proof

**Files:**
- Restore source: `~/.hermes/change-backups/2026-07-12-ownest-moa/`

- [ ] **Step 1: Test the OWNEST stop path**

Turn `CC_OWNEST_LIVE` off, unload `in.unite-group.ownest`, and verify no new mirror appears during a two-minute observation window.

Expected: stop completes within one minute and existing CRM evidence remains intact.

- [ ] **Step 2: Test the Hermes configuration rollback without deleting evidence**

```bash
cp -p "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/default-config.yaml" "$HOME/.hermes/config.yaml"
cp -p "$HOME/.hermes/change-backups/2026-07-12-ownest-moa/empire-config.yaml" "$HOME/.hermes/profiles/empire/config.yaml"
hermes gateway restart
hermes gateway status
```

Expected: prior models/settings restored and gateway healthy. Reapply the verified cutover only after this drill passes.

- [ ] **Step 3: Widen from one to three**

Only after the canary and rollback proof are clean:

```bash
hermes config set kanban.max_in_progress 3
hermes config set kanban.max_in_progress_per_profile 2
hermes --profile empire config set kanban.max_in_progress 3
hermes --profile empire config set kanban.max_in_progress_per_profile 2
```

Set `CC_OWNEST_MAX_IN_PROGRESS=3` and a Board-approved daily dispatch budget. Keep every hard action gate unchanged.
