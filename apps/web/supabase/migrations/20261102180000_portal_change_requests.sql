-- FOUNDER-GATED: NOT applied to any database. Apply only through a reviewed, approved branch.
-- Proven on a throwaway in-memory Postgres (PGlite) only: supabase/tests/portal_s3_rls.sql.
-- Owner portal change requests (UNI-3168, Ivi portal track job S3). Additive only.
--  1. portal_owner_tenant_slug(): the tenant of the signed-in owner, or null. Reads app_metadata.portal_tenant_slug from
--     the JWT (users cannot edit app_metadata) and returns it ONLY when the session is aal2. aal1 is never access.
--     SWAP POINT: when S1 (feat/portal-foundation) lands its owner table, `create or replace` this one function.
--  2. portal_change_requests: one row per "Request a change". Status submitted|in_progress|preview_ready|approved|
--     published|rejected|rolled_back. Optional photo path inside the private bucket portal-change-photos.
--  3. portal_change_request_events: append-only audit log. Every status change writes one row (actor, aal, time).
-- RLS forced on both tables. Owners read only their own tenant's rows, and only at aal2. Nobody but the functions
-- below (and service_role) writes. Approve is allowed only from preview_ready, only by an aal2 owner of that tenant.
-- Re-appliable: if not exists / create or replace / drop-and-recreate policies.
-- Rollback (a separate reviewed forward migration, written out in the PR body): remove the five functions
--   portal_team_advance_change_request, portal_ask_for_change_edits, portal_approve_change_request,
--   portal_create_change_request and portal_owner_tenant_slug, then remove the two tables
--   portal_change_request_events and portal_change_requests. No other table is touched.

create or replace function public.portal_owner_tenant_slug()
returns text
language sql stable set search_path = public, pg_temp as $$
  select case
    when (select auth.jwt() ->> 'aal') = 'aal2'
     and (select auth.jwt() -> 'app_metadata' ->> 'portal_tenant_slug') ~ '^[a-z0-9-]{1,64}$'
    then (select auth.jwt() -> 'app_metadata' ->> 'portal_tenant_slug')
  end
$$;
revoke all on function public.portal_owner_tenant_slug() from public;
grant execute on function public.portal_owner_tenant_slug() to authenticated, service_role;

create table if not exists public.portal_change_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  page text not null check (page in ('home', 'about', 'courses', 'trainers', 'contact', 'other')),
  request_text text not null check (char_length(btrim(request_text)) between 5 and 2000),
  photo_path text,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_progress', 'preview_ready', 'approved', 'published', 'rejected', 'rolled_back')),
  preview_url text check (preview_url is null or (char_length(preview_url) <= 500 and preview_url ~ '^https://[^[:space:]]+$')),
  edit_note text check (edit_note is null or char_length(edit_note) <= 1000),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  rolled_back_at timestamptz,
  constraint portal_change_requests_photo_in_tenant check (photo_path is null or photo_path ~ (
    '^' || tenant_slug || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')),
  constraint portal_change_requests_approval_complete check (status not in ('approved', 'published', 'rolled_back')
    or (approved_at is not null and preview_url is not null))
);

create table if not exists public.portal_change_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.portal_change_requests(id) on delete restrict,
  tenant_slug text not null,
  action text not null check (action in ('submit', 'start', 'preview', 'approve', 'ask_for_edits', 'publish', 'reject', 'roll_back')),
  from_status text,
  to_status text not null,
  actor_kind text not null check (actor_kind in ('owner', 'team')),
  actor_id uuid,
  actor_aal text check (actor_aal is null or actor_aal in ('aal1', 'aal2')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists portal_change_requests_tenant_created_idx on public.portal_change_requests (tenant_slug, created_at desc);
create index if not exists portal_change_request_events_request_idx on public.portal_change_request_events (request_id, created_at);

alter table public.portal_change_requests enable row level security;
alter table public.portal_change_requests force row level security;
alter table public.portal_change_request_events enable row level security;
alter table public.portal_change_request_events force row level security;

revoke all on table public.portal_change_requests, public.portal_change_request_events from public, anon, authenticated;
grant select on table public.portal_change_requests, public.portal_change_request_events to authenticated;
grant select, insert, update on table public.portal_change_requests, public.portal_change_request_events to service_role;

drop policy if exists portal_change_requests_owner_select on public.portal_change_requests;
create policy portal_change_requests_owner_select on public.portal_change_requests
  for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()));

drop policy if exists portal_change_request_events_owner_select on public.portal_change_request_events;
create policy portal_change_request_events_owner_select on public.portal_change_request_events
  for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()));

-- Owner submits a request. Raises portal_not_owner / portal_bad_input / portal_rate_limited. Returns the new id.
create or replace function public.portal_create_change_request(p_page text, p_request_text text, p_photo_path text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if p_page is null or p_page not in ('home', 'about', 'courses', 'trainers', 'contact', 'other')
     or p_request_text is null or char_length(btrim(p_request_text)) not between 5 and 2000
     or (p_photo_path is not null and p_photo_path !~ (
       '^' || v_tenant || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'))
  then raise exception 'portal_bad_input'; end if;
  if (select count(*) from public.portal_change_requests as r
      where r.tenant_slug = v_tenant and r.created_at > now() - interval '1 day') >= 50 then
    raise exception 'portal_rate_limited';
  end if;
  insert into public.portal_change_requests (tenant_slug, page, request_text, photo_path, created_by, updated_by)
    values (v_tenant, p_page, btrim(p_request_text), p_photo_path, v_uid, v_uid)
    returning id into v_id;
  insert into public.portal_change_request_events (request_id, tenant_slug, action, from_status, to_status, actor_kind, actor_id, actor_aal)
    values (v_id, v_tenant, 'submit', null, 'submitted', 'owner', v_uid, 'aal2');
  return v_id;
end $$;
revoke all on function public.portal_create_change_request(text, text, text) from public, anon;
grant execute on function public.portal_create_change_request(text, text, text) to authenticated;

-- Owner approves a waiting preview. Only from preview_ready. Row lock so two clicks cannot both pass the check.
create or replace function public.portal_approve_change_request(p_request_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_status text;
  v_preview text;
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  select r.status, r.preview_url into v_status, v_preview from public.portal_change_requests as r
    where r.id = p_request_id and r.tenant_slug = v_tenant for update;
  if not found then raise exception 'portal_not_found'; end if;
  if v_status <> 'preview_ready' or v_preview is null then raise exception 'portal_wrong_status'; end if;
  update public.portal_change_requests as r
    set status = 'approved', approved_at = now(), approved_by = v_uid, updated_at = now(), updated_by = v_uid
    where r.id = p_request_id;
  insert into public.portal_change_request_events (request_id, tenant_slug, action, from_status, to_status, actor_kind, actor_id, actor_aal)
    values (p_request_id, v_tenant, 'approve', 'preview_ready', 'approved', 'owner', v_uid, 'aal2');
  return 'approved';
end $$;
revoke all on function public.portal_approve_change_request(uuid) from public, anon;
grant execute on function public.portal_approve_change_request(uuid) to authenticated;

-- Owner asks for edits on a waiting preview. Sends it back to in_progress with her note.
create or replace function public.portal_ask_for_change_edits(p_request_id uuid, p_note text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if p_note is null or char_length(btrim(p_note)) not between 1 and 1000 then raise exception 'portal_bad_input'; end if;
  select r.status into v_status from public.portal_change_requests as r
    where r.id = p_request_id and r.tenant_slug = v_tenant for update;
  if not found then raise exception 'portal_not_found'; end if;
  if v_status <> 'preview_ready' then raise exception 'portal_wrong_status'; end if;
  update public.portal_change_requests as r
    set status = 'in_progress', edit_note = btrim(p_note), updated_at = now(), updated_by = v_uid
    where r.id = p_request_id;
  insert into public.portal_change_request_events (request_id, tenant_slug, action, from_status, to_status, actor_kind, actor_id, actor_aal, note)
    values (p_request_id, v_tenant, 'ask_for_edits', 'preview_ready', 'in_progress', 'owner', v_uid, 'aal2', btrim(p_note));
  return 'in_progress';
end $$;
revoke all on function public.portal_ask_for_change_edits(uuid, text) from public, anon;
grant execute on function public.portal_ask_for_change_edits(uuid, text) to authenticated;

-- Team side (service_role only): start, preview, publish, reject, roll_back. Same transition table as state.ts.
-- Nothing in this PR calls it; the future publisher does, after Phill approves the first production publish.
create or replace function public.portal_team_advance_change_request(p_request_id uuid, p_action text, p_preview_url text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_from text;
  v_tenant text;
  v_to text;
begin
  select r.status, r.tenant_slug into v_from, v_tenant from public.portal_change_requests as r where r.id = p_request_id for update;
  if not found then raise exception 'portal_not_found'; end if;
  v_to := case
    when p_action = 'start' and v_from = 'submitted' then 'in_progress'
    when p_action = 'preview' and v_from = 'in_progress' then 'preview_ready'
    when p_action = 'publish' and v_from = 'approved' then 'published'
    when p_action = 'roll_back' and v_from = 'published' then 'rolled_back'
    when p_action = 'reject' and v_from in ('submitted', 'in_progress', 'preview_ready') then 'rejected'
  end;
  if v_to is null then raise exception 'portal_wrong_status'; end if;
  if p_action = 'preview' and (p_preview_url is null or p_preview_url !~ '^https://[^[:space:]]+$' or char_length(p_preview_url) > 500) then
    raise exception 'portal_bad_input';
  end if;
  update public.portal_change_requests as r set
    status = v_to,
    preview_url = case when p_action = 'preview' then p_preview_url else r.preview_url end,
    published_at = case when v_to = 'published' then now() else r.published_at end,
    rolled_back_at = case when v_to = 'rolled_back' then now() else r.rolled_back_at end,
    updated_at = now(), updated_by = null
    where r.id = p_request_id;
  insert into public.portal_change_request_events (request_id, tenant_slug, action, from_status, to_status, actor_kind)
    values (p_request_id, v_tenant, p_action, v_from, v_to, 'team');
  return v_to;
end $$;
revoke all on function public.portal_team_advance_change_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.portal_team_advance_change_request(uuid, text, text) to service_role;
