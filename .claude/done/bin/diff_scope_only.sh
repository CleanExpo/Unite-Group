#!/bin/bash
# Done criterion helper: PASS only when the tree is clean and every file changed
# between BASE and HEAD is in the allowed list.
# Usage: diff_scope_only.sh <base-sha> <allowed-path>...
set -u
BASE=${1:?base sha}; shift
[ $# -gt 0 ] || { echo "FAIL: no allowed paths given"; exit 2; }
git diff --quiet HEAD || { echo "FAIL: uncommitted changes"; exit 1; }
CHANGED=$(git diff --name-only "$BASE" HEAD) || { echo "FAIL: git diff failed"; exit 2; }
[ -n "$CHANGED" ] || { echo "FAIL: no change against $BASE"; exit 1; }
bad=0
while IFS= read -r f; do
  ok=0
  for a in "$@"; do [ "$f" = "$a" ] && ok=1; done
  if [ $ok -eq 1 ]; then echo "in scope: $f"; else echo "OUT OF SCOPE: $f"; bad=1; fi
done <<< "$CHANGED"
[ $bad -eq 0 ] && { echo PASS; exit 0; }
echo FAIL; exit 1
