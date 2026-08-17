#!/usr/bin/env bash
# Reproduce the spine CI database locally, WITHOUT Docker or the Supabase CLI.
#
# WHY THIS EXISTS. Wiring the spine job up took five CI round trips, each ~4
# minutes, because the only way to run the migration chain was to push and wait.
# Every one of the failures below is findable in seconds against a local
# Postgres. If you are changing ci/00_extensions.sql, the migration order, or
# the roles used to apply them, run this first.
#
#   sudo ./ci/local-repro.sh
#
# WHAT IT IS NOT. This is a debugging loop, not the gate. It shims auth.jwt()
# and auth.uid() rather than using Supabase's real ones, so it can tell you a
# migration is broken but must never be used to claim the RLS behaviour is
# correct — that is what the CI job's real Supabase image is for.
#
# KNOWN DIVERGENCE. Distro pgvector is often older than the Supabase image's.
# On pgvector < 0.8 migrations/0005 fails with `invalid configuration parameter
# name "hnsw.iterative_scan"` because that GUC does not exist yet, whereas CI
# fails (or passes) on privileges. Check `select extversion from pg_extension
# where extname='vector'` before believing a 0005 failure.
set -euo pipefail
cd "$(dirname "$0")/.."

DB=spinetest
APP=spineapp

command -v pg_ctlcluster >/dev/null || {
  echo "installing postgres + pgvector..."
  apt-get install -y --no-install-recommends postgresql postgresql-contrib >/dev/null
  apt-get install -y --no-install-recommends "postgresql-$(ls /usr/lib/postgresql | head -1)-pgvector" >/dev/null
}
pg_ctlcluster "$(ls /usr/lib/postgresql | head -1)" main start 2>/dev/null || true

# A NON-superuser app role, because that is what supautils leaves you with on
# the Supabase image and it is the source of most of the privilege surprises.
su postgres -c "psql -q" <<SQL
drop database if exists $DB;
drop role if exists $APP; drop role if exists authenticated; drop role if exists anon;
create role authenticated nologin;
create role anon nologin;
create role $APP login password '$APP' nosuperuser;
grant authenticated to $APP;
create database $DB owner $APP;
SQL

# Stand in for the auth schema the Supabase image ships. Shim only — see above.
su postgres -c "psql -q -d $DB" <<'SQL'
create schema if not exists auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;
grant usage on schema auth to public;
SQL

# Same three phases, same roles, as the CI job.
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB" < ci/00_extensions.sql
su postgres -c "psql -q -d $DB -c \"grant set on parameter hnsw.iterative_scan, hnsw.ef_search, hnsw.max_scan_tuples, hnsw.scan_mem_multiplier to $APP\"" || true

export PGPASSWORD=$APP
for f in migrations/000[1-5]_*.sql; do
  printf '── %s ' "$f"
  psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -U "$APP" -d "$DB" -f "$f" && echo OK
done

# Seed needs an RLS-bypassing role: core.party and siblings are FORCE ROW LEVEL
# SECURITY, which binds even the owner.
printf '── seed '
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB" < seed/0001_seed.sql && echo OK

su postgres -c "psql -d $DB -c 'select count(*) as parties from core.party'"
echo
echo "Connect the suites at: postgresql://$APP:$APP@127.0.0.1:5432/$DB"
