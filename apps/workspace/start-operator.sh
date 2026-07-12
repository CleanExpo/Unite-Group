#!/usr/bin/env bash
# Launch the Hermes Workspace operator console against the local gateway.
# The trusted Node entry reads the gateway key from ~/.hermes/.env after exec;
# the shell never places the key in argv or an intermediate process environment.
# Needs Node >=24.14.1 <25 (uses nvm v24.14.1 if present). Gateway must be running on :8642
# (launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway).
set -euo pipefail

REQUIRED_NODE_RANGE=">=24.14.1 <25"

check_node_range() {
  local node_bin="$1"
  "$node_bin" -e '
    const [major, minor, patch] = process.versions.node.split(".").map(Number)
    if (major !== 24 || minor < 14 || (minor === 14 && patch < 1)) process.exit(1)
  '
}

SCRIPT_PATH="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "${BASH_SOURCE[0]}")"
SCRIPT_DIR="${SCRIPT_PATH%/*}"
OPERATOR_ENTRY="$SCRIPT_DIR/operator-entry.js"
OPERATOR_ENTRY_REAL="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "$OPERATOR_ENTRY" 2>/dev/null || true)"
if [[ -z "$OPERATOR_ENTRY_REAL" || "$OPERATOR_ENTRY_REAL" != "$OPERATOR_ENTRY" || ! -f "$OPERATOR_ENTRY" ]]; then
  echo "Trusted workspace operator entry could not be resolved." >&2
  exit 1
fi

if [ -x "$HOME/.nvm/versions/node/v24.14.1/bin/node" ]; then
  NODE_BIN="$HOME/.nvm/versions/node/v24.14.1/bin/node"
else
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
NODE_BIN="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "$NODE_BIN" 2>/dev/null || true)"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]] || ! check_node_range "$NODE_BIN"; then
  echo "Node ${REQUIRED_NODE_RANGE} is required before the operator can start." >&2
  exit 1
fi

cd "$SCRIPT_DIR"
exec /usr/bin/env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  USER="${USER:-operator}" \
  LOGNAME="${LOGNAME:-${USER:-operator}}" \
  SHELL="${SHELL:-/bin/bash}" \
  TERM="${TERM:-dumb}" \
  TMPDIR="${TMPDIR:-/tmp}" \
  LANG="${LANG:-C}" \
  NODE_ENV="production" \
  HERMES_HOME="$HOME/.hermes" \
  CLAUDE_HOME="$HOME/.hermes" \
  HERMES_WORKSPACE_DIR="$SCRIPT_DIR" \
  HERMES_API_URL="http://127.0.0.1:8642" \
  KNOWLEDGE_DIR="$HOME/2nd Brain/2nd Brain" \
  OBSIDIAN_VAULT="$HOME/2nd Brain/2nd Brain" \
  HOST="127.0.0.1" \
  PORT="3000" \
  "$NODE_BIN" "$OPERATOR_ENTRY"
