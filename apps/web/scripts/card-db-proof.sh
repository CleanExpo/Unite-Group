#!/bin/bash
# Living Card database proof on a THROWAWAY local Postgres 15. Never touches any real project.
#   scripts/card-db-proof.sh all      full proof incl. negative controls (what the Done criterion runs)
#   scripts/card-db-proof.sh keep     same, but leave the server running and print its port
# It binds 127.0.0.1 on a random port with a throwaway data dir (a hook blocks unix-socket psql),
# stubs the Supabase roles (anon, authenticated, service_role) and auth.users/auth.uid(), and removes everything on exit.
set -u
PGBIN=/opt/homebrew/opt/postgresql@15/bin
APP="$(cd "$(dirname "$0")/.." && pwd)"
MIG="$APP/supabase/migrations"
TESTS="$APP/supabase/tests"
FIX_MIG="$(ls "$MIG"/*_card_profiles.sql 2>/dev/null | head -1)"
BASE_MIG="$MIG/20261024210000_card_enquiries_feedback.sql"

DATA="$(mktemp -d /tmp/card-pg.XXXXXX)"
PORT=$((20000 + RANDOM % 30000))
HOST=127.0.0.1
cleanup() { "$PGBIN/pg_ctl" -D "$DATA/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DATA"; }
[ "${1:-all}" = keep ] || trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA/data" -U postgres --auth=trust >/dev/null || { echo "initdb failed"; exit 2; }
"$PGBIN/pg_ctl" -D "$DATA/data" -o "-c listen_addresses=$HOST -p $PORT -c unix_socket_directories=$DATA" -l "$DATA/log" -w start >/dev/null || { cat "$DATA/log"; exit 2; }
PSQL() { "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$HOST" -p "$PORT" -U postgres "$@"; }
echo "throwaway postgres on $HOST:$PORT"

fresh_db() { # $1 = name; stubs the Supabase surface the migrations rely on
  PSQL -d postgres -c "create database $1" || return 1
  PSQL -d "$1" >/dev/null <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
SQL
}

# role names are cluster-wide, so only the first database creates them
fresh_db_reuse() { PSQL -d postgres -c "create database $1" >/dev/null || return 1
  PSQL -d "$1" >/dev/null <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
SQL
}

FAILS=0
expect_pass() { # label, db, file
  if out="$(PSQL -d "$2" -f "$3" 2>&1)"; then echo "PASS  $1"; else echo "FAIL  $1"; echo "$out" | tail -5; FAILS=$((FAILS+1)); fi
}
expect_red() { # label, db, file, required text in the failure
  out="$(PSQL -d "$2" -f "$3" 2>&1)"; rc=$?
  if [ $rc -ne 0 ] && echo "$out" | grep -q "$4"; then echo "RED-AS-EXPECTED  $1"; else echo "FAIL  $1 (wanted a failure containing: $4)"; echo "$out" | tail -5; FAILS=$((FAILS+1)); fi
}
apply() { PSQL -d "$1" -f "$2" >/dev/null 2>"$DATA/apply.err" || { echo "FAIL  apply $(basename "$2") to $1"; cat "$DATA/apply.err"; FAILS=$((FAILS+1)); return 1; }; }

# 1. R2 characterization: with only the existing migration, anon can write an enquiry for a slug nobody owns
fresh_db prefix || exit 2
apply prefix "$BASE_MIG"
expect_red "R2 pre-fix: anon insert for an unowned slug is ALLOWED today (with check (true))" prefix "$TESTS/card_r2_anon_insert.sql" "ALLOWED but should fail"

# 1b. the fix migration must exist (this is the first thing red when the migration is not written yet)
[ -n "$FIX_MIG" ] || { echo "FAIL  no *_card_profiles.sql migration found"; exit 1; }

# 2. fix applied: base migration then card_profiles, each re-appliable (twice)
fresh_db_reuse fixed || exit 2
apply fixed "$BASE_MIG" && apply fixed "$BASE_MIG" && apply fixed "$FIX_MIG" && apply fixed "$FIX_MIG" && echo "PASS  migrations apply twice"
expect_pass "R2 post-fix: anon cannot write for unowned or draft slugs" fixed "$TESTS/card_r2_anon_insert.sql"

# 3. the earlier proof still passes on its own database with the fix present
fresh_db_reuse earlier || exit 2
apply earlier "$BASE_MIG"; apply earlier "$FIX_MIG"
expect_pass "existing card_enquiries_feedback RLS proof (with fix migration)" earlier "$TESTS/card_enquiries_feedback_rls.sql"

# 4. two-malicious-tenant proof on card_profiles, enquiries and feedback
fresh_db_reuse tenants || exit 2
apply tenants "$BASE_MIG"; apply tenants "$FIX_MIG"
expect_pass "two-tenant proof" tenants "$TESTS/card_profiles_rls.sql"

# 4b. enquiry duplicate guard: same (slug, email, ask) inside 10 minutes is one row and one receipt
fresh_db_reuse dedupe || exit 2
apply dedupe "$BASE_MIG"; apply dedupe "$FIX_MIG"
expect_pass "enquiry duplicate guard proof" dedupe "$TESTS/card_enquiry_dedupe.sql"
for mut in \
  "s/and e.ask = p_ask/and false/" \
  "s/and e.created_at > now() - interval '10 minutes'//"; do
  name="mut$RANDOM"
  fresh_db_reuse "$name" || exit 2
  apply "$name" "$BASE_MIG"
  sed -e "$mut" "$FIX_MIG" > "$DATA/mutant.sql"
  if cmp -s "$FIX_MIG" "$DATA/mutant.sql"; then echo "FAIL  mutant did not change the migration: $mut"; FAILS=$((FAILS+1)); continue; fi
  apply "$name" "$DATA/mutant.sql"
  out="$(PSQL -d "$name" -f "$TESTS/card_enquiry_dedupe.sql" 2>&1)"; rc=$?
  if [ $rc -ne 0 ] && ! echo "$out" | grep -q CARD_ENQUIRY_DEDUPE_PASS; then echo "RED-AS-EXPECTED  dedupe mutant ($mut)"; else echo "FAIL  dedupe proof stayed green on mutant ($mut)"; FAILS=$((FAILS+1)); fi
done

# 5. negative controls: break the migration on purpose and watch the proof go red
for mut in \
  "s/using (published_at is not null)/using (true)/" \
  "s/ or public.card_slug_accepts_capture(card_slug)/ or true/g"; do
  name="mut$RANDOM"
  fresh_db_reuse "$name" || exit 2
  apply "$name" "$BASE_MIG"
  sed -e "$mut" "$FIX_MIG" > "$DATA/mutant.sql"
  if cmp -s "$FIX_MIG" "$DATA/mutant.sql"; then echo "FAIL  mutant did not change the migration: $mut"; FAILS=$((FAILS+1)); continue; fi
  apply "$name" "$DATA/mutant.sql"
  out="$(PSQL -d "$name" -f "$TESTS/card_profiles_rls.sql" 2>&1)"; rc=$?
  if [ $rc -ne 0 ] && ! echo "$out" | grep -q CARD_PROFILES_RLS_PROOF_PASS; then echo "RED-AS-EXPECTED  mutant ($mut)"; else echo "FAIL  proof stayed green on mutant ($mut)"; FAILS=$((FAILS+1)); fi
done

if [ $FAILS -eq 0 ]; then echo "CARD_DB_PROOF_ALL_PASS"; exit 0; fi
echo "CARD_DB_PROOF_FAILURES=$FAILS"; exit 1
