-- FOUNDER-GATED: NOT applied to production. Apply only under the founder's break-glass approval.
-- Proven on a throwaway local Postgres 15 only: supabase/tests/card_review_requests_rls.sql.
-- Living Card review requests, v1 (spec 02/11/2026, sections 2-3). Additive only; stacks on
-- 20261027220000_card_order_emails and 20261030120000_card_order_intakes_payload_delivery (applied 02/11/2026).
--  1. card_profiles.google_place_id: the owner's Google Place ID. Format check only; the review URL is derived, never stored.
--     Anon may read it (it ends up in a public link anyway); the owner may set it through the existing owner policy.
--  2. card_review_requests: one row per owner-sent request. We send nothing: channels are the owner's own phone/email/share.
--     The raw contact is never stored for owner_* channels, only a sha256 (recipient_hash) for dedupe and opt-out.
--     One request per recipient per card per day (Australia/Sydney), consent timestamp required.
--  3. card_review_optouts: (card, recipient_hash) pairs that must never be asked again.
--  4. card_review_events: tap counts. No IP, no raw user agent, no name or contact.
-- RLS forced on all three tables; owners read their own rows; every write goes through a security-definer function.
-- Re-appliable: if not exists / create or replace / guarded constraints / drop-and-recreate policies.
-- Rollback (reviewed forward migration): drop functions card_log_review_event, card_create_review_request,
--   card_record_review_optout; drop tables card_review_events, card_review_optouts, card_review_requests;
--   alter table card_profiles drop column google_place_id. No other table is touched.

alter table public.card_profiles add column if not exists google_place_id text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'card_profiles_google_place_id_format') then
    alter table public.card_profiles add constraint card_profiles_google_place_id_format
      -- Postgres caps a regex repeat count at 255, so the 300-character limit is a length check, not {10,300}
      check (google_place_id is null or (char_length(google_place_id) <= 300 and google_place_id ~ '^[A-Za-z0-9_-]{10,}$'));
  end if;
end $$;
grant select (google_place_id) on table public.card_profiles to anon;
grant insert (google_place_id), update (google_place_id) on table public.card_profiles to authenticated;

create table if not exists public.card_review_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  card_slug text not null references public.card_owners(card_slug) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete cascade,
  recipient_first_name text not null check (char_length(recipient_first_name) <= 60 and recipient_first_name ~ '[^[:space:]]'),
  channel text not null check (channel in ('owner_sms', 'owner_email', 'owner_share', 'sent_email')),
  recipient_hash text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  -- reserved for a later, separately approved "sent by us" email channel; always null for owner_* channels
  recipient_contact text,
  consent_confirmed_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'drafted' check (status in ('drafted', 'sent', 'failed', 'opted_out')),
  request_day date not null default ((now() at time zone 'Australia/Sydney')::date),
  constraint card_review_requests_contact_only_sent_email
    check (recipient_contact is null or (channel = 'sent_email' and char_length(recipient_contact) <= 254)),
  constraint card_review_requests_one_per_day unique (card_slug, recipient_hash, request_day)
);

create table if not exists public.card_review_optouts (
  card_slug text not null references public.card_owners(card_slug) on delete cascade,
  recipient_hash text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (card_slug, recipient_hash)
);

create table if not exists public.card_review_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  card_slug text not null references public.card_owners(card_slug) on delete cascade,
  kind text not null check (kind in ('button_view', 'review_tap', 'qr_review_open', 'request_link_open')),
  request_id uuid references public.card_review_requests(id) on delete set null,
  ua_class text check (ua_class is null or ua_class in ('mobile', 'desktop', 'other'))
);

create index if not exists card_review_requests_slug_created_idx on public.card_review_requests (card_slug, created_at desc);
create index if not exists card_review_events_slug_created_idx on public.card_review_events (card_slug, created_at desc);

alter table public.card_review_requests enable row level security;
alter table public.card_review_requests force row level security;
alter table public.card_review_optouts enable row level security;
alter table public.card_review_optouts force row level security;
alter table public.card_review_events enable row level security;
alter table public.card_review_events force row level security;

revoke all on table public.card_review_requests, public.card_review_optouts, public.card_review_events from public, anon, authenticated;
-- owners may read; nobody but the functions below (and service_role) may write
grant select on table public.card_review_requests, public.card_review_optouts, public.card_review_events to authenticated;
grant select, insert, update, delete on table public.card_review_requests, public.card_review_optouts, public.card_review_events to service_role;

drop policy if exists card_review_requests_owner_select on public.card_review_requests;
create policy card_review_requests_owner_select on public.card_review_requests
  for select to authenticated using (exists (
    select 1 from public.card_owners as owner
    where owner.card_slug = card_review_requests.card_slug and owner.founder_id = auth.uid()
  ));

drop policy if exists card_review_optouts_owner_select on public.card_review_optouts;
create policy card_review_optouts_owner_select on public.card_review_optouts
  for select to authenticated using (exists (
    select 1 from public.card_owners as owner
    where owner.card_slug = card_review_optouts.card_slug and owner.founder_id = auth.uid()
  ));

drop policy if exists card_review_events_owner_select on public.card_review_events;
create policy card_review_events_owner_select on public.card_review_events
  for select to authenticated using (exists (
    select 1 from public.card_owners as owner
    where owner.card_slug = card_review_events.card_slug and owner.founder_id = auth.uid()
  ));

-- Public tap logging. Security definer so anon can add one event without any table grant. Only for an owned, published
-- card; an unknown request id is dropped rather than trusted; at most 1000 events per card per rolling hour.
-- Returns true only when a row was written.
create or replace function public.card_log_review_event(p_card_slug text, p_kind text, p_request_id uuid, p_ua_class text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_request uuid := null;
begin
  if p_card_slug is null or p_card_slug !~ '^[a-z0-9-]{1,64}$' then return false; end if;
  if p_kind is null or p_kind not in ('button_view', 'review_tap', 'qr_review_open', 'request_link_open') then return false; end if;
  if p_ua_class is not null and p_ua_class not in ('mobile', 'desktop', 'other') then return false; end if;
  if not exists (
    select 1 from public.card_owners as o join public.card_profiles as p on p.card_slug = o.card_slug
    where o.card_slug = p_card_slug and p.published_at is not null
  ) then return false; end if;
  if (select count(*) from public.card_review_events as e
      where e.card_slug = p_card_slug and e.created_at > now() - interval '1 hour') >= 1000 then return false; end if;
  if p_request_id is not null then
    select r.id into v_request from public.card_review_requests as r where r.id = p_request_id and r.card_slug = p_card_slug;
  end if;
  insert into public.card_review_events (card_slug, kind, request_id, ua_class) values (p_card_slug, p_kind, v_request, p_ua_class);
  return true;
end $$;
revoke all on function public.card_log_review_event(text, text, uuid, text) from public;
grant execute on function public.card_log_review_event(text, text, uuid, text) to anon, authenticated, service_role;

-- Owner records a request they are about to send themselves. Raises card_review_not_owner / card_review_consent_required /
-- card_review_bad_input / card_review_rate_limited. Returns (id, 'created'), the existing (id, 'duplicate') for the same
-- recipient on the same day, or (null, 'opted_out'). An advisory lock on the key serialises two racing submits.
create or replace function public.card_create_review_request(
  p_card_slug text, p_first_name text, p_channel text, p_recipient_hash text, p_consent boolean
) returns table (id uuid, outcome text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Australia/Sydney')::date;
  v_id uuid;
begin
  if v_uid is null or not exists (
    select 1 from public.card_owners as o where o.card_slug = p_card_slug and o.founder_id = v_uid
  ) then raise exception 'card_review_not_owner'; end if;
  if p_consent is not true then raise exception 'card_review_consent_required'; end if;
  if p_channel is null or p_channel not in ('owner_sms', 'owner_email', 'owner_share')
     or p_recipient_hash is null or p_recipient_hash !~ '^[0-9a-f]{64}$'
     or p_first_name is null or char_length(p_first_name) > 60 or p_first_name !~ '[^[:space:]]'
  then raise exception 'card_review_bad_input'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_card_slug || E'\x1f' || p_recipient_hash, 0));
  if exists (select 1 from public.card_review_optouts as x where x.card_slug = p_card_slug and x.recipient_hash = p_recipient_hash) then
    return query select null::uuid, 'opted_out'::text;
    return;
  end if;
  select r.id into v_id from public.card_review_requests as r
    where r.card_slug = p_card_slug and r.recipient_hash = p_recipient_hash and r.request_day = v_day;
  if v_id is not null then
    return query select v_id, 'duplicate'::text;
    return;
  end if;
  if (select count(*) from public.card_review_requests as r where r.card_slug = p_card_slug and r.request_day = v_day) >= 200 then
    raise exception 'card_review_rate_limited';
  end if;
  insert into public.card_review_requests as r
      (card_slug, founder_id, recipient_first_name, channel, recipient_hash, consent_confirmed_at, request_day)
    values (p_card_slug, v_uid, p_first_name, p_channel, p_recipient_hash, now(), v_day)
    returning r.id into v_id;
  return query select v_id, 'created'::text;
end $$;
revoke all on function public.card_create_review_request(text, text, text, text, boolean) from public, anon;
grant execute on function public.card_create_review_request(text, text, text, text, boolean) to authenticated;

-- Owner records that a customer asked not to be contacted. Idempotent; marks that customer's requests opted_out.
create or replace function public.card_record_review_optout(p_card_slug text, p_recipient_hash text)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.card_owners as o where o.card_slug = p_card_slug and o.founder_id = auth.uid()
  ) then raise exception 'card_review_not_owner'; end if;
  if p_recipient_hash is null or p_recipient_hash !~ '^[0-9a-f]{64}$' then raise exception 'card_review_bad_input'; end if;
  insert into public.card_review_optouts (card_slug, recipient_hash) values (p_card_slug, p_recipient_hash)
    on conflict on constraint card_review_optouts_pkey do nothing;
  update public.card_review_requests as r set status = 'opted_out'
    where r.card_slug = p_card_slug and r.recipient_hash = p_recipient_hash;
  return true;
end $$;
revoke all on function public.card_record_review_optout(text, text) from public, anon;
grant execute on function public.card_record_review_optout(text, text) to authenticated;
