# How to run the local worker registry

This folder contains the first local worker registry for Agentic Nexus. It represents the three computers that will run work as controlled workers, but it does NOT yet allow them to claim or start any task. The next step is to update `worker_claim_task.py` to enforce membership in this registry.

## Files

- `worker_registry.jsonl` — append-only JSONL of worker records (one per line).
- `register_worker.py` — add or update a worker record.
- `update_worker_heartbeat.py` — refresh a worker's `last_heartbeat_at` and `status`.
- `worker_events.jsonl` — append-only event log of registrations, updates, and heartbeats.

Both scripts are Python standard-library only, no network, no external packages, no database, no destructive action.

## Validate (compile-check) the scripts

From inside `.agentic_nexus/`:

```bash
python3 -m py_compile register_worker.py
python3 -m py_compile update_worker_heartbeat.py
python3 -m py_compile generate_dashboard_status_feed.py
```

## Register the three workers

```bash
python3 register_worker.py --worker-id command-node-01 --worker-name "Command Node 01" --machine-role command_node --status available
python3 register_worker.py --worker-id local-build-worker-01 --worker-name "Local Build Worker 01" --machine-role build_worker --status available
python3 register_worker.py --worker-id local-research-worker-01 --worker-name "Local Research Worker 01" --machine-role research_worker --status available
```

Each call returns a JSON object with `registration_status` of `worker_registered` on first call, or `worker_updated` if the worker already exists. Unknown status values are refused with `worker_registration_failed`.

## Update a worker heartbeat

```bash
python3 update_worker_heartbeat.py --worker-id local-build-worker-01 --status available
```

Allowed status values: `available`, `busy`, `offline`, `paused`, `needs_review`.

Result values: `heartbeat_updated`, `worker_not_found`, `heartbeat_failed`.

## Regenerate the dashboard feed

```bash
python3 generate_dashboard_status_feed.py
```

This reads `worker_registry.jsonl` and now includes worker count, available / busy / offline / paused / needs-review counts, and a per-worker visibility block. The summary file `DASHBOARD_STATUS_SUMMARY.md` is regenerated at the same time.

## What this step does NOT do

- Does not let a worker claim, start, complete, deploy, publish, send email, mutate any database, or perform any destructive action.
- Does not modify the completed task statuses in `task_queue.jsonl`.
- Does not call any external system.

## Smallest useful next action

Update `worker_claim_task.py` so a worker can only claim a task if:

1. the worker_id exists in `worker_registry.jsonl`;
2. the worker's status is `available`;
3. the worker's `machine_role` is allowed for the task's `required_agent_type` (or the task's intended scope family).

Until that update lands, registered workers are visible but not yet allowed to run work.
