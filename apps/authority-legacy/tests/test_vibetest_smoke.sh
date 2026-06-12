#!/usr/bin/env bash
# Wave-1 Task 1 smoke test — verify vibetest MCP is registered, binary executes,
# and `claude mcp list` reports vibetest as ✓ Connected.
set -euo pipefail

REPO_ROOT="/Users/phill-mac/pi-seo-workspace/unite-group"
SMOKE="$REPO_ROOT/scripts/vibetest_smoke.sh"

# Gate 1: smoke script exists + is executable
[ -x "$SMOKE" ] || { echo "FAIL: $SMOKE missing or not executable"; exit 1; }

# Gate 2: ~/.claude.json contains vibetest with GOOGLE_API_KEY env
jq -e '.mcpServers.vibetest.env.GOOGLE_API_KEY | length > 30' "$HOME/.claude.json" >/dev/null \
  || { echo "FAIL: vibetest GOOGLE_API_KEY missing or stub in ~/.claude.json"; exit 1; }

# Gate 3: binary referenced in config actually exists + is executable
BIN=$(jq -r '.mcpServers.vibetest.command' "$HOME/.claude.json")
[ -x "$BIN" ] || { echo "FAIL: vibetest-mcp binary not executable at $BIN"; exit 1; }

# Gate 4: `claude mcp list` shows vibetest ✓ Connected
claude mcp list 2>&1 | grep -E '^vibetest:.*Connected' >/dev/null \
  || { echo "FAIL: claude mcp list does not report vibetest ✓ Connected"; exit 1; }

# Gate 5: smoke script exits 0 against the default preview URL
bash "$SMOKE" \
  || { echo "FAIL: vibetest_smoke.sh non-zero exit"; exit 1; }

echo "PASS: vibetest MCP smoke test"
