#!/usr/bin/env bash
# Runnable wrapper for the production exposure gate.
#
# prod-exposure.sql states its contract in prose — "every query MUST return ZERO
# rows" — which makes it an assertion a human has to eyeball, not a gate. This
# wrapper turns the contract into an exit code so CI, a founder, or a hostile
# auditor gets a verdict rather than a result set.
#
#   usage: run-prod-exposure.sh <postgres-uri> [--control <admin-uri-to-a-NON-PROD-cluster>]
#
#   exit 0  no rows, AND every rule was proven able to detect its own defect
#   exit 1  one or more exposure rows returned    gate FAIL, findings printed
#   exit 2  could not run, or the green could not be trusted (see below)
#
# Exit 2 is deliberately distinct from exit 1. A gate that cannot connect must
# never be read as a pass — an unreachable database and a clean one both produce
# no rows, and collapsing them is how a false green is manufactured.
#
# ── WHY --control EXISTS (independent review, codex, 19/08/2026) ─────────────
# An earlier revision guarded the green by asserting prod-exposure.sql still
# DECLARED all three rules. That checks the label, not the behaviour. The
# reviewer kept all three declaration strings and changed every predicate to
# `WHERE false`: the guard accepted it and the wrapper printed
# "PASS ... 0 rows across all 3 declared queries" while two seeded exposures were
# live. A green is only meaningful if the queries can still FIND something, and
# the only honest way to know that is to make them find something.
#
# We cannot seed a defect into production to test the gate. So the positive
# control runs on a throwaway database on a cluster you nominate with --control:
# one exposure per rule is seeded, the real gate file is run, and every rule must
# come back RED. Only then is a green against the real target trusted.
#
# Without --control the wrapper will NOT print PASS. It reports UNVERIFIED and
# exits 2, because "0 rows from queries that may or may not work" is not a pass.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/prod-exposure.sql"

CONN=""
CONTROL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --control) CONTROL="${2:-}"; shift 2 ;;
    -h|--help) echo "usage: $(basename "$0") <postgres-uri> [--control <admin-uri>]"; exit 2 ;;
    *) if [[ -z "$CONN" ]]; then CONN="$1"; shift; else echo "unexpected argument: $1" >&2; exit 2; fi ;;
  esac
done

if [[ -z "$CONN" ]]; then
  echo "usage: $(basename "$0") <postgres-uri> [--control <admin-uri>]" >&2
  exit 2
fi

command -v psql >/dev/null 2>&1 || { echo "FAIL(setup): psql not on PATH" >&2; exit 2; }
[[ -f "$GATE" ]] || { echo "FAIL(setup): gate file not found: $GATE" >&2; exit 2; }

EXPECTED_RULES=(
  rls_disabled_in_public
  anon_executable_security_definer
  authenticated_executable_security_definer
)

# Cheap structural check first — a dropped query should fail before we connect
# anywhere. This is necessary but NOT sufficient; the behavioural control below
# is what actually licenses a green.
for _rule in "${EXPECTED_RULES[@]}"; do
  grep -q "'${_rule}' AS rule" "$GATE" || {
    echo "FAIL(setup): $GATE no longer declares the '${_rule}' check." >&2
    echo "  A green from this gate would be meaningless. Restore the query, or" >&2
    echo "  update EXPECTED_RULES here deliberately if the rule was retired." >&2
    exit 2
  }
done

# ── run the gate, keeping stdout and stderr APART ────────────────────────────
# Merging them made every diagnostic line an "exposure": the reviewer added one
# benign RAISE NOTICE to a clean gate and the wrapper reported it as a live
# finding and exited 1. Founder instructions treat any unexpected row as grounds
# for rollback, so a NOTICE could have sent a break-glass recovery. Rows are rows;
# stderr is diagnostics.
run_gate() { # $1 = uri, $2 = stdout file, $3 = stderr file
  psql -X -A -t -q -v ON_ERROR_STOP=1 -d "$1" -f "$GATE" >"$2" 2>"$3"
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ── behavioural positive control ─────────────────────────────────────────────
CONTROL_VERDICT="NOT RUN"
if [[ -n "$CONTROL" ]]; then
  # Unique per run — see the note in prove-rollback.sh. The old fixed name was
  # force-dropped by this gate even when it held unrelated data.
  CDB="prod_exposure_selftest_$$"
  CBASE="${CONTROL%/*}"
  declare -a CONTROL_DBS=()
  cleanup_control() {
    local _d
    for _d in "${CONTROL_DBS[@]:-}"; do
      [[ -n "$_d" ]] && psql -X -q -d "$CONTROL" -c "DROP DATABASE IF EXISTS $_d (FORCE)" >/dev/null 2>&1 || true
    done
  }
  trap 'cleanup_control; rm -rf "$WORK"' EXIT

  # ── the NON-PROD boundary must be CHECKED, not merely documented ───────────
  # An independent review (codex, 19/08/2026) passed the SAME admin URI as both
  # the target and --control. The wrapper accepted it, created and dropped
  # databases on the production cluster, and reached PASS. The NON-PROD
  # requirement existed only in a comment, and a comment is not a boundary.
  # pg_control_system().system_identifier differs between any two independently
  # initdb'd clusters, so it distinguishes "another database on the same server"
  # from "another server" — which is the distinction that matters, because this
  # control CREATEs and DROPs databases and must never do that on production.
  _tid="$(psql -X -A -t -q -d "$CONN" -c "SELECT system_identifier::text FROM pg_control_system()" 2>/dev/null | tr -d '[:space:]')"
  _cid="$(psql -X -A -t -q -d "$CONTROL" -c "SELECT system_identifier::text FROM pg_control_system()" 2>/dev/null | tr -d '[:space:]')"
  if [[ -z "$_tid" || -z "$_cid" ]]; then
    echo "FAIL(setup): could not read the cluster identity of the target and/or the --control URI." >&2
    echo "  This gate refuses to run a destructive positive control without proving the two are different clusters." >&2
    exit 2
  fi
  if [[ "$_tid" == "$_cid" ]]; then
    echo "FAIL(setup): --control names the SAME CLUSTER as the target (system_identifier ${_tid})." >&2
    echo "  The positive control CREATEs and DROPs databases. Running it against the production cluster is exactly" >&2
    echo "  what the NON-PROD requirement forbids, and a different database on the same server is not a different cluster." >&2
    echo "  Point --control at a separately provisioned Postgres instance." >&2
    exit 2
  fi

  _exists="$(psql -X -A -t -q -d "$CONTROL" -c "SELECT count(*) FROM pg_database WHERE datname LIKE '${CDB}%';" 2>/dev/null | tr -d '[:space:]')"
  if [[ "$_exists" != "0" ]]; then
    echo "FAIL(setup): refusing to run: a database matching ${CDB}% already exists on the --control cluster." >&2
    echo "  This gate only drops databases it created itself; it will not force-drop yours." >&2
    exit 2
  fi

  # ── one defect at a time, each in its OWN database ─────────────────────────
  # An independent review (codex) defeated the earlier all-defects-at-once
  # control: it swapped the anon-definer query for a second RLS-table query that
  # kept the anon LABEL, and because an RLS defect was also present the label
  # still appeared, so the control passed while the anon rule was gone. Seeding
  # every defect together only proves each label shows up SOMEWHERE. Binding a
  # rule to its own defect means giving it a database where its defect is the
  # ONLY one — then a rule that fires is a rule that found what it names.
  declare -a _SEED_SQL=(
    "CREATE TABLE public.selftest_rls_off (id int);"
    "CREATE FUNCTION public.selftest_anon_definer() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.selftest_anon_definer() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.selftest_anon_definer() TO anon;"
    "CREATE FUNCTION public.selftest_authed_definer() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.selftest_authed_definer() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.selftest_authed_definer() TO authenticated;"
  )

  _idx=0
  MISSING=()
  WRONGFIRE=()
  for _rule in "${EXPECTED_RULES[@]}"; do
    _RDB="${CDB}_${_idx}"
    psql -X -q -v ON_ERROR_STOP=1 -d "$CONTROL" -c "CREATE DATABASE $_RDB" >/dev/null 2>&1 \
      || { echo "FAIL(setup): could not create control database $_RDB" >&2; exit 2; }
    CONTROL_DBS+=("$_RDB")

    psql -X -q -v ON_ERROR_STOP=1 -d "$CBASE/$_RDB" >"$WORK/seed.out" 2>&1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END \$\$;
${_SEED_SQL[$_idx]}
SQL
    [[ $? -eq 0 ]] || { echo "FAIL(setup): could not seed the control for '${_rule}'. psql said:" >&2; head -5 "$WORK/seed.out" >&2; exit 2; }

    run_gate "$CBASE/$_RDB" "$WORK/c.out" "$WORK/c.err"

    # its own rule MUST fire
    grep -q "^${_rule}|" "$WORK/c.out" || MISSING+=("$_rule")

    # and no OTHER rule may fire on a database seeded only for this one
    for _other in "${EXPECTED_RULES[@]}"; do
      [[ "$_other" == "$_rule" ]] && continue
      grep -q "^${_other}|" "$WORK/c.out" && WRONGFIRE+=("${_other} fired on the '${_rule}' control")
    done

    _idx=$(( _idx + 1 ))
  done

  if (( ${#MISSING[@]} > 0 )); then
    echo "FAIL(setup): the gate FAILED ITS OWN POSITIVE CONTROL." >&2
    echo "  These rules did not detect the defect seeded specifically for them:" >&2
    printf '    %s\n' "${MISSING[@]}" >&2
    echo "  A green from this gate would be a false green — its predicates are not working." >&2
    echo "  (A rule can keep its name and still be disabled, e.g. by a WHERE false.)" >&2
    exit 2
  fi

  if (( ${#WRONGFIRE[@]} > 0 )); then
    echo "FAIL(setup): a rule fired on a defect that is NOT its own." >&2
    printf '    %s\n' "${WRONGFIRE[@]}" >&2
    echo "  Rule labels are not bound to their predicates, so a passing control does not" >&2
    echo "  prove the named rule works. Refusing to trust a green." >&2
    exit 2
  fi

  CONTROL_VERDICT="PASSED — each of ${#EXPECTED_RULES[@]} rules detected ITS OWN defect, in its own database, and no rule fired on another rule's defect"
  cleanup_control
fi

# ── run against the real target ──────────────────────────────────────────────
run_gate "$CONN" "$WORK/out" "$WORK/err"
RC=$?

if [[ $RC -ne 0 ]]; then
  echo "FAIL(setup): gate could not be executed (psql exit $RC)" >&2
  cat "$WORK/err" >&2
  exit 2
fi

if [[ -s "$WORK/err" ]]; then
  echo "note: gate emitted diagnostics on stderr (NOT counted as exposures):" >&2
  sed 's/^/  /' "$WORK/err" >&2
fi

FINDINGS="$(grep -v '^[[:space:]]*$' "$WORK/out" || true)"

if [[ -n "$FINDINGS" ]]; then
  COUNT="$(printf '%s\n' "$FINDINGS" | wc -l | tr -d ' ')"
  echo "FAIL  prod-exposure: ${COUNT} row(s) — every row is a live exposure"
  printf '%s\n' "$FINDINGS" | sed 's/^/  /'
  exit 1
fi

if [[ -z "$CONTROL" ]]; then
  echo "UNVERIFIED  prod-exposure: 0 rows, but the gate was never shown able to find anything."
  echo "  Re-run with --control <admin-uri-to-a-NON-PROD-cluster> to seed one defect per"
  echo "  rule and prove each query still detects it. Without that, 0 rows is not a pass:"
  echo "  a query whose predicate has been disabled returns 0 rows from a filthy database."
  exit 2
fi

echo "PASS  prod-exposure: 0 rows across all ${#EXPECTED_RULES[@]} declared queries"
echo "  positive control: ${CONTROL_VERDICT}"
