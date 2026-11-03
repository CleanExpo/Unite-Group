-- UNI-3146 proof, throwaway Postgres only (scripts/card-staff-db-proof.sh). Any failure raises, so psql exits non-zero.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect_error(stmt text, want text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'ALLOWED but should fail: %', label;
exception when others then
  if sqlerrm like 'ALLOWED but should fail%' then raise; end if;
  if sqlstate <> want and sqlerrm not like '%' || want || '%' then raise exception 'wrong error for %: % %', label, sqlstate, sqlerrm; end if;
end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000f'), ('00000000-0000-0000-0000-00000000000e');
insert into public.card_orders (id, founder_id, reference, stripe_session_id, stripe_event_id, tier, amount_total, currency, livemode, quantity) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'a', 'cs_a', 'ev_a', 'custom', 44900, 'aud', false, 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000f', 'b', 'cs_b', 'ev_b', 'extra_business', 139300, 'aud', false, 7),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000f', 'c', 'cs_c', 'ev_c', 'ready', 24900, 'aud', false, 1),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000f', 'd', 'cs_d', 'ev_d', 'extra_business', 19900, 'aud', true, 1);
-- Everything the app does below runs as service_role, the role it really has: a grant it lacks fails here, not in production.
set role service_role;
insert into public.card_business_accounts (id, founder_id, order_id, livemode, owner_email, owner_token_hash, business_name, phone) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-000000000001', false, 'owner@example.invalid', repeat('a', 64), 'First Name Pty', '0400 000 000');

-- Seats: one per card bought, seven proves the old cap of five is gone, safe to re-run, only from a staff-card order.
do $$ declare n int; begin
  n := public.card_provision_staff_cards('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');
  if n <> 7 then raise exception 'expected 7 seats added, got %', n; end if;
  n := public.card_provision_staff_cards('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');
  if n <> 0 then raise exception 'second run added % seats', n; end if;
  if (select rounds_included from public.card_staff_cards limit 1) <> 3 then raise exception 'staff cards must include 3 rounds'; end if;
  if (select rounds_included from public.card_business_accounts limit 1) <> 10 then raise exception 'a Business Pack must include 10 rounds'; end if;
end $$;
reset role;
select pg_temp.expect_error($$select public.card_provision_staff_cards('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001')$$, 'card_provision_not_a_staff_card_order', 'seats from a non staff-card order');
select pg_temp.expect_error($$select public.card_provision_staff_cards('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001')$$, 'card_provision_mode_mismatch', 'live seats on a test account');
select pg_temp.expect_error($$update public.card_business_accounts set livemode = true$$, 'card_business_account_identity_is_fixed', 'changing an account payment mode');

set role service_role;
update public.card_staff_cards set staff_name = 'Alex', mobile = '0411 111 111', token_hash = repeat('b', 64) where seat_no = 1;
update public.card_staff_cards set staff_name = 'Bo' where seat_no = 2;
reset role;

create temp table slugs as select seat_no, card_slug from public.card_staff_cards;
grant select on slugs to anon, authenticated;

-- Anon: no table access and no provisioning. Each line runs its statement as anon inside the function.
create or replace function pg_temp.as_role_error(r text, stmt text, want text, label text) returns void language plpgsql as $$
begin
  execute format('set local role %I', r);
  begin
    execute stmt;
    raise exception 'ALLOWED but should fail: %', label;
  exception when others then
    if sqlerrm like 'ALLOWED but should fail%' then raise; end if;
    if sqlstate <> want then raise exception 'wrong error for %: % %', label, sqlstate, sqlerrm; end if;
  end;
  reset role;
end $$;
select pg_temp.as_role_error('anon', 'select * from public.card_staff_cards', '42501', 'anon select staff cards');
select pg_temp.as_role_error('anon', 'select * from public.card_business_accounts', '42501', 'anon select accounts');
select pg_temp.as_role_error('anon', $$update public.card_staff_cards set staff_name = 'x'$$, '42501', 'anon update staff cards');
select pg_temp.as_role_error('anon', $$update public.card_business_accounts set business_name = 'x'$$, '42501', 'anon update accounts');
select pg_temp.as_role_error('anon', $$select public.card_provision_staff_cards('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001')$$, '42501', 'anon provision');

-- Propagation: one owner change, seen on every named card through the anon read.
set role anon;
do $$ declare v text; begin
  select p.business_name into v from slugs s, public.card_staff_public(s.card_slug) p where s.seat_no = 1;
  if v is distinct from 'First Name Pty' then raise exception 'before: got %', v; end if;
end $$;
reset role;
set role service_role;
update public.card_business_accounts set business_name = 'New Name Pty', website = 'https://new.example.invalid' where id = '20000000-0000-0000-0000-000000000001';
reset role;
set role anon;
do $$ declare v text; w text; begin
  for v, w in select p.business_name, p.website from slugs s, public.card_staff_public(s.card_slug) p loop
    if v is distinct from 'New Name Pty' or w is distinct from 'https://new.example.invalid' then raise exception 'propagation failed: % %', v, w; end if;
  end loop;
  if (select count(*) from slugs s, public.card_staff_public(s.card_slug)) <> 2 then raise exception 'only named cards are public'; end if;
end $$;
reset role;

-- Authenticated: a different signed-in user sees nothing; the founder sees rows but never a token hash; neither writes.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
set role authenticated;
do $$ begin if (select count(id) from public.card_staff_cards) <> 0 then raise exception 'another user read staff cards'; end if; end $$;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
set role authenticated;
do $$ begin if (select count(id) from public.card_staff_cards) <> 7 then raise exception 'the founder must read their staff cards'; end if; end $$;
reset role;
select pg_temp.as_role_error('authenticated', 'select token_hash from public.card_staff_cards', '42501', 'founder reads staff token hash');
select pg_temp.as_role_error('authenticated', 'select owner_token_hash from public.card_business_accounts', '42501', 'founder reads owner token hash');
select pg_temp.as_role_error('authenticated', $$update public.card_staff_cards set staff_name = 'x'$$, '42501', 'authenticated update');
select pg_temp.as_role_error('authenticated', 'delete from public.card_staff_cards', '42501', 'authenticated delete');
reset request.jwt.claim.sub;

-- Bad links can never be stored, whatever the app does.
select pg_temp.expect_error($$update public.card_staff_cards set photo_url = 'javascript:alert(1)' where seat_no = 1$$, '23514', 'javascript photo');
select pg_temp.expect_error($$update public.card_business_accounts set website = 'http://plain.example.invalid'$$, '23514', 'http website');

-- Cards stay where they are.
select pg_temp.expect_error($$update public.card_staff_cards set account_id = '20000000-0000-0000-0000-000000000009' where seat_no = 1$$, 'card_staff_card_identity_is_fixed', 'moving a card');
select pg_temp.expect_error($$update public.card_staff_cards set card_slug = 's-0000000000000000' where seat_no = 1$$, 'card_staff_card_identity_is_fixed', 'changing an address');
select pg_temp.expect_error($$update public.card_business_accounts set order_id = '10000000-0000-0000-0000-000000000003'$$, 'card_business_account_identity_is_fixed', 'moving an account');

-- Deactivation: off the web, link dead, final.
set role service_role;
update public.card_staff_cards set status = 'deactivated' where seat_no = 1;
reset role;
do $$ begin
  if (select token_hash from public.card_staff_cards where seat_no = 1) is not null then raise exception 'deactivating must kill the link'; end if;
  if (select deactivated_at from public.card_staff_cards where seat_no = 1) is null then raise exception 'deactivated_at not set'; end if;
end $$;
select pg_temp.expect_error($$update public.card_staff_cards set status = 'active' where seat_no = 1$$, 'card_staff_card_deactivated', 'reactivating');
select pg_temp.expect_error($$update public.card_staff_cards set staff_name = 'New Person' where seat_no = 1$$, 'card_staff_card_deactivated', 'renaming a deactivated card');
set role anon;
do $$ begin
  if (select count(*) from slugs s, public.card_staff_public(s.card_slug) where s.seat_no = 1) <> 0 then raise exception 'a deactivated card is still public'; end if;
  if (select count(*) from slugs s, public.card_staff_public(s.card_slug) where s.seat_no = 2) <> 1 then raise exception 'deactivating one card hid another'; end if;
end $$;
reset role;

select 'CARD_STAFF_DB_PROOF_PASS';
