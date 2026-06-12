# Run Agentic Nexus Validator Examples

This folder contains a local, standard-library-only runtime validator for proposed Agentic Nexus agent sessions.

The validator is intentionally fail-closed. If a session is unclear, unsafe, expired, missing required fields, missing diagnostic completion, requesting restricted scopes without approval, or attempting forbidden actions, it does not silently allow worker execution.

## Prerequisites

Run from:

```bash
cd /Users/phillmcgurk/2nd-brain/.agentic_nexus
```

No external packages are required.

## Commands

### 1. Allowed session

```bash
python3 validate_agent_session.py examples/session_allowed.json
```

Expected decision:

```text
allowed
```

Reason: Dashboard Reporter Agent requests only allowed read/structured-write scopes, has diagnostic gate completed, has evidence supplied, has low risk, and does not request restricted or forbidden actions.

### 2. Diagnostic required session

```bash
python3 validate_agent_session.py examples/session_diagnostic_required.json
```

Expected decision:

```text
diagnostic_required
```

Reason: Diagnostic gate is incomplete, required diagnostic questions are missing, and required completion booleans are false.

### 3. Requires human approval session

```bash
python3 validate_agent_session.py examples/session_requires_approval.json
```

Expected decision:

```text
requires_human_approval
```

Reason: Principal Software Engineer Agent requests `deploy:production`, a restricted scope, with approval status still pending. The task touches production deployment and has critical risk.

### 4. Denied session

```bash
python3 validate_agent_session.py examples/session_denied.json
```

Expected decision:

```text
denied
```

Reason: Local Build Worker attempts forbidden actions including bypassing the approval gate, deleting files without approval, and inventing evidence.

## Batch expectation check

```bash
python3 - <<'PY'
import json, subprocess, sys
from pathlib import Path
base=Path('/Users/phillmcgurk/2nd-brain/.agentic_nexus')
expected={
 'examples/session_allowed.json':'allowed',
 'examples/session_diagnostic_required.json':'diagnostic_required',
 'examples/session_requires_approval.json':'requires_human_approval',
 'examples/session_denied.json':'denied',
}
for path, expected_decision in expected.items():
    proc=subprocess.run([sys.executable,'validate_agent_session.py',path],cwd=base,text=True,capture_output=True,check=True)
    data=json.loads(proc.stdout)
    got=data.get('decision')
    print(f'{path}: expected={expected_decision} got={got} match={got == expected_decision}')
PY
```

Expected final state: all four examples match their expected decision.

## Safety note

The examples and validator only read local policy/schema/session JSON files and print JSON decisions. They do not deploy, call external services, modify databases, send email, publish content, or delete files.
