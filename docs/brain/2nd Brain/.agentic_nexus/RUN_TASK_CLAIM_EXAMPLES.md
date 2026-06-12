# Run Agentic Nexus Task Claim Examples (with worker registry enforcement)

`worker_claim_task.py` is the local task-claim gate. It enforces three layers before any task can be claimed:

1. The task must be in `task_queue.jsonl` and in a claimable state (`queued` or `claim_pending`).
2. The worker must be registered, `available`, and its `machine_role` must be allowed for the task's `required_agent_type`.
3. The task's session file must still pass `worker_preflight.py` (validator, scope matrix, diagnostic gate, approval gate).

If layer 2 fails, the claim is refused before preflight runs. The preflight gate is never bypassed.

Run from:

```bash
cd /Users/phillmcgurk/2nd-brain/.agentic_nexus
```

## Compile checks

```bash
python3 -m py_compile validate_agent_session.py
python3 -m py_compile worker_preflight.py
python3 -m py_compile register_worker.py
python3 -m py_compile update_worker_heartbeat.py
python3 -m py_compile worker_claim_task.py
python3 -m py_compile generate_dashboard_status_feed.py
```

## Worker registry claim examples

These examples use the three fixture workers (`command-node-01`, `local-build-worker-01`, `local-research-worker-01`), the paused test worker (`local-build-worker-paused-01`), and three fixture tasks (`task_worker_registry_allowed_001`, `task_worker_registry_wrong_role_001`, `task_worker_registry_research_001`).

### 1. Registered, available, role-compatible worker — claim should succeed

```bash
python3 worker_claim_task.py --task-id task_worker_registry_allowed_001 --worker-id local-build-worker-01
```

Expected:

- `claim_status`: `task_claimed`
- `worker_registered`: `true`
- `worker_status`: `available`
- `worker_machine_role`: `build_worker`
- `worker_role_allowed`: `true`
- `worker_registry_check`: `worker_registry_passed`
- `preflight_status`: `worker_can_start`
- `validator_decision`: `allowed`
- `task_status_before`: `queued`
- `task_status_after`: `claimed`

### 2. Unregistered worker — claim must be blocked

```bash
python3 worker_claim_task.py --task-id task_worker_registry_wrong_role_001 --worker-id ghost-worker-99
```

Expected:

- `claim_status`: `worker_not_registered`
- `worker_registered`: `false`
- `worker_registry_check`: `worker_not_registered`
- `reasons`: contains `worker_id 'ghost-worker-99' not present in worker_registry.jsonl`
- `preflight_status`: `null` (preflight never ran)
- `task_status_before` and `task_status_after`: both `queued` (task not modified)

### 3. Paused worker — claim must be blocked

```bash
python3 worker_claim_task.py --task-id task_worker_registry_research_001 --worker-id local-build-worker-paused-01
```

Expected:

- `claim_status`: `worker_not_available`
- `worker_registered`: `true`
- `worker_status`: `paused`
- `worker_machine_role`: `build_worker`
- `worker_registry_check`: `worker_not_available`
- `reasons`: contains `worker 'local-build-worker-paused-01' status is 'paused'`
- `preflight_status`: `null` (preflight never ran)

### 4. Wrong role worker — claim must be blocked

```bash
python3 worker_claim_task.py --task-id task_worker_registry_wrong_role_001 --worker-id local-research-worker-01
```

Expected:

- `claim_status`: `worker_role_not_allowed`
- `worker_registered`: `true`
- `worker_status`: `available`
- `worker_machine_role`: `research_worker`
- `worker_role_allowed`: `false`
- `worker_registry_check`: `worker_role_not_allowed`
- `reasons`: contains the worker's allowed agent types and notes that `Principal Software Engineer Agent` is not in the list
- `preflight_status`: `null` (preflight never ran)

## Role compatibility matrix (first safe mapping)

| machine_role | allowed required_agent_types |
|---|---|
| `command_node` | `Hermes CEO Orchestrator`, `Senior Project Manager Agent`, `Dashboard Reporter Agent` |
| `build_worker` | `Principal Software Engineer Agent`, `QA/Test Agent`, `Documentation Agent`, `Dashboard Reporter Agent` |
| `research_worker` | `Context Discovery Agent`, `Purpose Mapping Agent`, `Friction Mapping Agent`, `Research Director Agent`, `Evidence Validator Agent`, `SEO/AEO/GEO Agent`, `Marketing Strategy Agent`, `Brand Authority Agent`, `Business Operations Agent`, `Finance Awareness Agent`, `Legal/Compliance Awareness Agent`, `Documentation Agent`, `Dashboard Reporter Agent` |

If the task's `required_agent_type` is missing, empty, or not present in any role's allowed set, the worker registry check fails closed (`worker_registry_check_failed` → `task_claim_failed_closed`).

## New claim result and audit fields

`worker_claim_task.py` now returns (and writes to `audit/task_claim_audit.jsonl`) the following worker registry fields on every claim attempt:

- `worker_registered`: `bool`
- `worker_status`: registered worker's current status (or `null`)
- `worker_machine_role`: registered worker's `machine_role` (or `null`)
- `worker_role_allowed`: `bool`
- `worker_registry_check`: one of `worker_registry_passed`, `worker_not_registered`, `worker_not_available`, `worker_role_not_allowed`, `worker_registry_missing`, `worker_registry_invalid`, `worker_registry_check_failed`
- `worker_registry_reasons`: `list[str]` of human-readable reasons

The new `claim_status` values are additive:

- `worker_not_registered`
- `worker_not_available`
- `worker_role_not_allowed`
- `worker_registry_missing`
- `worker_registry_invalid`

The original values `task_claimed`, `task_not_claimable`, `task_claim_failed_closed`, `task_not_found`, `task_blocked_diagnostic_required`, `task_blocked_human_approval_required`, `task_blocked_denied` are preserved.

## Existing task claim examples (regression check)

The original four example tasks remain in `task_queue.jsonl` with their final statuses from the prior lifecycle proof. They are no longer claimable (they are `completed` or `blocked_*`), so attempts will be refused at the status check (or, for `task_denied_001`, at the worker registry check because `Local Build Worker` is not a recognised `required_agent_type`).

The original `RUN_TASK_CLAIM_EXAMPLES.md` examples still apply conceptually but the tasks are already in their terminal state.

## Audit trail

Claim attempts append records to:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/audit/task_claim_audit.jsonl
```

Every audit record from this step onward includes the new worker registry fields. Older audit records (without the new fields) are preserved exactly as they were written.

## Notes

- The example commands mutate `task_queue.jsonl` by design when they claim a task. The four original example tasks are not affected.
- Three new fixture tasks were appended to `task_queue.jsonl` and may be in `claimed` state after running these examples. To re-run, reset the fixture tasks back to `queued` and clear `assigned_worker_id`; do not clear audit history.
- The paused test worker `local-build-worker-paused-01` is left in the registry so the paused test remains reproducible. It is clearly named as a test fixture.
