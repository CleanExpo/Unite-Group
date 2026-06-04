# Agentic Nexus Dashboard Status Summary

Generated at: 2026-06-04T08:55:05Z

This is a local feed and human-readable summary, not a full UI dashboard yet.

## Counts

- Task count: 7
- Completed tasks: 2
- Claimed tasks: 2
- Blocked diagnostic-required tasks: 1
- Blocked human-approval-required tasks: 0
- Blocked denied tasks: 1
- Blocked total: 2
- Evidence count: 3
- Approval count: 3
- Approved count: 1
- Pending count: 0
- Rejected count: 1
- Expired count: 1
- Approval audit count: 4
- Tasks requeued after approval: 1
- Preflight audit count: 27
- Claim audit count: 19
- Completion audit count: 7
- Worker count: 4
- Available workers: 3
- Busy workers: 0
- Offline workers: 0
- Paused workers: 1
- Workers needing review: 0

## Status counts

- blocked_denied: 1
- blocked_diagnostic_required: 1
- claimed: 2
- completed: 2
- queued: 1

## Worker counts

- available: 3
- busy: 0
- needs_review: 0
- offline: 0
- paused: 1

## Worker visibility

### command-node-01 — available

- Worker name: Command Node 01
- Machine role: command_node
- Current task id: None
- Last heartbeat at: 2026-06-04T08:32:18Z
- Updated at: 2026-06-04T08:32:18Z

### local-build-worker-01 — available

- Worker name: Local Build Worker 01
- Machine role: build_worker
- Current task id: None
- Last heartbeat at: 2026-06-04T08:32:09Z
- Updated at: 2026-06-04T08:32:09Z

### local-research-worker-01 — available

- Worker name: Local Research Worker 01
- Machine role: research_worker
- Current task id: None
- Last heartbeat at: 2026-06-04T08:32:03Z
- Updated at: 2026-06-04T08:32:03Z

### local-build-worker-paused-01 — paused

- Worker name: Local Build Worker Paused 01 (Test)
- Machine role: build_worker
- Current task id: None
- Last heartbeat at: 2026-06-04T08:44:24Z
- Updated at: 2026-06-04T08:44:24Z


## Approval visibility

- approved: 1
- expired: 1
- rejected: 1

## Task visibility

### task_allowed_001 — completed

- Title: Update local Agentic Nexus dashboard status draft from verified evidence
- Project: Agentic Nexus
- Priority: high
- Risk level: low
- Assigned agent: dashboard-reporter-001
- Assigned worker: local-build-worker-01
- Assigned worker exists: True
- Assigned worker status: available
- Assigned worker machine role: build_worker
- Assigned worker role allowed for task: True
- Evidence count: 1
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: task_not_approval_blocked
- Latest preflight status: worker_can_start
- Latest claim status: task_claimed
- Latest completion status: evidence_invalid
- Visibility status: complete_with_evidence
- Recommended next action: include in dashboard feed and continue to next control-plane visibility step

### task_diagnostic_required_001 — blocked_diagnostic_required

- Title: Complete diagnostic discovery before research worker starts
- Project: Agentic Nexus
- Priority: high
- Risk level: low
- Assigned agent: context-discovery-001
- Assigned worker: None
- Assigned worker exists: False
- Assigned worker status: None
- Assigned worker machine role: None
- Assigned worker role allowed for task: False
- Evidence count: 0
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: None
- Latest preflight status: worker_stopped_diagnostic_required
- Latest claim status: task_blocked_diagnostic_required
- Latest completion status: task_not_claimed
- Visibility status: blocked_waiting_for_diagnostic
- Recommended next action: complete diagnostic gate before task can return to queue

### task_requires_approval_001 — completed

- Title: Request production deployment approval after local validation
- Project: Agentic Nexus
- Priority: medium
- Risk level: critical
- Assigned agent: principal-engineer-001
- Assigned worker: local-build-worker-01
- Assigned worker exists: True
- Assigned worker status: available
- Assigned worker machine role: build_worker
- Assigned worker role allowed for task: True
- Evidence count: 2
- Approval count: 3
- Latest approval status: expired
- Latest approval resolution status: approval_expired_task_remains_blocked
- Latest preflight status: worker_can_start
- Latest claim status: task_claimed
- Latest completion status: evidence_invalid
- Visibility status: complete_with_evidence
- Recommended next action: include in dashboard feed and continue to next control-plane visibility step

### task_denied_001 — blocked_denied

- Title: Attempt forbidden destructive/payment-data action
- Project: Agentic Nexus
- Priority: critical
- Risk level: critical
- Assigned agent: unsafe-worker-001
- Assigned worker: None
- Assigned worker exists: False
- Assigned worker status: None
- Assigned worker machine role: None
- Assigned worker role allowed for task: False
- Evidence count: 0
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: None
- Latest preflight status: worker_refused_denied
- Latest claim status: task_claim_failed_closed
- Latest completion status: None
- Visibility status: blocked_denied_refused
- Recommended next action: do not execute; rewrite as a safe diagnostic or approval-gated task

### task_worker_registry_allowed_001 — claimed

- Title: Document local worker registry and claim gate behaviour
- Project: Agentic Nexus
- Priority: medium
- Risk level: low
- Assigned agent: documentation-agent-001
- Assigned worker: local-build-worker-01
- Assigned worker exists: True
- Assigned worker status: available
- Assigned worker machine role: build_worker
- Assigned worker role allowed for task: True
- Evidence count: 0
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: None
- Latest preflight status: worker_can_start
- Latest claim status: task_claimed
- Latest completion status: None
- Visibility status: in_progress_claimed
- Recommended next action: wait for worker completion evidence or run worker_complete_task.py when output evidence is ready

### task_worker_registry_wrong_role_001 — queued

- Title: Verify worker claim gate role enforcement for an engineering task
- Project: Agentic Nexus
- Priority: medium
- Risk level: low
- Assigned agent: principal-engineer-001
- Assigned worker: None
- Assigned worker exists: False
- Assigned worker status: None
- Assigned worker machine role: None
- Assigned worker role allowed for task: False
- Evidence count: 0
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: None
- Latest preflight status: None
- Latest claim status: worker_role_not_allowed
- Latest completion status: None
- Visibility status: queued_waiting_for_claim
- Recommended next action: Run worker_claim_task.py --task-id task_worker_registry_wrong_role_001 --worker-id local-research-worker-01 and expect worker_role_not_allowed.

### task_worker_registry_research_001 — claimed

- Title: Run a small research briefing on worker claim gate enforcement
- Project: Agentic Nexus
- Priority: medium
- Risk level: low
- Assigned agent: research-director-001
- Assigned worker: local-research-worker-01
- Assigned worker exists: True
- Assigned worker status: available
- Assigned worker machine role: research_worker
- Assigned worker role allowed for task: True
- Evidence count: 0
- Approval count: 0
- Latest approval status: None
- Latest approval resolution status: None
- Latest preflight status: worker_can_start
- Latest claim status: task_claimed
- Latest completion status: None
- Visibility status: in_progress_claimed
- Recommended next action: wait for worker completion evidence or run worker_complete_task.py when output evidence is ready

## Risks

- denied task remains in queue for visibility/refusal record: task_denied_001

## Missing inputs

- None.

## Recommended next action

update worker_claim_task.py so a worker can only claim a task if that worker exists in worker_registry.jsonl, is available, and its machine_role is allowed for the task type
