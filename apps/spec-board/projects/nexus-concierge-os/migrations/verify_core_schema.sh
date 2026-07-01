#!/usr/bin/env bash
# ============================================================================
# verify_core_schema.sh — re-prove the Nexus Concierge OS core schema template.
#
# Applies 0001_core_schema.sql to a throwaway Postgres, re-applies it (proving
# idempotency), and probes every load-bearing invariant. A vertical should run
# this against the template BEFORE copying it into its own data plane.
#
#   ./verify_core_schema.sh                 # uses docker (postgres:16-alpine)
#   PGURL=postgres://user:pw@host/db ./verify_core_schema.sh   # use an existing DB
#
# Exit 0 = all invariants hold. Non-zero = a named check failed.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"
SQL=0001_core_schema.sql
PORT=${PORT:-55440}
CID=""

cleanup() { [ -n "$CID" ] && docker stop "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [ -n "${PGURL:-}" ]; then
  psql() { command psql "$PGURL" "$@"; }
else
  command -v docker >/dev/null || { echo "FAIL: need docker or PGURL"; exit 2; }
  CID=$(docker run -d --rm -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=core -p "$PORT":5432 postgres:16-alpine)
  CID=${CID:0:12}
  export PGPASSWORD=pw
  psql() { command psql -h 127.0.0.1 -p "$PORT" -U postgres -d core "$@"; }
  for _ in $(seq 1 30); do psql -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done
fi

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; exit 1; }

# expect_err REGEX SQL LABEL — the SQL must be rejected with an error matching REGEX.
# Captures psql output (|| true so its non-zero exit doesn't trip pipefail/set -e),
# then greps the captured string — no pipe from psql, so the check is reliable.
expect_err() {
  local re=$1 sql=$2 label=$3 out
  out=$(psql -c "$sql" 2>&1 || true)
  echo "$out" | grep -qi "$re" && pass "$label" || fail "$label — got: $out"
}

echo "── apply + idempotency ──"
psql -q -f "$SQL"                                  && pass "apply #1"          || fail "apply #1"
psql -q -f "$SQL" >/dev/null 2>&1                  && pass "re-apply no-op"    || fail "re-apply"

echo "── structure ──"
[ "$(psql -tAc "select count(*) from information_schema.tables where table_schema='public'")" = 9 ] \
  && pass "9 core tables" || fail "table count != 9"
[ "$(psql -tAc "select count(*) from pg_class where relrowsecurity and relkind='r'")" = 9 ] \
  && pass "RLS enabled on all 9" || fail "RLS not on all 9"

echo "── seed (committed) ──"
psql -q -c "insert into vertical_pack(slug) values('verify');
            insert into \"case\"(vertical_pack_id,next_action_at) select id,now() from vertical_pack;
            insert into provider(vertical_pack_id) select id from vertical_pack;"

echo "── load-bearing invariants ──"
expect_err 'null value in column "next_action_at"' \
  "insert into \"case\"(vertical_pack_id,next_action_at) select id,null from vertical_pack;" \
  "never-close: case next_action_at NOT NULL"
expect_err 'null value in column "next_action_at"' \
  "insert into srt(case_id,next_action_at) select id,null from \"case\";" \
  "never-close: srt next_action_at NOT NULL"
expect_err 'violates check constraint' \
  "insert into handoff(case_id,provider_id,opaque_token,carries_pii) select c.id,p.id,'t',true from \"case\" c,provider p;" \
  "PII-free handoff: carries_pii=true rejected"
expect_err 'violates check constraint' \
  "insert into referral_ledger(case_id,kind) select id,'bogus' from \"case\";" \
  "referral kind enum enforced"

echo "── happy path ──"
hp=$(psql -qtAc "insert into handoff(case_id,provider_id,opaque_token) select c.id,p.id,'ok' from \"case\" c,provider p limit 1 returning carries_pii;")
[ "$hp" = f ] && pass "valid PII-free handoff inserts (carries_pii=f)" || fail "valid handoff rejected — got: $hp"

echo "ALL INVARIANTS HOLD"
