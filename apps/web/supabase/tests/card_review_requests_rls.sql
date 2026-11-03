-- Two-tenant proof for 20261102140000_card_review_requests.sql. Run as a superuser on a THROWAWAY database after
-- 20261024210000_card_enquiries_feedback.sql, 20261025090000_card_profiles.sql and the review migration (twice).
-- Never run on a live project. Any failed expectation raises, so CARD_REVIEW_RLS_PROOF_PASS prints only when all held.
-- A = founder ...a1 (tenant-a published, tenant-a-draft draft). B = founder ...b2 (tenant-b published). B is malicious.

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2');
insert into public.card_owners (card_slug, founder_id) values
  ('tenant-a', '00000000-0000-0000-0000-0000000000a1'),
  ('tenant-a-draft', '00000000-0000-0000-0000-0000000000a1'),
  ('tenant-b', '00000000-0000-0000-0000-0000000000b2');
insert into public.card_profiles (card_slug, display_name, published_at, google_place_id) values
  ('tenant-a', 'Alex A', now(), 'ChIJN1t_tDeuEmsRUsoyG83frY4'),
  ('tenant-a-draft', 'Alex Draft', null, null),
  ('tenant-b', 'Bo B', now(), null);

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
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_raise(text, text, text),
  pg_temp.expect_value(text, text, text) to anon, authenticated, service_role;

-- recipient hashes below are well formed but fake: 64 x '1' (customer 1) and 64 x '2' (customer 2)

-- ===== the Place ID column =====
select pg_temp.expect_error($$update public.card_profiles set google_place_id = 'bad id!' where card_slug = 'tenant-b'$$, '23514', 'malformed Place ID refused by the check');
select pg_temp.expect_error($$update public.card_profiles set google_place_id = 'short' where card_slug = 'tenant-b'$$, '23514', 'too-short Place ID refused');

-- ===== anon (the public) =====
set role anon;
select pg_temp.expect_value($$select google_place_id from public.card_profiles where card_slug = 'tenant-a'$$, 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'anon reads a published Place ID');
select pg_temp.expect_error('select count(*) from public.card_review_requests', '42501', 'anon reads requests');
select pg_temp.expect_error('select count(*) from public.card_review_optouts', '42501', 'anon reads opt-outs');
select pg_temp.expect_error('select count(*) from public.card_review_events', '42501', 'anon reads events');
select pg_temp.expect_error($$insert into public.card_review_events (card_slug, kind) values ('tenant-a', 'review_tap')$$, '42501', 'anon inserts an event directly');
select pg_temp.expect_error($$select public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '1111111111111111111111111111111111111111111111111111111111111111', true)$$, '42501', 'anon creates a request');
select pg_temp.expect_error($$select public.card_record_review_optout('tenant-a', '1111111111111111111111111111111111111111111111111111111111111111')$$, '42501', 'anon records an opt-out');
select pg_temp.expect_value($$select public.card_log_review_event('tenant-a', 'review_tap', null, 'mobile')::text$$, 'true', 'anon logs a tap on a published card');
select pg_temp.expect_value($$select public.card_log_review_event('tenant-a-draft', 'review_tap', null, null)::text$$, 'false', 'no event for a draft card');
select pg_temp.expect_value($$select public.card_log_review_event('nobody', 'review_tap', null, null)::text$$, 'false', 'no event for an unowned slug');
select pg_temp.expect_value($$select public.card_log_review_event('tenant-a', 'made_up', null, null)::text$$, 'false', 'no event for an unknown kind');
select pg_temp.expect_value($$select public.card_log_review_event('tenant-a', 'review_tap', null, 'Mozilla/5.0 raw')::text$$, 'false', 'raw user agent refused');
select pg_temp.expect_value($$select public.card_log_review_event('../x', 'review_tap', null, null)::text$$, 'false', 'malformed slug refused');
reset role;

-- ===== owner B (malicious) cannot act on A's card =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
select pg_temp.expect_raise($$select * from public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '1111111111111111111111111111111111111111111111111111111111111111', true)$$, 'card_review_not_owner', 'B asks from A''s card');
select pg_temp.expect_raise($$select public.card_record_review_optout('tenant-a', '1111111111111111111111111111111111111111111111111111111111111111')$$, 'card_review_not_owner', 'B opts out on A''s card');
select pg_temp.expect_value($$with u as (update public.card_profiles set google_place_id = 'ChIJAAAAAAAAAAAAAAAAAAAA' where card_slug = 'tenant-a' returning 1) select count(*)::text from u$$, '0', 'B''s update of A''s Place ID touches no row');
reset role;
select pg_temp.expect_value($$select google_place_id from public.card_profiles where card_slug = 'tenant-a'$$, 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'A''s Place ID unchanged by B');

-- ===== owner A =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.expect_raise($$select * from public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '1111111111111111111111111111111111111111111111111111111111111111', false)$$, 'card_review_consent_required', 'consent false refused');
select pg_temp.expect_raise($$select * from public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '1111111111111111111111111111111111111111111111111111111111111111', null)$$, 'card_review_consent_required', 'consent null refused');
select pg_temp.expect_raise($$select * from public.card_create_review_request('tenant-a', 'Sam', 'sent_email', '1111111111111111111111111111111111111111111111111111111111111111', true)$$, 'card_review_bad_input', 'we-send channel refused in v1');
select pg_temp.expect_raise($$select * from public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '0412345678', true)$$, 'card_review_bad_input', 'raw contact in place of a hash refused');
select pg_temp.expect_value($$select outcome from public.card_create_review_request('tenant-a', 'Sam', 'owner_sms', '1111111111111111111111111111111111111111111111111111111111111111', true)$$, 'created', 'first request created');
select pg_temp.expect_value($$select outcome from public.card_create_review_request('tenant-a', 'Sam', 'owner_email', '1111111111111111111111111111111111111111111111111111111111111111', true)$$, 'duplicate', 'same recipient same day is a duplicate');
select pg_temp.expect_value('select count(*)::text from public.card_review_requests', '1', 'dedupe kept one row');
select pg_temp.expect_value('select (consent_confirmed_at is not null and recipient_contact is null and founder_id = auth.uid())::text from public.card_review_requests', 'true', 'consent time stored, no raw contact, founder set from the session');
select pg_temp.expect_value($$select public.card_record_review_optout('tenant-a', '2222222222222222222222222222222222222222222222222222222222222222')::text$$, 'true', 'A records an opt-out');
select pg_temp.expect_value($$select public.card_record_review_optout('tenant-a', '2222222222222222222222222222222222222222222222222222222222222222')::text$$, 'true', 'opt-out is idempotent');
select pg_temp.expect_value($$select outcome from public.card_create_review_request('tenant-a', 'Jo', 'owner_sms', '2222222222222222222222222222222222222222222222222222222222222222', true)$$, 'opted_out', 'opted-out recipient is never asked');
select pg_temp.expect_value('select count(*)::text from public.card_review_requests', '1', 'no row for the opted-out recipient');
select pg_temp.expect_error($$insert into public.card_review_requests (card_slug, founder_id, recipient_first_name, channel, recipient_hash, consent_confirmed_at) values ('tenant-a', auth.uid(), 'x', 'owner_sms', '2222222222222222222222222222222222222222222222222222222222222222', now())$$, '42501', 'owner cannot insert past the function');
select pg_temp.expect_value('select count(*)::text from public.card_review_events', '1', 'A sees the one tap on their card');
-- request link open: the event keeps the request id only when it belongs to the card
reset role;
set role anon;
select pg_temp.expect_value($$select public.card_log_review_event('tenant-b', 'request_link_open', null, null)::text$$, 'true', 'event with no request id');
reset role;
select pg_temp.expect_value($$select public.card_log_review_event('tenant-b', 'request_link_open', (select id from public.card_review_requests limit 1), null)::text$$, 'true', 'event with another card''s request id');
select pg_temp.expect_value($$select count(*)::text from public.card_review_events where card_slug = 'tenant-b' and request_id is not null$$, '0', 'another card''s request id is dropped, not trusted');
select pg_temp.expect_value($$select public.card_log_review_event('tenant-a', 'request_link_open', (select id from public.card_review_requests limit 1), 'mobile')::text$$, 'true', 'event with own request id');
select pg_temp.expect_value($$select count(*)::text from public.card_review_events where card_slug = 'tenant-a' and request_id is not null$$, '1', 'own request id kept');

-- ===== B sees nothing of A =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
select pg_temp.expect_value('select count(*)::text from public.card_review_requests', '0', 'B sees none of A''s requests');
select pg_temp.expect_value('select count(*)::text from public.card_review_optouts', '0', 'B sees none of A''s opt-outs');
select pg_temp.expect_value($$select count(*)::text from public.card_review_events where card_slug = 'tenant-a'$$, '0', 'B sees none of A''s events');
reset role;

-- ===== the events table holds no personal data columns =====
select pg_temp.expect_value($$select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'card_review_events'$$, 'id,created_at,card_slug,kind,request_id,ua_class', 'event columns are exactly the no-PII set');

select 'CARD_REVIEW_RLS_PROOF_PASS' as result;
