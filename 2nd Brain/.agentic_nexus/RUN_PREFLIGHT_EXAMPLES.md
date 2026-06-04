# Run Agentic Nexus Worker Preflight Examples

`worker_preflight.py` is the local worker gate. Every local worker should run it before accepting a task.

It calls `validate_agent_session.py`, maps the validator decision into a worker action, and appends a JSONL audit record to:

```text
/Users/phillmcgurk/2nd-brain/.agentic_nexus/audit/preflight_audit.jsonl
```

Run from:

```bash
cd /Users/phillmcgurk/2nd-brain/.agentic_nexus
```

## Required compile checks

```bash
python3 -m py_compile validate_agent_session.py
python3 -m py_compile worker_preflight.py
```

## Example commands

### 1. Allowed session

```bash
python3 worker_preflight.py examples/session_allowed.json
```

Expected:

- validator_decision: `allowed`
- preflight_status: `worker_can_start`
- worker_action: `proceed`
- can_worker_start: `true`

### 2. Diagnostic required session

```bash
python3 worker_preflight.py examples/session_diagnostic_required.json
```

Expected:

- validator_decision: `diagnostic_required`
- preflight_status: `worker_stopped_diagnostic_required`
- worker_action: `stop_until_diagnostic_gate_completed`
- can_worker_start: `false`

### 3. Requires human approval session

```bash
python3 worker_preflight.py examples/session_requires_approval.json
```

Expected:

- validator_decision: `requires_human_approval`
- preflight_status: `worker_paused_human_approval_required`
- worker_action: `pause_until_human_approval`
- can_worker_start: `false`

### 4. Denied session

```bash
python3 worker_preflight.py examples/session_denied.json
```

Expected:

- validator_decision: `denied`
- preflight_status: `worker_refused_denied`
- worker_action: `refuse`
- can_worker_start: `false`

## Batch assertion

```bash
python3 - <<'PY'
import json, subprocess, sys
from pathlib import Path
base=Path('/Users/phillmcgurk/2nd-brain/.agentic_nexus')
expected={
 'examples/session_allowed.json':'worker_can_start',
 'examples/session_diagnostic_required.json':'worker_stopped_diagnostic_required',
 'examples/session_requires_approval.json':'worker_paused_human_approval_required',
 'examples/session_denied.json':'worker_refused_denied',
}
for path, expected_status in expected.items():
    proc=subprocess.run([sys.executable,'worker_preflight.py',path],cwd=base,text=True,capture_output=True,check=True)
    data=json.loads(proc.stdout)
    got=data.get('preflight_status')
    print(f'{path}: expected={expected_status} got={got} match={got == expected_status}')
PY
```

Expected final state: all four examples match.

## Safety note

This preflight wrapper only reads local session/policy JSON files, calls the local validator, writes a local audit JSONL line, and prints a JSON preflight result. It does not deploy, call external services, modify databases, send email, publish content, call GitHub, or delete files.
