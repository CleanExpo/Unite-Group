-- Proof for 20261104040000_portal_client_admission.sql. THROWAWAY database only
-- (scripts/portal-client-admission-db-proof.sh builds it from the real portal migrations plus
-- portal_client_admission_crm_fixture.sql). Any failed expectation raises, so
-- PORTAL_CLIENT_ADMISSION_PROOF_PASS prints only when every case held.
-- Staff = phill + contact (allowlist). Ivi = the invited BRII client. Mallory = a signed-in stranger.

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

-- ===== shape: every non-portal table carries the restrictive gate; no portal_* table does =====
select pg_temp.expect_value($$
  select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname not like 'portal\_%'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
      and p.policyname = 'staff_only_gate' and p.permissive = 'RESTRICTIVE' and p.roles = '{authenticated}' and p.cmd = 'ALL')$$,
  '0', 'every non-portal table is gated');
select pg_temp.expect_value($$
  select count(*)::text from pg_policies where schemaname = 'public' and policyname = 'staff_only_gate' and tablename like 'portal\_%'$$,
  '0', 'no portal_* table is gated (the portal keeps working)');
select pg_temp.expect_value($$select (count(*) >= 10)::text from pg_policies where schemaname = 'public' and policyname = 'staff_only_gate'$$,
  'true', 'the gate actually landed on the fixture tables');

-- ===== staff: unchanged =====
select pg_temp.act_as('phill.mcgurk@gmail.com', 'aal1');
set role authenticated;
select pg_temp.expect_value($$select public.is_staff()::text$$, 'true', 'staff is staff');
select pg_temp.expect_value($$select count(*)::text from public.unified_customers$$, '3', 'staff reads customers');
select pg_temp.expect_value($$select count(*)::text from public.xero_tokens$$, '1', 'staff reads FORCE-RLS table');
select pg_temp.expect_value($$select count(*)::text from public.event_log$$, '1', 'staff reads partitioned table');
select pg_temp.expect_value($$select count(*)::text from public.metrics_rollup_latest$$, '3', 'staff reads through a view');
select pg_temp.expect_value($$with i as (insert into public.leads (name) values ('staff lead') returning 1) select count(*)::text from i$$, '1', 'staff writes leads');
select pg_temp.expect_value($$with u as (update public.leads set name = name where name = 'staff lead' returning 1) select count(*)::text from u$$, '1', 'staff updates leads');
reset role;

-- ===== hooks, BEFORE the client has an account =====
set role supabase_auth_admin;
select pg_temp.expect_value($$select (public.before_user_created_hook('{"user":{"email":" IVI@Brii.test "}}'::jsonb))->'user'->>'email'$$, ' IVI@Brii.test ', 'signup hook admits the bound invite email (case and spaces ignored)');
select pg_temp.expect_value($$select (public.before_user_created_hook('{"user":{"email":"phill.mcgurk@gmail.com"}}'::jsonb))->'user'->>'email'$$, 'phill.mcgurk@gmail.com', 'signup hook still admits staff');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"mallory@evil.test"}}'::jsonb)$$, 'P0001', 'signup hook refuses a stranger');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"late@example.test"}}'::jsonb)$$, 'P0001', 'signup hook refuses an expired invite');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"revoked@example.test"}}'::jsonb)$$, 'P0001', 'signup hook refuses a revoked invite');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":""}}'::jsonb)$$, 'P0001', 'signup hook refuses an empty email');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{}}'::jsonb)$$, 'P0001', 'signup hook refuses a missing email');
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000000a1","claims":{}}'::jsonb) ? 'error')::text$$, 'false', 'token hook admits the client while her invite is open');
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000000b2","claims":{}}'::jsonb)) -> 'error' ->> 'http_code'$$, '403', 'token hook refuses a stranger');
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-000000000001","claims":{}}'::jsonb) ? 'error')::text$$, 'false', 'token hook admits staff');
reset role;

-- An unbound invite never creates an account: the only open unbound code (BBBB) admits nobody new.
set role supabase_auth_admin;
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"anyone@unbound.test"}}'::jsonb)$$, 'P0001', 'unbound invite cannot create an account');
reset role;

-- ===== the client at aal1: nothing outside the portal =====
select pg_temp.act_as('Ivi@Brii.test', 'aal1');
set role authenticated;
select pg_temp.expect_value($$select public.is_staff()::text$$, 'false', 'client is not staff');
select pg_temp.expect_value($$select count(*)::text from public.unified_customers$$, '0', 'client reads no customers');
select pg_temp.expect_value($$select count(*)::text from public.leads$$, '0', 'client reads no leads');
select pg_temp.expect_value($$select count(*)::text from public.xero_tokens$$, '0', 'client reads no tokens (FORCE RLS table)');
select pg_temp.expect_value($$select count(*)::text from public.portals_registry$$, '0', 'client reads nothing from a portal-like name');
select pg_temp.expect_value($$select count(*)::text from public.event_log$$, '0', 'client reads nothing from a partitioned table');
select pg_temp.expect_value($$select count(*)::text from public.event_log_2026$$, '0', 'client reads nothing from a partition directly');
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications$$, '0', 'client reads no founder notifications');
select pg_temp.expect_value($$select count(*)::text from public.auth_allowlist$$, '0', 'client reads no allowlist');
select pg_temp.expect_error($$insert into public.leads (name) values ('planted by client')$$, '42501', 'client cannot insert leads');
select pg_temp.expect_error($$insert into public.xero_tokens (secret) values ('x')$$, '42501', 'client cannot insert tokens');
select pg_temp.expect_value($$with u as (update public.unified_customers set name = 'pwned' returning 1) select count(*)::text from u$$, '0', 'client updates no customers');
select pg_temp.expect_value($$with d as (delete from public.xero_tokens returning 1) select count(*)::text from d$$, '0', 'client deletes no tokens');
-- views run with the caller's rights (as on prod), so the gate covers them: nothing through a view either
select pg_temp.expect_value($$select coalesce(sample, '<none>') from public.xero_accounts_summary$$, '<none>', 'client reads no token through a view');
select pg_temp.expect_value($$select count(*)::text from public.metrics_rollup_latest$$, '0', 'client reads no customers through a view');
select pg_temp.expect_value($$with u as (update public.metrics_rollup_latest set name = 'pwned' returning 1) select count(*)::text from u$$, '0', 'client writes nothing through a view');
select pg_temp.expect_error($$select public.prune_integration_history()$$, '42501', 'client cannot prune');
select pg_temp.expect_error($$select public.set_app_tenant('brii')$$, '42501', 'client cannot set the app tenant');
select pg_temp.expect_error($$select public.before_user_created_hook('{}'::jsonb)$$, '42501', 'client cannot call the signup hook');
select pg_temp.expect_error($$select public.custom_access_token_hook('{}'::jsonb)$$, '42501', 'client cannot call the token hook');
select pg_temp.expect_error($$select public.portal_notify_staff_change_request()$$, '42501', 'client cannot call the notify function');
-- the portal itself still works at aal1 (asks for the second factor)
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'needs_second_factor', 'portal asks for second factor at aal1');
reset role;

-- ===== the client at aal2: redeems, uses the portal, still sees no CRM =====
select pg_temp.act_as('Ivi@Brii.test', 'aal2');
set role authenticated;
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'redeemed', 'client redeems her bound invite');
select pg_temp.expect_value($$select tenant_slug from public.portal_tenant_members$$, 'brii', 'client sees her own membership');
select pg_temp.expect_value($$select public.portal_owner_tenant_slug()$$, 'brii', 'client owns the brii portal');
select pg_temp.expect_value($$select (public.portal_create_change_request('home', 'Please swap the hero photo for the new training room', null) is not null)::text$$, 'true', 'client submits a change request');
select pg_temp.expect_value($$select count(*)::text from public.portal_change_requests$$, '1', 'client sees her change request');
select pg_temp.expect_value($$select count(*)::text from public.unified_customers$$, '0', 'client at aal2 still reads no customers');
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications$$, '0', 'client at aal2 reads no founder notifications');
select pg_temp.expect_error($$insert into public.leads (name) values ('planted at aal2')$$, '42501', 'client at aal2 cannot insert leads');
reset role;

-- ===== staff are told: one notification per staff account, on submit and on each status change =====
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications where type = 'portal_change_request'$$, '2', 'both staff accounts notified of the new request');
select pg_temp.expect_value($$select string_agg(founder_id::text, ',' order by founder_id) from public.founder_notifications where type = 'portal_change_request'$$,
  '00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002', 'only staff are notified (not the client, not the stranger)');
select pg_temp.expect_value($$select payload ->> 'tenant_slug' || '|' || (payload ->> 'page') || '|' || (payload ->> 'status') || '|' || (payload ->> 'event') from public.founder_notifications where type = 'portal_change_request' limit 1$$,
  'brii|home|submitted|insert', 'notification payload names tenant, page, status and event');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from public.portal_change_requests), 'start')$$, 'in_progress', 'team starts the request');
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications where type = 'portal_change_request'$$, '4', 'status change notifies staff again');
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications where type = 'portal_change_request' and payload ->> 'event' = 'update' and payload ->> 'status' = 'in_progress'$$, '2', 'update notification carries the new status');
update public.portal_change_requests set status = status;
update public.portal_change_requests set request_text = request_text || ' (edited)';
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications where type = 'portal_change_request'$$, '4', 'no notification when status did not change');

-- with no staff account to notify, a change request fails loudly and nothing is stored
do $$
begin
  delete from public.auth_allowlist;
  begin
    insert into public.portal_change_requests (tenant_slug, page, request_text) values ('brii', 'home', 'orphan request nobody would see');
    raise exception 'ALLOWED but should fail: a change request with no staff recipient';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'portal_no_staff_recipient' then raise; end if;
  end;
  raise exception 'proof_rollback_marker';
exception when others then
  if sqlerrm <> 'proof_rollback_marker' then raise; end if;
end $$;
select pg_temp.expect_value($$select count(*)::text from public.auth_allowlist$$, '3', 'allowlist restored after the no-staff case');
select pg_temp.expect_value($$select count(*)::text from public.portal_change_requests where request_text like 'orphan%'$$, '0', 'no orphan request stored when no staff exists');

-- staff read the notification in the command centre (their own row only)
select pg_temp.act_as('phill.mcgurk@gmail.com', 'aal1');
set role authenticated;
select pg_temp.expect_value($$select count(*)::text from public.founder_notifications where type = 'portal_change_request'$$, '2', 'staff reads own notifications');
reset role;

-- ===== hooks AFTER redemption =====
set role supabase_auth_admin;
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000000a1","claims":{}}'::jsonb) ? 'error')::text$$, 'false', 'token hook keeps admitting the client as a member');
select pg_temp.expect_error($$select public.before_user_created_hook('{"user":{"email":"ivi@brii.test"}}'::jsonb)$$, 'P0001', 'a redeemed invite cannot create a second account');
reset role;

-- ===== anon is untouched by the gate (the policy targets authenticated only) =====
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.expect_value($$select count(*)::text from public.public_pages$$, '1', 'anon still reads public pages');
select pg_temp.expect_error($$select public.is_staff()$$, '42501', 'anon cannot call is_staff');
select pg_temp.expect_error($$select public.prune_integration_history()$$, '42501', 'anon cannot prune');
reset role;

-- ===== offboarding: removing the membership locks the client out at the token =====
delete from public.portal_tenant_members where user_id = '00000000-0000-0000-0000-0000000000a1';
set role supabase_auth_admin;
select pg_temp.expect_value($$select (public.custom_access_token_hook('{"user_id":"00000000-0000-0000-0000-0000000000a1","claims":{}}'::jsonb)) -> 'error' ->> 'http_code'$$, '403', 'removing the membership ends token issue');
reset role;

select 'PORTAL_CLIENT_ADMISSION_PROOF_PASS';
