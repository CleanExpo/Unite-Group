-- Proof for 20261102190000_portal_entitlements.sql + 20261102190100_portal_invite_codes.sql.
-- Run as a superuser on a THROWAWAY database only (scripts/portal-invite-db-proof.sh does this). Never on a live project.
-- Any failed expectation raises, so PORTAL_INVITES_RLS_PROOF_PASS prints only when every case held.
-- A = ivi (a1), the invited owner. B = mallory (b2), a signed-in stranger. C = carol (c3), owner of a paid tenant.
-- Code hashes are fake but well formed: 64 x one hex digit. The plaintext codes never exist in this test.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Ivi@Brii.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'mallory@evil.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'carol@paid.test');

insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, bound_email, expires_at, revoked_at, created_at) values
  (repeat('1', 64), 'AAAA', 'brii', 'ivi@brii.test', now() + interval '14 days', null, now()),
  (repeat('2', 64), 'BBBB', 'brii', null, now() - interval '6 days', null, now() - interval '20 days'),
  (repeat('3', 64), 'CCCC', 'brii', null, now() + interval '14 days', now(), now()),
  (repeat('4', 64), 'DDDD', 'other-co', null, now() + interval '14 days', null, now()),
  (repeat('5', 64), 'EEEE', 'paid-co', null, now() + interval '14 days', null, now());
insert into public.portal_entitlements (tenant_slug, plan, modules) values
  ('paid-co', 'paid', '{"content": false, "seo": true, "social": false, "voice": false}');

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
-- Sets the request claims the same two ways Supabase does (claim.sub and the claims JSON with aal).
create function pg_temp.act_as(p_sub text, p_aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub, ''), false);
  perform set_config('request.jwt.claims',
    case when p_sub is null then '' else json_build_object('sub', p_sub, 'aal', p_aal, 'role', 'authenticated')::text end, false);
end $$;
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_value(text, text, text),
  pg_temp.act_as(text, text) to anon, authenticated, service_role;

-- ===== the shape: no plaintext code column anywhere =====
select pg_temp.expect_value($$select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'portal_invite_codes'$$,
  'id,code_hash,code_hint,tenant_slug,bound_email,expires_at,revoked_at,created_by,created_at', 'invite code columns are hash + hint only');
select pg_temp.expect_error($$insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, expires_at) values ('BRII-PLAIN-TEXT-CODE', 'AAAA', 'brii', now() + interval '1 day')$$, '23514', 'a plaintext code in the hash column is refused');
select pg_temp.expect_error($$insert into public.portal_invite_codes (code_hash, code_hint, tenant_slug, bound_email, expires_at) values (repeat('9', 64), 'AAAA', 'brii', 'Ivi@Brii.test', now() + interval '1 day')$$, '23514', 'a bound email must be stored lower-case');

-- ===== comp and none can never hold a paid module =====
select pg_temp.expect_error($$insert into public.portal_entitlements (tenant_slug, plan, modules) values ('x-comp', 'comp', '{"content": true, "seo": false, "social": false, "voice": false}')$$, '23514', 'comp with a module ON is refused');
select pg_temp.expect_error($$insert into public.portal_entitlements (tenant_slug, plan, modules) values ('x-none', 'none', '{"content": false, "seo": false, "social": true, "voice": false}')$$, '23514', 'none with a module ON is refused');
select pg_temp.expect_error($$insert into public.portal_entitlements (tenant_slug, plan, modules) values ('x-key', 'paid', '{"content": true, "crm": true}')$$, '23514', 'unknown module key refused');
select pg_temp.expect_error($$insert into public.portal_entitlements (tenant_slug, plan, modules) values ('x-type', 'paid', '{"content": "yes"}')$$, '23514', 'non-boolean module value refused');
select pg_temp.expect_value($$select modules::text from public.portal_entitlements where tenant_slug = 'paid-co'$$, '{"seo": true, "voice": false, "social": false, "content": false}', 'a paid tenant may hold a module ON');

-- ===== anon (signed out) =====
set role anon;
select pg_temp.act_as(null, null);
select pg_temp.expect_error('select count(*) from public.portal_invite_codes', '42501', 'anon reads codes');
select pg_temp.expect_error('select count(*) from public.portal_invite_redemptions', '42501', 'anon reads redemptions');
select pg_temp.expect_error('select count(*) from public.portal_entitlements', '42501', 'anon reads entitlements');
select pg_temp.expect_error('select count(*) from public.portal_tenant_members', '42501', 'anon reads members');
select pg_temp.expect_error($$select public.portal_redeem_invite(repeat('1', 64))$$, '42501', 'anon redeems');
reset role;

-- ===== A on an aal1 session: "go verify your second factor", never access =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'needs_second_factor', 'aal1 cannot redeem');
select pg_temp.expect_error('select count(*) from public.portal_invite_codes', '42501', 'a signed-in user reads codes');
select pg_temp.expect_error($$insert into public.portal_tenant_members (tenant_slug, user_id) values ('brii', auth.uid())$$, '42501', 'a user makes themself an owner directly');
select pg_temp.expect_error($$insert into public.portal_entitlements (tenant_slug, plan) values ('brii', 'comp')$$, '42501', 'a user writes an entitlement directly');
reset role;
select pg_temp.expect_value('select count(*)::text from public.portal_invite_redemptions', '0', 'aal1 left no redemption');
select pg_temp.expect_value('select count(*)::text from public.portal_invite_attempts', '0', 'aal1 is not counted as a failed attempt');

-- ===== B (aal2) tries A's email-bound code =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'wrong_email', 'wrong email refused');
reset role;
select pg_temp.expect_value('select count(*)::text from public.portal_tenant_members', '0', 'wrong email made nobody an owner');

-- ===== A (aal2): refused codes, then the real one =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('2', 64))$$, 'expired', 'expired refused');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('3', 64))$$, 'revoked', 'revoked refused');
select pg_temp.expect_value($$select public.portal_redeem_invite('BRII-PLAIN-TEXT-CODE')$$, 'not_found', 'malformed hash refused');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('f', 64))$$, 'not_found', 'unknown code refused');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'redeemed', 'A redeems the bound code (email compared case-insensitively)');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'used', 'reuse refused, even by the same person');
select pg_temp.expect_value($$select plan || ':' || modules::text from public.portal_entitlements$$, 'comp:{"seo": false, "voice": false, "social": false, "content": false}', 'A reads only brii: comp with every paid module OFF');
select pg_temp.expect_value($$select string_agg(tenant_slug || '/' || role, ',') from public.portal_tenant_members$$, 'brii/owner', 'A sees only their own membership');
select pg_temp.expect_error($$update public.portal_entitlements set modules = '{"content": true, "seo": true, "social": true, "voice": true}'$$, '42501', 'an owner cannot switch modules on');
select pg_temp.expect_error('select count(*) from public.portal_invite_redemptions', '42501', 'an owner reads redemptions directly');
reset role;
select pg_temp.expect_value($$select count(*)::text from public.portal_invite_redemptions where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '1', 'exactly one redemption row');
select pg_temp.expect_error($$insert into public.portal_invite_redemptions (code_id, user_id, tenant_slug) select id, '00000000-0000-0000-0000-0000000000b2', tenant_slug from public.portal_invite_codes where code_hash = repeat('1', 64)$$, '23505', 'a second redemption row for one code is refused by the database');

-- ===== A on aal1 again sees no tenant data =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select pg_temp.expect_value('select count(*)::text from public.portal_entitlements', '0', 'aal1 owner reads no entitlement');
reset role;

-- ===== B (aal2, wrong tenant) sees nothing of brii =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2', 'aal2');
select pg_temp.expect_value('select count(*)::text from public.portal_entitlements', '0', 'B reads no entitlement');
select pg_temp.expect_value('select count(*)::text from public.portal_tenant_members', '0', 'B reads no membership');
select pg_temp.expect_value($$select public.portal_is_tenant_owner('brii')::text$$, 'false', 'B is not an owner of brii');
reset role;

-- ===== C redeems into a paid tenant: plan stays paid, modules untouched =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('5', 64))$$, 'redeemed', 'C redeems the paid-co code');
select pg_temp.expect_value($$select plan || ':' || (modules->>'seo') from public.portal_entitlements$$, 'paid:true', 'comp never downgrades a paid tenant');
reset role;

-- ===== B is rate limited after five failures in fifteen minutes =====
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('a', 64))$$, 'not_found', 'B failure 2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('b', 64))$$, 'not_found', 'B failure 3');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('c', 64))$$, 'not_found', 'B failure 4');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('d', 64))$$, 'not_found', 'B failure 5');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('4', 64))$$, 'rate_limited', 'B is locked out even with a valid code');
reset role;
select pg_temp.expect_value($$select count(*)::text from public.portal_invite_redemptions r join public.portal_invite_codes c on c.id = r.code_id where c.code_hash = repeat('4', 64)$$, '0', 'the valid code was not spent by a rate-limited user');

-- ===== deleting an account keeps the code spent =====
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.expect_value($$select count(*)::text from public.portal_invite_redemptions where user_id is null$$, '1', 'the redemption row survives account deletion');
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select pg_temp.expect_value($$select public.portal_redeem_invite(repeat('1', 64))$$, 'used', 'a deleted owner''s code cannot be reused');
reset role;

-- ===== sign-in links for invite holders: server-side only, ten per caller per fifteen minutes =====
set role anon;
select pg_temp.act_as(null, null);
select pg_temp.expect_error($$select public.portal_invite_link_allowed(repeat('e', 64))$$, '42501', 'anon asks for a link directly');
select pg_temp.expect_error('select count(*) from public.portal_invite_link_requests', '42501', 'anon reads link requests');
reset role;
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2', 'aal2');
select pg_temp.expect_error($$select public.portal_invite_link_allowed(repeat('e', 64))$$, '42501', 'a signed-in user asks for a link directly');
select pg_temp.expect_error('select count(*) from public.portal_invite_link_requests', '42501', 'a signed-in user reads link requests');
reset role;
set role service_role;
select pg_temp.expect_value($$select string_agg(public.portal_invite_link_allowed(repeat('e', 64))::text, ',') from generate_series(1, 11)$$,
  'true,true,true,true,true,true,true,true,true,true,false', 'the eleventh link request in fifteen minutes is refused');
select pg_temp.expect_value($$select public.portal_invite_link_allowed(repeat('9', 64))::text$$, 'true', 'another caller is not affected');
select pg_temp.expect_value($$select public.portal_invite_link_allowed('10.0.0.1')::text$$, 'false', 'a raw address is never accepted as a key');
reset role;

select 'PORTAL_INVITES_RLS_PROOF_PASS' as result;
