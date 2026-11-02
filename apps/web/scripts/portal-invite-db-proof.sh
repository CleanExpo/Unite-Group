#!/bin/bash
# Portal invite / entitlements database proof (UNI-3167) on a THROWAWAY Postgres 15 container. Never touches any
# real project: the container has no network, its data lives only inside it, and it is removed on exit.
#   scripts/portal-invite-db-proof.sh all    migrations twice, RLS proof, concurrent-redeem race, planted-defect controls
# Needs docker and the postgres:15 image. Prints PORTAL_DB_PROOF_ALL_PASS and exits 0 only when every step held.
set -u
APP="$(cd "$(dirname "$0")/.." && pwd)"
MIG1="$APP/supabase/migrations/20261102190000_portal_entitlements.sql"
MIG2="$APP/supabase/migrations/20261102190100_portal_invite_codes.sql"
PROOF="$APP/supabase/tests/portal_invites_rls.sql"
IMAGE="${PORTAL_PROOF_IMAGE:-postgres:15}"
WORK="$(mktemp -d /tmp/portal-proof.XXXXXX)"
CTR="portal-proof-$$-$RANDOM"
cleanup() { rc=$?; docker rm -f "$CTR" >/dev/null 2>&1; rm -rf "$WORK"; exit $rc; }
trap cleanup EXIT

for f in "$MIG1" "$MIG2" "$PROOF"; do [ -f "$f" ] || { echo "FAIL  missing $f"; exit 1; }; done
docker run -d --rm --name "$CTR" --network none -e POSTGRES_HOST_AUTH_METHOD=trust "$IMAGE" >/dev/null \
  || { echo "FAIL  could not start $IMAGE"; exit 2; }
for _ in $(seq 1 60); do docker exec "$CTR" pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
# pg_isready can answer during the image's first-boot restart; wait for a real query to succeed twice
for _ in $(seq 1 60); do
  docker exec "$CTR" psql -U postgres -tAc 'select 1' >/dev/null 2>&1 && sleep 1 \
    && docker exec "$CTR" psql -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
echo "throwaway postgres container $CTR ($IMAGE, no network)"

PSQL() { docker exec -i "$CTR" psql -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
ROLES_MADE=0
fresh_db() { # $1 = name; stubs the Supabase surface the migrations use: roles, auth.users, auth.uid(), auth.jwt()
  PSQL -d postgres -c "create database $1" >/dev/null || return 1
  if [ $ROLES_MADE -eq 0 ]; then
    PSQL -d postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" >/dev/null || return 1
    ROLES_MADE=1
  fi
  PSQL -d "$1" >/dev/null <<'SQL'
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
SQL
}

FAILS=0
apply() { PSQL -d "$1" < "$2" >/dev/null 2>"$WORK/apply.err" || { echo "FAIL  apply $(basename "$2") to $1"; cat "$WORK/apply.err"; FAILS=$((FAILS+1)); return 1; }; }
expect_pass() { # label, db, file
  if out="$(PSQL -d "$2" < "$3" 2>&1)" && echo "$out" | grep -q PORTAL_INVITES_RLS_PROOF_PASS; then echo "PASS  $1"
  else echo "FAIL  $1"; echo "$out" | tail -5; FAILS=$((FAILS+1)); fi
}

# 1. both migrations apply, and re-apply, on a fresh database; then the full RLS / redeem proof
fresh_db main || exit 2
apply main "$MIG1" && apply main "$MIG1" && apply main "$MIG2" && apply main "$MIG2" && echo "PASS  migrations apply twice"
expect_pass "RLS + redeem proof (anon, aal1, wrong tenant, aal2 owner, expired, revoked, reused, wrong email, rate limit)" main "$PROOF"

# 2. race: two different aal2 users redeem the same unbound code at the same moment; exactly one wins
race() { # $1 = db; prints "<outcome1> <outcome2> <redemption rows> <seconds session 2 waited>"
  PSQL -d "$1" >/dev/null <<'SQL'
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'd@race.test'), ('00000000-0000-0000-0000-0000000000e5', 'e@race.test');
insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, expires_at) values (repeat('7', 64), 'RACE', 'brii', now() + interval '1 day');
SQL
  session() { # $1 = db, $2 = user suffix, $3 = hold seconds after redeeming
    PSQL -d "$1" -t -A <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000$2', false) is null;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000$2","aal":"aal2"}', false) is null;
begin;
select 'OUTCOME=' || public.portal_redeem_invite(repeat('7', 64));
select pg_sleep($3) is null;
commit;
SQL
  }
  session "$1" d4 2 > "$WORK/s1.out" 2>&1 &
  local p1=$!
  sleep 0.7
  local t0; t0=$(date +%s.%N)
  session "$1" e5 0 > "$WORK/s2.out" 2>&1
  local waited; waited=$(awk -v a="$(date +%s.%N)" -v b="$t0" 'BEGIN { printf "%.2f", a - b }')
  wait $p1
  local o1 o2 rows
  o1=$(grep -o 'OUTCOME=[a-z_]*' "$WORK/s1.out" | cut -d= -f2)
  o2=$(grep -o 'OUTCOME=[a-z_]*' "$WORK/s2.out" | cut -d= -f2)
  rows=$(PSQL -d "$1" -t -A -c "select count(*) from public.portal_invite_redemptions r join public.portal_invite_codes c on c.id = r.code_id where c.code_hash = repeat('7', 64)")
  echo "${o1:-none} ${o2:-none} ${rows:-none} $waited"
}
fresh_db racedb || exit 2
apply racedb "$MIG1" && apply racedb "$MIG2"
read -r r1 r2 rrows rwait <<< "$(race racedb)"
if [ "$r1" = redeemed ] && [ "$r2" = used ] && [ "$rrows" = 1 ] && awk -v w="$rwait" 'BEGIN { exit !(w >= 1) }'; then
  echo "PASS  concurrent redeem: session 1 $r1, session 2 waited ${rwait}s then $r2, $rrows redemption row"
else
  echo "FAIL  concurrent redeem: s1=$r1 s2=$r2 rows=$rrows waited=${rwait}s"; cat "$WORK/s1.out" "$WORK/s2.out" | tail -6; FAILS=$((FAILS+1))
fi

# 3. planted defects: each mutant must turn the proof red (a check that cannot fail is not a control)
mutant() { # label, target file (1|2), sed expression
  local name="mut$RANDOM" file m1="$MIG1" m2="$MIG2"
  if [ "$2" = 1 ]; then file="$MIG1"; m1="$WORK/mutant.sql"; else file="$MIG2"; m2="$WORK/mutant.sql"; fi
  sed -e "$3" "$file" > "$WORK/mutant.sql"
  if cmp -s "$file" "$WORK/mutant.sql"; then echo "FAIL  mutant did not change the migration: $1"; FAILS=$((FAILS+1)); return; fi
  fresh_db "$name" || exit 2
  apply "$name" "$m1" && apply "$name" "$m2" || return
  out="$(PSQL -d "$name" < "$PROOF" 2>&1)"; rc=$?
  if [ $rc -ne 0 ] && ! echo "$out" | grep -q PORTAL_INVITES_RLS_PROOF_PASS; then echo "RED-AS-EXPECTED  $1"
  else echo "FAIL  proof stayed green on mutant: $1"; FAILS=$((FAILS+1)); fi
}
mutant "aal1 may redeem" 2 "s/if not public.portal_session_is_aal2() then/if false then/"
mutant "bound email ignored" 2 "s/if v_code.bound_email is not null and/if false and/"
mutant "expiry ignored" 2 "s/elsif v_code.expires_at <= now() then/elsif false then/"
mutant "revocation ignored" 2 "s/elsif v_code.revoked_at is not null then/elsif false then/"
mutant "reuse allowed" 2 "s/elsif exists (select 1 from public.portal_invite_redemptions r where r.code_id = v_code.id) then/elsif false then/"
mutant "rate limit off" 2 "s/) >= 5 then/) >= 500 then/"
mutant "link limit off" 2 "s/) >= 10 then/) >= 1000 then/"
mutant "link limit callable by signed-in users" 2 "s/grant execute on function public.portal_invite_link_allowed(text) to service_role;/grant execute on function public.portal_invite_link_allowed(text) to authenticated, service_role;/"
mutant "comp downgrades paid" 2 "s/where public.portal_entitlements.plan = 'none';/;/"
mutant "entitlements readable at aal1" 1 "s/select public.portal_session_is_aal2() and exists (/select exists (/"
mutant "every member row visible to every user" 1 "s/for select to authenticated using (user_id = auth.uid());/for select to authenticated using (true);/"
mutant "comp may hold paid modules" 1 "s/plan = 'paid' or not jsonb_path_exists/true or not jsonb_path_exists/"
mutant "plaintext column added" 2 "s/code_hash text not null unique check (code_hash ~ '^\[0-9a-f\]{64}\$'),/code_hash text not null unique, code_plain text,/"

# 3b. race mutant: without the row lock, the single-use index and its on-conflict guard, both concurrent redeems win
sed -e "s/ for update;/;/" -e "/portal_invite_redemptions_single_use/d" -e "s/on conflict (code_id) do nothing;/;/" "$MIG2" > "$WORK/race-mutant.sql"
if cmp -s "$MIG2" "$WORK/race-mutant.sql"; then echo "FAIL  race mutant did not change the migration"; FAILS=$((FAILS+1)); else
  fresh_db racemut || exit 2
  apply racemut "$MIG1" && apply racemut "$WORK/race-mutant.sql"
  read -r m1 m2 mrows mwait <<< "$(race racemut)"
  if [ "$mrows" = 2 ]; then echo "RED-AS-EXPECTED  race mutant: s1=$m1 s2=$m2 rows=$mrows (two winners)"
  else echo "FAIL  race check stayed green without lock and index: s1=$m1 s2=$m2 rows=$mrows"; FAILS=$((FAILS+1)); fi
fi

if [ $FAILS -eq 0 ]; then echo "PORTAL_DB_PROOF_ALL_PASS"; exit 0; fi
echo "PORTAL_DB_PROOF_FAILURES=$FAILS"; exit 1
