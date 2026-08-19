#!/usr/bin/env bash
# Tests the break-glass rollback end to end.
#
# WHY THIS EXISTS. The constitution requires a production change to have a TESTED
# rollback before it may be applied. The rollback's only test was
# repro-prod-exposure.sh step 7. HISTORY, corrected 20/08/2026: step 7 never ran,
# because the repro exited 1 at step 4 on
# the deliberate get_my_org_ids row — so the precondition was NOT met and F9 said
# so. This gate reaches the test without depending on step 4's verdict.
#
# It also covers the failure an independent review (codex, 19/08/2026)
# demonstrated: run against an empty database standing in for the WRONG Supabase
# project, every loop in the rollback ran zero times and the transaction
# COMMITted, so a silent no-op read as successful recovery during an outage.
#
# Usage: scripts/ship-gates/prove-rollback.sh "<admin-postgres-uri>"
#
# Exits 0 only if ALL of:
#   1. the seeded exposure is present   (3 anon-executable definers)
#   2. the fix applies and closes it    (0 anon-executable definers)
#   3. the rollback applies and RE-OPENS it (exposure back) — this is the test
#      the constitution asks for
#   4. the rollback REFUSES an empty database (wrong project) instead of
#      committing a no-op
#
# Builds and drops its own scratch databases. Never touches an existing one.
set -uo pipefail

ADMIN="${1:-}"
if [[ -z "$ADMIN" ]]; then
  echo "usage: $0 \"<admin-postgres-uri>\"" >&2
  exit 2
fi
command -v psql >/dev/null 2>&1 || { echo "cannot run: psql not on PATH" >&2; exit 2; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pgprobe.sh
. "$HERE/lib/pgprobe.sh"   # pg_seed_roles / pg_drop_seeded_roles live here
REPO="$(cd "$HERE/../.." && pwd)"
FIX="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql"
DOWN="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql"
for f in "$FIX" "$DOWN"; do
  [[ -f "$f" ]] || { echo "cannot run: not found: $f" >&2; exit 2; }
done

# Unique per run. An independent review (codex, 19/08/2026) pre-created a
# database with the old fixed name, holding a sentinel table, and this gate
# force-dropped it and exited 0. A gate must never destroy data it did not
# create merely because a name matches a constant. Names now carry a random
# suffix and mkdb REFUSES a name that is already taken rather than dropping it.
#
# THE REFUSAL USED TO TRIGGER THE DELETION. An earlier revision named both scratch
# databases after the PID, had mkdb REFUSE a name that already existed, and hung an
# UNCONDITIONAL drop_all on the EXIT trap. So on the very collision path advertised as
# safe, mkdb called fail -> exit 1 -> the EXIT trap fired -> both names were
# force-dropped, including the pre-existing database the gate had just declined to
# touch. Found by an independent review (openrouter, 19/08/2026); the mechanism is
# reproducible in five lines of bash. A cleanup must only ever drop what it REGISTERED,
# and registration must happen after creation succeeds — never before.
BASE="${ADMIN%/*}"
WORK="$(mktemp -d)"
DBS_FILE="$WORK/created-databases"
: > "$DBS_FILE"
drop_all() {
  local _d _failed=0
  while IFS= read -r _d; do
    [[ -n "$_d" ]] || continue
    if ! psql -X -q -d "$ADMIN" -c "DROP DATABASE IF EXISTS \"$_d\" WITH (FORCE)" >/dev/null 2>&1; then
      # Announce, never swallow. Suppressing the status and then removing $WORK deletes
      # the ONLY register of what this run created, so a transient connection or
      # privilege failure leaks a database while the proof still reports success.
      # Third instance of this class; reported by an independent review (openrouter,
      # 19/08/2026) after the same defect was fixed in pgprobe and in the two gates
      # that keep their own register.
      echo "WARNING: could not drop scratch database ${_d} — it is LEAKED." >&2
      _failed=1
    fi
  done < "$DBS_FILE"
  # ROLES LAST, but BEFORE the verdict. Dropping a role while it still holds grants in
  # an existing database fails ("objects depend on it"), so it must come AFTER every
  # scratch database is gone — and BEFORE the `_failed` test, or its result cannot
  # reach the exit status. An earlier arrangement had the test first and the role drop
  # after it, so a leaked role set a flag nobody read.
  # NOT `|| true`: the helper reports a leaked role and that failure must be the exit
  # status, or the warning is the only thing that changed.
  pg_drop_seeded_roles "$ADMIN" || _failed=1
  if [[ $_failed -eq 1 ]]; then
    echo "WARNING: the register of databases this run created is kept at ${DBS_FILE}; ${WORK} was NOT removed." >&2
    return 1
  fi
  rm -rf "$WORK"
}
# CLASS SWEEP, 20/08/2026. An EXIT trap that RETURNS non-zero does NOT change the
# process exit status — bash restores the status that triggered the trap unless the
# handler exits explicitly. Two rounds ago I fixed this in two gates and left it in
# three, which is this branch's signature defect (patch the cited file, skip the class)
# committed while fixing an instance of it. An independent review found all three.
# Every cleanup handler in scripts/ship-gates now saves $?, runs its cleanup, and
# re-raises as 2 when a scratch database was left behind.
_on_exit() {
  local _rc=$?
  if ! drop_all; then
    echo "FAIL(cleanup): prove-rollback left scratch state behind; refusing to report a clean run." >&2
    [[ $_rc -eq 0 ]] && _rc=2
  fi
  exit "$_rc"
}
trap _on_exit EXIT

fail() { echo "FAIL  prove-rollback: $*"; exit 1; }

mkdb() {
  # Refuse to touch a database that already exists — we did not create it. Nothing is
  # registered for cleanup until CREATE has actually succeeded, so this refusal path
  # cannot drop anything.
  local _exists
  _exists="$(psql -X -A -t -q -d "$ADMIN" -c "SELECT count(*) FROM pg_database WHERE datname='$1';" 2>/dev/null | tr -d '[:space:]')"
  if [[ "$_exists" != "0" ]]; then
    fail "refusing to run: a database named $1 already exists. This gate only ever drops databases it created itself; it will not force-drop yours. Remove it deliberately, or re-run."
  fi
  psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "CREATE DATABASE $1" >/dev/null 2>&1 \
    || fail "could not create scratch database $1"
  printf '%s\n' "$1" >> "$DBS_FILE"
}

rls_on() { # $1 = db -> how many of the two dated tables have RLS enabled
  psql -X -A -t -q -d "$BASE/$1" -c "
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relrowsecurity
      AND c.relname IN ('founder_uid_migration_20260810','founder_uid_conflict_resolution_20260810');" 2>/dev/null | tr -d '[:space:]'
}

anon_definers() { # $1 = db
  psql -X -A -t -q -d "$BASE/$1" -c "
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND p.proname IN ('custom_access_token_hook','before_user_created_hook','prune_integration_history')
      AND has_function_privilege('anon', p.oid, 'EXECUTE');" 2>/dev/null | tr -d '[:space:]'
}

# ── seed the observed production exposure ────────────────────────────────────
DB="ship_gate_rollback_$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')"
mkdb "$DB"

# Cluster-wide roles are created through the shared helper so that ONLY the ones this
# process actually creates are dropped afterwards. CREATE ROLE is not database-local,
# and dropping the disposable database does not remove them.
pg_seed_roles "$ADMIN" anon authenticated supabase_auth_admin \
  || { echo "cannot run: could not ensure the anon/authenticated/supabase_auth_admin roles" >&2; exit 2; }
psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$DB" >"$WORK/seed.out" 2>&1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF;
END $$;

CREATE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
  LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE FUNCTION public.before_user_created_hook(event jsonb) RETURNS jsonb
  LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE FUNCTION public.prune_integration_history() RETURNS void
  LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;
CREATE FUNCTION public.get_my_org_ids() RETURNS SETOF uuid
  LANGUAGE sql SECURITY DEFINER STABLE AS $fn$ SELECT NULL::uuid WHERE false $fn$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon, authenticated, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO anon, authenticated, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;

CREATE TABLE public.founder_uid_migration_20260810 (id int);
CREATE TABLE public.founder_uid_conflict_resolution_20260810 (id int);
SQL
[[ $? -eq 0 ]] || fail "seed failed to apply. psql said: $(head -3 "$WORK/seed.out")"

BEFORE="$(anon_definers "$DB")"
[[ "$BEFORE" == "3" ]] \
  || fail "seed is wrong: expected 3 anon-executable definers before the fix, got '${BEFORE}'. Without the exposure present, nothing below proves the rollback restores it."

# ── the fix must close it ────────────────────────────────────────────────────
psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$DB" -f "$FIX" >"$WORK/fix.out" 2>&1 \
  || fail "the fix failed to apply against the seeded database. psql said: $(head -3 "$WORK/fix.out")"

AFTER_FIX="$(anon_definers "$DB")"
[[ "$AFTER_FIX" == "0" ]] \
  || fail "the fix did not close the exposure: ${AFTER_FIX} definer(s) still anon-executable. The rollback test would be meaningless."

# Board rows 4 and 5 are RLS items, and an earlier revision of this gate measured
# only the functions — an independent review deleted the entire RLS-disable block
# from the rollback and this script still exited 0 calling the rollback TESTED.
RLS_AFTER_FIX="$(rls_on "$DB")"
[[ "$RLS_AFTER_FIX" == "2" ]] \
  || fail "the fix did not enable RLS on both dated tables (got '${RLS_AFTER_FIX}' of 2). Board rows 4 and 5 are not closed."

# ── THE TEST: the rollback must re-open it ───────────────────────────────────
psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$DB" -f "$DOWN" >"$WORK/down.out" 2>&1 \
  || fail "the rollback failed to apply. psql said: $(head -5 "$WORK/down.out")"

AFTER_DOWN="$(anon_definers "$DB")"
[[ "$AFTER_DOWN" == "3" ]] \
  || fail "THE ROLLBACK DID NOT RESTORE THE PRIOR STATE: expected 3 anon-executable definers after it, got '${AFTER_DOWN}'. This rollback cannot be relied on in a break-glass."

RLS_AFTER_DOWN="$(rls_on "$DB")"
[[ "$RLS_AFTER_DOWN" == "0" ]] \
  || fail "THE ROLLBACK DID NOT RESTORE THE RLS STATE: expected RLS OFF on both dated tables after it, got '${RLS_AFTER_DOWN}' of 2 still enabled. Board rows 4 and 5 are not reversible."

# ── and it must REFUSE a database that is not the target ─────────────────────
WRONG="ship_gate_rollback_wrong_$(od -An -tx1 -N6 /dev/urandom | tr -d ' \n')"
mkdb "$WRONG"
if psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$WRONG" -f "$DOWN" >"$WORK/wrong.out" 2>&1; then
  fail "the rollback COMMITTED against an empty database standing in for the wrong project. During an outage that is a silent no-op presented as successful recovery."
fi
# The string 'rollback aborted' is emitted by BOTH guards in the down migration —
# the identity guard (…down.sql:66) and the minimum-effect post-condition
# (…down.sql:139). Round 6 of the cross-agent review defeated the earlier grep on
# that shared prefix by deleting the identity-guard DO block entirely: the empty
# database then failed LATER, on minimum-effect, whose message also matched, and
# this gate printed "refused on the identity guard" and exited 0. A control that
# accepts a different guard's abort cannot prove the guard it names ever ran.
# Match the identity guard's OWN text, which no other exception in the file emits.
grep -q 'expected all 4 privileged functions this file restores' "$WORK/wrong.out" \
  || fail "the rollback failed against the wrong project, but NOT on its identity guard — the abort came from somewhere else, so the guard is unproven. Output: $(head -3 "$WORK/wrong.out")"

echo "PASS  prove-rollback"
echo "  seeded exposure:      3 anon-executable SECURITY DEFINER function(s)"
echo "  after the fix:        0 definers, RLS ON for 2/2 dated tables"
echo "  after the rollback:   3 definers, RLS OFF for 2/2 — prior state restored, so the rollback is TESTED"
echo "  wrong project:        refused on the identity guard, nothing committed"
