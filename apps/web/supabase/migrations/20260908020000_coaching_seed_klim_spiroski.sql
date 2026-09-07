-- Coaching Clinic — seed the first real client: Klim Spiroski.
--
-- Founder instruction, 08/09/2026: "Put Klim in as a client in the Coaching
-- Clinic for me and set him up as an Actual Client." Hence status = 'active',
-- not a pilot or test row.
--
-- WHY A MIGRATION AND NOT A DIRECT INSERT. Prod moves only via a merged,
-- approved branch (root CLAUDE.md, hard rules), and the coaching tables do not
-- exist in ANY environment yet — 20260907180000_coaching_engagements.sql is
-- still unapplied. So there is nothing to insert into today. This lands the row
-- the moment the schema migration is applied, through the reviewable path.
--
-- IDENTITY — verified 07/09/2026 against public registers, not assumed:
--   Klime "Klim" Spiroski, Peakhurst NSW 2210, most work on the North Shore.
--   MODERN PROPERTY MAINTENANCE PTY LTD, ABN 22168603816 / ACN 168603816,
--   active since 01/04/2014, GST-registered 07/2014.
--   Trading name RAPID DISASTER RECOVERY, registered 12/05/2025.
--   Anchor supplied by the founder: klim@rapiddisasterrecovery.com.au
-- The flyout sorts and labels on business_name, so the TRADING name is used —
-- it is what Phill will recognise in the list. The legal entity is recorded in
-- notes rather than the label.
--
-- CONSENT IS DELIBERATELY FALSE. Consent for the 19/08/2026 recording was never
-- sought (NSW Surveillance Devices Act 2007 s 7 is an open question on this
-- engagement). The schema permits consent_given = false with a null date and
-- method, and that is the honest state. Setting it true here would fabricate a
-- legal record on the founder's own credibility — the one asset the coaching
-- product is built on. Nothing identifiable about Klim may be published until
-- he says yes in writing; the flyout renders a "no consent" badge meanwhile.

do $$
declare
  v_founder uuid;
  v_contact uuid;
  v_engagement uuid;
begin
  -- Single-tenant app: resolve the founder from existing CRM data, falling back
  -- to the sole auth user on a fresh branch database.
  select founder_id into v_founder from public.crm_contacts limit 1;
  if v_founder is null then
    select id into v_founder from auth.users order by created_at asc limit 1;
  end if;

  -- Fail loudly. A silently skipped seed means Phill opens the Coaching Clinic,
  -- finds it empty, and has no signal why — the exact fake-as-real failure the
  -- house rules exist to prevent.
  if v_founder is null then
    raise exception 'coaching seed: no founder user found in crm_contacts or auth.users';
  end if;

  -- Contact first — coaching_engagements.client_id references crm_contacts.
  select id into v_contact
  from public.crm_contacts
  where founder_id = v_founder
    and lower(primary_email) = 'klim@rapiddisasterrecovery.com.au'
  limit 1;

  if v_contact is null then
    insert into public.crm_contacts (
      founder_id, display_name, first_name, last_name, company_name,
      primary_email, role_title, status, source, source_detail,
      relationship_owner, privacy_scope, marketing_consent, privacy_notes
    ) values (
      v_founder,
      'Klim Spiroski',
      'Klime',
      'Spiroski',
      'Rapid Disaster Recovery',
      'klim@rapiddisasterrecovery.com.au',
      'Owner / water damage technician',
      'active',
      'manual',
      'Coaching Clinic — mentorship engagement, session 1 on 19/08/2026',
      'founder',
      'private',
      false,   -- no marketing consent sought
      'No recording or publication consent on file as at 08/09/2026. '
        || 'Nothing identifiable may be published until given in writing.'
    )
    returning id into v_contact;
  end if;

  -- The engagement. Idempotent on the (founder_id, client_id) unique index, so
  -- re-running this migration cannot create a duplicate client in the flyout.
  insert into public.coaching_engagements (
    founder_id, client_id, business_name, client_name,
    status, consent_given, notes
  ) values (
    v_founder,
    v_contact,
    'Rapid Disaster Recovery',
    'Klim Spiroski',
    'active',
    false,
    'Newly WRT+ASD certified (three-day course, no prior industry experience; '
      || 'ASD took three attempts). Based Peakhurst NSW 2210, most work on the '
      || 'North Shore. Legal entity MODERN PROPERTY MAINTENANCE PTY LTD, '
      || 'ABN 22168603816, trading as RAPID DISASTER RECOVERY since 12/05/2025. '
      || 'Session 1 held 19/08/2026 (61 min). CONSENT NOT YET SOUGHT — see '
      || 'privacy notes on the contact.'
  )
  on conflict (founder_id, client_id) do nothing
  returning id into v_engagement;

  if v_engagement is null then
    raise notice 'coaching seed: engagement for Klim already present, left unchanged';
  else
    raise notice 'coaching seed: created engagement % for Klim Spiroski', v_engagement;
  end if;
end $$;
