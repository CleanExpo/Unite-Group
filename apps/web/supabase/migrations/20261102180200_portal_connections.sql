-- FOUNDER-GATED: NOT applied to any database. Apply only through a reviewed, approved branch, after
-- 20261102180000_portal_change_requests.sql (it uses public.portal_owner_tenant_slug()).
-- Proven on a throwaway in-memory Postgres (PGlite) only: supabase/tests/portal_s3_rls.sql.
-- Owner portal connections checklist (UNI-3142 connections; feeds SYN-1375 GBP and SYN-1376 social). Additive only.
--  * One row per (tenant, kind). kind gsc|bing|gbp|facebook|instagram|linkedin|youtube|tiktok|x.
--  * status not_started|link_saved|access_granted|verified. A missing row means not_started.
--  * Holds a PUBLIC profile URL (socials, GBP) or a property id (GSC, Bing) and short notes. Nothing else.
--    NEVER passwords, tokens or API keys. There is no column for them, and notes that look like a key are refused.
--    OAuth tokens are out of scope here; the secrets broker (UNI-3142) comes later and will not live in this table.
--  * An aal2 owner may save a link and say she has granted access. Only our team (service_role) sets verified.
-- Rollback (a separate reviewed forward migration, written out in the PR body): remove the functions
--   portal_mark_connection_access_granted and portal_save_connection, then the table portal_connections.
--   No other table is touched.

create table if not exists public.portal_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  kind text not null check (kind in ('gsc', 'bing', 'gbp', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x')),
  status text not null default 'not_started' check (status in ('not_started', 'link_saved', 'access_granted', 'verified')),
  -- https only, and no "@" before the first "/" (that would hide a login or another host). TikTok and YouTube
  -- handles put "@" in the path, which is allowed.
  profile_url text check (profile_url is null or (char_length(profile_url) <= 300
    and profile_url ~ '^https://[^/[:space:]@]+(/[^[:space:]]*)?$')),
  property_id text check (property_id is null or (char_length(property_id) <= 300
    and property_id ~ '^(sc-domain:[a-z0-9.-]{1,253}|https://[^/[:space:]@]+(/[^[:space:]]*)?)$')),
  notes text check (notes is null or (char_length(notes) <= 500 and notes !~ '[A-Za-z0-9_+/=-]{32,}')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  constraint portal_connections_one_per_kind unique (tenant_slug, kind),
  constraint portal_connections_value_by_kind check (
    (kind in ('gsc', 'bing') and profile_url is null) or (kind not in ('gsc', 'bing') and property_id is null)),
  constraint portal_connections_verified_time check ((status = 'verified') = (verified_at is not null))
);

create index if not exists portal_connections_tenant_idx on public.portal_connections (tenant_slug);

alter table public.portal_connections enable row level security;
alter table public.portal_connections force row level security;

revoke all on table public.portal_connections from public, anon, authenticated;
grant select on table public.portal_connections to authenticated;
grant select, insert, update on table public.portal_connections to service_role;

drop policy if exists portal_connections_owner_select on public.portal_connections;
create policy portal_connections_owner_select on public.portal_connections
  for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()));

-- Owner saves (or changes) the link for one item. A changed value goes back to link_saved and loses verified.
-- Raises portal_not_owner / portal_bad_input. Returns the resulting status.
create or replace function public.portal_save_connection(p_kind text, p_profile_url text, p_property_id text, p_notes text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if p_kind is null or p_kind not in ('gsc', 'bing', 'gbp', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x')
     or (p_kind in ('gsc', 'bing') and (p_property_id is null or p_profile_url is not null))
     or (p_kind not in ('gsc', 'bing') and (p_profile_url is null or p_property_id is not null))
     or (p_profile_url is not null and (char_length(p_profile_url) > 300
         or p_profile_url !~ '^https://[^/[:space:]@]+(/[^[:space:]]*)?$'))
     or (p_property_id is not null and (char_length(p_property_id) > 300
         or p_property_id !~ '^(sc-domain:[a-z0-9.-]{1,253}|https://[^/[:space:]@]+(/[^[:space:]]*)?)$'))
     or (p_notes is not null and (char_length(p_notes) > 500 or p_notes ~ '[A-Za-z0-9_+/=-]{32,}'))
  then raise exception 'portal_bad_input'; end if;
  insert into public.portal_connections as c (tenant_slug, kind, status, profile_url, property_id, notes, updated_by)
    values (v_tenant, p_kind, 'link_saved', p_profile_url, p_property_id, nullif(btrim(p_notes), ''), v_uid)
  on conflict on constraint portal_connections_one_per_kind do update set
    status = case
      when c.profile_url is distinct from excluded.profile_url or c.property_id is distinct from excluded.property_id
        or c.status = 'not_started' then 'link_saved'
      else c.status end,
    verified_at = case
      when c.profile_url is distinct from excluded.profile_url or c.property_id is distinct from excluded.property_id
        then null
      else c.verified_at end,
    profile_url = excluded.profile_url,
    property_id = excluded.property_id,
    notes = excluded.notes,
    updated_at = now(),
    updated_by = v_uid
  returning c.status into v_status;
  return v_status;
end $$;
revoke all on function public.portal_save_connection(text, text, text, text) from public, anon;
grant execute on function public.portal_save_connection(text, text, text, text) to authenticated;

-- Owner says she has added our Google or Microsoft account (GSC, Bing, GBP only). Needs a saved link first.
-- Returns the resulting status; an item already at access_granted or verified is left as it is.
create or replace function public.portal_mark_connection_access_granted(p_kind text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if p_kind is null or p_kind not in ('gsc', 'bing', 'gbp') then raise exception 'portal_bad_input'; end if;
  select c.status into v_status from public.portal_connections as c
    where c.tenant_slug = v_tenant and c.kind = p_kind for update;
  if not found or v_status = 'not_started' then raise exception 'portal_bad_input'; end if;
  if v_status = 'link_saved' then
    update public.portal_connections as c set status = 'access_granted', updated_at = now(), updated_by = v_uid
      where c.tenant_slug = v_tenant and c.kind = p_kind;
    v_status := 'access_granted';
  end if;
  return v_status;
end $$;
revoke all on function public.portal_mark_connection_access_granted(text) from public, anon;
grant execute on function public.portal_mark_connection_access_granted(text) to authenticated;
