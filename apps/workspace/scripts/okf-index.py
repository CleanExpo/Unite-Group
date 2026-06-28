#!/usr/bin/env python3
"""OKF index generator — script-first markdown→OKF (Open Knowledge Format) indexer.

Walks a knowledge vault and writes an `index.md` into every folder so an agent can read
the index FIRST (knowing contents + subfolders before opening anything) — the OKF pattern
from Google's Open Knowledge Format / Karpathy's LLM Wiki. Idempotent + re-runnable.

Usage:  python3 okf-index.py "/path/to/vault"   (defaults to ~/2nd Brain/2nd Brain)

Never edits content files (incl. immutable Sources/) — only (re)writes index.md.
"""
import os
import re
import sys
from datetime import date

SKIP_DIRS = {".obsidian", ".git", ".scripts", ".agentic", ".agentic_nexus", "node_modules"}
MARKER = "<!-- okf:generated -->"


def parse_frontmatter(path):
    """Return (name, description) from a markdown file's YAML frontmatter or first heading."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            head = f.read(4096)
    except Exception:
        return None, ""
    name, desc = None, ""
    if head.startswith("---"):
        end = head.find("\n---", 3)
        if end > 0:
            fm = head[3:end]
            for key in ("name", "title"):
                m = re.search(rf"^{key}:\s*(.+?)\s*$", fm, re.M)
                if m:
                    name = m.group(1).strip().strip("\"'")
                    break
            d = re.search(r"^description:\s*(.+?)\s*$", fm, re.M)
            if d:
                desc = d.group(1).strip().strip("\"'")
    if not name:
        h = re.search(r"^#\s+(.+?)\s*$", head, re.M)
        name = h.group(1).strip() if h else None
    return name, desc


def folder_description(path):
    """Short description for a folder from its own index/readme/claude file, if any."""
    for cand in ("README.md", "readme.md", "CLAUDE.md"):
        p = os.path.join(path, cand)
        if os.path.isfile(p):
            _, d = parse_frontmatter(p)
            if d:
                return d
    return ""


def build_index(folder, rel_name):
    subdirs, files = [], []
    for entry in sorted(os.listdir(folder)):
        if entry.startswith("."):
            continue
        full = os.path.join(folder, entry)
        if os.path.isdir(full):
            if entry in SKIP_DIRS:
                continue
            subdirs.append(entry)
        elif entry.endswith(".md") and entry != "index.md":
            files.append(entry)

    lines = [
        "---",
        "type: index",
        f"name: {rel_name or os.path.basename(folder) or 'vault root'}",
        f"description: OKF index — {len(files)} concepts, {len(subdirs)} subfolders",
        'okf_version: "0.1"',
        f"updated: {date.today().isoformat()}",
        "---",
        "",
        MARKER,
        f"# {rel_name or os.path.basename(folder) or 'Vault'} — index",
        "",
        "_Read this first. Lists every concept + subfolder here so an agent loads only what it needs (OKF / LLM-Wiki pattern)._",
        "",
    ]
    if subdirs:
        lines.append("## Subfolders")
        for d in subdirs:
            dd = folder_description(os.path.join(folder, d))
            lines.append(f"- [[{d}/index]]" + (f" — {dd}" if dd else ""))
        lines.append("")
    if files:
        lines.append("## Concepts")
        for fn in files:
            nm, desc = parse_frontmatter(os.path.join(folder, fn))
            label = nm or fn[:-3]
            link = f"[[{fn[:-3]}]]"
            lines.append(f"- {link} — {label}" + (f": {desc}" if desc else ""))
        lines.append("")
    return "\n".join(lines)


def main():
    vault = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/2nd Brain/2nd Brain")
    if not os.path.isdir(vault):
        print(f"vault not found: {vault}", file=sys.stderr)
        sys.exit(1)
    written = 0
    for root, dirs, _ in os.walk(vault):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        rel = os.path.relpath(root, vault)
        rel_name = "" if rel == "." else rel
        idx_path = os.path.join(root, "index.md")
        # Don't clobber a hand-authored index.md (one without our marker).
        if os.path.isfile(idx_path):
            try:
                with open(idx_path, "r", encoding="utf-8", errors="ignore") as f:
                    if MARKER not in f.read(400):
                        continue  # hand-authored — leave it
            except Exception:
                pass
        content = build_index(root, rel_name)
        with open(idx_path, "w", encoding="utf-8") as f:
            f.write(content + "\n")
        written += 1
    print(f"OKF index: wrote {written} index.md files under {vault}")


if __name__ == "__main__":
    main()
