#!/usr/bin/env python3
"""Sync the vault into the Fable System's knowledge_docs table.

Runs in GitHub Actions (see .github/workflows/kd-sync.yml). Walks the
checkout, applies the approved Phase 3 filing plan, and POSTs batches to a
Supabase Edge Function which upserts them with the service role. Auth: the
runner's ephemeral GITHUB_TOKEN, which the function verifies by checking it
can read this private repo.

Filing plan (approved 2026-06-12):
  in:  "2nd Brain/**/*.md" + NEXUS.md
  out: hidden dirs (.obsidian, .agentic, .agentic_nexus, ...), files >150KB,
       near-empty files (<=100 bytes), Drafts/ (quarantined), .agents/.claude
"""
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

FN_URL = os.environ["KD_FN_URL"]
ANON_KEY = os.environ["KD_ANON_KEY"]
GH_TOKEN = os.environ["KD_GITHUB_TOKEN"]

MAX_FILE_BYTES = 150_000
MIN_FILE_BYTES = 101
BATCH_BYTES = 800_000
BATCH_FILES = 80

root = pathlib.Path(".").resolve()

files = []
for p in sorted((root / "2nd Brain").rglob("*.md")):
    rel = p.relative_to(root)
    if any(part.startswith(".") for part in rel.parts):
        continue
    size = p.stat().st_size
    if size > MAX_FILE_BYTES or size < MIN_FILE_BYTES:
        continue
    files.append(rel)
files.append(pathlib.Path("NEXUS.md"))

sha_map = {}
ls = subprocess.run(["git", "ls-files", "-s", "-z"], capture_output=True, text=True).stdout
for entry in ls.split("\0"):
    if entry:
        meta, path = entry.split("\t", 1)
        sha_map[path] = meta.split()[1]

def post(batch, attempt=1):
    body = json.dumps(batch).encode()
    req = urllib.request.Request(FN_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {ANON_KEY}",
        "x-github-token": GH_TOKEN,
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return json.load(res)
    except Exception as e:
        if attempt >= 4:
            raise
        time.sleep(2 ** attempt)
        return post(batch, attempt + 1)

batch, batch_bytes, sent = [], 0, 0
batches = []
for rel in files:
    relstr = str(rel)
    text = (root / rel).read_text(encoding="utf-8", errors="replace").replace("\x00", "")
    doc = {"path": relstr, "title": rel.stem, "content": text, "sha": sha_map.get(relstr)}
    blob = len(json.dumps(doc))
    if batch and (batch_bytes + blob > BATCH_BYTES or len(batch) >= BATCH_FILES):
        batches.append(batch)
        batch, batch_bytes = [], 0
    batch.append(doc)
    batch_bytes += blob
if batch:
    batches.append(batch)

for i, b in enumerate(batches):
    result = post(b)
    sent += result.get("upserted", 0)
    print(f"batch {i + 1}/{len(batches)}: upserted {result.get('upserted')}")

print(f"done: {sent} docs synced from {len(files)} in-scope files")
if sent != len(files):
    sys.exit(1)
