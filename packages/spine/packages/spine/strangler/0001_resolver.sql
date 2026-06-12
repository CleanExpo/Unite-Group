-- Strangler backfill scaffolding — identity resolution / golden-record.
-- Rehearsed on CLONED / non-prod data ONLY. Implements the review's C5 requirements:
-- ABN is the only hard key (exists in ~1 of 4 stores); everything else is dirty email/name,
-- so the resolver BIASES TO UNDER-MERGE: when uncertain it creates a new party + queues a
-- human review (core.identity_audit) rather than risk an irreversible over-merge.
-- Run as a BYPASSRLS / service role (writes to FORCE-RLS core.* tables).

create schema if not exists migrate;

-- Staging: raw legacy records land here before resolution.
create table if not exists migrate.source_party (
  source_system     text not null,
  source_pk         text not null,
  kind              text not null check (kind in ('person','organization')),
  abn               text,
  email             text,
  display_name      text not null,
  raw               jsonb not null default '{}'::jsonb,
  is_test           boolean not null default false,
  resolved_party_id uuid,
  resolution        text,          -- abn_merge | email_merge | new | review | skipped_test
  primary key (source_system, source_pk)
);

-- Generic/role emails that must NEVER be used as a merge key (over-merge guard).
create table if not exists migrate.role_email (email text primary key);
insert into migrate.role_email(email) values
  ('info@shared.test'),('info@'),('admin@'),('contact@'),('office@'),('accounts@'),('enquiries@')
  on conflict do nothing;

create or replace function migrate.normalize_email(e text)
returns text language sql immutable as $$ select nullif(lower(trim(e)), ''); $$;

-- Write lineage + stamp the staging row.
create or replace function migrate._record(p_system text, p_pk text, p_party uuid, p_res text)
returns void language plpgsql as $$
begin
  insert into core.source_record(party_id, source_system, source_pk, source_payload)
    values (p_party, p_system, p_pk,
            (select raw from migrate.source_party where source_system=p_system and source_pk=p_pk))
    on conflict (source_system, source_pk) do update set party_id = excluded.party_id;
  update migrate.source_party set resolved_party_id = p_party, resolution = p_res
    where source_system = p_system and source_pk = p_pk;
end $$;

-- Create a brand-new golden party from a staging row.
create or replace function migrate._create_party(r migrate.source_party)
returns uuid language plpgsql as $$
declare v uuid; e text := migrate.normalize_email(r.email); is_role boolean;
begin
  -- a role/generic email is NOT a reliable personal identity — never store it as a unique
  -- person email or identifier (the raw payload retains it for the human reviewer).
  is_role := e is not null and exists (select 1 from migrate.role_email re where re.email = e);
  insert into core.party(kind, display_name) values (r.kind, r.display_name) returning party_id into v;
  if r.kind = 'organization' then
    insert into core.organization(party_id, legal_name, abn) values (v, r.display_name, r.abn);
    if r.abn is not null then
      insert into core.party_identifier(party_id, scheme, value) values (v, 'abn', r.abn) on conflict do nothing;
    end if;
  else
    insert into core.person(party_id, given_name, email)
      values (v, r.display_name, case when is_role then null else e end);
  end if;
  if e is not null and not is_role then
    insert into core.party_identifier(party_id, scheme, value) values (v, 'email', e) on conflict do nothing;
  end if;
  return v;
end $$;

-- Resolve ONE staging row to a party. Returns the resolution kind.
create or replace function migrate.resolve_one(p_system text, p_pk text)
returns text language plpgsql as $$
declare r migrate.source_party; v_party uuid; v_email text; v_is_role boolean;
begin
  select * into r from migrate.source_party where source_system=p_system and source_pk=p_pk;
  if not found then return 'not_found'; end if;
  if r.is_test then
    update migrate.source_party set resolution='skipped_test' where source_system=p_system and source_pk=p_pk;
    return 'skipped_test';
  end if;
  v_email := migrate.normalize_email(r.email);
  v_is_role := v_email is not null and exists (select 1 from migrate.role_email re where re.email = v_email);

  -- 1) ABN hard match (the only deterministic key)
  if r.kind='organization' and r.abn is not null then
    select o.party_id into v_party from core.organization o where o.abn = r.abn limit 1;
    if v_party is not null then perform migrate._record(p_system,p_pk,v_party,'abn_merge'); return 'abn_merge'; end if;
  end if;

  -- 2) email match — ONLY for non-role emails; check identifiers AND core.person.email
  if v_email is not null and not v_is_role then
    select party_id into v_party from (
      select pi.party_id from core.party_identifier pi where pi.scheme='email' and lower(pi.value)=v_email
      union
      select p.party_id from core.person p where lower(p.email)=v_email
    ) q limit 1;
    if v_party is not null then perform migrate._record(p_system,p_pk,v_party,'email_merge'); return 'email_merge'; end if;
  end if;

  -- 3) shared ROLE email already used by a different, already-resolved staging row → DO NOT merge;
  --    under-merge + human review. (Role emails are never stored as identifiers, so detect via staging.)
  if v_is_role and exists (
    select 1 from migrate.source_party sp2
    where migrate.normalize_email(sp2.email) = v_email
      and not (sp2.source_system = p_system and sp2.source_pk = p_pk)
      and not sp2.is_test
      and sp2.resolved_party_id is not null
  ) then
    v_party := migrate._create_party(r);
    insert into core.identity_audit(action, party_id, confidence, reason)
      values ('review_pending', v_party, 0.40,
              'shared role email '||v_email||' — under-merged, human adjudication required');
    perform migrate._record(p_system,p_pk,v_party,'review');
    return 'review';
  end if;

  -- 4) new entity
  v_party := migrate._create_party(r);
  perform migrate._record(p_system,p_pk,v_party,'new');
  return 'new';
end $$;

-- Backfill a whole source system (deterministic order), returns resolution histogram.
create or replace function migrate.backfill(p_system text)
returns table(resolution text, n bigint) language plpgsql as $$
declare rec record;
begin
  for rec in select source_pk from migrate.source_party where source_system=p_system order by source_pk loop
    perform migrate.resolve_one(p_system, rec.source_pk);
  end loop;
  return query select sp.resolution, count(*) from migrate.source_party sp
               where sp.source_system=p_system group by sp.resolution order by sp.resolution;
end $$;

-- Coverage proof: every non-test source row maps to exactly one core.source_record.
create or replace function migrate.coverage(p_system text)
returns table(total_non_test bigint, with_source_record bigint, missing bigint) language sql stable as $$
  select
    count(*) filter (where not is_test),
    count(*) filter (where not is_test and exists (
      select 1 from core.source_record sr where sr.source_system=sp.source_system and sr.source_pk=sp.source_pk)),
    count(*) filter (where not is_test and not exists (
      select 1 from core.source_record sr where sr.source_system=sp.source_system and sr.source_pk=sp.source_pk))
  from migrate.source_party sp where sp.source_system=p_system;
$$;
