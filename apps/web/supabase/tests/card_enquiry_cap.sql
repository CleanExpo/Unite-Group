-- Volume-cap proof for card_submit_enquiry (spec v1.4 release blocker 2). THROWAWAY database only
-- (psql -v ON_ERROR_STOP=1). Every expectation raises on failure; CARD_ENQUIRY_CAP_PASS prints only if all held.

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1') on conflict do nothing;
insert into public.card_owners (card_slug, founder_id) values ('cap-card', '00000000-0000-0000-0000-0000000000c1'), ('other-card', '00000000-0000-0000-0000-0000000000c1')
  on conflict do nothing;

create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'EXPECTATION FAILED: %', label; end if;
end $$;

set role service_role;

-- 30 distinct messages in one hour are accepted
select public.card_submit_enquiry('cap-card', 'Jo', null, 'message ' || n, null, 'card-profile') from generate_series(1, 30) as n;
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'cap-card') = 30, '30 distinct enquiries are stored');

-- the 31st distinct message is refused with the cap message and stores nothing
do $$ begin
  begin
    perform public.card_submit_enquiry('cap-card', 'Jo', null, 'message 31', null, 'card-profile');
  exception when others then
    if sqlerrm <> 'card_enquiry_rate_limited' then raise exception 'EXPECTATION FAILED: wrong error %', sqlerrm; end if;
    return;
  end;
  raise exception 'EXPECTATION FAILED: the 31st enquiry in an hour was accepted';
end $$;
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'cap-card') = 30, 'the refused enquiry stored nothing');

-- a retry of an already stored message still returns its receipt even at the cap
select pg_temp.check_true((select count(*) from public.card_submit_enquiry('cap-card', 'Jo', null, 'message 1', null, 'card-profile')) = 1, 'a duplicate retry at the cap returns the stored receipt');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'cap-card') = 30, 'the duplicate retry added no row');

-- the cap is per card: another card is unaffected
select public.card_submit_enquiry('other-card', 'Jo', null, 'hello', null, 'card-profile');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'other-card') = 1, 'another card is not capped');

-- after an hour the window clears
reset role;
update public.card_enquiries set created_at = now() - interval '61 minutes' where card_slug = 'cap-card';
set role service_role;
select public.card_submit_enquiry('cap-card', 'Jo', null, 'message 32', null, 'card-profile');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'cap-card') = 31, 'a new enquiry is accepted once the hour has passed');
reset role;

select 'CARD_ENQUIRY_CAP_PASS' as result;
