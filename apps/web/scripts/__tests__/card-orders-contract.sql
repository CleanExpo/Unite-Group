-- Positive assertions for card_orders / card_order_intakes. Runs after the migration, ON_ERROR_STOP.
do $$ begin
  assert (select count(*) from pg_class
          where relname in ('card_orders', 'card_order_intakes') and relrowsecurity and relforcerowsecurity) = 2,
    'RLS not forced on both tables';
end $$;

set role service_role;
insert into card_orders (founder_id, reference, stripe_session_id, stripe_event_id, tier, customer_name, amount_total, currency, livemode)
  values ('00000000-0000-0000-0000-00000000000a', 'ref_1', 'cs_test_1', 'evt_1', 'ready', 'Sample Client', 24900, 'aud', false);
insert into card_orders (founder_id, reference, stripe_session_id, stripe_event_id, tier, amount_total, currency, livemode)
  values ('00000000-0000-0000-0000-00000000000b', 'ref_2', 'cs_test_2', 'evt_2', 'custom', 44900, 'aud', false);
insert into card_order_intakes (order_id, founder_id, name, business, email, where_met)
  select id, founder_id, 'Sample Client', 'Sample Plumbing Co', 'sample@example.invalid', 'Expo'
  from card_orders where reference = 'ref_1';
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from card_orders) = 1, 'founder must read exactly their own order';
  assert (select reference from card_orders) = 'ref_1', 'founder read the wrong order';
  assert (select count(*) from card_order_intakes) = 1, 'founder must read their own intake';
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from card_order_intakes) = 0, 'another founder must not read the intake';
end $$;
reset role;

set role anon;
do $$ begin
  begin
    perform 1 from card_orders;
    raise exception 'anon read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
