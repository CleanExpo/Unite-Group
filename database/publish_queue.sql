-- SYN-523: Auto-publish queue
-- Every publish attempt (success or failure) is logged in publish_attempt_log

create table if not exists publish_queue (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  client_id uuid not null references clients(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'linkedin')),
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'publishing', 'published', 'failed', 'held')),
  attempts int not null default 0,
  last_error text,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_publish_queue_pending on publish_queue(scheduled_at)
  where status = 'pending';
create index if not exists idx_publish_queue_failed on publish_queue(updated_at)
  where status = 'failed';
create index if not exists idx_publish_queue_client on publish_queue(client_id, status);

alter table publish_queue enable row level security;
create policy "service_role_all" on publish_queue for all using (true) with check (true);

create table if not exists publish_attempt_log (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references publish_queue(id) on delete cascade,
  client_id uuid not null,
  platform text not null,
  attempt_number int not null,
  status text not null check (status in ('success', 'failure')),
  error_message text,
  response_data jsonb,
  attempted_at timestamptz default now()
);

create index if not exists idx_publish_attempt_log_queue on publish_attempt_log(queue_id);

alter table publish_attempt_log enable row level security;
create policy "service_role_all" on publish_attempt_log for all using (true) with check (true);
