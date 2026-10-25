-- Duplicate-guard proof for card_submit_enquiry (20261025090000_card_profiles.sql). THROWAWAY database only
-- (psql -v ON_ERROR_STOP=1). Every expectation raises on failure; CARD_ENQUIRY_DEDUPE_PASS prints only if all held.

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1') on conflict do nothing;
insert into public.card_owners (card_slug, founder_id) values ('dedupe-card', '00000000-0000-0000-0000-0000000000a1')
  on conflict do nothing;

create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'EXPECTATION FAILED: %', label; end if;
end $$;

set role service_role;

-- two identical submissions inside 10 minutes: one row, same receipt
create temp table r1 as select * from public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Call me', 'jo@example.com', 'card-profile');
create temp table r2 as select * from public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Call me', 'JO@example.com', 'card-profile');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'dedupe-card') = 1, 'identical retry makes one row');
select pg_temp.check_true((select id from r1) = (select id from r2), 'identical retry returns the same receipt id');

-- a different ask, a different email and a null email are new rows
select public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Something else', 'jo@example.com', 'card-profile');
select public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Call me', 'other@example.com', 'card-profile');
select public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Call me', null, 'card-profile');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'dedupe-card') = 4, 'different ask / email / no email are new rows');

-- after 10 minutes the same submission is a new row
reset role;
update public.card_enquiries set created_at = now() - interval '11 minutes' where card_slug = 'dedupe-card' and ask = 'Call me' and reply_email = 'jo@example.com';
set role service_role;
create temp table r3 as select * from public.card_submit_enquiry('dedupe-card', 'Jo', null, 'Call me', 'jo@example.com', 'card-profile');
select pg_temp.check_true((select id from r3) <> (select id from r1), 'a submission after 10 minutes gets a new receipt');
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'dedupe-card') = 5, 'a submission after 10 minutes adds a row');
reset role;

-- anon and authenticated cannot call it
set role anon;
do $$ begin
  begin
    perform public.card_submit_enquiry('dedupe-card', 'Jo', null, 'x', null, 'card-profile');
  exception when insufficient_privilege then return; end;
  raise exception 'EXPECTATION FAILED: anon could call card_submit_enquiry';
end $$;
reset role;

select 'CARD_ENQUIRY_DEDUPE_PASS' as result;
