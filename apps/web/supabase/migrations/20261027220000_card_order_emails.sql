-- FOUNDER-GATED: apply to production only under the founder's approval (pasted manually in the Supabase SQL editor).
-- Card follow-up emails (UNI-3057): one row per order per email kind, written by /api/cron/card-follow-up before it
-- sends. UNIQUE(order_id, kind) is what stops a second send: the cron claims the row first, then sends; only a
-- definite Mailtrap rejection (non-2xx) removes the claim so the next run can retry. Until this table exists the cron answers 500 and sends nothing.
-- Rollback: additive table only; removal needs a reviewed forward migration so the ledger stays truthful.

create table if not exists public.card_order_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.card_orders(id) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('intake_reminder', 'review_request')),
  message_id text check (message_id is null or char_length(message_id) <= 200),
  unique (order_id, kind)
);

create index if not exists card_order_emails_founder_idx on public.card_order_emails (founder_id, created_at desc);

alter table public.card_order_emails enable row level security;
alter table public.card_order_emails force row level security;

revoke all on table public.card_order_emails from public, anon, authenticated;
grant select on table public.card_order_emails to authenticated;
grant select, insert, update, delete on table public.card_order_emails to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_order_emails' and policyname = 'card_order_emails_founder_select'
  ) then
    create policy card_order_emails_founder_select on public.card_order_emails
      for select to authenticated using (founder_id = auth.uid());
  end if;
end $$;
