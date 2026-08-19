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
  # THE CONTROL DATABASE NAME MUST BE UNPREDICTABLE TOO. Randomising the seeded
  # OBJECT names closed the `relname LIKE 'z%'` attack but not the one under it: an
  # independent review (openrouter, 20/08/2026) pointed out that the control DATABASE
  # was still `prod_exposure_selftest_<pid>`, so a prewritten mutant could keep every
  # rule label AND its real class predicate and simply add
  #     AND current_database() LIKE 'prod_exposure_selftest_%'
  # Every randomly-named seeded object stays visible, both-instance checks pass, no
  # cross-rule fire occurs — and the rule is blind everywhere else, including
  # production. Keying on the environment defeats a control whose objects are random,
  # so the environment must be random as well. Nothing in the control's naming is a
  # constant now.
  #
  # RESIDUAL, STATED HONESTLY. A mutant author who can edit prod-exposure.sql can key
  # on any property that distinguishes a control database from production — row counts,
  # extension lists, the absence of particular tables. Randomising names raises the
  # cost and removes every constant this script supplies; it does not make the class
  # impossible. The remaining defence is the diff and the reviewer, which is the same
  # residual every gate here carries and is stated rather than implied.
  CDB="c$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')"
  CBASE="${CONTROL%/*}"
  # The register is a FILE, and failures are ANNOUNCED. Written as an array with
  # `|| true`, every DROP failure was suppressed and the array died with the shell,
  # so a persistent connection or privilege error left all three control databases
  # behind while the wrapper printed PASS and exited 0 — a silent leak in the gate
  # that runs against PRODUCTION. Reported by an independent review (openrouter,
  # 20/08/2026); the same class had already been fixed in four other gates, and this
  # was the fifth. A file survives the subshell and the process; an array does not.
  CONTROL_REG="$WORK/control-databases"
  : > "$CONTROL_REG"
  cleanup_control() {
    local _d _failed=0
    [[ -f "$CONTROL_REG" ]] || return 0
    while IFS= read -r _d; do
      [[ -n "$_d" ]] || continue
      if psql -X -q -d "$CONTROL" -c "DROP DATABASE IF EXISTS \"$_d\" WITH (FORCE)" >/dev/null 2>&1; then
        continue
      fi
      echo "WARNING: could not drop control database ${_d} — it is LEAKED on the --control cluster." >&2
      _failed=1
    done < "$CONTROL_REG"
    if [[ $_failed -eq 1 ]]; then
      echo "WARNING: the register of control databases is kept at ${CONTROL_REG}." >&2
      return 1
    fi
    : > "$CONTROL_REG"
    return 0
  }
  # A LEAK MUST CHANGE THE EXIT CODE, not merely print a warning. The previous form
  # was `cleanup_control || CONTROL_LEAKED=1; [[ ... ]] || rm -rf "$WORK"`, and an
  # independent review (openrouter, 20/08/2026) pointed out that BOTH halves succeed:
  # `|| assignment` converts the failure to success, the `[[ ]]` test then also
  # succeeds, and the trap's final status is 0. So the "cleanup status is drained"
  # claim was false and a leak still exited 0 under a printed PASS. The trap now
  # re-raises: if the process was going to exit 0 and control databases were leaked,
  # it exits 2 instead, because a gate that cannot clean up its own control has not
  # earned the trust its green implies.
  _on_exit() {
    local _rc=$?
    if ! cleanup_control; then
      CONTROL_LEAKED=1
    fi
    if [[ ${CONTROL_LEAKED:-0} -eq 1 ]]; then
      echo "FAIL(cleanup): control databases were left behind; refusing to report a clean run." >&2
      [[ $_rc -eq 0 ]] && _rc=2
    else
      rm -rf "$WORK"
    fi
    exit "$_rc"
  }
  trap _on_exit EXIT

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

  # Each control database is checked for pre-existence individually at creation time
  # (below), because there is deliberately no shared prefix left to match on here.

  # ── one defect class per database, TWO unpredictable instances of it ───────
  #
  # ROUND 1 of this control seeded every defect in ONE database and only checked
  # that each rule LABEL appeared somewhere. A reviewer swapped the anon-definer
  # query for a second RLS query that kept the anon label; the label still showed
  # up, so the control passed with the anon rule gone.
  #
  # ROUND 2 gave each rule its own database, so a rule that fires is a rule that
  # found the defect it names. That closed the label attack — and a later review
  # (openrouter, 19/08/2026) defeated it anyway, because the seeded objects had
  # FIXED names. A mutant could keep every rule label AND its class of predicate
  # and simply add `AND relname = 'selftest_rls_off'` (or the matching proname).
  # Every rule then detected its own seeded defect perfectly while being blind to
  # every other instance of the same class — a gate that finds exactly the one
  # defect you show it and nothing in production.
  #
  # ROUND 3, here. Two changes, and the first is the load-bearing one:
  #
  #   1. THE CONTROL OBJECTS ARE UNPREDICTABLE. Their names are random per run
  #      with NO constant anywhere in them — not even the leading letter, which is
  #      itself drawn at random — so there is no literal and no LIKE pattern a mutant
  #      author can write in advance that matches them. To detect a name it cannot
  #      predict, a predicate has to be general — which is the property under test.
  #
  #   2. EACH RULE MUST FIND *BOTH* INSTANCES. Two independently-named objects of
  #      the same defect class are seeded, and the rule must report both. A
  #      predicate narrowed to any single object finds one and fails here, so
  #      "detects a defect" is upgraded to "detects the CLASS of defect".
  #
  # Together: a narrowing attack must guess two random names, and a general
  # predicate passes because it is correct.
  # THE IDENTIFIERS MUST LOOK LIKE REAL OBJECTS, not like generated ones.
  #
  # Five rounds of this control were defeated by whatever constant the previous round
  # left behind: fixed object names, then fixed leading letters (`z`/`q`), then the
  # fixed database stem, then the per-rule `_0`/`_1`/`_2` index. Round six found the
  # next one — every name was exactly ELEVEN characters (one letter plus ten hex
  # digits), so `length(relname) = 11` narrowed a rule to the control while leaving its
  # real class predicate intact. Randomising one attribute at a time loses this game,
  # because a generated name differs from a real one in SHAPE, and shape is prewritable.
  #
  # So the names are now assembled from ordinary word fragments at a random LENGTH,
  # producing identifiers that are structurally indistinguishable from the schema's own
  # (`org_members_sync`, `billing_events`). There is no fixed length, no fixed prefix,
  # no hex-only charset and no regex over character class that separates a control
  # object from a production one — because there is no longer anything to separate.
  #
  # RESIDUAL, unchanged and still stated: an author who can edit prod-exposure.sql can
  # key on properties of the ENVIRONMENT that this script does not control — row counts,
  # extension lists, the absence of particular tables. Names cannot close that class.
  # The defence there is the diff and the reviewer.
  _WORDS=(org member sync billing event audit token session user project team invoice
          job queue task run state log entry record item cache index draft cycle note
          plan report step batch chunk field group label link mark node page part slot)
  _rand_ident() {
    local _n _i _out="" _parts
    # 2-4 fragments, joined with underscores: length varies with the words chosen.
    _parts=$(( 2 + $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 3 ))
    for (( _i=0; _i<_parts; _i++ )); do
      _n=$(( $(od -An -tu2 -N2 /dev/urandom | tr -d ' \n') % ${#_WORDS[@]} ))
      [[ -n "$_out" ]] && _out="${_out}_"
      _out="${_out}${_WORDS[$_n]}"
    done
    # A short random tail keeps collisions negligible without imposing a fixed shape:
    # it is 1-4 lowercase letters, which every real identifier could also end with.
    _n=$(( 1 + $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 4 ))
    local _letters=abcdefghijklmnopqrstuvwxyz _t=""
    for (( _i=0; _i<_n; _i++ )); do
      _t="${_t}${_letters:$(( $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 26 )):1}"
    done
    printf '%s_%s' "$_out" "$_t"
  }

  _idx=0
  MISSING=()
  PARTIAL=()
  WRONGFIRE=()
  for _rule in "${EXPECTED_RULES[@]}"; do
    # INDEPENDENTLY RANDOM PER RULE. `${CDB}_${_idx}` gave each rule a deterministic
    # suffix — the RLS control always ended `_0`, anon `_1`, authenticated `_2` —
    # so a prewritten mutant could keep each real class predicate and add the matching
    # `current_database() LIKE '%\_0'`. Every rule then reported both of its random
    # objects and stayed blind in production: the fifth defeat of this control, and the
    # same shape as the four before it, one constant further down. There is no shared
    # stem and no index in the name now.
    _RDB="$(_rand_ident)"
    _rexists="$(psql -X -A -t -q -d "$CONTROL" -c "SELECT count(*) FROM pg_database WHERE datname = '${_RDB}';" 2>/dev/null | tr -d '[:space:]')"
    if [[ "$_rexists" != "0" ]]; then
      echo "FAIL(setup): refusing to run: ${_RDB} already exists on the --control cluster." >&2
      echo "  This gate only drops databases it created itself; it will not force-drop yours." >&2
      exit 2
    fi
    psql -X -q -v ON_ERROR_STOP=1 -d "$CONTROL" -c "CREATE DATABASE $_RDB" >/dev/null 2>&1 \
      || { echo "FAIL(setup): could not create control database $_RDB" >&2; exit 2; }
    printf '%s\n' "$_RDB" >> "$CONTROL_REG"

    # Two unpredictable names, generated independently so they share no prefix.
    _o1="$(_rand_ident)"
    _o2="$(_rand_ident)"
    # Two draws can share a leading letter; harmless (the hex bodies differ) but they
    # must never be the SAME identifier, or "found both" degenerates into "found one".
    while [[ "$_o1" == "$_o2" ]]; do _o2="$(_rand_ident)"; done

    case "$_rule" in
      rls_disabled_in_public)
        _SEED="CREATE TABLE public.${_o1} (id int); CREATE TABLE public.${_o2} (id int);"
        ;;
      anon_executable_security_definer)
        _SEED="CREATE FUNCTION public.${_o1}() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.${_o1}() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.${_o1}() TO anon;
                 CREATE FUNCTION public.${_o2}() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.${_o2}() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.${_o2}() TO anon;"
        ;;
      authenticated_executable_security_definer)
        _SEED="CREATE FUNCTION public.${_o1}() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.${_o1}() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.${_o1}() TO authenticated;
                 CREATE FUNCTION public.${_o2}() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.${_o2}() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.${_o2}() TO authenticated;"
        ;;
      *)
        echo "FAIL(setup): no control seed defined for rule '${_rule}'. A rule with no" >&2
        echo "  positive control cannot license a green; add its seed or retire the rule." >&2
        exit 2
        ;;
    esac

    psql -X -q -v ON_ERROR_STOP=1 -d "$CBASE/$_RDB" >"$WORK/seed.out" 2>&1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END \$\$;
${_SEED}
SQL
    [[ $? -eq 0 ]] || { echo "FAIL(setup): could not seed the control for '${_rule}'. psql said:" >&2; head -5 "$WORK/seed.out" >&2; exit 2; }

    run_gate "$CBASE/$_RDB" "$WORK/c.out" "$WORK/c.err"

    # its own rule MUST fire, on BOTH unpredictable instances
    if ! grep -q "^${_rule}|" "$WORK/c.out"; then
      MISSING+=("$_rule")
    else
      _hit1=0; _hit2=0
      grep -q "^${_rule}|${_o1}" "$WORK/c.out" && _hit1=1
      grep -q "^${_rule}|${_o2}" "$WORK/c.out" && _hit2=1
      if (( _hit1 == 0 || _hit2 == 0 )); then
        PARTIAL+=("${_rule} found $(( _hit1 + _hit2 )) of 2 seeded instances (${_o1}, ${_o2})")
      fi
    fi

    # and no OTHER rule may fire on a database seeded only for this one
    for _other in "${EXPECTED_RULES[@]}"; do
      [[ "$_other" == "$_rule" ]] && continue
      grep -q "^${_other}|" "$WORK/c.out" && WRONGFIRE+=("${_other} fired on the '${_rule}' control")
    done

    _idx=$(( _idx + 1 ))
  done

  if (( ${#PARTIAL[@]} > 0 )); then
    echo "FAIL(setup): a rule detected SOME instances of its defect class but not all." >&2
    printf '    %s\n' "${PARTIAL[@]}" >&2
    echo "  Two independently-named objects of one class were seeded and the rule found" >&2
    echo "  only one, so its predicate is narrowed to particular objects rather than" >&2
    echo "  matching the class. Against production it would miss real exposures while" >&2
    echo "  passing this control. Refusing to trust a green." >&2
    exit 2
  fi

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

  CONTROL_VERDICT="PASSED — each of ${#EXPECTED_RULES[@]} rules detected BOTH unpredictably-named instances of ITS OWN defect class, in its own database, and no rule fired on another rule's defect"
  # Checked here too: the mid-run cleanup happens BEFORE the production query and this
  # script does not enable errexit, so an unchecked failure here would have continued
  # all the way to a printed PASS.
  cleanup_control || CONTROL_LEAKED=1
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
