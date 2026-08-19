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
# Usage: scripts/ship-gates/prove-rls-execute-coupling.sh "<postgres-uri>"
#
# WHY THE SQL IS INLINE AND NOT A SEPARATE FILE. An earlier revision read the
# experiment from prove-rls-execute-coupling.sql and authenticated the run by
# grepping three substrings out of psql's output. An independent review (codex,
# 19/08/2026) broke it in one move: a "mutant" SQL file containing nothing but
#   \echo BEFORE_REVOKE_ROWS=1
#   \echo permission denied for function get_my_org_ids
#   \echo ROLLBACK
# created no schema, role, function, table, policy, grant or transaction, and the
# wrapper printed PASS. The gate authenticated forgeable strings, not the
# experiment. The SQL now lives in this file, so there is no separate artefact to
# swap, and the assertions below check catalog state rather than echoed text.
#
# Exits 0 only if ALL of the following hold, each read back from the database:
#   - the helper really is SECURITY DEFINER and the table really has RLS enabled
#   - before the revoke, the authenticated read returns exactly 1 row
#   - after the revoke, the same read fails with "permission denied for function"
#   - the role really has lost EXECUTE (catalog check, not message text)
#   - nothing persists: the schema and role are gone afterwards
set -uo pipefail

URI="${1:-}"
if [[ -z "$URI" ]]; then
  echo "usage: $0 \"<postgres-uri>\"" >&2
  exit 2
fi
command -v psql >/dev/null 2>&1 || { echo "cannot run: psql not on PATH" >&2; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail() {
  echo "FAIL  prove-rls-execute-coupling: $1"
  [[ -s "$WORK/out" ]] && { echo "── psql output ──"; cat "$WORK/out"; }
  exit 1
}

# One transaction, rolled back. Every marker below is printed by a SELECT over
# catalog or table state — never by \echo — so the marker cannot appear unless
# the statement that produces it actually ran.
psql "$URI" -X -A -t -q -v ON_ERROR_STOP=0 >"$WORK/out" 2>&1 <<'SQL'
BEGIN;

CREATE SCHEMA rlsproof;
CREATE ROLE rlsproof_authenticated NOLOGIN;
GRANT rlsproof_authenticated TO current_user;

-- The tenancy helper, exactly as production has it: SECURITY DEFINER.
CREATE FUNCTION rlsproof.get_my_org_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
AS $fn$ SELECT '11111111-1111-1111-1111-111111111111'::uuid $fn$;

CREATE TABLE rlsproof.organizations (id uuid PRIMARY KEY);
INSERT INTO rlsproof.organizations (id) VALUES ('11111111-1111-1111-1111-111111111111');
ALTER TABLE rlsproof.organizations ENABLE ROW LEVEL SECURITY;

-- Org-membership-scoped policy that CALLS the definer, as production does.
CREATE POLICY orgs_select ON rlsproof.organizations
  FOR SELECT TO rlsproof_authenticated
  USING (id IN (SELECT rlsproof.get_my_org_ids()));

GRANT USAGE ON SCHEMA rlsproof TO rlsproof_authenticated;
GRANT SELECT ON rlsproof.organizations TO rlsproof_authenticated;
GRANT EXECUTE ON FUNCTION rlsproof.get_my_org_ids() TO rlsproof_authenticated;

-- Read back the SETUP from the catalog. A forged run cannot produce these.
SELECT 'SETUP_DEFINER=' || p.prosecdef::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'rlsproof' AND p.proname = 'get_my_org_ids';
SELECT 'SETUP_RLS=' || c.relrowsecurity::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'rlsproof' AND c.relname = 'organizations';
SELECT 'SETUP_POLICIES=' || count(*)::text FROM pg_policies
 WHERE schemaname = 'rlsproof' AND tablename = 'organizations';
SELECT 'SETUP_EXECUTE=' || has_function_privilege('rlsproof_authenticated', p.oid, 'EXECUTE')::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'rlsproof' AND p.proname = 'get_my_org_ids';

-- BEFORE: the role HOLDS EXECUTE. The count comes from the table itself.
SET LOCAL ROLE rlsproof_authenticated;
SELECT 'BEFORE_REVOKE_ROWS=' || count(*)::text FROM rlsproof.organizations;
RESET ROLE;

-- ── THE REVOKE UNDER TEST ───────────────────────────────────────────────────
REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM rlsproof_authenticated;

-- Catalog proof that the privilege is actually gone, independent of any message.
SELECT 'AFTER_EXECUTE=' || has_function_privilege('rlsproof_authenticated', p.oid, 'EXECUTE')::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'rlsproof' AND p.proname = 'get_my_org_ids';

-- AFTER: same read, same role. Expect: permission denied for function.
SET LOCAL ROLE rlsproof_authenticated;
SELECT 'AFTER_REVOKE_ROWS=' || count(*)::text FROM rlsproof.organizations;
RESET ROLE;

ROLLBACK;
SQL

OUT="$(cat "$WORK/out")"
has() { grep -qF "$1" <<<"$OUT"; }

# ── the experiment must have been BUILT ──────────────────────────────────────
has 'SETUP_DEFINER=t'  || fail "setup not established: the helper is not SECURITY DEFINER (no SETUP_DEFINER=t). Nothing below proves anything."
has 'SETUP_RLS=t'      || fail "setup not established: row-level security is not enabled on the table (no SETUP_RLS=t)."
has 'SETUP_POLICIES=1' || fail "setup not established: expected exactly 1 policy over the table (no SETUP_POLICIES=1)."
has 'SETUP_EXECUTE=t'  || fail "setup not established: the role does not hold EXECUTE before the revoke (no SETUP_EXECUTE=t)."

# ── half 1: the read works while EXECUTE is held ─────────────────────────────
has 'BEFORE_REVOKE_ROWS=1' \
  || fail "baseline missing: the authenticated read must return exactly 1 row BEFORE the revoke, or the second half proves nothing."

# ── the revoke must have actually taken, per the catalog ─────────────────────
has 'AFTER_EXECUTE=f' \
  || fail "the revoke did not take: has_function_privilege still reports EXECUTE after it (no AFTER_EXECUTE=f)."

# ── half 2: the same read now breaks, naming the function ────────────────────
has 'permission denied for function get_my_org_ids' \
  || fail "claim NOT reproduced: expected 'permission denied for function get_my_org_ids' after the revoke."

# ── and it must have broken, not quietly returned rows ───────────────────────
if has 'AFTER_REVOKE_ROWS='; then
  fail "the read SUCCEEDED after the revoke — the claim is refuted, or the policy never called the helper."
fi

# ── nothing persisted ────────────────────────────────────────────────────────
LEFT="$(psql "$URI" -X -A -t -q -c "SELECT count(*) FROM pg_namespace WHERE nspname='rlsproof';" 2>/dev/null | tr -d '[:space:]')"
[[ "$LEFT" == "0" ]] \
  || fail "the transaction did not roll back: schema rlsproof still exists. Refusing to report success."

echo "PASS  prove-rls-execute-coupling"
echo "  setup read back from catalog: SECURITY DEFINER, RLS on, 1 policy, EXECUTE held"
echo "  before revoke: authenticated read returned 1 row"
echo "  after  revoke: has_function_privilege=false AND permission denied for function get_my_org_ids"
echo "  transaction rolled back; schema rlsproof absent"
