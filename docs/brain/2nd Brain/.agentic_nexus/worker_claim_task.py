#!/usr/bin/env python3
"""Local task claim flow for Agentic Nexus workers.

Standard-library only. Reads task_queue.jsonl, runs worker_preflight.py for the
related session file, updates task status, and appends claim audit JSONL.
Fails closed on malformed, missing, unclear, or unsafe state.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
TASK_QUEUE_PATH = BASE_DIR / "task_queue.jsonl"
WORKER_REGISTRY_PATH = BASE_DIR / "worker_registry.jsonl"
PREFLIGHT_PATH = BASE_DIR / "worker_preflight.py"
AUDIT_DIR = BASE_DIR / "audit"
CLAIM_AUDIT_PATH = AUDIT_DIR / "task_claim_audit.jsonl"

ALLOWED_TASK_STATUSES = {
    "queued",
    "claim_pending",
    "claimed",
    "blocked_diagnostic_required",
    "blocked_human_approval_required",
    "blocked_denied",
    "completed",
    "failed",
}
NON_CLAIMABLE_STATUSES = {
    "claimed",
    "blocked_diagnostic_required",
    "blocked_human_approval_required",
    "blocked_denied",
    "completed",
    "failed",
}
REQUIRED_TASK_FIELDS = [
    "task_id",
    "title",
    "project",
    "source",
    "intent",
    "friction",
    "gap",
    "business_value",
    "priority",
    "risk_level",
    "status",
    "required_agent_type",
    "assigned_agent_id",
    "assigned_worker_id",
    "session_file",
    "required_scopes",
    "evidence_required",
    "approval_required",
    "diagnostic_required",
    "created_at",
    "updated_at",
    "next_action",
]
CLAIM_STATUS_BY_PREFLIGHT = {
    "worker_stopped_diagnostic_required": ("task_blocked_diagnostic_required", "blocked_diagnostic_required"),
    "worker_paused_human_approval_required": ("task_blocked_human_approval_required", "blocked_human_approval_required"),
    "worker_refused_denied": ("task_blocked_denied", "blocked_denied"),
}

# Worker registry check result values (returned in worker_registry_check).
WORKER_REGISTRY_CHECK_PASSED = "worker_registry_passed"
WORKER_NOT_REGISTERED = "worker_not_registered"
WORKER_NOT_AVAILABLE = "worker_not_available"
WORKER_ROLE_NOT_ALLOWED = "worker_role_not_allowed"
WORKER_REGISTRY_MISSING = "worker_registry_missing"
WORKER_REGISTRY_INVALID = "worker_registry_invalid"
WORKER_REGISTRY_CHECK_FAILED = "worker_registry_check_failed"

# First safe mapping of machine_role -> required_agent_type the role is allowed to claim.
# Unknown or ambiguous required_agent_type values fail closed via worker_registry_check_failed.
MACHINE_ROLE_ALLOWED_AGENT_TYPES: Dict[str, set[str]] = {
    "command_node": {
        "Hermes CEO Orchestrator",
        "Senior Project Manager Agent",
        "Dashboard Reporter Agent",
    },
    "build_worker": {
        "Principal Software Engineer Agent",
        "QA/Test Agent",
        "Documentation Agent",
        "Dashboard Reporter Agent",
    },
    "research_worker": {
        "Context Discovery Agent",
        "Purpose Mapping Agent",
        "Friction Mapping Agent",
        "Research Director Agent",
        "Evidence Validator Agent",
        "SEO/AEO/GEO Agent",
        "Marketing Strategy Agent",
        "Brand Authority Agent",
        "Business Operations Agent",
        "Finance Awareness Agent",
        "Legal/Compliance Awareness Agent",
        "Documentation Agent",
        "Dashboard Reporter Agent",
    },
}

ALL_KNOWN_AGENT_TYPES: set[str] = set()
for _allowed in MACHINE_ROLE_ALLOWED_AGENT_TYPES.values():
    ALL_KNOWN_AGENT_TYPES.update(_allowed)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_queue() -> Tuple[List[Dict[str, Any]], List[str]]:
    if not TASK_QUEUE_PATH.exists():
        return [], [f"task queue missing: {TASK_QUEUE_PATH}"]
    tasks: List[Dict[str, Any]] = []
    errors: List[str] = []
    with TASK_QUEUE_PATH.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                obj = json.loads(stripped)
            except Exception as exc:
                errors.append(f"task queue JSONL parse error at line {line_no}: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"task queue line {line_no} is not a JSON object")
                continue
            tasks.append(obj)
    return tasks, errors


def write_queue(tasks: List[Dict[str, Any]]) -> None:
    # Safe local rewrite. Temp file remains inside .agentic_nexus and os.replace is atomic.
    temp_path = TASK_QUEUE_PATH.with_suffix(".jsonl.tmp")
    with temp_path.open("w", encoding="utf-8") as handle:
        for task in tasks:
            handle.write(json.dumps(task, sort_keys=False) + "\n")
    temp_path.replace(TASK_QUEUE_PATH)


def missing_task_fields(task: Dict[str, Any]) -> List[str]:
    missing: List[str] = []
    for field in REQUIRED_TASK_FIELDS:
        if field not in task:
            missing.append(field)
        elif task[field] is None and field not in {"assigned_worker_id"}:
            missing.append(field)
        elif task[field] == "" and field not in {"assigned_worker_id"}:
            missing.append(field)
    if not isinstance(task.get("required_scopes"), list):
        missing.append("required_scopes must be an array")
    if not isinstance(task.get("evidence_required"), list):
        missing.append("evidence_required must be an array")
    return sorted(set(missing))


def base_result(
    claim_status: str,
    task: Dict[str, Any] | None,
    worker_id: str,
    task_id: str,
    task_status_before: Any,
    task_status_after: Any,
    reasons: List[str],
    next_action: str,
    preflight: Dict[str, Any] | None = None,
    worker_registry_check: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    preflight = preflight or {}
    worker_registry_check = worker_registry_check or {}
    return {
        "claim_status": claim_status,
        "task_id": task_id,
        "task_title": task.get("title") if task else None,
        "worker_id": worker_id,
        "agent_id": (preflight.get("agent_id") or (task.get("assigned_agent_id") if task else None)),
        "agent_type": (preflight.get("agent_type") or (task.get("required_agent_type") if task else None)),
        "preflight_status": preflight.get("preflight_status"),
        "validator_decision": preflight.get("validator_decision"),
        "can_worker_start": bool(preflight.get("can_worker_start")) if preflight else False,
        "approval_id": preflight.get("approval_id"),
        "approval_lookup_performed": preflight.get("approval_lookup_performed"),
        "approval_lookup_result": preflight.get("approval_lookup_result"),
        "approval_valid": preflight.get("approval_valid"),
        "approval_reasons": preflight.get("approval_reasons", []),
        "approval_record_reference": preflight.get("approval_record_reference"),
        "task_status_before": task_status_before,
        "task_status_after": task_status_after,
        "audit_record_path": str(CLAIM_AUDIT_PATH),
        "reasons": reasons,
        "next_action": next_action,
        "worker_registered": worker_registry_check.get("worker_registered", False),
        "worker_status": worker_registry_check.get("worker_status"),
        "worker_machine_role": worker_registry_check.get("worker_machine_role"),
        "worker_role_allowed": worker_registry_check.get("worker_role_allowed", False),
        "worker_registry_check": worker_registry_check.get("worker_registry_check", WORKER_REGISTRY_CHECK_FAILED),
        "worker_registry_reasons": worker_registry_check.get("worker_registry_reasons", []),
    }


def append_claim_audit(result: Dict[str, Any]) -> None:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": utc_now_iso(),
        "task_id": result.get("task_id"),
        "task_title": result.get("task_title"),
        "worker_id": result.get("worker_id"),
        "agent_id": result.get("agent_id"),
        "agent_type": result.get("agent_type"),
        "preflight_status": result.get("preflight_status"),
        "validator_decision": result.get("validator_decision"),
        "claim_status": result.get("claim_status"),
        "task_status_before": result.get("task_status_before"),
        "task_status_after": result.get("task_status_after"),
        "can_worker_start": result.get("can_worker_start"),
        "approval_id": result.get("approval_id"),
        "approval_lookup_result": result.get("approval_lookup_result"),
        "approval_valid": result.get("approval_valid"),
        "reasons": result.get("reasons", []),
        "next_action": result.get("next_action"),
        "worker_registered": result.get("worker_registered"),
        "worker_status": result.get("worker_status"),
        "worker_machine_role": result.get("worker_machine_role"),
        "worker_role_allowed": result.get("worker_role_allowed"),
        "worker_registry_check": result.get("worker_registry_check"),
    }
    with CLAIM_AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=False) + "\n")


def run_preflight(session_file: str) -> Tuple[Dict[str, Any] | None, List[str]]:
    if not PREFLIGHT_PATH.exists():
        return None, [f"worker_preflight.py missing: {PREFLIGHT_PATH}"]
    try:
        proc = subprocess.run(
            [sys.executable, str(PREFLIGHT_PATH), session_file],
            cwd=str(BASE_DIR),
            text=True,
            capture_output=True,
            timeout=90,
        )
    except Exception as exc:
        return None, [f"worker preflight execution failed unexpectedly: {exc}"]
    if proc.returncode != 0:
        reasons = [f"worker preflight exited unexpectedly with code {proc.returncode}"]
        if proc.stderr.strip():
            reasons.append("preflight stderr: " + proc.stderr.strip())
        if proc.stdout.strip():
            reasons.append("preflight stdout: " + proc.stdout.strip())
        return None, reasons
    try:
        data = json.loads(proc.stdout)
    except Exception as exc:
        return None, [f"worker preflight output could not be parsed as JSON: {exc}"]
    if not isinstance(data, dict):
        return None, ["worker preflight output JSON root is not an object"]
    required = ["preflight_status", "validator_decision", "agent_id", "agent_type", "can_worker_start", "reasons", "next_action"]
    missing = [field for field in required if field not in data]
    if missing:
        return None, ["worker preflight result missing required fields: " + ", ".join(missing)]
    if not isinstance(data.get("reasons"), list):
        return None, ["worker preflight reasons must be an array"]
    return data, []


def find_task(tasks: List[Dict[str, Any]], task_id: str) -> Tuple[int | None, Dict[str, Any] | None]:
    for idx, task in enumerate(tasks):
        if task.get("task_id") == task_id:
            return idx, task
    return None, None


def load_worker_registry() -> Tuple[List[Dict[str, Any]], List[str]]:
    """Read worker_registry.jsonl. Returns (records, errors).

    An empty list with a single 'registry missing' error means the file
    is not present. Other errors mean the file exists but is unparseable.
    The caller distinguishes these via the error strings.
    """
    if not WORKER_REGISTRY_PATH.exists():
        return [], [f"worker registry missing: {WORKER_REGISTRY_PATH}"]
    records: List[Dict[str, Any]] = []
    errors: List[str] = []
    with WORKER_REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                obj = json.loads(stripped)
            except Exception as exc:
                errors.append(f"{WORKER_REGISTRY_PATH.name} line {line_no} parse error: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{WORKER_REGISTRY_PATH.name} line {line_no} is not a JSON object")
                continue
            records.append(obj)
    return records, errors


def find_worker(records: List[Dict[str, Any]], worker_id: str) -> Dict[str, Any] | None:
    for rec in records:
        if rec.get("worker_id") == worker_id:
            return rec
    return None


def evaluate_worker_registry(
    worker_id: str,
    task: Dict[str, Any] | None,
    worker_records: List[Dict[str, Any]] | None,
    worker_records_errors: List[str] | None,
) -> Dict[str, Any]:
    """Run the worker registry check for a claim attempt.

    Returns a dict with the following keys (always present, even on failure):
        worker_registry_check: one of WORKER_REGISTRY_CHECK_PASSED, WORKER_NOT_REGISTERED,
                                WORKER_NOT_AVAILABLE, WORKER_ROLE_NOT_ALLOWED,
                                WORKER_REGISTRY_MISSING, WORKER_REGISTRY_INVALID,
                                WORKER_REGISTRY_CHECK_FAILED
        worker_registered: bool
        worker_status: str | None
        worker_machine_role: str | None
        worker_role_allowed: bool
        worker_registry_reasons: List[str]
    """
    reasons: List[str] = []
    worker_records_errors = worker_records_errors or []
    if not worker_records:
        if worker_records_errors and all("missing" in e for e in worker_records_errors):
            return {
                "worker_registry_check": WORKER_REGISTRY_MISSING,
                "worker_registered": False,
                "worker_status": None,
                "worker_machine_role": None,
                "worker_role_allowed": False,
                "worker_registry_reasons": [
                    "worker_registry.jsonl does not exist; register workers before allowing any claim"
                ],
            }
        return {
            "worker_registry_check": WORKER_REGISTRY_INVALID,
            "worker_registered": False,
            "worker_status": None,
            "worker_machine_role": None,
            "worker_role_allowed": False,
            "worker_registry_reasons": worker_records_errors or ["worker registry unreadable"],
        }

    worker = find_worker(worker_records, worker_id)
    if worker is None:
        return {
            "worker_registry_check": WORKER_NOT_REGISTERED,
            "worker_registered": False,
            "worker_status": None,
            "worker_machine_role": None,
            "worker_role_allowed": False,
            "worker_registry_reasons": [
                f"worker_id {worker_id!r} not present in worker_registry.jsonl"
            ],
        }

    status = worker.get("status")
    role = worker.get("machine_role")

    # A worker is "available" only when status is exactly 'available' AND it has no active task.
    if status != "available" or worker.get("current_task_id"):
        return {
            "worker_registry_check": WORKER_NOT_AVAILABLE,
            "worker_registered": True,
            "worker_status": status,
            "worker_machine_role": role,
            "worker_role_allowed": False,
            "worker_registry_reasons": [
                (
                    f"worker {worker_id!r} status is {status!r}; only available workers may claim tasks"
                    if status != "available"
                    else f"worker {worker_id!r} is already assigned to task {worker.get('current_task_id')!r}"
                )
            ],
        }

    required = task.get("required_agent_type") if task else None
    if not required or not isinstance(required, str) or not required.strip():
        return {
            "worker_registry_check": WORKER_REGISTRY_CHECK_FAILED,
            "worker_registered": True,
            "worker_status": status,
            "worker_machine_role": role,
            "worker_role_allowed": False,
            "worker_registry_reasons": [
                f"task {task.get('task_id') if task else '<unknown>'} has missing or empty required_agent_type; refusing for safety"
            ],
        }

    if required not in ALL_KNOWN_AGENT_TYPES:
        return {
            "worker_registry_check": WORKER_REGISTRY_CHECK_FAILED,
            "worker_registered": True,
            "worker_status": status,
            "worker_machine_role": role,
            "worker_role_allowed": False,
            "worker_registry_reasons": [
                f"task required_agent_type {required!r} is not recognised by the role compatibility matrix; refusing for safety"
            ],
        }

    allowed_types = MACHINE_ROLE_ALLOWED_AGENT_TYPES.get(role, set())
    if required not in allowed_types:
        return {
            "worker_registry_check": WORKER_ROLE_NOT_ALLOWED,
            "worker_registered": True,
            "worker_status": status,
            "worker_machine_role": role,
            "worker_role_allowed": False,
            "worker_registry_reasons": [
                f"worker {worker_id!r} machine_role {role!r} is not allowed to claim tasks requiring {required!r}; allowed types: {sorted(allowed_types)}"
            ],
        }

    return {
        "worker_registry_check": WORKER_REGISTRY_CHECK_PASSED,
        "worker_registered": True,
        "worker_status": status,
        "worker_machine_role": role,
        "worker_role_allowed": True,
        "worker_registry_reasons": [
            f"worker {worker_id!r} is registered, available, and machine_role {role!r} is allowed for required_agent_type {required!r}"
        ],
    }


def claim_task(task_id: str, worker_id: str) -> Dict[str, Any]:
    tasks, queue_errors = load_queue()
    if queue_errors:
        result = base_result(
            "task_claim_failed_closed",
            None,
            worker_id,
            task_id,
            None,
            None,
            queue_errors,
            "do not claim task; repair local task queue JSONL and rerun",
        )
        append_claim_audit(result)
        return result

    idx, task = find_task(tasks, task_id)
    if task is None or idx is None:
        result = base_result(
            "task_not_found",
            None,
            worker_id,
            task_id,
            None,
            None,
            [f"task not found in task_queue.jsonl: {task_id}"],
            "create or queue the task before attempting claim",
        )
        append_claim_audit(result)
        return result

    # Worker registry check runs before any task field validation, before assignment,
    # and before preflight. If the worker is not registered, not available, or not
    # allowed for the task's required_agent_type, the claim must be refused here.
    worker_records, worker_records_errors = load_worker_registry()
    worker_registry_check = evaluate_worker_registry(
        worker_id, task, worker_records, worker_records_errors
    )
    wrc_value = worker_registry_check["worker_registry_check"]
    if wrc_value != WORKER_REGISTRY_CHECK_PASSED:
        registry_to_claim_status = {
            WORKER_NOT_REGISTERED: "worker_not_registered",
            WORKER_NOT_AVAILABLE: "worker_not_available",
            WORKER_ROLE_NOT_ALLOWED: "worker_role_not_allowed",
            WORKER_REGISTRY_MISSING: "worker_registry_missing",
            WORKER_REGISTRY_INVALID: "worker_registry_invalid",
            WORKER_REGISTRY_CHECK_FAILED: "task_claim_failed_closed",
        }
        registry_to_next_action = {
            WORKER_NOT_REGISTERED: "do not claim task; register the worker via register_worker.py first",
            WORKER_NOT_AVAILABLE: "do not claim task; worker is not available (paused/busy/offline/needs_review) — wait for availability",
            WORKER_ROLE_NOT_ALLOWED: "do not claim task; switch to a worker with an allowed machine_role for this required_agent_type",
            WORKER_REGISTRY_MISSING: "do not claim task; create worker_registry.jsonl and register workers first",
            WORKER_REGISTRY_INVALID: "do not claim task; repair worker_registry.jsonl and rerun",
            WORKER_REGISTRY_CHECK_FAILED: "do not claim task; required_agent_type is unknown or ambiguous; refuse for safety",
        }
        result = base_result(
            registry_to_claim_status[wrc_value],
            task,
            worker_id,
            task_id,
            task.get("status"),
            task.get("status"),
            list(worker_registry_check.get("worker_registry_reasons", [])),
            registry_to_next_action[wrc_value],
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    status_before = task.get("status")
    reasons: List[str] = []

    missing = missing_task_fields(task)
    if missing:
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            ["task missing required fields: " + ", ".join(missing)],
            "do not claim task; repair task object and rerun",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    if status_before not in ALLOWED_TASK_STATUSES:
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            [f"task has unknown status: {status_before}"],
            "do not claim task; correct status to a known safe state",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    if status_before in NON_CLAIMABLE_STATUSES:
        result = base_result(
            "task_not_claimable",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            [f"task is not claimable because status is {status_before}"],
            "do not claim task; create a new queued task or resolve the blocked/completed state",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    assigned_worker_id = task.get("assigned_worker_id")
    if assigned_worker_id not in (None, "", worker_id):
        result = base_result(
            "task_not_claimable",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            [f"task is assigned to another worker: {assigned_worker_id}"],
            "do not claim task; use the assigned worker or requeue with approval",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    session_file = task.get("session_file")
    if not isinstance(session_file, str) or not session_file.strip():
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            ["task has no related session_file"],
            "do not claim task; attach a valid session file and rerun",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    preflight, preflight_errors = run_preflight(session_file)
    if preflight_errors or preflight is None:
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            preflight_errors,
            "do not claim task; repair preflight/validator/session and rerun",
            None,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    if preflight.get("agent_type") != task.get("required_agent_type"):
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            [
                "preflight agent_type does not match task required_agent_type: "
                f"{preflight.get('agent_type')} != {task.get('required_agent_type')}"
            ] + list(preflight.get("reasons", [])),
            "do not claim task; align task required_agent_type with session agent_type",
            preflight,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    if preflight.get("agent_id") != task.get("assigned_agent_id"):
        result = base_result(
            "task_claim_failed_closed",
            task,
            worker_id,
            task_id,
            status_before,
            status_before,
            [
                "preflight agent_id does not match task assigned_agent_id: "
                f"{preflight.get('agent_id')} != {task.get('assigned_agent_id')}"
            ] + list(preflight.get("reasons", [])),
            "do not claim task; align task assigned_agent_id with session agent_id",
            preflight,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    preflight_status = preflight.get("preflight_status")
    reasons = list(preflight.get("reasons", []))

    if preflight.get("can_worker_start") is True and preflight_status == "worker_can_start":
        task["status"] = "claimed"
        task["assigned_worker_id"] = worker_id
        task["updated_at"] = utc_now_iso()
        write_queue(tasks)
        result = base_result(
            "task_claimed",
            task,
            worker_id,
            task_id,
            status_before,
            "claimed",
            reasons,
            "worker may start task within preflight-approved scopes; completion must later supply evidence",
            preflight,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    if preflight_status in CLAIM_STATUS_BY_PREFLIGHT:
        claim_status, new_task_status = CLAIM_STATUS_BY_PREFLIGHT[preflight_status]
        task["status"] = new_task_status
        task["assigned_worker_id"] = None
        task["updated_at"] = utc_now_iso()
        write_queue(tasks)
        next_action_by_claim = {
            "task_blocked_diagnostic_required": "complete diagnostic gate before claim can proceed",
            "task_blocked_human_approval_required": "record valid human approval before claim can proceed",
            "task_blocked_denied": "do not claim; rewrite as a safe task or remove forbidden request",
        }
        result = base_result(
            claim_status,
            task,
            worker_id,
            task_id,
            status_before,
            new_task_status,
            reasons,
            next_action_by_claim[claim_status],
            preflight,
            worker_registry_check,
        )
        append_claim_audit(result)
        return result

    result = base_result(
        "task_claim_failed_closed",
        task,
        worker_id,
        task_id,
        status_before,
        status_before,
        [f"unclear preflight result; refusing to claim: {preflight_status}"] + reasons,
        "do not claim task; inspect preflight output and rerun only when clear",
        preflight,
        worker_registry_check,
    )
    append_claim_audit(result)
    return result


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Claim an Agentic Nexus local task only after worker preflight passes.")
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--worker-id", required=True)
    args = parser.parse_args(argv[1:])
    result = claim_task(args.task_id, args.worker_id)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
