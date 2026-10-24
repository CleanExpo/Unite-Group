-- FOUNDER-GATED: apply to production only under the founder's break-glass approval.
-- Living Card capture: what a visitor sends from a public business card.
-- card_owners maps a card to the founder who may read its rows. card_enquiries and
-- card_feedback take anonymous INSERT only (the card uses the publishable key with
-- Prefer: return=minimal); nobody but the card's owner can read them, and no one
-- outside service_role can change or delete them. No phone number is stored.
-- Rollback: additive tables only; removal needs a reviewed forward migration.

create table if not exists public.card_owners (
  card_slug text primary key check (card_slug ~ '^[a-z0-9-]{1,64}$'),
  founder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.card_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  card_slug text not null check (card_slug ~ '^[a-z0-9-]{1,64}$'),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  business text check (business is null or char_length(business) <= 120),
  ask text not null check (char_length(btrim(ask)) between 1 and 2000),
  reply_email text check (
    reply_email is null
    or (char_length(reply_email) <= 254 and reply_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  source text not null default 'card' check (source ~ '^[a-z0-9-]{1,32}$')
);

create table if not exists public.card_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  card_slug text not null check (card_slug ~ '^[a-z0-9-]{1,64}$'),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 4000),
  device text check (device is null or char_length(device) <= 200)
);

create index if not exists card_enquiries_slug_created_idx on public.card_enquiries (card_slug, created_at desc);
create index if not exists card_feedback_slug_created_idx on public.card_feedback (card_slug, created_at desc);
create index if not exists card_owners_founder_idx on public.card_owners (founder_id);

alter table public.card_owners enable row level security;
alter table public.card_owners force row level security;
alter table public.card_enquiries enable row level security;
alter table public.card_enquiries force row level security;
alter table public.card_feedback enable row level security;
alter table public.card_feedback force row level security;

revoke all on table public.card_owners, public.card_enquiries, public.card_feedback from public, anon, authenticated;
-- anon may only add a row, and only the visitor's own fields: id and created_at stay server-set
grant insert (card_slug, first_name, business, ask, reply_email, source) on table public.card_enquiries to anon;
grant insert (card_slug, first_name, answers, device) on table public.card_feedback to anon;
grant select on table public.card_owners, public.card_enquiries, public.card_feedback to authenticated;
grant select, insert, update, delete on table public.card_owners, public.card_enquiries, public.card_feedback to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_owners' and policyname = 'card_owners_founder_select'
  ) then
    create policy card_owners_founder_select on public.card_owners
      for select to authenticated using (founder_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_enquiries' and policyname = 'card_enquiries_anon_insert'
  ) then
    create policy card_enquiries_anon_insert on public.card_enquiries
      for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_enquiries' and policyname = 'card_enquiries_founder_select'
  ) then
    create policy card_enquiries_founder_select on public.card_enquiries
      for select to authenticated using (
        exists (
          select 1 from public.card_owners as owner
          where owner.card_slug = card_enquiries.card_slug and owner.founder_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_feedback' and policyname = 'card_feedback_anon_insert'
  ) then
    create policy card_feedback_anon_insert on public.card_feedback
      for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'card_feedback' and policyname = 'card_feedback_founder_select'
  ) then
    create policy card_feedback_founder_select on public.card_feedback
      for select to authenticated using (
        exists (
          select 1 from public.card_owners as owner
          where owner.card_slug = card_feedback.card_slug and owner.founder_id = auth.uid()
        )
      );
  end if;
end $$;
