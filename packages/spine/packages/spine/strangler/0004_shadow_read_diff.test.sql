-- Shadow-read diff test — PASS-verified on the Unite-Group Test sandbox 2026-06-09.
-- Run AFTER spine + seed + strangler/0001..0004, as a BYPASSRLS / service role.
-- Cleans up after itself (restores the pristine 7-party seed).

-- ── S1 clean parity + expected buckets: new org, clean person, role-email→new, role-email→review. ──
select migrate.enqueue('harness-s','s1','upsert', jsonb_build_object('kind','organization','display_name','Sierra Restoration','abn','88888888888'),'s1');
select migrate.enqueue('harness-s','s2','upsert', jsonb_build_object('kind','person','display_name','Sam Clean','email','sclean@s.test'),'s2');
select migrate.enqueue('harness-s','s3','upsert', jsonb_build_object('kind','person','display_name','Charlie Role','email','info@shared.test'),'s3');
select migrate.enqueue('harness-s','s4','upsert', jsonb_build_object('kind','person','display_name','Dana Role','email','info@shared.test'),'s4');
select count(*) from migrate.relay_batch('rA',100,'harness-s');
select count(*) from migrate.shadow_scan('harness-s');
select
  (select parity_ok from migrate.shadow_summary('harness-s'))            as parity_ok,        -- true
  (select value_diff from migrate.shadow_summary('harness-s'))           as value_diff,       -- 0
  (select missing_in_spine from migrate.shadow_summary('harness-s'))     as missing,          -- 0
  (select expected_role_email from migrate.shadow_summary('harness-s'))  as role_email,       -- 2 (s3,s4 emails nulled)
  (select expected_undermerge from migrate.shadow_summary('harness-s'))  as undermerge;       -- 0 (role-email review scoped to email; display compared normally — review #6)

-- ── S2 DETECTION PROOF: corrupt a clean 'new' row, rescan, gate flips false + exact field pinned. ──
update core.party set display_name='CORRUPTED'
  where party_id=(select party_id from core.source_record where source_system='harness-s' and source_pk='s2');
select count(*) from migrate.shadow_scan('harness-s');
update core.party set display_name='Sam Clean'
  where party_id=(select party_id from core.source_record where source_system='harness-s' and source_pk='s2');
select
  (select parity_ok from migrate.shadow_summary('harness-s'))   as parity_ok,   -- false
  (select value_diff from migrate.shadow_summary('harness-s'))  as value_diff,  -- 1
  (select count(*) from migrate.shadow_diff sd
     where sd.scan_id=(select scan_id from migrate.shadow_diff where source_system='harness-s' order by scanned_at desc limit 1)
       and sd.source_pk='s2' and sd.field='display_name'
       and sd.classification='value_diff' and not sd.is_expected) as pinned_exact;  -- 1

-- ── S3 extra_in_spine: a legacy row vanishes with no delete event; lineage remains. ──
delete from migrate.source_party where source_system='harness-s' and source_pk='s3';
select count(*) from migrate.shadow_scan('harness-s');
select
  (select extra_in_spine from migrate.shadow_summary('harness-s')) as extra,      -- 1
  (select parity_ok from migrate.shadow_summary('harness-s'))      as parity_ok;  -- false

-- ── S4 expected_merge_survivor: abn_merge survivor with a renamed legacy name; key still hard-compared. ──
select migrate.enqueue('harness-s4','m1','upsert', jsonb_build_object('kind','organization','display_name','Alpha Restoration RENAMED','abn','11111111111'),'m1');
select count(*) from migrate.relay_batch('rA',100,'harness-s4');
select count(*) from migrate.shadow_scan('harness-s4');
select
  (select resolution from migrate.source_party where source_system='harness-s4' and source_pk='m1') as resolution,  -- abn_merge
  (select expected_merge_survivor from migrate.shadow_summary('harness-s4'))  as survivor,     -- 1 (renamed display)
  (select value_diff from migrate.shadow_summary('harness-s4'))               as value_diff,   -- 0 (abn key matches)
  (select parity_ok from migrate.shadow_summary('harness-s4'))                as parity_ok;    -- true

-- ── S5 field-scoped review (review #6 proof): a conflicting-abn review expects ONLY the abn diff,
--    but a corrupted display_name on the SAME party is still caught (not blanket-suppressed). ──
select migrate.enqueue('harness-s5','c1','upsert', jsonb_build_object('kind','organization','display_name','Conflict Org','abn','55555555555'),'c1-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-s5');
select migrate.enqueue('harness-s5','c1','upsert', jsonb_build_object('kind','organization','display_name','Conflict Org','abn','66666666666'),'c1-v2'); -- conflicting → review
select count(*) from migrate.relay_batch('rA',100,'harness-s5');
update core.party set display_name='HIDDEN CORRUPT' where party_id=(select party_id from core.source_record where source_system='harness-s5' and source_pk='c1');
select count(*) from migrate.shadow_scan('harness-s5');
update core.party set display_name='Conflict Org' where party_id=(select party_id from core.source_record where source_system='harness-s5' and source_pk='c1');
select
  (select resolution from migrate.source_party where source_system='harness-s5' and source_pk='c1') as resolution,  -- review
  (select count(*) from migrate.shadow_diff sd
     where sd.scan_id=(select scan_id from migrate.shadow_diff where source_system='harness-s5' order by scanned_at desc limit 1)
       and sd.field='abn' and sd.classification='expected_undermerge')                              as abn_undermerge,   -- 1 (abn diff expected)
  (select count(*) from migrate.shadow_diff sd
     where sd.scan_id=(select scan_id from migrate.shadow_diff where source_system='harness-s5' order by scanned_at desc limit 1)
       and sd.field='display_name' and sd.classification='value_diff' and not sd.is_expected)       as display_caught,   -- 1 (corruption NOT hidden)
  (select parity_ok from migrate.shadow_summary('harness-s5'))                                       as parity_ok;        -- false

-- ── Cleanup: restore the pristine 7-party seed. ──
delete from core.identity_audit;
delete from migrate.shadow_diff;
delete from migrate.outbox_receipt;
delete from migrate.outbox_dead;
delete from migrate.outbox;
delete from core.source_record;
delete from migrate.source_party;
delete from core.party where party_id not in (select party_id from migrate.seed_party_ids);
