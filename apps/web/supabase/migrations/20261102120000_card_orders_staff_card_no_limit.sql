-- FOUNDER-GATED: apply to production only under the founder's break-glass approval, and only after it has
-- been proven on a Supabase database branch (never directly on prod). Apply after 20261025200000.
-- UNI-3146 (Phill, 02/11/2026): the A$199 add-on is now a staff card with no limit, so the extra_business
-- quantity cap of 5 is removed. The tier id stays 'extra_business' so stored rows and the webhook are unchanged.
-- Without this, a paid order for 6 or more staff cards fails to insert, the webhook answers 500 and Stripe retries.
-- Rollback: forward-only. Restore "quantity between 1 and 5" in a reviewed forward migration once no row exceeds 5.

alter table public.card_orders drop constraint if exists card_orders_quantity_check;
alter table public.card_orders
  add constraint card_orders_quantity_check check (
    (tier in ('ready', 'custom') and quantity = 1)
    or (tier = 'extra_business' and quantity >= 1)
  );
