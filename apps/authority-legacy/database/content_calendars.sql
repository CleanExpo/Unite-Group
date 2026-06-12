-- SYN-521: Content Calendars Table
-- Stores auto-generated weekly content calendars per client

create table if not exists public.content_calendars (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  slots jsonb not null default '[]',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'published', 'archived')),
  generation_cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, week_start)
);

alter table public.content_calendars enable row level security;

create policy "clients_read_own_calendars"
  on public.content_calendars for select
  using (auth.uid() = client_id);

create policy "service_insert_calendars"
  on public.content_calendars for insert
  with check (true);

create policy "service_update_calendars"
  on public.content_calendars for update
  using (true);

create index if not exists content_calendars_client_week
  on public.content_calendars(client_id, week_start desc);
