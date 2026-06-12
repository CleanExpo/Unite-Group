#!/bin/bash
# 2nd Brain auto-commit — nightly snapshot to github.com/CleanExpo/brain-1
# Per Phill 2026-05-15 directive (Option 1 from 2nd Brain GitHub question).
# Runs via LaunchAgent ai.pidev.brain-1-autocommit.plist at 03:33 AEST daily.

set -e

REPO="$HOME/2nd Brain"
LOG="/tmp/brain-1-autocommit.log"

cd "$REPO" || { echo "[$(date)] FATAL: cannot cd $REPO" >> "$LOG"; exit 1; }

# Only commit if there are real changes
if [ -z "$(git status --porcelain)" ]; then
  echo "[$(date)] no changes, skip" >> "$LOG"
  exit 0
fi

# Stage everything (gitignore filters .obsidian/workspace + .tmp* + .DS_Store)
git add -A

# Count what's changed
ADDED=$(git diff --cached --diff-filter=A --name-only | wc -l | tr -d ' ')
MODIFIED=$(git diff --cached --diff-filter=M --name-only | wc -l | tr -d ' ')
DELETED=$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')

# Commit
TS=$(date +"%Y-%m-%d %H:%M %Z")
git -c commit.gpgsign=false commit -q -m "auto: nightly snapshot ${TS} (+${ADDED} ~${MODIFIED} -${DELETED})

Auto-committed by ai.pidev.brain-1-autocommit LaunchAgent.
Run /Users/phill-mac/2nd\ Brain/.scripts/brain-1-autocommit.sh manually to commit on-demand.
"

# Push
if git push origin main >> "$LOG" 2>&1; then
  echo "[$(date)] OK: pushed +${ADDED} ~${MODIFIED} -${DELETED}" >> "$LOG"
else
  echo "[$(date)] FAIL: push failed (commit landed locally)" >> "$LOG"
  exit 2
fi
