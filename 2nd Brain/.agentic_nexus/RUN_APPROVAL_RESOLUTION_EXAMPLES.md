# Run Agentic Nexus Approval Resolution Examples

`resolve_approval_request.py` is the local approval resolver. It allows an approval-required task to move from `blocked_human_approval_required` back to `queued` only when a valid human approval object exists in `approvals/approval_store.jsonl`.

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
python3 -m py_compile generate_dashboard_status_feed.py
python3 -m py_compile resolve_approval_request.py
```

## Ensure approval task is blocked before testing

Before testing the successful approval path, `task_requires_approval_001` must be in:

```text
blocked_human_approval_required
```

If the approved example has already requeued the task, use a deterministic test reset before negative examples. Do not weaken resolver rules.

## Valid approved task

```bash
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_approved
```

Expected:

```text
approval_resolved_task_requeued
```

## Rejected approval

```bash
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_rejected
```

Expected:

```text
approval_rejected_task_remains_blocked
```

If the task was already requeued by a previous approved test and was not reset, expected result may be:

```text
task_not_approval_blocked
```

## Expired approval

```bash
python3 resolve_approval_request.py --task-id task_requires_approval_001 --approval-id approval_task_requires_approval_001_expired
```

Expected:

```text
approval_expired_task_remains_blocked
```

If the task was already requeued by a previous approved test and was not reset, expected result may be:

```text
task_not_approval_blocked
```

## Wrong task / approval mismatch

```bash
python3 resolve_approval_request.py --task-id task_allowed_001 --approval-id approval_task_requires_approval_001_approved
```

Expected:

```text
task_not_approval_blocked
```

`task_allowed_001` is not approval-blocked, so the approval cannot be applied to it and must not requeue or alter it.

## Non-approval-blocked task

```bash
python3 resolve_approval_request.py --task-id task_allowed_001 --approval-id approval_task_requires_approval_001_approved
```

Expected:

```text
task_not_approval_blocked
```

## Regenerate dashboard feed

```bash
python3 generate_dashboard_status_feed.py
```

Expected:

- `approval_count` present
- `approved_count` present
- `rejected_count` present
- `expired_count` present
- `approval_audit_count` present
- `tasks_requeued_after_approval` present
- `DASHBOARD_STATUS_SUMMARY.md` includes approval visibility

## Outputs

Approval audit records are appended to:

```text
audit/approval_resolution_audit.jsonl
```

The dashboard feed is regenerated at:

```text
dashboard_status_feed.jsonl
```

The human-readable summary is regenerated at:

```text
DASHBOARD_STATUS_SUMMARY.md
```
