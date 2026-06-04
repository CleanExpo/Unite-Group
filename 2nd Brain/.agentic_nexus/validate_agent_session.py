#!/usr/bin/env python3
"""Fail-closed local validator for proposed Agentic Nexus agent sessions.

Standard-library only. No network, database, GitHub, deployment, or external side effects.
Reads local policy/schema files from the same directory and prints a JSON decision object.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set, Tuple

BASE_DIR = Path(__file__).resolve().parent
POLICY_FILES = [
    "auth.schema.json",
    "agent_session.schema.json",
    "scope_policy.schema.json",
    "approval_gate.schema.json",
    "evidence_record.schema.json",
    "agent_scope_matrix.json",
    "forbidden_actions.json",
    "diagnostic_gate.schema.json",
]
APPROVAL_STORE_PATH = BASE_DIR / "approvals" / "approval_store.jsonl"
VALID_DECISIONS = {
    "allowed",
    "denied",
    "requires_human_approval",
    "diagnostic_required",
}
SENSITIVE_KEYWORDS = [
    "production",
    "deploy",
    "publishing",
    "publish",
    "public content",
    "billing",
    "payment",
    "authentication",
    "auth",
    "rls",
    "database policy",
    "database",
    "customer data",
    "customer personal data",
    "personal data",
    "legal",
    "compliance",
    "external email",
    "send email",
    "destructive",
    "delete",
    "final shipit",
    "shipit approval",
]
CONTROL_PLANE_BYPASS_ACTIONS = {
    "bypass task queue",
    "bypass evidence ledger",
    "bypass approval gate",
    "bypass diagnostic gate",
}
DIAGNOSTIC_COMPLETION_FIELDS = [
    "context_discovery_completed",
    "purpose_mapping_completed",
    "friction_mapping_completed",
    "gap_detection_completed",
    "business_value_review_completed",
    "priority_scoring_completed",
]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_policy_files() -> Tuple[Dict[str, Any], List[str]]:
    loaded: Dict[str, Any] = {}
    errors: List[str] = []
    for name in POLICY_FILES:
        path = BASE_DIR / name
        if not path.exists():
            errors.append(f"policy file missing: {name}")
            continue
        try:
            loaded[name] = load_json(path)
        except Exception as exc:  # fail closed; report exact local parse error
            errors.append(f"policy file invalid JSON: {name}: {exc}")
    return loaded, errors


def load_approval_store() -> List[Dict[str, Any]]:
    approvals: List[Dict[str, Any]] = []
    if not APPROVAL_STORE_PATH.exists():
        return approvals
    try:
        with APPROVAL_STORE_PATH.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    approvals.append(json.loads(line))
                except Exception:
                    continue
    except Exception:
        pass
    return approvals


ALLOWED_HUMAN_APPROVERS = {"Phill McGurk"}
RISK_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}
SCOPE_KEYWORDS = {
    "merge:pull_request": ["merge", "pull request"],
    "deploy:production": ["deploy", "production"],
    "publish:public_content": ["publish", "public content"],
    "send:external_email": ["send", "external email"],
    "modify:billing": ["modify", "billing"],
    "modify:authentication": ["modify", "authentication"],
    "modify:database_policy": ["modify", "database policy"],
    "modify:rls_policy": ["modify", "rls"],
    "delete:file": ["delete", "file"],
    "delete:database_record": ["delete", "database"],
    "access:customer_personal_data": ["access", "personal data"],
    "access:payment_data": ["access", "payment"],
    "change:legal_or_compliance_position": ["change", "legal"],
}


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(normalize_text(item) for item in value)
    if isinstance(value, dict):
        return " ".join(normalize_text(item) for item in value.values())
    return str(value).strip().lower()


def approval_context_text(approval: Dict[str, Any]) -> str:
    return normalize_text([
        approval.get("requested_action"),
        approval.get("reason_for_request"),
        approval.get("decision_notes"),
        approval.get("affected_project"),
        approval.get("affected_files"),
        approval.get("affected_systems"),
        approval.get("evidence_supplied"),
    ])


def action_clearly_relates(session_action: str, approval_action: str, approval_context: str) -> bool:
    session_text = normalize_text(session_action)
    approval_text = normalize_text(approval_action)
    context_text = normalize_text(approval_context)
    if not session_text or not approval_text:
        return False
    if session_text in approval_text or approval_text in session_text:
        return True
    important = {
        token for token in session_text.replace(":", " ").replace("_", " ").replace("-", " ").split()
        if len(token) >= 5 and token not in {"after", "local", "request", "approval", "approved", "task"}
    }
    approval_words = set((approval_text + " " + context_text).replace(":", " ").replace("_", " ").replace("-", " ").split())
    overlap = important & approval_words
    return bool(important) and len(overlap) >= min(2, len(important))


def scope_covered_by_approval(scope: str, approval: Dict[str, Any]) -> bool:
    context = approval_context_text(approval)
    keywords = SCOPE_KEYWORDS.get(scope, [])
    return bool(keywords) and all(keyword.lower() in context for keyword in keywords)


def record_reference(approval: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "approval_id": approval.get("approval_id"),
        "task_id": approval.get("task_id"),
        "approval_status": approval.get("approval_status"),
        "approved_by": approval.get("approved_by"),
        "expiry": approval.get("expiry"),
        "audit_log_reference": approval.get("audit_log_reference"),
    }


def validate_linked_approval(session: Dict[str, Any], restricted_scopes: List[str], approval_required: bool) -> Dict[str, Any]:
    approval_id = str(session.get("approval_id", "")).strip()
    details: Dict[str, Any] = {
        "approval_id": approval_id or None,
        "approval_lookup_performed": bool(approval_required),
        "approval_lookup_result": "approval_not_required" if not approval_required else "approval_missing",
        "approval_valid": False,
        "approval_reasons": [],
        "approval_record_reference": None,
    }
    if not approval_required:
        return details

    reasons: List[str] = details["approval_reasons"]
    if not approval_id:
        reasons.append("session approval_id is missing; approval cannot be inferred")
        return details

    approvals = load_approval_store()
    same_id = [app for app in approvals if str(app.get("approval_id", "")).strip() == approval_id]
    if not same_id:
        details["approval_lookup_result"] = "approval_not_found"
        reasons.append(f"linked approval not found in approval store: {approval_id}")
        return details
    if len(same_id) > 1:
        details["approval_lookup_result"] = "approval_ambiguous"
        reasons.append(f"multiple approval records share approval_id: {approval_id}")
        return details

    approval = same_id[0]
    details["approval_record_reference"] = record_reference(approval)
    status = str(approval.get("approval_status", "")).strip().lower()
    if status == "pending":
        details["approval_lookup_result"] = "approval_pending"
        reasons.append("linked approval is pending")
    elif status == "rejected":
        details["approval_lookup_result"] = "approval_rejected"
        reasons.append("linked approval is rejected")
    elif status == "expired":
        details["approval_lookup_result"] = "approval_expired"
        reasons.append("linked approval status is expired")
    elif status != "approved":
        details["approval_lookup_result"] = "approval_invalid"
        reasons.append(f"linked approval status is not approved: {approval.get('approval_status')}")

    if str(session.get("approval_status", "")).strip().lower() != "approved":
        reasons.append(f"session approval_status is not approved: {session.get('approval_status')}")

    session_task = str(session.get("assigned_task", "")).strip()
    approval_task = str(approval.get("task_id", "")).strip()
    if not approval_task or approval_task != session_task:
        details["approval_lookup_result"] = "approval_mismatch"
        reasons.append(f"approval.task_id mismatch: approval={approval_task or '<missing>'} session={session_task or '<missing>'}")

    session_project = str(session.get("assigned_project", "")).strip()
    approval_project = str(approval.get("affected_project", "")).strip()
    if not approval_project or approval_project != session_project:
        details["approval_lookup_result"] = "approval_mismatch"
        reasons.append(f"approval.affected_project mismatch: approval={approval_project or '<missing>'} session={session_project or '<missing>'}")

    session_agent = str(session.get("agent_id", "")).strip()
    approval_agent = str(approval.get("requested_by_agent", "")).strip()
    if not approval_agent or approval_agent != session_agent:
        details["approval_lookup_result"] = "approval_mismatch"
        reasons.append(f"approval.requested_by_agent mismatch: approval={approval_agent or '<missing>'} session={session_agent or '<missing>'}")

    approved_by = str(approval.get("approved_by", "")).strip()
    if approved_by not in ALLOWED_HUMAN_APPROVERS:
        details["approval_lookup_result"] = "approval_invalid"
        reasons.append(f"approved_by is not an allowed human approver: {approved_by or '<missing>'}")

    expiry = parse_datetime(approval.get("expiry"))
    if expiry is None:
        details["approval_lookup_result"] = "approval_invalid"
        reasons.append("approval expiry missing or invalid")
    elif expiry <= datetime.now(timezone.utc):
        details["approval_lookup_result"] = "approval_expired"
        reasons.append(f"approval expired: {approval.get('expiry')}")

    evidence = approval.get("evidence_supplied")
    evidence_not_applicable = str(approval.get("evidence_not_applicable_reason", "")).strip()
    if not evidence and not evidence_not_applicable:
        details["approval_lookup_result"] = "approval_invalid"
        reasons.append("approval.evidence_supplied missing and no explicit not-applicable reason documented")

    session_action = " ".join(session_actions(session))
    approval_action = str(approval.get("requested_action", "")).strip()
    if not action_clearly_relates(session_action, approval_action, approval_context_text(approval)):
        details["approval_lookup_result"] = "approval_mismatch"
        reasons.append("approval.requested_action does not clearly relate to session.requested_action/requested_actions")

    for scope in sorted(set(restricted_scopes)):
        if not scope_covered_by_approval(scope, approval):
            details["approval_lookup_result"] = "approval_mismatch"
            reasons.append(f"restricted scope is not clearly covered by approval context: {scope}")

    session_risk = str(session.get("risk_level", "")).strip().lower()
    approval_risk = str(approval.get("risk_level", "")).strip().lower()
    if RISK_RANK.get(approval_risk, 0) < RISK_RANK.get(session_risk, 999):
        details["approval_lookup_result"] = "approval_mismatch"
        reasons.append(f"approval risk_level is not compatible: approval={approval_risk or '<missing>'} session={session_risk or '<missing>'}")

    if status == "approved":
        same_context_approved = []
        for app in approvals:
            if app is approval:
                continue
            if str(app.get("approval_status", "")).strip().lower() != "approved":
                continue
            if str(app.get("task_id", "")).strip() != approval_task:
                continue
            if str(app.get("affected_project", "")).strip() != approval_project:
                continue
            if action_clearly_relates(session_action, str(app.get("requested_action", "")), approval_context_text(app)):
                same_context_approved.append(app.get("approval_id"))
        if same_context_approved:
            details["approval_lookup_result"] = "approval_ambiguous"
            reasons.append("multiple approved approvals match this task/project/action context: " + ", ".join(map(str, same_context_approved)))

    if not reasons:
        details["approval_lookup_result"] = "approval_valid"
        details["approval_valid"] = True
        details["approval_reasons"].append("linked approval passed exact task/project/agent/action/scope/risk validation")
    else:
        # Preserve explicit terminal approval statuses for clearer fail-closed reporting.
        if status == "pending":
            details["approval_lookup_result"] = "approval_pending"
        elif status == "rejected":
            details["approval_lookup_result"] = "approval_rejected"
        elif status == "expired" or any("approval expired" in reason for reason in reasons):
            details["approval_lookup_result"] = "approval_expired"
        elif details["approval_lookup_result"] == "approval_missing":
            details["approval_lookup_result"] = "approval_invalid"
    return details

def as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def strings(value: Any) -> List[str]:
    return [str(item) for item in as_list(value) if item is not None]


def lower_set(items: Iterable[str]) -> Set[str]:
    return {str(item).strip().lower() for item in items if str(item).strip()}


def parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def session_actions(session: Dict[str, Any]) -> List[str]:
    actions = strings(session.get("requested_actions"))
    for field in ("requested_action", "assigned_task"):
        value = session.get(field)
        if isinstance(value, str) and value.strip():
            actions.append(value)
    return actions


def detect_forbidden_actions(session: Dict[str, Any], forbidden_doc: Dict[str, Any]) -> List[str]:
    requested_action_texts = lower_set(session_actions(session))
    combined_text = "\n".join(requested_action_texts)
    detected: List[str] = []
    for item in forbidden_doc.get("actions", []):
        action = str(item.get("action", "")).strip()
        if not action:
            continue
        action_lower = action.lower()
        category = item.get("category")
        exact_requested = action_lower in requested_action_texts
        # Control-plane/evidence/memory bypasses are hard-deny if exact or embedded.
        if category in {"control_plane_bypass", "evidence_integrity", "memory_integrity"}:
            if exact_requested or action_lower in combined_text:
                detected.append(action)
            continue
        # Restricted-without-approval actions are hard-deny only when the session explicitly
        # states the "without approval" action. A restricted scope alone becomes approval-required.
        if exact_requested:
            detected.append(action)
    return sorted(set(detected))


def sensitive_action_detected(session: Dict[str, Any]) -> bool:
    text = "\n".join(session_actions(session)).lower()
    return any(keyword in text for keyword in SENSITIVE_KEYWORDS)


def build_agent_index(matrix_doc: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {
        str(entry.get("agent_type")): entry
        for entry in matrix_doc.get("agent_types", [])
        if entry.get("agent_type")
    }


def schema_required_fields(schema_doc: Dict[str, Any]) -> List[str]:
    required = schema_doc.get("required", [])
    return [str(item) for item in required]


def validate_required_session_fields(session: Dict[str, Any], schema_doc: Dict[str, Any]) -> List[str]:
    missing: List[str] = []
    for field in schema_required_fields(schema_doc):
        if field not in session:
            missing.append(field)
            continue
        value = session[field]
        if value is None or value == "":
            missing.append(field)
    return missing


def diagnostic_required_reasons(session: Dict[str, Any], diagnostic_schema: Dict[str, Any]) -> List[str]:
    reasons: List[str] = []
    if session.get("diagnostic_gate_completed") is not True:
        reasons.append("diagnostic_gate_completed is not true")

    gate = session.get("diagnostic_gate")
    if not isinstance(gate, dict):
        reasons.append("diagnostic_gate object missing")
        return reasons

    answers = gate.get("answers")
    if not isinstance(answers, dict):
        reasons.append("diagnostic answers missing")
    else:
        required_questions = (
            diagnostic_schema.get("properties", {})
            .get("answers", {})
            .get("required", [])
        )
        for question in required_questions:
            answer = answers.get(question)
            if not isinstance(answer, str) or not answer.strip():
                reasons.append(f"diagnostic answer missing: {question}")

    for field in DIAGNOSTIC_COMPLETION_FIELDS:
        if gate.get(field) is not True:
            reasons.append(f"diagnostic completion field is not true: {field}")
    return reasons


def evidence_missing(session: Dict[str, Any]) -> bool:
    required = strings(session.get("evidence_required"))
    normalized_required = lower_set(required)
    if not required or normalized_required <= {"none", "not_required", "not required"}:
        return False
    supplied = strings(session.get("evidence_supplied"))
    return not bool(supplied)


def evaluate(session: Dict[str, Any], policies: Dict[str, Any], policy_errors: List[str]) -> Dict[str, Any]:
    reasons: List[str] = []
    requested_scopes = strings(session.get("requested_scopes"))
    allowed_scopes: List[str] = []
    denied_scopes: List[str] = []
    restricted_scopes: List[str] = []
    approval_required = False
    approval_details: Dict[str, Any] = {
        "approval_id": None,
        "approval_lookup_performed": False,
        "approval_lookup_result": "approval_not_required",
        "approval_valid": False,
        "approval_reasons": [],
        "approval_record_reference": None,
    }

    matrix_doc = policies.get("agent_scope_matrix.json", {})
    forbidden_doc = policies.get("forbidden_actions.json", {})
    agent_schema = policies.get("agent_session.schema.json", {})
    diagnostic_schema = policies.get("diagnostic_gate.schema.json", {})
    agent_index = build_agent_index(matrix_doc)
    forbidden_actions_detected = detect_forbidden_actions(session, forbidden_doc)

    agent_id = session.get("agent_id")
    agent_type = session.get("agent_type")
    assigned_project = session.get("assigned_project")
    assigned_task = session.get("assigned_task")
    risk_level = session.get("risk_level")

    if policy_errors:
        reasons.extend(policy_errors)
        decision = "denied"
    else:
        decision = "allowed"

    missing_fields = validate_required_session_fields(session, agent_schema)
    if missing_fields:
        reasons.append("required session fields missing: " + ", ".join(missing_fields))
        decision = "denied"

    agent_entry = agent_index.get(str(agent_type))
    if not agent_entry:
        reasons.append(f"agent type is not registered in agent_scope_matrix.json: {agent_type}")
        decision = "denied"

    if forbidden_actions_detected:
        reasons.append("forbidden actions detected: " + ", ".join(forbidden_actions_detected))
        decision = "denied"

    expiry = parse_datetime(session.get("session_expiry"))
    if expiry is None:
        reasons.append("session_expiry missing or invalid date-time")
        decision = "denied"
    elif expiry <= datetime.now(timezone.utc):
        reasons.append("session is expired")
        decision = "denied"

    known_policy_scopes: Set[str] = set()
    auth_props = policies.get("auth.schema.json", {}).get("properties", {})
    permission_props = auth_props.get("permission_scopes", {}).get("properties", {})
    policy_restricted: Set[str] = set()
    for section in ("read_scopes", "write_scopes", "execution_scopes", "restricted_scopes"):
        enum_values = (
            permission_props.get(section, {})
            .get("items", {})
            .get("enum", [])
        )
        known_policy_scopes.update(enum_values)
        if section == "restricted_scopes":
            policy_restricted.update(enum_values)

    if agent_entry:
        allowed_for_agent = set(strings(agent_entry.get("allowed_read_scopes")))
        allowed_for_agent.update(strings(agent_entry.get("allowed_write_scopes")))
        allowed_for_agent.update(strings(agent_entry.get("allowed_execution_scopes")))
        restricted_for_agent = set(strings(agent_entry.get("restricted_scopes_available_by_approval")))
        forbidden_for_agent = set(strings(agent_entry.get("forbidden_scopes")))

        for scope in requested_scopes:
            if scope in forbidden_for_agent:
                denied_scopes.append(scope)
                reasons.append(f"scope is forbidden for agent type {agent_type}: {scope}")
                decision = "denied"
            elif scope in allowed_for_agent:
                allowed_scopes.append(scope)
            elif scope in restricted_for_agent or scope in policy_restricted:
                restricted_scopes.append(scope)
                approval_required = True
            elif scope not in known_policy_scopes:
                denied_scopes.append(scope)
                reasons.append(f"unknown scope requested: {scope}")
                decision = "denied"
            else:
                denied_scopes.append(scope)
                reasons.append(f"scope is not allowed for agent type {agent_type}: {scope}")
                decision = "denied"

    # If already denied, still collect diagnostic/approval facts but do not downgrade the denial.
    diagnostic_reasons = diagnostic_required_reasons(session, diagnostic_schema)
    if diagnostic_reasons:
        reasons.extend(diagnostic_reasons)
        if decision != "denied":
            decision = "diagnostic_required"

    if restricted_scopes:
        reasons.append("restricted scopes requested: " + ", ".join(sorted(restricted_scopes)))
        approval_required = True
    if sensitive_action_detected(session):
        reasons.append("sensitive action keywords detected in requested action/task")
        approval_required = True
    if str(risk_level).lower() in {"high", "critical"}:
        reasons.append(f"risk level requires approval/escalation: {risk_level}")
        approval_required = True

    approval_details = validate_linked_approval(session, restricted_scopes, approval_required)
    if approval_required:
        reasons.extend(approval_details.get("approval_reasons", []))
        if not approval_details.get("approval_valid") and decision not in {"denied", "diagnostic_required"}:
            decision = "requires_human_approval"

    if evidence_missing(session):
        reasons.append("evidence_required is set but evidence_supplied is missing or empty")
        if decision == "allowed":
            decision = "denied"

    if decision == "allowed":
        reasons.append("session passed local fail-closed validation")
        next_action = "worker may accept this task using only the allowed scopes"
    elif decision == "diagnostic_required":
        next_action = "complete the diagnostic gate before assigning work to a worker"
    elif decision == "requires_human_approval":
        next_action = "create or update an approval gate and wait for Phill/Board approval before worker execution"
    else:
        next_action = "do not run worker; revise the session request and remove denied or unsafe actions"

    result = {
        "decision": decision,
        "agent_id": agent_id,
        "agent_type": agent_type,
        "assigned_project": assigned_project,
        "assigned_task": assigned_task,
        "requested_scopes": requested_scopes,
        "allowed_scopes": sorted(set(allowed_scopes)),
        "denied_scopes": sorted(set(denied_scopes)),
        "restricted_scopes": sorted(set(restricted_scopes)),
        "forbidden_actions_detected": forbidden_actions_detected,
        "diagnostic_gate_completed": session.get("diagnostic_gate_completed") is True and not diagnostic_reasons,
        "approval_required": approval_required,
        "approval_id": approval_details.get("approval_id"),
        "approval_lookup_performed": approval_details.get("approval_lookup_performed"),
        "approval_lookup_result": approval_details.get("approval_lookup_result"),
        "approval_valid": approval_details.get("approval_valid"),
        "approval_reasons": approval_details.get("approval_reasons"),
        "approval_record_reference": approval_details.get("approval_record_reference"),
        "evidence_required": strings(session.get("evidence_required")),
        "risk_level": risk_level,
        "reasons": reasons,
        "next_action": next_action,
    }
    if result["decision"] not in VALID_DECISIONS:
        result["decision"] = "denied"
        result["reasons"].append("internal invalid decision; fail closed")
    return result


def main(argv: List[str]) -> int:
    if len(argv) != 2:
        print(json.dumps({
            "decision": "denied",
            "reasons": ["usage: python validate_agent_session.py <proposed-session.json>"],
            "next_action": "provide exactly one proposed session JSON file path",
        }, indent=2))
        return 2

    session_path = Path(argv[1])
    if not session_path.is_absolute():
        session_path = (Path.cwd() / session_path).resolve()

    policies, policy_errors = load_policy_files()
    try:
        session = load_json(session_path)
    except Exception as exc:
        print(json.dumps({
            "decision": "denied",
            "agent_id": None,
            "agent_type": None,
            "assigned_project": None,
            "assigned_task": None,
            "requested_scopes": [],
            "allowed_scopes": [],
            "denied_scopes": [],
            "restricted_scopes": [],
            "forbidden_actions_detected": [],
            "diagnostic_gate_completed": False,
            "approval_required": False,
            "evidence_required": [],
            "risk_level": None,
            "reasons": [f"could not read proposed session JSON: {exc}"],
            "next_action": "provide a valid JSON session file",
        }, indent=2, sort_keys=False))
        return 1

    if not isinstance(session, dict):
        print(json.dumps({
            "decision": "denied",
            "reasons": ["session JSON root must be an object"],
            "next_action": "provide a valid session object",
        }, indent=2))
        return 1

    result = evaluate(session, policies, policy_errors)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
