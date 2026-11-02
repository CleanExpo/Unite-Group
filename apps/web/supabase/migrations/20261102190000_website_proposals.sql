-- FOUNDER-GATED: apply to production only under the founder's break-glass approval. Prove on a Supabase branch first.
-- Website System stage 2 (UNI-3173): a proposal for a lead, accepted by paying through Stripe Checkout (test mode only
-- for now) or by redeeming a comp code. Each accepted proposal becomes exactly one website_orders row, and that row IS
-- the idempotent "order paid/comped" event the provisioning job (UNI-3143) consumes: it claims rows where
-- provisioned_at is null. UNI-3141 (entitlements) and UNI-3167 (portal invites) build on these tables; neither exists yet.
-- The client's details are a snapshot, so deleting a lead (privacy erasure) never rewrites what was offered or paid.
-- Public access is service-role only, through a hashed link token. Plain tokens and plain codes are never stored.
-- Rollback: additive tables and one function only; removal needs a reviewed forward migration so the ledger stays truthful.

create table if not exists public.website_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  client_name text not null check (char_length(client_name) between 1 and 200),
  client_business text check (client_business is null or char_length(client_business) <= 200),
  client_email text not null check (char_length(client_email) between 3 and 254),
  plan_id text not null check (char_length(plan_id) between 1 and 64),
  plan_name text not null check (char_length(plan_name) between 1 and 120),
  scope jsonb not null check (jsonb_typeof(scope) = 'array' and jsonb_array_length(scope) between 1 and 30),
  -- What Stripe charges, in AUD cents, including GST. Always read from this row, never from the browser.
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'aud' check (currency = 'aud'),
  billing_interval text check (billing_interval is null or billing_interval = 'month'),
  price_is_placeholder boolean not null default true,
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  expires_at timestamptz not null,
  withdrawn_at timestamptz,
  accepted_at timestamptz,
  accepted_name text check (accepted_name is null or char_length(accepted_name) between 1 and 200),
  stripe_session_id text check (stripe_session_id is null or char_length(stripe_session_id) between 1 and 200)
);

create table if not exists public.website_comp_codes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.website_proposals(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  bound_email text check (bound_email is null or (char_length(bound_email) between 3 and 254 and bound_email = lower(bound_email))),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- One row per redemption, never a single used_by column on the code (the SYN-1278 scar). UNIQUE(code_id) makes it single-use.
create table if not exists public.website_comp_redemptions (
  id uuid primary key default gen_random_uuid(),
  redeemed_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  code_id uuid not null unique references public.website_comp_codes(id) on delete restrict,
  proposal_id uuid not null references public.website_proposals(id) on delete restrict,
  email text not null check (char_length(email) between 3 and 254),
  name text not null check (char_length(name) between 1 and 200)
);

create table if not exists public.website_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  -- unique: one proposal, one order, one provisioning run, however many times anything is retried
  proposal_id uuid not null unique references public.website_proposals(id) on delete restrict,
  source text not null check (source in ('paid', 'comped')),
  stripe_session_id text unique check (stripe_session_id is null or char_length(stripe_session_id) between 1 and 200),
  stripe_event_id text check (stripe_event_id is null or char_length(stripe_event_id) between 1 and 200),
  comp_redemption_id uuid unique references public.website_comp_redemptions(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'aud' check (currency = 'aud'),
  livemode boolean not null,
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  -- Written by the provisioning job (UNI-3143), which owns these two columns.
  provisioning_claimed_at timestamptz,
  provisioned_at timestamptz,
  constraint website_orders_paid_shape check (source <> 'paid' or (stripe_session_id is not null and comp_redemption_id is null and amount_cents > 0)),
  constraint website_orders_comped_shape check (source <> 'comped' or (comp_redemption_id is not null and stripe_session_id is null and amount_cents = 0))
);

create index if not exists website_proposals_founder_created_idx on public.website_proposals (founder_id, created_at desc);
create index if not exists website_proposals_lead_idx on public.website_proposals (lead_id);
create index if not exists website_comp_codes_proposal_idx on public.website_comp_codes (proposal_id);
create index if not exists website_comp_codes_founder_idx on public.website_comp_codes (founder_id);
create index if not exists website_comp_redemptions_proposal_idx on public.website_comp_redemptions (proposal_id);
create index if not exists website_comp_redemptions_founder_idx on public.website_comp_redemptions (founder_id);
create index if not exists website_orders_founder_created_idx on public.website_orders (founder_id, created_at desc);
create index if not exists website_orders_unprovisioned_idx on public.website_orders (created_at) where provisioned_at is null;

alter table public.website_proposals enable row level security;
alter table public.website_proposals force row level security;
alter table public.website_comp_codes enable row level security;
alter table public.website_comp_codes force row level security;
alter table public.website_comp_redemptions enable row level security;
alter table public.website_comp_redemptions force row level security;
alter table public.website_orders enable row level security;
alter table public.website_orders force row level security;

revoke all on table public.website_proposals, public.website_comp_codes, public.website_comp_redemptions, public.website_orders
  from public, anon, authenticated;
grant select on table public.website_proposals, public.website_comp_codes, public.website_comp_redemptions, public.website_orders
  to authenticated;
grant select, insert, update on table public.website_proposals, public.website_comp_codes to service_role;
grant select, insert on table public.website_comp_redemptions to service_role;
grant select, insert, update on table public.website_orders to service_role;

do $$
declare
  t text;
begin
  foreach t in array array['website_proposals', 'website_comp_codes', 'website_comp_redemptions', 'website_orders'] loop
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_founder_select'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (founder_id = auth.uid())',
        t || '_founder_select', t
      );
    end if;
  end loop;
end $$;

-- Redeeming is one transaction: the proposal row is locked first, so a code and a racing second code, or a racing
-- webhook, cannot both create an order. The reason a code failed stays in here; callers see only 'invalid'.
create or replace function public.redeem_website_comp_code(
  p_proposal_id uuid,
  p_code_hash text,
  p_email text,
  p_name text
) returns text
language plpgsql
-- Invoker rights: only service_role may execute it, and service_role already holds the grants it needs.
security invoker
set search_path = ''
as $$
declare
  v_proposal public.website_proposals%rowtype;
  v_code public.website_comp_codes%rowtype;
  v_email text := lower(trim(p_email));
  v_redemption_id uuid;
begin
  select * into v_proposal from public.website_proposals where id = p_proposal_id for update;
  if not found or v_proposal.withdrawn_at is not null or v_proposal.expires_at <= now() then
    return 'invalid';
  end if;

  if exists (select 1 from public.website_orders where proposal_id = p_proposal_id) then
    return 'already_ordered';
  end if;

  select * into v_code from public.website_comp_codes
    where code_hash = p_code_hash and proposal_id = p_proposal_id for update;
  if not found or v_code.revoked_at is not null or v_code.expires_at <= now()
     or (v_code.bound_email is not null and v_code.bound_email <> v_email)
     or exists (select 1 from public.website_comp_redemptions where code_id = v_code.id) then
    return 'invalid';
  end if;

  insert into public.website_comp_redemptions (founder_id, code_id, proposal_id, email, name)
    values (v_proposal.founder_id, v_code.id, p_proposal_id, v_email, trim(p_name))
    returning id into v_redemption_id;

  insert into public.website_orders (founder_id, proposal_id, source, comp_redemption_id, amount_cents, livemode, customer_email)
    values (v_proposal.founder_id, p_proposal_id, 'comped', v_redemption_id, 0, false, v_email);

  update public.website_proposals set accepted_at = now(), accepted_name = trim(p_name) where id = p_proposal_id;

  return 'redeemed';
end;
$$;

revoke all on function public.redeem_website_comp_code(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_website_comp_code(uuid, text, text, text) to service_role;
