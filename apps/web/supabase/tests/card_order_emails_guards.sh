#!/usr/bin/env bash
# UNI-3057: planted-input check of the card_order_emails migration against a throwaway local Postgres (Docker).
# Never points at a real database. Usage: bash supabase/tests/card_order_emails_guards.sh  (exit 0 = all guards held)
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
name=uni3057-guards-$$
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=x postgres:16-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 60); do docker exec "$name" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 2
q() { docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }
q <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, service_role; grant execute on function auth.uid() to authenticated, service_role;
create table public.card_orders (id uuid primary key);
grant usage on schema public to anon, authenticated, service_role;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.card_orders values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');
SQL
q < "$here/migrations/20261027220000_card_order_emails.sql"
q < "$here/migrations/20261027220000_card_order_emails.sql"   # idempotent re-apply
fail=0
# expect <ok|SQLSTATE> <label> <sql>: an error only counts when it is the expected SQLSTATE.
expect() {
  out=$(printf '\\set VERBOSITY verbose\n%s\n' "$3" | q 2>&1) && got=ok || got=$(printf '%s' "$out" | grep -oE 'ERROR: +[0-9A-Z]{5}' | grep -oE '[0-9A-Z]{5}$' | head -1)
  if [ "$got" = "$1" ]; then echo "PASS $2 ($got)"; else echo "FAIL $2 (wanted $1, got ${got:-?})"; fail=1; fi
}
O=00000000-0000-0000-0000-000000000001; O2=00000000-0000-0000-0000-000000000002; O3=00000000-0000-0000-0000-000000000003
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b
I=00000000-0000-0000-0000-0000000000f1; Z=00000000-0000-0000-0000-000000000099
SR="set role service_role;"; INS="insert into public.card_order_emails"
expect ok    "service claims intake_reminder"      "$SR $INS(id,order_id,founder_id,kind) values ('$I','$O','$A','intake_reminder');"
expect 23505 "duplicate order+kind rejected"       "$SR $INS(order_id,founder_id,kind) values ('$O','$A','intake_reminder');"
expect 23505 "duplicate id rejected"               "$SR $INS(id,order_id,founder_id,kind) values ('$I','$O2','$A','review_request');"
expect ok    "service claims review_request"       "$SR $INS(order_id,founder_id,kind) values ('$O','$A','review_request');"
expect 23514 "unknown kind rejected"               "$SR $INS(order_id,founder_id,kind) values ('$O2','$A','spam');"
expect 23503 "unknown order FK rejected"           "$SR $INS(order_id,founder_id,kind) values ('$Z','$A','intake_reminder');"
expect 23503 "unknown founder FK rejected"         "$SR $INS(order_id,founder_id,kind) values ('$O2','$Z','intake_reminder');"
expect 23502 "null order_id rejected"              "$SR $INS(order_id,founder_id,kind) values (null,'$A','intake_reminder');"
expect 23502 "null founder_id rejected"            "$SR $INS(order_id,founder_id,kind) values ('$O2',null,'intake_reminder');"
expect 23502 "null kind rejected"                  "$SR $INS(order_id,founder_id,kind) values ('$O2','$A',null);"
expect 23514 "oversized message_id rejected"       "$SR update public.card_order_emails set message_id = repeat('x',201) where id='$I';"
expect ok    "200-char message_id allowed"         "$SR update public.card_order_emails set message_id = repeat('x',200) where id='$I';"
expect 42501 "authenticated insert rejected"       "set request.jwt.claim.sub = '$A'; set role authenticated; $INS(order_id,founder_id,kind) values ('$O3','$A','intake_reminder');"
expect 42501 "authenticated update rejected"       "set request.jwt.claim.sub = '$A'; set role authenticated; update public.card_order_emails set message_id='x';"
expect 42501 "authenticated delete rejected"       "set request.jwt.claim.sub = '$A'; set role authenticated; delete from public.card_order_emails;"
expect 42501 "anon insert rejected"                "set role anon; $INS(order_id,founder_id,kind) values ('$O3','$A','review_request');"
expect 42501 "anon select rejected"                "set role anon; select * from public.card_order_emails;"
n=$(printf '%s\n' "set request.jwt.claim.sub = '$A'; set role authenticated; select count(*) from public.card_order_emails;" | q | tail -1)
[ "$n" = 2 ] && echo "PASS founder reads own rows ($n)" || { echo "FAIL founder reads own rows ($n)"; fail=1; }
n=$(printf '%s\n' "set request.jwt.claim.sub = '$B'; set role authenticated; select count(*) from public.card_order_emails;" | q | tail -1)
[ "$n" = 0 ] && echo "PASS other user reads nothing ($n)" || { echo "FAIL other user reads nothing ($n)"; fail=1; }
n=$(printf '%s\n' "select count(*) from public.card_order_emails where order_id in ('$O2','$O3');" | q | tail -1)
[ "$n" = 0 ] && echo "PASS no rejected write landed ($n)" || { echo "FAIL no rejected write landed ($n)"; fail=1; }
expect ok    "service deletes claim"               "$SR delete from public.card_order_emails where kind='review_request';"
exit $fail
