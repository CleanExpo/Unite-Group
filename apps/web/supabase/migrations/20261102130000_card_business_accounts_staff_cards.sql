-- FOUNDER-GATED: apply to production only under the founder's break-glass approval, and only after it has
-- been proven on a Supabase database branch (never directly on prod). Apply after 20261102120000.
-- Proven on a throwaway local Postgres 15 only: scripts/card-staff-db-proof.sh.
-- UNI-3146 (Phill, 02/11/2026): a Business Pack is the owner's main account. Staff cards (A$199 each, no limit, 3 rounds
-- each) link to it. The owner controls the business details; every staff card reads them at render time, so a change
-- reaches every card. A staff member edits only their own name, photo and mobile.
--
-- WHY RLS IS NOT KEYED ON THE OWNER OR STAFF MEMBER: card buyers have no sign-in. auth.uid() is only ever the founder,
-- and the CRM refuses anyone else (src/lib/auth/private-access.ts). Giving buyers accounts in the CRM's auth would put
-- customers in the founder's identity pool. So authority is a private link: a 256-bit token, stored here only as its
-- sha256 hash. The server resolves token to role and applies src/lib/card/staff-permissions.ts before any write, the
-- same capability pattern as /api/cards/intake. What the database itself guarantees: anon and authenticated can write
-- nothing and read no token hash; the founder reads their own rows; the public reads one active card through
-- card_staff_public; a deactivated card can never change again; a card's owner, order and address never change; and
-- seats exist only from a paid staff-card order.
--
-- Until this is applied the webhook logs a warning and records the order as before. Apply it before merging the code
-- that advertises owner control.
-- Re-appliable: tables and indexes use if not exists, functions use create or replace, policies and triggers are dropped and recreated.
-- Rollback (reviewed forward migration): drop function public.card_staff_public(text),
--   public.card_provision_staff_cards(uuid, uuid), then drop table public.card_staff_cards, public.card_business_accounts
--   and the two guard functions. Business details and staff details are lost; card_orders is untouched.

create table if not exists public.card_business_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.card_orders(id) on delete cascade,
  -- a test payment and a live payment never share an account
  livemode boolean not null,
  -- null until the owner's link email is confirmed sent; while null a webhook retry replaces the token and sends again
  owner_link_sent_at timestamptz,
  -- one delivery at a time: a retry leaves a link alone while another request's claim on it is live
  owner_link_claimed_at timestamptz,
  owner_email text not null check (char_length(owner_email) <= 254 and owner_email = lower(owner_email) and owner_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  owner_token_hash text not null unique check (owner_token_hash ~ '^[0-9a-f]{64}$'),
  rounds_included integer not null default 10 check (rounds_included >= 0),
  business_name text check (business_name is null or (char_length(business_name) <= 120 and business_name ~ '[^[:space:]]')),
  logo_url text check (logo_url is null or (char_length(logo_url) <= 500 and logo_url ~ '^https://[^[:space:]<>"]+$')),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,24}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  website text check (website is null or (char_length(website) <= 500 and website ~ '^https://[^[:space:]<>"]+$')),
  address text check (address is null or char_length(address) <= 200),
  offer text check (offer is null or char_length(offer) <= 280)
);

create index if not exists card_business_accounts_owner_email_idx on public.card_business_accounts (founder_id, owner_email);

create table if not exists public.card_staff_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.card_business_accounts(id) on delete cascade,
  -- the paid staff-card order this seat came from; a seat cannot exist without one
  order_id uuid not null references public.card_orders(id) on delete cascade,
  seat_no integer not null check (seat_no >= 1),
  -- the public address /c/<slug>. The s- prefix keeps it apart from owner cards; random, so nothing can be guessed from it.
  card_slug text not null unique default ('s-' || substr(md5(gen_random_uuid()::text), 1, 16)) check (card_slug ~ '^s-[0-9a-f]{16}$'),
  token_hash text unique check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  rounds_included integer not null default 3 check (rounds_included >= 0),
  staff_name text check (staff_name is null or (char_length(staff_name) <= 80 and staff_name ~ '[^[:space:]]')),
  photo_url text check (photo_url is null or (char_length(photo_url) <= 500 and photo_url ~ '^https://[^[:space:]<>"]+$')),
  mobile text check (mobile is null or mobile ~ '^\+?[0-9 ()-]{6,24}$'),
  status text not null default 'active' check (status in ('active', 'deactivated')),
  deactivated_at timestamptz,
  unique (order_id, seat_no)
);

create index if not exists card_staff_cards_account_idx on public.card_staff_cards (account_id, created_at);

create or replace function public.card_business_accounts_guard() returns trigger
language plpgsql as $$
begin
  if new.founder_id is distinct from old.founder_id or new.order_id is distinct from old.order_id
     or new.livemode is distinct from old.livemode
     or new.created_at is distinct from old.created_at then
    raise exception 'card_business_account_identity_is_fixed';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists card_business_accounts_guard on public.card_business_accounts;
create trigger card_business_accounts_guard before update on public.card_business_accounts
  for each row execute function public.card_business_accounts_guard();

-- Cards are not transferable between accounts, and a deactivated card is final: a new staff member needs a new card.
create or replace function public.card_staff_cards_guard() returns trigger
language plpgsql as $$
begin
  if old.status = 'deactivated' then
    raise exception 'card_staff_card_deactivated';
  end if;
  if new.founder_id is distinct from old.founder_id or new.account_id is distinct from old.account_id
     or new.order_id is distinct from old.order_id or new.seat_no is distinct from old.seat_no
     or new.card_slug is distinct from old.card_slug or new.rounds_included is distinct from old.rounds_included
     or new.created_at is distinct from old.created_at then
    raise exception 'card_staff_card_identity_is_fixed';
  end if;
  if new.status = 'deactivated' then
    new.token_hash := null; -- the edit link dies with the card
    new.deactivated_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists card_staff_cards_guard on public.card_staff_cards;
create trigger card_staff_cards_guard before update on public.card_staff_cards
  for each row execute function public.card_staff_cards_guard();

alter table public.card_business_accounts enable row level security;
alter table public.card_business_accounts force row level security;
alter table public.card_staff_cards enable row level security;
alter table public.card_staff_cards force row level security;

revoke all on table public.card_business_accounts from public, anon, authenticated;
revoke all on table public.card_staff_cards from public, anon, authenticated;
-- The founder reads their own rows, token hashes excluded. Nobody but service_role writes, and nobody deletes.
grant select (id, created_at, updated_at, founder_id, order_id, livemode, owner_link_sent_at, owner_email, rounds_included, business_name, logo_url, phone, email, website, address, offer)
  on table public.card_business_accounts to authenticated;
grant select (id, created_at, updated_at, founder_id, account_id, order_id, seat_no, card_slug, rounds_included, staff_name, photo_url, mobile, status, deactivated_at)
  on table public.card_staff_cards to authenticated;
grant select, insert, update on table public.card_business_accounts, public.card_staff_cards to service_role;

drop policy if exists card_business_accounts_founder_select on public.card_business_accounts;
create policy card_business_accounts_founder_select on public.card_business_accounts
  for select to authenticated using (founder_id = auth.uid());

drop policy if exists card_staff_cards_founder_select on public.card_staff_cards;
create policy card_staff_cards_founder_select on public.card_staff_cards
  for select to authenticated using (founder_id = auth.uid());

-- Seats from a paid staff-card order, one row per card bought. Safe to re-run: existing seats are left alone. Returns how
-- many were added, so a redelivered event does not email the owner twice. Also how the founder links an order by hand when
-- the buyer's email did not match: select public.card_provision_staff_cards('<order id>', '<account id>');
create or replace function public.card_provision_staff_cards(p_order_id uuid, p_account_id uuid) returns integer
language plpgsql as $$
declare
  v_order public.card_orders%rowtype;
  v_account_founder uuid;
  v_account_livemode boolean;
  v_added integer;
begin
  select * into v_order from public.card_orders where id = p_order_id;
  if not found or v_order.tier <> 'extra_business' then
    raise exception 'card_provision_not_a_staff_card_order';
  end if;
  select founder_id, livemode into v_account_founder, v_account_livemode from public.card_business_accounts where id = p_account_id;
  if not found or v_account_founder <> v_order.founder_id then
    raise exception 'card_provision_account_mismatch';
  end if;
  if v_account_livemode <> v_order.livemode then
    raise exception 'card_provision_mode_mismatch';
  end if;
  if exists (select 1 from public.card_staff_cards where order_id = p_order_id and account_id <> p_account_id) then
    raise exception 'card_provision_order_already_linked';
  end if;
  insert into public.card_staff_cards (founder_id, account_id, order_id, seat_no)
    select v_order.founder_id, p_account_id, p_order_id, n
    from generate_series(1, v_order.quantity) as n
    on conflict (order_id, seat_no) do nothing;
  get diagnostics v_added = row_count;
  return v_added;
end $$;
revoke all on function public.card_provision_staff_cards(uuid, uuid) from public, anon, authenticated;
grant execute on function public.card_provision_staff_cards(uuid, uuid) to service_role;

-- The one public read of a staff card: active, named, and on an account with a business name. Business details come from
-- the account at read time, which is what makes an owner's change reach every card. Security definer so anon gets these
-- columns and nothing else, never a token hash or an owner's email.
create or replace function public.card_staff_public(p_slug text)
returns table (
  card_slug text, staff_name text, photo_url text, mobile text,
  business_name text, logo_url text, phone text, email text, website text, address text, offer text
)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.card_slug, s.staff_name, s.photo_url, s.mobile,
         a.business_name, a.logo_url, a.phone, a.email, a.website, a.address, a.offer
  from public.card_staff_cards as s
  join public.card_business_accounts as a on a.id = s.account_id
  where s.card_slug = p_slug and s.status = 'active' and s.staff_name is not null and a.business_name is not null;
$$;
revoke all on function public.card_staff_public(text) from public;
grant execute on function public.card_staff_public(text) to anon, authenticated, service_role;
