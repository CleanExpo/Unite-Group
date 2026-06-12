# Run Agentic Nexus Task Completion Examples

`worker_complete_task.py` is the local completion gate. It ensures a worker can only mark a task complete when the task is already claimed by that worker and a valid evidence JSON record is supplied.

Run from:

```bash
cd /Users/phillmcgurk/2nd-brain/.agentic_nexus
```

## Compile checks

```bash
python3 -m py_compile validate_agent_session.py
python3 -m py_compile worker_preflight.py
python3 -m py_compile worker_claim_task.py
python3 -m py_compile worker_complete_task.py
```

## Required precondition

Before a successful completion test, `task_allowed_001` must be:

- status: `claimed`
- assigned_worker_id: `local-build-worker-01`

## Successful completion

```bash
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id local-build-worker-01 --evidence-file examples/evidence_allowed_completion.json
```

Expected:

- completion_status: `task_completed`
- task_status_before: `claimed`
- task_status_after: `completed`
- required_evidence_satisfied: `true`
- one evidence ledger record appended
- one completion audit record appended

## Worker mismatch example

Reset `task_allowed_001` to `claimed` and `assigned_worker_id: local-build-worker-01`, then run:

```bash
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id wrong-worker-01 --evidence-file examples/evidence_allowed_completion.json
```

Expected:

- completion_status: `worker_mismatch`
- task_status_after remains `claimed`
- required_evidence_satisfied: `false`
- no evidence ledger record appended
- completion audit record appended

## Blocked task completion attempt

```bash
python3 worker_complete_task.py --task-id task_diagnostic_required_001 --worker-id local-research-worker-01 --evidence-file examples/evidence_allowed_completion.json
```

Expected:

- completion_status: `task_not_claimed`
- blocked task remains blocked
- required_evidence_satisfied: `false`
- no evidence ledger record appended
- completion audit record appended

## Invalid evidence example

Reset `task_allowed_001` to `claimed` and `assigned_worker_id: local-build-worker-01`, then run:

```bash
python3 worker_complete_task.py --task-id task_allowed_001 --worker-id local-build-worker-01 --evidence-file examples/evidence_invalid_missing_fields.json
```

Expected:

- completion_status: `evidence_invalid`
- task_status_after remains `claimed`
- required_evidence_satisfied: `false`
- no evidence ledger record appended
- completion audit record appended

## Evidence ledger

Valid evidence records append to:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/evidence/evidence_ledger.jsonl
```

## Completion audit

Every completion attempt appends to:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/audit/task_completion_audit.jsonl
```

## Notes

The examples mutate `task_queue.jsonl` by design. The validation run uses deterministic resets between negative examples so worker mismatch and invalid evidence can be tested without weakening the completion rules. Audit history is not cleared.
