#!/bin/bash
# Portal owner join-up database proof (UNI-3168 / UNI-3174 on UNI-3167) on a THROWAWAY Postgres 15 container. Never
# touches any real project: the container has no network, its data lives only inside it, and it is removed on exit.
#   scripts/portal-owner-db-proof.sh all    every portal migration twice, the S3 two-tenant proof, the invited-owner
#                                           journey proof, then planted-defect controls on the owner helper
# Needs docker and the postgres:15 image. Prints PORTAL_OWNER_DB_PROOF_ALL_PASS and exits 0 only when every step held.
set -u
APP="$(cd "$(dirname "$0")/.." && pwd)"
M="$APP/supabase/migrations"
MIGS=(
  "$M/20261102180000_portal_change_requests.sql"
  "$M/20261102180100_portal_change_photos_bucket.sql"
  "$M/20261102180200_portal_connections.sql"
  "$M/20261102190000_portal_entitlements.sql"
  "$M/20261102190100_portal_invite_codes.sql"
  "$M/20261103120000_portal_owner_tenant_from_membership.sql"
)
HELPER="$M/20261103120000_portal_owner_tenant_from_membership.sql"
S3_PROOF="$APP/supabase/tests/portal_s3_rls.sql"
JOURNEY="$APP/supabase/tests/portal_owner_journey.sql"
IMAGE="${PORTAL_PROOF_IMAGE:-postgres:15}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/portal-owner-proof.XXXXXX")"
CTR="portal-owner-proof-$$-$RANDOM"
cleanup() { rc=$?; docker rm -f "$CTR" >/dev/null 2>&1; rm -rf "$WORK"; exit $rc; }
trap cleanup EXIT

for f in "${MIGS[@]}" "$S3_PROOF" "$JOURNEY"; do [ -f "$f" ] || { echo "FAIL  missing $f"; exit 1; }; done
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
fresh_db() { # $1 = name; stubs the Supabase surface the migrations use: roles, auth, and a minimal storage
  PSQL -h localhost -d postgres -c "create database $1" >/dev/null || return 1
  if [ $ROLES_MADE -eq 0 ]; then
    PSQL -h localhost -d postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" >/dev/null || return 1
    ROLES_MADE=1
  fi
  PSQL -h localhost -d "$1" >/dev/null <<'SQL'
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt(), storage.foldername(text) to anon, authenticated, service_role;
grant select on storage.buckets to authenticated, service_role;
grant select, insert on storage.objects to authenticated;
grant all on storage.objects to service_role;
SQL
}

FAILS=0
apply() { PSQL -h localhost -d "$1" < "$2" >/dev/null 2>"$WORK/apply.err" || { echo "FAIL  apply $(basename "$2") to $1"; cat "$WORK/apply.err"; FAILS=$((FAILS+1)); return 1; }; }
apply_all() { # $1 = db, $2 = helper migration to use (the real one or a mutant)
  local f
  for f in "${MIGS[@]}"; do
    [ "$f" = "$HELPER" ] && f="$2"
    apply "$1" "$f" || return 1
  done
}
proof_ok() { # db, proof file, pass token
  local out; out="$(PSQL -h localhost -d "$1" < "$2" 2>&1)" && echo "$out" | grep -q "$3"
}
expect_pass() { # label, db, proof file, pass token
  if proof_ok "$2" "$3" "$4"; then echo "PASS  $1"
  else echo "FAIL  $1"; PSQL -h localhost -d "$2" < "$3" 2>&1 | tail -5; FAILS=$((FAILS+1)); fi
}

# 1. every portal migration applies, and re-applies, on a fresh database; then both proofs, each on its own database
fresh_db s3 || exit 2
apply_all s3 "$HELPER" && apply_all s3 "$HELPER" && echo "PASS  six portal migrations apply twice"
expect_pass "S3 two-tenant proof with tenants from portal_tenant_members (forged claims refused)" s3 "$S3_PROOF" PORTAL_S3_RLS_PROOF_PASS
fresh_db journey || exit 2
apply_all journey "$HELPER"
expect_pass "invited-owner journey: redeem, then changes, photos, setup on her own tenant" journey "$JOURNEY" PORTAL_OWNER_JOURNEY_PROOF_PASS

# 2. planted defects in the owner helper: each must turn at least one proof red (a check that cannot fail is no control)
mutant() { # label, sed expression applied to the helper migration (or "old" for S3's original claim-based helper)
  local name="mut$RANDOM" s3ok=0 jok=0
  if [ "$2" = old ]; then
    # S3's original helper, exactly as 20261102180000 creates it: the app_metadata claim
    awk '/^create or replace function public.portal_owner_tenant_slug\(\)/,/^grant execute on function public.portal_owner_tenant_slug/' \
      "${MIGS[0]}" > "$WORK/mutant.sql"
    grep -q "app_metadata" "$WORK/mutant.sql" || { echo "FAIL  could not extract the old helper"; FAILS=$((FAILS+1)); return; }
  else
    sed -e "$2" "$HELPER" > "$WORK/mutant.sql"
  fi
  if cmp -s "$HELPER" "$WORK/mutant.sql"; then echo "FAIL  mutant did not change the helper: $1"; FAILS=$((FAILS+1)); return; fi
  fresh_db "${name}a" && apply_all "${name}a" "$WORK/mutant.sql" || return
  fresh_db "${name}b" && apply_all "${name}b" "$WORK/mutant.sql" || return
  proof_ok "${name}a" "$S3_PROOF" PORTAL_S3_RLS_PROOF_PASS && s3ok=1
  proof_ok "${name}b" "$JOURNEY" PORTAL_OWNER_JOURNEY_PROOF_PASS && jok=1
  if [ $s3ok -eq 0 ] || [ $jok -eq 0 ]; then echo "RED-AS-EXPECTED  $1 (s3 green=$s3ok, journey green=$jok)"
  else echo "FAIL  both proofs stayed green on mutant: $1"; FAILS=$((FAILS+1)); fi
}
mutant "helper ignores aal" "s/where public.portal_session_is_aal2()/where true/"
mutant "helper ignores the user" "s/and m.user_id = (select auth.uid())/and true/"
mutant "helper back on the app_metadata claim (S3 original)" old
mutant "newest membership wins" "s/order by m.created_at, m.tenant_slug/order by m.created_at desc, m.tenant_slug desc/"
mutant "membership order by name only" "s/order by m.created_at, m.tenant_slug/order by m.tenant_slug/"

if [ $FAILS -eq 0 ]; then echo "PORTAL_OWNER_DB_PROOF_ALL_PASS"; exit 0; fi
echo "PORTAL_OWNER_DB_PROOF_FAILURES=$FAILS"; exit 1
