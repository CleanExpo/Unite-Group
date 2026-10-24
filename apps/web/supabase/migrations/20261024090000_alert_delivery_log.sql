-- FOUNDER-GATED: PENDING SANDBOX VERIFICATION.
-- source_id deliberately has no FK: delivery evidence outlives a deleted lead.
-- Rollback: revert code only; keep this additive table and function. Any removal
-- requires a reviewed forward migration so the migration ledger remains truthful.

create table if not exists public.alert_delivery_log (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('new_lead', 'checkout_completed')),
  source_id text not null,
  channel text not null check (channel in ('email')),
  outcome text not null check (outcome in ('pending', 'sent', 'failed', 'unconfigured', 'deduped')),
  dedup_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, source_id, channel)
);

create index if not exists alert_delivery_log_dedup_idx on public.alert_delivery_log (dedup_key, created_at desc)
  where dedup_key is not null;
create index if not exists alert_delivery_log_created_idx on public.alert_delivery_log (created_at desc);
alter table public.alert_delivery_log enable row level security;
alter table public.alert_delivery_log force row level security;

revoke all on table public.alert_delivery_log from public, anon, authenticated;
grant select on table public.alert_delivery_log to authenticated;
grant select, insert, update on table public.alert_delivery_log to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'alert_delivery_log' and policyname = 'alert_delivery_log_founder_select'
  ) then
    create policy alert_delivery_log_founder_select on public.alert_delivery_log
      for select using (founder_id = auth.uid());
  end if;
end $$;

create or replace function public.claim_alert(
  p_founder uuid, p_kind text, p_source_id text, p_dedup_key text, p_window_minutes int
) returns table (channel text)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if p_dedup_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_dedup_key, 0));
    if exists (
      select 1 from public.alert_delivery_log as delivery
      where delivery.founder_id = p_founder and delivery.source_kind = p_kind
        and delivery.source_id <> p_source_id and delivery.dedup_key = p_dedup_key
        and delivery.created_at >= now() - make_interval(mins => p_window_minutes)
        and (delivery.outcome = 'sent' or
          (delivery.outcome = 'pending' and delivery.created_at > now() - interval '15 seconds'))
    ) then
      insert into public.alert_delivery_log (founder_id, source_kind, source_id, channel, outcome, dedup_key)
        values (p_founder, p_kind, p_source_id, 'email', 'deduped', p_dedup_key)
        on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing;
      return;
    end if;
  end if;
  return query
    insert into public.alert_delivery_log as delivery (founder_id, source_kind, source_id, channel, outcome, dedup_key)
      values (p_founder, p_kind, p_source_id, 'email', 'pending', p_dedup_key)
      on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing
      returning delivery.channel;
end $$;

revoke all on function public.claim_alert(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.claim_alert(uuid, text, text, text, int) to service_role;
