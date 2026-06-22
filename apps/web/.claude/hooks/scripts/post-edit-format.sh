#!/usr/bin/env bash
# Auto-formats files after Edit/Write operations.
# Bash equivalent of post-edit-format.ps1

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    pass
" 2>/dev/null)

[ -z "$FILE" ] || [ ! -f "$FILE" ] && exit 0

# Skip generated/vendored paths
case "$FILE" in
  *node_modules*|*/.next/*|*/dist/*|*/build/*|*/.git/*|*/coverage/*)
    exit 0 ;;
esac

# Skip generated file types
BASENAME=$(basename "$FILE")
case "$BASENAME" in
  *.min.js|*.min.css|*-lock.*|*.lock|package-lock.json|pnpm-lock.yaml|yarn.lock|*.map|*.d.ts)
    exit 0 ;;
esac

EXT="${FILE##*.}"
case "$EXT" in
  ts|tsx|js|jsx|mjs|cjs|json|md|mdx|css|scss|sass|less|html|htm|yml|yaml)
    cd "$(dirname "$FILE")" 2>/dev/null || true
    npx --no prettier --write "$FILE" 2>/dev/null && echo "Formatted: $BASENAME"
    ;;
  py)
    command -v ruff >/dev/null 2>&1 && ruff format "$FILE" 2>/dev/null \
      || command -v black >/dev/null 2>&1 && black "$FILE" 2>/dev/null
    ;;
esac
exit 0
