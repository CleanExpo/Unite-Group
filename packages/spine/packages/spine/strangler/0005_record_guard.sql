-- Strangler RECORD GUARD (RA-7753 slice 1a, defect D1).
-- Rehearsed on CLONED / non-prod data ONLY. Run as a BYPASSRLS / service role (writes FORCE-RLS core.*).
--
-- strangler/0001 wrote lineage with
--     on conflict (source_system, source_pk) do update set party_id = excluded.party_id
-- which SILENTLY re-points an already-linked product account to whichever party the caller
-- passed. That breaks "no reuse of a departed person's account": a replacement worker handed
-- the old login would inherit the old worker's identity with no trace.
--
-- Since 0003, resolve_one short-circuits on an existing source_record and never reaches that
-- branch, so the defect is LATENT — reachable only by a direct _record call. It is closed here
-- anyway: a write path that can re-point identity must not exist, reached or not.
--
-- New behaviour, and nothing else changes:
--   * no existing link          → insert it (as before);
--   * existing link, SAME party → no-op (golden-aware, so a post-merge survivor counts as same);
--   * existing link, DIFFERENT  → KEEP the existing link, queue core.identity_audit
--                                 review_pending (party ids + a rule code only), and stamp the
--                                 staging row 'review' against the party it is really linked to.
-- Reversible: re-apply strangler/0001's migrate._record.

create or replace function migrate._record(p_system text, p_pk text, p_party uuid, p_res text)
returns void language plpgsql as $$
declare v_existing uuid;
begin
  insert into core.source_record(party_id, source_system, source_pk, source_payload)
    values (p_party, p_system, p_pk,
            (select raw from migrate.source_party where source_system=p_system and source_pk=p_pk))
    on conflict (source_system, source_pk) do nothing;

  select party_id into v_existing from core.source_record
    where source_system = p_system and source_pk = p_pk;

  if v_existing = p_party or migrate._golden(v_existing) = migrate._golden(p_party) then
    update migrate.source_party set resolved_party_id = p_party, resolution = p_res
      where source_system = p_system and source_pk = p_pk;
    return;
  end if;

  insert into core.identity_audit(action, party_id, other_party_id, confidence, reason)
    values ('review_pending', v_existing, p_party, 0.0,
            'D1_SOURCE_RECORD_CONFLICT: existing link kept; human adjudication required');
  update migrate.source_party set resolved_party_id = v_existing, resolution = 'review'
    where source_system = p_system and source_pk = p_pk;
end $$;
