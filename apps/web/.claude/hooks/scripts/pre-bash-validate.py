#!/usr/bin/env python3
"""Claude Code PreToolUse Bash authority gate for Unite-Group.

This hook runs before Claude Code's normal permission evaluation. Shared settings
may allow broad command families for developer ergonomics, so this layer fails
closed on operations whose authority must come from a higher, explicit Nexus
transition rather than from a convenient Bash wildcard.

The goal is not to block normal engineering work. Read-only inspection, tests,
builds, formatting, commits and feature-branch pushes remain available. The
blocked classes below are the operations that can destroy history, change the
repository/release authority state, mutate declared dependencies, or touch
production/external configuration.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class Rule:
    pattern: str
    message: str


# Hard authority/safety boundary. A match exits 2 and Claude Code blocks the tool
# call before normal allow/deny permission evaluation.
BLOCK_RULES: tuple[Rule, ...] = (
    # Catastrophic filesystem / host mutation.
    Rule(r"rm\s+-rf\s+/(?:\s|$)", "'rm -rf /' would delete the filesystem"),
    Rule(r"rm\s+-rf\s+\*", "'rm -rf *' is too destructive for the shared project shell"),
    Rule(r"rm\s+-rf\s+~", "'rm -rf ~' would delete the home directory"),
    Rule(r"sudo\s+rm\s+-rf", "sudo recursive deletion is prohibited"),
    Rule(r":\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}", "fork bomb detected"),
    Rule(r">\s*/dev/sd[a-z]", "direct disk-device write is prohibited"),
    Rule(r"\bmkfs\.", "filesystem formatting is prohibited"),
    Rule(r"\bdd\s+if=.*\bof=/dev/", "direct disk write with dd is prohibited"),

    # Git history / protected-branch mutation.
    Rule(r"\bgit\s+push\b[^\n;&|]*(?:--force(?:-with-lease)?|-f)(?:\s|$)", "force-push requires a higher authority path"),
    Rule(r"\bgit\s+reset\s+--hard\b", "hard reset can discard work and is not a routine agent repair"),
    Rule(r"\bgit\s+clean\s+[^\n;&|]*-[^\s]*f", "forced git clean can destroy untracked work"),
    Rule(r"\bgit\s+branch\s+-D\b", "forced branch deletion is prohibited in the shared agent shell"),
    Rule(r"\bgit\s+push\b[^\n;&|]*(?:\s|:|/)main(?:\s|$)", "direct push to main is prohibited"),
    Rule(r"\bgit\s+push\b[^\n;&|]*(?:\s|:|/)master(?:\s|$)", "direct push to master is prohibited"),

    # GitHub state progression / side doors. Candidate creation remains allowed;
    # ready/merge/review/release authority is deliberately separate.
    Rule(r"\bgh\s+pr\s+(?:ready|merge|review|edit|close|reopen)\b", "PR progression/mutation requires the governed GitHub authority path"),
    Rule(r"\bgh\s+api\b", "raw GitHub API access is not allowed from the shared agent Bash surface"),
    Rule(r"\bgh\s+(?:release|secret|variable)\b", "GitHub release/secret/variable mutation requires higher authority"),
    Rule(r"\bgh\s+workflow\s+run\b", "workflow dispatch requires a governed execution path"),

    # Dependency declaration mutations. Installing the existing lockfile is not
    # blocked here; adding/removing/upgrading declared packages is.
    Rule(r"\bpnpm\s+(?:add|remove|update|up)\b", "dependency declaration changes require explicit dependency authority/review"),
    Rule(r"\bnpm\s+(?:install|i|uninstall|remove|update)\b", "apps/web dependency mutation must not occur through broad npm shell permission"),
    Rule(r"\byarn\s+(?:add|remove|upgrade)\b", "dependency declaration changes require explicit dependency authority/review"),
    Rule(r"\b(?:npm|pnpm|yarn)\s+publish\b", "package publication is a release action"),

    # Production/external configuration paths.
    Rule(r"\bvercel\b[^\n;&|]*--prod\b", "production Vercel deployment requires the governed release path"),
    Rule(r"\bsupabase\s+db\s+push\b", "remote Supabase DB push requires the governed migration path"),
    Rule(r"\bsupabase\s+functions\s+deploy\b", "Supabase function deployment requires the governed release path"),
    Rule(r"\bsupabase\s+secrets\s+(?:set|unset)\b", "remote secret mutation requires explicit authority"),
)


# Candidate PR creation is useful during BUILD, but it must remain a draft
# targeting main. This semantic rule is easier to express separately from regex.
PR_CREATE_PATTERN = re.compile(r"\bgh\s+pr\s+create\b", re.IGNORECASE)

# Low-risk advisory notices only. They never substitute for a hard authority rule.
ADVISORIES: tuple[Rule, ...] = (
    Rule(r"\bchmod\s+777\b", "chmod 777 is overly permissive; prefer the minimum required mode"),
)


def _matches(rule: Rule, command: str) -> bool:
    return re.search(rule.pattern, command, re.IGNORECASE) is not None


def _validate_pr_create(command: str) -> list[str]:
    if PR_CREATE_PATTERN.search(command) is None:
        return []

    violations: list[str] = []
    if re.search(r"(?:^|\s)--draft(?:\s|$)", command) is None:
        violations.append("gh pr create must include --draft from the shared agent shell")

    base_main = (
        re.search(r"(?:^|\s)--base(?:=|\s+)main(?:\s|$)", command) is not None
    )
    if not base_main:
        violations.append("gh pr create must target --base main")

    if re.search(r"(?:^|\s)--web(?:\s|$)", command):
        violations.append("browser-driven gh pr create bypasses the deterministic candidate contract")
    return violations


def validate_command(command: str) -> tuple[bool, list[str]]:
    """Return (blocked, messages) for one Bash tool command string."""
    messages = [rule.message for rule in BLOCK_RULES if _matches(rule, command)]
    messages.extend(_validate_pr_create(command))
    blocked = bool(messages)

    if not blocked:
        messages.extend(rule.message for rule in ADVISORIES if _matches(rule, command))
    return blocked, messages


def _emit_block(messages: Iterable[str]) -> None:
    for message in messages:
        print(f"BLOCKED: {message}", file=sys.stderr)


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError) as exc:
        # A malformed hook input must not silently permit a command. Hook failure
        # is safer than pretending the authority gate ran successfully.
        print(f"BLOCKED: invalid PreToolUse input: {exc}", file=sys.stderr)
        sys.exit(2)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "") if isinstance(tool_input, dict) else ""

    if tool_name != "Bash" or not isinstance(command, str) or not command.strip():
        sys.exit(0)

    blocked, messages = validate_command(command)
    if blocked:
        _emit_block(messages)
        sys.exit(2)

    if messages:
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "additionalContext": " | ".join(messages),
                    }
                }
            )
        )
    sys.exit(0)


if __name__ == "__main__":
    main()
