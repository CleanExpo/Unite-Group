-- Strangler SHADOW-READ DIFF — the cutover parity gate on top of the outbox (0003).
-- Rehearsed on CLONED / non-prod data ONLY. Run as a BYPASSRLS / service role (reads FORCE-RLS core.*).
--
-- Before reads are flipped to the spine, compare the staged legacy snapshot against what the spine
-- actually holds, via core.source_record lineage. The expected-diff whitelist is driven by FACTS the
-- resolver already recorded — role_email membership, an OPEN identity_audit review row, the recorded
-- merge resolution — NEVER by re-running resolution logic (which would make the diff tautologically
-- agree and blind to resolver bugs). A merge survivor's NON-key fields are expected; its merge KEY is
-- still hard-compared so a corrupted key is caught. parity_ok folds the diff, the global orphan
-- invariant, and outbox health into ONE predicate — the cutover gate, ADDITIONAL TO and distinct from
-- GREEN, human-approved and reversible.
-- Applied + tested GREEN on the Unite-Group Test sandbox (strangler/0004_shadow_read_diff.test.sql),
-- including a DETECTION PROOF that a deliberately-corrupted clean field flips parity_ok false and pins
-- the exact field. Reversible: drop the migrate.shadow_* objects.

create table if not exists migrate.shadow_diff (
  id             bigint generated always as identity primary key,
  scan_id        uuid not null,
  source_system  text not null,
  source_pk      text not null,
  party_id       uuid,                                       -- spine party via lineage; NULL = missing
  field          text not null,                              -- display_name | email | abn | *
  classification text not null check (classification in (
                   'ok','missing_in_spine','extra_in_spine','value_diff',
                   'expected_undermerge','expected_role_email','expected_merge_survivor')),
  legacy_value   text,
  spine_value    text,
  is_expected    boolean generated always as
                   (classification in ('ok','expected_undermerge','expected_role_email','expected_merge_survivor')) stored,
  detail         text,
  scanned_at     timestamptz not null default now()
);
create index if not exists shadow_diff_scan_idx       on migrate.shadow_diff(scan_id);
create index if not exists shadow_diff_unexpected_idx on migrate.shadow_diff(scan_id) where not is_expected;

-- shadow_scan: field-level parity for every present legacy row + missing/extra lineage. Returns the
-- per-classification histogram for this scan and persists every diff row (incl. 'ok') under one scan_id.
create or replace function migrate.shadow_scan(p_system text)
returns table(classification text, n bigint) language plpgsql as $$
declare v_scan uuid := gen_random_uuid();
begin
  -- PASS A: field compare for every present (resolved, non-deleted) legacy row.
  insert into migrate.shadow_diff(scan_id, source_system, source_pk, party_id, field, classification, legacy_value, spine_value)
  select v_scan, sp.source_system, sp.source_pk, pt.party_id, f.field,
    case
      -- review #6: an open review_pending suppresses ONLY the field it concerns (the abn, for a
      -- conflicting-abn review) — display_name/email are still compared so unrelated corruption is caught.
      -- review #8: the merge-survivor whitelist includes the promoted_* resolutions; the sticky marker
      -- in _reconcile keeps it correct across later edits.
      when f.field='display_name' then
        case when sp.resolution in ('abn_merge','email_merge','promoted_abn_merge','promoted_email_merge') then 'expected_merge_survivor'
             when f.legacy_value is not distinct from f.spine_value then 'ok'
             else 'value_diff' end
      when f.field='email' then
        case when sp_role.is_role then (case when f.spine_value is null then 'expected_role_email' else 'value_diff' end)
             when sp.resolution in ('email_merge','promoted_email_merge') then (case when f.legacy_value is not distinct from f.spine_value then 'ok' else 'value_diff' end)
             when sp.resolution in ('abn_merge','promoted_abn_merge') then 'expected_merge_survivor'
             when f.legacy_value is not distinct from f.spine_value then 'ok'
             else 'value_diff' end
      when f.field='abn' then
        case when ir.is_review then 'expected_undermerge'      -- only the abn field a conflicting-abn review concerns
             when sp.resolution in ('abn_merge','promoted_abn_merge') then (case when f.legacy_value is not distinct from f.spine_value then 'ok' else 'value_diff' end)
             when sp.resolution in ('email_merge','promoted_email_merge') then 'expected_merge_survivor'
             when f.legacy_value is not distinct from f.spine_value then 'ok'
             else 'value_diff' end
    end,
    f.legacy_value, f.spine_value
  from migrate.source_party sp
  join core.source_record sr on sr.source_system=sp.source_system and sr.source_pk=sp.source_pk
  join core.party pt on pt.party_id = sr.party_id
  left join core.person pe on pe.party_id = pt.party_id
  left join core.organization og on og.party_id = pt.party_id
  cross join lateral (values
     ('display_name', sp.display_name, pt.display_name),
     ('email', migrate.normalize_email(sp.email), migrate.normalize_email(pe.email)),
     ('abn', sp.abn, og.abn)
  ) as f(field, legacy_value, spine_value)
  cross join lateral (select exists(
     select 1 from core.identity_audit ia
     where ia.party_id=pt.party_id and ia.action='review_pending' and ia.decided_by is null) as is_review) ir
  cross join lateral (select migrate.normalize_email(sp.email) is not null
     and exists(select 1 from migrate.role_email re where re.email=migrate.normalize_email(sp.email)) as is_role) sp_role
  where sp.source_system=p_system and not sp.is_test and coalesce(sp.resolution,'') <> 'deleted'
    and ( f.field='display_name'
       or (f.field='email' and sp.kind='person')
       or (f.field='abn'   and sp.kind='organization') );   -- kind-gated → no phantom diffs

  -- missing_in_spine: a resolved legacy row with no lineage in the spine.
  insert into migrate.shadow_diff(scan_id, source_system, source_pk, party_id, field, classification, legacy_value, spine_value)
  select v_scan, sp.source_system, sp.source_pk, null, '*', 'missing_in_spine', sp.display_name, null
  from migrate.source_party sp
  left join core.source_record sr on sr.source_system=sp.source_system and sr.source_pk=sp.source_pk
  where sp.source_system=p_system and not sp.is_test and coalesce(sp.resolution,'') <> 'deleted' and sr.party_id is null;

  -- extra_in_spine: lineage the spine still holds for a legacy row that vanished with no delete event.
  insert into migrate.shadow_diff(scan_id, source_system, source_pk, party_id, field, classification, legacy_value, spine_value)
  select v_scan, sr.source_system, sr.source_pk, sr.party_id, '*', 'extra_in_spine', null, 'lineage'
  from core.source_record sr
  where sr.source_system=p_system
    and not exists (select 1 from migrate.source_party sp
                    where sp.source_system=sr.source_system and sp.source_pk=sr.source_pk
                      and not sp.is_test and coalesce(sp.resolution,'') <> 'deleted');

  return query
    select sd.classification, count(*)::bigint from migrate.shadow_diff sd
    where sd.scan_id=v_scan group by sd.classification order by sd.classification;
end $$;

-- Cutover parity predicate. Reads the LATEST scan for the system + the global orphan invariant + outbox
-- health. orphan_parties counts ONLY active golden parties with no lineage (a soft-deleted party is the
-- expected result of a delete event, not a leak). parity_ok = no unexplained diff, no orphan, nothing
-- pending or dead. This gate is ADDITIONAL TO and DISTINCT FROM GREEN, and remains human-approved.
create or replace function migrate.shadow_summary(p_system text)
returns table(
  total_compared bigint, ok bigint, expected_undermerge bigint, expected_role_email bigint,
  expected_merge_survivor bigint, missing_in_spine bigint, extra_in_spine bigint, value_diff bigint,
  orphan_parties bigint, pending_events bigint, dead_events bigint, unexplained_diffs bigint, parity_ok boolean)
language plpgsql stable as $$
declare v_scan uuid;
begin
  select scan_id into v_scan from migrate.shadow_diff where source_system=p_system order by scanned_at desc limit 1;
  return query
  with d as (select * from migrate.shadow_diff where scan_id = v_scan),
  orph as (
    select count(*)::bigint nn from core.party p
    where p.golden_party_id is null
      and p.is_active
      and not exists (select 1 from core.source_record sr where sr.party_id=p.party_id)
      and not exists (select 1 from core.party w where w.golden_party_id=p.party_id)
      and not exists (select 1 from migrate.seed_party_ids s where s.party_id=p.party_id)
  ),
  ob as (
    select count(*) filter (where status='pending')::bigint pend,
           count(*) filter (where status='dead')::bigint dead
    from migrate.outbox where source_system=p_system
  )
  select
    count(distinct d.source_pk)::bigint,
    count(*) filter (where d.classification='ok')::bigint,
    count(*) filter (where d.classification='expected_undermerge')::bigint,
    count(*) filter (where d.classification='expected_role_email')::bigint,
    count(*) filter (where d.classification='expected_merge_survivor')::bigint,
    count(*) filter (where d.classification='missing_in_spine')::bigint,
    count(*) filter (where d.classification='extra_in_spine')::bigint,
    count(*) filter (where d.classification='value_diff')::bigint,
    (select nn from orph),
    (select pend from ob),
    (select dead from ob),
    count(*) filter (where not d.is_expected)::bigint,
    (count(*) filter (where not d.is_expected) = 0
      and (select nn from orph) = 0
      and (select pend from ob) = 0
      and (select dead from ob) = 0)
  from d;
end $$;
