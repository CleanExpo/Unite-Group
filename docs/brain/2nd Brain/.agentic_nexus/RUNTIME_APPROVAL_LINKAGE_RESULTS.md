# Runtime Approval Linkage Results

Generated: 2026-06-04T08:06:41Z

## Summary

Runtime approval linkage worked. A restricted/high-risk session now proceeds only when it explicitly links a valid approval object by `approval_id` and that approval validates against task, project, agent, action, restricted scope, risk, expiry, evidence, and allowed approver rules.

The requeued task `task_requires_approval_001` was safely claimed through the normal worker claim path after `worker_preflight.py` called `validate_agent_session.py` and received `allowed` with `approval_lookup_result: approval_valid`.

Hard-forbidden actions still deny. The denied fixture returned `decision: denied` even though approval lookup was performed, proving approval linkage does not override hard-deny controls.

## Files inspected

- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/validate_agent_session.py`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/worker_preflight.py`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/worker_claim_task.py`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/generate_dashboard_status_feed.py`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/resolve_approval_request.py`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/approvals/approval_store.jsonl`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/task_queue.jsonl`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/agent_session.schema.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/agent_scope_matrix.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/forbidden_actions.json`
- Existing example sessions under `/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/`

## Files created

- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/session_requires_approval_linked_approved.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/session_requires_approval_linked_rejected.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/session_requires_approval_linked_expired.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/examples/session_requires_approval_missing_link.json`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/RUNTIME_APPROVAL_LINKAGE_RESULTS.md`

## Files updated

- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/validate_agent_session.py`
  - Added runtime approval lookup from `approvals/approval_store.jsonl`.
  - Added exact fail-closed approval validation rules.
  - Added approval result fields to validator JSON.
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/worker_preflight.py`
  - Preserved existing decision mapping.
  - Propagates approval lookup fields into preflight output and audit records.
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/worker_claim_task.py`
  - Still calls `worker_preflight.py`.
  - Propagates approval lookup fields into claim output and audit records.
  - Does not directly approve tasks.
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/agent_session.schema.json`
  - Added optional approval linkage fields supported by runtime sessions: `approval_id`, `approval_required`, `requested_action`.
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/task_queue.jsonl`
  - Repaired one malformed leading `-` before the approval task JSONL record.
  - Reset `task_requires_approval_001` to `queued` with `assigned_worker_id: null`.
  - Pointed `session_file` to `examples/session_requires_approval_linked_approved.json` for the final claim test.
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/dashboard_status_feed.jsonl`
- `/Users/phillmcgurk/2nd-brain/.agentic_nexus/DASHBOARD_STATUS_SUMMARY.md`

## Validation commands run

Compile checks:

- `python3 -m py_compile validate_agent_session.py` -> passed
- `python3 -m py_compile worker_preflight.py` -> passed
- `python3 -m py_compile worker_claim_task.py` -> passed
- `python3 -m py_compile resolve_approval_request.py` -> passed
- `python3 -m py_compile generate_dashboard_status_feed.py` -> passed

Runtime checks:

- `python3 validate_agent_session.py examples/session_requires_approval_linked_approved.json`
  - `decision: allowed`
  - `approval_lookup_result: approval_valid`
  - `approval_valid: true`
- `python3 validate_agent_session.py examples/session_requires_approval_linked_rejected.json`
  - `decision: requires_human_approval`
  - `approval_lookup_result: approval_rejected`
  - `approval_valid: false`
- `python3 validate_agent_session.py examples/session_requires_approval_linked_expired.json`
  - `decision: requires_human_approval`
  - `approval_lookup_result: approval_expired`
  - `approval_valid: false`
- `python3 validate_agent_session.py examples/session_requires_approval_missing_link.json`
  - `decision: requires_human_approval`
  - `approval_lookup_result: approval_missing`
  - `approval_valid: false`
- `python3 validate_agent_session.py examples/session_denied.json`
  - `decision: denied`
  - hard-forbidden detections remained active: `bypass approval gate`, `delete files without approval`, `invent evidence`
- `python3 worker_preflight.py examples/session_requires_approval_linked_approved.json`
  - `preflight_status: worker_can_start`
  - `validator_decision: allowed`
  - `approval_lookup_result: approval_valid`
  - `can_worker_start: true`
- `python3 worker_claim_task.py --task-id task_requires_approval_001 --worker-id local-build-worker-01`
  - `claim_status: task_claimed`
  - `preflight_status: worker_can_start`
  - `validator_decision: allowed`
  - `approval_lookup_result: approval_valid`
  - `can_worker_start: true`
  - `task_status_before: queued`
  - `task_status_after: claimed`
- `python3 generate_dashboard_status_feed.py`
  - `generation_status: dashboard_feed_generated`
  - `task_count: 4`
  - `claimed_count: 1`
  - `blocked_count: 2`

## Approval lookup behaviour

The validator now returns these approval linkage fields:

- `approval_id`
- `approval_lookup_performed`
- `approval_lookup_result`
- `approval_valid`
- `approval_reasons`
- `approval_record_reference`

Approval lookup is performed when restricted scopes are requested, sensitive action keywords are detected, or risk level is `high`/`critical`.

A linked approval is accepted only if all runtime checks pass:

- Session includes `approval_id`.
- The approval exists in `approvals/approval_store.jsonl`.
- `approval.task_id` matches `session.assigned_task`.
- `approval.approval_status` is `approved`.
- `approval.approved_by` is in the allowed human approver set; currently only `Phill McGurk`.
- Approval expiry is valid and in the future.
- Approval `requested_action` clearly relates to the session action.
- Approval `affected_project` matches session `assigned_project`.
- Approval evidence exists or a not-applicable reason is explicitly documented.
- Requested restricted scopes are covered by approval context.
- Approval risk level is compatible with the session risk level.
- Approval is not ambiguous or duplicated by approval ID or by multiple approved same-context records.

Approval lookup does not override hard-forbidden actions.

## Positive linked approval result

`examples/session_requires_approval_linked_approved.json` returned:

- `decision: allowed`
- `approval_id: approval_task_requires_approval_001_approved`
- `approval_lookup_result: approval_valid`
- `approval_valid: true`

## Rejected approval result

`examples/session_requires_approval_linked_rejected.json` returned:

- `decision: requires_human_approval`
- `approval_id: approval_task_requires_approval_001_rejected`
- `approval_lookup_result: approval_rejected`
- `approval_valid: false`

## Expired approval result

`examples/session_requires_approval_linked_expired.json` returned:

- `decision: requires_human_approval`
- `approval_id: approval_task_requires_approval_001_expired`
- `approval_lookup_result: approval_expired`
- `approval_valid: false`

## Missing approval result

`examples/session_requires_approval_missing_link.json` returned:

- `decision: requires_human_approval`
- `approval_lookup_result: approval_missing`
- `approval_valid: false`

## Hard forbidden result

`examples/session_denied.json` returned:

- `decision: denied`
- `approval_lookup_performed: true`
- `approval_valid: false`
- `forbidden_actions_detected: bypass approval gate, delete files without approval, invent evidence`

This confirms valid approval linkage cannot override hard-forbidden actions.

## Worker claim result for approved linked task

Before final claim:

- `task_requires_approval_001.status: queued`
- `assigned_worker_id: null`
- `session_file: examples/session_requires_approval_linked_approved.json`
- Approval object existed: `approval_task_requires_approval_001_approved`

Claim result:

- `claim_status: task_claimed`
- `preflight_status: worker_can_start`
- `validator_decision: allowed`
- `approval_lookup_result: approval_valid`
- `can_worker_start: true`
- `task_status_before: queued`
- `task_status_after: claimed`

## Dashboard regeneration result

`python3 generate_dashboard_status_feed.py` returned:

- `generation_status: dashboard_feed_generated`
- `feed_path: /Users/phillmcgurk/2nd-brain/.agentic_nexus/dashboard_status_feed.jsonl`
- `summary_path: /Users/phillmcgurk/2nd-brain/.agentic_nexus/DASHBOARD_STATUS_SUMMARY.md`
- `task_count: 4`
- `status_counts: {blocked_denied: 1, blocked_diagnostic_required: 1, claimed: 1, completed: 1}`
- `claimed_count: 1`
- `blocked_count: 2`

## Final task statuses

- `task_allowed_001`: `completed`, worker `local-build-worker-01`, session `examples/session_allowed.json`
- `task_diagnostic_required_001`: `blocked_diagnostic_required`, worker `null`, session `examples/session_diagnostic_required.json`
- `task_requires_approval_001`: `claimed`, worker `local-build-worker-01`, session `examples/session_requires_approval_linked_approved.json`
- `task_denied_001`: `blocked_denied`, worker `null`, session `examples/session_denied.json`

## Approval gates preserved

Yes. Pending/missing, rejected, expired, invalid, mismatched, ambiguous, or unclear approvals do not unlock restricted sessions. The validator fails closed to `requires_human_approval` unless the exact linked approval object validates.

## Hard-forbidden actions still deny

Yes. The hard-forbidden session still returns `denied`. Approval lookup cannot override forbidden actions such as bypassing gates, inventing evidence, deleting files without approval, or bypassing the task queue.

## Risks found

- The local dashboard feed still flags `task_denied_001` as a visible denied task: `denied task remains in queue for visibility/refusal record: task_denied_001`. This is expected visibility debt, not an execution permission.
- `approval_store.jsonl` contains approved, rejected, and expired fixtures for the same task/action. Runtime ambiguity prevention currently rejects duplicate approved same-context approvals; rejected/expired fixtures do not make the one approved linked approval ambiguous.
- Existing queue had a malformed leading `-` before the approval task JSONL line. It was repaired locally before the final claim test.

## Assumptions

- Allowed human approver set is currently exactly `{ "Phill McGurk" }`.
- Approval action/context relation is intentionally conservative and text-based, using action overlap plus restricted-scope keyword coverage.
- `approval_task_requires_approval_001_approved` authorises the local runtime claim/preflight exercise for `deploy:production` scope only in this controlled Agentic Nexus fixture context; it does not perform a deployment.
- No external packages, network calls, database calls, GitHub actions, deployments, email, production operations, publishing, or destructive actions were used.

## What remains missing

- Completion-path proof for a successfully claimed restricted task after valid approval linkage.
- More formal schema validation is still not implemented; runtime validator uses explicit fail-closed field/policy checks rather than full JSON Schema validation.
- The approval action relation model is intentionally minimal text matching and may need a more structured `approved_scopes` / `approved_session_id` field in future.

## Smallest useful next action

Create completion evidence for `task_requires_approval_001` and run `worker_complete_task.py` to confirm an approved restricted task can complete only with valid evidence and without bypassing audit or dashboard visibility.
