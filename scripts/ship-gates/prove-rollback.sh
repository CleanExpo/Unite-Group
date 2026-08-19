#!/usr/bin/env bash
# Tests the break-glass rollback end to end.
#
# WHY THIS EXISTS. The constitution requires a production change to have a TESTED
# rollback before it may be applied. The rollback's only test was
# repro-prod-exposure.sh step 7, which never runs — the repro exits 1 at step 4 on
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
REPO="$(cd "$HERE/../.." && pwd)"
FIX="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql"
DOWN="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql"
for f in "$FIX" "$DOWN"; do
  [[ -f "$f" ]] || { echo "cannot run: not found: $f" >&2; exit 2; }
done

DB="ship_gate_rollback"
WRONG="ship_gate_rollback_wrong"
BASE="${ADMIN%/*}"
WORK="$(mktemp -d)"
drop_all() {
  psql -X -q -d "$ADMIN" -c "DROP DATABASE IF EXISTS $DB (FORCE)" >/dev/null 2>&1 || true
  psql -X -q -d "$ADMIN" -c "DROP DATABASE IF EXISTS $WRONG (FORCE)" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap drop_all EXIT

fail() { echo "FAIL  prove-rollback: $*"; exit 1; }

mkdb() {
  psql -X -q -d "$ADMIN" -c "DROP DATABASE IF EXISTS $1 (FORCE)" >/dev/null 2>&1
  psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "CREATE DATABASE $1" >/dev/null 2>&1 \
    || fail "could not create scratch database $1"
}

anon_definers() { # $1 = db
  psql -X -A -t -q -d "$BASE/$1" -c "
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND p.proname IN ('custom_access_token_hook','before_user_created_hook','prune_integration_history')
      AND has_function_privilege('anon', p.oid, 'EXECUTE');" 2>/dev/null | tr -d '[:space:]'
}

# ── seed the observed production exposure ────────────────────────────────────
mkdb "$DB"
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

# ── THE TEST: the rollback must re-open it ───────────────────────────────────
psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$DB" -f "$DOWN" >"$WORK/down.out" 2>&1 \
  || fail "the rollback failed to apply. psql said: $(head -5 "$WORK/down.out")"

AFTER_DOWN="$(anon_definers "$DB")"
[[ "$AFTER_DOWN" == "3" ]] \
  || fail "THE ROLLBACK DID NOT RESTORE THE PRIOR STATE: expected 3 anon-executable definers after it, got '${AFTER_DOWN}'. This rollback cannot be relied on in a break-glass."

# ── and it must REFUSE a database that is not the target ─────────────────────
mkdb "$WRONG"
if psql -X -q -v ON_ERROR_STOP=1 -d "$BASE/$WRONG" -f "$DOWN" >"$WORK/wrong.out" 2>&1; then
  fail "the rollback COMMITTED against an empty database standing in for the wrong project. During an outage that is a silent no-op presented as successful recovery."
fi
grep -q 'rollback aborted' "$WORK/wrong.out" \
  || fail "the rollback failed against the wrong project, but not on its own identity guard — the abort may be incidental. Output: $(head -3 "$WORK/wrong.out")"

echo "PASS  prove-rollback"
echo "  seeded exposure:      3 anon-executable SECURITY DEFINER function(s)"
echo "  after the fix:        0"
echo "  after the rollback:   3  — prior state restored, so the rollback is TESTED"
echo "  wrong project:        refused on the identity guard, nothing committed"
