#!/usr/bin/env python3
"""PreCompact checkpoint and context-hygiene hook.

Compaction must reduce conversational noise without overwriting canonical mission
state or reviving superseded operating rules. The hook writes a separate,
non-authoritative checkpoint describing the current git/runtime envelope and
provides semantic guidance for what Claude should preserve.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def get_project_dir() -> Path:
    return Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())).resolve()


def run_git(project_dir: Path, *args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def file_fingerprint(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def write_compaction_checkpoint(project_dir: Path, session_id: str) -> None:
    """Write a separate checkpoint. Never overwrite current-state.md."""
    memory_dir = project_dir / ".claude" / "memory"
    checkpoint_path = memory_dir / "compaction-checkpoint.json"
    current_state_path = memory_dir / "current-state.md"

    branch = run_git(project_dir, "rev-parse", "--abbrev-ref", "HEAD") or "unknown"
    head_sha = run_git(project_dir, "rev-parse", "HEAD") or "unknown"
    porcelain = run_git(project_dir, "status", "--porcelain")
    dirty_count = len([line for line in (porcelain or "").splitlines() if line.strip()])

    checkpoint = {
        "schema": "nexus.compaction-checkpoint.v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id or None,
        "git": {
            "branch": branch,
            "head_sha": head_sha,
            "dirty_file_count": dirty_count,
        },
        "canonical_current_state": {
            "path": ".claude/memory/current-state.md",
            "sha256": file_fingerprint(current_state_path),
            "overwritten_by_compaction": False,
        },
        "note": (
            "This checkpoint is diagnostic metadata only. Mission state, authority, "
            "evidence and next actions remain authoritative in their canonical ledgers."
        ),
    }

    try:
        memory_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_path.write_text(json.dumps(checkpoint, indent=2) + "\n", encoding="utf-8")
    except OSError:
        # Compaction must remain available even if checkpoint persistence fails.
        pass


def build_compaction_guidance() -> str:
    return " | ".join(
        [
            "PRESERVE_CURRENT: active mission ID and explicit SPM state; current authority/gate state; current owner/worker and lease if known; unresolved blocker; next executable move; latest verification/evidence pointers; current branch/worktree/SHA; unresolved user/business decisions",
            "PRESERVE_DURABLE: ratified constitutional principles; current canonical operating contracts; verified architectural decisions still in force; current identity and locale",
            "SUMMARISE: relevant implementation discoveries; active dependencies; recent changes required to continue the mission",
            "DISCARD: superseded or legacy instructions unless history was explicitly requested; resolved debug logs; old file-read contents; completed tool output; duplicate search results; abandoned alternatives; conversational filler",
            "DO_NOT_OVERWRITE: .claude/memory/current-state.md merely because compaction occurred",
            "RESTORE_AFTER_COMPACTION: current evidence and canonical ledgers outrank remembered conversation; continue the existing mission state rather than starting a new planning cycle",
            "MUTABLE_FACTS: verify current stack, design, schema, model, machine and runtime facts from current canonical/live sources; do not preserve historical implementation details as constitutional truth",
        ]
    )


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        input_data = {}

    project_dir = get_project_dir()
    session_id = str(input_data.get("session_id", ""))
    write_compaction_checkpoint(project_dir, session_id)

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreCompact",
                    "additionalContext": build_compaction_guidance(),
                }
            }
        )
    )


if __name__ == "__main__":
    main()
