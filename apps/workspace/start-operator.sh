#!/usr/bin/env bash
# Launch the Hermes Workspace operator console against the local gateway.
# Reads the gateway API key from ~/.hermes/.env (no secret hardcoded here).
# Needs Node >=22 (uses nvm v24 if present). Gateway must be running on :8642
# (launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway).
set -euo pipefail

if [ -d "$HOME/.nvm/versions/node/v24.14.1/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
fi

KEY="$(grep -E '^API_SERVER_KEY=' "$HOME/.hermes/.env" | head -1 | cut -d= -f2-)"
if [ -z "${KEY:-}" ]; then
  echo "API_SERVER_KEY not found in ~/.hermes/.env — start the gateway / set the key first." >&2
  exit 1
fi

cd "$(dirname "$0")"
# Both tokens point at the same gateway key: HERMES_API_TOKEN auths /v1/*,
# HERMES_DASHBOARD_TOKEN auths the /api/sessions (dashboard) path.
exec env \
  HERMES_API_URL="http://127.0.0.1:8642" \
  HERMES_API_TOKEN="$KEY" \
  HERMES_DASHBOARD_TOKEN="$KEY" \
  CLAUDE_DASHBOARD_TOKEN="$KEY" \
  HOST="127.0.0.1" \
  PORT="3000" \
  node server-entry.js
