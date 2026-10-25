-- FOUNDER-GATED: apply to production only under the founder's break-glass approval, and only after it has
-- been proven on a Supabase database branch (never directly on prod).
-- Extra-business add-on for card_orders (UNI-2996): A$199 each, 1 to 5, bought as its own Payment Link with
-- adjustable quantity. The Stripe webhook records it as tier 'extra_business' with the quantity bought.
-- Tier orders do not send quantity, so they keep inserting whether or not this migration has been applied.
-- Until this migration is applied, add-on orders fail to insert, the webhook answers 500 and Stripe retries.
-- So apply it before setting STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID. Tier orders are unaffected.
-- Rollback: forward-only. Delete any extra_business rows, then restore the two-tier check and drop quantity
-- in a reviewed forward migration so the ledger stays truthful.

alter table public.card_orders add column if not exists quantity integer not null default 1;

-- The original inline check on tier carries Postgres's default name; replace it with the three-tier list.
alter table public.card_orders drop constraint if exists card_orders_tier_check;
alter table public.card_orders
  add constraint card_orders_tier_check check (tier in ('ready', 'custom', 'extra_business'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.card_orders'::regclass and conname = 'card_orders_quantity_check'
  ) then
    alter table public.card_orders
      add constraint card_orders_quantity_check check (
        (tier in ('ready', 'custom') and quantity = 1)
        or (tier = 'extra_business' and quantity between 1 and 5)
      );
  end if;
end $$;
