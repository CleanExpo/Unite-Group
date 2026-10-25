-- R2 (ledger C25): the anon INSERT policies on card_enquiries / card_feedback were "with check (true)",
-- so a well-formed slug nobody owns was accepted. After 20261025090000_card_profiles.sql anon may write only for
-- a card that has an owner and is not an unpublished draft. Run on a THROWAWAY database only (psql -v ON_ERROR_STOP=1).
-- Run against the pre-fix schema this raises "ALLOWED but should fail" (that is the recorded current behaviour).

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1') on conflict do nothing;
insert into public.card_owners (card_slug, founder_id) values ('owned-card', '00000000-0000-0000-0000-0000000000a1')
  on conflict do nothing;

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

set role anon;
insert into public.card_enquiries (card_slug, first_name, ask) values ('owned-card', 'Jo', 'Hello');
insert into public.card_feedback (card_slug, first_name, answers) values ('owned-card', 'Jo', '{}');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''no-such-card'', ''Jo'', ''Hello'')', '42501', 'anon enquiry for an unowned slug');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''no-such-card'', ''Jo'', ''{}'')', '42501', 'anon feedback for an unowned slug');
reset role;

select 'CARD_R2_PASS' as result;
