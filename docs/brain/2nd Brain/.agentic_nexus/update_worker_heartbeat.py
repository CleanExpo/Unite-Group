#!/usr/bin/env python3
"""Update worker heartbeat in the local Agentic Nexus worker registry.

Standard-library only. Locates a worker in ``worker_registry.jsonl``,
updates ``last_heartbeat_at`` and ``status``, writes the registry back
atomically, and appends a heartbeat event to ``worker_events.jsonl``.

This step is visibility/heartbeat only. It does not allow workers to
claim, start, complete, deploy, publish, email, mutate any database, or
perform any destructive action.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
REGISTRY_PATH = BASE_DIR / "worker_registry.jsonl"
EVENT_LOG_PATH = BASE_DIR / "worker_events.jsonl"

ALLOWED_STATUSES = {"available", "busy", "offline", "paused", "needs_review"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_registry() -> Tuple[List[Dict[str, Any]], List[str]]:
    records: List[Dict[str, Any]] = []
    errors: List[str] = []
    if not REGISTRY_PATH.exists():
        return records, [f"registry missing: {REGISTRY_PATH}"]
    with REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                obj = json.loads(stripped)
            except Exception as exc:
                errors.append(f"{REGISTRY_PATH.name} line {line_no} parse error: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{REGISTRY_PATH.name} line {line_no} is not a JSON object")
                continue
            records.append(obj)
    return records, errors


def write_registry(records: List[Dict[str, Any]]) -> None:
    temp_path = REGISTRY_PATH.with_suffix(".jsonl.tmp")
    with temp_path.open("w", encoding="utf-8") as handle:
        for rec in records:
            handle.write(json.dumps(rec, sort_keys=False) + "\n")
    temp_path.replace(REGISTRY_PATH)


def append_event(event: Dict[str, Any]) -> None:
    with EVENT_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=False) + "\n")


def update_heartbeat(worker_id: str, status: str) -> Dict[str, Any]:
    if not worker_id or not isinstance(worker_id, str):
        return {
            "heartbeat_status": "heartbeat_failed",
            "worker_id": worker_id,
            "worker_name": None,
            "machine_role": None,
            "status": status,
            "last_heartbeat_at": None,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": ["worker_id is required and must be a non-empty string"],
            "next_action": "do not update; rerun with a valid --worker-id",
        }
    if status not in ALLOWED_STATUSES:
        return {
            "heartbeat_status": "heartbeat_failed",
            "worker_id": worker_id,
            "worker_name": None,
            "machine_role": None,
            "status": status,
            "last_heartbeat_at": None,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": [f"status must be one of {sorted(ALLOWED_STATUSES)}; got {status!r}"],
            "next_action": "do not update; rerun with a valid --status",
        }

    records, read_errors = read_registry()
    if read_errors:
        # Registry completely missing is treated as worker_not_found (safer default).
        if len(read_errors) == 1 and "registry missing" in read_errors[0]:
            return {
                "heartbeat_status": "worker_not_found",
                "worker_id": worker_id,
                "worker_name": None,
                "machine_role": None,
                "status": status,
                "last_heartbeat_at": None,
                "registry_path": str(REGISTRY_PATH),
                "event_log_path": str(EVENT_LOG_PATH),
                "reasons": ["worker_registry.jsonl does not exist; register workers first"],
                "next_action": "register the worker via register_worker.py before sending heartbeats",
            }
        return {
            "heartbeat_status": "heartbeat_failed",
            "worker_id": worker_id,
            "worker_name": None,
            "machine_role": None,
            "status": status,
            "last_heartbeat_at": None,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": read_errors,
            "next_action": "do not update; repair worker_registry.jsonl and rerun",
        }

    idx = None
    for i, rec in enumerate(records):
        if rec.get("worker_id") == worker_id:
            idx = i
            break
    if idx is None:
        return {
            "heartbeat_status": "worker_not_found",
            "worker_id": worker_id,
            "worker_name": None,
            "machine_role": None,
            "status": status,
            "last_heartbeat_at": None,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": [f"worker_id {worker_id!r} not present in worker_registry.jsonl"],
            "next_action": "register the worker via register_worker.py before sending heartbeats",
        }

    now = utc_now_iso()
    rec = dict(records[idx])
    rec["last_heartbeat_at"] = now
    rec["status"] = status
    rec["updated_at"] = now
    records[idx] = rec
    try:
        write_registry(records)
    except Exception as exc:
        return {
            "heartbeat_status": "heartbeat_failed",
            "worker_id": worker_id,
            "worker_name": rec.get("worker_name"),
            "machine_role": rec.get("machine_role"),
            "status": status,
            "last_heartbeat_at": None,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": [f"registry write failed: {exc}"],
            "next_action": "do not update; check filesystem and rerun",
        }

    event = {
        "timestamp": now,
        "event_type": "heartbeat_updated",
        "worker_id": worker_id,
        "worker_name": rec.get("worker_name"),
        "machine_role": rec.get("machine_role"),
        "status": status,
        "details": {
            "registry_path": str(REGISTRY_PATH),
            "last_heartbeat_at": now,
        },
    }
    try:
        append_event(event)
    except Exception as exc:
        return {
            "heartbeat_status": "heartbeat_failed",
            "worker_id": worker_id,
            "worker_name": rec.get("worker_name"),
            "machine_role": rec.get("machine_role"),
            "status": status,
            "last_heartbeat_at": now,
            "registry_path": str(REGISTRY_PATH),
            "event_log_path": str(EVENT_LOG_PATH),
            "reasons": [f"registry updated but event append failed: {exc}"],
            "next_action": "registry record is in place; repair event log access",
        }

    return {
        "heartbeat_status": "heartbeat_updated",
        "worker_id": worker_id,
        "worker_name": rec.get("worker_name"),
        "machine_role": rec.get("machine_role"),
        "status": status,
        "last_heartbeat_at": now,
        "registry_path": str(REGISTRY_PATH),
        "event_log_path": str(EVENT_LOG_PATH),
        "reasons": ["heartbeat accepted; last_heartbeat_at and status updated"],
        "next_action": (
            "do not allow this worker to claim work until worker_claim_task.py is updated to "
            "enforce worker_registry.jsonl membership and status=available"
        ),
    }


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Update worker last_heartbeat_at and status in worker_registry.jsonl."
    )
    parser.add_argument("--worker-id", required=True)
    parser.add_argument("--status", required=True)
    args = parser.parse_args(argv[1:])
    result = update_heartbeat(args.worker_id, args.status)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
