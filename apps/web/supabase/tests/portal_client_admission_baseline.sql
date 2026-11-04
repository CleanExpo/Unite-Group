-- Baseline for scripts/portal-client-admission-db-proof.sh. THROWAWAY database only.
-- Run BEFORE 20261104040000_portal_client_admission.sql, and again AFTER its rollback.
-- It proves the hole the migration closes is real (a control: a proof that cannot see the hole proves nothing),
-- and that staff behaviour is what the migration must preserve. Everything runs in one transaction that is
-- rolled back, so the database is left exactly as it was. Prints PORTAL_CLIENT_ADMISSION_BASELINE_PASS.

begin;

create function pg_temp.expect_error(stmt text, state text, label text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = state then return; end if;
    raise exception 'WRONG ERROR for %: got % (%), wanted %', label, sqlstate, sqlerrm, state;
  end;
  raise exception 'ALLOWED but should fail: %', label;
end $$;
create function pg_temp.expect_value(q text, want text, label text) returns void
language plpgsql as $$
declare got text;
begin
  execute q into got;
  if got is distinct from want then raise exception 'VALUE for %: got %, wanted %', label, got, want; end if;
end $$;
create function pg_temp.act_as(p_email text, p_aal text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'no fixture user %', p_email; end if;
  perform set_config('request.jwt.claim.sub', v_id::text, false);
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'email', p_email, 'aal', p_aal, 'role', 'authenticated')::text, false);
end $$;
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_value(text, text, text)
  to anon, authenticated, supabase_auth_admin, service_role;

-- ===== the hole: any signed-in account reads and writes the CRM =====
select pg_temp.act_as('mallory@evil.test', 'aal1');
set role authenticated;
select pg_temp.expect_value($$select count(*)::text from public.unified_customers$$, '3', 'BASELINE stranger reads customers');
select pg_temp.expect_value($$select count(*)::text from public.xero_tokens$$, '1', 'BASELINE stranger reads tokens');
select pg_temp.expect_value($$select count(*)::text from public.portals_registry$$, '1', 'BASELINE stranger reads portals_registry');
select pg_temp.expect_value($$select count(*)::text from public.event_log$$, '1', 'BASELINE stranger reads partitioned table');
select pg_temp.expect_value($$with i as (insert into public.leads (name) values ('planted') returning 1) select count(*)::text from i$$, '1', 'BASELINE stranger writes leads');
select pg_temp.expect_value($$select sample from public.xero_accounts_summary$$, 'xero-refresh-token-do-not-leak', 'BASELINE definer view leaks a token');
select pg_temp.expect_value($$select count(*)::text from public.metrics_rollup_latest$$, '3', 'BASELINE definer view leaks customers');
select pg_temp.expect_value($$with u as (update public.metrics_rollup_latest set name = 'written through a view' returning 1) select count(*)::text from u$$, '3', 'BASELINE definer view lets a stranger WRITE past row security');
select public.prune_integration_history();
select public.set_app_tenant('brii');
select pg_temp.expect_value($$select (public.before_user_created_hook('{"user":{"email":"phill.mcgurk@gmail.com"}}'::jsonb))->'user'->>'email'$$, 'phill.mcgurk@gmail.com', 'BASELINE signed-in user may call the signup hook');

-- ===== staff behaviour the migration must keep =====
reset role;
select pg_temp.act_as('phill.mcgurk@gmail.com', 'aal1');
set role authenticated;
select pg_temp.expect_value($$select count(*)::text from public.unified_customers$$, '3', 'BASELINE staff reads customers');
select pg_temp.expect_value($$with i as (insert into public.leads (name) values ('staff lead') returning 1) select count(*)::text from i$$, '1', 'BASELINE staff writes leads');

-- ===== the old hooks admit only the allowlist (an invited client cannot sign up) =====
reset role;
set role supabase_auth_admin;
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"ivi@brii.test"}}'::jsonb)$$, 'P0001', 'BASELINE old signup hook refuses the invited client');
select pg_temp.expect_value($$select (public.before_user_created_hook('{"user":{"email":"phill.mcgurk@gmail.com"}}'::jsonb))->'user'->>'email'$$, 'phill.mcgurk@gmail.com', 'BASELINE old signup hook admits staff');
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000000a1","claims":{}}'::jsonb)) -> 'error' ->> 'http_code'$$, '403', 'BASELINE old token hook refuses the client');

-- ===== anon is untouched =====
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.expect_value($$select count(*)::text from public.public_pages$$, '1', 'BASELINE anon reads public pages');

reset role;
rollback;
select 'PORTAL_CLIENT_ADMISSION_BASELINE_PASS';
