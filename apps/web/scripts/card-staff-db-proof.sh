#!/bin/bash
# UNI-3146 database proof on a THROWAWAY local Postgres 15. Never touches any real project. Same setup as card-db-proof.sh.
# Applies the card order migrations and the new account migration, runs the proof, then plants a defect per mutant and
# requires the proof to go red. Exit 0 only when the proof passes and every mutant is caught.
set -u
export PGOPTIONS="-c client_min_messages=warning"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@15/bin}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
MIG="$APP/supabase/migrations"
PROOF="$APP/supabase/tests/card_staff_cards.sql"
NEW="$MIG/20261102130000_card_business_accounts_staff_cards.sql"
BASE=("$MIG/20261025100000_card_orders.sql" "$MIG/20261025200000_card_orders_extra_business.sql" "$MIG/20261102120000_card_orders_staff_card_no_limit.sql")

DATA="$(mktemp -d /tmp/card-staff-pg.XXXXXX)"
PORT=$((20000 + RANDOM % 30000))
HOST=127.0.0.1
cleanup() { "$PGBIN/pg_ctl" -D "$DATA/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DATA"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA/data" -U postgres --auth=trust >/dev/null || { echo "initdb failed"; exit 2; }
"$PGBIN/pg_ctl" -D "$DATA/data" -o "-c listen_addresses=$HOST -p $PORT -c unix_socket_directories=$DATA" -l "$DATA/log" -w start >/dev/null || { cat "$DATA/log"; exit 2; }
"$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" || exit 2

fresh_db() { # $1 name, $2 the account migration to apply
  "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c "create database $1" >/dev/null || return 1
  "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$1" >/dev/null <<'SQL' || return 1
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
SQL
  for f in "${BASE[@]}" "$2"; do "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "$1" -f "$f" >/dev/null || return 1; done
}

FAILS=0
fresh_db main "$NEW" || { echo "FAIL  migrations did not apply"; exit 1; }
if "$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d main -f "$NEW" >/dev/null; then echo "PASS  migration applies twice"; else echo "FAIL  second apply"; FAILS=$((FAILS+1)); fi
if out="$("$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d main -t -f "$PROOF" 2>&1)" && echo "$out" | grep -q CARD_STAFF_DB_PROOF_PASS; then echo "PASS  proof"; else echo "FAIL  proof"; echo "$out" | tail -8; FAILS=$((FAILS+1)); fi

i=0
while IFS= read -r mut; do
  [ -n "$mut" ] || continue
  i=$((i+1))
  sed -E -e "$mut" "$NEW" > "$DATA/mutant.sql"
  if cmp -s "$NEW" "$DATA/mutant.sql"; then echo "FAIL  mutant changed nothing: $mut"; FAILS=$((FAILS+1)); continue; fi
  fresh_db "mut$i" "$DATA/mutant.sql" || { echo "FAIL  mutant did not apply: $mut"; FAILS=$((FAILS+1)); continue; }
  out="$("$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PORT" -U postgres -d "mut$i" -t -f "$PROOF" 2>&1)"; rc=$?
  if [ $rc -ne 0 ] && ! echo "$out" | grep -q CARD_STAFF_DB_PROOF_PASS; then echo "RED-AS-EXPECTED  $mut"; else echo "FAIL  proof stayed green: $mut"; FAILS=$((FAILS+1)); fi
done <<'MUTANTS'
s/s\.status = 'active' and //
s/ and s\.staff_name is not null//
s/raise exception 'card_staff_card_deactivated';/null;/
s/new\.token_hash := null;/null;/
s/or new\.account_id is distinct from old\.account_id//
s/or new\.card_slug is distinct from old\.card_slug//
s/ or v_order\.tier <> 'extra_business'//
s/generate_series\(1, v_order\.quantity\)/generate_series(1, least(v_order.quantity, 5))/
s/on conflict \(order_id, seat_no\) do nothing//
s/mobile, status, deactivated_at\)/mobile, status, deactivated_at, token_hash)/
s/for select to authenticated using \(founder_id = auth\.uid\(\)\)/for select to authenticated using (true)/
s/^revoke all on table public\.card_staff_cards from public, anon, authenticated;$/grant update on table public.card_staff_cards to anon;/
s/^grant select, insert, update on table public\.card_business_accounts, public\.card_staff_cards to service_role;$/grant select on table public.card_business_accounts, public.card_staff_cards to service_role;/
s/^grant execute on function public\.card_provision_staff_cards\(uuid, uuid\) to service_role;$//
MUTANTS

if [ $FAILS -eq 0 ]; then echo "CARD_STAFF_DB_PROOF_ALL_PASS"; exit 0; fi
echo "CARD_STAFF_DB_PROOF_FAILURES=$FAILS"; exit 1
