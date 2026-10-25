-- Direct-insert cap proof (G10b). THROWAWAY database only (psql -v ON_ERROR_STOP=1).
-- The per-card volume cap must also bind a direct anon INSERT into card_enquiries, not only card_submit_enquiry.
-- Every expectation raises on failure; CARD_ENQUIRY_DIRECT_CAP_PASS prints only if all held.

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1') on conflict do nothing;
insert into public.card_owners (card_slug, founder_id) values ('direct-card', '00000000-0000-0000-0000-0000000000d1'), ('direct-other', '00000000-0000-0000-0000-0000000000d1')
  on conflict do nothing;

create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'EXPECTATION FAILED: %', label; end if;
end $$;

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
grant execute on function pg_temp.expect_error(text, text, text) to anon;

-- the existing static card flow: an anon insert for an owned card with no profile row works up to the cap
set role anon;
insert into public.card_enquiries (card_slug, first_name, ask) select 'direct-card', 'Jo', 'direct ' || n from generate_series(1, 30) as n;
-- the 31st direct anon insert inside an hour is refused by row-level security
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''direct-card'', ''Jo'', ''direct 31'')', '42501', 'direct anon insert past the cap');
reset role;
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'direct-card') = 30, 'the refused direct insert stored nothing');

-- the cap is shared with card_submit_enquiry: through the function, the 31st is also refused
set role service_role;
do $$ begin
  begin
    perform public.card_submit_enquiry('direct-card', 'Jo', null, 'via function', null, 'card-profile');
  exception when others then
    if sqlerrm <> 'card_enquiry_rate_limited' then raise exception 'EXPECTATION FAILED: wrong error %', sqlerrm; end if;
    return;
  end;
  raise exception 'EXPECTATION FAILED: card_submit_enquiry accepted past the shared cap';
end $$;
reset role;

-- another card is unaffected
set role anon;
insert into public.card_enquiries (card_slug, first_name, ask) values ('direct-other', 'Jo', 'hello');
reset role;

-- once the hour has passed, a direct insert is accepted again
update public.card_enquiries set created_at = now() - interval '61 minutes' where card_slug = 'direct-card';
set role anon;
insert into public.card_enquiries (card_slug, first_name, ask) values ('direct-card', 'Jo', 'after the window');
reset role;
select pg_temp.check_true((select count(*) from public.card_enquiries where card_slug = 'direct-card') = 31, 'a direct insert is accepted once the hour has passed');

select 'CARD_ENQUIRY_DIRECT_CAP_PASS' as result;
