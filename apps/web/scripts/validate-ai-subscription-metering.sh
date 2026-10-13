#!/bin/bash
# Throwaway-Postgres validation of
#   supabase/migrations/20261013090000_ai_subscription_metering.sql  (UNI-2780)
#
# Starts a disposable postgres container (trust auth, no credentials, removed on
# exit), stubs what Supabase provides (auth schema, auth.users, auth.uid(),
# anon/authenticated/service_role), builds the PRE-STATE as prod was read on
# 13/10/2026, applies the migration TWICE, asserts the constraints by SQL, then
# runs the migration's commented ROLLBACK section and asserts the schema
# fingerprint is back to the pre-state.
#
# This is NOT Supabase and NOT prod. It proves the SQL executes and the
# constraints behave on stock Postgres; it does not prove Supabase-specific
# behaviour (real auth, existing prod data, extensions, grants by Supabase).
#
# Usage: apps/web/scripts/validate-ai-subscription-metering.sh [postgres-image]
# Exit 0 only when every assertion passed.
set -u
IMAGE="${1:-postgres:17}"
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../supabase/migrations/20261013090000_ai_subscription_metering.sql"
POOL="$HERE/../supabase/migrations/20260623000000_provider_pool_tables.sql"
[ -f "$MIG" ] && [ -f "$POOL" ] || { echo "MISSING_FILES"; exit 2; }

NAME="ai-sub-metering-validate-$$"
docker run -d --rm --name "$NAME" -e POSTGRES_HOST_AUTH_METHOD=trust "$IMAGE" >/dev/null || { echo "DOCKER_RUN_FAIL"; exit 3; }
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
ready=1
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -U postgres -h 127.0.0.1 >/dev/null 2>&1; then ready=0; break; fi
  sleep 1
done
[ "$ready" = 0 ] || { echo "PG_NOT_READY"; exit 3; }
sleep 1

# DB selects the database (default 'postgres'); the drift scenario uses its own.
q() { docker exec -i "$NAME" psql -X -v ON_ERROR_STOP=1 -U postgres -d "${DB:-postgres}" -q "$@"; }
FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS + 1)); }
ERR="$(mktemp)"

# expect_ok <label> <sql>
expect_ok() {
  if printf '%s\n' "$2" | q >"$ERR" 2>&1; then pass "$1 (psql exit 0)"; else fail "$1 (psql exit $?): $(tr '\n' ' ' <"$ERR")"; fi
}
# expect_reject <label> <constraint-or-message-fragment> <sql>
expect_reject() {
  printf '%s\n' "$3" | q >"$ERR" 2>&1
  rc=$?
  if [ "$rc" -ne 0 ] && grep -q -- "$2" "$ERR"; then pass "$1 (psql exit $rc, rejected by $2)"
  else fail "$1 (psql exit $rc; expected rejection by $2): $(tr '\n' ' ' <"$ERR")"; fi
}
# expect_eq <label> <expected> <sql>
expect_eq() {
  got="$(printf '%s\n' "$3" | q -tA 2>"$ERR")"
  rc=$?
  if [ "$rc" -eq 0 ] && [ "$got" = "$2" ]; then pass "$1 (= $2, psql exit 0)"
  else fail "$1 (psql exit $rc; expected '$2', got '$got') $(tr '\n' ' ' <"$ERR")"; fi
}

echo "image: $IMAGE ($(docker exec "$NAME" postgres --version))"

# ── Supabase stubs (roles are cluster-wide; the rest is per database) ────────
q <<'SQL' || { echo "ROLES_FAIL"; exit 1; }
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
SQL

prestate() {
q <<'SQL' || return 1
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase's default privileges on public tables
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
SQL
# ── PRE-STATE (prod as read 13/10/2026) ──────────────────────────────────────
q <"$POOL" || return 1
q <<'SQL' || return 1
-- prod: provider_accounts RLS enabled AND forced
alter table public.provider_accounts force row level security;

-- ai_usage_logs exactly as prod (no CHECKs, no workspace FK, RLS enabled not forced)
create table public.ai_usage_logs (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  provider text not null,
  model_id text not null,
  task_type text,
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  tokens_thinking integer default 0,
  tokens_cached integer default 0,
  cost_usd numeric(10,6) not null default 0,
  cost_per_input_mtok numeric(10,2),
  cost_per_output_mtok numeric(10,2),
  latency_ms integer,
  response_size_bytes integer,
  success boolean not null default true,
  error_message text,
  error_code text,
  endpoint text,
  request_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  constraint ai_usage_logs_pkey primary key (id),
  constraint ai_usage_logs_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null
);
alter table public.ai_usage_logs enable row level security;

-- cost_source (+ the two tables the rollback references), minimal shape
create table public.cost_source (
  id text primary key,
  name text not null,
  reachability text not null default 'token' check (reachability in ('token', 'key-gate')),
  native_currency text not null default 'USD',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.raw_cost_event (id uuid primary key default gen_random_uuid(), cost_source_id text not null references public.cost_source(id));
create table public.cost_record (id uuid primary key default gen_random_uuid(), cost_source_id text not null references public.cost_source(id));
create table public.allocation_rule (id uuid primary key default gen_random_uuid(), cost_source_id text not null references public.cost_source(id), match_key text not null);

-- WORST-CASE policy drift: prod's full policy inventory was not read, so assume
-- a broad legacy permissive SELECT exists on both tables. Founder isolation
-- must hold anyway (restrictive policies in the migration).
create policy legacy_select_all on public.ai_usage_logs for select using (true);
create policy legacy_select_all on public.provider_accounts for select using (true);
alter table public.cost_source enable row level security;
alter table public.cost_source force row level security;
insert into public.cost_source (id, name, reachability, native_currency) values
  ('vercel','Vercel','token','USD'), ('digitalocean','DigitalOcean','key-gate','USD'),
  ('stripe','Stripe','token','AUD'), ('railway','Railway','token','USD'),
  ('supabase','Supabase','token','USD'), ('anthropic','Anthropic','key-gate','USD'),
  ('openai','OpenAI','key-gate','USD'), ('elevenlabs','ElevenLabs','key-gate','USD'),
  ('twilio','Twilio','key-gate','USD'), ('domains','Domains','key-gate','AUD');

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
SQL
}
prestate || { echo "PRESTATE_FAIL"; exit 1; }

FINGERPRINT_SQL="
select 'col|'||table_name||'|'||column_name||'|'||data_type||'|'||coalesce(numeric_precision::text,'')||','||coalesce(numeric_scale::text,'')||'|'||is_nullable||'|'||coalesce(column_default,'')
  from information_schema.columns where table_schema='public' and table_name in ('ai_usage_logs','provider_accounts','provider_quota_events','cost_source')
union all select 'con|'||conrelid::regclass::text||'|'||conname||'|'||pg_get_constraintdef(oid)
  from pg_constraint where conrelid in ('public.ai_usage_logs'::regclass,'public.provider_accounts'::regclass,'public.provider_quota_events'::regclass,'public.cost_source'::regclass)
union all select 'idx|'||tablename||'|'||indexdef from pg_indexes where schemaname='public' and tablename in ('ai_usage_logs','provider_accounts','provider_quota_events','cost_source')
union all select 'pol|'||tablename||'|'||policyname||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'') from pg_policies where schemaname='public'
union all select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid in ('public.ai_usage_logs'::regclass,'public.provider_accounts'::regclass,'public.cost_source'::regclass)
union all select 'grant|'||table_name||'|'||grantee||'|'||privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('ai_usage_logs','provider_accounts')
union all select 'seed|'||id from public.cost_source
order by 1;"
PRE="$(printf '%s\n' "$FINGERPRINT_SQL" | q -tA)" || { echo "FINGERPRINT_FAIL"; exit 1; }
echo "pre-state fingerprint: $(printf '%s\n' "$PRE" | wc -l | tr -d ' ') lines"

# ── apply twice ───────────────────────────────────────────────────────────────
q <"$MIG" >"$ERR" 2>&1; rc=$?
[ "$rc" -eq 0 ] && pass "A1 migration apply #1 (psql exit 0)" || { fail "A1 migration apply #1 (psql exit $rc): $(tr '\n' ' ' <"$ERR")"; exit 1; }
q <"$MIG" >"$ERR" 2>&1; rc=$?
[ "$rc" -eq 0 ] && pass "A2 migration apply #2 — idempotent (psql exit 0)" || { fail "A2 migration apply #2 (psql exit $rc): $(tr '\n' ' ' <"$ERR")"; exit 1; }

A='00000000-0000-0000-0000-00000000000a'
B='00000000-0000-0000-0000-00000000000b'

# ── provider_accounts constraints ────────────────────────────────────────────
expect_reject "A3 subscription + routable=true rejected" provider_accounts_subscription_unroutable \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','cursor','Cursor \$60','subscription',true);"
expect_reject "A3b subscription relying on routable default (true) rejected" provider_accounts_subscription_unroutable \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind) values ('$A','heygen','HeyGen','subscription');"
expect_reject "A3c claude_max with billing_kind NULL rejected (NOT NULL)" 'null value in column "billing_kind"' \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','claude_max','Claude Max A',null,true);"
expect_reject "A3d routable NULL rejected (NOT NULL)" 'null value in column "routable"' \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','cursor','Cursor','subscription',null);"
expect_eq "A3e billing_kind and routable are NOT NULL with defaults metered/true" "billing_kind|NO|'metered'::text routable|NO|true" \
  "select string_agg(column_name||'|'||is_nullable||'|'||column_default, ' ' order by column_name) from information_schema.columns where table_schema='public' and table_name='provider_accounts' and column_name in ('billing_kind','routable');"
expect_reject "A4 claude_max with billing_kind metered rejected" provider_accounts_subscription_only_providers \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','claude_max','Claude Max A','metered',false);"
expect_reject "A4b chatgpt_pro with billing_kind prepaid rejected" provider_accounts_subscription_only_providers \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','chatgpt_pro','ChatGPT Pro','prepaid',false);"
expect_ok "A5 cursor subscription, routable=false, plan_price_aud 200.00 accepted" \
  "insert into public.provider_accounts (id, founder_id, provider, label, billing_kind, routable, plan_price_aud, renewal_date, quota_unit, quota_limit) values ('20000000-0000-0000-0000-000000000005','$A','cursor','Cursor \$200','subscription',false,200.00,'2026-11-01','requests',500);"
expect_ok "A5b two separate claude_max subscription seats accepted" \
  "insert into public.provider_accounts (id, founder_id, provider, label, billing_kind, routable) values ('20000000-0000-0000-0000-0000000000a1','$A','claude_max','Claude Max seat A','subscription',false), ('20000000-0000-0000-0000-0000000000a2','$A','claude_max','Claude Max seat B','subscription',false);"
expect_reject "A5c negative plan_price_aud rejected" provider_accounts_plan_price_aud_check \
  "insert into public.provider_accounts (founder_id, provider, label, plan_price_aud) values ('$A','xai','Grok',-1);"
expect_reject "A5d unknown quota_unit rejected" provider_accounts_quota_unit_check \
  "insert into public.provider_accounts (founder_id, provider, label, quota_unit) values ('$A','xai','Grok','bananas');"
expect_ok "A6 old providers (claude, openai, minimax, gemini, openrouter) accepted with old column set" \
  "insert into public.provider_accounts (id, founder_id, provider, label, plan, allow_metered) values ('20000000-0000-0000-0000-000000000c01','$A','claude','c','{}',false), ('20000000-0000-0000-0000-000000000c02','$A','openai','o','{}',false), ('20000000-0000-0000-0000-000000000c03','$A','minimax','m','{}',false), ('20000000-0000-0000-0000-000000000c04','$A','gemini','g','{}',false), ('20000000-0000-0000-0000-000000000c05','$A','openrouter','r','{}',false);"
expect_eq "A6b old-provider rows default to billing_kind metered, routable true" "5" \
  "select count(*) from public.provider_accounts where id::text like '20000000-0000-0000-0000-000000000c0%' and billing_kind='metered' and routable;"
expect_reject "A6c unknown provider 'grok' rejected" provider_accounts_provider_check \
  "insert into public.provider_accounts (founder_id, provider, label) values ('$A','grok','g');"
expect_eq "A6d exactly one provider CHECK remains after two applies" "1" \
  "select count(*) from pg_constraint where conrelid='public.provider_accounts'::regclass and contype='c' and pg_get_constraintdef(oid) ~* '\\mprovider\\M\\s*(=|in\\M)';"

# ── ai_usage_logs ────────────────────────────────────────────────────────────
# The current recorder's exact default-path column set (src/lib/ai/usage-recorder.ts).
LEGACY_INSERT="insert into public.ai_usage_logs (provider, model_id, task_type, tokens_input, tokens_output, tokens_cached, cost_usd, cost_per_input_mtok, cost_per_output_mtok, request_id, latency_ms, success, metadata) values ('anthropic','claude-haiku-4-5','strategy-daily',1000,2000,0,0.011,1,5,'msg_legacy',120,true,'{}');"
expect_ok "A7 recorder default-path insert (legacy column set) accepted" "$LEGACY_INSERT"
expect_ok "A7b same legacy insert again (source NULL, same request_id) accepted — historical rows cannot collide" "$LEGACY_INSERT"
expect_ok "A8a first (source=swarm, request_id=r1) accepted" \
  "insert into public.ai_usage_logs (provider, model_id, source, request_id, founder_id, provider_account_id, project) values ('openrouter','m','swarm','r1','$A','20000000-0000-0000-0000-000000000c05','unite-group');"
expect_reject "A8 duplicate (source=swarm, request_id=r1) rejected" ai_usage_logs_source_request_id_uidx \
  "insert into public.ai_usage_logs (provider, model_id, source, request_id) values ('openrouter','m','swarm','r1');"
expect_ok "A8b same request_id under a different source accepted" \
  "insert into public.ai_usage_logs (provider, model_id, source, request_id) values ('openrouter','m','manual','r1');"
expect_ok "A9 two rows with source=swarm and NULL request_id accepted" \
  "insert into public.ai_usage_logs (provider, model_id, source, request_id, founder_id) values ('xai','grok','swarm',null,'$B'), ('xai','grok','swarm',null,'$B');"
expect_reject "A9b unknown source rejected" ai_usage_logs_source_check \
  "insert into public.ai_usage_logs (provider, model_id, source) values ('x','m','bogus');"
expect_ok "A9c deleting a provider account" \
  "delete from public.provider_accounts where id='20000000-0000-0000-0000-000000000c05';"
expect_eq "A9d usage row survives with provider_account_id set NULL (FK on delete set null)" "1|" \
  "select count(*)||'|'||coalesce(max(provider_account_id::text),'') from public.ai_usage_logs where request_id='r1' and source='swarm';"

# ── RLS ──────────────────────────────────────────────────────────────────────
expect_eq "A10 RLS: ai_usage_logs enabled (not forced), provider_accounts enabled+forced" "ai_usage_logs|true|false provider_accounts|true|true" \
  "select string_agg(relname||'|'||relrowsecurity||'|'||relforcerowsecurity, ' ' order by relname) from pg_class where oid in ('public.ai_usage_logs'::regclass,'public.provider_accounts'::regclass);"
expect_eq "A10b authenticated founder A sees only A's ai_usage_logs rows" "1" \
  "set role authenticated; set request.jwt.claim.sub = '$A'; select count(*) from public.ai_usage_logs;"
expect_eq "A10c authenticated founder B sees only B's ai_usage_logs rows" "2" \
  "set role authenticated; set request.jwt.claim.sub = '$B'; select count(*) from public.ai_usage_logs;"
expect_reject "A10d authenticated cannot insert into ai_usage_logs (no write policy)" "row-level security" \
  "set role authenticated; set request.jwt.claim.sub = '$A'; insert into public.ai_usage_logs (provider, model_id, founder_id) values ('x','m','$A');"
expect_eq "A10e the broad legacy permissive SELECT policies are present (A10b/c/g are not vacuous)" "2" \
  "select count(*) from pg_policies where schemaname='public' and policyname='legacy_select_all' and permissive='PERMISSIVE';"
expect_ok "A10f seed one provider_accounts row for founder B" \
  "insert into public.provider_accounts (id, founder_id, provider, label) values ('20000000-0000-0000-0000-0000000000b1','$B','openai','B api');"
expect_eq "A10g founder A cannot read founder B's provider_accounts or ai_usage_logs rows via any policy" "0|0" \
  "set role authenticated; set request.jwt.claim.sub = '$A'; select (select count(*) from public.provider_accounts where founder_id='$B')||'|'||(select count(*) from public.ai_usage_logs where founder_id is distinct from '$A');"
expect_eq "A10h founder B sees exactly its own provider_accounts row" "1" \
  "set role authenticated; set request.jwt.claim.sub = '$B'; select count(*) from public.provider_accounts;"
expect_ok "A10i founder-session insert into provider_accounts (the POST path) still works" \
  "set role authenticated; set request.jwt.claim.sub = '$A'; insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','heygen','HeyGen','subscription',false);"
expect_reject "A10j founder A cannot insert a provider_accounts row for founder B" "row-level security" \
  "set role authenticated; set request.jwt.claim.sub = '$A'; insert into public.provider_accounts (founder_id, provider, label) values ('$B','openai','x');"

# ── seed ─────────────────────────────────────────────────────────────────────
expect_eq "A11 cost_source 'ai_subscriptions' present exactly once after two applies" "1|key-gate|AUD" \
  "select count(*)||'|'||max(reachability)||'|'||max(native_currency) from public.cost_source where id='ai_subscriptions';"

# ── ROLLBACK ─────────────────────────────────────────────────────────────────
# Precondition documented in the migration: rows using a widened provider value
# block restoring the original CHECK and must be removed/migrated first.
expect_ok "A12a rollback precondition: remove widened-provider rows" \
  "delete from public.provider_accounts where provider not in ('claude','openai','minimax','gemini','openrouter');"
ROLLBACK_SQL="$(awk '/^-- begin;$/{r=1} r{sub(/^-- /,""); print} /^-- commit;$/{r=0}' "$MIG")"
printf '%s\n' "$ROLLBACK_SQL" | grep -q '^begin;' && printf '%s\n' "$ROLLBACK_SQL" | grep -q '^commit;' \
  || fail "A12b rollback section extraction (begin/commit not found)"
printf '%s\n' "$ROLLBACK_SQL" | q >"$ERR" 2>&1; rc=$?
[ "$rc" -eq 0 ] && pass "A12b rollback section executes (psql exit 0)" || fail "A12b rollback section (psql exit $rc): $(tr '\n' ' ' <"$ERR")"
POST="$(printf '%s\n' "$FINGERPRINT_SQL" | q -tA)"
if [ "$PRE" = "$POST" ]; then pass "A12c schema/RLS/grant/seed fingerprint identical to pre-state ($(printf '%s\n' "$PRE" | wc -l | tr -d ' ') lines)"
else fail "A12c fingerprint differs after rollback:"; diff <(printf '%s\n' "$PRE") <(printf '%s\n' "$POST"); fi

# ── DRIFT scenario (separate database) ───────────────────────────────────────
# Not the prod state: billing_kind/routable pre-exist as NULLABLE columns with
# unsafe rows. The migration must close the NULL hole in the safe direction.
q -c "create database drift" >/dev/null 2>&1 || fail "D0 create drift database"
DB=drift
prestate || fail "D0 drift pre-state"
expect_ok "D1 drift setup: nullable billing_kind/routable with a claude_max NULL/true row" \
  "alter table public.provider_accounts add column billing_kind text; alter table public.provider_accounts add column routable boolean;
   insert into public.provider_accounts (id, founder_id, provider, label, billing_kind, routable) values
     ('30000000-0000-0000-0000-000000000001','$A','claude','api',null,null),
     ('30000000-0000-0000-0000-000000000002','$A','openai','api',null,true);"
q -c "alter table public.provider_accounts drop constraint provider_accounts_provider_check" >/dev/null 2>&1
expect_ok "D1b drift row: claude_max with billing_kind NULL, routable true" \
  "insert into public.provider_accounts (id, founder_id, provider, label, billing_kind, routable) values ('30000000-0000-0000-0000-000000000003','$A','claude_max','seat',null,true);"
q <"$MIG" >"$ERR" 2>&1; rc=$?
[ "$rc" -eq 0 ] && pass "D2 migration applies over the drifted columns (psql exit 0)" || fail "D2 migration over drift (psql exit $rc): $(tr '\n' ' ' <"$ERR")"
expect_eq "D3 drifted rows backfilled in the safe direction" "claude|metered|true claude_max|subscription|false openai|metered|true" \
  "select string_agg(provider||'|'||billing_kind||'|'||routable, ' ' order by provider) from public.provider_accounts where id::text like '30000000%';"
expect_eq "D4 drifted columns are now NOT NULL" "NO NO" \
  "select string_agg(is_nullable, ' ') from information_schema.columns where table_schema='public' and table_name='provider_accounts' and column_name in ('billing_kind','routable');"
expect_reject "D5 claude_max NULL/true can no longer be inserted" 'null value in column "billing_kind"' \
  "insert into public.provider_accounts (founder_id, provider, label, billing_kind, routable) values ('$A','claude_max','seat2',null,true);"

# ── ROLLBACK with a referenced seed (allocation_rule) ────────────────────────
expect_ok "D6 allocation_rule references the ai_subscriptions seed; widened rows removed (precondition)" \
  "insert into public.allocation_rule (cost_source_id, match_key) values ('ai_subscriptions','claude_max:*');
   delete from public.provider_accounts where provider not in ('claude','openai','minimax','gemini','openrouter');"
printf '%s\n' "$ROLLBACK_SQL" | q >"$ERR" 2>&1; rc=$?
[ "$rc" -eq 0 ] && pass "D7 rollback completes despite the referenced seed (psql exit 0)" || fail "D7 rollback with referenced seed (psql exit $rc): $(tr '\n' ' ' <"$ERR")"
expect_eq "D8 referenced seed preserved; subscription columns and restrictive policies removed" "1|0|0" \
  "select (select count(*) from public.cost_source where id='ai_subscriptions')||'|'||(select count(*) from information_schema.columns where table_schema='public' and table_name='provider_accounts' and column_name in ('plan_price_aud','renewal_date','quota_unit','quota_limit'))||'|'||(select count(*) from pg_policies where policyname like '%founder_restrict');"
DB=postgres

rm -f "$ERR"
echo "---"
if [ "$FAILS" -eq 0 ]; then echo "ALL_OK"; exit 0; else echo "FAILED: $FAILS assertion(s)"; exit 1; fi
