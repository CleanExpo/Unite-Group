#!/bin/bash
# Gates schema database proof (UNI-3269, GATES-0) on a THROWAWAY Postgres 15 container. Never touches any real
# project: the container has no network, its data lives only inside it, and it is removed on exit.
#   scripts/gates-schema-db-proof.sh
# Steps: apply once; apply again must refuse via the fingerprint check with nothing changed; a database that already
# has an empty schema gates must refuse with nothing created; the RLS/integrity proof; the rollback removes gates and
# the forward migration applies again; then planted-defect controls, each of which the proof must catch.
# Needs docker and the postgres:15 image. Prints GATES_SCHEMA_DB_PROOF_ALL_PASS and exits 0 only when every step held.
set -u
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"
APP="$(cd "$(dirname "$0")/.." && pwd)"
MIG="$APP/supabase/migrations/20261105040000_gates_schema.sql"
ROLLBACK="$APP/supabase/manual-applies/2026-11-05_gates_schema_rollback.sql"
PROOF="$APP/supabase/tests/gates_schema_rls.sql"
IMAGE="${GATES_PROOF_IMAGE:-postgres:15}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/gates-schema-proof.XXXXXX")"
CTR="gates-schema-proof-$$-$RANDOM"
cleanup() { rc=$?; docker rm -f "$CTR" >/dev/null 2>&1; rm -rf "$WORK"; exit $rc; }
trap cleanup EXIT

for f in "$MIG" "$ROLLBACK" "$PROOF"; do [ -f "$f" ] || { echo "FAIL  missing $f"; exit 1; }; done
docker run -d --rm --name "$CTR" --network none -e POSTGRES_HOST_AUTH_METHOD=trust "$IMAGE" >/dev/null \
  || { echo "FAIL  could not start $IMAGE"; exit 2; }
for _ in $(seq 1 60); do docker exec "$CTR" pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
# pg_isready can answer during the image's first-boot restart; wait for a real query to succeed twice
for _ in $(seq 1 60); do
  docker exec "$CTR" psql -h localhost -U postgres -tAc 'select 1' >/dev/null 2>&1 && sleep 1 \
    && docker exec "$CTR" psql -h localhost -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
echo "throwaway postgres container $CTR ($IMAGE, no network)"

# Every call names -h localhost (the server inside the container itself), so a reader, and the estate's database
# write gate, can see at each call site that no other database is reached.
PSQL() { docker exec -i "$CTR" psql -h localhost -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
ROLES_MADE=0
fresh_db() { # $1 = name; stubs the Supabase surface the migration uses: roles and auth.jwt()
  PSQL -h localhost -d postgres -c "create database $1" >/dev/null || return 1
  if [ $ROLES_MADE -eq 0 ]; then
    PSQL -h localhost -d postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" >/dev/null || return 1
    ROLES_MADE=1
  fi
  PSQL -h localhost -d "$1" >/dev/null <<'SQL'
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
SQL
}

FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS+1)); }
gates_objects() { PSQL -h localhost -d "$1" -tAc "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'gates'"; }
proof_ok() { local out; out="$(PSQL -h localhost -d "$1" < "$2" 2>&1)" && echo "$out" | grep -q GATES_RLS_PROOF_PASS; }

# 1. applies on a fresh database
fresh_db g1 || { echo "FAIL  could not build g1"; exit 2; }
if PSQL -h localhost -d g1 < "$MIG" >/dev/null 2>"$WORK/apply.err"; then pass "migration applies on a fresh database"
else fail "migration applies on a fresh database"; cat "$WORK/apply.err"; fi
N1="$(gates_objects g1)"
[ "$N1" -ge 12 ] && pass "gates holds $N1 relations after apply" || fail "gates holds only $N1 relations after apply"

# 2. second apply refuses through the fingerprint check, and changes nothing
if PSQL -h localhost -d g1 < "$MIG" >/dev/null 2>"$WORK/reapply.err"; then fail "second apply was accepted"
elif grep -q "gates_schema: schema gates already exists; refusing to run, nothing changed" "$WORK/reapply.err"; then
  pass "second apply refused by the fingerprint check"
else fail "second apply failed, but not through the fingerprint check"; cat "$WORK/reapply.err"; fi
[ "$(gates_objects g1)" = "$N1" ] && pass "second apply changed nothing" || fail "second apply changed the relation count"

# 3. a database that already has schema gates (empty) refuses, and gains nothing
fresh_db g2 || { echo "FAIL  could not build g2"; exit 2; }
PSQL -h localhost -d g2 -c "create schema gates" >/dev/null
if PSQL -h localhost -d g2 < "$MIG" >/dev/null 2>"$WORK/pre.err"; then fail "apply over an existing gates schema was accepted"
elif grep -q "gates_schema: schema gates already exists" "$WORK/pre.err"; then pass "existing gates schema refused by the fingerprint check"
else fail "existing gates schema refused, but not by the fingerprint check"; cat "$WORK/pre.err"; fi
[ "$(gates_objects g2)" = "0" ] && pass "refused apply created nothing" || fail "refused apply created objects"

# 4. behaviour: org isolation, write denial, anon denial, integrity, partition routing
if proof_ok g1 "$PROOF"; then pass "RLS and integrity proof"
else fail "RLS and integrity proof"; PSQL -h localhost -d g1 < "$PROOF" 2>&1 | tail -5; fi

# 5. rollback refuses while an outside object depends on gates; then removes gates entirely; the forward
#    migration then applies again cleanly
#    Every way an outside object can hang off gates is tried, each on its own fresh database: the rollback must
#    refuse through its own check, leave the outside object in place, and leave gates in place.
rb_refuses() { # label, db, setup sql, survivor sql (returns 1 when the outside object still exists)
  fresh_db "$2" >/dev/null && PSQL -h localhost -d "$2" < "$MIG" >/dev/null 2>&1 \
    || { fail "rollback dependant $1: could not build $2"; return; }
  PSQL -h localhost -d "$2" -c "$3" >/dev/null || { fail "rollback dependant $1: setup failed"; return; }
  if PSQL -h localhost -d "$2" < "$ROLLBACK" >/dev/null 2>"$WORK/$2.err"; then fail "rollback ran while an outside $1 depends on gates"
  elif ! grep -qE "because other objects depend on (it|them)" "$WORK/$2.err"; then
    fail "rollback dependant $1: refused, but not through the RESTRICT dependency check"; cat "$WORK/$2.err"
  elif [ "$(PSQL -h localhost -d "$2" -tAc "$4")" != "1" ]; then fail "rollback dependant $1: outside object is gone"
  elif [ "$(PSQL -h localhost -d "$2" -tAc "select count(*) from pg_namespace where nspname = 'gates'")" != "1" ]; then
    fail "rollback dependant $1: gates is gone after a refused rollback"
  else pass "rollback refuses, and keeps everything, while an outside $1 depends on gates"; fi
}
RB_CASES=(
  "view on a gates table|r1|create view public.dep_v as select id from gates.brands|select count(*) from pg_class where relname = 'dep_v'"
  "view calling gates.jwt_org_id()|r2|create view public.dep_f as select gates.jwt_org_id() as org_id|select count(*) from pg_class where relname = 'dep_f'"
  "policy calling gates.jwt_org_id()|r3|create table public.dep_t (org_id uuid); alter table public.dep_t enable row level security; create policy dep_p on public.dep_t for select using (org_id = gates.jwt_org_id())|select count(*) from pg_policy where polname = 'dep_p'"
  "foreign key to a gates table|r4|create table public.dep_k (brand_id uuid references gates.brands (id))|select count(*) from pg_constraint where conname = 'dep_k_brand_id_fkey'"
  "column of a gates row type|r5|create table public.dep_c (id int, b gates.brands)|select count(*) from pg_attribute where attrelid = 'public.dep_c'::regclass and attname = 'b' and not attisdropped"
  "column default calling gates.jwt_org_id()|r6|create table public.dep_d (org_id uuid default gates.jwt_org_id())|select count(*) from pg_attrdef where adrelid = 'public.dep_d'::regclass"
  "extended statistics on gates.jwt_org_id()|r7|create table public.dep_s (org_id uuid, n int); create statistics public.dep_st on (gates.jwt_org_id()), org_id from public.dep_s|select count(*) from pg_statistic_ext where stxname = 'dep_st'"
  "function taking a gates row type|r8|create function public.dep_fn(b gates.brands) returns uuid language sql as 'select b.id'|select count(*) from pg_proc where proname = 'dep_fn'"
  "materialized view on a gates table|r9|create materialized view public.dep_mv as select id from gates.sites|select count(*) from pg_class where relname = 'dep_mv'"
)
for c in "${RB_CASES[@]}"; do IFS='|' read -r label db setup survivor <<< "$c"; rb_refuses "$label" "$db" "$setup" "$survivor"; done
if PSQL -h localhost -d g1 < "$ROLLBACK" >/dev/null 2>"$WORK/rb.err"; then pass "rollback applies"
else fail "rollback applies"; cat "$WORK/rb.err"; fi
[ "$(PSQL -h localhost -d g1 -tAc "select count(*) from pg_namespace where nspname = 'gates'")" = "0" ] \
  && pass "rollback removed schema gates" || fail "schema gates still present after rollback"
if PSQL -h localhost -d g1 < "$MIG" >/dev/null 2>"$WORK/again.err"; then pass "migration applies again after rollback"
else fail "migration applies again after rollback"; cat "$WORK/again.err"; fi

# 6. planted-defect controls: each mutant must make the proof go red, or the proof is not a control
control() { # label, db, sed expression applied to the migration
  local m="$WORK/mutant-$2.sql"
  sed -E "$3" "$MIG" > "$m"
  if cmp -s "$m" "$MIG"; then fail "control $1: mutation did not change the file"; return; fi
  fresh_db "$2" || { fail "control $1: could not build $2"; return; }
  if ! PSQL -h localhost -d "$2" < "$m" >/dev/null 2>"$WORK/$2.err"; then fail "control $1: mutant did not apply"; cat "$WORK/$2.err"; return; fi
  if proof_ok "$2" "$PROOF"; then fail "control $1: proof stayed green on a planted defect"
  else pass "control $1: proof caught the planted defect"; fi
}
control "open brands policy" c1 's/^  using \(org_id = gates\.jwt_org_id\(\)\);$/  using (true);/'
control "own-org write path" c2 's/^  to authenticated;$/  to authenticated; grant insert on table gates.brands to authenticated; create policy brands_org_write on gates.brands for insert to authenticated with check (org_id = gates.jwt_org_id());/'
control "user_metadata trusted" c3 "s/auth\.jwt\(\) -> 'app_metadata' ->> 'org_id'/coalesce(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() -> 'user_metadata' ->> 'org_id')/g"
control "no composite org foreign key on events" c4 's/^  foreign key \(org_id, site_id\) references gates\.sites \(org_id, id\)$/  check (true)/'

# the fingerprint control: without the DO block, a re-apply must not report the fingerprint refusal
FP="$WORK/no-fingerprint.sql"
awk 'BEGIN{skip=0} /^do \$\$/{skip=1} skip==0{print} skip==1 && /^\$\$;/{skip=0}' "$MIG" > "$FP"
if cmp -s "$FP" "$MIG"; then fail "control no fingerprint: mutation did not change the file"
else
  fresh_db c5 >/dev/null && PSQL -h localhost -d c5 -c "create schema gates" >/dev/null
  PSQL -h localhost -d c5 < "$FP" >/dev/null 2>"$WORK/c5.err"
  if grep -q "gates_schema: schema gates already exists" "$WORK/c5.err"; then fail "control no fingerprint: refusal message appeared without the check"
  else pass "control no fingerprint: the refusal depends on the fingerprint block"; fi
fi

# the rollback control: with RESTRICT swapped for CASCADE on the table drop, an outside view calling
# gates.jwt_org_id() must be lost, i.e. RESTRICT is what keeps it
RB_MUT="$WORK/rollback-cascade.sql"
sed -E 's/^  restrict;$/  cascade;/' "$ROLLBACK" | sed -E 's/^drop function gates\.jwt_org_id\(\) restrict;$/drop function gates.jwt_org_id() cascade;/' > "$RB_MUT"
if cmp -s "$RB_MUT" "$ROLLBACK"; then fail "control rollback restrict: mutation did not change the file"
else
  fresh_db c6 >/dev/null && PSQL -h localhost -d c6 < "$MIG" >/dev/null 2>&1 \
    && PSQL -h localhost -d c6 -c "create view public.dep_f as select gates.jwt_org_id() as org_id" >/dev/null
  PSQL -h localhost -d c6 < "$RB_MUT" >/dev/null 2>&1
  if [ "$(PSQL -h localhost -d c6 -tAc "select count(*) from pg_class where relname = 'dep_f'")" = "0" ]; then
    pass "control rollback restrict: with cascade the outside view is lost"
  else fail "control rollback restrict: the outside view survived cascade, so the proof cannot tell RESTRICT from CASCADE"; fi
fi

if [ $FAILS -eq 0 ]; then echo "GATES_SCHEMA_DB_PROOF_ALL_PASS"; exit 0; fi
echo "GATES_SCHEMA_DB_PROOF: $FAILS failure(s)"; exit 1
