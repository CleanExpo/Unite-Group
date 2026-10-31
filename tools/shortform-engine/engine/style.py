"""The learned house style: lasting rules distilled from review notes.

STYLE.md is both the human-readable style guide the skill loads and the
machine source of render defaults. A rule line looks like:

    - **R3** Captions sit lower, clear of the chin. `caption_style.chin_line=0.62` (source: note n1, job-001, 31/10/2026)

Every backticked `group.key=value` is applied to every future render, so a
note given once is never needed again. Rules without settings are craft
guidance for the editing agent (read via the skill).
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

DEFAULT_STYLE = Path(__file__).resolve().parent.parent / "skill" / "STYLE.md"
RULE_RE = re.compile(r"^- \*\*R(\d+)\*\*")
SETTING_RE = re.compile(r"`([a-z_]+)\.([a-z_]+)=([^`]+)`")
GROUPS = {"caption_style", "cut"}


def parse_value(raw: str):
    raw = raw.strip()
    try:
        return json.loads(raw)
    except ValueError:
        return raw


def load_settings(path: Path = DEFAULT_STYLE) -> dict:
    """Render defaults from every rule line, later rules winning."""
    settings: dict[str, dict] = {g: {} for g in GROUPS}
    if not path.exists():
        return settings
    for line in path.read_text().splitlines():
        if not RULE_RE.match(line):
            continue
        for group, key, val in SETTING_RE.findall(line):
            if group in GROUPS:
                settings[group][key] = parse_value(val)
    return settings


def next_rule_number(text: str) -> int:
    nums = [int(m.group(1)) for line in text.splitlines() if (m := RULE_RE.match(line))]
    return max(nums, default=0) + 1


def add_rule(rule: str, note_id: str, job: str, settings: dict | None = None,
             path: Path = DEFAULT_STYLE, today: str | None = None) -> str:
    """Append one lasting rule and return the line written.

    Refuses a duplicate: if an existing rule already sets the same keys to the
    same values, nothing is written (the rule was already learned).
    """
    text = path.read_text() if path.exists() else "# Short-form house style\n\n## Learned rules\n"
    settings = settings or {}
    for group in settings:
        if group not in GROUPS:
            raise ValueError(f"unknown settings group {group}")
    tokens = " ".join(f"`{g}.{k}={json.dumps(v)}`" for g, kv in settings.items() for k, v in kv.items())
    if tokens and all(t in text for t in tokens.split(" ")):
        return ""
    today = today or time.strftime("%d/%m/%Y")
    n = next_rule_number(text)
    line = f"- **R{n}** {rule.strip().rstrip('.')}." + (f" {tokens}" if tokens else "") \
        + f" (source: note {note_id}, {job}, {today})"
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text + line + "\n")
    return line
