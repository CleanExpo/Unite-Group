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
# Instead: inherit the caller's Node and REFUSE if it does not satisfy the
# declared range. A check that silently measures the wrong runtime is worse
# than no check.
#
# The parse is END-ANCHORED and FAILS CLOSED. A previous version scraped the
# first `>=<digits>` fragment it could find anywhere in the string, so a
# malformed `engines.node` such as 'malformed-range >=22 ???' yielded "22" and
# then happily authorised a Node 22 run. An independent review demonstrated
# that bypass. A declaration this script cannot fully parse is now a refusal,
# never a permission — and the whole range is enforced, not just the major, so
# 24.0.0 no longer satisfies '>=24.14.1 <25'.
#
# Exit codes: 80 malformed/absent declaration, 81 no node, 82 version outside
# the declared range, 83 unparseable running version.

# node_range_check <spec> <running-version>  -- pure, argv-only, no file access,
# which is what makes the selfcheck table below possible without touching a
# real package.json.
node_range_check() {
  python3 - "$1" "$2" <<'PY'
import re, sys

spec = (sys.argv[1] or "").strip()
running = (sys.argv[2] or "").strip()

# Only the exact shape this repo declares is accepted. Anything else refuses.
m = re.fullmatch(r">=\s*(\d+)\.(\d+)\.(\d+)\s+<\s*(\d+)", spec)
if not m:
    print(f"FAIL: engines.node is absent or not a form this check accepts: {spec!r}")
    print("      Expected exactly '>=A.B.C <D'. A declaration that cannot be")
    print("      parsed is a refusal, not a permission.")
    sys.exit(80)

lo = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
hi = int(m.group(4))

r = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", running)
if not r:
    print(f"FAIL: could not parse the running node version: {running!r}")
    sys.exit(83)
cur = (int(r.group(1)), int(r.group(2)), int(r.group(3)))

lo_s = ".".join(map(str, lo))
cur_s = ".".join(map(str, cur))
if cur < lo or cur[0] >= hi:
    print(f"FAIL: wrong runtime. engines.node declares >={lo_s} <{hi}, this host runs {cur_s}.")
    print("      Refusing to measure: evidence from the wrong runtime is not evidence.")
    print(f"      Put a satisfying Node on PATH (e.g. nvm use {lo[0]}) and re-run.")
    sys.exit(82)

print(f"runtime OK: node {cur_s} satisfies declared >={lo_s} <{hi}")
PY
}

require_declared_node() {
  local spec running out rc
  spec="$(python3 - <<'PY'
import json, pathlib
try:
    d = json.loads(pathlib.Path('package.json').read_text())
except Exception:
    print(''); raise SystemExit
v = d.get('engines', {}).get('node', '')
print(v if isinstance(v, str) else '')
PY
)"
  if ! command -v node >/dev/null 2>&1; then
    echo "FAIL: no node on PATH"
    return 81
  fi
  running="$(node -p 'process.versions.node' 2>/dev/null)"
  out="$(node_range_check "$spec" "$running")"; rc=$?
  printf '%s\n' "$out"
  return $rc
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

  selfcheck)
    # Proves the runtime guard FAILS CLOSED. Every row is an argv-only call, so
    # nothing here mutates package.json. Row 3 is the exact bypass an
    # independent review demonstrated against the previous implementation.
    fails=0
    check_row() {
      local desc="$1" spec="$2" running="$3" want="$4" got
      node_range_check "$spec" "$running" >/dev/null 2>&1; got=$?
      if [ "$got" = "$want" ]; then
        printf '  ok   %-46s want=%s got=%s\n' "$desc" "$want" "$got"
      else
        printf '  FAIL %-46s want=%s got=%s\n' "$desc" "$want" "$got"
        fails=$((fails + 1))
      fi
    }

    echo "runtime-guard control table (0=allow, 80=malformed, 81=no node, 82=range, 83=bad version)"
    check_row "declared range, satisfying version"   ">=24.14.1 <25" "24.14.1"  0
    check_row "declared range, newer patch"          ">=24.14.1 <25" "24.20.0"  0
    check_row "REVIEWER BYPASS: malformed with >=22" "malformed-range >=22 ???" "22.22.3" 80
    check_row "wrong major (22)"                     ">=24.14.1 <25" "22.22.3" 82
    check_row "above the exclusive upper bound"      ">=24.14.1 <25" "25.0.0"  82
    check_row "below the declared minimum patch"     ">=24.14.1 <25" "24.0.0"  82
    check_row "empty declaration"                    ""              "24.14.1" 80
    check_row "malformed 'v24-lts'"                  "v24-lts"       "24.14.1" 80
    check_row "major-only declaration is refused"    ">=24"          "24.14.1" 80
    check_row "trailing junk after a valid range"    ">=24.14.1 <25 ???" "24.14.1" 80
    check_row "unparseable running version"          ">=24.14.1 <25" "not-a-version" 83

    if [ "$fails" -ne 0 ]; then
      echo "FAIL(selfcheck): $fails row(s) did not fail closed"
      exit 1
    fi
    echo "PASS(selfcheck): the runtime guard fails closed on every malformed declaration"
    exit 0
    ;;

  *)
    echo "usage: $0 {positive|mutant|typecheck|lint|selfcheck}"
    exit 64
    ;;
esac
