-- FOUNDER-GATED: NOT applied to any database. Apply only through a reviewed, approved branch, after the portal
-- migrations 20261102180000 .. 20261103120000 (portal_owner_tenant_slug from membership).
-- Proven on a throwaway Postgres only: scripts/portal-project-db-proof.sh (supabase/tests/portal_projects_proof.sql).
--
-- Client project loop (Mission Control client view, CCW first). Additive only. Tables keep the portal_ prefix so the
-- restrictive staff_only_gate of 20261104040000 does not apply to them (clients must read their own rows).
--  1. portal_projects: one row per client project, owned by one tenant. Health, hold and milestone are staff-written.
--  2. portal_project_items: requirements, defects, questions, milestones, blockers and decisions. The client's
--     original text is kept unchanged (client_text is immutable). author_kind labels bot-written text. The lifecycle
--     has 14 states; release states (approved_for_release, deployed, production_verified, done) are team-only and
--     need evidence. cc_task_id links the item to the authoritative cc_tasks row (one task per item).
--  3. portal_project_item_events: append-only audit log, one row per change (actor, aal, time, note).
-- RLS forced. Owners read only their own tenant's rows, only at aal2 (portal_owner_tenant_slug()), and only
-- client-safe columns; the event log is not client-readable. Nobody but the functions below and service_role writes.
-- A production hold blocks approved_for_release and deployed; each release step needs its own evidence.
-- Named limits (independent review of 8de2650c, 19/11/2026), not fixed here:
--   * team events carry no actor id: service_role calls have no user. The release approver is free text in the note.
--   * service_role can UPDATE items directly and skip the state machine; only the functions are the intended path.
--   * the bridge retries the oldest 100 unlinked items; more than 100 permanent failures would starve newer ones.
--   * a person forwarding someone else's Telegram message is labelled client_human (labelling only; no approval). A client may only answer an item that is awaiting_client_review; client
-- acceptance moves it to client_accepted and never to a release state.
-- Re-appliable: if not exists / create or replace / drop-and-recreate policies.
-- Rollback (a reviewed forward migration): drop the six functions portal_submit_project_request,
--   portal_respond_to_project_item, portal_team_advance_project_item, portal_team_link_project_task,
--   portal_team_record_project_signal, portal_project_items_freeze_client_text, then drop the three tables
--   portal_project_item_events, portal_project_items, portal_projects. No other table is touched.

create table if not exists public.portal_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  slug text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  objective text check (objective is null or char_length(objective) <= 2000),
  health text not null default 'unknown' check (health in ('on_track', 'at_risk', 'blocked', 'on_hold', 'unknown')),
  health_reason text check (health_reason is null or char_length(health_reason) <= 1000),
  production_hold boolean not null default false,
  hold_reason text check (hold_reason is null or char_length(hold_reason) <= 1000),
  current_milestone text check (current_milestone is null or char_length(current_milestone) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_projects_tenant_slug_key unique (tenant_slug, slug),
  constraint portal_projects_id_tenant_key unique (id, tenant_slug),
  constraint portal_projects_hold_has_reason check (not production_hold or hold_reason is not null)
);

create table if not exists public.portal_project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  tenant_slug text not null,
  kind text not null check (kind in ('requirement', 'defect', 'question', 'milestone', 'blocker', 'decision')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  client_text text check (client_text is null or char_length(client_text) <= 4000),
  plain_summary text check (plain_summary is null or char_length(plain_summary) <= 2000),
  summary_is_ai_proposal boolean not null default false,
  state text not null default 'proposed' check (state in (
    'proposed', 'clarification_required', 'approved_scope', 'ready_for_development', 'in_development', 'in_testing',
    'technically_verified', 'awaiting_client_review', 'client_accepted', 'approved_for_release', 'deployed',
    'production_verified', 'done', 'blocked')),
  waiting_on text not null default 'unite' check (waiting_on in ('client', 'unite', 'third_party', 'none')),
  source text not null check (source in ('portal', 'telegram', 'email', 'agent', 'ci', 'staff')),
  source_ref text check (source_ref is null or char_length(source_ref) <= 200),
  author_kind text not null check (author_kind in ('client_human', 'client_bot', 'staff', 'agent')),
  submitted_by uuid references auth.users(id) on delete set null,
  idempotency_key text check (idempotency_key is null or idempotency_key ~ '^[A-Za-z0-9_-]{8,64}$'),
  cc_task_id uuid,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  -- Clients read the count, never the raw evidence entries (column grants below).
  evidence_count integer generated always as (jsonb_array_length(evidence)) stored,
  blocker_reason text check (blocker_reason is null or char_length(blocker_reason) <= 1000),
  decision_needed text check (decision_needed is null or char_length(decision_needed) <= 1000),
  forecast_window text check (forecast_window is null or char_length(forecast_window) <= 120),
  forecast_confidence text check (forecast_confidence is null or forecast_confidence in ('low', 'medium', 'high')),
  forecast_basis text check (forecast_basis is null or char_length(forecast_basis) <= 1000),
  forecast_updated_at timestamptz,
  client_note text check (client_note is null or char_length(client_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_project_items_project_fk foreign key (project_id, tenant_slug)
    references public.portal_projects (id, tenant_slug) on delete restrict,
  constraint portal_project_items_idem_key unique (tenant_slug, idempotency_key),
  constraint portal_project_items_source_key unique (tenant_slug, source, source_ref),
  -- A forecast is shown only with its basis, confidence and date. Without them the page says "estimate not verified".
  constraint portal_project_items_forecast_complete check (forecast_window is null
    or (forecast_basis is not null and forecast_confidence is not null and forecast_updated_at is not null)),
  -- Verified, review and release states carry at least one evidence entry.
  constraint portal_project_items_evidence_for_verified check (state not in (
    'technically_verified', 'awaiting_client_review', 'client_accepted', 'approved_for_release', 'deployed',
    'production_verified', 'done') or jsonb_array_length(evidence) > 0),
  constraint portal_project_items_blocked_has_reason check (state <> 'blocked' or blocker_reason is not null),
  constraint portal_project_items_portal_is_human check (source <> 'portal' or author_kind = 'client_human')
);

create table if not exists public.portal_project_item_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portal_project_items(id) on delete restrict,
  tenant_slug text not null,
  action text not null check (action in ('submit', 'record_signal', 'advance', 'accept', 'request_changes', 'link_task')),
  from_state text,
  to_state text not null,
  actor_kind text not null check (actor_kind in ('owner', 'team')),
  actor_id uuid,
  actor_aal text check (actor_aal is null or actor_aal in ('aal1', 'aal2')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists portal_project_items_project_idx on public.portal_project_items (project_id, updated_at desc);
create index if not exists portal_project_items_tenant_created_idx on public.portal_project_items (tenant_slug, created_at desc);
create index if not exists portal_project_item_events_item_idx on public.portal_project_item_events (item_id, created_at);
-- One authoritative task per item, enforced by the database, not only by the bridge.
create unique index if not exists portal_project_items_cc_task_key on public.portal_project_items (cc_task_id) where cc_task_id is not null;

-- The client's original words never change after they are recorded.
create or replace function public.portal_project_items_freeze_client_text()
returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.client_text is distinct from old.client_text
     or new.author_kind is distinct from old.author_kind
     or new.source is distinct from old.source
     or new.source_ref is distinct from old.source_ref
     or new.tenant_slug is distinct from old.tenant_slug then
    raise exception 'portal_source_immutable';
  end if;
  return new;
end $$;
drop trigger if exists portal_project_items_freeze_client_text on public.portal_project_items;
create trigger portal_project_items_freeze_client_text before update on public.portal_project_items
  for each row execute function public.portal_project_items_freeze_client_text();

alter table public.portal_projects enable row level security;
alter table public.portal_projects force row level security;
alter table public.portal_project_items enable row level security;
alter table public.portal_project_items force row level security;
alter table public.portal_project_item_events enable row level security;
alter table public.portal_project_item_events force row level security;

revoke all on table public.portal_projects, public.portal_project_items, public.portal_project_item_events
  from public, anon, authenticated;
-- Clients read only client-safe columns. Internal fields (cc_task_id, raw evidence, source_ref, submitted_by) and the
-- event log (team notes, task ids) are not readable by authenticated at all, even through the API directly.
grant select on table public.portal_projects to authenticated;
grant select (id, project_id, tenant_slug, kind, title, client_text, plain_summary, summary_is_ai_proposal, state,
  waiting_on, source, author_kind, idempotency_key, evidence_count, blocker_reason, decision_needed, forecast_window,
  forecast_confidence, forecast_basis, forecast_updated_at, client_note, created_at, updated_at)
  on table public.portal_project_items to authenticated;
grant select, insert, update on table public.portal_projects, public.portal_project_items to service_role;
grant select, insert on table public.portal_project_item_events to service_role;

drop policy if exists portal_projects_owner_select on public.portal_projects;
create policy portal_projects_owner_select on public.portal_projects
  for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()));
drop policy if exists portal_project_items_owner_select on public.portal_project_items;
create policy portal_project_items_owner_select on public.portal_project_items
  for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()));
drop policy if exists portal_project_item_events_owner_select on public.portal_project_item_events;

-- Owner submits a request. Raises portal_not_owner / portal_bad_input / portal_not_found / portal_rate_limited.
-- Idempotent on (tenant, p_idempotency_key): a retry with the same key returns the first item and writes nothing.
create or replace function public.portal_submit_project_request(p_project_slug text, p_text text, p_idempotency_key text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_project uuid;
  v_id uuid;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if char_length(v_text) not between 5 and 4000
     or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,64}$'
     or p_project_slug is null or p_project_slug !~ '^[a-z0-9-]{1,64}$'
  then raise exception 'portal_bad_input'; end if;
  select p.id into v_project from public.portal_projects as p where p.tenant_slug = v_tenant and p.slug = p_project_slug;
  if not found then raise exception 'portal_not_found'; end if;
  select i.id into v_id from public.portal_project_items as i
    where i.tenant_slug = v_tenant and i.idempotency_key = p_idempotency_key;
  if found then
    -- A true retry carries the same words for the same project. Anything else is a client bug, not a retry.
    if not exists (select 1 from public.portal_project_items as i
                   where i.id = v_id and i.project_id = v_project and i.client_text = v_text) then
      raise exception 'portal_idempotency_conflict';
    end if;
    return v_id;
  end if;
  if (select count(*) from public.portal_project_items as i
      where i.tenant_slug = v_tenant and i.source = 'portal' and i.created_at > now() - interval '1 day') >= 50 then
    raise exception 'portal_rate_limited';
  end if;
  insert into public.portal_project_items (project_id, tenant_slug, kind, title, client_text, state, waiting_on,
      source, author_kind, submitted_by, idempotency_key)
    values (v_project, v_tenant, 'requirement', left(split_part(v_text, E'\n', 1), 200), v_text, 'proposed', 'unite',
      'portal', 'client_human', v_uid, p_idempotency_key)
    on conflict (tenant_slug, idempotency_key) do nothing
    returning id into v_id;
  if v_id is null then -- a concurrent retry with the same key won the insert
    select i.id into v_id from public.portal_project_items as i
      where i.tenant_slug = v_tenant and i.idempotency_key = p_idempotency_key;
    return v_id;
  end if;
  insert into public.portal_project_item_events (item_id, tenant_slug, action, from_state, to_state, actor_kind, actor_id, actor_aal)
    values (v_id, v_tenant, 'submit', null, 'proposed', 'owner', v_uid, 'aal2');
  return v_id;
end $$;
revoke all on function public.portal_submit_project_request(text, text, text) from public, anon;
grant execute on function public.portal_submit_project_request(text, text, text) to authenticated;

-- Owner answers an item waiting on review. accept -> client_accepted. request_changes -> clarification_required
-- (note required). Only from awaiting_client_review. Client acceptance is NOT release approval.
create or replace function public.portal_respond_to_project_item(p_item_id uuid, p_verdict text, p_note text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tenant text := public.portal_owner_tenant_slug();
  v_uid uuid := auth.uid();
  v_state text;
  v_to text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;
  if p_verdict is null or p_verdict not in ('accept', 'request_changes')
     or (v_note is not null and char_length(v_note) > 1000)
     or (p_verdict = 'request_changes' and v_note is null)
  then raise exception 'portal_bad_input'; end if;
  select i.state into v_state from public.portal_project_items as i
    where i.id = p_item_id and i.tenant_slug = v_tenant for update;
  if not found then raise exception 'portal_not_found'; end if;
  if v_state <> 'awaiting_client_review' then raise exception 'portal_wrong_status'; end if;
  v_to := case p_verdict when 'accept' then 'client_accepted' else 'clarification_required' end;
  update public.portal_project_items as i
    set state = v_to, waiting_on = 'unite', client_note = v_note, updated_at = now()
    where i.id = p_item_id;
  insert into public.portal_project_item_events (item_id, tenant_slug, action, from_state, to_state, actor_kind, actor_id, actor_aal, note)
    values (p_item_id, v_tenant, p_verdict, v_state, v_to, 'owner', v_uid, 'aal2', v_note);
  return v_to;
end $$;
revoke all on function public.portal_respond_to_project_item(uuid, text, text) from public, anon;
grant execute on function public.portal_respond_to_project_item(uuid, text, text) to authenticated;

-- Team side (service_role only). One transition table. The team can never set client_accepted (only the client can),
-- and approved_for_release needs a note naming who approved the release. Evidence entries are appended, never replaced.
create or replace function public.portal_team_advance_project_item(
  p_item_id uuid, p_to_state text, p_note text default null, p_evidence jsonb default null, p_blocker_reason text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_from text;
  v_tenant text;
  v_ok boolean;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_evidence is not null and (jsonb_typeof(p_evidence) <> 'array' or jsonb_array_length(p_evidence) = 0) then
    raise exception 'portal_bad_input';
  end if;
  select i.state, i.tenant_slug into v_from, v_tenant from public.portal_project_items as i where i.id = p_item_id for update;
  if not found then raise exception 'portal_not_found'; end if;
  v_ok := case
    when v_from in ('proposed', 'clarification_required') then p_to_state in ('proposed', 'clarification_required', 'approved_scope', 'blocked')
    when v_from = 'approved_scope' then p_to_state in ('ready_for_development', 'clarification_required', 'blocked')
    when v_from = 'ready_for_development' then p_to_state in ('in_development', 'blocked')
    when v_from = 'in_development' then p_to_state in ('in_testing', 'blocked')
    when v_from = 'in_testing' then p_to_state in ('technically_verified', 'in_development', 'blocked')
    when v_from = 'technically_verified' then p_to_state in ('awaiting_client_review', 'in_development', 'blocked')
    when v_from = 'awaiting_client_review' then p_to_state in ('in_development')
    when v_from = 'client_accepted' then p_to_state in ('approved_for_release', 'in_development')
    when v_from = 'approved_for_release' then p_to_state in ('deployed')
    when v_from = 'deployed' then p_to_state in ('production_verified', 'in_development')
    when v_from = 'production_verified' then p_to_state in ('done')
    when v_from = 'blocked' then p_to_state in ('proposed', 'approved_scope', 'ready_for_development', 'in_development', 'in_testing')
    else false
  end;
  if not coalesce(v_ok, false) or v_from = p_to_state then raise exception 'portal_wrong_status'; end if;
  if p_to_state = 'approved_for_release' and v_note is null then raise exception 'portal_bad_input'; end if;
  -- Each release step brings its own evidence (deploy record, post-release check, close-out), never the review's.
  if p_to_state in ('deployed', 'production_verified', 'done') and p_evidence is null then raise exception 'portal_bad_input'; end if;
  -- A production hold stops release in the database, not only on the page.
  if p_to_state in ('approved_for_release', 'deployed') and exists (
       select 1 from public.portal_project_items as i join public.portal_projects as p on p.id = i.project_id
       where i.id = p_item_id and p.production_hold) then
    raise exception 'portal_production_hold';
  end if;
  if p_to_state = 'blocked' and nullif(btrim(coalesce(p_blocker_reason, '')), '') is null then raise exception 'portal_bad_input'; end if;
  update public.portal_project_items as i set
    state = p_to_state,
    evidence = case when p_evidence is null then i.evidence else i.evidence || p_evidence end,
    blocker_reason = case when p_to_state = 'blocked' then btrim(p_blocker_reason) else null end,
    waiting_on = case when p_to_state in ('awaiting_client_review', 'clarification_required') then 'client'
                      when p_to_state = 'done' then 'none' else 'unite' end,
    updated_at = now()
    where i.id = p_item_id;
  insert into public.portal_project_item_events (item_id, tenant_slug, action, from_state, to_state, actor_kind, note)
    values (p_item_id, v_tenant, 'advance', v_from, p_to_state, 'team', v_note);
  return p_to_state;
end $$;
revoke all on function public.portal_team_advance_project_item(uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.portal_team_advance_project_item(uuid, text, text, jsonb, text) to service_role;

-- Team side: link an item to its authoritative cc_tasks row. Set once; re-linking the same task is a no-op.
create or replace function public.portal_team_link_project_task(p_item_id uuid, p_task_id uuid)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_current uuid;
  v_tenant text;
  v_state text;
begin
  if p_task_id is null then raise exception 'portal_bad_input'; end if;
  select i.cc_task_id, i.tenant_slug, i.state into v_current, v_tenant, v_state
    from public.portal_project_items as i where i.id = p_item_id for update;
  if not found then raise exception 'portal_not_found'; end if;
  if v_current = p_task_id then return v_current; end if;
  if v_current is not null then raise exception 'portal_already_linked'; end if;
  update public.portal_project_items as i set cc_task_id = p_task_id, updated_at = now() where i.id = p_item_id;
  insert into public.portal_project_item_events (item_id, tenant_slug, action, from_state, to_state, actor_kind, note)
    values (p_item_id, v_tenant, 'link_task', v_state, v_state, 'team', p_task_id::text);
  return p_task_id;
end $$;
revoke all on function public.portal_team_link_project_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.portal_team_link_project_task(uuid, uuid) to service_role;

-- Team side: record a message that arrived outside the portal (Telegram, email, agent, CI). The original text is
-- kept, the author kind says whether a person or a bot wrote it, and (tenant, source, source_ref) makes a repeat a
-- no-op. It always lands as proposed: a message is data, never an approval.
create or replace function public.portal_team_record_project_signal(
  p_tenant_slug text, p_project_slug text, p_source text, p_source_ref text, p_author_kind text, p_kind text, p_text text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_project uuid;
  v_id uuid;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if p_source is null or p_source not in ('telegram', 'email', 'agent', 'ci', 'staff')
     or p_source_ref is null or char_length(p_source_ref) not between 1 and 200
     or p_author_kind is null or p_author_kind not in ('client_human', 'client_bot', 'staff', 'agent')
     or p_kind is null or p_kind not in ('requirement', 'defect', 'question', 'blocker', 'decision')
     or char_length(v_text) not between 1 and 4000
  then raise exception 'portal_bad_input'; end if;
  select p.id into v_project from public.portal_projects as p where p.tenant_slug = p_tenant_slug and p.slug = p_project_slug;
  if not found then raise exception 'portal_not_found'; end if;
  insert into public.portal_project_items (project_id, tenant_slug, kind, title, client_text, state, waiting_on,
      source, source_ref, author_kind)
    values (v_project, p_tenant_slug, p_kind, left(split_part(v_text, E'\n', 1), 200), v_text, 'proposed', 'unite',
      p_source, p_source_ref, p_author_kind)
    on conflict (tenant_slug, source, source_ref) do nothing
    returning id into v_id;
  if v_id is null then
    select i.id into v_id from public.portal_project_items as i
      where i.tenant_slug = p_tenant_slug and i.source = p_source and i.source_ref = p_source_ref;
    return v_id;
  end if;
  insert into public.portal_project_item_events (item_id, tenant_slug, action, from_state, to_state, actor_kind, note)
    values (v_id, p_tenant_slug, 'record_signal', null, 'proposed', 'team', p_source || ':' || p_author_kind);
  return v_id;
end $$;
revoke all on function public.portal_team_record_project_signal(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.portal_team_record_project_signal(text, text, text, text, text, text, text) to service_role;
