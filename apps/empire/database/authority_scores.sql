-- SYN-513: Authority Scores table
create table if not exists public.authority_scores (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  grade text not null check (grade in ('A', 'B', 'C', 'D', 'F')),
  eeat_breakdown jsonb not null,
  top_improvement_action text not null,
  signals_version text not null default '1.0.0',
  computed_at timestamptz not null default now()
);

alter table public.authority_scores enable row level security;

create policy "clients_read_own_scores"
  on public.authority_scores for select
  using (auth.uid() = client_id);

create policy "service_insert_scores"
  on public.authority_scores for insert with check (true);

-- Index for fetching latest score per client
create index if not exists authority_scores_client_computed
  on public.authority_scores(client_id, computed_at desc);
