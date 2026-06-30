#!/usr/bin/env python3
"""OKF index generator — script-first markdown→OKF (Open Knowledge Format) indexer.

Walks a knowledge vault and writes an `index.md` into every folder so an agent can read
the index FIRST (knowing contents + subfolders before opening anything) — the OKF pattern
from Google's Open Knowledge Format / Karpathy's LLM Wiki. Idempotent + re-runnable.

Usage:
  python3 okf-index.py ["/path/to/vault"]            # write/refresh index.md everywhere
  python3 okf-index.py ["vault"] --bundle [out.json] # emit a portable OKF concept manifest
  python3 okf-index.py ["vault"] --check             # verify indexes are fresh (exit 1 if stale)

Vault defaults to ~/2nd Brain/2nd Brain. Never edits content files (incl. immutable
Sources/) — only (re)writes index.md (and, with --bundle, a manifest file).
"""
import json
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


def _walk_dirs(vault):
    """Yield (root, rel_name) for every non-skipped folder in the vault."""
    for root, dirs, _ in os.walk(vault):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        rel = os.path.relpath(root, vault)
        yield root, ("" if rel == "." else rel)


def write_indexes(vault):
    """(Re)write a generated index.md in every folder; leave hand-authored ones."""
    written = 0
    for root, rel_name in _walk_dirs(vault):
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
    return written


def iter_concepts(vault):
    """Yield one OKF concept record per markdown file (excludes index.md)."""
    for root, rel_name in _walk_dirs(vault):
        for entry in sorted(os.listdir(root)):
            if not entry.endswith(".md") or entry == "index.md":
                continue
            full = os.path.join(root, entry)
            if not os.path.isfile(full):
                continue
            name, desc = parse_frontmatter(full)
            rel_path = os.path.relpath(full, vault)
            yield {
                "path": rel_path,
                "folder": rel_name or ".",
                "name": name or entry[:-3],
                "description": desc,
            }


def emit_bundle(vault, out_path):
    """Write a portable OKF manifest: every concept with name + description."""
    concepts = list(iter_concepts(vault))
    manifest = {
        "okf_version": "0.1",
        "vault": os.path.basename(os.path.normpath(vault)),
        "generated": date.today().isoformat(),
        "concept_count": len(concepts),
        "concepts": concepts,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"OKF bundle: wrote {len(concepts)} concepts -> {out_path}")
    return len(concepts)


def check_fresh(vault):
    """Report folders whose generated index.md is missing or out of date.

    Stale = a generated index.md whose body differs from what we'd write now,
    or a folder with concepts but no index.md at all. Hand-authored indexes
    (no marker) are skipped. Exit 1 when anything is stale (CI/hook guard).
    """
    stale = []
    for root, rel_name in _walk_dirs(vault):
        idx_path = os.path.join(root, "index.md")
        expected = build_index(root, rel_name) + "\n"
        if os.path.isfile(idx_path):
            with open(idx_path, "r", encoding="utf-8", errors="ignore") as f:
                current = f.read()
            if MARKER not in current[:400]:
                continue  # hand-authored — not ours to judge
            if current != expected:
                stale.append(os.path.relpath(idx_path, vault))
        else:
            # only flag folders that actually hold concepts/subfolders
            if "## " in expected:
                stale.append(os.path.relpath(idx_path, vault) + " (missing)")
    if stale:
        print(f"OKF check: {len(stale)} stale/missing index.md:", file=sys.stderr)
        for s in stale:
            print(f"  - {s}", file=sys.stderr)
        return 1
    print("OKF check: all generated indexes fresh.")
    return 0


def main():
    args = sys.argv[1:]
    mode = None
    out_path = None
    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--bundle":
            mode = "bundle"
            if i + 1 < len(args) and not args[i + 1].startswith("--"):
                out_path = args[i + 1]
                i += 1
        elif a == "--check":
            mode = "check"
        else:
            positional.append(a)
        i += 1

    vault = positional[0] if positional else os.path.expanduser("~/2nd Brain/2nd Brain")
    if not os.path.isdir(vault):
        print(f"vault not found: {vault}", file=sys.stderr)
        sys.exit(1)

    if mode == "bundle":
        emit_bundle(vault, out_path or os.path.join(vault, "okf-bundle.json"))
    elif mode == "check":
        sys.exit(check_fresh(vault))
    else:
        written = write_indexes(vault)
        print(f"OKF index: wrote {written} index.md files under {vault}")


if __name__ == "__main__":
    main()
