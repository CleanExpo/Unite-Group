"""Post-run secret-leak scan (spec §12). Asserts known key prefixes are absent
from logs / artifact / any text we produced."""
from __future__ import annotations

import re

# Prefix shapes only (never real values). Matches Anthropic, OpenAI, OpenRouter,
# MiniMax, Google styles.
PREFIX_PATTERNS = [
    r"sk-ant-(?:api03|oat01)-[A-Za-z0-9_\-]{6,}",
    r"sk-or-v1-[A-Za-z0-9_\-]{6,}",
    r"sk-[A-Za-z0-9]{20,}",
    r"AIza[0-9A-Za-z_\-]{30,}",
    r"Bearer\s+[A-Za-z0-9_\-]{20,}",
]
_COMPILED = [re.compile(p) for p in PREFIX_PATTERNS]


def scan_text(text: str) -> list[str]:
    """Return a list of redacted hits ('<prefix>…') — empty list means clean."""
    hits = []
    for rx in _COMPILED:
        for m in rx.finditer(text or ""):
            s = m.group(0)
            hits.append(s[:8] + "…[REDACTED]")
    return hits


def scan_paths(paths) -> list[str]:
    hits = []
    for p in paths:
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as fh:
                hits.extend(scan_text(fh.read()))
        except (OSError, FileNotFoundError):
            continue
    return hits
