#!/usr/bin/env python3
"""Worker preflight wrapper for Agentic Nexus local workers.

Standard-library only. Calls validate_agent_session.py, maps validator decisions to
worker actions, appends a local JSONL audit record, and fails closed on uncertainty.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
VALIDATOR_PATH = BASE_DIR / "validate_agent_session.py"
AUDIT_DIR = BASE_DIR / "audit"
AUDIT_LOG = AUDIT_DIR / "preflight_audit.jsonl"

STATUS_BY_DECISION = {
    "allowed": ("worker_can_start", "proceed", True),
    "denied": ("worker_refused_denied", "refuse", False),
    "diagnostic_required": (
        "worker_stopped_diagnostic_required",
        "stop_until_diagnostic_gate_completed",
        False,
    ),
    "requires_human_approval": (
        "worker_paused_human_approval_required",
        "pause_until_human_approval",
        False,
    ),
}

REQUIRED_VALIDATOR_FIELDS = [
    "decision",
    "agent_id",
    "agent_type",
    "assigned_project",
    "assigned_task",
    "reasons",
    "next_action",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fail_closed_result(session_file: str, reasons: List[str], validator_decision: Any = None) -> Dict[str, Any]:
    return {
        "preflight_status": "worker_failed_closed",
        "validator_decision": validator_decision,
        "agent_id": None,
        "agent_type": None,
        "assigned_project": None,
        "assigned_task": None,
        "worker_action": "fail_closed",
        "can_worker_start": False,
        "approval_required": False,
        "approval_id": None,
        "approval_lookup_performed": False,
        "approval_lookup_result": "approval_invalid",
        "approval_valid": False,
        "approval_reasons": [],
        "approval_record_reference": None,
        "diagnostic_required": False,
        "audit_record_path": str(AUDIT_LOG),
        "reasons": reasons,
        "next_action": "do not start worker; fix validation/preflight input and rerun",
        "session_file": session_file,
    }


def run_validator(session_file: str) -> Tuple[Dict[str, Any] | None, List[str]]:
    if not VALIDATOR_PATH.exists():
        return None, [f"validator script missing: {VALIDATOR_PATH}"]

    try:
        proc = subprocess.run(
            [sys.executable, str(VALIDATOR_PATH), session_file],
            cwd=str(BASE_DIR),
            text=True,
            capture_output=True,
            timeout=60,
        )
    except Exception as exc:
        return None, [f"validator execution failed unexpectedly: {exc}"]

    if proc.returncode != 0:
        reasons = [f"validator exited unexpectedly with code {proc.returncode}"]
        if proc.stderr.strip():
            reasons.append("validator stderr: " + proc.stderr.strip())
        if proc.stdout.strip():
            reasons.append("validator stdout: " + proc.stdout.strip())
        return None, reasons

    try:
        parsed = json.loads(proc.stdout)
    except Exception as exc:
        return None, [f"validator output could not be parsed as JSON: {exc}"]

    if not isinstance(parsed, dict):
        return None, ["validator output JSON root is not an object"]

    return parsed, []


def missing_validator_fields(validator_result: Dict[str, Any]) -> List[str]:
    missing: List[str] = []
    for field in REQUIRED_VALIDATOR_FIELDS:
        if field not in validator_result:
            missing.append(field)
        elif validator_result[field] in (None, "") and field not in {"reasons"}:
            missing.append(field)
    if not isinstance(validator_result.get("reasons"), list):
        missing.append("reasons must be an array")
    return missing


def map_validator_to_preflight(session_file: str, validator_result: Dict[str, Any]) -> Dict[str, Any]:
    reasons = list(validator_result.get("reasons", []))
    missing = missing_validator_fields(validator_result)
    decision = validator_result.get("decision")

    if missing:
        return fail_closed_result(
            session_file,
            ["validator result missing required fields: " + ", ".join(sorted(set(missing)))] + reasons,
            validator_decision=decision,
        )

    if decision not in STATUS_BY_DECISION:
        return fail_closed_result(
            session_file,
            [f"validator returned unknown or unclear decision: {decision}"] + reasons,
            validator_decision=decision,
        )

    preflight_status, worker_action, can_worker_start = STATUS_BY_DECISION[decision]
    diagnostic_required = decision == "diagnostic_required"
    approval_required = bool(validator_result.get("approval_required")) or decision == "requires_human_approval"

    next_action_by_status = {
        "worker_can_start": "worker may accept this task and proceed only within allowed scopes",
        "worker_refused_denied": "worker must refuse this task; revise session and remove denied/unsafe actions",
        "worker_stopped_diagnostic_required": "complete diagnostic gate before any worker accepts this task",
        "worker_paused_human_approval_required": "pause worker until a valid human approval gate is approved",
    }

    return {
        "preflight_status": preflight_status,
        "validator_decision": decision,
        "agent_id": validator_result.get("agent_id"),
        "agent_type": validator_result.get("agent_type"),
        "assigned_project": validator_result.get("assigned_project"),
        "assigned_task": validator_result.get("assigned_task"),
        "worker_action": worker_action,
        "can_worker_start": can_worker_start,
        "approval_required": approval_required,
        "approval_id": validator_result.get("approval_id"),
        "approval_lookup_performed": validator_result.get("approval_lookup_performed"),
        "approval_lookup_result": validator_result.get("approval_lookup_result"),
        "approval_valid": validator_result.get("approval_valid"),
        "approval_reasons": validator_result.get("approval_reasons", []),
        "approval_record_reference": validator_result.get("approval_record_reference"),
        "diagnostic_required": diagnostic_required,
        "audit_record_path": str(AUDIT_LOG),
        "reasons": reasons,
        "next_action": next_action_by_status[preflight_status],
        "session_file": session_file,
    }


def append_audit_record(result: Dict[str, Any], session_file: str) -> None:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": utc_now_iso(),
        "session_file": session_file,
        "validator_decision": result.get("validator_decision"),
        "preflight_status": result.get("preflight_status"),
        "agent_id": result.get("agent_id"),
        "agent_type": result.get("agent_type"),
        "assigned_project": result.get("assigned_project"),
        "assigned_task": result.get("assigned_task"),
        "can_worker_start": result.get("can_worker_start"),
        "approval_id": result.get("approval_id"),
        "approval_lookup_result": result.get("approval_lookup_result"),
        "approval_valid": result.get("approval_valid"),
        "reasons": result.get("reasons", []),
        "next_action": result.get("next_action"),
    }
    with AUDIT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=False) + "\n")


def preflight(session_file: str) -> Dict[str, Any]:
    validator_result, errors = run_validator(session_file)
    if errors or validator_result is None:
        result = fail_closed_result(session_file, errors, validator_decision=None)
    else:
        result = map_validator_to_preflight(session_file, validator_result)

    try:
        append_audit_record(result, session_file)
    except Exception as exc:
        # Audit failure must fail closed; do not let a worker start without an audit trail.
        result = fail_closed_result(
            session_file,
            [f"audit record could not be written: {exc}"] + list(result.get("reasons", [])),
            validator_decision=result.get("validator_decision"),
        )
        try:
            append_audit_record(result, session_file)
        except Exception:
            # If even fail-closed audit cannot be written, still print failed-closed result.
            pass
    return result


def main(argv: List[str]) -> int:
    if len(argv) != 2:
        result = fail_closed_result(
            session_file="",
            reasons=["usage: python worker_preflight.py <proposed-session.json>"],
            validator_decision=None,
        )
        try:
            append_audit_record(result, "")
        except Exception:
            pass
        print(json.dumps(result, indent=2, sort_keys=False))
        return 0

    session_file = argv[1]
    result = preflight(session_file)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
