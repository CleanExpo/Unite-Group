#!/bin/bash
# Portal client admission proof (BRII first client) on a THROWAWAY local Postgres cluster. Never touches any real
# project: the cluster listens on a private unix socket only (no TCP), lives in a temp directory, and is deleted on exit.
#   scripts/portal-client-admission-db-proof.sh
# Needs Postgres server binaries (initdb, pg_ctl, postgres; any of 15-17) — set PG_BIN to override discovery.
# Steps: baseline (the hole is real) -> migration twice -> full proof -> rollback restores the exact prior catalogue
# -> re-apply -> planted-defect controls (each mutant must turn the proof red).
# Prints PORTAL_CLIENT_ADMISSION_DB_PROOF_ALL_PASS and exits 0 only when every step held.
# Limit: the throwaway cluster's postgres is a superuser (Supabase's has bypassrls but is not superuser). Row-security
# behaviour is comparable; privilege gaps inside SECURITY DEFINER bodies are NOT covered here. The definer bodies read
# only what the production hooks already read (auth.users, auth_allowlist) plus founder_notifications.
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
  -o "-c listen_addresses='' -k $WORK -c fsync=off -c max_connections=120 -c max_locks_per_transaction=64 -c unix_socket_permissions=0700" start >/dev/null \
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
expect_pass "baseline: signed-in stranger reads/writes the CRM (tables and views), runs owner-rights maintenance; old hooks refuse the client" main "$BASELINE" PORTAL_CLIENT_ADMISSION_BASELINE_PASS
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
mutant "gate skips every portal-like name" "s/^      and c.relname !~ '^portal_'\$/      and c.relname !~ '^portal'/"
mutant "gate skips partitioned tables" "s/c.relkind in ('r', 'p')/c.relkind in ('r')/"
mutant "is_staff true for anyone" "s/where a.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))/where true/"
mutant "prune left callable" "s/array\['public.prune_integration_history()', /array[/"
mutant "set_app_tenant left callable" "s/, 'public.set_app_tenant(text)'\]/]/"
mutant "hooks left callable by users" "/revoke execute on function public.before_user_created_hook(jsonb) from/d"
mutant "signup hook admits unbound invites" "s/where lower(trim(c.bound_email)) = _email/where (c.bound_email is null or lower(trim(c.bound_email)) = _email)/"
mutant "hooks ignore expiry" "s/and c.expires_at > now()/and true/"
mutant "hooks ignore revocation" "s/and c.revoked_at is null/and true/"
mutant "hooks accept a redeemed invite" "s/and not exists (select 1 from public.portal_invite_redemptions r where r.code_id = c.id)/and true/"
mutant "token hook admits every account" "s/or exists (select 1 from public.portal_tenant_members m where m.user_id = _user_id)/or true/"
mutant "no notification on submit" "s/after insert or update of status on/after update of status on/"
mutant "notification on unchanged status" "s/if tg_op = 'UPDATE' and new.status is not distinct from old.status then/if false then/"
mutant "silent when no staff account exists" "s/  if v_sent = 0 then/  if false then/"
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

# 4a-2. the ownership guard: a public table owned by another role must stop the migration (CREATE POLICY needs ownership)
build owned || exit 1
PSQL -d owned -c "create role other_owner nologin; alter table public.leads owner to other_owner" >/dev/null 2>&1 \
  || PSQL -d owned -c "alter table public.leads owner to other_owner" >/dev/null
if PSQL -d owned < "$ADMIT" >/dev/null 2>"$WORK/owned.err"; then
  echo "FAIL  migration applied although a public table has another owner"; FAILS=$((FAILS+1))
elif grep -q "not owned by postgres: leads" "$WORK/owned.err"; then echo "PASS  migration refuses to run while a public table has another owner"
else echo "FAIL  ownership guard failed for the wrong reason:"; cat "$WORK/owned.err"; FAILS=$((FAILS+1)); fi

# 4a-2b. the view guard: a view readable by authenticated that runs with owner rights must stop the migration
build ownerview || exit 1
PSQL -d ownerview -c "create view public.owner_rights_leak as select * from public.xero_tokens" >/dev/null
if PSQL -d ownerview < "$ADMIT" >/dev/null 2>"$WORK/ownerview.err"; then
  echo "FAIL  migration applied although an owner-rights view is readable by API roles"; FAILS=$((FAILS+1))
elif grep -q "run with owner rights: owner_rights_leak" "$WORK/ownerview.err"; then echo "PASS  migration refuses to run while an owner-rights view is readable by API roles"
else echo "FAIL  view guard failed for the wrong reason:"; cat "$WORK/ownerview.err"; FAILS=$((FAILS+1)); fi

# 4a-2c. refusal leaves nothing behind (guards run before any change, inside the file's own transaction)
if PSQL -d ownerview -t -A -c "select to_regprocedure('public.is_allowlisted_staff()') is null" | grep -qx t; then
  echo "PASS  a refused run created nothing (is_allowlisted_staff absent)"
else echo "FAIL  a refused run left is_allowlisted_staff() behind"; FAILS=$((FAILS+1)); fi

# 4a-2d. the repo's own migrations leave no public table with row security off once the parity file is applied
#        (a Supabase branch replayed from migrations would otherwise trip the guard). Static check over the folder.
rls_gaps() { # $@ = migration files; prints tables created with no row-security enable anywhere in them
  local t gaps=""
  # comment lines dropped and whitespace collapsed first, so aligned columns and prose do not fool the match
  sed -e 's/--.*$//' -e 's/[[:space:]]\+/ /g' "$@" | tr 'A-Z' 'a-z' > "$WORK/all-migrations.sql"
  for t in $(grep -oE "create table (if not exists )?(public\.)?[a-z_0-9]+ ?\(" "$WORK/all-migrations.sql" | sed -E 's/ ?\($//' | awk '{print $NF}' | sed 's/^public\.//' | sort -u); do
    grep -qE "alter table (if exists )?(only )?(public\.)?$t enable row level security" "$WORK/all-migrations.sql" || gaps="$gaps $t"
  done
  echo "$gaps"
}
missing="$(rls_gaps "$M"/*.sql)"
if [ -z "${missing// /}" ]; then echo "PASS  every table created in supabase/migrations has row security enabled by some migration"
else echo "FAIL  tables created in supabase/migrations with no row-security enable:$missing"; FAILS=$((FAILS+1)); fi
without_parity=()
for f in "$M"/*.sql; do [ "$(basename "$f")" = 20261104035900_document_rls_parity.sql ] || without_parity+=("$f"); done
control="$(rls_gaps "${without_parity[@]}")"
if echo "$control" | grep -qw document_chunks && echo "$control" | grep -qw document_embeddings; then
  echo "RED-AS-EXPECTED  without the parity migration the static check names:$control"
else echo "FAIL  static check stayed green without the parity migration ($control)"; FAILS=$((FAILS+1)); fi

# 4a-3. branch-shaped database: the two production-only functions are absent (no repo migration creates them).
# The migration and rollback must still apply, so the mandated Supabase-branch path is not blocked.
build branchy || exit 1
PSQL -d branchy -c "drop function public.prune_integration_history(); drop function public.set_app_tenant(text)" >/dev/null
if PSQL -d branchy < "$ADMIT" > /dev/null 2> "$WORK/branchy.err" && grep -q "absent here, revoke skipped" "$WORK/branchy.err" \
   && PSQL -d branchy < "$ROLLBACK" > /dev/null 2>&1 && PSQL -d branchy < "$ADMIT" > /dev/null 2>&1; then
  echo "PASS  migration, rollback and re-apply all run where the production-only functions are absent"
else echo "FAIL  branch-shaped database:"; cat "$WORK/branchy.err" | tail -5; FAILS=$((FAILS+1)); fi

# 4a-4. scale at production's lock settings: ~1,800 tables (prod count 04/11/2026), max_connections 120,
# max_locks_per_transaction 64 (both measured on prod). One transaction must fit in the shared lock table.
build scale || exit 1
PSQL -d scale >/dev/null <<'SQL'
do $$
begin
  for i in 1..1790 loop
    execute format('create table public.crm_scale_%s (id bigint primary key, note text)', i);
    execute format('alter table public.crm_scale_%s enable row level security', i);
    execute format('create policy any_user on public.crm_scale_%s for all using (auth.uid() is not null) with check (auth.uid() is not null)', i);
  end loop;
end $$;
SQL
t0=$(date +%s.%N)
if PSQL -d scale < "$ADMIT" > /dev/null 2> "$WORK/scale.err"; then # the file is its own transaction
  gated=$(PSQL -d scale -t -A -c "select count(*) from pg_policies where schemaname = 'public' and policyname = 'staff_only_gate'")
  secs=$(awk -v a="$(date +%s.%N)" -v b="$t0" 'BEGIN { printf "%.1f", a - b }')
  if [ "$gated" -ge 1800 ]; then echo "PASS  one transaction gates $gated tables at prod lock settings in ${secs}s"
  else echo "FAIL  scale run gated only $gated tables"; FAILS=$((FAILS+1)); fi
else echo "FAIL  scale run:"; tail -5 "$WORK/scale.err"; FAILS=$((FAILS+1)); fi

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

# 4c. all-or-nothing: each file runs in one transaction it opens and commits itself, so a failure at its LAST step
#     (for example lock_timeout on the final trigger) must leave the catalogue exactly as it was. psql applies a
#     file statement by statement, so without begin/commit the earlier steps would stay applied. The control runs
#     the same planted failure on a copy with begin/commit removed and must find a partial change.
late_failure() { # label, db, file, setup (none|admit), strip (0|1)
  local db="$2" src="$3" planted="$WORK/late-$2.sql" same
  build "$db" || return
  if [ "$4" = admit ]; then apply "$db" "$ADMIT" || return; fi
  if [ "$5" = 1 ]; then sed -e '/^begin;$/d' -e '/^commit;$/d' "$3" > "$WORK/nobegin-$2.sql"; src="$WORK/nobegin-$2.sql"
    if cmp -s "$3" "$src"; then echo "FAIL  control did not remove begin/commit: $1"; FAILS=$((FAILS+1)); return; fi
  fi
  # the planted failure goes just before the final commit, or at the very end when there is no commit
  awk '$0 == "commit;" && !d { print "select 1/0; -- planted late failure"; d = 1 } { print } END { if (!d) print "select 1/0; -- planted late failure" }' \
    "$src" > "$planted"
  fingerprint "$db" > "$WORK/late-$2-before.txt"
  if PSQL -d "$db" < "$planted" > /dev/null 2> "$WORK/late-$2.err"; then
    echo "FAIL  the planted failure did not stop the run: $1"; FAILS=$((FAILS+1)); return
  fi
  if ! grep -q "division by zero" "$WORK/late-$2.err"; then
    echo "FAIL  run stopped for the wrong reason: $1"; tail -3 "$WORK/late-$2.err"; FAILS=$((FAILS+1)); return
  fi
  fingerprint "$db" > "$WORK/late-$2-after.txt"
  if cmp -s "$WORK/late-$2-before.txt" "$WORK/late-$2-after.txt"; then same=1; else same=0; fi
  if [ "$5" = 0 ] && [ $same = 1 ]; then echo "PASS  $1"
  elif [ "$5" = 0 ]; then echo "FAIL  $1 (the failed run left a partial change)"; FAILS=$((FAILS+1))
  elif [ $same = 0 ]; then echo "RED-AS-EXPECTED  without begin/commit, the same late failure leaves a partial change: $(basename "$3")"
  else echo "FAIL  control stayed unchanged without begin/commit, so the all-or-nothing check proves nothing: $1"; FAILS=$((FAILS+1)); fi
}
late_failure "migration is all-or-nothing: a failure at its last step leaves the catalogue unchanged" atomic_m "$ADMIT" none 0
late_failure "migration control" atomic_m_ctl "$ADMIT" none 1
late_failure "rollback is all-or-nothing: a failure at its last step leaves the migration fully in place" atomic_r "$ROLLBACK" admit 0
late_failure "rollback control" atomic_r_ctl "$ROLLBACK" admit 1

# 4d. production already has an older, role-based public.is_staff() (profiles.role; not in supabase/migrations).
#     The migration's predicate has its own name, so neither the migration nor the rollback may change or drop it.
#     Control: the same migration with its predicate named is_staff must overwrite the decoy.
DECOY_SQL="create function public.is_staff() returns boolean language plpgsql stable security definer
  set search_path = pg_catalog, public as \$f\$ BEGIN RETURN EXISTS ( SELECT 1 FROM profiles p WHERE p.id = auth.uid()
  AND p.role IN ('FOUNDER', 'STAFF', 'ADMIN') ); END; \$f\$"
decoy_fp() { PSQL -d "$1" -t -A -c "select coalesce((select md5(prosrc) || '|' || (select l.lanname from pg_language l where l.oid = p.prolang) from pg_proc p where oid = to_regprocedure('public.is_staff()')), 'absent')"; }
build decoy || exit 1
PSQL -d decoy -c "$DECOY_SQL" > /dev/null
d0="$(decoy_fp decoy)"
apply decoy "$ADMIT"; d1="$(decoy_fp decoy)"
apply decoy "$ROLLBACK"; d2="$(decoy_fp decoy)"
if [ "$d0" != absent ] && [ "$d0" = "$d1" ] && [ "$d1" = "$d2" ]; then
  echo "PASS  a pre-existing public.is_staff() survives the migration and the rollback unchanged"
else echo "FAIL  pre-existing is_staff() changed: before=$d0 after-migration=$d1 after-rollback=$d2"; FAILS=$((FAILS+1)); fi
sed -e 's/is_allowlisted_staff/is_staff/g' "$ADMIT" > "$WORK/named-is-staff.sql"
if cmp -s "$ADMIT" "$WORK/named-is-staff.sql"; then echo "FAIL  is_staff-name control did not change the migration"; FAILS=$((FAILS+1)); else
  build decoyctl || exit 1
  PSQL -d decoyctl -c "$DECOY_SQL" > /dev/null
  c0="$(decoy_fp decoyctl)"
  if PSQL -d decoyctl < "$WORK/named-is-staff.sql" > /dev/null 2>&1 && [ "$(decoy_fp decoyctl)" != "$c0" ]; then
    echo "RED-AS-EXPECTED  a predicate named is_staff would overwrite production's role-based one"
  else echo "FAIL  is_staff-name control did not overwrite the decoy, so the survival check proves nothing"; FAILS=$((FAILS+1)); fi
fi

# 4e. the auth hooks are replaced only from a body the migration knows (20260620010000, or its own on a re-run).
#     A hook changed by hand since then must stop the run before anything changes.
build hookdrift || exit 1
PSQL -d hookdrift > /dev/null <<'SQL'
create or replace function public.before_user_created_hook(event jsonb) returns jsonb language plpgsql stable
security definer set search_path = public as $f$
begin
  -- changed by hand after 20260620010000
  return event;
end;
$f$;
SQL
if PSQL -d hookdrift < "$ADMIT" > /dev/null 2> "$WORK/hookdrift.err"; then
  echo "FAIL  migration replaced a hook body it does not know"; FAILS=$((FAILS+1))
elif grep -q "before_user_created_hook(jsonb) has a body this migration does not expect" "$WORK/hookdrift.err" \
     && PSQL -d hookdrift -t -A -c "select to_regprocedure('public.is_allowlisted_staff()') is null" | grep -qx t; then
  echo "PASS  migration refuses to run when an auth hook body is neither the known prior nor its own, and changes nothing"
else echo "FAIL  hook guard failed for the wrong reason:"; tail -3 "$WORK/hookdrift.err"; FAILS=$((FAILS+1)); fi
sed -e 's/if v_fp is not null and not (v_fp = any (h.known)) then/if false then/' "$ADMIT" > "$WORK/nohookguard.sql"
if cmp -s "$ADMIT" "$WORK/nohookguard.sql"; then echo "FAIL  hook guard mutant did not change the migration"; FAILS=$((FAILS+1))
elif PSQL -d hookdrift < "$WORK/nohookguard.sql" > /dev/null 2>&1; then
  echo "RED-AS-EXPECTED  without the hook guard the migration replaces a hook body it does not know"
else echo "FAIL  hook guard mutant failed to apply, so the guard check proves nothing"; FAILS=$((FAILS+1)); fi

if [ $FAILS -eq 0 ]; then echo "PORTAL_CLIENT_ADMISSION_DB_PROOF_ALL_PASS"; exit 0; fi
echo "PORTAL_CLIENT_ADMISSION_DB_PROOF_FAILURES=$FAILS"; exit 1
