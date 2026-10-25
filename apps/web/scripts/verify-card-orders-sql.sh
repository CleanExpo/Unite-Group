#!/usr/bin/env bash
# Proves the card_orders migration on a THROWAWAY local Postgres 15: random port, 127.0.0.1 only,
# no unix socket, temp data dir removed on exit. Supabase roles and auth.uid() are stubbed.
# Never touches production. Exit 0 only when every assertion held.
set -euo pipefail

PGBIN=${PGBIN:-/opt/homebrew/opt/postgresql@15/bin}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MIGRATION=${MIGRATION_UNDER_TEST:-$ROOT/supabase/migrations/20261025100000_card_orders.sql}
SETUP="$ROOT/scripts/__tests__/card-orders-stub-roles.sql"
CONTRACT="$ROOT/scripts/__tests__/card-orders-contract.sql"
[[ -f "$MIGRATION" ]] || { echo "missing migration $MIGRATION" >&2; exit 3; }

DATA=$(mktemp -d "${TMPDIR:-/tmp}/card-orders-pg.XXXXXX")
PORT=$(( 20000 + RANDOM % 20000 ))
cleanup() { "$PGBIN/pg_ctl" -D "$DATA/d" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA/d" -U postgres --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$DATA/d" -w -l "$DATA/log" \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start >/dev/null
psqlx() { "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

psqlx -f "$SETUP"
psqlx -f "$MIGRATION"
psqlx -f "$MIGRATION"   # applying twice must be a no-op
psqlx -f "$CONTRACT"

# expect_fail LABEL SQL: the statement must be rejected
expect_fail() {
  if psqlx -c "$2" >/dev/null 2>&1; then echo "FAIL (was allowed): $1" >&2; exit 1; fi
  echo "ok (rejected): $1"
}

COLS="founder_id, reference, stripe_session_id, stripe_event_id, tier, amount_total, currency, livemode"
FA="'00000000-0000-0000-0000-00000000000a'"
expect_fail "authenticated insert order" "set role authenticated; insert into card_orders ($COLS) values ($FA,'x','cs_x','evt_x','ready',24900,'aud',false)"
expect_fail "authenticated update order" "set role authenticated; update card_orders set tier = 'custom'"
expect_fail "authenticated delete intake" "set role authenticated; delete from card_order_intakes"
expect_fail "anon insert intake" "set role anon; insert into card_order_intakes (order_id, founder_id, name, email) values (gen_random_uuid(),$FA,'n','e@example.invalid')"
expect_fail "duplicate stripe_session_id" "set role service_role; insert into card_orders ($COLS) values ($FA,'ref_9','cs_test_1','evt_9','ready',24900,'aud',false)"
expect_fail "unknown tier" "set role service_role; insert into card_orders ($COLS) values ($FA,'ref_8','cs_test_8','evt_8','gold',24900,'aud',false)"
expect_fail "second intake for one order" "set role service_role; insert into card_order_intakes (order_id, founder_id, name, email) select id, founder_id, 'Again', 'a@example.invalid' from card_orders where reference = 'ref_1'"
echo "card_orders SQL contract: PASS"
