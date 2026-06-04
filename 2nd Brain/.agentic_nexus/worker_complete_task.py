#!/usr/bin/env python3
"""Local task completion gate for Agentic Nexus workers.

Standard-library only. A task can only be marked completed when it is claimed by
the worker attempting completion and a valid evidence JSON record is supplied.
Valid evidence is appended to evidence/evidence_ledger.jsonl and every attempt is
audited in audit/task_completion_audit.jsonl. Fails closed on uncertainty.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
TASK_QUEUE_PATH = BASE_DIR / "task_queue.jsonl"
EVIDENCE_DIR = BASE_DIR / "evidence"
EVIDENCE_LEDGER_PATH = EVIDENCE_DIR / "evidence_ledger.jsonl"
AUDIT_DIR = BASE_DIR / "audit"
COMPLETION_AUDIT_PATH = AUDIT_DIR / "task_completion_audit.jsonl"

REQUIRED_EVIDENCE_FIELDS = [
    "evidence_id",
    "task_id",
    "agent_id",
    "worker_id",
    "project",
    "evidence_type",
    "source_path",
    "source_url",
    "source_date",
    "date_gathered",
    "claim_supported",
    "confidence_score",
    "freshness_rating",
    "contradiction_status",
    "business_relevance",
    "linked_decision",
    "linked_gap",
    "linked_output",
    "recommended_next_action",
]
EVIDENCE_TYPES = {"research", "coding", "strategy", "compliance", "dashboard", "business_decision", "qa", "shipit_readiness", "diagnostic"}
FRESHNESS = {"fresh", "current", "stale", "unknown"}
CONTRADICTION = {"none_found", "contradictions_found", "not_checked", "unknown"}
BUSINESS_RELEVANCE = {"low", "medium", "high", "critical"}


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
    temp_path = TASK_QUEUE_PATH.with_suffix(".jsonl.tmp")
    with temp_path.open("w", encoding="utf-8") as handle:
        for task in tasks:
            handle.write(json.dumps(task, sort_keys=False) + "\n")
    temp_path.replace(TASK_QUEUE_PATH)


def find_task(tasks: List[Dict[str, Any]], task_id: str) -> Tuple[int | None, Dict[str, Any] | None]:
    for idx, task in enumerate(tasks):
        if task.get("task_id") == task_id:
            return idx, task
    return None, None


def resolve_evidence_file(evidence_file: str) -> Path:
    path = Path(evidence_file)
    if not path.is_absolute():
        path = BASE_DIR / path
    resolved = path.resolve()
    # Completion evidence must be local to .agentic_nexus for this v0 control-plane slice.
    if BASE_DIR.resolve() not in resolved.parents and resolved != BASE_DIR.resolve():
        raise ValueError(f"evidence file must live under {BASE_DIR}: {resolved}")
    return resolved


def parse_evidence(evidence_file: str) -> Tuple[Dict[str, Any] | None, str | None, List[str]]:
    try:
        evidence_path = resolve_evidence_file(evidence_file)
    except Exception as exc:
        return None, None, [str(exc)]
    if not evidence_path.exists():
        return None, str(evidence_path), [f"evidence file missing: {evidence_path}"]
    try:
        parsed = json.loads(evidence_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return None, str(evidence_path), [f"evidence file could not be parsed as JSON: {exc}"]
    if not isinstance(parsed, dict):
        return None, str(evidence_path), ["evidence JSON root is not an object"]
    return parsed, str(evidence_path), []


def validate_evidence(evidence: Dict[str, Any], task: Dict[str, Any], worker_id: str) -> Tuple[bool, List[str]]:
    reasons: List[str] = []
    for field in REQUIRED_EVIDENCE_FIELDS:
        if field not in evidence:
            reasons.append(f"missing evidence field: {field}")
            continue
        value = evidence[field]
        # Empty string is allowed only where a source URL is not applicable.
        if field == "source_url":
            if value is None:
                reasons.append("source_url must be a string; use empty string when not applicable")
            continue
        if value is None or value == "":
            reasons.append(f"evidence field is empty: {field}")

    if evidence.get("task_id") != task.get("task_id"):
        reasons.append(f"evidence task_id does not match task: {evidence.get('task_id')} != {task.get('task_id')}")
    if evidence.get("worker_id") != worker_id:
        reasons.append(f"evidence worker_id does not match completing worker: {evidence.get('worker_id')} != {worker_id}")
    if evidence.get("agent_id") != task.get("assigned_agent_id"):
        reasons.append(f"evidence agent_id does not match assigned agent: {evidence.get('agent_id')} != {task.get('assigned_agent_id')}")
    if evidence.get("project") != task.get("project"):
        reasons.append(f"evidence project does not match task project: {evidence.get('project')} != {task.get('project')}")

    evidence_type = evidence.get("evidence_type")
    if evidence_type not in EVIDENCE_TYPES:
        reasons.append(f"evidence_type is not allowed: {evidence_type}")
    required_types = task.get("evidence_required")
    if not isinstance(required_types, list) or not required_types:
        reasons.append("task evidence_required is missing or empty")
    elif evidence_type not in required_types:
        reasons.append(f"evidence_type does not satisfy task evidence_required: {evidence_type} not in {required_types}")

    confidence = evidence.get("confidence_score")
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not (0 <= confidence <= 1):
        reasons.append("confidence_score must be a number between 0 and 1")
    if evidence.get("freshness_rating") not in FRESHNESS:
        reasons.append(f"freshness_rating is not allowed: {evidence.get('freshness_rating')}")
    if evidence.get("contradiction_status") not in CONTRADICTION:
        reasons.append(f"contradiction_status is not allowed: {evidence.get('contradiction_status')}")
    if evidence.get("business_relevance") not in BUSINESS_RELEVANCE:
        reasons.append(f"business_relevance is not allowed: {evidence.get('business_relevance')}")
    if not str(evidence.get("recommended_next_action", "")).strip():
        reasons.append("recommended_next_action is required and cannot be empty")
    if not str(evidence.get("evidence_id", "")).startswith("ANX-EVIDENCE-"):
        reasons.append("evidence_id must start with ANX-EVIDENCE-")

    return (len(reasons) == 0), reasons


def append_evidence_record(evidence: Dict[str, Any]) -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    with EVIDENCE_LEDGER_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(evidence, sort_keys=False) + "\n")


def result_object(
    completion_status: str,
    task: Dict[str, Any] | None,
    task_id: str,
    worker_id: str,
    task_status_before: Any,
    task_status_after: Any,
    evidence_file: str | None,
    evidence_id: Any,
    required_evidence_satisfied: bool,
    reasons: List[str],
    next_action: str,
) -> Dict[str, Any]:
    return {
        "completion_status": completion_status,
        "task_id": task_id,
        "task_title": task.get("title") if task else None,
        "worker_id": worker_id,
        "task_status_before": task_status_before,
        "task_status_after": task_status_after,
        "evidence_record_path": evidence_file,
        "evidence_ledger_path": str(EVIDENCE_LEDGER_PATH),
        "audit_record_path": str(COMPLETION_AUDIT_PATH),
        "required_evidence_satisfied": required_evidence_satisfied,
        "reasons": reasons,
        "next_action": next_action,
        "evidence_id": evidence_id,
    }


def append_completion_audit(result: Dict[str, Any]) -> None:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": utc_now_iso(),
        "task_id": result.get("task_id"),
        "task_title": result.get("task_title"),
        "worker_id": result.get("worker_id"),
        "task_status_before": result.get("task_status_before"),
        "task_status_after": result.get("task_status_after"),
        "completion_status": result.get("completion_status"),
        "evidence_file": result.get("evidence_record_path"),
        "evidence_id": result.get("evidence_id"),
        "required_evidence_satisfied": result.get("required_evidence_satisfied"),
        "reasons": result.get("reasons", []),
        "next_action": result.get("next_action"),
    }
    with COMPLETION_AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=False) + "\n")


def complete_task(task_id: str, worker_id: str, evidence_file: str) -> Dict[str, Any]:
    tasks, queue_errors = load_queue()
    if queue_errors:
        result = result_object(
            "completion_failed_closed", None, task_id, worker_id, None, None, evidence_file, None, False,
            queue_errors, "do not complete task; repair task queue JSONL and rerun"
        )
        append_completion_audit(result)
        return result

    idx, task = find_task(tasks, task_id)
    if task is None or idx is None:
        result = result_object(
            "task_not_found", None, task_id, worker_id, None, None, evidence_file, None, False,
            [f"task not found in task_queue.jsonl: {task_id}"], "create or claim the task before completion"
        )
        append_completion_audit(result)
        return result

    status_before = task.get("status")
    if status_before != "claimed":
        result = result_object(
            "task_not_claimed", task, task_id, worker_id, status_before, status_before, evidence_file, None, False,
            [f"task is not claimed; current status is {status_before}"],
            "do not complete task; only claimed tasks assigned to this worker can be completed"
        )
        append_completion_audit(result)
        return result

    assigned_worker = task.get("assigned_worker_id")
    if assigned_worker != worker_id:
        result = result_object(
            "worker_mismatch", task, task_id, worker_id, status_before, status_before, evidence_file, None, False,
            [f"worker mismatch: task assigned_worker_id is {assigned_worker}, supplied worker_id is {worker_id}"],
            "do not complete task; use the assigned worker or reassign through the claim flow"
        )
        append_completion_audit(result)
        return result

    evidence, resolved_evidence_file, parse_errors = parse_evidence(evidence_file)
    if parse_errors or evidence is None:
        result = result_object(
            "evidence_missing", task, task_id, worker_id, status_before, status_before,
            resolved_evidence_file or evidence_file, None, False, parse_errors,
            "do not complete task; supply a valid local evidence JSON file"
        )
        append_completion_audit(result)
        return result

    valid_evidence, evidence_errors = validate_evidence(evidence, task, worker_id)
    if not valid_evidence:
        result = result_object(
            "evidence_invalid", task, task_id, worker_id, status_before, status_before,
            resolved_evidence_file, evidence.get("evidence_id"), False, evidence_errors,
            "do not complete task; repair evidence fields and rerun"
        )
        append_completion_audit(result)
        return result

    try:
        append_evidence_record(evidence)
        task["status"] = "completed"
        task["updated_at"] = utc_now_iso()
        write_queue(tasks)
    except Exception as exc:
        result = result_object(
            "completion_failed_closed", task, task_id, worker_id, status_before, status_before,
            resolved_evidence_file, evidence.get("evidence_id"), True,
            [f"completion write failed: {exc}"], "do not treat task as completed; inspect queue/evidence writes and rerun"
        )
        append_completion_audit(result)
        return result

    result = result_object(
        "task_completed", task, task_id, worker_id, status_before, "completed",
        resolved_evidence_file, evidence.get("evidence_id"), True,
        ["claimed task completed with valid required evidence"],
        evidence.get("recommended_next_action") or "task completed; continue to next safe control-plane step"
    )
    append_completion_audit(result)
    return result


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Complete an Agentic Nexus local task only with valid evidence.")
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--worker-id", required=True)
    parser.add_argument("--evidence-file", required=True)
    args = parser.parse_args(argv[1:])
    result = complete_task(args.task_id, args.worker_id, args.evidence_file)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
