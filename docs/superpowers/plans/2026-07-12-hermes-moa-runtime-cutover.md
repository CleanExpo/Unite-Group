# Hermes OWNEST MoA Runtime Cutover — Superseded Historical Plan

> **Status: SUPERSEDED — do not execute this plan.** MoA configuration was isolated to a
> dedicated `ownest` profile and `unite-group-ownest` board. The default and
> Empire profiles keep their current Codex models. The former same-user OWNEST
> LaunchAgent and live activation steps are retired: profile validation is
> configuration evidence only until a dedicated-UID executor and independent verifier
> are separately designed and approved.

> The task list below preserves the 12 July investigation and configuration
> history; it is not an implementation queue. The reviewed package now emits
> only the one-file refusal container—no OWNEST command, `dist/host`, heartbeat,
> presence writer, or host worker. The former sanitizer is an exit-78 tombstone.
> Its historic same-UID plaintext rollback copies are a credential-migration
> blocker and must not be recreated or deleted outside the separately authorised
> security runbook.

**Historical goal:** Preserve a bounded OWNEST MoA configuration and clean
duplicate/stale runtime work without activating continuous production execution.

**Architecture:** The default Hermes gateway remains the Telegram/intake edge.
Only `ownest` retained the reserved MoA provider/board configuration. It has no
independent gateway, cron job, launch agent, alias, authorised dispatcher, or
emitted runner. No current step in this document may mutate that profile.

**Historical surfaces:** Hermes Agent 0.18.2, launchd, Hermes Kanban/Cron/MoA CLI, and YAML configuration. There is no Unite-Group OWNEST runtime surface.

---

### Historical task 1: Baseline evidence and the invalid backup assumption

Read-only health and queue evidence was captured before the configuration work.
The original plan also copied Hermes/profile configuration into timestamped
same-UID files and treated mode `0600` as sufficient. Later security review
invalidated that assumption: processes under the same UID can read those files,
and broader plaintext rollback copies now exist outside this repository.

Do not repeat those copy commands. Preserve the files untouched until a
founder-authorised credential-migration runbook inventories names/consumers,
creates verified replacements in 1Password or platform-native secret stores,
rotates/revokes the old values, and only then safely removes the historic copies.
No value was read during this documentation/security audit.

### Historical task 2: Quarantine duplicate and orphaned work

**Files:**
- Modify through CLI: `~/.hermes/cron/jobs.json`
- Quarantine: `~/Library/LaunchAgents/in.unite-group.operator-jobs.plist`

- [x] **Step 1: Identify the duplicate set by content, not by title alone**

The read-only pre-cleanup parser grouped entries by
`(name, prompt, script, schedule)` and identified exactly 21 identical orphaned
`claim job` entries. No survivor was retained.

Expected: 21 pause IDs and no survivor; abort this task if the group shape changed.

- [x] **Step 2: Pause all 21 duplicates and verify zero active orphaned claim loops**

For each pause ID:

```bash
hermes cron pause <JOB_ID>
```

Then rerun the grouping check and `hermes cron status`.

Expected: zero active members remain; no job is deleted.

- [x] **Step 3: Unload and quarantine the orphaned legacy poller**

```bash
launchctl unload "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist"
mkdir -p "$HOME/Library/LaunchAgents.disabled-2026-07-12-ownest"
mv "$HOME/Library/LaunchAgents/in.unite-group.operator-jobs.plist" "$HOME/Library/LaunchAgents.disabled-2026-07-12-ownest/"
launchctl list | rg 'in\.unite-group\.operator-jobs' && exit 1 || true
```

Recorded result: no loaded service remains and the plist is recoverable in the
dated quarantine directory.

- [x] **Step 4: Diagnose, then resolve, the two 90-second bridge failures**

Inspect their last-run output and the invoked script. Classify each as one of:

- duplicate/obsolete bridge: pause it;
- valid long-running profile tick: run one observed manual tick with a bounded external timeout, capture actual duration, then set `cron.script_timeout_seconds` to at least twice the measured healthy duration and no more than 900 seconds;
- genuinely hung work: leave paused and create a CRM blocker with evidence.

Recorded result: both bridge jobs completed under the 300-second bound; no active
bridge remains in a known repeat-timeout state. This is hygiene evidence, not
canary authority.

### Historical task 3: Apply the fail-closed runtime baseline

The commands in historical tasks 3–4 record the settings considered/applied on
12 July. They are retained for audit context only and must not be re-run from
this plan. Configuration/profile state is not a runtime, credential boundary, or
capacity proof.

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

### Historical task 4: Persist the bounded OWNEST MoA provider

**Files:**
- Create through CLI: `~/.hermes/profiles/ownest/config.yaml`

- [ ] **Step 1: Bound the existing preset**

```bash
hermes profile create ownest --clone-from empire --no-alias
hermes --profile ownest config set moa.presets.default.fanout user_turn
hermes --profile ownest config set moa.presets.default.reference_max_tokens 600
hermes --profile ownest config set moa.active_preset default
hermes --profile ownest config set kanban.default_board unite-group-ownest
hermes --profile ownest config set kanban.default_assignee ownest
hermes --profile ownest config set kanban.max_in_progress 1
hermes --profile ownest config set kanban.max_in_progress_per_profile 1
```

Expected: the profile exists without an alias, reference and aggregator model mappings are unchanged, fan-out is `user_turn`, advisor output is capped, the preset is active, and the profile is pinned to its dedicated board at concurrency one. Abort if the CLI would copy crons, a gateway, a launch agent, or mutable shared queue state.

- [ ] **Step 2: Persist MoA for OWNEST only**

```bash
hermes --profile ownest config set model.provider moa
hermes --profile ownest config set model.default default
```

Expected: OWNEST resolves to `moa:default`; the default and Empire profiles still resolve to their unchanged `openai-codex:gpt-5.6-sol` model.

- [ ] **Step 3: Validate and restart the managed gateway**

```bash
hermes config check
hermes --profile empire config check
hermes --profile ownest config check
hermes gateway restart
hermes gateway status
hermes --profile ownest moa list
curl --silent --show-error --max-time 3 http://127.0.0.1:8642/health | jq '{status,version}'
```

Expected: gateway healthy, OWNEST MoA preset configured but not executing, no
independent OWNEST gateway/cron/service exists, and no model change occurred on
the default or Empire profiles.

### Current containment task 5: Retire any stale user-level OWNEST service

**Files:**
- Security tombstone: `apps/autopilot-runner/scripts/ownest-launchd.sh`
- Uninstall-only cleanup: `apps/autopilot-runner/scripts/install-ownest-service.sh`
- Possible stale service: `~/Library/LaunchAgents/in.unite-group.ownest.plist`

- [ ] **Step 1: Verify the service cannot start or install**

The wrapper must exit `78` before environment/configuration access. The installer
must reject every mode except `--uninstall`; there is no dry-run or
verified-commit installation path.

- [ ] **Step 2: Remove a stale service if present**

```bash
cd apps/autopilot-runner
bash scripts/install-ownest-service.sh --uninstall
```

Expected: `in.unite-group.ownest` is absent from launchd, any plist is archived,
and the log is retained. No worker is started.

### Current containment task 6: Keep OWNEST in design/test verification

- [ ] **Step 1: Run package verification without production configuration**

```bash
cd apps/autopilot-runner
npm ci
npm test
npm run type-check
npm run build
```

Expected: tests prove reconcile-first state transitions, the isolation gate
rejects production live configuration, an absolute Hermes path is validated as
a contract input, and the default independent verifier rejects completion. The
build must emit only `dist/container/index.js`; there is no built worker to
invoke and no real service-role credential may be supplied to this package.

- [ ] **Step 2: Record configuration evidence accurately**

`hermes --profile ownest config check` and `hermes --profile ownest moa list` may
prove only profile shape. They do not prove a service is running, a Max plan is
being consumed, remaining capacity, independent validation, or spend authority.

### Future architecture gate 7: Specify the replacement before any canary

A future canary requires a new reviewed design with all of these controls:

- a dedicated OS UID and sealed HOME/workspace;
- a pinned, integrity-checked Hermes executable;
- brokered operation-scoped CRM credentials rather than a reusable service role
  visible to the child;
- enforceable filesystem, process, network-egress, and tool policy;
- a separately operated completion verifier that independently retrieves
  evidence and validates artifact digests/model-family separation;
- observable scheduling, overlap prevention, STOP/rollback proof, and a
  founder-approved one-task admission packet.

Until those controls pass adversarial review, `CC_OWNEST_LIVE=1` remains blocked,
no canary is run, and no widening packet can treat profile authentication as
execution evidence.
