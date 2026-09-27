-- 0006_employment_credential (RA-7753 slice 1a).
-- Spec: Pi-Dev-Ops .harness/project3b/discovery/SPEC_SLICE1_IDENTITY.md §9.
-- Additive, inside the existing `core` and `carsi` schemas, so 0000_teardown is unchanged.
-- Every rule below is proven by tests/integration/identity_rules.test.ts with a negative
-- control AND a mutant; tests/integration/rls_catalog.test.ts pins RLS on every table.

-- ═══ D2: forged field ties must not expose a stranger's identity ═════════════════════════
--
-- 0002 let any member INSERT field.customer / field.evidence with ANY contact_person_id /
-- captured_by (the WITH CHECK only tested org_id), and party_visible() then treated that row
-- as a tie — so a tenant could make any person's email and phone visible to itself by
-- writing one row. The field ties stay (they are how a customer's contact becomes visible),
-- but a new field row may only NAME someone the org can already see by a NON-field tie.

-- party_visible() minus the two field ties. The WITH CHECK below uses this, never
-- party_visible() itself: checking a tie against a predicate the same tie satisfies is
-- circular, and circular is exactly the defect.
create or replace function core.party_visible_nonfield(p_party uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_internal_staff()
    or p_party = core.current_org_id()
    or p_party = core.current_person_id()
    or exists (select 1 from core.org_membership m where m.person_party_id = p_party and m.org_party_id = core.current_org_id() and m.status = 'active')
    or exists (select 1 from leadgen.lead l join leadgen.lead_routing r on r.lead_id = l.id where l.contact_person_id = p_party and r.org_id = core.current_org_id());
$$;
revoke all on function core.party_visible_nonfield(uuid) from public, anon;
grant execute on function core.party_visible_nonfield(uuid) to authenticated;

-- The full visibility predicate: the non-field ties, the (now write-checked) field ties,
-- and a SELF tie — a person can always see their own identity row.
create or replace function core.party_visible(p_party uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.party_visible_nonfield(p_party)
    or exists (select 1 from field.customer c where c.contact_person_id = p_party and c.org_id = core.current_org_id())
    or exists (select 1 from field.evidence e where e.captured_by = p_party and e.org_id = core.current_org_id());
$$;

drop policy customer_rw on field.customer;
create policy customer_rw on field.customer for all
  using (core.is_internal_staff() or org_id = core.current_org_id())
  with check (core.is_internal_staff()
              or (org_id = core.current_org_id()
                  and (contact_person_id is null or core.party_visible_nonfield(contact_person_id))));

drop policy evidence_rw on field.evidence;
create policy evidence_rw on field.evidence for all
  using (core.is_internal_staff() or org_id = core.current_org_id())
  with check (core.is_internal_staff()
              or (org_id = core.current_org_id()
                  and (captured_by is null or core.party_visible_nonfield(captured_by))));

-- ═══ Employment history: the single tenure source ══════════════════════════════════════════
--
-- core.org_membership stays the ACCESS record (UNIQUE(person, org), feeds the fail-closed
-- helpers) and is not extended. Employment is the HISTORY: one row per stint, many per
-- (person, org) over time, at most one open. core.end_employment() is the only way a stint
-- closes, and it flips membership to 'left' in the same transaction, so access and history
-- cannot drift apart.
create table core.employment (
  id                        uuid primary key default gen_random_uuid(),
  person_party_id           uuid not null references core.person(party_id) on delete restrict,
  org_party_id              uuid not null references core.organization(party_id) on delete restrict,
  role                      text,
  started_at                timestamptz not null,
  ended_at                  timestamptz,
  end_reason                text,
  employer_display_snapshot text,     -- the employer's name as it read at the time
  created_at                timestamptz not null default now(),
  constraint employment_end_after_start check (ended_at is null or ended_at >= started_at),
  constraint employment_end_has_reason check ((ended_at is null) = (end_reason is null))
);
create unique index employment_one_open_uidx on core.employment(person_party_id, org_party_id) where ended_at is null;
create index employment_org_idx on core.employment(org_party_id);

-- A closed stint is history: it cannot be edited or reopened.
create or replace function core.employment_ended_is_final()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.ended_at is not null then
    raise exception 'core.employment %: an ended employment row cannot be updated', old.id
      using errcode = '23000';
  end if;
  return new;
end $$;
revoke all on function core.employment_ended_is_final() from public, anon, authenticated;
create trigger employment_ended_is_final before update on core.employment
  for each row execute function core.employment_ended_is_final();

-- The ONLY way to end employment. Closes the open stint AND sets membership 'left' atomically.
-- Callable by the service role only; a JWT-bearing caller must also be live internal staff.
create or replace function core.end_employment(p_person uuid, p_org uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if nullif(pg_catalog.current_setting('request.jwt.claims', true), '') is not null
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not core.is_internal_staff() then
    raise exception 'core.end_employment: caller is not internal staff' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'core.end_employment: a reason is required' using errcode = '23514';
  end if;
  update core.employment set ended_at = now(), end_reason = p_reason
    where person_party_id = p_person and org_party_id = p_org and ended_at is null
    returning id into v_id;
  if v_id is null then
    raise exception 'core.end_employment: no open employment for this person at this org' using errcode = 'P0002';
  end if;
  update core.org_membership set status = 'left'
    where person_party_id = p_person and org_party_id = p_org;
  return v_id;
end $$;
revoke all on function core.end_employment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function core.end_employment(uuid, uuid, text) to service_role;

-- ═══ Credentials: self-reported ≠ issuer-verified, enforced by the database ═══════════════
--
-- verification_class is HOW WE KNOW; status is WHETHER IT STANDS. Two columns, because
-- "revoked" and "self-reported" are different facts. A verified class without evidence is
-- refused outright (23514). The credential number is NEVER a core.party_identifier: it is
-- not an identity key, and a reused number is an anomaly for a human, not a merge.
create table core.credential (
  id                  uuid primary key default gen_random_uuid(),
  holder_party_id     uuid not null references core.person(party_id) on delete restrict,
  credential_type     text not null,
  issuer              text not null,
  number              text,
  issued_at           timestamptz,
  expires_at          timestamptz,
  verification_class  text not null default 'UNKNOWN'
    check (verification_class in ('SELF_REPORTED','DOCUMENT_UPLOADED','ISSUER_VERIFIED','REGISTRY_VERIFIED','UNKNOWN')),
  status              text not null default 'active' check (status in ('active','expired','revoked')),
  verified_at         timestamptz,
  verification_method text,
  source_record_id    uuid references core.source_record(id) on delete restrict,
  evidence_ref        text,           -- opaque storage key, never a URL
  created_at          timestamptz not null default now(),
  constraint credential_verified_needs_evidence check (
    verification_class not in ('ISSUER_VERIFIED','REGISTRY_VERIFIED')
    or (verified_at is not null and verification_method is not null and evidence_ref is not null)),
  constraint credential_evidence_ref_opaque check (evidence_ref is null or evidence_ref !~* '^[a-z][a-z0-9+.-]*:'),
  constraint credential_expiry_after_issue check (expires_at is null or issued_at is null or expires_at >= issued_at)
);
create index credential_holder_idx on core.credential(holder_party_id);
create index credential_number_idx on core.credential(credential_type, issuer, lower(number)) where number is not null;

-- Anomaly: the same (type, issuer, number) held by two different people goes to the human
-- review queue. Party ids and a rule code only — never the number. Both credentials keep
-- their status; this flags, it does not decide.
create or replace function core.credential_number_anomaly()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.number is null then return new; end if;
  insert into core.identity_audit(action, party_id, other_party_id, reason)
    select distinct 'review_pending', new.holder_party_id, c.holder_party_id,
           'CREDENTIAL_NUMBER_REUSE: same type/issuer/number held by two people'
    from core.credential c
    where c.credential_type = new.credential_type
      and c.issuer = new.issuer
      and lower(c.number) = lower(new.number)
      and c.holder_party_id <> new.holder_party_id;
  return new;
end $$;
revoke all on function core.credential_number_anomaly() from public, anon, authenticated;
create trigger credential_number_anomaly after insert or update of number, credential_type, issuer on core.credential
  for each row execute function core.credential_number_anomaly();

-- ═══ CEC claims: eligible ≠ accepted ══════════════════════════════════════════════════════
--
-- Keyed to the enrollment, so the activity and the provider's credit claim are READ through
-- enrollment → course, never copied. Acceptance by the recognising body needs the evidence
-- trail; nothing derives accepted_at from eligible_at.
create table carsi.cec_claim (
  id                      uuid primary key default gen_random_uuid(),
  enrollment_id           uuid not null references carsi.enrollment(id) on delete restrict,
  recognising_body        text not null,
  eligibility_basis       text,
  eligible_at             timestamptz,
  evidence_submitted_at   timestamptz,
  evidence_ref            text,
  accepted_at             timestamptz,
  acceptance_evidence_ref text,
  body_reference          text,
  created_at              timestamptz not null default now(),
  constraint cec_accepted_needs_evidence check (
    accepted_at is null
    or (evidence_submitted_at is not null and acceptance_evidence_ref is not null and body_reference is not null)),
  constraint cec_refs_opaque check (
    (evidence_ref is null or evidence_ref !~* '^[a-z][a-z0-9+.-]*:')
    and (acceptance_evidence_ref is null or acceptance_evidence_ref !~* '^[a-z][a-z0-9+.-]*:'))
);
create index cec_claim_enrollment_idx on carsi.cec_claim(enrollment_id);

comment on column carsi.training_credential.iicrc_credits is
  'Provider claim of credits on completion; NOT acceptance by the recognising body (see carsi.cec_claim).';

-- ═══ RLS: FORCE on every new table; visibility matrix (spec §9) ══════════════════════════
alter table core.employment enable row level security; alter table core.employment force row level security;
alter table core.credential enable row level security; alter table core.credential force row level security;
alter table carsi.cec_claim enable row level security; alter table carsi.cec_claim force row level security;

-- employment: self; a live member of the employer org (ended stints included — it is the
-- org's lawful record); staff. Live has_org_access, never the JWT org claim, so a departed
-- worker holding a stale claim sees nothing of the org.
create policy employment_read on core.employment for select using (
  core.is_internal_staff()
  or person_party_id = core.current_person_id()
  or core.has_org_access(org_party_id));

-- credential: holder; staff; a CURRENT employer, only for credentials issued inside the
-- open stint. A former employer sees none (D-15).
create policy credential_read on core.credential for select using (
  core.is_internal_staff()
  or holder_party_id = core.current_person_id()
  or exists (select 1 from core.employment e
             where e.person_party_id = credential.holder_party_id
               and e.ended_at is null
               and credential.issued_at >= e.started_at
               and core.has_org_access(e.org_party_id)));

-- cec_claim: holder and staff only.
create policy cec_claim_read on carsi.cec_claim for select using (
  core.is_internal_staff()
  or exists (select 1 from carsi.enrollment en
             where en.id = cec_claim.enrollment_id
               and en.person_party_id = core.current_person_id()));

-- ═══ Grants: additive, SELECT-only, column-scoped on credential ══════════════════════════
--
-- 0004's `grant select on all tables` ran before these tables existed, so it grants them
-- nothing; everything here is explicit. NOTE: re-running 0004 after 0006 would widen
-- core.credential to every column — rls_catalog.test.ts asserts the employer's read of
-- `number` is denied, so that regression fails CI rather than passing quietly.
revoke all on core.employment, core.credential, carsi.cec_claim from public, anon, authenticated;
grant select on core.employment to authenticated;
grant select (id, holder_party_id, credential_type, issuer, issued_at, expires_at, verification_class,
              status, verified_at, verification_method, source_record_id, evidence_ref, created_at)
  on core.credential to authenticated;
grant select on carsi.cec_claim to authenticated;

-- The full credential, number included — for the holder and staff only. The view runs with
-- its owner's rights, so the WHERE clause IS the access rule; security_barrier stops a
-- caller-supplied function from seeing rows before that clause filters them.
create view core.credential_full with (security_barrier) as
  select c.* from core.credential c
  where c.holder_party_id = core.current_person_id() or core.is_internal_staff();
revoke all on core.credential_full from public, anon, authenticated;
grant select on core.credential_full to authenticated;

-- ═══ DOWN (manual; reverse FK order). Not run by any tooling. ═══════════════════════════
-- drop view if exists core.credential_full;
-- drop table if exists carsi.cec_claim;
-- drop table if exists core.credential;
-- drop function if exists core.credential_number_anomaly();
-- drop function if exists core.end_employment(uuid, uuid, text);
-- drop table if exists core.employment;
-- drop function if exists core.employment_ended_is_final();
-- comment on column carsi.training_credential.iicrc_credits is null;
-- then re-apply the 0002 customer_rw / evidence_rw policies and party_visible(),
-- and drop function core.party_visible_nonfield(uuid).
