-- FOUNDER-GATED: apply to production only under the founder's break-glass approval, and only after it has
-- been proven on a Supabase branch (never directly on prod).
-- Card intake payload and delivery state (UNI-2996 B5). The /api/cards/intake route now stores the buyer's whole
-- payload (film, end-of-film contact details, logo link, brief) in the claim row, so a failed alert email never
-- loses a paid buyer's details. The route then sends the alert and records the outcome in delivery_state
-- ('pending' -> 'sent' or 'failed'). Failed rows are found with: select * from card_order_intakes where delivery_state <> 'sent'.
-- Rows that existed before this migration read 'pending' (their alert was never tracked).
-- Apply this BEFORE deploying the route that writes these columns; until then the intake insert fails and the form shows an error.
-- service_role gets column-level UPDATE on the three delivery columns only. No DELETE grant is added. RLS is unchanged.
-- Rollback (forward-only in the ledger; run as a reviewed forward migration so the ledger stays truthful):
--   revoke update (delivery_state, provider_message_id, delivered_at) on table public.card_order_intakes from service_role;
--   alter table public.card_order_intakes
--     drop column if exists film, drop column if exists contact_details, drop column if exists logo_link,
--     drop column if exists brief, drop column if exists delivery_state, drop column if exists provider_message_id,
--     drop column if exists delivered_at;
--   drop index if exists public.card_order_intakes_delivery_state_idx;

alter table public.card_order_intakes
  add column if not exists film text check (film is null or char_length(film) <= 100),
  add column if not exists contact_details text check (contact_details is null or char_length(contact_details) <= 500),
  add column if not exists logo_link text check (logo_link is null or char_length(logo_link) <= 500),
  add column if not exists brief text check (brief is null or char_length(brief) <= 1500),
  add column if not exists delivery_state text not null default 'pending'
    constraint card_order_intakes_delivery_state_check check (delivery_state in ('pending', 'sent', 'failed')),
  add column if not exists provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 200),
  add column if not exists delivered_at timestamptz;

create index if not exists card_order_intakes_delivery_state_idx
  on public.card_order_intakes (created_at desc) where delivery_state <> 'sent';

grant update (delivery_state, provider_message_id, delivered_at) on table public.card_order_intakes to service_role;
