#!/usr/bin/env bash
# Proves the identity guard on the file the founder PASTES INTO PRODUCTION:
#   docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql
#
# THE DEFECT THIS EXISTS FOR. Two independent cross-agent reviews (codex,
# 19/08/2026) and a concurrent session each reproduced the same thing by
# different routes: run the apply file against a fresh EMPTY database under
# ON_ERROR_STOP=1 and it revoked on 0 functions, found both dated tables absent,
# printed "post-condition OK", COMMITted and exited 0. Pasted into the wrong
# project — the exact operator error this class of guard exists to catch — it
# read as a clean success.
#
# The old post-condition could not have caught it. It counted violations among
# the hooks that EXIST, so an absent hook contributes zero violations and the
# total is satisfied trivially. Absence of a violation is not presence of the
# fix. The guard therefore checks the OBJECT SET before any mutation.
#
# Usage: scripts/ship-gates/prove-apply-identity.sh "<postgres-admin-uri>"
#
# Exits 0 only if ALL of the following hold:
#   1. EMPTY database        -> the apply ABORTS, naming its own identity guard
#   2. PARTIAL database (1/4)-> the apply ABORTS, naming its own identity guard
#   3. COMPLETE database(4/4)-> the apply is ALLOWED PAST the guard
#   3b. FOUR OVERLOADS of ONE name -> REFUSED (identities, not row counts)
#   4. MUTATION CONTROL: with the guard block removed, case 1 COMMITS again.
#      Without 4, cases 1-2 could be passing because of some unrelated error and
#      this gate would be certifying a guard that never ran.
#
# Nothing here touches a database it did not create: names carry a random
# suffix and the gate REFUSES a name that already exists rather than dropping it.
set -uo pipefail

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pgprobe.sh
. "$HERE/lib/pgprobe.sh"

ADMIN="${1:-}"
if [[ -z "$ADMIN" ]]; then
  echo "usage: $0 \"<postgres-admin-uri>\"" >&2
  exit 2
fi
command -v psql >/dev/null 2>&1 || { echo "cannot run: psql not on PATH" >&2; exit 2; }

REPO="$(cd -- "$HERE/../.." && pwd)"
APPLY="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql"
[[ -f "$APPLY" ]] || { echo "cannot run: apply file not found at $APPLY" >&2; exit 2; }

GUARD_TEXT='apply aborted: this file expects all 4 privileged functions'

WORK="$(mktemp -d)"
# The register of databases to drop is a FILE, not an array, and that is the whole
# point. `newdb` is called as `X="$(newdb foo)"` so its body runs in a COMMAND
# SUBSTITUTION SUBSHELL: an array append there mutates a copy the parent never sees,
# so cleanup iterated an empty array and every database this gate created survived it.
# An independent review (openrouter, 19/08/2026) reported it and a catalog query found
# 37 leaked databases on the local cluster. A write to a file crosses the subshell
# boundary; an array assignment does not.
DBS_FILE="$WORK/created-databases"
: > "$DBS_FILE"
cleanup() {
  local d _failed=0
  while IFS= read -r d; do
    [[ -n "$d" ]] || continue
    if ! psql "$ADMIN" -X -q -c "DROP DATABASE IF EXISTS ${d} WITH (FORCE)" >/dev/null 2>&1; then
      # ANNOUNCE, do not swallow. An earlier revision suppressed every DROP failure and
      # then removed $WORK — and with it the ONLY record of what was created — so a
      # transient connection or privilege error leaked a database silently while the
      # gate still exited 0. Reported by an independent review (openrouter, 19/08/2026).
      echo "WARNING: could not drop scratch database ${d} — it is LEAKED." >&2
      _failed=1
    fi
  done < "$DBS_FILE"
  if [[ $_failed -eq 1 ]]; then
    echo "WARNING: the list of databases this run created is kept at ${DBS_FILE} for retry; $WORK was NOT removed." >&2
    return 1
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() { echo "FAIL  prove-apply-identity: $1"; exit 1; }

newdb() { # newdb <prefix> -> echoes the uri, records the name for cleanup
  pg_make_disposable_db "$ADMIN" "$1" || exit 2
  printf '%s\n' "$DISPOSABLE_DB" >> "$DBS_FILE"
  echo "$DISPOSABLE_URI"
}

# Creates N of the four target functions in public, N in 0..4, in a fixed order.
seed_functions() {
  local uri="$1" n="$2" i=0
  local -a fns=(custom_access_token_hook before_user_created_hook prune_integration_history get_my_org_ids)
  for ((i=0; i<n; i++)); do
    pg_exec "$uri" "$WORK/err" \
      "CREATE FUNCTION public.${fns[$i]}() RETURNS void LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT NULL::void \$fn\$" \
      || fail "could not seed ${fns[$i]}"
  done
}

run_apply() { # run_apply <uri> <file> -> writes stdout/stderr, returns psql status
  psql "$1" -X -q -v ON_ERROR_STOP=1 -f "$2" >"$WORK/out" 2>"$WORK/err"
}

# ── 1. EMPTY database must abort ─────────────────────────────────────────────
EMPTY="$(newdb applyid_empty)"
if run_apply "$EMPTY" "$APPLY"; then
  fail "the apply COMMITTED against an EMPTY database (psql exit 0). Pasted into the wrong project this reads as a clean success."
fi
grep -qF "$GUARD_TEXT" "$WORK/err" \
  || fail "the apply failed on the empty database, but NOT on its identity guard — the abort may be incidental, so the guard is unproven. stderr: $(head -3 "$WORK/err")"
echo "  case 1  empty database        -> aborted on the identity guard"

# ── 2. PARTIAL database (1 of 4) must abort ──────────────────────────────────
PARTIAL="$(newdb applyid_partial)"
seed_functions "$PARTIAL" 1
if run_apply "$PARTIAL" "$APPLY"; then
  fail "the apply COMMITTED against a database holding only 1 of its 4 target functions. A partial match is a name collision, not this project."
fi
grep -qF "$GUARD_TEXT" "$WORK/err" \
  || fail "the apply failed on the 1-of-4 database, but NOT on its identity guard. stderr: $(head -3 "$WORK/err")"
echo "  case 2  partial database 1/4  -> aborted on the identity guard"

# ── 3. COMPLETE database must be allowed PAST the guard ──────────────────────
# The apply may still fail later for unrelated reasons in this synthetic
# database; what must NOT happen is the identity guard rejecting a database that
# holds all four functions. A guard that rejects everything proves nothing.
COMPLETE="$(newdb applyid_complete)"
seed_functions "$COMPLETE" 4
run_apply "$COMPLETE" "$APPLY"
if grep -qF "$GUARD_TEXT" "$WORK/err"; then
  fail "the identity guard REJECTED a database holding all 4 target functions. The guard is over-firing and would block the real production apply. stderr: $(head -3 "$WORK/err")"
fi
# psql routes RAISE NOTICE to stderr, not stdout — read it where it actually lands.
grep -q 'apply identity guard: all 4 target functions present' "$WORK/err" \
  || fail "the apply did not report passing its identity guard on a complete database, so case 3 proves nothing. stderr: $(head -3 "$WORK/err")"
echo "  case 3  complete database 4/4 -> allowed past the identity guard"

# ── 3b. OVERLOADS MUST NOT SATISFY THE GUARD ─────────────────────────────────
# The guard used to `count(*)`, which counts ROWS. Four OVERLOADS of one name and
# none of the other three satisfied "= 4" and were admitted as this project — found
# by an independent review (openrouter, 19/08/2026). The name-driven revoke loops
# would then have stripped privileges from four unrelated functions and committed.
# It now counts DISTINCT names, so this database must be refused.
OVERLOAD="$(newdb applyid_overload)"
for _sig in "a int" "a text" "a bool" "a numeric"; do
  pg_exec "$OVERLOAD" "$WORK/err" \
    "CREATE FUNCTION public.custom_access_token_hook(${_sig}) RETURNS void LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT NULL::void \$fn\$" \
    || fail "could not seed the overload fixture (${_sig})"
done
if run_apply "$OVERLOAD" "$APPLY"; then
  fail "the apply COMMITTED against a database holding FOUR OVERLOADS of one name and none of the other three. Overloads are not identities — this is the wrong-project hazard the guard exists to close."
fi
grep -qF "$GUARD_TEXT" "$WORK/err" \
  || fail "the overload database was refused, but NOT by the identity guard. stderr: $(head -3 "$WORK/err")"
echo "  case 3b overloads of one name -> refused (counts DISTINCT names, not rows)"

# ── 4. MUTATION CONTROL: remove the guard, case 1 must COMMIT again ──────────
# Without this, cases 1-2 could be green because of any unrelated error.
MUTANT="$WORK/apply-no-guard.sql"
# The range STOPS at block 0b, not at block 1-3. An independent review (openrouter,
# 19/08/2026) found the earlier range ran to "1-3, 7:" and therefore deleted the
# pre-state receipt block TOO — including its own independent empty-receipt refusal.
# That mutant removed TWO guards, so a commit could not be attributed to the identity
# guard being absent, and case 4 was certifying a guard it had not isolated. One mutant,
# one guard: anything else proves only that SOME line mattered.
awk '
  /^-- ── 0: IDENTITY GUARD/ { skipping = 1 }
  skipping && /^-- ── 0b: PRE-STATE RECEIPT/ { skipping = 0 }
  !skipping { print }
' "$APPLY" >"$MUTANT"

# Prove the mutant is the INTENDED one: the receipt block must survive it, or the
# control has silently widened again.
grep -q 'PRE-STATE RECEIPT' "$MUTANT" \
  || fail "mutation control is too coarse: the pre-state receipt block was deleted along with the identity guard, so a commit could not be attributed to the guard alone."

if grep -qF "$GUARD_TEXT" "$MUTANT"; then
  fail "mutation control could not be built: the identity guard is still present in the mutant, so the control would be vacuous."
fi

# ATTRIBUTION, NOT COMMIT. The narrow mutant revealed something the coarse one hid:
# the empty database is refused by TWO independent guards — the identity guard, and the
# receipt block's own "captured 0 rows" refusal. That is defence in depth and it is
# correct, so demanding a COMMIT here would be demanding the second guard be absent too,
# which is what the over-wide range was silently doing.
#
# What case 4 must actually establish is ATTRIBUTION: that the message cases 1-2 matched
# was produced BY the identity guard. Remove that guard and its distinctive text must
# vanish — whatever else still refuses the database.
MUTDB="$(newdb applyid_mutant)"
run_apply "$MUTDB" "$MUTANT"
if grep -qF "$GUARD_TEXT" "$WORK/err"; then
  fail "MUTATION CONTROL FAILED: the identity guard was deleted from the mutant, yet its message still appeared. Cases 1-2 are therefore NOT attributable to it — something else emits that text, and this gate would be certifying a guard that never ran."
fi
if grep -q 'pre-state receipt captured 0 rows' "$WORK/err"; then
  echo "  case 4  guard removed         -> its message is GONE; the receipt guard still refuses (attributed, defence in depth)"
else
  echo "  case 4  guard removed         -> its message is GONE (attributed)"
fi
echo "PASS  prove-apply-identity"
echo "  the production apply file refuses an empty or partial database before mutating anything,"
echo "  admits a complete one, and the refusal is attributable to the identity guard by mutation."
