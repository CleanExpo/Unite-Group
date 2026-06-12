# Run Agentic Nexus Dashboard Status Feed

`generate_dashboard_status_feed.py` creates the first local visibility feed for Agentic Nexus.

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
```

## Generate feed

```bash
python3 generate_dashboard_status_feed.py
```

## Inputs read

- `task_queue.jsonl`
- `evidence/evidence_ledger.jsonl`
- `audit/preflight_audit.jsonl`
- `audit/task_claim_audit.jsonl`
- `audit/task_completion_audit.jsonl`

The task queue is the core input. If it is missing or cannot be parsed, the generator fails closed.

Audit and evidence inputs are read when available. Missing optional audit/evidence files are reported in `missing_inputs` rather than crashing the generator.

## Outputs created

Machine-readable feed:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/dashboard_status_feed.jsonl
```

Human-readable summary:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/DASHBOARD_STATUS_SUMMARY.md
```

## Expected result

The script prints JSON with:

- `generation_status: dashboard_feed_generated`
- feed path
- summary path
- task count
- status counts
- completed count
- blocked count
- approval-required count
- diagnostic-required count
- denied count
- claimed count
- evidence count
- audit counts
- missing inputs
- risks
- recommended next action

## Notes

This is a local status feed, not a UI dashboard. Build the feed first so any later UI consumes a verified, local, machine-readable source instead of inventing state or bypassing the task/evidence/audit gates.
