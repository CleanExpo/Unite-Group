#!/usr/bin/env bash
# Proves the rollback restores the pre-state that was OBSERVED, not one presumed.
#
# THE DEFECT THIS EXISTS FOR. An independent review (codex, 19/08/2026) seeded an
# owner-only public.custom_access_token_hook with anon EXECUTE **false**, applied
# 2026-08-19-privileged-function-exposure-lock.sql, then applied its .down.sql.
# Both committed, and anon EXECUTE went from false BEFORE the pair to true AFTER
# it. The rollback CREATED an exposure that had never existed — during the one
# procedure an operator runs while trusting it most, and reports as recovery.
#
# The cause was that the rollback GRANTed a hard-coded presumed pre-state instead
# of restoring an observed one. A rollback cannot restore a state nobody
# recorded, so the forward file now captures the pre-state into
# public.privileged_function_exposure_lock_receipt_20260819 before mutating
# anything, and the rollback replays exactly those rows.
#
# prove-rollback.sh covers the OTHER direction — the fully-exposed production
# shape, where the rollback must put the exposure back. This covers the shape
# where the rollback must NOT put an exposure back. Both are needed: a rollback
# that always grants passes the first and fails this one.
#
# Usage: scripts/ship-gates/prove-rollback-fidelity.sh "<postgres-admin-uri>"
#
# Exits 0 only if ALL of the following hold:
#   1. FIDELITY: anon EXECUTE false before the pair -> still false after it
#   2. NO-RECEIPT REFUSAL: the rollback ABORTS when no receipt table exists,
#      rather than falling back to guessing
#   3. MUTATION CONTROL: with the receipt-driven restore replaced by the old
#      hard-coded GRANT, case 1 FAILS again (anon becomes true). Without this,
#      case 1 could be green because the grant silently did nothing at all.
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
DOWN="$REPO/docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql"
for f in "$APPLY" "$DOWN"; do
  [[ -f "$f" ]] || { echo "cannot run: missing $f" >&2; exit 2; }
done

WORK="$(mktemp -d)"
DBS=()
cleanup() {
  local d
  for d in "${DBS[@]:-}"; do
    [[ -n "$d" ]] && psql "$ADMIN" -X -q -c "DROP DATABASE IF EXISTS ${d} WITH (FORCE)" >/dev/null 2>&1
  done
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() { echo "FAIL  prove-rollback-fidelity: $1"; exit 1; }

newdb() {
  pg_make_disposable_db "$ADMIN" "$1" || exit 2
  DBS+=("$DISPOSABLE_DB")
  echo "$DISPOSABLE_URI"
}

# Seeds all four target functions so the identity guard admits the database, with
# NO grant to anon on any of them. This is the shape the reviewer used: the
# functions exist, but the exposure the rollback assumes does not.
seed_unexposed() {
  local uri="$1"
  psql "$uri" -X -q -v ON_ERROR_STOP=1 >"$WORK/seed.out" 2>&1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF;
END $$;

CREATE FUNCTION public.custom_access_token_hook(event jsonb)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE FUNCTION public.before_user_created_hook(event jsonb)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE FUNCTION public.prune_integration_history()
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;
CREATE FUNCTION public.get_my_org_ids()
  RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $fn$ SELECT NULL::uuid WHERE false $fn$;

-- OWNER-ONLY. This is the whole point: anon must not be able to execute these
-- before the pair runs, so it must not be able to afterwards either.
REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.before_user_created_hook(jsonb)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_integration_history()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_org_ids()                 FROM PUBLIC, anon, authenticated;
-- supabase_auth_admin keeps EXECUTE so the forward post-condition is satisfied.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO supabase_auth_admin;
SQL
  [[ $? -eq 0 ]] || fail "seed failed — this gate proves nothing against a broken seed. psql said: $(head -3 "$WORK/seed.out")"
}

anon_exec_count() { # how many of the three privileged definers anon may execute
  pg_scalar "$1" "SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND p.proname IN ('custom_access_token_hook','before_user_created_hook','prune_integration_history') AND has_function_privilege('anon', p.oid, 'EXECUTE')"
}

run_pair() { # run_pair <uri> <down-file> -> 0 if BOTH committed
  psql "$1" -X -q -v ON_ERROR_STOP=1 -f "$APPLY" >"$WORK/apply.out" 2>"$WORK/apply.err" || return 1
  psql "$1" -X -q -v ON_ERROR_STOP=1 -f "$2"     >"$WORK/down.out"  2>"$WORK/down.err"  || return 2
  return 0
}

# ── 1. FIDELITY ──────────────────────────────────────────────────────────────
DB="$(newdb rbfid)"
seed_unexposed "$DB"

BEFORE="$(anon_exec_count "$DB")"
[[ "$BEFORE" == "0" ]] \
  || fail "the fixture is wrong: anon can already execute ${BEFORE} privileged definer(s) before the pair runs, so this gate could not detect an exposure the rollback invented."

run_pair "$DB" "$DOWN"
RC=$?
[[ $RC -ne 1 ]] || fail "the forward migration did not commit against the unexposed fixture. stderr: $(head -3 "$WORK/apply.err")"
[[ $RC -ne 2 ]] || fail "the rollback did not commit against the unexposed fixture. stderr: $(head -3 "$WORK/down.err")"

AFTER="$(anon_exec_count "$DB")"
[[ "$AFTER" == "0" ]] \
  || fail "THE ROLLBACK INVENTED AN EXPOSURE: anon could execute 0 privileged definers BEFORE the forward+rollback pair and ${AFTER} AFTER it. A break-glass path that grants privileges which never existed is a second incident, not a recovery."
echo "  case 1  fidelity              -> anon EXECUTE 0 before the pair, 0 after it"

# ── 2. NO-RECEIPT REFUSAL ────────────────────────────────────────────────────
# A rollback with no record of the pre-state must abort, not guess.
DB2="$(newdb rbnorcpt)"
seed_unexposed "$DB2"
if psql "$DB2" -X -q -v ON_ERROR_STOP=1 -f "$DOWN" >"$WORK/nr.out" 2>"$WORK/nr.err"; then
  fail "the rollback COMMITTED with no pre-state receipt present. With nothing recorded it can only guess, and a wrong guess grants privileges that never existed."
fi
grep -q 'no pre-state receipt table' "$WORK/nr.err" \
  || fail "the rollback refused a receipt-less database, but NOT on the missing-receipt guard, so that guard is unproven. stderr: $(head -3 "$WORK/nr.err")"
echo "  case 2  no receipt            -> rollback aborted on the missing-receipt guard"

# ── 3. MUTATION CONTROL ──────────────────────────────────────────────────────
# Replace the receipt-driven restore with the OLD hard-coded grant. Case 1 must
# now FAIL. Without this, case 1 could be green because the restore granted
# nothing at all, and this gate would certify fidelity it never exercised.
MUT="$WORK/down-hardcoded.sql"
# The mutant must reproduce the ORIGINAL file, which is BOTH the hard-coded
# restore AND the old "abort if nothing is exposed" post-condition. A first
# attempt replaced only the restore block and the control failed: the new
# receipt-equality post-condition caught the hard-coded grant and aborted the
# transaction, so anon stayed at 0 and the mutant looked correct. That is a real
# result about the new post-condition, but it makes a poor control, because a
# mutant that cannot express the defect cannot demonstrate the fix.
python3 - "$DOWN" "$MUT" <<'PY_MUT'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
r_start = s.find("-- \u2500\u2500 RESTORE THE OBSERVED PRE-STATE")
p_start = s.find("-- \u2500\u2500 POST-CONDITION")
c_end   = s.rfind("COMMIT;")
assert r_start != -1 and p_start != -1 and c_end != -1, "could not locate the blocks to mutate"

legacy_restore = """DO $$
DECLARE
  _fn regprocedure;
BEGIN
  FOR _fn IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('custom_access_token_hook','before_user_created_hook')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', _fn);
  END LOOP;
  FOR _fn IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'prune_integration_history'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', _fn);
  END LOOP;
END
$$;

"""

legacy_post = """DO $$
DECLARE
  _exposed int;
BEGIN
  SELECT count(*) INTO _exposed
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
    AND p.proname IN ('custom_access_token_hook','before_user_created_hook','prune_integration_history')
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF _exposed = 0 THEN
    RAISE EXCEPTION 'rollback aborted: completed without re-exposing a single privileged function.';
  END IF;
END
$$;

"""

open(dst, 'w').write(s[:r_start] + legacy_restore + legacy_post + s[c_end:])
print("mutant built")
PY_MUT

[[ -s "$MUT" ]] || fail "mutation control could not be built"
grep -q 'no pre-state receipt table' "$MUT" \
  && fail "mutation control is vacuous: the receipt guard is still present in the mutant."

DB3="$(newdb rbmut)"
seed_unexposed "$DB3"
run_pair "$DB3" "$MUT" >/dev/null 2>&1
MUT_AFTER="$(anon_exec_count "$DB3")"
if [[ "$MUT_AFTER" == "0" ]]; then
  fail "MUTATION CONTROL FAILED: with the old hard-coded GRANT restored, anon STILL could not execute any privileged definer. Case 1 is therefore not attributable to the receipt-driven restore — the grants may be failing for an unrelated reason, and this gate would be certifying fidelity it never exercised."
fi
echo "  case 3  hard-coded restore    -> invents ${MUT_AFTER} exposure(s) again (control is live)"

echo "PASS  prove-rollback-fidelity"
echo "  the rollback restores the pre-state the forward migration OBSERVED,"
echo "  refuses to run without that record, and the old presumed-state restore"
echo "  demonstrably fails this gate."
