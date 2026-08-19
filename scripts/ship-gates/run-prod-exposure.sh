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
# shellcheck source=lib/pgprobe.sh
. "$HERE/lib/pgprobe.sh"
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
    # Roles LAST: a role holding grants in a live database cannot be dropped.
    pg_drop_seeded_roles "$CONTROL" || _failed=1
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
  # THE NAMES ARE SAMPLED FROM THE TARGET, NOT GENERATED BY THIS SCRIPT.
  #
  # Six rounds tried to make generated names unguessable and each was defeated by the
  # next property of the generator: fixed names, fixed leading letter, fixed database
  # stem, fixed rule index, fixed length, fixed charset — and then the WORD LIST
  # itself, which a mutant can regex against just as easily as a hex charset.
  #
  # That is not a sequence of oversights, it is the shape of the problem. Any generator
  # that lives IN this script is readable by whoever writes the mutant, so every
  # property it imposes is prewritable. Randomising harder cannot win; the generator
  # has to go.
  #
  # So the control objects are named after objects that ALREADY EXIST IN THE TARGET.
  # Real names are read from the target's own public schema at runtime and reused with
  # a suffix taken from another real name, which means the control's identifiers are
  # drawn from the same distribution as production's by construction. A mutant author
  # cannot prewrite a predicate against names they cannot see, and any predicate broad
  # enough to match them also matches the real objects — which is the property under
  # test.
  #
  # If the target has too few objects to sample, the gate REFUSES rather than falling
  # back to a built-in list: a fallback would restore exactly the constant this removes,
  # and a control that quietly degrades is worse than one that stops.
  #
  # RESIDUAL, unchanged: an author editing prod-exposure.sql can still key on
  # ENVIRONMENTAL properties this script does not control — row counts, extension
  # lists, the absence of particular tables. Naming cannot close that class; the
  # defence is the diff and the reviewer.
  # NOT mapfile: macOS ships bash 3.2, which does not have it, and under `set -u` the
  # array came back UNBOUND — the control then reported "NOT RUN" while the wrapper
  # still printed PASS. That is a false green produced by the control's own setup, so
  # the unset-control path is now fatal (below) as well as portable here.
  _TARGET_NAMES=()
  while IFS= read -r _tn; do
    [[ -n "$_tn" ]] && _TARGET_NAMES+=("$_tn")
  done < <(psql -X -A -t -q -d "$CONN" -c "
    SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind IN ('r','v','m')
    UNION
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
     LIMIT 200;" 2>/dev/null | grep -E '^[a-z_][a-z0-9_]*$' || true)

  if (( ${#_TARGET_NAMES[@]:-0} < 4 )); then
    echo "FAIL(setup): the target's public schema exposes fewer than 4 sampleable object" >&2
    echo "  names, so the positive control cannot name its seeded objects the way the" >&2
    echo "  target names its own. Refusing to fall back to a built-in word list: that is" >&2
    echo "  precisely the prewritable constant this control exists without." >&2
    exit 2
  fi

  # _rand_ident [short|long] — the band is DELIBERATE, see the note at the cap below.
  _rand_ident() {
    local _a _b _n _band="${1:-any}"
    _n=$(( $(od -An -tu2 -N2 /dev/urandom | tr -d ' \n') % ${#_TARGET_NAMES[@]} ))
    _a="${_TARGET_NAMES[$_n]}"
    _n=$(( $(od -An -tu2 -N2 /dev/urandom | tr -d ' \n') % ${#_TARGET_NAMES[@]} ))
    _b="${_TARGET_NAMES[$_n]}"
    # TWO REMAINING SCRIPT-SUPPLIED CONSTANTS, both found by review (openrouter,
    # 20/08/2026), both closed here:
    #   * the JOIN was always an underscore, so every control name contained one;
    #   * names longer than the limit were truncated to EXACTLY 63 characters, which
    #     is itself a prewritable predicate (`length(relname) = 63`).
    # The join is now sampled from the target's own naming — some real identifiers
    # contain underscores and some do not, so the control follows whatever the target
    # does — and the length is capped at a random value below the limit so no single
    # length is characteristic.
    local _join="" _cap
    if [[ "${_a}${_b}" == *_* ]] || (( $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 2 )); then
      _join="_"
    fi
    # THE TWO INSTANCES DELIBERATELY STRADDLE THE LENGTH RANGE.
    #
    # A single random cap made every length mutant PROBABILISTIC: with both objects
    # drawn from one band, `length(relname) <= 61` usually matched both and the control
    # passed by luck. A control whose verdict depends on a coin flip is not a control.
    #
    # So one instance is SHORT (3-12 chars) and the other is at the LIMIT (62-63), with
    # which is which chosen at random. Any single-bounded length predicate now misses
    # one of them deterministically: `<= 61` misses the long one, `>= 24` misses the
    # short one, `= 63` misses the short one. Postgres truncates identifiers at 63, so
    # this spans the whole legal range.
    #
    # A two-sided mutant (`length <= 12 OR length >= 62`) would match both and evade
    # this, and that is stated rather than hidden — but such a predicate excludes the
    # middle of the range, which is where most real identifiers live, so it would miss
    # most production defects and is a poor disguise for a rule pretending to work.
    local _cap
    case "$_band" in
      short) _cap=$((  3 + $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 10 )) ;;  #  3..12
      long)  _cap=$(( 62 + $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') %  2 )) ;;  # 62..63
      *)     _cap=$((  3 + $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 61 )) ;;  #  3..63
    esac
    # BUILD UP TO THE CAP, then truncate TO it — so the result is EXACTLY _cap long.
    # `printf '%.*s'` only shortens: with a cap of 62 and a 30-character concatenation
    # the name came out 30 characters, so the "long" band never reached the limit and
    # the length mutants passed or failed by luck (observed: `length <= 61` survived
    # three runs out of three). Real names are appended until the string is long enough.
    local _built="${_a}${_join}${_b}"
    while (( ${#_built} < _cap )); do
      _n=$(( $(od -An -tu2 -N2 /dev/urandom | tr -d ' \n') % ${#_TARGET_NAMES[@]} ))
      _built="${_built}_${_TARGET_NAMES[$_n]}"
    done
    printf '%.*s' "$_cap" "$_built"
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
    if (( $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 2 )); then
      _o1="$(_rand_ident short)"; _o2="$(_rand_ident long)"
    else
      _o1="$(_rand_ident long)";  _o2="$(_rand_ident short)"
    fi
    # ONE OF THE TWO BREAKS THE lower_snake_case SHAPE. The sampling pipeline filters
    # target names through `grep -E '^[a-z_][a-z0-9_]*$'`, so every seeded object matched
    # that pattern and a mutant could add `relname ~ '^[a-z_][a-z0-9_]*$'` — passing this
    # control while missing any production object created as a QUOTED mixed-case
    # identifier ("MyTable"), which Postgres permits and real schemas contain. Reported
    # by an independent review (openrouter, 20/08/2026). Upper-casing one character of
    # one name defeats that predicate; the name is quoted at creation so Postgres keeps
    # the case. Which of the two is altered is random, so neither position is safe to
    # key on.
    if (( $(od -An -tu1 -N1 /dev/urandom | tr -d ' \n') % 2 )); then
      _o1="$(printf '%s' "$_o1" | awk '{ print toupper(substr($0,1,1)) substr($0,2) }')"
    else
      _o2="$(printf '%s' "$_o2" | awk '{ print toupper(substr($0,1,1)) substr($0,2) }')"
    fi
    # Two draws can share a leading letter; harmless (the hex bodies differ) but they
    # must never be the SAME identifier, or "found both" degenerates into "found one".
    while [[ "$_o1" == "$_o2" ]]; do _o2="$(_rand_ident)"; done

    # THE STRADDLE IS ASSERTED, NOT ASSUMED. The bands are supposed to guarantee one
    # short name and one at the identifier limit, so that any single-bounded length
    # predicate misses one of them. Measured over repeated runs the `length >= 24`
    # mutant was killed 4 times in 5 — so the guarantee did NOT always hold, and a
    # control that works most of the time reports a mutant as dead when it is alive.
    # Rather than trust the generator, the property it exists to provide is checked
    # here and the run stops if it is absent.
    _len1=${#_o1}; _len2=${#_o2}
    _short=$(( _len1 < _len2 ? _len1 : _len2 ))
    _long=$((  _len1 > _len2 ? _len1 : _len2 ))
    if (( _short > 12 || _long < 62 )); then
      echo "FAIL(setup): the control's two seeded names for '${_rule}' do not straddle the" >&2
      echo "  identifier length range (got ${_short} and ${_long}; need <=12 and >=62)." >&2
      echo "  Without the straddle, a length-bounded mutant can match both and survive." >&2
      exit 2
    fi

    case "$_rule" in
      rls_disabled_in_public)
        _SEED="CREATE TABLE public.\"${_o1}\" (id int); CREATE TABLE public.\"${_o2}\" (id int);"
        ;;
      anon_executable_security_definer)
        _SEED="CREATE FUNCTION public.\"${_o1}\"() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.\"${_o1}\"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.\"${_o1}\"() TO anon;
                 CREATE FUNCTION public.\"${_o2}\"() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.\"${_o2}\"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.\"${_o2}\"() TO anon;"
        ;;
      authenticated_executable_security_definer)
        _SEED="CREATE FUNCTION public.\"${_o1}\"() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.\"${_o1}\"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.\"${_o1}\"() TO authenticated;
                 CREATE FUNCTION public.\"${_o2}\"() RETURNS int LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT 1 \$fn\$; REVOKE ALL ON FUNCTION public.\"${_o2}\"() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.\"${_o2}\"() TO authenticated;"
        ;;
      *)
        echo "FAIL(setup): no control seed defined for rule '${_rule}'. A rule with no" >&2
        echo "  positive control cannot license a green; add its seed or retire the rule." >&2
        exit 2
        ;;
    esac

    # Roles go through the shared helper so ONLY what this process creates is dropped.
    # An inline `IF NOT EXISTS ... CREATE ROLE` here left anon and authenticated behind
    # permanently on a vanilla control cluster — the same class swept from four other
    # gates, still live in the wrapper that runs against PRODUCTION. Found by an
    # independent review (openrouter, 20/08/2026) after the previous sweep missed this
    # file.
    pg_seed_roles "$CONTROL" anon authenticated \
      || { echo "FAIL(setup): could not ensure anon/authenticated on the --control cluster" >&2; exit 2; }
    psql -X -q -v ON_ERROR_STOP=1 -d "$CBASE/$_RDB" >"$WORK/seed.out" 2>&1 <<SQL
${_SEED}
SQL
    [[ $? -eq 0 ]] || { echo "FAIL(setup): could not seed the control for '${_rule}'. psql said:" >&2; head -5 "$WORK/seed.out" >&2; exit 2; }

    run_gate "$CBASE/$_RDB" "$WORK/c.out" "$WORK/c.err"

    # its own rule MUST fire, on BOTH unpredictable instances
    if ! grep -q "^${_rule}|" "$WORK/c.out"; then
      MISSING+=("$_rule")
    else
      # EXACT FIELDS. `grep "^rule|name"` is a PREFIX match, and the two seeded names
      # are built from the same pool — so a SHORT name is frequently a prefix of the
      # LONG one, and one row satisfied both hit tests. That made the both-instances
      # requirement silently vacuous: the `length >= 24` mutant survived roughly one run
      # in five because the long row alone answered for both. Same substring-versus-field
      # defect just fixed in repro-prod-exposure step 4, living in the control that is
      # supposed to catch defects like it. The gate emits `rule|object|acl`, so awk
      # compares whole fields.
      _hit1=0; _hit2=0
      awk -F'|' -v r="$_rule" -v o="$_o1" 'NF>=2 && $1==r && $2==o {f=1} END{exit !f}' "$WORK/c.out" && _hit1=1
      awk -F'|' -v r="$_rule" -v o="$_o2" 'NF>=2 && $1==r && $2==o {f=1} END{exit !f}' "$WORK/c.out" && _hit2=1
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

# THE PASS IS GATED ON THE CONTROL HAVING RUN, NOT ON --control HAVING BEEN TYPED.
# This used to test only `-z "$CONTROL"`, so if --control was supplied but the control
# block did not complete, CONTROL_VERDICT stayed "NOT RUN" and the wrapper printed PASS
# anyway. That is not hypothetical: a bash 3.2 portability bug (no `mapfile`) left the
# sampled-name array unbound, the control aborted, and this gate reported
# "PASS ... positive control: NOT RUN" over a target it had never proven itself able to
# read. A control that did not run must never license a green — the whole reason
# --control exists.
case "$CONTROL_VERDICT" in
  PASSED*) : ;;
  *)
    echo "UNVERIFIED  prod-exposure: 0 rows, but the positive control did not complete." >&2
    echo "  control verdict: ${CONTROL_VERDICT}" >&2
    echo "  A green is only meaningful if the queries were shown able to find something." >&2
    exit 2
    ;;
esac

echo "PASS  prod-exposure: 0 rows across all ${#EXPECTED_RULES[@]} declared queries"
echo "  positive control: ${CONTROL_VERDICT}"
