#!/usr/bin/env bash
set -euo pipefail

# The Swarm workspace lives at apps/workspace inside the Unite-Group monorepo.
# The canonical checkout is identified by its package identities, not by a
# founder-machine path: the repo root must be `unite-group` and this workspace
# `hermes-workspace`. Any other Git checkout with a package.json is refused.
CANONICAL_ROOT_PACKAGE="unite-group"
CANONICAL_WORKSPACE_PACKAGE="hermes-workspace"

REPO_ROOT="$(git rev-parse --show-toplevel)"
CURRENT_DIR="$(pwd -P)"

if [[ "$CURRENT_DIR" != "$REPO_ROOT" && "$CURRENT_DIR" != "$REPO_ROOT"/* ]]; then
  echo "ERROR: cwd is outside the canonical repo: $CURRENT_DIR"
  echo "Use: $REPO_ROOT"
  exit 1
fi

package_name() {
  PKG_JSON="$1" python3 -c '
import json, os, sys
from pathlib import Path
p = Path(os.environ["PKG_JSON"])
if not p.is_file():
    sys.exit(0)
print(json.loads(p.read_text()).get("name", ""))
'
}

ROOT_NAME="$(package_name "$REPO_ROOT/package.json")"
if [[ "$ROOT_NAME" != "$CANONICAL_ROOT_PACKAGE" ]]; then
  echo "ERROR: not the canonical repo: root package is '${ROOT_NAME}', expected '$CANONICAL_ROOT_PACKAGE'"
  exit 1
fi

REPO_NAME="$(package_name "$REPO_ROOT/apps/workspace/package.json")"
if [[ "$REPO_NAME" != "$CANONICAL_WORKSPACE_PACKAGE" ]]; then
  echo "ERROR: unexpected workspace package name: '${REPO_NAME}', expected '$CANONICAL_WORKSPACE_PACKAGE'"
  exit 1
fi

echo "OK: canonical repo"
echo "cwd=$CURRENT_DIR"
echo "package=$REPO_NAME"
