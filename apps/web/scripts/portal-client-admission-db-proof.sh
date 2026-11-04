#!/bin/bash
# Portal client admission proof (BRII first client) on a THROWAWAY local Postgres cluster. Never touches any real
# project: the cluster listens on a private unix socket only (no TCP), lives in a temp directory, and is deleted on exit.
#   scripts/portal-client-admission-db-proof.sh
# Needs Postgres server binaries (initdb, pg_ctl, postgres; any of 15-17) — set PG_BIN to override discovery.
# Steps: baseline (the hole is real) -> migration twice -> full proof -> rollback restores the exact prior catalogue
# -> re-apply -> planted-defect controls (each mutant must turn the proof red).
# Prints PORTAL_CLIENT_ADMISSION_DB_PROOF_ALL_PASS and exits 0 only when every step held.
set -u
APP="$(cd "$(dirname "$0")/.." && pwd)"
M="$APP/supabase/migrations"
T="$APP/supabase/tests"
ADMIT="$M/20261104040000_portal_client_admission.sql"
ROLLBACK="$APP/supabase/manual-applies/2026-11-04_portal_client_admission_rollback.sql"
BASE_MIGS=(
  "$M/20260620000000_founder_notifications.sql"
  "$M/20260620010000_auth_signup_allowlist.sql"
  "$M/20261102180000_portal_change_requests.sql"
  "$M/20261102190000_portal_entitlements.sql"
  "$M/20261102190100_portal_invite_codes.sql"
  "$M/20261103120000_portal_owner_tenant_from_membership.sql"
)
FIXTURE="$T/portal_client_admission_crm_fixture.sql"
BASELINE="$T/portal_client_admission_baseline.sql"
PROOF="$T/portal_client_admission_proof.sql"

if [ -z "${PG_BIN:-}" ]; then
  for d in /usr/lib/postgresql/17/bin /usr/lib/postgresql/16/bin /usr/lib/postgresql/15/bin "$(pg_config --bindir 2>/dev/null)"; do
    [ -x "$d/initdb" ] && PG_BIN="$d" && break
  done
fi
[ -n "${PG_BIN:-}" ] && [ -x "$PG_BIN/initdb" ] || { echo "FAIL  no Postgres server binaries (set PG_BIN)"; exit 2; }
for f in "$ADMIT" "$ROLLBACK" "${BASE_MIGS[@]}" "$FIXTURE" "$BASELINE" "$PROOF"; do
  [ -f "$f" ] || { echo "FAIL  missing $f"; exit 2; }
done

WORK="$(mktemp -d /tmp/portal-admission-proof.XXXXXX)"
chmod 755 "$WORK"
AS=()
if [ "$(id -u)" = 0 ]; then chown postgres "$WORK" && AS=(runuser -u postgres --); fi # initdb refuses to run as root
DATA="$WORK/data"
cleanup() {
  rc=$?
  "${AS[@]}" "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1
  rm -rf "$WORK"
  exit $rc
}
trap cleanup EXIT
"${AS[@]}" "$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null 2>"$WORK/initdb.err" \
  || { echo "FAIL  initdb"; cat "$WORK/initdb.err"; exit 2; }
"${AS[@]}" "$PG_BIN/pg_ctl" -D "$DATA" -l "$WORK/server.log" -w \
  -o "-c listen_addresses='' -k $WORK -c fsync=off" start >/dev/null \
  || { echo "FAIL  postgres did not start"; cat "$WORK/server.log"; exit 2; }
echo "throwaway postgres $("$PG_BIN/postgres" --version | awk '{print $3}') on unix socket $WORK (no TCP)"

PSQL() { "$PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$WORK" -U postgres "$@"; }
PSQL -d postgres >/dev/null <<'SQL' || { echo "FAIL  roles"; exit 2; }
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_auth_admin nologin;
SQL

fresh_db() { # $1 = name. Stubs the Supabase surface: auth schema, auth.uid/jwt/role, and Supabase's default grants.
  PSQL -d postgres -c "create database $1" >/dev/null || return 1
  PSQL -d "$1" >/dev/null <<'SQL'
create extension if not exists pgcrypto;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', '') $$;
grant usage on schema public, auth to anon, authenticated, service_role, supabase_auth_admin;
grant execute on function auth.uid(), auth.jwt(), auth.role() to anon, authenticated, service_role, supabase_auth_admin;
grant select on auth.users to supabase_auth_admin;
-- Supabase grants every new public table, sequence and function to the API roles; the exposure depends on it.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL
}

FAILS=0
apply() { # db, file
  PSQL -d "$1" < "$2" >/dev/null 2>"$WORK/apply.err" \
    || { echo "FAIL  apply $(basename "$2") to $1"; tail -5 "$WORK/apply.err"; FAILS=$((FAILS+1)); return 1; }
}
build() { # db: base migrations + CRM fixture
  fresh_db "$1" || { echo "FAIL  create $1"; exit 2; }
  local f; for f in "${BASE_MIGS[@]}" "$FIXTURE"; do apply "$1" "$f" || return 1; done
}
run_marker() { # label, db, file, marker -> 0 when the marker printed and psql exited 0
  local out rc
  out="$(PSQL -d "$2" -t -A < "$3" 2>&1)"; rc=$?
  if [ $rc -eq 0 ] && echo "$out" | grep -qx "$4"; then return 0; fi
  echo "$out" | grep -E 'ERROR|VALUE|ALLOWED|WRONG' | head -3 > "$WORK/last.err"
  return 1
}
expect_pass() { # label, db, file, marker
  if run_marker "$@"; then echo "PASS  $1"; else echo "FAIL  $1"; cat "$WORK/last.err"; FAILS=$((FAILS+1)); fi
}
# Semantic catalogue fingerprint: every public policy, function body + EXECUTE matrix, relation privilege matrix, trigger.
fingerprint() {
  PSQL -d "$1" -t -A <<'SQL'
with r(role) as (values ('anon'), ('authenticated'), ('service_role'), ('supabase_auth_admin'))
select * from (
  select 'policy|' || tablename || '|' || policyname || '|' || permissive || '|' || roles::text || '|' || cmd
         || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '') as line
  from pg_policies where schemaname = 'public'
  union all
  select 'function|' || p.oid::regprocedure::text || '|' || md5(p.prosrc) || '|' || p.prosecdef::text || '|' ||
         (select string_agg(r.role || '=' || has_function_privilege(r.role, p.oid, 'execute')::text, ',' order by r.role) from r)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all
  select 'relation|' || c.relname || '|' ||
         (select string_agg(r.role || '=' || has_table_privilege(r.role, c.oid, 'select')::text || '/' ||
                 has_table_privilege(r.role, c.oid, 'insert')::text || '/' || has_table_privilege(r.role, c.oid, 'update')::text
                 || '/' || has_table_privilege(r.role, c.oid, 'delete')::text, ',' order by r.role) from r)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  union all
  select 'trigger|' || tgrelid::regclass::text || '|' || tgname from pg_trigger where not tgisinternal
) s order by 1;
SQL
}

# 1. baseline: the hole is real and staff behaviour is recorded
build main || exit 1
expect_pass "baseline: signed-in stranger reads/writes the CRM, definer views leak, old hooks refuse the client" main "$BASELINE" PORTAL_CLIENT_ADMISSION_BASELINE_PASS
fingerprint main > "$WORK/before.txt"

# 2. the migration applies twice (idempotent), then the full proof
apply main "$ADMIT" && apply main "$ADMIT" && echo "PASS  migration applies twice"
expect_pass "proof: staff unchanged; client sees nothing outside the portal; hooks; notifications; anon untouched; offboarding" main "$PROOF" PORTAL_CLIENT_ADMISSION_PROOF_PASS

# 3. rollback on a fresh copy restores the exact prior catalogue, the baseline holds again, and re-apply works
build rb || exit 1
fingerprint rb > "$WORK/rb-before.txt"
apply rb "$ADMIT"
fingerprint rb > "$WORK/rb-applied.txt"
if cmp -s "$WORK/rb-before.txt" "$WORK/rb-applied.txt"; then echo "FAIL  the migration changed nothing in the catalogue"; FAILS=$((FAILS+1)); fi
apply rb "$ROLLBACK" && apply rb "$ROLLBACK" && echo "PASS  rollback applies twice"
fingerprint rb > "$WORK/rb-after.txt"
if diff "$WORK/rb-before.txt" "$WORK/rb-after.txt" > "$WORK/rb.diff"; then
  echo "PASS  rollback restores the prior catalogue exactly ($(wc -l < "$WORK/rb-before.txt") policies/functions/grants/triggers compared)"
else
  echo "FAIL  rollback left the catalogue different:"; head -20 "$WORK/rb.diff"; FAILS=$((FAILS+1))
fi
expect_pass "baseline holds again after rollback" rb "$BASELINE" PORTAL_CLIENT_ADMISSION_BASELINE_PASS
apply rb "$ADMIT" && expect_pass "proof after rollback + re-apply" rb "$PROOF" PORTAL_CLIENT_ADMISSION_PROOF_PASS

# 4. planted defects: each mutant of the migration must turn the proof red (a check that cannot fail is not a control)
mutant() { # label, sed expression applied to the migration
  local name="mut$RANDOM"
  sed -e "$2" "$ADMIT" > "$WORK/mutant.sql"
  if cmp -s "$ADMIT" "$WORK/mutant.sql"; then echo "FAIL  mutant did not change the migration: $1"; FAILS=$((FAILS+1)); return; fi
  build "$name" || return
  # a mutant that fails to apply proves nothing about the proof: that is a harness defect, not a red result
  if ! PSQL -d "$name" < "$WORK/mutant.sql" >/dev/null 2>&1; then echo "FAIL  mutant does not apply: $1"; FAILS=$((FAILS+1)); return; fi
  if run_marker "$1" "$name" "$PROOF" PORTAL_CLIENT_ADMISSION_PROOF_PASS; then
    echo "FAIL  proof stayed green on mutant: $1"; FAILS=$((FAILS+1))
  else
    echo "RED-AS-EXPECTED  $1 — $(head -1 "$WORK/last.err" | sed 's/^.*ERROR: *//' | cut -c1-110)"
  fi
}
mutant "gate is permissive (does nothing)" "s/as restrictive for all to authenticated/as permissive for all to authenticated/"
mutant "gate skips every portal-like name" "s/not like 'portal\\\\_%'/not like 'portal%'/"
mutant "gate skips partitioned tables" "s/c.relkind in ('r', 'p')/c.relkind in ('r')/"
mutant "is_staff true for anyone" "s/where a.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))/where true/"
mutant "definer view left readable" "/  public.metrics_rollup_latest,/d"
mutant "views keep write privileges (select-only revoke)" "s/^revoke all on\$/revoke select on/"
mutant "prune left callable" "/revoke execute on function public.prune_integration_history()/d"
mutant "set_app_tenant left callable" "/revoke execute on function public.set_app_tenant(text)/d"
mutant "hooks left callable by users" "/revoke execute on function public.before_user_created_hook(jsonb) from/d"
mutant "signup hook admits unbound invites" "s/where lower(trim(c.bound_email)) = _email/where (c.bound_email is null or lower(trim(c.bound_email)) = _email)/"
mutant "hooks ignore expiry" "s/and c.expires_at > now()/and true/"
mutant "hooks ignore revocation" "s/and c.revoked_at is null/and true/"
mutant "hooks accept a redeemed invite" "s/and not exists (select 1 from public.portal_invite_redemptions r where r.code_id = c.id)/and true/"
mutant "token hook admits every account" "s/or exists (select 1 from public.portal_tenant_members m where m.user_id = _user_id)/or true/"
mutant "no notification on submit" "s/after insert or update of status on/after update of status on/"
mutant "notification on unchanged status" "s/if tg_op = 'UPDATE' and new.status is not distinct from old.status then/if false then/"
mutant "client notified too" "s/join public.auth_allowlist a on a.email = lower(u.email);/where true;/"

# 4a. the fail-closed guard: with row security off on any public table the migration must refuse to apply
build rlsoff || exit 1
PSQL -d rlsoff -c "alter table public.event_log_2026 disable row level security" >/dev/null
if PSQL -d rlsoff < "$ADMIT" >/dev/null 2>"$WORK/rlsoff.err"; then
  echo "FAIL  migration applied although row security was off on a partition"; FAILS=$((FAILS+1))
elif grep -q "row security is off on public table(s): event_log_2026" "$WORK/rlsoff.err"; then
  echo "PASS  migration refuses to run while any public table has row security off"
else echo "FAIL  migration failed for the wrong reason:"; cat "$WORK/rlsoff.err"; FAILS=$((FAILS+1)); fi
sed -e "s/if v_open is not null then/if false then/" "$ADMIT" > "$WORK/noguard.sql"
if cmp -s "$ADMIT" "$WORK/noguard.sql"; then echo "FAIL  guard mutant did not change the migration"; FAILS=$((FAILS+1))
elif PSQL -d rlsoff < "$WORK/noguard.sql" >/dev/null 2>&1; then echo "RED-AS-EXPECTED  without the guard the migration applies over a table the gate cannot protect"
else echo "FAIL  guard mutant failed to apply, so the guard check proves nothing"; FAILS=$((FAILS+1)); fi

# 4b. rollback mutant: a rollback that forgets the hook grants must fail the catalogue comparison
sed -e "/grant execute on function public.before_user_created_hook(jsonb) to anon, authenticated/d" \
    -e "/grant execute on function public.custom_access_token_hook(jsonb) to anon, authenticated/d" "$ROLLBACK" > "$WORK/rb-mutant.sql"
if cmp -s "$ROLLBACK" "$WORK/rb-mutant.sql"; then echo "FAIL  rollback mutant did not change the rollback"; FAILS=$((FAILS+1)); else
  build rbmut || exit 1
  fingerprint rbmut > "$WORK/rbm-before.txt"
  apply rbmut "$ADMIT" && apply rbmut "$WORK/rb-mutant.sql"
  fingerprint rbmut > "$WORK/rbm-after.txt"
  if cmp -s "$WORK/rbm-before.txt" "$WORK/rbm-after.txt"; then echo "FAIL  catalogue comparison stayed green on a rollback that drops hook grants"; FAILS=$((FAILS+1))
  else echo "RED-AS-EXPECTED  rollback that forgets hook grants is caught by the catalogue comparison"; fi
fi

if [ $FAILS -eq 0 ]; then echo "PORTAL_CLIENT_ADMISSION_DB_PROOF_ALL_PASS"; exit 0; fi
echo "PORTAL_CLIENT_ADMISSION_DB_PROOF_FAILURES=$FAILS"; exit 1
