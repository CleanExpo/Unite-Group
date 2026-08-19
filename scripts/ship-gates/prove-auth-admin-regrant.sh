#!/usr/bin/env bash
# Proves the supabase_auth_admin re-grant in
# docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql is LOAD-BEARING
# — not merely present.
#
# WHY THIS EXISTS SEPARATELY. repro-prod-exposure.sh makes the same claim at its
# step 8, but the repro exits 1 at step 4 on the deliberate get_my_org_ids row, so
# steps 5-8 never run. The claim was therefore documented as proven while its only
# control was unreachable — and the re-grant was in fact deleted in e964ab9bf and
# shipped that way until an independent review caught it. This gate reaches the
# claim without depending on step 4's verdict.
#
# THE LOAD-BEARING SHAPE. Where supabase_auth_admin holds an EXPLICIT grant, the
# fix never revokes it, so a post-fix presence check passes even with the re-grant
# deleted — the mutant survives. The state that matters is the one production
# actually exhibits for prune_integration_history: the role reaching the function
# through PUBLIC ALONE, with no direct grant. There, `REVOKE ALL ... FROM PUBLIC`
# strips it, and only the explicit re-grant issued afterwards saves every login.
#
# Usage: scripts/ship-gates/prove-auth-admin-regrant.sh "<admin-postgres-uri>"
#
# Exits 0 only if BOTH halves hold:
#   - with the re-grant present:  apply succeeds and supabase_auth_admin still
#     holds EXECUTE on both hooks
#   - with the re-grant deleted:  the apply ABORTS (post-condition raises), so a
#     lockout can never commit
#
# Builds and drops its own scratch database. Never touches an existing one.

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
[[ -f "$FIX" ]] || { echo "cannot run: fix not found at $FIX" >&2; exit 2; }

DB="ship_gate_regrant"
BASE="${ADMIN%/*}"
SCRATCH="$BASE/$DB"
WORK="$(mktemp -d)"
trap 'psql -X -q -d "$ADMIN" -c "DROP DATABASE IF EXISTS $DB (FORCE)" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

fail() { echo "FAIL  prove-auth-admin-regrant: $*"; exit 1; }

# ── seed: the PUBLIC-only shape, with NO direct grant to supabase_auth_admin ──
seed() {
  psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "DROP DATABASE IF EXISTS $DB (FORCE)" >/dev/null 2>&1
  psql -X -q -v ON_ERROR_STOP=1 -d "$ADMIN" -c "CREATE DATABASE $DB" >/dev/null 2>&1 \
    || fail "could not create scratch database $DB"
  psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" >/dev/null 2>&1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT event $fn$;
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $fn$ SELECT NULL::uuid WHERE false $fn$;

-- PUBLIC-only: supabase_auth_admin reaches the hooks through PUBLIC and holds
-- NO direct grant. This is the state the re-grant exists to survive.
REVOKE ALL ON FUNCTION public.custom_access_token_hook(jsonb) FROM supabase_auth_admin;
REVOKE ALL ON FUNCTION public.before_user_created_hook(jsonb) FROM supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.before_user_created_hook(jsonb) TO PUBLIC;
SQL
}

direct_grants() {
  psql -X -A -t -q -d "$SCRATCH" -c "
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('custom_access_token_hook','before_user_created_hook')
      AND p.proacl::text LIKE '%supabase_auth_admin=%';"
}

hooks_executable() {
  psql -X -A -t -q -d "$SCRATCH" -c "
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('custom_access_token_hook','before_user_created_hook')
      AND has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE');"
}

# ── half 1: the real file must apply, and login must survive ──────────────────
seed
[[ "$(direct_grants)" == "0" ]] \
  || fail "seed is wrong: supabase_auth_admin holds a DIRECT grant, so the re-grant would not be load-bearing and this gate would prove nothing"

psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -f "$FIX" >/dev/null 2>&1 \
  || fail "the real fix failed to apply against the PUBLIC-only seed"

[[ "$(hooks_executable)" == "2" ]] \
  || fail "after the real fix, supabase_auth_admin does NOT hold EXECUTE on both hooks — every login would break"

# ── half 2: delete the re-grant; the apply MUST abort ─────────────────────────
python3 - "$FIX" "$WORK/mutant.sql" <<'PY'
import re, sys
src = open(sys.argv[1]).read()
# Remove ONLY the DO block that issues the re-grant. Matching on the GRANT
# statement itself, not on the role name, so the revoke block (which also
# mentions the role, in a comment) cannot be hit by mistake.
blocks = re.findall(r"DO \$\$.*?\n\$\$;\n", src, re.S)
target = [b for b in blocks if "GRANT EXECUTE ON FUNCTION %s TO supabase_auth_admin" in b]
if len(target) != 1:
    sys.exit("mutant construction failed: expected exactly 1 re-grant block, found %d" % len(target))
out = src.replace(target[0], "-- MUTANT: re-grant DO block deleted\n", 1)
if out == src:
    sys.exit("mutant construction failed: replacement did not apply")
open(sys.argv[2], "w").write(out)
PY
[[ $? -eq 0 ]] || fail "could not construct the mutant"

grep -q 'GRANT EXECUTE ON FUNCTION %s TO supabase_auth_admin' "$WORK/mutant.sql" \
  && fail "mutant still contains the re-grant — the mutation did not take, so half 2 proves nothing"

seed
if psql -X -q -v ON_ERROR_STOP=1 -d "$SCRATCH" -f "$WORK/mutant.sql" >"$WORK/mutant.out" 2>&1; then
  fail "MUTANT SURVIVED — the fix applied WITHOUT the re-grant and committed. supabase_auth_admin would lose EXECUTE and every login would break, with nothing to stop it."
fi

grep -q 'post-condition failed: supabase_auth_admin lost EXECUTE' "$WORK/mutant.out" \
  || fail "mutant aborted, but not on the lockout post-condition — the abort may be incidental. Output: $(head -5 "$WORK/mutant.out")"

echo "PASS  prove-auth-admin-regrant"
echo "  seed: supabase_auth_admin reaches both hooks via PUBLIC alone (0 direct grants)"
echo "  with re-grant:    fix applies, supabase_auth_admin holds EXECUTE on 2/2 hooks"
echo "  without re-grant: apply ABORTS on 'post-condition failed: supabase_auth_admin lost EXECUTE'"
echo "  the re-grant is load-bearing, and its absence cannot commit"
