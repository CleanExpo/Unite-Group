-- FOUNDER-GATED: apply to production only with founder approval
-- Self-improving design loop for living cards and client sites (UNI-3017).
-- design_events: one row per client design event (template chosen, fields edited, proof approved or
-- rejected, with an optional reason). design_lessons: weekly ranked snapshots built from those events by
-- /api/cron/design-lessons (dormant until DESIGN_LESSONS_LIVE=1).
-- Writes: service_role only (POST /api/founder/design-events and the cron). founder_id is the session
-- founder / FOUNDER_USER_ID, never client input. Reads: the founder's own rows, or service_role.
-- No contact details are stored: subject is an optional card slug or site key, reason is free text.
-- Rollback: additive tables only; removal needs a reviewed forward migration.

create table if not exists public.design_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  system text not null check (system in ('card', 'site')),
  template text not null check (template ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  action text not null check (action in ('chosen', 'edited', 'approved', 'rejected')),
  edits text[] not null default '{}' check (cardinality(edits) <= 20),
  reason text check (reason is null or char_length(reason) <= 500),
  subject text check (subject is null or subject ~ '^[a-z0-9-]{1,64}$')
);

create table if not exists public.design_lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  event_count integer not null check (event_count >= 0),
  lessons jsonb not null check (jsonb_typeof(lessons) = 'array' and octet_length(lessons::text) <= 200000)
);

create index if not exists design_events_occurred_at_idx on public.design_events (occurred_at desc);
create index if not exists design_events_founder_idx on public.design_events (founder_id, occurred_at desc);
create index if not exists design_lessons_created_at_idx on public.design_lessons (created_at desc);

alter table public.design_events enable row level security;
alter table public.design_events force row level security;
alter table public.design_lessons enable row level security;
alter table public.design_lessons force row level security;

revoke all on table public.design_events from public, anon, authenticated;
revoke all on table public.design_lessons from public, anon, authenticated;
grant select on table public.design_events, public.design_lessons to authenticated;
grant select, insert on table public.design_events, public.design_lessons to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'design_events' and policyname = 'design_events_founder_select'
  ) then
    create policy design_events_founder_select on public.design_events
      for select to authenticated using (founder_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'design_lessons' and policyname = 'design_lessons_founder_select'
  ) then
    create policy design_lessons_founder_select on public.design_lessons
      for select to authenticated using (founder_id = auth.uid());
  end if;
end $$;
