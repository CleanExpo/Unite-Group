-- Two-malicious-tenant RLS proof for 20261025090000_card_profiles.sql (card_profiles, card_enquiries, card_feedback).
-- Run with psql -v ON_ERROR_STOP=1 as a superuser on a THROWAWAY database after both card migrations
-- (scripts/card-db-proof.sh does this). Never run on a live project. Any failed expectation raises,
-- so CARD_PROFILES_RLS_PROOF_PASS is only printed when every case held.
-- Tenants: A = founder ...a1 (cards tenant-a published, tenant-a-draft draft, legacy-a owned with no profile)
--          B = founder ...b2 (card tenant-b published, tenant-b-new owned with no profile). B is malicious.

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2'), ('00000000-0000-0000-0000-0000000000c3');
insert into public.card_owners (card_slug, founder_id) values
  ('tenant-a', '00000000-0000-0000-0000-0000000000a1'),
  ('tenant-a-draft', '00000000-0000-0000-0000-0000000000a1'),
  ('legacy-a', '00000000-0000-0000-0000-0000000000a1'),
  ('tenant-b', '00000000-0000-0000-0000-0000000000b2'),
  ('tenant-b-new', '00000000-0000-0000-0000-0000000000b2');
insert into public.card_profiles (card_slug, display_name, role_title, business_name, email, phone, service_area, published_at) values
  ('tenant-a', 'Alex A', 'Plumber', 'A Plumbing', 'alex@example.com', '+61 400 000 001', 'Brisbane', now()),
  ('tenant-a-draft', 'Alex Draft', 'Secret role', 'Draft Co', 'draft@example.com', '+61 400 000 002', 'Hidden', null),
  ('tenant-b', 'Bo B', 'Painter', 'B Painting', 'bo@example.com', null, 'Perth', now());
insert into public.card_enquiries (card_slug, first_name, ask) values
  ('tenant-a', 'Visitor1', 'for A'), ('tenant-b', 'Visitor2', 'for B');
insert into public.card_feedback (card_slug, first_name, answers) values
  ('tenant-a', 'Visitor1', '{"x":"A"}'), ('tenant-b', 'Visitor2', '{"x":"B"}');

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
-- expect_rows: the statement must run and affect/return exactly n rows (RLS hides rows instead of raising)
create function pg_temp.expect_rows(stmt text, n int, label text) returns void
language plpgsql as $$
declare got int;
begin
  execute stmt;
  get diagnostics got = row_count;
  if got <> n then raise exception 'ROWS for %: got %, wanted %', label, got, n; end if;
end $$;
create function pg_temp.expect_count(q text, n int, label text) returns void
language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') s' into got;
  if got <> n then raise exception 'COUNT for %: got %, wanted %', label, got, n; end if;
end $$;
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_rows(text, int, text),
  pg_temp.expect_count(text, int, text) to anon, authenticated, service_role;

-- ===== anon (the public) =====
set role anon;
select pg_temp.expect_count('select card_slug from public.card_profiles', 2, 'anon sees exactly the two published profiles');
select pg_temp.expect_count('select card_slug from public.card_profiles where card_slug = ''tenant-a-draft''', 0, 'anon cannot see a draft');
select pg_temp.expect_error('select created_at from public.card_profiles', '42501', 'anon reads a non-public column');
select pg_temp.expect_error('select * from public.card_profiles', '42501', 'anon select *');
select pg_temp.expect_error('insert into public.card_profiles (card_slug, display_name) values (''tenant-b-new'', ''Evil'')', '42501', 'anon inserts a profile');
select pg_temp.expect_error('update public.card_profiles set display_name = ''x''', '42501', 'anon updates a profile');
select pg_temp.expect_error('delete from public.card_profiles', '42501', 'anon deletes a profile');
select pg_temp.expect_error('select count(*) from public.card_enquiries', '42501', 'anon reads enquiries');
select pg_temp.expect_error('select count(*) from public.card_feedback', '42501', 'anon reads feedback');
select pg_temp.expect_error('select count(*) from public.card_owners', '42501', 'anon reads owners');
-- R2: only cards that exist and are not drafts accept a visitor
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''ghost-card'', ''Jo'', ''hi'')', '42501', 'anon enquiry for an unowned slug');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''tenant-a-draft'', ''Jo'', ''hi'')', '42501', 'anon enquiry for a draft card');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''ghost-card'', ''Jo'', ''{}'')', '42501', 'anon feedback for an unowned slug');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''tenant-a-draft'', ''Jo'', ''{}'')', '42501', 'anon feedback for a draft card');
select pg_temp.expect_rows('insert into public.card_enquiries (card_slug, first_name, ask) values (''tenant-a'', ''Jo'', ''hi'')', 1, 'anon enquiry for a published card');
select pg_temp.expect_rows('insert into public.card_enquiries (card_slug, first_name, ask) values (''legacy-a'', ''Jo'', ''hi'')', 1, 'anon enquiry for an owned card with no profile (the existing static card keeps working)');
select pg_temp.expect_rows('insert into public.card_feedback (card_slug, first_name, answers) values (''tenant-b'', ''Jo'', ''{}'')', 1, 'anon feedback for a published card');
reset role;

-- ===== tenant B (malicious) =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
-- reads: B sees its own rows and A's PUBLISHED profile, never A's draft
select pg_temp.expect_count('select 1 from public.card_profiles', 2, 'B sees own profile + A published only');
select pg_temp.expect_count('select 1 from public.card_profiles where card_slug = ''tenant-a-draft''', 0, 'B reads A draft');
select pg_temp.expect_count('select 1 from public.card_enquiries where card_slug like ''tenant-a%'' or card_slug = ''legacy-a''', 0, 'B reads A enquiries');
select pg_temp.expect_count('select 1 from public.card_enquiries', 1, 'B sees only enquiries for its own cards');
select pg_temp.expect_count('select 1 from public.card_feedback where card_slug <> ''tenant-b''', 0, 'B reads A feedback');
select pg_temp.expect_count('select 1 from public.card_owners where founder_id <> ''00000000-0000-0000-0000-0000000000b2''', 0, 'B reads A owner rows');
-- writes against A: RLS hides the rows, so nothing is touched
select pg_temp.expect_rows('update public.card_profiles set display_name = ''pwned'' where card_slug = ''tenant-a''', 0, 'B updates A published profile');
select pg_temp.expect_rows('update public.card_profiles set published_at = now() where card_slug = ''tenant-a-draft''', 0, 'B publishes A draft');
select pg_temp.expect_rows('delete from public.card_profiles where card_slug in (''tenant-a'', ''tenant-a-draft'')', 0, 'B deletes A profiles');
select pg_temp.expect_error('insert into public.card_profiles (card_slug, display_name) values (''tenant-a'', ''Evil'')', '42501', 'B inserts a profile over A slug');
select pg_temp.expect_error('insert into public.card_profiles (card_slug, display_name) values (''legacy-a'', ''Evil'')', '42501', 'B inserts a profile for A owned card');
select pg_temp.expect_error('insert into public.card_profiles (card_slug, display_name) values (''ghost-card'', ''Evil'')', '42501', 'B inserts a profile for an unowned slug (forged card_slug)');
select pg_temp.expect_error('update public.card_profiles set card_slug = ''tenant-a'' where card_slug = ''tenant-b''', '42501', 'B re-keys its row onto A slug');
-- enquiries/feedback: authenticated has SELECT only
select pg_temp.expect_error('update public.card_enquiries set ask = ''x''', '42501', 'B updates enquiries');
select pg_temp.expect_error('delete from public.card_enquiries', '42501', 'B deletes enquiries');
select pg_temp.expect_error('update public.card_feedback set device = ''x''', '42501', 'B updates feedback');
select pg_temp.expect_error('delete from public.card_feedback', '42501', 'B deletes feedback');
select pg_temp.expect_error('insert into public.card_enquiries (card_slug, first_name, ask) values (''tenant-a'', ''B'', ''forged'')', '42501', 'B inserts an enquiry for A');
select pg_temp.expect_error('insert into public.card_feedback (card_slug, first_name, answers) values (''tenant-a'', ''B'', ''{}'')', '42501', 'B inserts feedback for A');
-- B's own card still works
select pg_temp.expect_rows('insert into public.card_profiles (card_slug, display_name) values (''tenant-b-new'', ''Bo New'')', 1, 'B creates a draft for its own card');
select pg_temp.expect_rows('update public.card_profiles set display_name = ''Bo Two'', published_at = now() where card_slug = ''tenant-b-new''', 1, 'B edits and publishes its own card');
select pg_temp.expect_rows('delete from public.card_profiles where card_slug = ''tenant-b-new''', 1, 'B deletes its own profile');

-- ===== tenant A: sees its own draft and enquiries, cannot touch B =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.expect_count('select 1 from public.card_profiles', 3, 'A sees own two profiles + B published');
select pg_temp.expect_count('select 1 from public.card_profiles where card_slug = ''tenant-a-draft''', 1, 'A sees own draft');
select pg_temp.expect_count('select 1 from public.card_enquiries where card_slug like ''tenant-b%''', 0, 'A reads B enquiries');
select pg_temp.expect_rows('update public.card_profiles set display_name = ''pwned'' where card_slug = ''tenant-b''', 0, 'A updates B profile');
select pg_temp.expect_rows('delete from public.card_profiles where card_slug = ''tenant-b''', 0, 'A deletes B profile');
select pg_temp.expect_error('insert into public.card_profiles (card_slug, display_name) values (''tenant-b-new'', ''Evil'')', '42501', 'A inserts a profile for B card');

-- ===== a signed-in user who owns no card =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', false);
select pg_temp.expect_count('select 1 from public.card_profiles', 2, 'stranger sees only published profiles');
select pg_temp.expect_count('select 1 from public.card_enquiries', 0, 'stranger reads enquiries');
select pg_temp.expect_count('select 1 from public.card_feedback', 0, 'stranger reads feedback');
select pg_temp.expect_rows('update public.card_profiles set display_name = ''x''', 0, 'stranger updates profiles');
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_count('select 1 from public.card_enquiries', 0, 'signed-out authenticated reads enquiries');
reset role;

-- ===== service_role (the server route): can write and read back an enquiry with its id =====
set role service_role;
select pg_temp.expect_rows('insert into public.card_enquiries (card_slug, first_name, ask) values (''tenant-a'', ''Svc'', ''receipt'') returning id', 1, 'service role inserts and reads back an id');
select pg_temp.expect_count('select 1 from public.card_profiles', 3, 'service role sees all profiles');
reset role;

-- ===== end state =====
do $$
begin
  if (select count(*) from public.card_profiles) <> 3 then raise exception 'unexpected profile count'; end if;
  if (select count(*) from public.card_enquiries) <> 5 then raise exception 'unexpected enquiry count %', (select count(*) from public.card_enquiries); end if;
  if (select display_name from public.card_profiles where card_slug = 'tenant-a') <> 'Alex A' then raise exception 'A profile was changed'; end if;
  if (select display_name from public.card_profiles where card_slug = 'tenant-b') <> 'Bo B' then raise exception 'B profile was changed'; end if;
  if (select published_at from public.card_profiles where card_slug = 'tenant-a-draft') is not null then raise exception 'A draft was published'; end if;
  if has_table_privilege('anon', 'public.card_profiles', 'insert') or has_table_privilege('anon', 'public.card_profiles', 'update')
     or has_table_privilege('anon', 'public.card_profiles', 'delete') then raise exception 'anon holds a write privilege on card_profiles'; end if;
  if not (select relforcerowsecurity from pg_class where oid = 'public.card_profiles'::regclass) then raise exception 'card_profiles RLS not forced'; end if;
end $$;

select 'CARD_PROFILES_RLS_PROOF_PASS' as result;
