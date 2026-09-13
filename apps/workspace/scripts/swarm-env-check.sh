#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CURRENT_DIR="$(pwd -P)"

if [[ "$CURRENT_DIR" != "$REPO_ROOT" && "$CURRENT_DIR" != "$REPO_ROOT"/* ]]; then
  echo "ERROR: cwd is outside the canonical repo: $CURRENT_DIR"
  echo "Use: $REPO_ROOT"
  exit 1
fi

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo "ERROR: package.json missing in canonical repo"
  exit 1
fi

REPO_NAME="$(python3 - <<PY
import json
from pathlib import Path
pkg = json.loads(Path("$REPO_ROOT/package.json").read_text())
print(pkg.get("name", ""))
PY
)"

if [[ -z "$REPO_NAME" ]]; then
  echo "ERROR: package.json has no name"
  exit 1
fi

echo "OK: canonical repo"
echo "cwd=$CURRENT_DIR"
echo "package=$REPO_NAME"
