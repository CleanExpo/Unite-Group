-- FOUNDER-GATED: apply to production only under the founder's break-glass approval.
-- Living Card: give Phill's card (slug phill-mcgurk) its owner, so the founder can read the
-- enquiries and feedback it collects (card_enquiries / card_feedback read through card_owners).
--
-- WHY A MIGRATION AND NOT A DIRECT INSERT: production changes only through a reviewed,
-- merged branch. The founder is resolved from existing CRM data the same way
-- 20260908020000_coaching_seed_klim_spiroski.sql does, never typed in by hand.
--
-- It refuses rather than guesses: exactly one distinct founder must own the CRM rows,
-- or it raises. It never replaces an owner that is already set to someone else.
-- Re-running it changes nothing.

do $$
declare
  v_founder uuid;
  v_count int;
  v_existing uuid;
begin
  select count(distinct founder_id), min(founder_id::text)::uuid into v_count, v_founder from public.crm_leads;
  if v_count = 0 then
    select count(distinct founder_id), min(founder_id::text)::uuid into v_count, v_founder from public.crm_contacts;
  end if;

  if v_count = 0 then
    raise exception 'card owner seed: no founder found in crm_leads or crm_contacts';
  end if;
  if v_count > 1 then
    raise exception 'card owner seed: % different founders own CRM rows; refusing to guess the card owner', v_count;
  end if;

  select founder_id into v_existing from public.card_owners where card_slug = 'phill-mcgurk';
  if v_existing is not null and v_existing <> v_founder then
    raise exception 'card owner seed: phill-mcgurk already belongs to a different founder; not replacing it';
  end if;

  insert into public.card_owners (card_slug, founder_id)
    values ('phill-mcgurk', v_founder)
    on conflict (card_slug) do nothing;
end $$;
