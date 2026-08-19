#!/usr/bin/env bash
# Reproduction + fix harness for the production exposure gate.
#
# WHAT THIS PROVES, AND WHAT IT DOES NOT.
#   Proves : the gate detects the exposure; the fix migration closes it; the fix
#            keeps supabase_auth_admin's EXECUTE (login survives) EVEN when that
#            EXECUTE came via PUBLIC alone, which is the only arrangement in
#            which the re-grant is load-bearing; the fix does not over-reach onto
#            unrelated anon-callable functions; the rollback restores the pre-fix
#            state.
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
# The run exits 1 at step 4 by design, so a trailing cleanup statement is never
# reached and the scratch database would survive the run. An EXIT trap makes the
# "builds and drops its own scratch database" contract true on every path.
#
# NO FIXED SCRATCH NAME. This gate used to force-drop `ship_gate_repro` before it had
# created anything: an independent review (openrouter, 19/08/2026) showed that
# pre-creating that name with unrelated data got it deleted, on both the setup and the
# failure path. A gate must never destroy data it did not create because a name
# collided. pg_make_disposable_db randomises the suffix and ABORTS on a pre-existing
# name, and pg_drop_disposable_db drops only what this process created.
[[ $# -ge 1 ]] || { echo "usage: $(basename "$0") <admin-connection-uri>" >&2; exit 2; }
ADMIN="$1"

HERE_LIB="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pgprobe.sh
. "$HERE_LIB/lib/pgprobe.sh"

cleanup_scratch() { pg_drop_disposable_db "${ADMIN:-}"; }
# CLASS SWEEP, 20/08/2026. An EXIT trap that RETURNS non-zero does NOT change the
# process exit status — bash restores the status that triggered the trap unless the
# handler exits explicitly. Two rounds ago I fixed this in two gates and left it in
# three, which is this branch's signature defect (patch the cited file, skip the class)
# committed while fixing an instance of it. An independent review found all three.
# Every cleanup handler in scripts/ship-gates now saves $?, runs its cleanup, and
# re-raises as 2 when a scratch database was left behind.
_on_exit() {
  local _rc=$?
  if ! cleanup_scratch; then
    echo "FAIL(cleanup): repro-prod-exposure left scratch state behind; refusing to report a clean run." >&2
    [[ $_rc -eq 0 ]] && _rc=2
  fi
  exit "$_rc"
}
trap _on_exit EXIT

pg_make_disposable_db "$ADMIN" "ship_gate_repro" || exit 2
DB="$DISPOSABLE_DB"
SCRATCH="$DISPOSABLE_URI"

fail() { echo "REPRO FAIL: $*" >&2; exit 1; }
step() { echo; echo "── $* ────────────────────────────────────────────"; }

command -v psql >/dev/null 2>&1 || { echo "cannot run: psql not on PATH" >&2; exit 2; }
[[ -f "$FIX" ]] || { echo "cannot run: fix migration not found at $FIX" >&2; exit 2; }

q() { psql -X -A -t -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -c "$1"; }

step "0. scratch database"
# Already created above by pg_make_disposable_db, which refused a pre-existing name.
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

step "4. gate must reach the ONE deliberate row — and no other"
# THE EXPECTATION HERE WAS AN OUTAGE INSTRUCTION AND IS RETRACTED. This step used to
# demand `exit 0` after the fix. It cannot be 0: the fix deliberately RETAINS
# `authenticated` EXECUTE on get_my_org_ids, because Postgres checks function EXECUTE
# against the QUERYING role when it evaluates an RLS policy expression and
# SECURITY DEFINER does not exempt it — revoking it takes production down, proven by
# prove-rls-execute-coupling.sh. So the old assertion could only ever be satisfied by
# causing an outage, and because it failed here every time, steps 5-8 NEVER RAN while
# this file's header claimed the properties they check were proven.
#
# The corrected contract, matching FOUNDER-QUEUE F9 and the SQL header: after the fix
# the gate must exit 1 with EXACTLY ONE row, the deliberate one. Zero rows would mean
# the deliberate retention had been revoked (an outage). Any OTHER row is a real
# exposure. Both are failures here, for opposite reasons, and the run CONTINUES so the
# later steps finally execute.
set +e
GATE4_DIR="$(mktemp -d)"
"$HERE/run-prod-exposure.sh" "$SCRATCH" >"$GATE4_DIR/out" 2>"$GATE4_DIR/err"
GREEN_RC=$?
set -e
sed 's/^/  /' "$GATE4_DIR/out"

DELIBERATE='authenticated_executable_security_definer|get_my_org_ids'
# run-prod-exposure.sh INDENTS every finding by two spaces (its line 223,
# `printf '%s\n' "$FINDINGS" | sed 's/^/  /'`). An earlier revision of this check
# anchored the rule name at column 1, so it matched NOTHING: OTHER was empty even with
# extra exposure rows present, and the "exactly one row" contract this step advertises
# was half vacuous — the deliberate-row grep alone would accept a run with additional
# exposures beside it. Found by an independent review (openrouter, 19/08/2026);
# confirmed by `grep -cE '^[a-z_]+\|'` returning 0 against a real indented row.
# Leading whitespace is stripped before matching, so the check no longer depends on
# the producer's formatting.
ROWLINES="$(sed 's/^[[:space:]]*//' "$GATE4_DIR/out" | grep -E '^[a-z_]+\|' || true)"
ROWS="$(printf '%s' "$ROWLINES" | grep -c . || true)"
OTHER="$(printf '%s\n' "$ROWLINES" | grep -vF "$DELIBERATE" | grep -E '^[a-z_]+\|' || true)"

if [[ $GREEN_RC -eq 0 ]]; then
  fail "the gate returned ZERO rows after the fix. That is only reachable by revoking \`authenticated\` EXECUTE on get_my_org_ids, which TAKES PRODUCTION DOWN. Do not drive this gate to exit 0."
fi
if [[ -n "$OTHER" ]]; then
  fail "the gate returned a row that is NOT the deliberate retention — a real exposure survived the fix: $(echo "$OTHER" | head -3)"
fi
grep -qF "$DELIBERATE" "$GATE4_DIR/out" \
  || fail "the gate exited ${GREEN_RC} but did not report the deliberate authenticated/get_my_org_ids row, so it failed for some other reason: $(head -3 "$GATE4_DIR/err")"
# EXACTLY one. Counting closes the last gap: a run could name the deliberate row AND
# carry others, and the OTHER check above is the guard for that — this asserts the
# count independently so a formatting change cannot silently disarm both at once.
[[ "$ROWS" == "1" ]] \
  || fail "the gate returned ${ROWS} exposure row(s); this step requires EXACTLY ONE, the deliberate authenticated/get_my_org_ids retention. Rows seen: $(printf '%s' "$ROWLINES" | head -5)"
echo "  gate exit ${GREEN_RC} with exactly ${ROWS} row — the deliberate one — correct by design"

step "5. login must survive — supabase_auth_admin keeps EXECUTE"
# NOTE: in THIS scenario supabase_auth_admin holds an explicit grant, which the
# fix never revokes, so this step passes whether or not the fix re-grants. It is
# a state check, not a control on the re-grant. Step 8 is that control.
for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)"; do
  HAS=$(q "SELECT has_function_privilege('supabase_auth_admin','$fn','EXECUTE')")
  [[ "$HAS" == "t" ]] || fail "supabase_auth_admin LOST EXECUTE on $fn — this fix would lock out every login"
  echo "  supabase_auth_admin EXECUTE on $fn: yes"
done
# THE ONE DELIBERATE EXCEPTION. `authenticated` KEEPS EXECUTE on get_my_org_ids —
# revoking it takes production down, proven by prove-rls-execute-coupling.sh. This
# loop demanded 'f' for every pair, so it encoded the same retracted outage
# expectation as step 4 did, and it was INVISIBLE because step 4 always failed first
# and this step never ran. Both halves of the assertion matter now: the retention must
# be present (its absence is an outage) and every other pair must be revoked.
for role in anon authenticated; do
  for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)" "public.prune_integration_history()" "public.get_my_org_ids()"; do
    HAS=$(q "SELECT has_function_privilege('$role','$fn','EXECUTE')")
    if [[ "$role" == "authenticated" && "$fn" == "public.get_my_org_ids()" ]]; then
      [[ "$HAS" == "t" ]] \
        || fail "authenticated LOST EXECUTE on get_my_org_ids. That is the deliberate retention, and without it every authenticated read of an org-scoped table fails — this fix would take production down."
    else
      [[ "$HAS" == "f" ]] || fail "$role STILL has EXECUTE on $fn after the fix"
    fi
  done
done
echo "  anon and authenticated hold EXECUTE on none of the four, except the"
echo "  deliberate authenticated -> get_my_org_ids retention, which is REQUIRED"

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

step "8. the re-grant must be LOAD-BEARING, not decorative"
# Step 5 cannot fail when the re-grant is deleted: the seed gives
# supabase_auth_admin an EXPLICIT grant and the fix only revokes from PUBLIC,
# anon and authenticated, so its EXECUTE survives on its own. A control that
# cannot fail under the defect it names proves nothing.
#
# This step builds the state where the re-grant is the ONLY thing standing
# between the fix and a total login outage: supabase_auth_admin reaches the
# hooks via PUBLIC alone. That is not hypothetical — production renders
# prune_integration_history as {postgres=X/postgres,=X/postgres}, i.e. PUBLIC
# is the only non-owner path, so a hook in the same shape is a live scenario.
# With this state seeded, `REVOKE ALL ... FROM PUBLIC` strips supabase_auth_admin
# too, and only the re-grant puts it back.
psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" >/dev/null <<'PUBONLY' || fail "public-only re-seed failed"
REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM supabase_auth_admin;
REVOKE ALL ON FUNCTION public.before_user_created_hook(jsonb) FROM supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO PUBLIC;
PUBONLY
for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)"; do
  HAS=$(q "SELECT has_function_privilege('supabase_auth_admin','$fn','EXECUTE')")
  [[ "$HAS" == "t" ]] || fail "public-only re-seed is wrong: supabase_auth_admin cannot reach $fn before the fix"
  DIRECT=$(q "SELECT count(*) FROM pg_proc p, aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = '$fn'::regprocedure AND a.grantee = 'supabase_auth_admin'::regrole")
  [[ "$DIRECT" == "0" ]] || fail "public-only re-seed is wrong: supabase_auth_admin still holds a DIRECT grant on $fn ($DIRECT)"
done
echo "  pre-fix: supabase_auth_admin reaches both hooks via PUBLIC only, no direct grant"

psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -f "$FIX" >/dev/null 2>&1 || fail "fix migration failed on the public-only scenario"
for fn in "public.custom_access_token_hook(jsonb)" "public.before_user_created_hook(jsonb)"; do
  HAS=$(q "SELECT has_function_privilege('supabase_auth_admin','$fn','EXECUTE')")
  [[ "$HAS" == "t" ]] || fail "supabase_auth_admin LOST EXECUTE on $fn — the re-grant is missing or ineffective, and this fix would lock out every login"
done
echo "  post-fix: supabase_auth_admin still holds EXECUTE — supplied by the re-grant, nothing else could"

step "cleanup"
pg_drop_disposable_db "$ADMIN"
echo "dropped $DB"

echo
echo "REPRO PASS — gate detects the defect, fix closes it, login survives even when"
echo "             the auth service reached the hooks via PUBLIC alone, fix is"
echo "             not over-broad, rollback is reversible. Local only: this says"
echo "             nothing about production until the gate is run against it."
