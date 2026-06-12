#!/usr/bin/env bash
# Drive vibetest-mcp via a stdio JSON-RPC probe. On success: print "ok ..." + exit 0.
# Reads GOOGLE_API_KEY from the MCP entry in ~/.claude.json (never asks the user).
# Per [[feedback-secrets-handling]] — no key paste, no echo of the key.
set -euo pipefail

PREVIEW_URL="${PREVIEW_URL:-https://unite-group.in}"
CLAUDE_JSON="$HOME/.claude.json"

BIN=$(jq -r '.mcpServers.vibetest.command' "$CLAUDE_JSON")
GOOGLE_API_KEY=$(jq -r '.mcpServers.vibetest.env.GOOGLE_API_KEY' "$CLAUDE_JSON")
export GOOGLE_API_KEY

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}'
INITD='{"jsonrpc":"2.0","method":"notifications/initialized"}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Full handshake: initialize → wait → notifications/initialized → tools/list → wait → close.
# Use perl alarm() for hard timeout since macOS has no GNU `timeout`.
OUT=$(
  (
    printf '%s\n' "$INIT"
    sleep 2
    printf '%s\n' "$INITD"
    sleep 1
    printf '%s\n' "$LIST"
    sleep 3
  ) | perl -e 'alarm 15; exec @ARGV' "$BIN" 2>/dev/null || true
)

# Probe 1: initialize response (id=1) shows correct serverInfo.name
echo "$OUT" | grep -E '"id":1' | head -1 | jq -e '.result.serverInfo.name == "vibetest"' >/dev/null \
  || { echo "fail: initialize handshake"; exit 1; }

# Probe 2: tools/list response (id=2) returns at least one tool entry
TOOL_COUNT=$(echo "$OUT" | grep -E '"id":2' | head -1 | jq -r '.result.tools | length' 2>/dev/null || echo 0)
[ "${TOOL_COUNT:-0}" -gt 0 ] \
  || { echo "fail: tools/list empty"; exit 1; }

echo "ok preview=$PREVIEW_URL tools=$TOOL_COUNT"
