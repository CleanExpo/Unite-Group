#!/usr/bin/env bash
# Injects git status, recent commits, and CONSTITUTION.md at session start.
# Bash equivalent of session-start-context.ps1

PARTS=()

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [ "$CHANGES" -gt 0 ]; then
  PARTS+=("GIT: Branch '$BRANCH' with $CHANGES uncommitted changes")
else
  PARTS+=("GIT: Branch '$BRANCH' (clean)")
fi

COMMITS=$(git log --oneline -3 2>/dev/null | tr '\n' ',' | sed 's/,$//')
[ -n "$COMMITS" ] && PARTS+=("RECENT COMMITS: $COMMITS")

CONST="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/memory/CONSTITUTION.md"
if [ -f "$CONST" ]; then
  CONST_CONTENT=$(head -c 800 "$CONST" | tr '\n' ' ')
  PARTS+=("SESSION CONSTITUTION (apps/web): $CONST_CONTENT")
fi

# The BINDING constitution is EPIC-000 at the monorepo root, not the apps/web
# session memory file above. Resolve it from the git toplevel so it loads whether
# the hook runs from apps/web or the repo root. Skip the provenance preamble and
# inject from the governing position onwards — that is the operative text.
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
EPIC000="${REPO_ROOT}/docs/constitution/EPIC-000-nexus-engineering-constitution.md"
if [ -n "$REPO_ROOT" ] && [ -f "$EPIC000" ]; then
  EPIC000_CONTENT=$(sed -n '/^## 1\. Governing Position/,$p' "$EPIC000" | head -c 1200 | tr '\n' ' ')
  [ -n "$EPIC000_CONTENT" ] && PARTS+=("BINDING CONSTITUTION (EPIC-000, docs/constitution/): $EPIC000_CONTENT")
fi

PARTS+=("LOCALE: en-AU (DD/MM/YYYY, AUD, AEST/AEDT)")

CONTEXT=$(printf '%s | ' "${PARTS[@]}" | sed 's/ | $//')

python3 -c "
import json, sys
ctx = sys.argv[1]
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'SessionStart', 'additionalContext': f'SESSION CONTEXT: {ctx}'}}))
" "$CONTEXT"
exit 0
