-- Invited-owner journey across the three portal slices, in the database (UNI-3167 invite, UNI-3168 changes and
-- setup, UNI-3174 owner). Run as a superuser on a THROWAWAY database after every portal migration, including
-- 20261103120000_portal_owner_tenant_from_membership.sql: scripts/portal-owner-db-proof.sh. Never on a live project.
-- Any failed expectation raises, so PORTAL_OWNER_JOURNEY_PROOF_PASS prints only when every step held.
-- I = ...d4, invited to tenant "brii" by a code bound to her email. Nobody wrote a tenant claim into her token.
-- Code hashes are fake but well formed (64 x one hex digit); the plaintext code never exists here.

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'owner@journey.test');
insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, bound_email, expires_at) values
  (repeat('a', 64), 'JRNY', 'brii', 'owner@journey.test', now() + interval '14 days');

create function pg_temp.expect_raise(stmt text, msg text, label text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm like '%' || msg || '%' then return; end if;
    raise exception 'WRONG ERROR for %: got % (%), wanted %', label, sqlstate, sqlerrm, msg;
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
-- Supabase sets both claim.sub and the claims JSON. No app_metadata: the invite never writes one.
create function pg_temp.act_as(p_sub text, p_aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_sub, false);
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'aal', p_aal, 'role', 'authenticated')::text, false);
end $$;
grant execute on function pg_temp.expect_raise(text, text, text), pg_temp.expect_value(text, text, text),
  pg_temp.act_as(text, text) to authenticated, service_role;

set role authenticated;

-- ===== before the invite: signed in at aal2, but no portal =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', null, 'no tenant before redeeming');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Change the phone number', null)$$, 'portal_not_owner', 'change request before redeeming');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii', null, null)$$, 'portal_not_owner', 'connection before redeeming');

-- ===== the claim, on the emailed link only (aal1), is refused; at aal2 it is redeemed =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal1');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('a', 64))$$, 'needs_second_factor', 'redeem at aal1');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('a', 64))$$, 'redeemed', 'redeem at aal2');

-- ===== /portal: the app reads her own membership (any aal) and her plan (aal2 only) =====
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal1');
select pg_temp.expect_value($$select string_agg(tenant_slug, ',') from public.portal_tenant_members where user_id = auth.uid()$$, 'brii', 'aal1 member sees her membership, so the page says confirm it is you');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', null, 'aal1 member has no tenant in the row rules');
select pg_temp.expect_value('select count(*)::text from public.portal_entitlements', '0', 'aal1 member cannot read her plan');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Change the phone number', null)$$, 'portal_not_owner', 'aal1 member submits a change');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', 'brii', 'aal2 member has her tenant');
select pg_temp.expect_value($$select plan from public.portal_entitlements where tenant_slug = 'brii'$$, 'comp', 'her plan is the free plan the invite gave');

-- ===== /portal/changes and its actions =====
select pg_temp.expect_value($$select (public.portal_create_change_request('contact', 'Change the phone number to 0400 000 000', null) is not null)::text$$, 'true', 'she submits a change request');
select pg_temp.expect_value($$select string_agg(tenant_slug || ':' || status, ',') from public.portal_change_requests$$, 'brii:submitted', 'she sees her request, in her tenant');
reset role;
set role service_role;
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from public.portal_change_requests where tenant_slug = 'brii'), 'start', null)$$, 'in_progress', 'team starts it');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from public.portal_change_requests where tenant_slug = 'brii'), 'preview', 'https://preview.invalid/brii/1')$$, 'preview_ready', 'team sends a preview');
reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value($$select public.portal_ask_for_change_edits((select id from public.portal_change_requests), 'Bigger phone number please')$$, 'in_progress', 'she asks for edits');
reset role;
set role service_role;
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from public.portal_change_requests where tenant_slug = 'brii'), 'preview', 'https://preview.invalid/brii/2')$$, 'preview_ready', 'team sends a new preview');
reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value($$select public.portal_approve_change_request((select id from public.portal_change_requests))$$, 'approved', 'she approves the preview');
insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'brii/55555555-5555-5555-5555-555555555555.jpg');
select pg_temp.expect_value($$select count(*)::text from storage.objects where bucket_id = 'portal-change-photos'$$, '1', 'she uploads a photo into her own folder');

-- ===== /portal/setup and its actions =====
select pg_temp.expect_value($$select public.portal_save_connection('gbp', 'https://maps.app.goo.gl/brii1', null, null)$$, 'link_saved', 'she saves her business profile link');
select pg_temp.expect_value($$select public.portal_mark_connection_access_granted('gbp')$$, 'access_granted', 'she says she added us');
select pg_temp.expect_value($$select string_agg(tenant_slug || ':' || kind || ':' || status, ',') from public.portal_connections$$, 'brii:gbp:access_granted', 'she sees her checklist item, in her tenant');
reset role;

-- ===== a second membership never moves her: the oldest one wins, as in the app =====
insert into public.portal_tenant_members (tenant_slug, user_id, created_at)
  values ('aardvark-co', '00000000-0000-0000-0000-0000000000d4', now() + interval '1 hour');
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', 'brii', 'oldest membership wins over a newer one');
select pg_temp.expect_value($$select tenant_slug from public.portal_tenant_members where user_id = auth.uid() order by created_at, tenant_slug limit 1$$, 'brii', 'the app''s query picks the same tenant');
reset role;

select 'PORTAL_OWNER_JOURNEY_PROOF_PASS' as result;
