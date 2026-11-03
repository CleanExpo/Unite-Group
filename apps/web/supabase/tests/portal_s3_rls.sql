-- Two-tenant proof for 20261102180000_portal_change_requests.sql, 20261102180100_portal_change_photos_bucket.sql and
-- 20261102180200_portal_connections.sql, with the owner helper from 20261103120000_portal_owner_tenant_from_membership.sql.
-- Run as a superuser on a THROWAWAY database after every portal migration (twice): scripts/portal-owner-db-proof.sh.
-- Never run on a live project. Any failed expectation raises, so PORTAL_S3_RLS_PROOF_PASS prints only when all held.
-- A = owner ...a1 of tenant "alpha". B = owner ...b2 of tenant "beta". B is malicious. C = ...c3, signed in, no portal.
-- Owners are portal_tenant_members rows (the invite redeem writes them; supabase/tests/portal_owner_journey.sql).
-- Sessions are simulated the way Supabase does it: role + request.jwt.claims (sub, aal, app_metadata). The
-- app_metadata tenant claim is still sent, to prove it no longer decides anything.

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000c3');
insert into public.portal_tenant_members (tenant_slug, user_id) values
  ('alpha', '00000000-0000-0000-0000-0000000000a1'), ('beta', '00000000-0000-0000-0000-0000000000b2');

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
create function pg_temp.claims(sub text, aal text, tenant text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', sub, 'aal', aal,
    'app_metadata', case when tenant is null then '{}'::json else json_build_object('portal_tenant_slug', tenant) end)::text, false);
$$;
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_raise(text, text, text),
  pg_temp.expect_value(text, text, text), pg_temp.claims(text, text, text) to anon, authenticated, service_role;

create temp table ids (name text primary key, id uuid);
grant select, insert on ids to authenticated, service_role;

-- ===== anon (the public) =====
set role anon;
select pg_temp.claims(null, null, null);
select pg_temp.expect_error('select count(*) from public.portal_change_requests', '42501', 'anon reads requests');
select pg_temp.expect_error('select count(*) from public.portal_change_request_events', '42501', 'anon reads events');
select pg_temp.expect_error('select count(*) from public.portal_connections', '42501', 'anon reads connections');
select pg_temp.expect_error($$select public.portal_create_change_request('home', 'Change the phone number', null)$$, '42501', 'anon submits');
select pg_temp.expect_error($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii', null, null)$$, '42501', 'anon saves a link');
reset role;

-- ===== A signed in but only aal1: never access =====
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal1', 'alpha');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', null, 'aal1 has no tenant');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Change the phone number', null)$$, 'portal_not_owner', 'aal1 submits');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii', null, null)$$, 'portal_not_owner', 'aal1 saves a link');
-- an aal2 user with no membership is not an owner, even with a tenant claim in her token
select pg_temp.claims('00000000-0000-0000-0000-0000000000c3', 'aal2', 'alpha');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', null, 'a claim without a membership has no tenant');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Change the phone number', null)$$, 'portal_not_owner', 'no membership submits');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii', null, null)$$, 'portal_not_owner', 'no membership saves a link');
-- an owner's tenant does not depend on the claim at all
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', null);
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', 'alpha', 'member with no claim has her tenant');
reset role;

-- ===== A at aal2 =====
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', 'alpha');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', 'alpha', 'aal2 owner has her tenant');
select pg_temp.expect_raise($$select public.portal_create_change_request('blog', 'Change the phone number', null)$$, 'portal_bad_input', 'unknown page refused');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'hi', null)$$, 'portal_bad_input', 'too-short request refused');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Swap the hero photo', 'beta/11111111-1111-1111-1111-111111111111.jpg')$$, 'portal_bad_input', 'photo path in another tenant refused');
select pg_temp.expect_raise($$select public.portal_create_change_request('home', 'Swap the hero photo', 'alpha/../beta/x.jpg')$$, 'portal_bad_input', 'path traversal refused');
insert into ids select 'r1', public.portal_create_change_request('contact', 'Change the phone number to 0400 000 000', null);
insert into ids select 'r2', public.portal_create_change_request('home', 'Swap the hero photo', 'alpha/11111111-1111-1111-1111-111111111111.jpg');
select pg_temp.expect_value('select count(*)::text from public.portal_change_requests', '2', 'A sees her two requests');
select pg_temp.expect_value($$select (status || '|' || (created_by = auth.uid())::text) from public.portal_change_requests where id = (select id from ids where name = 'r1')$$, 'submitted|true', 'new request is submitted, actor from the session');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'portal_wrong_status', 'approve from submitted refused');
select pg_temp.expect_error($$insert into public.portal_change_requests (tenant_slug, page, request_text) values ('alpha', 'home', 'sneaky direct insert')$$, '42501', 'owner cannot insert past the function');
select pg_temp.expect_error($$update public.portal_change_requests set status = 'approved'$$, '42501', 'owner cannot set status directly');
select pg_temp.expect_error($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'preview', 'https://x.test/')$$, '42501', 'owner cannot call the team function');
reset role;

-- ===== team moves r1 and r2 to preview_ready =====
set role service_role;
select pg_temp.expect_raise($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'publish', null)$$, 'portal_wrong_status', 'team cannot publish an unapproved request');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'start', null)$$, 'in_progress', 'team starts r1');
select pg_temp.expect_raise($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'preview', 'http://plain.test/')$$, 'portal_bad_input', 'http preview link refused');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'preview', 'https://preview.invalid/alpha/r1')$$, 'preview_ready', 'team previews r1');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r2'), 'start', null)$$, 'in_progress', 'team starts r2');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r2'), 'preview', 'https://preview.invalid/alpha/r2')$$, 'preview_ready', 'team previews r2');
reset role;

-- ===== B (malicious) cannot see or decide A's requests =====
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000b2', 'aal2', 'beta');
select pg_temp.expect_value('select count(*)::text from public.portal_change_requests', '0', 'B sees none of A''s requests');
select pg_temp.expect_value('select count(*)::text from public.portal_change_request_events', '0', 'B sees none of A''s events');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'portal_not_found', 'B approves A''s request');
select pg_temp.expect_raise($$select public.portal_ask_for_change_edits((select id from ids where name = 'r1'), 'make it red')$$, 'portal_not_found', 'B asks edits on A''s request');
-- B forging an alpha claim in her token changes nothing: her tenant is her membership
select pg_temp.claims('00000000-0000-0000-0000-0000000000b2', 'aal2', 'alpha');
select pg_temp.expect_value('select public.portal_owner_tenant_slug()', 'beta', 'B with a forged alpha claim is still beta');
select pg_temp.expect_value('select count(*)::text from public.portal_change_requests', '0', 'B with a forged alpha claim sees none of A''s requests');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'portal_not_found', 'B with a forged alpha claim approves A''s request');
-- aal1 A is checked again here
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal1', 'alpha');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'portal_not_owner', 'aal1 A cannot approve');
select pg_temp.expect_value('select count(*)::text from public.portal_change_requests', '0', 'aal1 A reads nothing');
reset role;

-- ===== A decides at aal2 =====
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', 'alpha');
select pg_temp.expect_value($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'approved', 'A approves r1 from preview_ready');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r1'))$$, 'portal_wrong_status', 'approving twice refused');
select pg_temp.expect_value($$select (approved_by = auth.uid() and approved_at is not null)::text from public.portal_change_requests where id = (select id from ids where name = 'r1')$$, 'true', 'approval records who and when');
-- sorted by action: this file runs in one transaction, so every event shares one now()
select pg_temp.expect_value($$select string_agg(action || ':' || actor_kind || ':' || coalesce(actor_aal, '-'), ',' order by action) from public.portal_change_request_events where request_id = (select id from ids where name = 'r1')$$,
  'approve:owner:aal2,preview:team:-,start:team:-,submit:owner:aal2', 'every step of r1 is logged');
select pg_temp.expect_raise($$select public.portal_ask_for_change_edits((select id from ids where name = 'r2'), '   ')$$, 'portal_bad_input', 'empty edit note refused');
select pg_temp.expect_value($$select public.portal_ask_for_change_edits((select id from ids where name = 'r2'), 'Use the photo with the trainers instead')$$, 'in_progress', 'A asks for edits on r2');
select pg_temp.expect_raise($$select public.portal_approve_change_request((select id from ids where name = 'r2'))$$, 'portal_wrong_status', 'approve after asking for edits refused until a new preview');
reset role;

-- ===== team publishes and rolls back r1 =====
set role service_role;
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'publish', null)$$, 'published', 'team publishes approved r1');
select pg_temp.expect_value($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'roll_back', null)$$, 'rolled_back', 'team rolls back r1');
select pg_temp.expect_raise($$select public.portal_team_advance_change_request((select id from ids where name = 'r1'), 'roll_back', null)$$, 'portal_wrong_status', 'rolling back twice refused');
reset role;

-- ===== private photo bucket =====
select pg_temp.expect_value($$select public::text from storage.buckets where id = 'portal-change-photos'$$, 'false', 'bucket is private');
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', 'alpha');
insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'alpha/11111111-1111-1111-1111-111111111111.jpg');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'beta/22222222-2222-2222-2222-222222222222.jpg')$$, '42501', 'A uploads into B''s folder');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'alpha/notes.txt')$$, '42501', 'A uploads a non-photo name');
select pg_temp.expect_value($$select count(*)::text from storage.objects where bucket_id = 'portal-change-photos'$$, '1', 'A sees her photo');
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal1', 'alpha');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'alpha/33333333-3333-3333-3333-333333333333.jpg')$$, '42501', 'aal1 A uploads');
select pg_temp.claims('00000000-0000-0000-0000-0000000000b2', 'aal2', 'beta');
select pg_temp.expect_value($$select count(*)::text from storage.objects where bucket_id = 'portal-change-photos'$$, '0', 'B sees none of A''s photos');
select pg_temp.claims('00000000-0000-0000-0000-0000000000b2', 'aal2', 'alpha');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('portal-change-photos', 'alpha/44444444-4444-4444-4444-444444444444.jpg')$$, '42501', 'B with a forged alpha claim uploads into A''s folder');
reset role;

-- ===== connections =====
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', 'alpha');
select pg_temp.expect_raise($$select public.portal_save_connection('gsc', 'https://brii.example/', null, null)$$, 'portal_bad_input', 'GSC takes a property id, not a profile link');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'http://www.facebook.com/brii', null, null)$$, 'portal_bad_input', 'http link refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://user:pw@www.facebook.com/brii', null, null)$$, 'portal_bad_input', 'link with credentials refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com@evil.example/brii', null, null)$$, 'portal_bad_input', 'link hiding another host behind @ refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii', null, 'key AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')$$, 'portal_bad_input', 'notes holding a key-shaped string refused');
-- the per-kind host list, the home-page rule and the Maps rule hold in the database, not only in the app
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://evil.example/phish', null, null)$$, 'portal_bad_input', 'link on a host outside the Facebook list refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.instagram.com/brii', null, null)$$, 'portal_bad_input', 'Instagram link saved as Facebook refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/', null, null)$$, 'portal_bad_input', 'Facebook home page refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com?ref=home', null, null)$$, 'portal_bad_input', 'Facebook link with no path refused');
select pg_temp.expect_raise($$select public.portal_save_connection('gbp', 'https://www.google.com/search?q=brii', null, null)$$, 'portal_bad_input', 'Google search link refused as a business profile');
-- forms a browser rewrites before it reads the path (dot segments, backslashes) or that no profile link needs
-- (a port, a trailing-dot host) are refused outright, so the database never judges a different path from the app
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/.', null, null)$$, 'portal_bad_input', 'single-dot path refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com/brii/%2E%2e', null, null)$$, 'portal_bad_input', 'encoded double-dot path refused');
select pg_temp.expect_raise($$select public.portal_save_connection('gbp', 'https://www.google.com/maps/../search?q=brii', null, null)$$, 'portal_bad_input', 'Maps path climbing out with .. refused');
select pg_temp.expect_raise($$select public.portal_save_connection('gbp', 'https://www.google.com/maps\..\search', null, null)$$, 'portal_bad_input', 'backslash path refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com:99999/brii', null, null)$$, 'portal_bad_input', 'out-of-range port refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com:443/brii', null, null)$$, 'portal_bad_input', 'any port refused');
select pg_temp.expect_raise($$select public.portal_save_connection('facebook', 'https://www.facebook.com./brii', null, null)$$, 'portal_bad_input', 'trailing-dot host refused');
select pg_temp.expect_value($$select public.portal_save_connection('gbp', 'https://www.google.com.au/maps/place/Brii', null, null)$$, 'link_saved', 'A Google Maps place link is a business profile');
-- TikTok and YouTube handles carry @ in the path; that is a real profile link, not a login
select pg_temp.expect_value($$select public.portal_save_connection('tiktok', 'https://www.tiktok.com/@brii.training', null, null)$$, 'link_saved', 'A saves a TikTok @handle link');
select pg_temp.expect_value($$select public.portal_save_connection('youtube', 'https://www.youtube.com/@briitraining', null, null)$$, 'link_saved', 'A saves a YouTube @handle link');
select pg_temp.expect_value($$select public.portal_save_connection('gsc', null, 'sc-domain:brii.example', null)$$, 'link_saved', 'A saves the GSC property');
select pg_temp.expect_value($$select public.portal_save_connection('gbp', 'https://maps.app.goo.gl/abc123', null, 'Main location')$$, 'link_saved', 'A saves her GBP link');
select pg_temp.expect_raise($$select public.portal_mark_connection_access_granted('facebook')$$, 'portal_bad_input', 'socials have no access step');
select pg_temp.expect_raise($$select public.portal_mark_connection_access_granted('bing')$$, 'portal_bad_input', 'no access step before a saved link');
select pg_temp.expect_value($$select public.portal_mark_connection_access_granted('gbp')$$, 'access_granted', 'A says she added us as Manager');
select pg_temp.expect_value($$select public.portal_save_connection('gbp', 'https://maps.app.goo.gl/abc123', null, 'Main location')$$, 'access_granted', 'saving the same link keeps progress');
select pg_temp.expect_value($$select public.portal_save_connection('gbp', 'https://maps.app.goo.gl/xyz789', null, null)$$, 'link_saved', 'a changed link goes back to link_saved');
select pg_temp.expect_error($$insert into public.portal_connections (tenant_slug, kind, status) values ('alpha', 'x', 'verified')$$, '42501', 'owner cannot insert past the function');
select pg_temp.expect_error($$update public.portal_connections set status = 'verified'$$, '42501', 'owner cannot mark verified');
reset role;
set role service_role;
select pg_temp.expect_error($$update public.portal_connections set status = 'verified' where kind = 'gsc'$$, '23514', 'verified needs a verified time');
select pg_temp.expect_error($$insert into public.portal_connections (tenant_slug, kind, profile_url) values ('beta', 'facebook', 'https://evil.example/phish')$$, '23514', 'the table refuses a wrong-host link even from the team role');
update public.portal_connections set status = 'verified', verified_at = now() where kind = 'gsc';
reset role;
set role authenticated;
select pg_temp.claims('00000000-0000-0000-0000-0000000000b2', 'aal2', 'beta');
select pg_temp.expect_value('select count(*)::text from public.portal_connections', '0', 'B sees none of A''s connections');
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'aal2', 'alpha');
select pg_temp.expect_value($$select string_agg(kind || ':' || status, ',' order by kind) from public.portal_connections$$, 'gbp:link_saved,gsc:verified,tiktok:link_saved,youtube:link_saved', 'A sees her own four items');
reset role;

-- ===== no column anywhere in the three tables is shaped to hold a secret =====
select pg_temp.expect_value($$select count(*)::text from information_schema.columns where table_schema = 'public'
  and table_name in ('portal_change_requests', 'portal_change_request_events', 'portal_connections')
  and column_name ~* '(password|passwd|token|secret|api_?key|credential)'$$, '0', 'no secret-shaped column');

select 'PORTAL_S3_RLS_PROOF_PASS' as result;
