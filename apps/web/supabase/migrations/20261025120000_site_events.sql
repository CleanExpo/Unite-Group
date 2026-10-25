-- FOUNDER-GATED: apply to production only with founder approval
-- First-party, privacy-respecting analytics for the public site (unite-group.in), UNI-3001.
--
-- What a row is: one page view, click, video play or similar. It holds the page path (no query
-- string), the referring HOST only, utm_* campaign tags, a random per-tab session id, a coarse
-- device class and a two-letter country. It holds NO IP address, NO user agent, NO cookie value
-- and NO user id. The session id is generated in the browser per tab and is not a person.
--
-- Writes: only POST /api/events, through the service role. There is no anon or authenticated
-- INSERT/UPDATE/DELETE policy and the table is FORCE ROW LEVEL SECURITY.
-- Reads: service_role only. There is deliberately NO select policy for authenticated users: the repo
-- has no SQL-level founder identity (no founders / allow-list table; founder_id lives on data rows, and
-- this table has none), and card_owners is not a founder list. The founder page reads through the
-- service client behind the app-level hasPrivateAccess check (FOUNDER_ALLOWED_USER_IDS).
--
-- RETENTION: 13 months. site_events_purge() deletes older rows; it is service_role only. Vercel team
-- crons are stopped, so nothing here is scheduled. The app calls it opportunistically (throttled to once
-- per 6 hours per server instance) after a stored event and on each founder analytics page load
-- (src/lib/analytics/site-events-retention.ts). That runs while the site is in use; a fully idle site
-- runs no purge. The privacy policy wording is limited to exactly that.
-- Rollback: additive only (one table, three functions). Removal needs a reviewed forward migration.

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event_type text not null check (
    event_type in ('page_view', 'cta_click', 'video_play', 'video_complete', 'card_view', 'form_submit', 'outbound_click')
  ),
  path text not null check (char_length(path) between 1 and 512),
  label text check (label is null or char_length(label) <= 120),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  session_id text check (session_id is null or char_length(session_id) <= 64),
  device text check (device is null or device in ('mobile', 'tablet', 'desktop', 'unknown')),
  country text check (country is null or country ~ '^[A-Z]{2}$')
);

create index if not exists site_events_occurred_at_idx on public.site_events (occurred_at);
create index if not exists site_events_type_occurred_at_idx on public.site_events (event_type, occurred_at);
create index if not exists site_events_path_idx on public.site_events (path);

alter table public.site_events enable row level security;
alter table public.site_events force row level security;

revoke all on table public.site_events from public, anon, authenticated;
grant select, insert, delete on table public.site_events to service_role;

-- Counts by Brisbane calendar day and event type, from p_from (inclusive) to p_to (exclusive).
-- SECURITY INVOKER and executable by service_role only.
create or replace function public.site_events_daily(p_from timestamptz, p_to timestamptz)
returns table (day date, event_type text, events bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (e.occurred_at at time zone 'Australia/Brisbane')::date as day, e.event_type, count(*)::bigint as events
  from public.site_events as e
  where e.occurred_at >= p_from and e.occurred_at < p_to
  group by 1, 2
  order by 1, 2;
$$;

-- Ranked breakdowns for the founder dashboard, top 10 per dimension:
--   page (page_view by path), cta (cta_click by label), video (video_play / video_complete by label),
--   referrer (page_view by referrer host), device (page_view by device class).
create or replace function public.site_events_breakdown(p_from timestamptz, p_to timestamptz)
returns table (dimension text, key text, event_type text, events bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped as (
    select * from public.site_events where occurred_at >= p_from and occurred_at < p_to
  ),
  pages as (
    select 'page'::text as dimension, path as key, event_type, count(*)::bigint as events
    from scoped where event_type = 'page_view' group by path, event_type order by 4 desc limit 10
  ),
  ctas as (
    select 'cta'::text, coalesce(label, '(unlabelled)'), event_type, count(*)::bigint
    from scoped where event_type = 'cta_click' group by 2, event_type order by 4 desc limit 10
  ),
  videos as (
    select 'video'::text, coalesce(label, '(unlabelled)'), event_type, count(*)::bigint
    from scoped where event_type in ('video_play', 'video_complete') group by 2, event_type
  ),
  referrers as (
    select 'referrer'::text, referrer_host, event_type, count(*)::bigint
    from scoped where event_type = 'page_view' and referrer_host is not null
    group by referrer_host, event_type order by 4 desc limit 10
  ),
  devices as (
    select 'device'::text, coalesce(device, 'unknown'), event_type, count(*)::bigint
    from scoped where event_type = 'page_view' group by 2, event_type
  )
  select * from pages
  union all select * from ctas
  union all select * from videos
  union all select * from referrers
  union all select * from devices;
$$;

-- Retention: delete rows older than 13 months. service_role only; not scheduled by this migration.
create or replace function public.site_events_purge()
returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  removed bigint;
begin
  delete from public.site_events where occurred_at < now() - interval '13 months';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.site_events_daily(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.site_events_breakdown(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.site_events_purge() from public, anon, authenticated;
grant execute on function public.site_events_daily(timestamptz, timestamptz) to service_role;
grant execute on function public.site_events_breakdown(timestamptz, timestamptz) to service_role;
grant execute on function public.site_events_purge() to service_role;
