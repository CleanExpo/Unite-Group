-- SYN-525: post_performance_metrics table
-- Stores per-post metric values written by the GA4 / social analytics sync pipeline.
-- The sync-post-performance API reads from this table to compute 30-day rolling averages.

create table if not exists post_performance_metrics (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references profiles(id) on delete cascade,
  post_id         text not null,
  posted_at       timestamptz not null,
  platform        text not null,
  metric          text not null check (metric in ('reach', 'engagement_rate', 'click_through', 'saves', 'impressions')),
  metric_value    numeric not null,
  synced_at       timestamptz not null default now(),
  unique (client_id, post_id, metric)
);

create index if not exists post_performance_metrics_client_metric_posted_at
  on post_performance_metrics (client_id, metric, posted_at desc);

-- RLS: clients can only read their own rows; sync pipeline uses service role
alter table post_performance_metrics enable row level security;

create policy "clients read own metrics"
  on post_performance_metrics for select
  using (auth.uid() = client_id);
