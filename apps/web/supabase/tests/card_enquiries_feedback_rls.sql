-- RLS proof for migrations/20261024210000_card_enquiries_feedback.sql.
-- Run with psql -v ON_ERROR_STOP=1 as a superuser on a THROWAWAY database after the migration
-- (needs the Supabase roles anon, authenticated, service_role and auth.uid()). Never run on a live project.
-- Any failed expectation raises, so the run stops before CARD_RLS_PROOF_PASS is printed.

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2')
  on conflict do nothing;
insert into public.card_owners (card_slug, founder_id) values
  ('phill-mcgurk', '00000000-0000-0000-0000-0000000000a1'),
  ('someone-else', '00000000-0000-0000-0000-0000000000b2')
  on conflict do nothing;

-- expect_error: the statement must fail with exactly this SQLSTATE
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
grant execute on function pg_temp.expect_error(text, text, text) to anon, authenticated;

-- 1. anon: insert only
set role anon;
insert into public.card_enquiries (card_slug, first_name, business, ask, reply_email)
  values ('phill-mcgurk', 'Sam', 'Sam''s Cleaning', 'Can you make me one?', 'sam@example.com');
insert into public.card_enquiries (card_slug, first_name, ask) values ('someone-else', 'Jo', 'Hello');
insert into public.card_feedback (card_slug, first_name, answers, device)
  values ('phill-mcgurk', 'Sam', '{"save": "easy", "film": "loved it"}', 'iPhone');
insert into public.card_feedback (card_slug, first_name, answers) values ('someone-else', 'Jo', '{}');

select pg_temp.expect_error('select count(*) from public.card_enquiries', '42501', 'anon select enquiries');
select pg_temp.expect_error('select count(*) from public.card_feedback', '42501', 'anon select feedback');
select pg_temp.expect_error('select count(*) from public.card_owners', '42501', 'anon select owners');
select pg_temp.expect_error('update public.card_enquiries set ask = ''x''', '42501', 'anon update enquiries');
select pg_temp.expect_error('delete from public.card_enquiries', '42501', 'anon delete enquiries');
select pg_temp.expect_error('update public.card_feedback set device = ''x''', '42501', 'anon update feedback');
select pg_temp.expect_error('delete from public.card_feedback', '42501', 'anon delete feedback');
select pg_temp.expect_error('insert into public.card_owners (card_slug, founder_id) values (''x'', ''00000000-0000-0000-0000-0000000000a1'')', '42501', 'anon claims a card');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask, created_at) values (''phill-mcgurk'', ''A'', ''b'', now() - interval ''1 year'')', '42501', 'anon sets created_at');
select pg_temp.expect_error('insert into public.card_enquiries (id, card_slug, first_name, ask) values (gen_random_uuid(), ''phill-mcgurk'', ''A'', ''b'')', '42501', 'anon sets id');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers, created_at) values (''phill-mcgurk'', ''A'', ''{}'', now())', '42501', 'anon sets feedback created_at');

select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', repeat(''a'', 61), ''b'')', '23514', 'first_name over 60');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', ''   '', ''b'')', '23514', 'blank first_name');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', ''A'', repeat(''b'', 2001))', '23514', 'ask over 2000');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', repeat('' '', 100000) || ''A'', ''b'')', '23514', 'space-padded first_name over 60');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', ''A'', repeat('' '', 100000) || ''b'')', '23514', 'space-padded ask over 2000');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', E''\t\n\r'', ''b'')', '23514', 'tab/newline-only first_name');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', ''A'', E''\t\n'')', '23514', 'tab/newline-only ask');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''phill-mcgurk'', repeat('' '', 100000) || ''A'', ''{}'')', '23514', 'space-padded feedback first_name');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''phill-mcgurk'', E''\t'', ''{}'')', '23514', 'tab-only feedback first_name');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''Bad Slug!'', ''A'', ''b'')', '23514', 'bad card_slug');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask, reply_email) values (''phill-mcgurk'', ''A'', ''b'', ''not-an-email'')', '23514', 'bad reply_email');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, business, ask) values (''phill-mcgurk'', ''A'', repeat(''c'', 121), ''b'')', '23514', 'business over 120');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''phill-mcgurk'', ''A'', ''[1,2]'')', '23514', 'answers not an object');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''phill-mcgurk'', ''A'', jsonb_build_object(''x'', repeat(''y'', 4001)))', '23514', 'answers over 4000 bytes');
reset role;

-- 2. a founder reads only rows for cards they own, and cannot write
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
do $$
begin
  if (select count(*) from public.card_enquiries) <> 1
     or (select count(*) from public.card_enquiries where card_slug <> 'phill-mcgurk') <> 0 then
    raise exception 'founder a1 enquiry visibility wrong';
  end if;
  if (select count(*) from public.card_feedback) <> 1 then raise exception 'founder a1 feedback visibility wrong'; end if;
  if (select count(*) from public.card_owners) <> 1 then raise exception 'founder a1 owner visibility wrong'; end if;
end $$;
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''phill-mcgurk'', ''A'', ''b'')', '42501', 'authenticated insert');
select pg_temp.expect_error('update public.card_enquiries set ask = ''x''', '42501', 'authenticated update');
select pg_temp.expect_error('delete from public.card_feedback', '42501', 'authenticated delete');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
do $$
begin
  if (select count(*) from public.card_enquiries where card_slug = 'phill-mcgurk') <> 0
     or (select count(*) from public.card_enquiries) <> 1 then
    raise exception 'founder b2 can see another card''s enquiries';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  if (select count(*) from public.card_enquiries) + (select count(*) from public.card_feedback) <> 0 then
    raise exception 'a signed-in user who owns no card can read rows';
  end if;
end $$;
reset role;

-- 3. nothing slipped in: exactly the rows the valid inserts made, no phone column anywhere
do $$
begin
  if (select count(*) from public.card_enquiries) <> 2 or (select count(*) from public.card_feedback) <> 2 then
    raise exception 'unexpected row count';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name in ('card_enquiries', 'card_feedback', 'card_owners')
      and column_name ~* 'phone|mobile|tel'
  ) then
    raise exception 'a phone column exists';
  end if;
  if has_table_privilege('anon', 'public.card_enquiries', 'select')
     or has_table_privilege('anon', 'public.card_feedback', 'select')
     or has_table_privilege('anon', 'public.card_owners', 'select') then
    raise exception 'anon holds SELECT';
  end if;
end $$;

select 'CARD_RLS_PROOF_PASS' as result;
