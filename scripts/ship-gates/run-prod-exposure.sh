#!/usr/bin/env bash
# Runnable wrapper for the production exposure gate.
#
# prod-exposure.sql states its contract in prose — "every query MUST return ZERO
# rows" — which makes it an assertion a human has to eyeball, not a gate. This
# wrapper turns the contract into an exit code so CI, a founder, or a hostile
# auditor gets a verdict rather than a result set.
#
#   usage: run-prod-exposure.sh <postgres-connection-uri>
#   exit 0  no rows        gate PASS
#   exit 1  one or more rows returned    gate FAIL, findings printed
#   exit 2  could not run the gate at all (bad URI, unreachable, psql missing)
#
# Exit 2 is deliberately distinct from exit 1. A gate that cannot connect must
# never be read as a pass — an unreachable database and a clean one both produce
# no rows, and collapsing them is how a false green is manufactured.
set -uo pipefail

GATE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/prod-exposure.sql"

if [[ $# -lt 1 ]]; then
  echo "usage: $(basename "$0") <postgres-connection-uri>" >&2
  exit 2
fi
CONN="$1"

command -v psql >/dev/null 2>&1 || { echo "FAIL(setup): psql not on PATH" >&2; exit 2; }
[[ -f "$GATE" ]] || { echo "FAIL(setup): gate file not found: $GATE" >&2; exit 2; }

# The gate's green is "0 rows". That is indistinguishable from "the query that
# would have found the rows is no longer in the file" — so before trusting a
# green, assert the gate still declares every rule it is supposed to check. A
# future edit that drops a query now fails setup instead of reporting PASS.
EXPECTED_RULES=(
  rls_disabled_in_public
  anon_executable_security_definer
  authenticated_executable_security_definer
)
for _rule in "${EXPECTED_RULES[@]}"; do
  grep -q "'${_rule}' AS rule" "$GATE" || {
    echo "FAIL(setup): $GATE no longer declares the '${_rule}' check." >&2
    echo "  A green from this gate would be meaningless. Restore the query, or" >&2
    echo "  update EXPECTED_RULES here deliberately if the rule was retired." >&2
    exit 2
  }
done

# -X ignore psqlrc, -A unaligned, -t tuples only, -q quiet, -v ON_ERROR_STOP=1
# so a SQL error is an error rather than a silently short result set.
OUT="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d "$CONN" -f "$GATE" 2>&1)"
RC=$?

if [[ $RC -ne 0 ]]; then
  echo "FAIL(setup): gate could not be executed (psql exit $RC)" >&2
  echo "$OUT" >&2
  exit 2
fi

FINDINGS="$(printf '%s\n' "$OUT" | grep -v '^[[:space:]]*$' || true)"

if [[ -z "$FINDINGS" ]]; then
  echo "PASS  prod-exposure: 0 rows across all ${#EXPECTED_RULES[@]} declared queries"
  exit 0
fi

COUNT="$(printf '%s\n' "$FINDINGS" | wc -l | tr -d ' ')"
echo "FAIL  prod-exposure: ${COUNT} row(s) — every row is a live exposure"
printf '%s\n' "$FINDINGS" | sed 's/^/  /'
exit 1
