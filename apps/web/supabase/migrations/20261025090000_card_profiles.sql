-- FOUNDER-GATED: NOT applied to production. Apply only under the founder's break-glass approval (A2).
-- Proven on a throwaway local Postgres 15 only: scripts/card-db-proof.sh.
-- Living Card v2, phase 1: the persistent owner card at /c/<slug>.
--  1. card_profiles: what a card shows publicly, one row per card_owners.card_slug. Anon may read ONLY the
--     public columns of PUBLISHED rows; the card's owner manages their own row; nobody anonymous can write.
--  2. R2 fix: card_enquiries / card_feedback took anonymous INSERT "with check (true)", so a well-formed slug that
--     nobody owns was accepted. Anon may now write only for a card that has an owner and is not an unpublished draft
--     (an owned card with no profile row, such as the existing static card, keeps working).
-- Re-appliable: tables/indexes use if not exists, functions use create or replace, policies are dropped and recreated.
-- Rollback (reviewed forward migration): drop the two anon insert policies and recreate them as with check (true),
--   then drop table public.card_profiles and function public.card_slug_accepts_capture. No data outside card_profiles is touched.

create table if not exists public.card_profiles (
  card_slug text primary key references public.card_owners(card_slug) on delete cascade,
  display_name text not null check (char_length(display_name) <= 80 and display_name ~ '[^[:space:]]'),
  role_title text check (role_title is null or char_length(role_title) <= 80),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  email text check (
    email is null
    or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,24}$'),
  service_area text check (service_area is null or char_length(service_area) <= 160),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.card_profiles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists card_profiles_touch on public.card_profiles;
create trigger card_profiles_touch before update on public.card_profiles
  for each row execute function public.card_profiles_touch();

alter table public.card_profiles enable row level security;
alter table public.card_profiles force row level security;

revoke all on table public.card_profiles from public, anon, authenticated;
-- public columns only; created_at / updated_at stay private
grant select (card_slug, display_name, role_title, business_name, email, phone, service_area, published_at)
  on table public.card_profiles to anon;
grant select on table public.card_profiles to authenticated;
grant insert (card_slug, display_name, role_title, business_name, email, phone, service_area, published_at)
  on table public.card_profiles to authenticated;
-- card_slug is not updatable: a row cannot be re-keyed onto another card
grant update (display_name, role_title, business_name, email, phone, service_area, published_at)
  on table public.card_profiles to authenticated;
grant delete on table public.card_profiles to authenticated;
grant select, insert, update, delete on table public.card_profiles to service_role;

drop policy if exists card_profiles_published_select on public.card_profiles;
create policy card_profiles_published_select on public.card_profiles
  for select to anon, authenticated using (published_at is not null);

drop policy if exists card_profiles_owner_all on public.card_profiles;
create policy card_profiles_owner_all on public.card_profiles
  for all to authenticated
  using (exists (
    select 1 from public.card_owners as owner
    where owner.card_slug = card_profiles.card_slug and owner.founder_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.card_owners as owner
    where owner.card_slug = card_profiles.card_slug and owner.founder_id = auth.uid()
  ));

-- R2: security definer so anon can ask the question without being able to read card_owners.
-- It returns one boolean and nothing else.
create or replace function public.card_slug_accepts_capture(p_slug text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.card_owners as o where o.card_slug = p_slug)
     and not exists (select 1 from public.card_profiles as p where p.card_slug = p_slug and p.published_at is null);
$$;
revoke all on function public.card_slug_accepts_capture(text) from public;
grant execute on function public.card_slug_accepts_capture(text) to anon, authenticated, service_role;

drop policy if exists card_enquiries_anon_insert on public.card_enquiries;
create policy card_enquiries_anon_insert on public.card_enquiries
  for insert to anon with check (
    -- a malformed slug passes here so the table's own check constraint rejects it (23514), as before
    card_slug !~ '^[a-z0-9-]{1,64}$' or public.card_slug_accepts_capture(card_slug)
  );

drop policy if exists card_feedback_anon_insert on public.card_feedback;
create policy card_feedback_anon_insert on public.card_feedback
  for insert to anon with check (
    -- a malformed slug passes here so the table's own check constraint rejects it (23514), as before
    card_slug !~ '^[a-z0-9-]{1,64}$' or public.card_slug_accepts_capture(card_slug)
  );

-- Enquiry duplicate guard (review round 2): the same (card_slug, reply_email, ask) within 10 minutes returns the row
-- already stored instead of inserting another, so a retry gets the same receipt. An advisory transaction lock on the
-- key makes two racing retries serialise. Security invoker: only service_role (bypassrls, insert/select granted) may call it.
-- Rollback: drop function public.card_submit_enquiry(text, text, text, text, text, text).
create or replace function public.card_submit_enquiry(
  p_card_slug text, p_first_name text, p_business text, p_ask text, p_reply_email text, p_source text
) returns table (id uuid, created_at timestamptz)
language plpgsql as $$
declare
  v_id uuid;
  v_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_card_slug || E'\x1f' || coalesce(lower(p_reply_email), '') || E'\x1f' || p_ask, 0));
  select e.id, e.created_at into v_id, v_at
    from public.card_enquiries as e
    where e.card_slug = p_card_slug
      and lower(e.reply_email) is not distinct from lower(p_reply_email)
      and e.ask = p_ask
      and e.created_at > now() - interval '10 minutes'
    order by e.created_at desc
    limit 1;
  if v_id is null then
    insert into public.card_enquiries as e (card_slug, first_name, business, ask, reply_email, source)
      values (p_card_slug, p_first_name, p_business, p_ask, p_reply_email, p_source)
      returning e.id, e.created_at into v_id, v_at;
  end if;
  return query select v_id, v_at;
end $$;
revoke all on function public.card_submit_enquiry(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.card_submit_enquiry(text, text, text, text, text, text) to service_role;
