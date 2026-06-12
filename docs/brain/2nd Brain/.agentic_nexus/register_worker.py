#!/usr/bin/env python3
"""Local worker registry manager for Agentic Nexus.

Standard-library only. Adds or updates a worker record in
``worker_registry.jsonl`` and appends a registration event to
``worker_events.jsonl``.

This step is registration only. It does not allow workers to claim,
start, complete, deploy, publish, email, mutate any database, or
perform any destructive action. The local worker claim gate
(``worker_claim_task.py``) is the next step and must be updated to
enforce membership in this registry before a worker can claim work.
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

# Default role payload for the three known machine roles.
# Unknown machine roles get empty arrays/strings so the script is
# still safe to call but the dashboard will flag the gap.
ROLE_PURPOSE: Dict[str, Dict[str, Any]] = {
    "command_node": {
        "description": (
            "Agentic Nexus command node; owns coordination, queue visibility, "
            "dashboard feed, approval visibility, and task routing."
        ),
        "allowed_agent_types": [
            "Hermes CEO Orchestrator",
            "Senior Project Manager Agent",
            "Dashboard Reporter Agent",
        ],
        "allowed_task_types": [
            "coordination",
            "queue_visibility",
            "dashboard_update",
            "approval_visibility",
            "task_routing",
            "status_report",
        ],
        "allowed_projects": [
            "Agentic Nexus",
            "2nd-brain",
            "unite-group",
            "unite-hub",
            "synthex",
            "restoreassist",
            "disaster-recovery",
        ],
        "capabilities": [
            "queue",
            "approval",
            "dashboard",
            "registry",
            "obsidian",
            "status_report",
        ],
        "limitations": [
            "no direct code execution",
            "no production deploy",
            "no external publishing",
            "no email send",
            "no database writes outside .agentic_nexus",
        ],
        "notes": (
            "Owns visibility and routing, not implementation. "
            "All writes must stay inside .agentic_nexus."
        ),
    },
    "build_worker": {
        "description": (
            "Coding/build/test worker; runs validated local build, "
            "documentation, evidence, and completion tasks."
        ),
        "allowed_agent_types": [
            "Principal Software Engineer Agent",
            "QA/Test Agent",
        ],
        "allowed_task_types": [
            "coding",
            "build",
            "test",
            "documentation",
            "evidence",
            "completion",
            "qa",
        ],
        "allowed_projects": [
            "Agentic Nexus",
            "unite-group",
            "unite-hub",
            "restoreassist",
            "disaster-recovery",
        ],
        "capabilities": [
            "git",
            "worktree",
            "docker",
            "node",
            "python",
            "test",
            "build",
            "playwright",
            "lint",
            "typecheck",
        ],
        "limitations": [
            "no production deploy without approval",
            "no PR merge without approval",
            "no external email",
            "no payment data access",
            "no destructive actions",
        ],
        "notes": (
            "Restricted scopes require a valid approval gate via "
            "resolve_approval_request.py before claim can proceed."
        ),
    },
    "research_worker": {
        "description": (
            "Research/business intelligence worker; runs diagnostic, "
            "Obsidian, evidence review, content, SEO/AEO/GEO, and "
            "business research tasks."
        ),
        "allowed_agent_types": [
            "Context Discovery Agent",
            "Research Director Agent",
            "Evidence Validator Agent",
            "SEO/AEO/GEO Agent",
        ],
        "allowed_task_types": [
            "diagnostic",
            "obsidian",
            "evidence_review",
            "content",
            "seo_aeo_geo",
            "business_research",
            "research",
        ],
        "allowed_projects": [
            "Agentic Nexus",
            "2nd-brain",
            "synthex",
            "unite-group",
        ],
        "capabilities": [
            "obsidian",
            "research",
            "seo",
            "aeo",
            "geo",
            "strategy",
            "content",
            "python",
        ],
        "limitations": [
            "no public publish without approval",
            "no external email",
            "no production deploy",
            "no destructive actions",
        ],
        "notes": (
            "Outputs structured Obsidian notes, research briefs, and "
            "evidence records. Publish scope is restricted."
        ),
    },
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_registry() -> Tuple[List[Dict[str, Any]], List[str]]:
    records: List[Dict[str, Any]] = []
    errors: List[str] = []
    if not REGISTRY_PATH.exists():
        return records, errors
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
    # Atomic local rewrite. Temp file stays inside .agentic_nexus and os.replace is atomic on POSIX.
    temp_path = REGISTRY_PATH.with_suffix(".jsonl.tmp")
    with temp_path.open("w", encoding="utf-8") as handle:
        for rec in records:
            handle.write(json.dumps(rec, sort_keys=False) + "\n")
    temp_path.replace(REGISTRY_PATH)


def append_event(event: Dict[str, Any]) -> None:
    with EVENT_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=False) + "\n")


def find_worker_index(records: List[Dict[str, Any]], worker_id: str) -> int | None:
    for idx, rec in enumerate(records):
        if rec.get("worker_id") == worker_id:
            return idx
    return None


def build_default_role_payload(machine_role: str) -> Dict[str, Any]:
    if machine_role in ROLE_PURPOSE:
        return dict(ROLE_PURPOSE[machine_role])
    return {
        "description": "",
        "allowed_agent_types": [],
        "allowed_task_types": [],
        "allowed_projects": [],
        "capabilities": [],
        "limitations": [],
        "notes": "",
    }


def fail_result(reasons: List[str], next_action: str) -> Dict[str, Any]:
    return {
        "registration_status": "worker_registration_failed",
        "worker_id": None,
        "worker_name": None,
        "machine_role": None,
        "status": None,
        "registry_path": str(REGISTRY_PATH),
        "event_log_path": str(EVENT_LOG_PATH),
        "reasons": reasons,
        "next_action": next_action,
    }


def register_worker(worker_id: str, worker_name: str, machine_role: str, status: str) -> Dict[str, Any]:
    if not worker_id or not isinstance(worker_id, str):
        return fail_result(
            ["worker_id is required and must be a non-empty string"],
            "do not register; rerun with a valid --worker-id",
        )
    if not worker_name or not isinstance(worker_name, str):
        return fail_result(
            ["worker_name is required and must be a non-empty string"],
            "do not register; rerun with a valid --worker-name",
        )
    if not machine_role or not isinstance(machine_role, str):
        return fail_result(
            ["machine_role is required and must be a non-empty string"],
            "do not register; rerun with a valid --machine-role",
        )
    if status not in ALLOWED_STATUSES:
        return fail_result(
            [f"status must be one of {sorted(ALLOWED_STATUSES)}; got {status!r}"],
            "do not register; rerun with a valid --status",
        )

    records, read_errors = read_registry()
    if read_errors:
        return fail_result(
            ["registry read errors: " + "; ".join(read_errors)],
            "do not register; repair worker_registry.jsonl and rerun",
        )

    now = utc_now_iso()
    role_payload = build_default_role_payload(machine_role)
    idx = find_worker_index(records, worker_id)

    if idx is None:
        new_record = {
            "worker_id": worker_id,
            "worker_name": worker_name,
            "machine_role": machine_role,
            "description": role_payload["description"],
            "status": status,
            "allowed_agent_types": list(role_payload["allowed_agent_types"]),
            "allowed_task_types": list(role_payload["allowed_task_types"]),
            "allowed_projects": list(role_payload["allowed_projects"]),
            "current_task_id": None,
            "capabilities": list(role_payload["capabilities"]),
            "limitations": list(role_payload["limitations"]),
            "last_heartbeat_at": now,
            "registered_at": now,
            "updated_at": now,
            "notes": role_payload["notes"],
        }
        records.append(new_record)
        try:
            write_registry(records)
        except Exception as exc:
            return fail_result(
                [f"registry write failed: {exc}"],
                "do not register; check filesystem and rerun",
            )
        registration_status = "worker_registered"
        reasons = ["worker added to worker_registry.jsonl with default role payload"]
        next_action = (
            "worker is now visible in the dashboard feed; do not allow it to claim work until "
            "worker_claim_task.py is updated to enforce worker_registry.jsonl membership and status=available"
        )
        event_type = "worker_registered"
    else:
        existing = dict(records[idx])
        existing["worker_name"] = worker_name
        existing["machine_role"] = machine_role
        existing["status"] = status
        existing["description"] = role_payload["description"] or existing.get("description", "")
        existing["allowed_agent_types"] = (
            list(role_payload["allowed_agent_types"])
            if role_payload["allowed_agent_types"]
            else existing.get("allowed_agent_types", [])
        )
        existing["allowed_task_types"] = (
            list(role_payload["allowed_task_types"])
            if role_payload["allowed_task_types"]
            else existing.get("allowed_task_types", [])
        )
        existing["allowed_projects"] = (
            list(role_payload["allowed_projects"])
            if role_payload["allowed_projects"]
            else existing.get("allowed_projects", [])
        )
        existing["capabilities"] = (
            list(role_payload["capabilities"])
            if role_payload["capabilities"]
            else existing.get("capabilities", [])
        )
        existing["limitations"] = (
            list(role_payload["limitations"])
            if role_payload["limitations"]
            else existing.get("limitations", [])
        )
        existing["notes"] = role_payload["notes"] or existing.get("notes", "")
        existing["last_heartbeat_at"] = now
        existing["updated_at"] = now
        records[idx] = existing
        try:
            write_registry(records)
        except Exception as exc:
            return fail_result(
                [f"registry write failed: {exc}"],
                "do not register; check filesystem and rerun",
            )
        registration_status = "worker_updated"
        reasons = ["worker record updated in place; role payload refreshed from defaults"]
        next_action = (
            "worker remains visible in the dashboard feed; do not allow it to claim work until "
            "worker_claim_task.py is updated to enforce worker_registry.jsonl membership and status=available"
        )
        event_type = "worker_updated"

    event = {
        "timestamp": now,
        "event_type": event_type,
        "worker_id": worker_id,
        "worker_name": worker_name,
        "machine_role": machine_role,
        "status": status,
        "details": {
            "registry_path": str(REGISTRY_PATH),
            "registration_status": registration_status,
        },
    }
    try:
        append_event(event)
    except Exception as exc:
        return fail_result(
            [f"registry updated but event append failed: {exc}"],
            "registry record is in place; repair event log access and rerun registration if audit trail required",
        )

    return {
        "registration_status": registration_status,
        "worker_id": worker_id,
        "worker_name": worker_name,
        "machine_role": machine_role,
        "status": status,
        "registry_path": str(REGISTRY_PATH),
        "event_log_path": str(EVENT_LOG_PATH),
        "reasons": reasons,
        "next_action": next_action,
    }


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Add or update a worker record in worker_registry.jsonl."
    )
    parser.add_argument("--worker-id", required=True)
    parser.add_argument("--worker-name", required=True)
    parser.add_argument("--machine-role", required=True)
    parser.add_argument("--status", required=True)
    args = parser.parse_args(argv[1:])
    result = register_worker(args.worker_id, args.worker_name, args.machine_role, args.status)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
