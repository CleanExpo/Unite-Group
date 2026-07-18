#!/usr/bin/env python3
"""Metadata-only Hermes machine activity collector.

Reads the content-free active-session lease registry and emits exactly two
bounded logical screen slots. It never reads transcripts, prompts, messages,
window titles, command lines, clipboard data, browser URLs, or file contents.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

POLL_SECONDS = 15
MAX_BACKOFF_SECONDS = 120
ALLOWED_PROJECT_KEYS = {
    "unite-group",
    "pi-ceo",
    "nexus",
    "synthex",
    "restore-assist",
    "dr-nrpg",
    "carsi",
    "ccw-crm",
    "unassigned",
}


def _runtime_dir() -> Path:
    hermes_home = Path(os.environ.get("HERMES_HOME", "~/.hermes")).expanduser()
    return hermes_home / "runtime"


def default_registry_path() -> Path:
    return _runtime_dir() / "active_sessions.json"


def default_state_path() -> Path:
    return _runtime_dir() / "machine_activity_collector_state.json"


def _atomic_json_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, sort_keys=True)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    finally:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass


def next_state(path: Path) -> dict[str, Any]:
    existing: dict[str, Any] = {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(value, dict):
            existing = value
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        pass

    boot_id = existing.get("bootId")
    try:
        boot_id = str(uuid.UUID(str(boot_id)))
    except (ValueError, TypeError, AttributeError):
        boot_id = str(uuid.uuid4())

    previous_sequence = existing.get("sequence", 0)
    if not isinstance(previous_sequence, int) or isinstance(previous_sequence, bool):
        previous_sequence = 0
    sequence = max(0, previous_sequence) + 1
    state = {"bootId": boot_id, "sequence": sequence}
    _atomic_json_write(path, state)
    return state


def load_registry(path: Path) -> list[dict[str, Any]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return []
    entries = value.get("entries") if isinstance(value, dict) else value
    if not isinstance(entries, list):
        return []
    return [entry for entry in entries if isinstance(entry, dict)][:64]


def process_is_alive(pid: Any) -> bool:
    if isinstance(pid, bool):
        return False
    try:
        numeric_pid = int(pid)
    except (TypeError, ValueError):
        return False
    if numeric_pid <= 0:
        return False
    try:
        os.kill(numeric_pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False
    return True


def _safe_agent(value: str) -> str:
    candidate = value.strip().lower()
    if not candidate or len(candidate) > 32:
        return "default"
    if not candidate[0].isalnum():
        return "default"
    if not all(character.isalnum() or character in "_-" for character in candidate):
        return "default"
    return candidate


def _safe_project(value: str) -> str:
    candidate = value.strip().lower()
    return candidate if candidate in ALLOWED_PROJECT_KEYS else "unassigned"


def _idle_screen(screen_id: str, agent: str, project_key: str) -> dict[str, Any]:
    return {
        "screenId": screen_id,
        "state": "idle",
        "activity": "idle",
        "tool": None,
        "agent": agent,
        "projectKey": project_key,
    }


def _active_screen(screen_id: str, agent: str, project_key: str) -> dict[str, Any]:
    return {
        "screenId": screen_id,
        "state": "active",
        "activity": "operating",
        "tool": "hermes",
        "agent": agent,
        "projectKey": project_key,
    }


def build_snapshot(
    entries: list[dict[str, Any]],
    *,
    boot_id: str,
    sequence: int,
    observed_at: str,
    pid_alive: Callable[[Any], bool] = process_is_alive,
    agent: str = "default",
    project_key: str = "unassigned",
) -> dict[str, Any]:
    safe_agent = _safe_agent(agent)
    safe_project = _safe_project(project_key)
    live_entries = [entry for entry in entries if pid_alive(entry.get("pid"))]
    live_entries.sort(
        key=lambda entry: (
            float(entry.get("started_at", 0))
            if isinstance(entry.get("started_at"), (int, float))
            else 0
        )
    )

    screens: list[dict[str, Any]] = []
    for index, screen_id in enumerate(("primary", "secondary")):
        if index < len(live_entries):
            screens.append(_active_screen(screen_id, safe_agent, safe_project))
        else:
            screens.append(_idle_screen(screen_id, safe_agent, safe_project))

    return {
        "schemaVersion": 1,
        "bootId": str(uuid.UUID(boot_id)),
        "sequence": sequence,
        "observedAt": observed_at,
        "screens": screens,
    }


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def validate_config(endpoint: str, token: str) -> None:
    parsed = urllib.parse.urlparse(endpoint)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("MACHINE_ACTIVITY_ENDPOINT must be HTTPS")
    if not parsed.path.endswith("/api/agents/machine-activity"):
        raise ValueError("MACHINE_ACTIVITY_ENDPOINT must target the machine-activity API")
    if len(token.strip()) < 32:
        raise ValueError("MACHINE_ACTIVITY_DEVICE_TOKEN must contain at least 32 characters")


def post_snapshot(endpoint: str, token: str, snapshot: dict[str, Any]) -> None:
    payload = json.dumps(snapshot, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "unite-machine-activity/1",
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status != 201:
            raise RuntimeError(f"ingest returned HTTP {response.status}")
        response.read(1)


def collect_once(
    *,
    endpoint: str,
    token: str,
    registry_path: Path,
    state_path: Path,
    agent: str,
    project_key: str,
) -> None:
    state = next_state(state_path)
    snapshot = build_snapshot(
        load_registry(registry_path),
        boot_id=state["bootId"],
        sequence=state["sequence"],
        observed_at=utc_now_iso(),
        agent=agent,
        project_key=project_key,
    )
    post_snapshot(endpoint, token, snapshot)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Send safe Hermes activity telemetry")
    parser.add_argument("--once", action="store_true", help="send one snapshot and exit")
    parser.add_argument("--endpoint", default=os.environ.get("MACHINE_ACTIVITY_ENDPOINT", ""))
    parser.add_argument("--token", default=os.environ.get("MACHINE_ACTIVITY_DEVICE_TOKEN", ""))
    parser.add_argument("--registry", type=Path, default=default_registry_path())
    parser.add_argument("--state", type=Path, default=default_state_path())
    parser.add_argument("--agent", default=os.environ.get("MACHINE_ACTIVITY_AGENT", "default"))
    parser.add_argument(
        "--project-key",
        default=os.environ.get("MACHINE_ACTIVITY_PROJECT_KEY", "unassigned"),
    )
    arguments = parser.parse_args(argv)

    try:
        validate_config(arguments.endpoint, arguments.token)
    except ValueError as error:
        print(f"configuration error: {error}", file=sys.stderr)
        return 2

    backoff = POLL_SECONDS
    while True:
        try:
            collect_once(
                endpoint=arguments.endpoint,
                token=arguments.token,
                registry_path=arguments.registry,
                state_path=arguments.state,
                agent=arguments.agent,
                project_key=arguments.project_key,
            )
            backoff = POLL_SECONDS
        except urllib.error.HTTPError as error:
            print(f"ingest failed: HTTP {error.code}", file=sys.stderr)
            backoff = min(MAX_BACKOFF_SECONDS, max(POLL_SECONDS, backoff * 2))
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, RuntimeError):
            print("ingest failed: transport or local state error", file=sys.stderr)
            backoff = min(MAX_BACKOFF_SECONDS, max(POLL_SECONDS, backoff * 2))

        if arguments.once:
            return 0 if backoff == POLL_SECONDS else 1
        time.sleep(backoff)


if __name__ == "__main__":
    raise SystemExit(main())
