# Agentic Nexus Control Plane Enforcement Package

This folder is the local-first control-plane workspace for Agentic Nexus inside the Obsidian-backed 2nd Brain vault.

Agentic Nexus coordinates Hermes, Obsidian memory, GitHub repositories, local workers, task queues, evidence ledgers, approval gates, and dashboard/status feeds for the Unite-Group Nexus ecosystem.

## Source policy and schemas

`auth.md` is the human-readable authentication and authorisation policy.

The JSON files are the first machine-readable enforcement foundation derived from `auth.md` and the diagnostic layer docs:

- `auth.schema.json` — schema for the overall authorisation policy.
- `agent_session.schema.json` — schema for every agent session request.
- `scope_policy.schema.json` — schema for classifying read/write/execute/restricted/forbidden scopes.
- `approval_gate.schema.json` — schema for human approval requests before restricted actions.
- `evidence_record.schema.json` — schema for evidence records produced by research, coding, strategy, compliance, dashboard, QA, and business work.
- `forbidden_actions.json` — machine-readable deny list for blocked actions and control-plane bypass attempts.
- `agent_scope_matrix.json` — first-pass map of which agent types can request which scopes.
- `diagnostic_gate.schema.json` — mandatory diagnostic-first checklist required before execution.

## How the control plane should use these files

1. Read `auth.md` as the human-readable source of truth.
2. Validate proposed agent sessions against `agent_session.schema.json`.
3. Check requested scopes against `agent_scope_matrix.json`.
4. Classify each requested scope with `scope_policy.schema.json` rules.
5. Deny anything listed in `forbidden_actions.json`.
6. Require `diagnostic_gate.schema.json` completion before execution scopes are granted.
7. For restricted or sensitive actions, create an `approval_gate.schema.json` object and stop until human approval is recorded.
8. Require an `evidence_record.schema.json` object for every meaningful action.

## Agent validation before running

Before a worker receives a task, the control plane must verify:

- agent type is supported;
- session has a valid `agent_id`, `worker_id`, project, task, and expiry;
- diagnostic gate is complete;
- requested scopes are allowed for that agent type;
- restricted scopes have a valid approval gate;
- forbidden actions are not being attempted;
- evidence requirements are declared;
- escalation state is correct for medium/high/critical risk.

## Worker task preconditions

A worker must not receive work until:

1. the request has passed context discovery, purpose mapping, friction mapping, gap detection, business value review, and priority scoring;
2. the agent session validates;
3. requested scopes are resolved into granted/denied/requires-approval;
4. approval gates are satisfied for restricted actions;
5. the evidence record destination is known;
6. the task queue and audit log references are attached.

## Runtime validator

`validate_agent_session.py` is the smallest useful runtime enforcement utility for Agentic Nexus.

It reads the local policy/schema files derived from `auth.md`:

- `auth.schema.json`
- `agent_session.schema.json`
- `scope_policy.schema.json`
- `approval_gate.schema.json`
- `evidence_record.schema.json`
- `agent_scope_matrix.json`
- `forbidden_actions.json`
- `diagnostic_gate.schema.json`

Then it evaluates a proposed agent session JSON file and returns one fail-closed decision:

- `allowed`
- `denied`
- `requires_human_approval`
- `diagnostic_required`

`auth.md` remains the human-readable source policy. The JSON schemas and policy files are the machine-readable enforcement layer. The validator is the first local runtime that applies those boundaries before a worker receives a task.

Run examples from this folder:

```bash
python3 validate_agent_session.py examples/session_allowed.json
python3 validate_agent_session.py examples/session_diagnostic_required.json
python3 validate_agent_session.py examples/session_requires_approval.json
python3 validate_agent_session.py examples/session_denied.json
```

Future local workers should call `validate_agent_session.py` before accepting any task. They must:

1. refuse `denied` sessions;
2. stop and request diagnostic completion for `diagnostic_required` sessions;
3. pause and wait for a valid approval gate for `requires_human_approval` sessions;
4. proceed only for `allowed` sessions, and only within the returned `allowed_scopes`.

See:

- `RUN_VALIDATION_EXAMPLES.md`
- `VALIDATOR_RESULTS.md`

## Worker preflight wrapper

`worker_preflight.py` is the local worker gate.

It accepts a proposed session JSON file, calls `validate_agent_session.py`, parses the validator decision, maps it to a worker action, writes an audit record, and returns a preflight JSON result.

Every local worker must run it before accepting a task because validation alone is not enough: the worker also needs an explicit start/stop/refuse/pause decision.

Decision mapping:

- `allowed` -> `worker_can_start` / `proceed`
- `denied` -> `worker_refused_denied` / `refuse`
- `diagnostic_required` -> `worker_stopped_diagnostic_required` / `stop_until_diagnostic_gate_completed`
- `requires_human_approval` -> `worker_paused_human_approval_required` / `pause_until_human_approval`
- unknown, malformed, missing, or unclear output -> `worker_failed_closed` / `fail_closed`

Audit records are appended locally to:

```text
audit/preflight_audit.jsonl
```

Run examples from this folder:

```bash
python3 worker_preflight.py examples/session_allowed.json
python3 worker_preflight.py examples/session_diagnostic_required.json
python3 worker_preflight.py examples/session_requires_approval.json
python3 worker_preflight.py examples/session_denied.json
```

See:

- `RUN_PREFLIGHT_EXAMPLES.md`
- `PREFLIGHT_RESULTS.md`

## Local task queue and worker claim flow

`task_queue.jsonl` is the first controlled local queue for Agentic Nexus tasks. Each queued task links intent, friction, gap, business value, priority, risk, required agent type, assigned agent/session metadata, required scopes, evidence requirements, diagnostic/approval flags, and a `session_file`.

`worker_claim_task.py` is the local claim gate. It accepts:

```bash
python3 worker_claim_task.py --task-id TASK_ID --worker-id WORKER_ID
```

It reads `task_queue.jsonl`, verifies the task exists and is claimable, calls `worker_preflight.py` with the task's `session_file`, and only updates the task to `claimed` when preflight returns:

- `preflight_status: worker_can_start`
- `can_worker_start: true`

Unsafe results become blocked task statuses instead of claims:

- `worker_stopped_diagnostic_required` -> `blocked_diagnostic_required`
- `worker_paused_human_approval_required` -> `blocked_human_approval_required`
- `worker_refused_denied` -> `blocked_denied`
- unclear/malformed/missing output -> fail closed, no claim

Claim audit records are appended locally to:

```text
audit/task_claim_audit.jsonl
```

Run examples from this folder:

```bash
python3 worker_claim_task.py --task-id task_allowed_001 --worker-id local-build-worker-01
python3 worker_claim_task.py --task-id task_diagnostic_required_001 --worker-id local-research-worker-01
python3 worker_claim_task.py --task-id task_requires_approval_001 --worker-id local-build-worker-01
python3 worker_claim_task.py --task-id task_denied_001 --worker-id local-build-worker-01
```

See:

- `RUN_TASK_CLAIM_EXAMPLES.md`
- `TASK_CLAIM_RESULTS.md`

## Worker completion gate and evidence ledger

`worker_complete_task.py` is the local completion gate. It accepts:

```bash
python3 worker_complete_task.py --task-id TASK_ID --worker-id WORKER_ID --evidence-file EVIDENCE_FILE
```

It reads `task_queue.jsonl`, verifies the task exists, verifies the task is currently `claimed`, verifies the supplied worker matches `assigned_worker_id`, parses the evidence JSON file, validates required evidence fields, appends valid evidence to the local ledger, updates the task to `completed`, and writes a completion audit record.

Evidence is required because a worker claim only proves the worker was allowed to start. Completion requires proof of output, source, confidence, freshness, contradiction status, business relevance, linked decision/gap/output, and a recommended next action.

Valid evidence records are appended locally to:

```text
evidence/evidence_ledger.jsonl
```

Every completion attempt is audited locally at:

```text
audit/task_completion_audit.jsonl
```

Completion stops or fails closed when:

- the task does not exist;
- the task is not `claimed`;
- the worker does not match the assigned worker;
- evidence is missing, malformed, mismatched, incomplete, or does not satisfy the task's required evidence type;
- queue, ledger, or audit writes are unclear.

Run examples from this folder:

```bash
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id local-build-worker-01 --evidence-file examples/evidence_allowed_completion.json
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id wrong-worker-01 --evidence-file examples/evidence_allowed_completion.json
python3 worker_complete_task.py --task-id task_diagnostic_required_001 --worker-id local-research-worker-01 --evidence-file examples/evidence_allowed_completion.json
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id local-build-worker-01 --evidence-file examples/evidence_invalid_missing_fields.json
```

See:

- `RUN_TASK_COMPLETION_EXAMPLES.md`
- `TASK_COMPLETION_RESULTS.md`

## Local dashboard status feed

`generate_dashboard_status_feed.py` creates the first local visibility feed for Agentic Nexus. It reads:

- `task_queue.jsonl`
- `evidence/evidence_ledger.jsonl`
- `audit/preflight_audit.jsonl`
- `audit/task_claim_audit.jsonl`
- `audit/task_completion_audit.jsonl`

It writes one machine-readable record per task to:

```text
dashboard_status_feed.jsonl
```

Each feed record links current task state with evidence counts and latest preflight, claim, and completion audit status. This gives any later UI a verified local source of truth instead of letting a dashboard invent state or bypass task, approval, diagnostic, and evidence gates.

It also writes a human-readable summary to:

```text
DASHBOARD_STATUS_SUMMARY.md
```

The summary includes task counts, status counts, completed/claimed/blocked breakdowns, evidence/audit counts, risks, and the next recommended control-plane action.

Run from this folder:

```bash
python3 generate_dashboard_status_feed.py
```

See:

- `RUN_DASHBOARD_FEED.md`
- `DASHBOARD_FEED_RESULTS.md`

## Approval object store and resolver

`approvals/approval_store.jsonl` is the first local approval object store for Agentic Nexus. It records human approval decisions for approval-gated tasks, including requested action, affected project/files/systems, risk level, evidence supplied, required approver, approval status, approver/rejecter, decision notes, expiry, and audit reference.

`resolve_approval_request.py` is the local approval resolver. It accepts:

```bash
python3 resolve_approval_request.py --task-id TASK_ID --approval-id APPROVAL_ID
```

It reads `task_queue.jsonl` and `approvals/approval_store.jsonl`, verifies the task exists, verifies the task is currently `blocked_human_approval_required`, verifies the approval links to the task, verifies the approval status is `approved`, verifies it was approved by the allowed human owner (`Phill McGurk`), verifies it has not expired, verifies the requested action clearly relates to the blocked task, verifies evidence is supplied or explicitly documented, and then returns the task to `queued`.

Approval-required tasks cannot proceed without this valid approval object. The resolver does not claim, execute, complete, deploy, publish, or bypass worker validation. It only moves a valid approval-blocked task back to `queued` so the normal `worker_claim_task.py` and `worker_preflight.py` gates control execution.

Approval resolution audit records are appended locally to:

```text
audit/approval_resolution_audit.jsonl
```

`generate_dashboard_status_feed.py` now also reads:

- `approvals/approval_store.jsonl`
- `audit/approval_resolution_audit.jsonl`

The dashboard feed and summary now include approval count, approved/pending/rejected/expired counts, approval audit count, tasks requeued after approval, approval-required tasks, and risks related to pending, invalid, rejected, or expired approvals.

Run examples from this folder:

```bash
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_approved
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_rejected
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_expired
python3 resolve_approval_request.py --task-id task_allowed_001 --approval-id approval_task_requires_approval_001_approved
python3 generate_dashboard_status_feed.py
```

See:

- `RUN_APPROVAL_RESOLUTION_EXAMPLES.md`
- `APPROVAL_RESOLUTION_RESULTS.md`

## Worker registry now gates task claiming

`worker_claim_task.py` now reads `worker_registry.jsonl` before any preflight work. The claim gate is layered:

1. **Task must exist and be claimable.** Status must be `queued` or `claim_pending`.
2. **Worker registry check.** Runs immediately after the task is found and before any task field validation. The supplied `--worker-id` must:
   - exist in `worker_registry.jsonl`;
   - have `status == "available"` and no active `current_task_id`;
   - have a `machine_role` that is allowed for the task's `required_agent_type` (per the role compatibility matrix below).
3. **Preflight and validator check.** The task's `session_file` must still pass `worker_preflight.py` → `validate_agent_session.py`, the preflight `agent_type` must match the task's `required_agent_type`, the preflight `agent_id` must match the task's `assigned_agent_id`, and the validator must return `allowed`.

If the worker registry check fails, the claim is refused before preflight runs. Preflight is never bypassed, removed, or weakened. The new `claim_status` values are additive (`worker_not_registered`, `worker_not_available`, `worker_role_not_allowed`, `worker_registry_missing`, `worker_registry_invalid`); the original values (`task_claimed`, `task_not_claimable`, `task_claim_failed_closed`, `task_not_found`, `task_blocked_*`) are preserved.

### What this means in practice

- **Unregistered workers cannot claim tasks.** `ghost-worker-99` returns `worker_not_registered` and the task is not modified.
- **Unavailable workers cannot claim tasks.** A worker with `status` in `paused`, `busy`, `offline`, or `needs_review` returns `worker_not_available`. A worker with a non-null `current_task_id` also returns `worker_not_available`.
- **Role-incompatible workers cannot claim tasks.** `local-research-worker-01` cannot claim a task that requires `Principal Software Engineer Agent`; it returns `worker_role_not_allowed`.
- **Compatible registered workers still pass through preflight.** A successful claim still requires the session to validate as `allowed`, the preflight to return `worker_can_start`, and the agent_type/agent_id alignment checks to pass.
- **Unknown or ambiguous `required_agent_type` fails closed.** If a task's `required_agent_type` is empty or not in the role matrix, the claim returns `task_claim_failed_closed` with `worker_registry_check=worker_registry_check_failed`.

### Role compatibility matrix (first safe mapping)

| machine_role | allowed required_agent_types |
|---|---|
| `command_node` | `Hermes CEO Orchestrator`, `Senior Project Manager Agent`, `Dashboard Reporter Agent` |
| `build_worker` | `Principal Software Engineer Agent`, `QA/Test Agent`, `Documentation Agent`, `Dashboard Reporter Agent` |
| `research_worker` | `Context Discovery Agent`, `Purpose Mapping Agent`, `Friction Mapping Agent`, `Research Director Agent`, `Evidence Validator Agent`, `SEO/AEO/GEO Agent`, `Marketing Strategy Agent`, `Brand Authority Agent`, `Business Operations Agent`, `Finance Awareness Agent`, `Legal/Compliance Awareness Agent`, `Documentation Agent`, `Dashboard Reporter Agent` |

### New claim result and audit fields

Every claim attempt (success or failure) now returns (and writes to `audit/task_claim_audit.jsonl`) the following worker registry fields:

- `worker_registered`: `bool`
- `worker_status`: registered worker's current status, or `null`
- `worker_machine_role`: registered worker's `machine_role`, or `null`
- `worker_role_allowed`: `bool`
- `worker_registry_check`: one of `worker_registry_passed`, `worker_not_registered`, `worker_not_available`, `worker_role_not_allowed`, `worker_registry_missing`, `worker_registry_invalid`, `worker_registry_check_failed`
- `worker_registry_reasons`: `list[str]` of human-readable reasons

`generate_dashboard_status_feed.py` also reads `worker_registry.jsonl` to enrich each per-task feed record with `assigned_worker_exists`, `assigned_worker_status`, `assigned_worker_machine_role`, `assigned_worker_role_allowed`. The dashboard now shows whether the currently-assigned worker is registered, what its status is, and whether its role allows the task.

Run from this folder:

```bash
# Compile-check
python3 -m py_compile register_worker.py
python3 -m py_compile update_worker_heartbeat.py
python3 -m py_compile worker_claim_task.py
python3 -m py_compile worker_preflight.py
python3 -m py_compile validate_agent_session.py
python3 -m py_compile generate_dashboard_status_feed.py

# Four required claim tests
python3 worker_claim_task.py --task-id task_worker_registry_allowed_001 --worker-id local-build-worker-01
python3 worker_claim_task.py --task-id task_worker_registry_wrong_role_001 --worker-id ghost-worker-99
python3 worker_claim_task.py --task-id task_worker_registry_research_001 --worker-id local-build-worker-paused-01
python3 worker_claim_task.py --task-id task_worker_registry_wrong_role_001 --worker-id local-research-worker-01

# Regenerate the dashboard feed
python3 generate_dashboard_status_feed.py
```

See:

- `RUN_TASK_CLAIM_EXAMPLES.md`
- `WORKER_CLAIM_REGISTRY_RESULTS.md`

## Local worker registry

`worker_registry.jsonl` is the first local registry of the three computers that will run work as controlled Agentic Nexus workers. Each record carries `worker_id`, `worker_name`, `machine_role`, `description`, `status`, `allowed_agent_types`, `allowed_task_types`, `allowed_projects`, `current_task_id`, `capabilities`, `limitations`, `last_heartbeat_at`, `registered_at`, `updated_at`, and `notes`. Allowed statuses are `available`, `busy`, `offline`, `paused`, `needs_review`.

`register_worker.py` adds or updates a worker record. It accepts:

```bash
python3 register_worker.py --worker-id WORKER_ID --worker-name WORKER_NAME --machine-role ROLE --status STATUS
```

It validates the four required fields, validates the status against the allowed set, refreshes `last_heartbeat_at` and `updated_at`, sets `registered_at` only on first registration, writes the registry back atomically, appends a `worker_registered` or `worker_updated` event to `worker_events.jsonl`, and returns a JSON result with `registration_status` of `worker_registered`, `worker_updated`, or `worker_registration_failed`.

`update_worker_heartbeat.py` refreshes a worker's `last_heartbeat_at` and `status`. It accepts:

```bash
python3 update_worker_heartbeat.py --worker-id WORKER_ID --status STATUS
```

It locates the worker, updates `last_heartbeat_at` and `status` (and `updated_at`), writes the registry back, appends a `heartbeat_updated` event, and returns a JSON result with `heartbeat_status` of `heartbeat_updated`, `worker_not_found`, or `heartbeat_failed`.

Both scripts are Python standard-library only — no network, no external packages, no database calls, no destructive actions.

How this prepares the three-computer Agentic Nexus setup:

- `command-node-01` represents the local Agentic Nexus command node that owns coordination, queue visibility, dashboard feed, approval visibility, and task routing.
- `local-build-worker-01` represents the build/test computer; it is allowed to run validated local build, documentation, evidence, and completion tasks.
- `local-research-worker-01` represents the research/business-intelligence computer; it is allowed to run diagnostic, Obsidian, evidence review, content, SEO/AEO/GEO, and business research tasks.

`generate_dashboard_status_feed.py` now also reads `worker_registry.jsonl` and includes `worker_count`, `worker_available_count`, `worker_busy_count`, `worker_offline_count`, `worker_paused_count`, `worker_needs_review_count`, a per-status count map, and a "Worker visibility" section listing each worker with its last heartbeat and current task.

The current registration step is visibility/heartbeat only. It does NOT allow any worker to claim, start, complete, deploy, publish, send email, mutate any database, or perform any destructive action.

Run from this folder:

```bash
python3 register_worker.py --worker-id command-node-01 --worker-name "Command Node 01" --machine-role command_node --status available
python3 register_worker.py --worker-id local-build-worker-01 --worker-name "Local Build Worker 01" --machine-role build_worker --status available
python3 register_worker.py --worker-id local-research-worker-01 --worker-name "Local Research Worker 01" --machine-role research_worker --status available
python3 update_worker_heartbeat.py --worker-id local-build-worker-01 --status available
python3 generate_dashboard_status_feed.py
```

See:

- `RUN_WORKER_REGISTRY.md`
- `WORKER_REGISTRY_RESULTS.md`

## What remains to implement next

The smallest useful next action is to add worker status transitions so `worker_claim_task.py` sets the worker's `current_task_id` and `status` to `busy` on a successful claim, and `worker_complete_task.py` clears `current_task_id` and sets the worker's `status` back to `available` (or to `needs_review` if the completion evidence is invalid) on a successful or failed completion. A secondary improvement is to have `worker_claim_task.py` reject claims with `worker_not_available` if the worker's `last_heartbeat_at` is older than a configurable freshness window.

No dashboard UI, deployment, production system access, database mutation, external email, public publishing, billing action, or destructive action is implemented here.
