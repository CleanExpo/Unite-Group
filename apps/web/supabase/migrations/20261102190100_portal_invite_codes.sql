-- UNI-3167: single-use invite / comp codes for the client portal (BRII first).
-- Needs 20261102190000_portal_entitlements.sql. Additive only; NOT applied by its PR.
-- Down (manual, reviewed forward migration only):
--   drop function if exists public.portal_invite_link_allowed(text); drop table if exists public.portal_invite_link_requests;
--   drop function if exists public.portal_redeem_invite(text);
--   drop table if exists public.portal_invite_attempts; drop table if exists public.portal_invite_redemptions;
--   drop table if exists public.portal_invite_codes;
--
-- * The code itself is never stored. Only its SHA-256 hash (hex) and a 4-character hint for the founder list.
-- * Every redemption is its own row (the SYN-1278 lesson: never a single "used_by" column that the next claimer
--   overwrites). Single use is enforced by a unique index on code_id; a later multi-use code is an index change.
-- * Redeeming needs a signed-in user on a second-factor (aal2) session. It links the user to the tenant as owner
--   and sets the plan to comp (never downgrading a paid tenant). A comp plan holds no paid module: the
--   entitlements table refuses it.
-- * Failed attempts are counted per user; five in fifteen minutes locks redeeming for that user until the window passes.
-- * Founder actions (create, list, revoke) run server-side with service_role after the founder allow-list check.

create table if not exists public.portal_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null check (code_hint ~ '^[A-HJKMNP-TV-Z2-9]{4}$'),
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  bound_email text check (
    bound_email is null
    or (bound_email = lower(bound_email) and char_length(bound_email) <= 254
        and bound_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint portal_invite_codes_expiry_after_creation check (expires_at > created_at)
);

create index if not exists portal_invite_codes_tenant_idx on public.portal_invite_codes (tenant_slug, created_at desc);

create table if not exists public.portal_invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.portal_invite_codes(id) on delete restrict,
  -- set null (not cascade): deleting the account must not delete the redemption and free the code again
  user_id uuid references auth.users(id) on delete set null,
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,64}$'),
  redeemed_at timestamptz not null default now()
);

create unique index if not exists portal_invite_redemptions_single_use on public.portal_invite_redemptions (code_id);

create table if not exists public.portal_invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (
    outcome in ('redeemed', 'not_found', 'expired', 'revoked', 'used', 'wrong_email', 'rate_limited')
  ),
  created_at timestamptz not null default now()
);

create index if not exists portal_invite_attempts_user_idx on public.portal_invite_attempts (user_id, created_at desc);

alter table public.portal_invite_codes enable row level security;
alter table public.portal_invite_codes force row level security;
alter table public.portal_invite_redemptions enable row level security;
alter table public.portal_invite_redemptions force row level security;
alter table public.portal_invite_attempts enable row level security;
alter table public.portal_invite_attempts force row level security;

-- No policies for anon or authenticated: these tables are reachable only through service_role and the function below.
revoke all on table public.portal_invite_codes, public.portal_invite_redemptions, public.portal_invite_attempts
  from public, anon, authenticated;
grant select, insert, update, delete on table public.portal_invite_codes, public.portal_invite_redemptions,
  public.portal_invite_attempts to service_role;

-- Outcomes: redeemed | not_found | expired | revoked | used | wrong_email | rate_limited | needs_second_factor
create or replace function public.portal_redeem_invite(p_code_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_code public.portal_invite_codes%rowtype;
  v_outcome text;
begin
  if v_uid is null then
    raise exception 'portal_invite_not_signed_in' using errcode = '42501';
  end if;
  if not public.portal_session_is_aal2() then
    return 'needs_second_factor';
  end if;

  if (
    select count(*) from public.portal_invite_attempts a
    where a.user_id = v_uid and a.outcome <> 'redeemed' and a.created_at > now() - interval '15 minutes'
  ) >= 5 then
    v_outcome := 'rate_limited';
  elsif p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    v_outcome := 'not_found';
  else
    -- the row lock makes a second concurrent redeem of the same code wait, then see the first redemption
    select * into v_code from public.portal_invite_codes c where c.code_hash = p_code_hash for update;
    if not found then
      v_outcome := 'not_found';
    elsif v_code.revoked_at is not null then
      v_outcome := 'revoked';
    elsif exists (select 1 from public.portal_invite_redemptions r where r.code_id = v_code.id) then
      v_outcome := 'used';
    elsif v_code.expires_at <= now() then
      v_outcome := 'expired';
    else
      select lower(u.email) into v_email from auth.users u where u.id = v_uid;
      if v_code.bound_email is not null and v_email is distinct from v_code.bound_email then
        v_outcome := 'wrong_email';
      else
        insert into public.portal_invite_redemptions (code_id, user_id, tenant_slug)
          values (v_code.id, v_uid, v_code.tenant_slug)
          on conflict (code_id) do nothing;
        if not found then
          v_outcome := 'used';
        else
          insert into public.portal_tenant_members (tenant_slug, user_id, role)
            values (v_code.tenant_slug, v_uid, 'owner')
            on conflict (tenant_slug, user_id) do nothing;
          -- comp only lifts a tenant from 'none'; a paid tenant stays paid. Modules are never touched here.
          insert into public.portal_entitlements (tenant_slug, plan, updated_by)
            values (v_code.tenant_slug, 'comp', v_uid)
            on conflict (tenant_slug) do update
              set plan = 'comp', updated_by = excluded.updated_by, updated_at = now()
              where public.portal_entitlements.plan = 'none';
          v_outcome := 'redeemed';
        end if;
      end if;
    end if;
  end if;

  insert into public.portal_invite_attempts (user_id, outcome) values (v_uid, v_outcome);
  return v_outcome;
end $$;

revoke all on function public.portal_redeem_invite(text) from public, anon;
grant execute on function public.portal_redeem_invite(text) to authenticated;

-- Sign-in links for invite holders who have no account yet. The join page asks this before it sends a link, keyed by
-- a hash of the caller's network address (never the address itself). Ten requests in fifteen minutes, then no more
-- until the window passes. Server-side only (service_role): a signed-out visitor has no session to count against.
create table if not exists public.portal_invite_link_requests (
  id bigint generated always as identity primary key,
  client_key text not null check (client_key ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists portal_invite_link_requests_key_idx
  on public.portal_invite_link_requests (client_key, created_at desc);

alter table public.portal_invite_link_requests enable row level security;
alter table public.portal_invite_link_requests force row level security;
revoke all on table public.portal_invite_link_requests from public, anon, authenticated;
grant select, insert, delete on table public.portal_invite_link_requests to service_role;

-- Counts and records in one step; the advisory lock stops two requests from both reading "nine so far".
create or replace function public.portal_invite_link_allowed(p_client_key text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_client_key is null or p_client_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('portal_invite_link:' || p_client_key));
  if (
    select count(*) from public.portal_invite_link_requests r
    where r.client_key = p_client_key and r.created_at > now() - interval '15 minutes'
  ) >= 10 then
    return false;
  end if;
  insert into public.portal_invite_link_requests (client_key) values (p_client_key);
  return true;
end $$;

revoke all on function public.portal_invite_link_allowed(text) from public, anon, authenticated;
grant execute on function public.portal_invite_link_allowed(text) to service_role;
