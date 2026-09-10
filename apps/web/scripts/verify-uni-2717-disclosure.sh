#!/usr/bin/env bash
# verify-uni-2717-disclosure.sh — the UNI-2717 slice-1 definition-of-done verifier.
#
# Modes:
#   positive   the disclosure guard passes for every exported channel
#   mutant     FALSIFICATION PROOF: with the disclosure dropped from the module's one
#              chokepoint, the guard FAILS, and fails on the disclosure assertion BY NAME
#              rather than on some unrelated runtime throw. Restores the file afterwards
#              and verifies the restore by digest.
#   typecheck  tsc --noEmit is clean
#   lint       eslint is clean over the new module
#
# Design rules this script obeys, each learned from a real defect:
#   * A failed MEASUREMENT must never be able to return a value. If vitest itself does
#     not run, that is UNMEASURED and exits non-zero — never "mutant caught".
#   * The mutation is applied to the file the TEST IMPORTS, not a neighbouring copy.
#   * The mutant must be observed to have actually changed the file before we believe
#     anything about the run that follows.
#   * Everything the mutant can write is backed up and digest-verified on restore.

set -uo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WEB_DIR" || { echo "FAIL: cannot cd to apps/web"; exit 90; }

SRC="src/lib/margot/publish-templates.ts"
TEST="src/lib/margot/__tests__/publish-templates.test.ts"
BACKUP="$(mktemp -t uni2717src)"
# The exact assertion message the guard emits when a body loses the disclosure.
EXPECTED_MSG="missing the disclosure marker"

# The runtime is NOT pinned here on purpose. An earlier version of this script
# prepended a hard-coded Node 22 path, which meant it measured on a runtime the
# release does not ship on and would have kept doing so even on a correct host.
# Instead: inherit the caller's Node and REFUSE if it is not the declared one.
# A check that silently measures the wrong runtime is worse than no check.
require_declared_node() {
  local declared running
  declared="$(python3 - <<'PY'
import json, pathlib, re
spec = json.loads(pathlib.Path('package.json').read_text()).get('engines', {}).get('node', '')
m = re.search(r'>=\s*(\d+)', spec)
print(m.group(1) if m else '')
PY
)"
  if [ -z "$declared" ]; then
    echo "FAIL: could not read engines.node from apps/web/package.json"
    return 80
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "FAIL: no node on PATH"
    return 81
  fi
  running="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$running" != "$declared" ]; then
    echo "FAIL: wrong runtime. engines.node declares major $declared, this host runs $running."
    echo "      Refusing to measure: evidence from the wrong runtime is not evidence."
    echo "      Put the declared Node major on PATH (e.g. nvm use $declared) and re-run."
    return 82
  fi
  echo "runtime OK: node major $running matches declared >=$declared"
  return 0
}

digest() { python3 -c "
import hashlib,sys
print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())
" "$1"; }

run_guard() {
  # Prints combined output; returns vitest's exit code.
  ./node_modules/.bin/vitest run "$TEST" --reporter=basic 2>&1
}

require_measured() {
  # $1 = captured output. Proves the runner actually ran, so a null result cannot pass.
  local out="$1"
  if ! printf '%s' "$out" | grep -qE 'Test Files|Tests |publish-templates'; then
    echo "UNMEASURED: vitest produced no recognisable report — this is not a pass and not a catch."
    printf '%s\n' "$out" | tail -20
    return 1
  fi
  return 0
}

case "${1:-}" in
  positive|mutant|typecheck|lint)
    require_declared_node || exit $?
    ;;
esac

case "${1:-}" in

  positive)
    [ -f "$SRC" ]  || { echo "FAIL: $SRC missing"; exit 91; }
    [ -f "$TEST" ] || { echo "FAIL: $TEST missing"; exit 91; }
    OUT="$(run_guard)"; RC=$?
    require_measured "$OUT" || exit 92
    if [ "$RC" -ne 0 ]; then
      echo "FAIL: the disclosure guard does not pass on unmutated source (exit $RC)"
      printf '%s\n' "$OUT" | tail -30
      exit 1
    fi
    printf '%s\n' "$OUT" | grep -E 'Test Files|Tests ' | head -4
    echo "PASS(positive): disclosure present for every exported channel"
    exit 0
    ;;

  mutant)
    [ -f "$SRC" ] || { echo "FAIL: $SRC missing"; exit 91; }
    BEFORE="$(digest "$SRC")"
    cp "$SRC" "$BACKUP" || { echo "FAIL: could not back up $SRC"; exit 93; }

    restore() {
      cp "$BACKUP" "$SRC" 2>/dev/null
      local after; after="$(digest "$SRC")"
      rm -f "$BACKUP"
      if [ "$after" != "$BEFORE" ]; then
        echo "FAIL: $SRC was NOT restored byte-identical (before=$BEFORE after=$after)"
        return 94
      fi
      return 0
    }

    # Apply the mutation: drop the disclosure inside compose(), the one chokepoint.
    python3 - "$SRC" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
s = p.read_text()
edits = [
    ("if (limit === null) return `${lead}\\n\\n${disclosure}`",
     "if (limit === null) return lead"),
    ("return `${trimmedLead}${separator}${disclosure}`",
     "return trimmedLead"),
    ("    return disclosure\n",
     "    return ''\n"),
]
for old, new in edits:
    n = s.count(old)
    if n != 1:
        sys.stderr.write(f"MUTANT-ANCHOR-ERROR: {n} matches for {old!r}\n")
        sys.exit(2)
    s = s.replace(old, new)
p.write_text(s)
print("mutant applied: disclosure dropped from compose()")
PY
    if [ $? -ne 0 ]; then
      echo "FAIL: mutant could not be applied — anchors did not match exactly once."
      restore; exit 95
    fi

    # Positive control ON THE MUTATION ITSELF: the file must actually differ now.
    MUT="$(digest "$SRC")"
    if [ "$MUT" = "$BEFORE" ]; then
      echo "FAIL: mutant did not change the file — nothing was tested."
      restore; exit 96
    fi
    echo "mutant digest differs from original: OK"

    OUT="$(run_guard)"; RC=$?

    if ! require_measured "$OUT"; then
      restore; exit 92
    fi

    if [ "$RC" -eq 0 ]; then
      echo "FAIL: the guard PASSED with the disclosure removed. It cannot detect the defect."
      restore; exit 1
    fi

    if ! printf '%s' "$OUT" | grep -q "$EXPECTED_MSG"; then
      echo "FAIL: guard failed (exit $RC) but NOT on the disclosure assertion."
      echo "       expected message: $EXPECTED_MSG"
      echo "       a failure for the wrong reason does not prove this control works."
      printf '%s\n' "$OUT" | tail -25
      restore; exit 97
    fi

    echo "mutant was caught, on the expected assertion: \"$EXPECTED_MSG\""
    restore || exit 94
    echo "source restored byte-identical (sha256 $BEFORE)"
    echo "PASS(mutant): removing the disclosure turns the guard RED"
    exit 0
    ;;

  typecheck)
    ./node_modules/.bin/tsc --noEmit > /tmp/uni2717_tsc.log 2>&1
    RC=$?
    if [ "$RC" -ne 0 ]; then
      echo "FAIL: tsc --noEmit exit $RC"
      grep -E 'src/lib/margot' /tmp/uni2717_tsc.log | head -20
      echo "--- first 15 errors overall ---"
      head -15 /tmp/uni2717_tsc.log
      exit 1
    fi
    echo "PASS(typecheck): tsc --noEmit clean"
    exit 0
    ;;

  lint)
    ./node_modules/.bin/eslint src/lib/margot --max-warnings 0
    RC=$?
    if [ "$RC" -ne 0 ]; then echo "FAIL: eslint exit $RC"; exit 1; fi
    echo "PASS(lint): eslint clean over src/lib/margot"
    exit 0
    ;;

  *)
    echo "usage: $0 {positive|mutant|typecheck|lint}"
    exit 64
    ;;
esac
