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
  if [[ $_failed -eq 1 ]]; then
    echo "WARNING: the list of databases this run created is kept at ${DBS_FILE} for retry; $WORK was NOT removed." >&2
    return 1
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() { echo "FAIL  prove-rollback-fidelity: $1"; exit 1; }

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

echo "PASS  prove-rollback-fidelity"
echo "  the rollback restores the pre-state the forward migration OBSERVED,"
echo "  refuses to run without that record, and the old presumed-state restore"
echo "  demonstrably fails this gate."
