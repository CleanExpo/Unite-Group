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
#   4. ACL SHAPE: a pre-state where PUBLIC holds EXECUTE and anon holds nothing
#      directly must NOT come back as a direct grant to anon.
#   5. NO LEFTOVERS: a grant the FORWARD file created must be taken back by down.
#   6. NO STALE REPLAY: a second apply+down cycle must not resurrect a pre-state an
#      operator deliberately changed between cycles.
#   7. THE DOWN FILE'S OWN identity guard must reject overloads too — the class must
#      be swept across BOTH files, not patched in the one that was cited.
#   8. LIKE-FOR-LIKE POST-CONDITION: the receipt side and the live side must measure
#      the same predicate over the same identities, so a CORRECT rollback of a
#      recorded non-definer grant is not rejected as "the rollback did not take".
#      Controlled by 8b, which restores the unanchored text-prefix form and shows
#      the same correct rollback being refused again.
#   9. NO PARTIAL RESTORE PASSING AS RECOVERY: a receipt entry recorded as HELD whose
#      function or grantee role has since been dropped must ABORT and be NAMED, not
#      be skipped with a NOTICE that the anon-only post-condition cannot see.
#      Controlled by 9b, which removes the guard and shows the same partial restore
#      committing.
#  10. THE SAME GUARD OVER RECORDED TABLES: the receipt also records RLS state for the
#      two dated tables, and that branch was left emitting a NOTICE when case 9 made
#      the function branch fatal. A dropped recorded table must abort and be NAMED.
#      Controlled by 10b, which restores the NOTICE and shows the rollback committing
#      while consuming the receipt.
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
# The register is a FILE, not an array. `newdb` is called as `X="$(newdb foo)"`, so its
# body runs in a command-substitution SUBSHELL and an array append there mutates a copy
# the parent never sees — cleanup then iterated an empty array and left every database
# behind. Reported by an independent review (openrouter, 19/08/2026); 37 leaked databases
# were found on the local cluster. A file write crosses the subshell boundary.
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
  # ROLES LAST (after every database is gone, or DROP ROLE fails on dependent grants)
  # but BEFORE the verdict test, or a leaked role sets a flag nobody reads.
  pg_drop_seeded_roles "$ADMIN" || _failed=1
  if [[ $_failed -eq 1 ]]; then
    echo "WARNING: the list of databases this run created is kept at ${DBS_FILE} for retry; $WORK was NOT removed." >&2
    return 1
  fi
  # ROLES LAST. Dropping a role while it still holds grants in an existing database
  # fails ("objects depend on it"), so this must come AFTER every scratch database is
  # gone. A first attempt ran it first and the roles leaked silently on a clean cluster.
  rm -rf "$WORK"
}
# AN EXIT TRAP THAT RETURNS DOES NOT CHANGE THE EXIT STATUS. bash keeps the status that
# triggered the trap unless the handler EXITS with a replacement, so `cleanup` returning
# 1 printed its warnings and the gate still exited 0 on the PASS path — the "cleanup
# failure makes the gate fail" claim was false in exactly the way the warnings made it
# look true. Reported by an independent review (openrouter, 20/08/2026). The handler now
# saves $?, runs cleanup, and re-raises as 2 when a database leaked.
_on_exit() {
  local _rc=$?
  if ! cleanup; then
    echo "FAIL(cleanup): scratch databases were left behind; refusing to report a clean run." >&2
    [[ $_rc -eq 0 ]] && _rc=2
  fi
  exit "$_rc"
}
trap _on_exit EXIT

fail() { echo "FAIL  prove-rollback-fidelity: $1"; exit 1; }

# Cluster-wide roles are seeded HERE, in the main shell — NOT inside newdb()/seed(),
# which run in command-substitution subshells. A first attempt put this call there, and
# PG_SEEDED_ROLES was set in the subshell and lost, so the roles leaked with no warning:
# the same subshell class that made the database register lose its contents earlier on
# this branch, reintroduced by me while fixing the role leak. CREATE ROLE is not
# database-local, so only what this process creates may be dropped.
pg_seed_roles "$ADMIN" anon authenticated supabase_auth_admin \
  || { echo "cannot run: could not ensure the anon/authenticated/supabase_auth_admin roles" >&2; exit 2; }

newdb() {
  pg_make_disposable_db "$ADMIN" "$1" || exit 2
  printf '%s\n' "$DISPOSABLE_DB" >> "$DBS_FILE"
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

# ── 4. ACL SHAPE: a PUBLIC-only pre-state must not return as a DIRECT anon grant ─
# has_function_privilege() reports the EFFECTIVE privilege, which includes
# anything inherited through PUBLIC. Capturing with it recorded anon as a holder
# when only PUBLIC ever held the grant, and the rollback then issued a direct
# GRANT ... TO anon that never existed. Effective access is identical the moment
# it runs, which is why this hides — but the next person to revoke PUBLIC,
# expecting anon's access to go with it, finds anon still executing. That is this
# repo's own root cause (revoking from PUBLIC is not revoking from anon) turned
# around: granting to PUBLIC is not granting to anon.
DB4="$(newdb rbacl)"
seed_unexposed "$DB4"
# Re-shape the fixture: PUBLIC holds EXECUTE, anon holds NOTHING directly.
psql "$DB4" -X -q -v ON_ERROR_STOP=1 \
  -c "GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO PUBLIC" \
  >/dev/null 2>"$WORK/acl.err" \
  || fail "could not shape the PUBLIC-only fixture: $(head -3 "$WORK/acl.err")"

direct_anon() { # direct aclitem for anon, ignoring anything inherited via PUBLIC
  pg_scalar "$1" "SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a WHERE n.nspname='public' AND p.proname='prune_integration_history' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='anon') AND a.privilege_type='EXECUTE'"
}

DA_BEFORE="$(direct_anon "$DB4")"
[[ "$DA_BEFORE" == "0" ]] \
  || fail "the fixture is wrong: anon already holds a DIRECT grant (${DA_BEFORE}) before the pair, so this case could not detect one being invented."

run_pair "$DB4" "$DOWN"
RC4=$?
[[ $RC4 -eq 0 ]] || fail "the forward+rollback pair did not commit against the PUBLIC-only fixture (rc=${RC4}). apply: $(head -2 "$WORK/apply.err") down: $(head -2 "$WORK/down.err")"

DA_AFTER="$(direct_anon "$DB4")"
[[ "$DA_AFTER" == "0" ]] \
  || fail "THE ROLLBACK CHANGED THE ACL SHAPE: prune_integration_history was executable by PUBLIC and by anon only through PUBLIC before the pair; afterwards anon holds ${DA_AFTER} DIRECT grant(s). Revoking PUBLIC will no longer remove anon's access."
echo "  case 4  PUBLIC-only pre-state -> anon still holds 0 DIRECT grants after the pair"

# ── 5. THE ROLLBACK MUST TAKE BACK WHAT IT CREATED ───────────────────────────
# The mirror of case 1. Case 1 asks "did the rollback invent an exposure it should
# not have"; this asks "did it leave behind a grant the FORWARD file created". The
# forward file issues direct grants of its own — authenticated on get_my_org_ids,
# supabase_auth_admin on both hooks — so against a database where those were absent,
# an add-only rollback leaves them standing. Reproduced 19/08/2026: authenticated's
# DIRECT grants on get_my_org_ids went 0 -> 1 -> 1 across apply+down, and the
# anon-only post-condition passed throughout, because it counts anon and this grant
# is to authenticated. A rollback that only adds is a second forward migration.
DB5="$(newdb rbback)"
seed_unexposed "$DB5"

direct_authed() { # DIRECT aclitems only — inherited-via-PUBLIC must not count
  pg_scalar "$1" "SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a WHERE n.nspname='public' AND p.proname='get_my_org_ids' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='authenticated') AND a.privilege_type='EXECUTE'"
}

DA5_BEFORE="$(direct_authed "$DB5")"
[[ "$DA5_BEFORE" == "0" ]] \
  || fail "the fixture is wrong: authenticated already holds ${DA5_BEFORE} DIRECT grant(s) on get_my_org_ids before the pair, so this case could not detect one being left behind."

run_pair "$DB5" "$DOWN"
RC5=$?
[[ $RC5 -eq 0 ]] || fail "the forward+rollback pair did not commit against the owner-only fixture (rc=${RC5}). apply: $(head -2 "$WORK/apply.err") down: $(head -2 "$WORK/down.err")"

DA5_AFTER="$(direct_authed "$DB5")"
[[ "$DA5_AFTER" == "0" ]] \
  || fail "THE ROLLBACK LEFT BEHIND A GRANT IT CREATED: authenticated held 0 DIRECT grants on get_my_org_ids before the pair and ${DA5_AFTER} after it. The forward file issued that grant and the rollback did not take it back, so the pre-state was not restored."
echo "  case 5  add-only rollback     -> forward-created grant taken back (0 before, 0 after)"

# ── 6. A SECOND CYCLE MUST NOT REPLAY A STALE PRE-STATE ──────────────────────
# The forward file captures the pre-state ONCE and keeps the original. If the
# rollback does not CONSUME that receipt, every later rollback replays the FIRST
# pre-state — so a deliberate security change made between cycles is silently undone
# by a procedure the operator believes is a rollback. The exact lifecycle an
# independent review (openrouter, 19/08/2026) described:
#   anon executable -> apply -> down -> operator MANUALLY revokes anon -> apply -> down
# A stale receipt grants anon EXECUTE again at the end. It must not.
DB6="$(newdb rbcycle)"
seed_unexposed "$DB6"
# Start EXPOSED, which is the production shape and what makes the stale receipt bite.
psql "$DB6" -X -q -v ON_ERROR_STOP=1 \
  -c "GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO anon" \
  >/dev/null 2>"$WORK/c6.err" \
  || fail "could not shape the exposed fixture for the cycle test: $(head -3 "$WORK/c6.err")"

anon_direct_prune() {
  pg_scalar "$1" "SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace, aclexplode(p.proacl) a WHERE n.nspname='public' AND p.proname='prune_integration_history' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='anon') AND a.privilege_type='EXECUTE'"
}

[[ "$(anon_direct_prune "$DB6")" == "1" ]] || fail "cycle fixture wrong: anon should hold a direct grant before cycle 1"

run_pair "$DB6" "$DOWN"
[[ $? -eq 0 ]] || fail "cycle 1 (apply+down) did not commit. apply: $(head -2 "$WORK/apply.err") down: $(head -2 "$WORK/down.err")"
[[ "$(anon_direct_prune "$DB6")" == "1" ]] \
  || fail "cycle 1 did not restore the exposure it recorded, so cycle 2 would prove nothing"

# The operator makes a DELIBERATE security change between cycles.
psql "$DB6" -X -q -v ON_ERROR_STOP=1 \
  -c "REVOKE EXECUTE ON FUNCTION public.prune_integration_history() FROM anon" \
  >/dev/null 2>&1
[[ "$(anon_direct_prune "$DB6")" == "0" ]] || fail "the manual revoke between cycles did not take"

run_pair "$DB6" "$DOWN"
[[ $? -eq 0 ]] || fail "cycle 2 (apply+down) did not commit. apply: $(head -2 "$WORK/apply.err") down: $(head -2 "$WORK/down.err")"

C6_AFTER="$(anon_direct_prune "$DB6")"
[[ "$C6_AFTER" == "0" ]] \
  || fail "A STALE RECEIPT WAS REPLAYED: an operator revoked anon between cycles, and after the second apply+down anon holds ${C6_AFTER} DIRECT grant(s) again. The rollback resurrected a pre-state that had been deliberately changed."
echo "  case 6  second cycle          -> the manual revoke SURVIVES (receipt consumed, not replayed)"

# ── 7. THE DOWN MIGRATION'S IDENTITY GUARD MUST ALSO REJECT OVERLOADS ────────
# The forward file's guard was fixed for this first, and the IDENTICAL guard in the
# down file was left standing — a second independent reviewer (gemini, 19/08/2026)
# found it. That is this branch's recurring shape: the cited line is patched and the
# class is not swept. This case covers the down file specifically, so the two guards
# cannot drift apart again.
DB7="$(newdb rbovl)"
for _sig in "a int" "a text" "a bool" "a numeric"; do
  psql "$DB7" -X -q -v ON_ERROR_STOP=1 \
    -c "CREATE FUNCTION public.custom_access_token_hook(${_sig}) RETURNS void LANGUAGE sql SECURITY DEFINER AS \$fn\$ SELECT NULL::void \$fn\$" \
    >/dev/null 2>"$WORK/c7.err" \
    || fail "could not seed the overload fixture for the down guard (${_sig}): $(head -2 "$WORK/c7.err")"
done
if psql "$DB7" -X -q -v ON_ERROR_STOP=1 -f "$DOWN" >/dev/null 2>"$WORK/c7d.err"; then
  fail "the ROLLBACK committed against a database holding FOUR OVERLOADS of one name and none of the other three. Overloads are not identities, and this is a break-glass file."
fi
grep -q 'expected all 4 privileged functions this file restores' "$WORK/c7d.err" \
  || fail "the rollback refused the overload database, but NOT on its identity guard. stderr: $(head -3 "$WORK/c7d.err")"
echo "  case 7  down-file overloads   -> refused (both guards count DISTINCT names)"

# ── 8. THE POST-CONDITION MUST COMPARE LIKE WITH LIKE ────────────────────────
# `_exposed` resolves live catalogue entries and requires SECURITY DEFINER;
# `_expected` used to select receipt rows by unanchored TEXT PREFIX with no definer
# test. A function recorded as anon-executable but NOT security definer therefore
# counted on the expected side and could never count on the exposed side, so a
# CORRECT rollback — one that put that grant back exactly as recorded — aborted
# with "the rollback did not take". This case is the rollback SUCCEEDING; the
# control below is it failing again with the prefix form restored.
DB8="$(newdb rbpred)"
seed_unexposed "$DB8"
psql "$DB8" -X -q -v ON_ERROR_STOP=1 >"$WORK/c8seed.out" 2>&1 <<'SQL'
DROP FUNCTION public.prune_integration_history();
-- NOT security definer, and anon may execute it. Legal, and outside the exposure
-- this lock exists to close.
CREATE FUNCTION public.prune_integration_history()
  RETURNS void LANGUAGE sql AS $fn$ SELECT NULL::void $fn$;
GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO anon;
SQL
[[ $? -eq 0 ]] || fail "could not shape the non-definer fixture for case 8: $(head -3 "$WORK/c8seed.out")"

[[ "$(anon_exec_count "$DB8")" == "0" ]] \
  || fail "the case 8 fixture is wrong: anon can execute a privileged DEFINER before the pair, so this case would be testing the wrong asymmetry."
[[ "$(anon_direct_prune "$DB8")" == "1" ]] \
  || fail "the case 8 fixture is wrong: anon does not hold the direct grant the receipt must record."

run_pair "$DB8" "$DOWN"
RC8=$?
[[ $RC8 -ne 1 ]] || fail "the forward migration did not commit against the non-definer fixture. stderr: $(head -3 "$WORK/apply.err")"
[[ $RC8 -ne 2 ]] \
  || fail "THE POST-CONDITION REJECTED A CORRECT ROLLBACK: the recorded pre-state was restored and the rollback still aborted, because the expected side counted a function the exposed side cannot count. stderr: $(head -3 "$WORK/down.err")"
[[ "$(anon_direct_prune "$DB8")" == "1" ]] \
  || fail "the rollback committed but did NOT put anon's recorded grant back, so case 8 would be green on a rollback that did nothing."
echo "  case 8  non-definer recorded  -> correct rollback COMMITS, grant restored (1 before, 1 after)"

# ── 8b. MUTATION CONTROL for case 8 ──────────────────────────────────────────
MUT8="$WORK/down-prefix-expected.sql"
python3 - "$DOWN" "$MUT8" <<'PY_MUT8'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
start = s.find("  SELECT count(DISTINCT r.object_id) INTO _expected")
assert start != -1, "could not locate the identity-resolved _expected query to mutate"
end = s.find(";\n", start)
assert end != -1, "could not locate the end of the _expected query"
legacy = """  SELECT count(DISTINCT object_id) INTO _expected
  FROM public.privileged_function_exposure_lock_receipt_20260819
  WHERE object_kind = 'function'
    AND has_execute
    AND grantee IN ('anon', '')
    AND object_id LIKE ANY (ARRAY['custom_access_token_hook%', 'before_user_created_hook%', 'prune_integration_history%'])"""
open(dst, 'w').write(s[:start] + legacy + s[end:])
print("case 8 mutant built")
PY_MUT8
[[ -s "$MUT8" ]] || fail "case 8 mutation control could not be built"
grep -q 'to_regprocedure(r.object_id)' "$MUT8" \
  && fail "case 8 mutation control is vacuous: the identity-resolved expected query is still present in the mutant."

DB8M="$(newdb rbpredm)"
seed_unexposed "$DB8M"
psql "$DB8M" -X -q -v ON_ERROR_STOP=1 >"$WORK/c8mseed.out" 2>&1 <<'SQL'
DROP FUNCTION public.prune_integration_history();
CREATE FUNCTION public.prune_integration_history()
  RETURNS void LANGUAGE sql AS $fn$ SELECT NULL::void $fn$;
GRANT EXECUTE ON FUNCTION public.prune_integration_history() TO anon;
SQL
[[ $? -eq 0 ]] || fail "could not shape the case 8 control fixture: $(head -3 "$WORK/c8mseed.out")"

run_pair "$DB8M" "$MUT8"
RC8M=$?
[[ $RC8M -eq 2 ]] \
  || fail "MUTATION CONTROL FAILED: with the unanchored text-prefix expected query restored, the rollback still committed against the non-definer fixture (rc=${RC8M}). Case 8 is therefore not attributable to the identity-resolved comparison."
grep -q 'does not match the recorded pre-state' "$WORK/down.err" \
  || fail "MUTATION CONTROL FAILED for the wrong reason: the mutant aborted, but not on the pre-state equality check. stderr: $(head -3 "$WORK/down.err")"
echo "  case 8b prefix-match control  -> the mutant rejects the same correct rollback (control is live)"

# ── 9. A PRIVILEGE THAT CANNOT BE RESTORED MUST NOT PASS AS RECOVERY ─────────
# The restore loop skips a receipt entry whose function or grantee role has since
# been dropped. Where the entry recorded a HELD privilege, that skip means the
# rollback returns a state different from the one it promised — and the only
# post-condition measures anon on the three definers, so a skipped grant on a
# dropped OVERLOAD (or a grant to authenticated/supabase_auth_admin) left nothing
# behind but a NOTICE on a terminal nobody reads during an outage.
DB9="$(newdb rblost)"
seed_unexposed "$DB9"
psql "$DB9" -X -q -v ON_ERROR_STOP=1 >"$WORK/c9seed.out" 2>&1 <<'SQL'
CREATE FUNCTION public.prune_integration_history(a int)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;
REVOKE ALL ON FUNCTION public.prune_integration_history(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_integration_history(int) TO anon;
SQL
[[ $? -eq 0 ]] || fail "could not shape the dropped-overload fixture for case 9: $(head -3 "$WORK/c9seed.out")"

psql "$DB9" -X -q -v ON_ERROR_STOP=1 -f "$APPLY" >"$WORK/c9a.out" 2>"$WORK/c9a.err" \
  || fail "the forward migration did not commit against the case 9 fixture: $(head -3 "$WORK/c9a.err")"
# The recorded grant's object disappears between apply and rollback. The identity
# guard still passes — all four DISTINCT names are present — so this case cannot be
# satisfied by that earlier throw.
psql "$DB9" -X -q -v ON_ERROR_STOP=1 -c "DROP FUNCTION public.prune_integration_history(int)" \
  >/dev/null 2>"$WORK/c9d.err" \
  || fail "could not drop the recorded overload for case 9: $(head -3 "$WORK/c9d.err")"

if psql "$DB9" -X -q -v ON_ERROR_STOP=1 -f "$DOWN" >"$WORK/c9r.out" 2>"$WORK/c9r.err"; then
  fail "THE ROLLBACK REPORTED RECOVERY WITHOUT PERFORMING IT: a grant the receipt recorded as HELD could not be restored — its function was gone — and the rollback committed anyway, because the only post-condition measures anon on the three definers."
fi
grep -q 'cannot be restored' "$WORK/c9r.err" \
  || fail "the rollback refused the dropped-overload database, but NOT on the unrestorable-entry guard, so that guard is unproven. stderr: $(head -3 "$WORK/c9r.err")"
grep -q 'prune_integration_history(integer)' "$WORK/c9r.err" \
  || fail "the unrestorable-entry guard fired but did not NAME the entry it could not restore, which is what an operator needs during a break-glass. stderr: $(head -3 "$WORK/c9r.err")"
echo "  case 9  unrestorable entry    -> refused, and the lost grant is named"

# ── 9b. MUTATION CONTROL for case 9 ──────────────────────────────────────────
MUT9="$WORK/down-no-unrestorable.sql"
python3 - "$DOWN" "$MUT9" <<'PY_MUT9'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
start = s.find("  IF array_length(_unrestorable, 1) > 0 THEN")
assert start != -1, "could not locate the unrestorable-entry guard to mutate"
end = s.find("  END IF;\n", start)
assert end != -1, "could not locate the end of the unrestorable-entry guard"
open(dst, 'w').write(s[:start] + s[end + len("  END IF;\n"):])
print("case 9 mutant built")
PY_MUT9
[[ -s "$MUT9" ]] || fail "case 9 mutation control could not be built"
grep -q 'cannot be restored' "$MUT9" \
  && fail "case 9 mutation control is vacuous: the unrestorable-entry guard is still present in the mutant."

DB9M="$(newdb rblostm)"
seed_unexposed "$DB9M"
psql "$DB9M" -X -q -v ON_ERROR_STOP=1 >"$WORK/c9mseed.out" 2>&1 <<'SQL'
CREATE FUNCTION public.prune_integration_history(a int)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT NULL::void $fn$;
REVOKE ALL ON FUNCTION public.prune_integration_history(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_integration_history(int) TO anon;
SQL
[[ $? -eq 0 ]] || fail "could not shape the case 9 control fixture: $(head -3 "$WORK/c9mseed.out")"
psql "$DB9M" -X -q -v ON_ERROR_STOP=1 -f "$APPLY" >/dev/null 2>"$WORK/c9ma.err" \
  || fail "the forward migration did not commit against the case 9 control fixture: $(head -3 "$WORK/c9ma.err")"
psql "$DB9M" -X -q -v ON_ERROR_STOP=1 -c "DROP FUNCTION public.prune_integration_history(int)" \
  >/dev/null 2>&1 || fail "could not drop the recorded overload for the case 9 control"

if ! psql "$DB9M" -X -q -v ON_ERROR_STOP=1 -f "$MUT9" >/dev/null 2>"$WORK/c9m.err"; then
  fail "MUTATION CONTROL FAILED: with the unrestorable-entry guard removed, the rollback STILL refused the dropped-overload database — so case 9 is not attributable to that guard. stderr: $(head -3 "$WORK/c9m.err")"
fi
echo "  case 9b missing-guard control -> the mutant commits the same partial restore (control is live)"

# ── 10. THE SAME GUARD MUST COVER RECORDED TABLES, NOT ONLY FUNCTIONS ────────
# Case 9 closed the partial-restore hole for functions and roles. The receipt also
# records RLS state for the two dated tables, and that branch was left emitting a
# NOTICE — the identical defect, one loop further down, found by an independent
# review (openrouter, 20/08/2026) in the round that reviewed case 9. Patching the
# cited line and not the class is this branch's signature defect, so the class is
# swept here and pinned so it cannot drift apart again.
DB10="$(newdb rbtbl)"
seed_unexposed "$DB10"
psql "$DB10" -X -q -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE public.founder_uid_migration_20260810 (id int)" \
  >/dev/null 2>"$WORK/c10.err" \
  || fail "could not seed the dated table for case 10: $(head -3 "$WORK/c10.err")"

psql "$DB10" -X -q -v ON_ERROR_STOP=1 -f "$APPLY" >/dev/null 2>"$WORK/c10a.err" \
  || fail "the forward migration did not commit against the case 10 fixture: $(head -3 "$WORK/c10a.err")"
[[ "$(pg_scalar "$DB10" "SELECT count(*)::text FROM public.privileged_function_exposure_lock_receipt_20260819 WHERE object_kind='table'")" == "1" ]] \
  || fail "the case 10 fixture is wrong: the receipt recorded no table, so this case could not detect a lost table restoration."

# The recorded table disappears between apply and rollback. Every function the
# identity guard checks is still present, so the refusal cannot come from there.
psql "$DB10" -X -q -v ON_ERROR_STOP=1 -c "DROP TABLE public.founder_uid_migration_20260810" \
  >/dev/null 2>"$WORK/c10d.err" \
  || fail "could not drop the recorded table for case 10: $(head -3 "$WORK/c10d.err")"

if psql "$DB10" -X -q -v ON_ERROR_STOP=1 -f "$DOWN" >/dev/null 2>"$WORK/c10r.err"; then
  fail "THE ROLLBACK REPORTED RECOVERY WITHOUT PERFORMING IT: a table whose RLS state the receipt recorded no longer exists, and the rollback committed anyway — consuming the receipt and destroying the only record of that pre-state. The function-only post-condition cannot see this."
fi
grep -q 'cannot be restored' "$WORK/c10r.err" \
  || fail "the rollback refused the dropped-table database, but NOT on the unrestorable-entry guard. stderr: $(head -3 "$WORK/c10r.err")"
grep -q 'founder_uid_migration_20260810' "$WORK/c10r.err" \
  || fail "the unrestorable-entry guard fired but did not NAME the table it could not restore. stderr: $(head -3 "$WORK/c10r.err")"
echo "  case 10 unrestorable table    -> refused, and the lost table is named"

# ── 10b. MUTATION CONTROL for case 10 ────────────────────────────────────────
MUT10="$WORK/down-table-notice.sql"
python3 - "$DOWN" "$MUT10" <<'PY_MUT10'
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
anchor = "    IF to_regclass(_r.object_id) IS NULL THEN"
start = s.find(anchor)
assert start != -1, "could not locate the table branch to mutate"
assert s.count(anchor) == 1, "the table-branch anchor is not unique"
end = s.find("    END IF;\n", start)
assert end != -1, "could not locate the end of the table branch"
legacy = """    IF to_regclass(_r.object_id) IS NULL THEN
      RAISE NOTICE 'rollback: % is in the receipt but no longer exists — skipped', _r.object_id;
      CONTINUE;
"""
open(dst, 'w').write(s[:start] + legacy + s[end:])
print("case 10 mutant built")
PY_MUT10
[[ -s "$MUT10" ]] || fail "case 10 mutation control could not be built"
grep -q 'the table no longer exists' "$MUT10" \
  && fail "case 10 mutation control is vacuous: the table branch's fatal handling is still present in the mutant."

DB10M="$(newdb rbtblm)"
seed_unexposed "$DB10M"
psql "$DB10M" -X -q -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE public.founder_uid_migration_20260810 (id int)" \
  >/dev/null 2>&1 || fail "could not seed the dated table for the case 10 control"
psql "$DB10M" -X -q -v ON_ERROR_STOP=1 -f "$APPLY" >/dev/null 2>"$WORK/c10ma.err" \
  || fail "the forward migration did not commit against the case 10 control fixture: $(head -3 "$WORK/c10ma.err")"
psql "$DB10M" -X -q -v ON_ERROR_STOP=1 -c "DROP TABLE public.founder_uid_migration_20260810" \
  >/dev/null 2>&1 || fail "could not drop the recorded table for the case 10 control"

if ! psql "$DB10M" -X -q -v ON_ERROR_STOP=1 -f "$MUT10" >/dev/null 2>"$WORK/c10m.err"; then
  fail "MUTATION CONTROL FAILED: with the table branch back to a NOTICE, the rollback STILL refused the dropped-table database — so case 10 is not attributable to that branch. stderr: $(head -3 "$WORK/c10m.err")"
fi
echo "  case 10b table-notice control -> the mutant commits the same lost restoration (control is live)"

echo "PASS  prove-rollback-fidelity"
echo "  the rollback restores the pre-state the forward migration OBSERVED,"
echo "  refuses to run without that record, and the old presumed-state restore"
echo "  demonstrably fails this gate."
