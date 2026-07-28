#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BASE_MIGRATION="$ROOT/supabase/migrations/20260713093000_unify_nexus_semantic_ingestion.sql"
REPAIR_MIGRATION="$ROOT/supabase/migrations/20260727010000_repair_nexus_semantic_coverage.sql"
HARDENING_MIGRATION="$ROOT/supabase/migrations/20260728010000_harden_nexus_semantic_freshness.sql"
CONTRACT="$ROOT/scripts/__tests__/nexus-semantic-sql-contract.sql"
CONTAINER="nexus-semantic-contract-${RANDOM}-$$"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --rm \
  --name "$CONTAINER" \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=nexus_contract \
  pgvector/pgvector:pg16 \
  >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready --username postgres --dbname nexus_contract >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  echo "Postgres contract container did not become ready" >&2
  exit 1
fi

docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE service_role;
CREATE ROLE anon;
CREATE SCHEMA extensions;
CREATE EXTENSION vector WITH SCHEMA extensions;
CREATE TABLE public.wiki_pages (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
SQL

docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 < "$BASE_MIGRATION"

if [[ -f "$REPAIR_MIGRATION" ]]; then
  docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 < "$REPAIR_MIGRATION"
fi

docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 < "$HARDENING_MIGRATION"
# The forward-only hardening migration is intentionally rerunnable so a failed
# branch validation can be retried without widening privileges or changing data.
docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 < "$HARDENING_MIGRATION"

docker exec -i "$CONTAINER" psql --username postgres --dbname nexus_contract --set ON_ERROR_STOP=1 < "$CONTRACT"
