#!/usr/bin/env bash
# Injects compass.md as additionalContext before every user prompt.
# Bash equivalent of user-prompt-compass.ps1

COMPASS="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/memory/compass.md"

if [ ! -f "$COMPASS" ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":""}}'
  exit 0
fi

python3 -c "
import json, sys
content = open(sys.argv[1]).read().strip()
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': f'COMPASS: {content}'}}))
" "$COMPASS"
exit 0
