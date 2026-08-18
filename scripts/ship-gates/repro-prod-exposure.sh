#!/usr/bin/env bash
# Reproduction + fix harness for the production exposure gate.
#
# WHAT THIS PROVES, AND WHAT IT DOES NOT.
#   Proves : the gate detects the exposure; the fix migration closes it; the fix
#            keeps supabase_auth_admin's EXECUTE (login survives); the fix does
#            not over-reach onto unrelated anon-callable functions; the rollback
#            restores the pre-fix state.
#   Does NOT prove : that production is clean. Production is a different database
#            and only a run of run-prod-exposure.sh against it can say.
#
# The seed is the ACL state RECORDED AS OBSERVED in prod-exposure.sql on
# 18/08/2026 — anon=X on the two auth hooks, a non-leading PUBLIC grant on
# prune_integration_history, authenticated on get_my_org_ids, RLS off on the two
# dated tables. Row counts are asserted to be exactly 2 / 3 / 4, the observed red.
# An assertion on the count, not merely on "some rows", is what stops a repro
# that reproduces the wrong defect from passing for the right one.
#
#   usage: repro-prod-exposure.sh <admin-connection-uri-to-a-postgres-cluster>
#   e.g.   repro-prod-exposure.sh postgresql://postgres:postgres@127.0.0.1:54322/postgres
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
FIX="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql"
ROLLBACK="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql"
DB="ship_gate_repro"

[[ $# -ge 1 ]] || { echo "usage: $(basename "$0") <admin-connection-uri>" >&2; exit 2; }
ADMIN="$1"
BASE="${ADMIN%/*}"
SCRATCH="$BASE/$DB"

fail() { echo "REPRO FAIL: $*" >&2; exit 1; }
step() { echo; echo "── $* ────────────────────────────────────────────"; }

command -v psql >/dev/null 2>&1 || { echo "cannot run: psql not on PATH" >&2; exit 2; }
[[ -f "$FIX" ]] || { echo "cannot run: fix migration not found at $FIX" >&2; exit 2; }

q() { psql -X -A -t -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -c "$1"; }

step "0. scratch database"
psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "DROP DATABASE IF EXISTS $DB (FORCE)" >/dev/null 2>&1
psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "CREATE DATABASE $DB" >/dev/null || fail "could not create $DB"
echo "created $DB"

for r in anon authenticated supabase_auth_admin; do
  psql -X -A -t -q -d "$SCRATCH" -c "SELECT 1 FROM pg_roles WHERE rolname='$r'" | grep -q 1 \
    || fail "role $r missing on this cluster — the repro would silently under-report"
done
echo "roles present: anon, authenticated, supabase_auth_admin"

step "1. seed the observed production exposure"
psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" >/dev/null <<'SEED' || fail "seed failed"
-- Two SECURITY DEFINER auth hooks, explicitly granted to anon + authenticated,
-- exactly as production renders them (anon=X). supabase_auth_admin also holds
-- EXECUTE, because production needs it and the fix must preserve it.
CREATE FUNCTION public.custom_access_token_hook(event jsonb)
  RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE FUNCTION public.before_user_created_hook(event jsonb)
  RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $fn$ SELECT event $fn$;

REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.before_user_created_hook(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon, authenticated, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO anon, authenticated, supabase_auth_admin;

-- Destructive definer carrying a NON-LEADING PUBLIC grant: proacl renders as
-- {postgres=X/postgres,=X/postgres}. This is the shape the gate's superseded
-- LIKE '{=X%' predicate missed, so seeding it keeps that regression covered.
CREATE FUNCTION public.prune_integration_history()
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;
REVOKE ALL ON FUNCTION public.prune_integration_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO PUBLIC;

-- Tenancy boundary: authenticated only, so it must appear in query 3 and NOT 2.
CREATE FUNCTION public.get_my_org_ids()
  RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $fn$ SELECT '{}'::uuid[] $fn$;
REVOKE ALL ON FUNCTION public.get_my_org_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;

-- NEGATIVE CONTROL. Not SECURITY DEFINER, legitimately anon-callable, and not
-- on the fix's name list. The gate must never flag it and the fix must never
-- touch it; if the fix is over-broad this is what catches it.
CREATE FUNCTION public.harmless_rpc()
  RETURNS int LANGUAGE sql IMMUTABLE AS $fn$ SELECT 1 $fn$;
GRANT EXECUTE ON FUNCTION public.harmless_rpc() TO anon;

-- Two dated artefacts left in public with RLS off.
CREATE TABLE public.founder_uid_migration_20260810 (id int);
CREATE TABLE public.founder_uid_conflict_resolution_20260810 (id int);

-- A correctly-secured table, so query 1 is proven to discriminate rather than
-- simply counting every table in the schema.
CREATE TABLE public.properly_secured (id int);
ALTER TABLE public.properly_secured ENABLE ROW LEVEL SECURITY;
SEED
echo "seeded"

step "2. gate must go RED on the seeded defect (positive control)"
set +e
"$HERE/run-prod-exposure.sh" "$SCRATCH"
RED_RC=$?
set -e
[[ $RED_RC -eq 1 ]] || fail "expected gate exit 1 (findings) before the fix, got $RED_RC"

Q1=$(q "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false")
Q2=$(q "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.privilege_type='EXECUTE' AND (a.grantee=0 OR a.grantee::regrole::text='anon'))")
Q3=$(q "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.privilege_type='EXECUTE' AND (a.grantee=0 OR a.grantee::regrole::text='authenticated'))")
echo "observed red: q1=$Q1 q2=$Q2 q3=$Q3   (production 18/08/2026: 2 3 4)"
[[ "$Q1" == "2" ]] || fail "query 1 returned $Q1 rows, expected 2"
[[ "$Q2" == "3" ]] || fail "query 2 returned $Q2 rows, expected 3"
[[ "$Q3" == "4" ]] || fail "query 3 returned $Q3 rows, expected 4"
echo "row counts match the observed production red exactly"

step "3. apply the fix migration"
psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -f "$FIX" 2>&1 | sed 's/^/  /' || fail "fix migration failed"

step "4. gate must go GREEN"
set +e
"$HERE/run-prod-exposure.sh" "$SCRATCH"
GREEN_RC=$?
set -e
[[ $GREEN_RC -eq 0 ]] || fail "expected gate exit 0 after the fix, got $GREEN_RC"

step "5. login must survive — supabase_auth_admin keeps EXECUTE"
for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)"; do
  HAS=$(q "SELECT has_function_privilege('supabase_auth_admin','$fn','EXECUTE')")
  [[ "$HAS" == "t" ]] || fail "supabase_auth_admin LOST EXECUTE on $fn — this fix would lock out every login"
  echo "  supabase_auth_admin EXECUTE on $fn: yes"
done
for role in anon authenticated; do
  for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)" "public.prune_integration_history()" "public.get_my_org_ids()"; do
    HAS=$(q "SELECT has_function_privilege('$role','$fn','EXECUTE')")
    [[ "$HAS" == "f" ]] || fail "$role STILL has EXECUTE on $fn after the fix"
  done
done
echo "  anon and authenticated hold EXECUTE on none of the four"

step "6. fix must not over-reach (negative control)"
HAS=$(q "SELECT has_function_privilege('anon','public.harmless_rpc()','EXECUTE')")
[[ "$HAS" == "t" ]] || fail "fix stripped anon's EXECUTE on harmless_rpc() — over-broad"
echo "  anon still holds EXECUTE on the unrelated harmless_rpc(): yes"

step "7. rollback must restore the pre-fix state"
if [[ -f "$ROLLBACK" ]]; then
  psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -f "$ROLLBACK" >/dev/null || fail "rollback failed to execute"
  set +e
  "$HERE/run-prod-exposure.sh" "$SCRATCH" >/dev/null
  BACK_RC=$?
  set -e
  [[ $BACK_RC -eq 1 ]] || fail "rollback did not restore the pre-fix state (gate exit $BACK_RC, expected 1)"
  echo "  rollback restored the exposure — the fix is reversible, proven not asserted"
else
  fail "rollback file missing: $ROLLBACK"
fi

step "cleanup"
psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "DROP DATABASE IF EXISTS $DB (FORCE)" >/dev/null
echo "dropped $DB"

echo
echo "REPRO PASS — gate detects the defect, fix closes it, login survives, fix is"
echo "             not over-broad, rollback is reversible. Local only: this says"
echo "             nothing about production until the gate is run against it."
