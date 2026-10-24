-- FOUNDER-GATED: apply to production only under the founder's break-glass approval.
-- Paid living-card orders (UNI-2996 B5). card_orders is written by the Stripe webhook, card_order_intakes
-- by the public /api/cards/intake route; both use the service role (founder_id comes from FOUNDER_USER_ID).
-- The founder may read their own rows; nobody else can read, and nobody outside service_role can write.
-- No card data is stored: Stripe never sends it. The buyer's name and email are the checkout's own.
-- Rollback: additive tables only; removal needs a reviewed forward migration so the ledger stays truthful.

create table if not exists public.card_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  -- client_reference_id from the payment link, else the checkout session id. The thank-you page looks the order up by it.
  reference text not null check (char_length(reference) between 1 and 200),
  stripe_session_id text not null unique check (char_length(stripe_session_id) between 1 and 200),
  stripe_event_id text not null check (char_length(stripe_event_id) between 1 and 200),
  tier text not null check (tier in ('ready', 'custom')),
  customer_name text check (customer_name is null or char_length(customer_name) <= 200),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  amount_total integer not null check (amount_total > 0),
  currency text not null check (currency = 'aud'),
  livemode boolean not null
);

create table if not exists public.card_order_intakes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- unique: one intake per order, so a leaked reference cannot overwrite what the buyer sent
  order_id uuid not null unique references public.card_orders(id) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 120 and name ~ '[^[:space:]]'),
  business text check (business is null or char_length(business) <= 120),
  email text not null check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  where_met text check (where_met is null or char_length(where_met) <= 500)
);

create index if not exists card_orders_reference_idx on public.card_orders (reference);
create index if not exists card_orders_founder_created_idx on public.card_orders (founder_id, created_at desc);
create index if not exists card_order_intakes_founder_idx on public.card_order_intakes (founder_id);

alter table public.card_orders enable row level security;
alter table public.card_orders force row level security;
alter table public.card_order_intakes enable row level security;
alter table public.card_order_intakes force row level security;

revoke all on table public.card_orders from public, anon, authenticated;
revoke all on table public.card_order_intakes from public, anon, authenticated;
grant select on table public.card_orders, public.card_order_intakes to authenticated;
grant select, insert on table public.card_orders, public.card_order_intakes to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_orders' and policyname = 'card_orders_founder_select'
  ) then
    create policy card_orders_founder_select on public.card_orders
      for select to authenticated using (founder_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_order_intakes' and policyname = 'card_order_intakes_founder_select'
  ) then
    create policy card_order_intakes_founder_select on public.card_order_intakes
      for select to authenticated using (founder_id = auth.uid());
  end if;
end $$;
