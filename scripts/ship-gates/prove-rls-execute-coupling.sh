#!/usr/bin/env bash
# Proves the load-bearing claim behind ship-board item 6 and FOUNDER-QUEUE F9:
#
#   Postgres checks function EXECUTE against the QUERYING role when it evaluates
#   an RLS policy expression. SECURITY DEFINER on the callee does NOT exempt it.
#
# Consequence: revoking `authenticated` EXECUTE on get_my_org_ids() makes every
# authenticated read of an org-membership-scoped table fail outright. That is why
# 2026-08-19-privileged-function-exposure-lock.sql deliberately RETAINS
# `authenticated` on that one function, and why the exposure gate cannot exit 0
# while its query 3 flags any definer executable by `authenticated`.
#
# Usage: scripts/ship-gates/prove-rls-execute-coupling.sh "<postgres-admin-uri>"
#
# ── WHY THIS IS STRUCTURED THE WAY IT IS ────────────────────────────────────
# Two independent review rounds broke the two previous designs:
#
#   round 5 (codex): the experiment lived in prove-rls-execute-coupling.sql and
#   the wrapper grepped three substrings out of psql's output. A mutant .sql
#   containing only three \echo lines printed PASS.
#
#   round 6 (codex): the experiment was moved INLINE, and the wrapper still
#   grepped seven substrings out of one output blob. The reviewer wrapped the
#   heredoc in `psql \if false` and appended seven literal SELECTs emitting the
#   expected markers. No schema, role, function, table, policy, grant, revoke,
#   failing read or transaction ran, and the gate exited 0.
#
# Both defects are the same: ONE text blob carried every claim, so one edit to
# the payload forged all of them at once. This revision removes the blob. Each
# step is its own psql invocation; each fact is fetched as a single scalar and
# compared HERE, in the shell; and the decisive assertion — that the read breaks
# after the revoke — is made on psql's EXIT STATUS plus a stderr file, not on a
# message grepped out of a transcript that also carries the success markers.
#
# SUPERSEDES, RATHER THAN DELETES, c3730bf00's position. That commit added a
# header paragraph declaring this P0 accepted-by-design — "a check cannot prove
# it was not itself edited", so the defence is the diff and the reviewer. That
# reasoning was sound for the design it described, and it is retained below in
# narrower form. What changed is that the specific attack it conceded no longer
# works: round 7's combined forgery — drop the revoke, replace the catalog
# oracle with a literal 'false', replace the post-revoke read with a literal
# error string — was run against this revision and exits 1, because the read is
# executed by the shell and judged on its EXIT STATUS, which a labelled SELECT
# cannot supply. The concession is therefore smaller than it was, and is stated
# at its true size rather than at the old one.
#
# What this still cannot defend against, stated plainly: a reviewer who edits
# THIS FILE. No control proves it was not itself rewritten. The difference is
# that forging a pass now requires rewriting the assertion block rather than
# swapping a payload it reads, which is a large diff aimed at the control
# itself. Treat any edit below as an edit to a control and review it as one.
#
# It also no longer touches a database it did not create: the experiment runs in
# a randomly-named disposable database, and the gate ABORTS rather than reusing
# or dropping a pre-existing one (round 6 P1: three gates force-dropped a fixed
# name and deleted unrelated data).
#
# Exits 0 only if ALL of the following hold, each read back as a scalar:
#   - the helper really is SECURITY DEFINER and the table really has RLS enabled
#   - exactly one policy exists over the table
#   - before the revoke, the role holds EXECUTE and the read returns exactly 1 row
#   - after the revoke, has_function_privilege is false
#   - after the revoke, the SAME read exits NON-ZERO naming the function
#   - the disposable database is gone afterwards
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

WORK="$(mktemp -d)"
cleanup() {
  local _rc=0
  pg_drop_disposable_db "$ADMIN" || _rc=1
  [[ $_rc -eq 0 ]] && rm -rf "$WORK"
  return $_rc
}
# CLASS SWEEP, 20/08/2026. An EXIT trap that RETURNS non-zero does NOT change the
# process exit status — bash restores the status that triggered the trap unless the
# handler exits explicitly. Fixed in two gates two rounds ago and left in three, which
# is this branch's signature defect committed while fixing an instance of it. An
# independent review found all three.
_on_exit() {
  local _rc=$?
  if ! cleanup; then
    echo "FAIL(cleanup): prove-rls-execute-coupling left scratch state behind; refusing to report a clean run." >&2
    [[ $_rc -eq 0 ]] && _rc=2
  fi
  exit "$_rc"
}
trap _on_exit EXIT

fail() {
  echo "FAIL  prove-rls-execute-coupling: $1"
  [[ -s "$WORK/err" ]] && { echo "── last stderr ──"; cat "$WORK/err"; }
  exit 1
}

pg_make_disposable_db "$ADMIN" "rlsproof" || exit 2
DB="$DISPOSABLE_URI"
CREATED_DB="$DISPOSABLE_DB"

ROLE="rlsproof_authenticated"

# ── build the experiment, one statement at a time ────────────────────────────
pg_exec "$DB" "$WORK/err" "CREATE SCHEMA rlsproof" \
  || fail "setup failed: could not create schema rlsproof"

# Roles are cluster-wide; name it per-run so parallel gates cannot collide.
ROLE="rlsproof_auth_${CREATED_DB##*_}"
pg_exec "$DB" "$WORK/err" "CREATE ROLE ${ROLE} NOLOGIN" \
  || fail "setup failed: could not create role ${ROLE}"
# Dropping the disposable database does not drop a cluster-wide role.
# The role is CLUSTER-WIDE, so dropping the database does not remove it — and an
# earlier revision suppressed every failure here with `|| true`, so a leaked role or
# database was invisible. Failures are now collected and reported; _on_exit re-raises.
cleanup() {
  local _rc=0
  psql "$DB" -X -q -c "DROP OWNED BY ${ROLE}" >/dev/null 2>&1 || true
  pg_drop_disposable_db "$ADMIN" || _rc=1
  if ! psql "$ADMIN" -X -q -c "DROP ROLE IF EXISTS ${ROLE}" >/dev/null 2>&1; then
    echo "WARNING: could not drop cluster-wide role ${ROLE} — it is LEAKED." >&2
    _rc=1
  fi
  [[ $_rc -eq 0 ]] && rm -rf "$WORK"
  return $_rc
}

pg_exec "$DB" "$WORK/err" "GRANT ${ROLE} TO current_user" \
  || fail "setup failed: could not grant ${ROLE} to current_user"

pg_exec "$DB" "$WORK/err" \
  "CREATE FUNCTION rlsproof.get_my_org_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS \$fn\$ SELECT '11111111-1111-1111-1111-111111111111'::uuid \$fn\$" \
  || fail "setup failed: could not create the SECURITY DEFINER helper"

pg_exec "$DB" "$WORK/err" "CREATE TABLE rlsproof.organizations (id uuid PRIMARY KEY)" \
  || fail "setup failed: could not create rlsproof.organizations"
pg_exec "$DB" "$WORK/err" \
  "INSERT INTO rlsproof.organizations (id) VALUES ('11111111-1111-1111-1111-111111111111')" \
  || fail "setup failed: could not seed rlsproof.organizations"
pg_exec "$DB" "$WORK/err" "ALTER TABLE rlsproof.organizations ENABLE ROW LEVEL SECURITY" \
  || fail "setup failed: could not enable RLS"

pg_exec "$DB" "$WORK/err" \
  "CREATE POLICY orgs_select ON rlsproof.organizations FOR SELECT TO ${ROLE} USING (id IN (SELECT rlsproof.get_my_org_ids()))" \
  || fail "setup failed: could not create the org-scoped policy"

pg_exec "$DB" "$WORK/err" "GRANT USAGE ON SCHEMA rlsproof TO ${ROLE}" \
  || fail "setup failed: could not grant schema usage"
pg_exec "$DB" "$WORK/err" "GRANT SELECT ON rlsproof.organizations TO ${ROLE}" \
  || fail "setup failed: could not grant SELECT"
pg_exec "$DB" "$WORK/err" "GRANT EXECUTE ON FUNCTION rlsproof.get_my_org_ids() TO ${ROLE}" \
  || fail "setup failed: could not grant EXECUTE"

# ── assert the setup, each as its own scalar read ────────────────────────────
V="$(pg_scalar "$DB" "SELECT p.prosecdef::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='rlsproof' AND p.proname='get_my_org_ids'")"
[[ "$V" == "true" ]] || fail "setup not established: the helper is not SECURITY DEFINER (prosecdef=${V:-<none>}). Nothing below would prove anything."

V="$(pg_scalar "$DB" "SELECT c.relrowsecurity::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='rlsproof' AND c.relname='organizations'")"
[[ "$V" == "true" ]] || fail "setup not established: row-level security is not enabled on the table (relrowsecurity=${V:-<none>})."

V="$(pg_scalar "$DB" "SELECT count(*)::text FROM pg_policies WHERE schemaname='rlsproof' AND tablename='organizations'")"
[[ "$V" == "1" ]] || fail "setup not established: expected exactly 1 policy over the table, found ${V:-<none>}."

V="$(pg_scalar "$DB" "SELECT has_function_privilege('${ROLE}', p.oid, 'EXECUTE')::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='rlsproof' AND p.proname='get_my_org_ids'")"
[[ "$V" == "true" ]] || fail "setup not established: ${ROLE} does not hold EXECUTE before the revoke (has_function_privilege=${V:-<none>})."

# ── half 1: the read works while EXECUTE is held ─────────────────────────────
# Run as the role. The count comes from the table itself, and psql must SUCCEED.
BEFORE="$(pg_scalar "$DB" "SET ROLE ${ROLE}; SELECT count(*)::text FROM rlsproof.organizations")"
BEFORE_RC=$?
[[ $BEFORE_RC -eq 0 ]] || fail "baseline missing: the authenticated read FAILED before the revoke (psql exit ${BEFORE_RC}). The second half would prove nothing."
[[ "$BEFORE" == "1" ]] || fail "baseline missing: the authenticated read must return exactly 1 row BEFORE the revoke, got '${BEFORE:-<none>}'."

# ── THE REVOKE UNDER TEST ────────────────────────────────────────────────────
pg_exec "$DB" "$WORK/err" "REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM PUBLIC" \
  || fail "the revoke could not be applied (PUBLIC)"
pg_exec "$DB" "$WORK/err" "REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM ${ROLE}" \
  || fail "the revoke could not be applied (${ROLE})"

# ── the revoke must have actually taken, per the catalog ─────────────────────
V="$(pg_scalar "$DB" "SELECT has_function_privilege('${ROLE}', p.oid, 'EXECUTE')::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='rlsproof' AND p.proname='get_my_org_ids'")"
[[ "$V" == "false" ]] || fail "the revoke did not take: has_function_privilege still reports '${V:-<none>}' after it."

# ── half 2: the SAME read must now FAIL, by exit status ──────────────────────
# This is the decisive assertion and it is deliberately NOT a grep over the
# success transcript. psql must exit non-zero, and its stderr must name the
# function. A run that quietly returns rows refutes the claim and fails here.
: > "$WORK/err"
if psql "$DB" -X -A -t -q -v ON_ERROR_STOP=1 \
     -c "SET ROLE ${ROLE}; SELECT count(*) FROM rlsproof.organizations" \
     >"$WORK/after.out" 2>"$WORK/err"; then
  fail "the read SUCCEEDED after the revoke (psql exit 0, rows: $(tr -d '[:space:]' <"$WORK/after.out")) — the claim is refuted, or the policy never called the helper."
fi
grep -q 'permission denied for function get_my_org_ids' "$WORK/err" \
  || fail "the read failed after the revoke, but NOT for the reason claimed. stderr did not name 'permission denied for function get_my_org_ids'."

# ── nothing persisted ────────────────────────────────────────────────────────
pg_drop_disposable_db "$ADMIN"
LEFT="$(pg_scalar "$ADMIN" "SELECT count(*) FROM pg_database WHERE datname='${CREATED_DB}'")"
[[ "$LEFT" == "0" ]] \
  || fail "cleanup failed: the disposable database ${CREATED_DB} still exists. Refusing to report success."

echo "PASS  prove-rls-execute-coupling"
echo "  disposable database:  ${CREATED_DB} (created by this run, now dropped)"
echo "  setup, read back as scalars: prosecdef=t, relrowsecurity=t, policies=1, EXECUTE=t"
echo "  before revoke: authenticated read exited 0 and returned 1 row"
echo "  after  revoke: has_function_privilege=f, and the same read exited NON-ZERO"
echo "                 with 'permission denied for function get_my_org_ids' on stderr"
