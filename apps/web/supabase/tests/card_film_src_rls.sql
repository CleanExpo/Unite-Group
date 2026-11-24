-- Proof for 20261123100000_card_profiles_film_src.sql (card_profiles.film_src).
-- Run with psql -v ON_ERROR_STOP=1 as a superuser on a THROWAWAY database after the card migrations
-- (scripts/card-db-proof.sh section 7 does this). Never run on a live project. Any failed expectation raises,
-- so CARD_FILM_SRC_PROOF_PASS is only printed when every case held.
-- Tenant A = founder ...a1: cards film-pub (published, has a film), film-draft (draft, has a film), film-none (published, no film).

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2');
insert into public.card_owners (card_slug, founder_id) values
  ('film-pub', '00000000-0000-0000-0000-0000000000a1'),
  ('film-draft', '00000000-0000-0000-0000-0000000000a1'),
  ('film-none', '00000000-0000-0000-0000-0000000000a1'),
  ('film-b', '00000000-0000-0000-0000-0000000000b2');
insert into public.card_profiles (card_slug, display_name, published_at, film_src) values
  ('film-pub', 'Pat Published', now(), '/cards/media/edition-constellation.mp4'),
  ('film-draft', 'Dee Draft', null, '/cards/media/edition-draft-secret.mp4'),
  ('film-none', 'Nia None', now(), null),
  ('film-b', 'Bo B', now(), null);

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
create function pg_temp.expect_count(q text, n int, label text) returns void
language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || q || ') s' into got;
  if got <> n then raise exception 'COUNT for %: got %, wanted %', label, got, n; end if;
end $$;
create function pg_temp.expect_rows(stmt text, n int, label text) returns void
language plpgsql as $$
declare got int;
begin
  execute stmt;
  get diagnostics got = row_count;
  if got <> n then raise exception 'ROWS for %: got %, wanted %', label, got, n; end if;
end $$;
grant execute on function pg_temp.expect_error(text, text, text), pg_temp.expect_count(text, int, text),
  pg_temp.expect_rows(text, int, text) to anon, authenticated, service_role;

-- ===== the CHECK, as the table owner (superuser), so it is the constraint and not a grant that answers =====
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/../../etc/passwd' where card_slug = 'film-none'$$, '23514', 'CHECK accepts a ../ path');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/a/../b.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts an embedded ..');
select pg_temp.expect_error($$update public.card_profiles set film_src = 'https://evil.example.invalid/x.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts an absolute https URL');
select pg_temp.expect_error($$update public.card_profiles set film_src = 'http://evil.example.invalid/x.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts an absolute http URL');
select pg_temp.expect_error($$update public.card_profiles set film_src = '//evil.example.invalid/cards/media/x.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts a protocol-relative URL');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/other/x.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts a path outside /cards/media/');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/%2e%2e/x.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts a percent-encoded traversal');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/x\y.mp4' where card_slug = 'film-none'$$, '23514', 'CHECK accepts a backslash');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/' where card_slug = 'film-none'$$, '23514', 'CHECK accepts an empty file name');
select pg_temp.expect_rows($$update public.card_profiles set film_src = '/cards/media/edition-orbit.mp4' where card_slug = 'film-none'$$, 1, 'CHECK refuses a good /cards/media/ path');
select pg_temp.expect_rows($$update public.card_profiles set film_src = null where card_slug = 'film-none'$$, 1, 'CHECK refuses null');

-- ===== anon: reads film_src only on published cards =====
set role anon;
select pg_temp.expect_count($$select film_src from public.card_profiles where card_slug = 'film-pub' and film_src = '/cards/media/edition-constellation.mp4'$$, 1, 'anon cannot read film_src of a published card');
select pg_temp.expect_count($$select film_src from public.card_profiles where card_slug = 'film-draft'$$, 0, 'anon reads the film_src of a draft card');
select pg_temp.expect_count($$select film_src from public.card_profiles where film_src is not null$$, 1, 'anon sees a film_src other than the one on the published card');
select pg_temp.expect_count($$select card_slug, film_src from public.card_profiles$$, 3, 'anon sees other than the three published rows');
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/x.mp4'$$, '42501', 'anon writes film_src');
select pg_temp.expect_error($$insert into public.card_profiles (card_slug, display_name, film_src) values ('film-b', 'Evil', '/cards/media/x.mp4')$$, '42501', 'anon inserts film_src');
select pg_temp.expect_error($$select * from public.card_profiles$$, '42501', 'anon select * still refused');
reset role;

-- ===== authenticated owner: the grants were NOT extended, so a signed-in owner cannot choose a film =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.expect_error($$update public.card_profiles set film_src = '/cards/media/edition-orbit.mp4' where card_slug = 'film-pub'$$, '42501', 'authenticated owner updates film_src');
select pg_temp.expect_error($$insert into public.card_profiles (card_slug, display_name, film_src) values ('film-b', 'Evil', '/cards/media/x.mp4')$$, '42501', 'authenticated inserts film_src');
-- the owner still manages the rest of the row
select pg_temp.expect_rows($$update public.card_profiles set display_name = 'Pat Two' where card_slug = 'film-pub'$$, 1, 'owner edits own non-film column');
select set_config('request.jwt.claim.sub', '', false);
reset role;

-- ===== service_role (the operator path) sets and clears a film =====
set role service_role;
select pg_temp.expect_rows($$update public.card_profiles set film_src = '/cards/media/edition-orbit.mp4' where card_slug = 'film-b'$$, 1, 'service role sets film_src');
select pg_temp.expect_error($$update public.card_profiles set film_src = 'https://evil.example.invalid/x.mp4' where card_slug = 'film-b'$$, '23514', 'service role bypasses the CHECK');
reset role;

do $$
begin
  if (select film_src from public.card_profiles where card_slug = 'film-pub') <> '/cards/media/edition-constellation.mp4' then raise exception 'film-pub film_src was changed'; end if;
  if has_column_privilege('anon', 'public.card_profiles', 'film_src', 'update') or has_column_privilege('anon', 'public.card_profiles', 'film_src', 'insert') then
    raise exception 'anon holds a write privilege on film_src'; end if;
  if has_column_privilege('authenticated', 'public.card_profiles', 'film_src', 'update') or has_column_privilege('authenticated', 'public.card_profiles', 'film_src', 'insert') then
    raise exception 'authenticated holds a write privilege on film_src'; end if;
  if not has_column_privilege('anon', 'public.card_profiles', 'film_src', 'select') then raise exception 'anon cannot select film_src'; end if;
end $$;

select 'CARD_FILM_SRC_PROOF_PASS' as result;
