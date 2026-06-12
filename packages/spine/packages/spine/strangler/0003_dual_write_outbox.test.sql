-- Dual-write outbox + idempotency test — PASS-verified on the Unite-Group Test sandbox 2026-06-09.
-- Run AFTER spine + seed + strangler/0001_resolver.sql (+0002) + 0003_dual_write_outbox.sql,
-- as a BYPASSRLS / service role. Cleans up after itself (restores the pristine 7-party seed).
-- Each block prints an assertion row; the expected value is in the trailing comment.

-- ── T1 orphan-trap: key-less upsert, dedup-collapsed, plus a no-dedup re-delivery → exactly-once. ──
select migrate.enqueue('harness-t1','k1','upsert', jsonb_build_object('kind','person','display_name','Keyless Kim'),'k1-v1');
select migrate.enqueue('harness-t1','k1','upsert', jsonb_build_object('kind','person','display_name','Keyless Kim'),'k1-v1');  -- collapses
select count(*) from migrate.relay_batch('rA',100,'harness-t1');
select migrate.enqueue('harness-t1','k1','upsert', jsonb_build_object('kind','person','display_name','Keyless Kim'),null);     -- at-least-once
select count(*) from migrate.relay_batch('rA',100,'harness-t1');
select
  (select count(*) from migrate.outbox where source_system='harness-t1')                              as outbox_rows,      -- 2
  (select count(*) from migrate.outbox_receipt r join migrate.outbox o on o.event_id=r.event_id
     where o.source_system='harness-t1')                                                              as receipts,         -- 2
  (select count(*) from core.source_record where source_system='harness-t1' and source_pk='k1')      as source_records,   -- 1
  (select count(distinct party_id) from core.source_record where source_system='harness-t1' and source_pk='k1') as parties, -- 1
  (select orphan_parties from migrate.shadow_summary('harness-t1'))                                   as orphans;          -- 0

-- ── T2 update reconcile in place: corrected email, no new party, no audit. ──
select migrate.enqueue('harness-t2','p1','upsert', jsonb_build_object('kind','person','display_name','Nate North','email','nate@x.test'),'p1-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t2');
select migrate.enqueue('harness-t2','p1','upsert', jsonb_build_object('kind','person','display_name','Nathan North','email','nathan@x.test'),'p1-v2');
select count(*) from migrate.relay_batch('rA',100,'harness-t2');
select
  (select count(distinct party_id) from core.source_record where source_system='harness-t2')          as parties,        -- 1
  (select pe.email from core.person pe join core.source_record sr on sr.party_id=pe.party_id where sr.source_system='harness-t2') as email, -- nathan@x.test
  (select resolution from migrate.source_party where source_system='harness-t2' and source_pk='p1')   as resolution,     -- updated_email
  (select count(*) from core.party_identifier pi join core.source_record sr on sr.party_id=pi.party_id
     where sr.source_system='harness-t2' and pi.scheme='email')                                       as email_ids;      -- 2 (nate kept)

-- ── T3 promote-merge: org resolved 'new', a late ABN matching seed Alpha → controlled merge. ──
select migrate.enqueue('harness-t3','o1','upsert', jsonb_build_object('kind','organization','display_name','Late Alpha'),'o1-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t3');
select migrate.enqueue('harness-t3','o1','upsert', jsonb_build_object('kind','organization','display_name','Late Alpha','abn','11111111111'),'o1-v2');
select count(*) from migrate.relay_batch('rA',100,'harness-t3');
select
  (select party_id from core.source_record where source_system='harness-t3' and source_pk='o1')       as party,        -- Alpha 0a..0001
  (select resolution from migrate.source_party where source_system='harness-t3' and source_pk='o1')   as resolution,   -- promoted_abn_merge
  (select count(*) from core.identity_audit where action='merge' and decided_by='auto')               as merge_audits, -- 1
  (select count(*) from core.party where golden_party_id='0a000000-0000-0000-0000-000000000001'
     and is_active=false)                                                                             as tombstones;   -- 1

-- ── T4 concurrency drain: 50 events / 10 keys, two relayers, exactly-once + convergence. ──
select migrate.enqueue('harness-t4','k'||(g%10),'upsert',
   jsonb_build_object('kind','person','display_name','P'||(g%10),'email','p'||(g%10)||'@t4.test'),'t4-'||g)
from generate_series(0,49) g;
select count(*) from migrate.relay_batch('rA',25,'harness-t4');
select count(*) from migrate.relay_batch('rB',100,'harness-t4');
select
  (select count(*) from migrate.outbox_receipt r join migrate.outbox o on o.event_id=r.event_id
     where o.source_system='harness-t4')                                                              as receipts,       -- 50
  (select count(*) from migrate.outbox where source_system='harness-t4' and status<>'done')           as not_done,       -- 0
  (select max(c) from (select count(distinct party_id) c from core.source_record
     where source_system='harness-t4' group by source_pk) z)                                          as max_per_key,    -- 1
  (select missing from migrate.coverage('harness-t4'))                                                 as coverage_miss,  -- 0
  (select orphan_parties from migrate.shadow_summary('harness-t4'))                                    as orphans;        -- 0
-- NOTE: true wall-clock concurrency cannot be forced through a single connection; the skip-locked claim
-- + per-entity ordering guard + receipt PK make it correct by construction (verified here for drain
-- correctness). A two-session race test belongs in the CI vitest harness with real connections.

-- ── T5 poison → dead-letter; a good event on the same system still drains; gate stays RED. ──
select migrate.enqueue('harness-t5','bad1','upsert', jsonb_build_object('kind','bogus','display_name','Poison'),'bad1');
update migrate.outbox set max_attempts=1 where source_system='harness-t5' and source_pk='bad1';
select migrate.enqueue('harness-t5','good1','upsert', jsonb_build_object('kind','person','display_name','Good','email','good@x.test'),'good1');
select count(*) from migrate.relay_batch('rA',100,'harness-t5');
select
  (select count(*) from migrate.outbox_dead where source_system='harness-t5')                          as dead,        -- 1
  (select status from migrate.outbox where source_system='harness-t5' and source_pk='bad1')            as bad_status,  -- dead
  (select status from migrate.outbox where source_system='harness-t5' and source_pk='good1')           as good_status, -- done
  (select dead_events from migrate.shadow_summary('harness-t5'))                                        as summary_dead,-- 1
  (select parity_ok from migrate.shadow_summary('harness-t5'))                                          as parity_ok;   -- false

-- ── T6 idempotent delete (twice): soft-deactivate survivor; second delete is a no-op. ──
select migrate.enqueue('harness-t6','d1','upsert', jsonb_build_object('kind','person','display_name','Delete Me','email','delme@x.test'),'d1-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t6');
select migrate.enqueue('harness-t6','d1','delete','{}'::jsonb,'d1-del1');
select count(*) from migrate.relay_batch('rA',100,'harness-t6');
select migrate.enqueue('harness-t6','d1','delete','{}'::jsonb,'d1-del2');
select count(*) from migrate.relay_batch('rA',100,'harness-t6');
select
  (select count(*) from core.source_record where source_system='harness-t6' and source_pk='d1')        as source_records,  -- 0
  (select p.is_active from core.person pe join core.party p on p.party_id=pe.party_id where pe.email='delme@x.test') as active, -- false
  (select r.resolution from migrate.outbox_receipt r join migrate.outbox o on o.event_id=r.event_id
     where o.source_system='harness-t6' and o.dedup_key='d1-del2')                                      as redeliver_res,   -- delete_noop
  (select orphan_parties from migrate.shadow_summary('harness-t6'))                                     as orphans;         -- 0

-- ── T7 coverage parity via the outbox path (incl. an is_test row that must be skipped). ──
select migrate.enqueue('harness-t7','c1','upsert', jsonb_build_object('kind','organization','display_name','Org C1','abn','77777777777'),'c1');
select migrate.enqueue('harness-t7','c2','upsert', jsonb_build_object('kind','person','display_name','Person C2','email','c2@x.test'),'c2');
select migrate.enqueue('harness-t7','c3','upsert', jsonb_build_object('kind','person','display_name','Test Row','is_test',true),'c3');
select count(*) from migrate.relay_batch('rA',100,'harness-t7');
select
  (select missing from migrate.coverage('harness-t7'))                                                 as coverage_miss,   -- 0
  (select total_non_test from migrate.coverage('harness-t7'))                                           as total_nontest,   -- 2
  (select resolution from migrate.source_party where source_system='harness-t7' and source_pk='c3')     as testrow_res;     -- skipped_test

-- ── T8 resurrection: keyless person delete then re-upsert → SAME party revived, no identity split. ──
select migrate.enqueue('harness-t8','r1','upsert', jsonb_build_object('kind','person','display_name','Resurrect Rita'),'r1-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t8');
select migrate.enqueue('harness-t8','r1','delete','{}'::jsonb,'r1-del');
select count(*) from migrate.relay_batch('rA',100,'harness-t8');
select migrate.enqueue('harness-t8','r1','upsert', jsonb_build_object('kind','person','display_name','Resurrect Rita'),'r1-v2');
select count(*) from migrate.relay_batch('rA',100,'harness-t8');
select
  (select count(*) from core.party where display_name='Resurrect Rita'
     and party_id not in (select party_id from migrate.seed_party_ids))                        as rita_parties,    -- 1 (no split)
  (select p.is_active from core.party p join core.source_record sr on sr.party_id=p.party_id
     where sr.source_system='harness-t8' and sr.source_pk='r1')                                as revived_active,  -- true
  (select orphan_parties from migrate.shadow_summary('harness-t8'))                            as orphans;         -- 0

-- ── T9 conflicting ABN → review (never auto-merge an established org). ──
select migrate.enqueue('harness-t9','o2','upsert', jsonb_build_object('kind','organization','display_name','Org O2','abn','33333333333'),'o2-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t9');
select migrate.enqueue('harness-t9','o2','upsert', jsonb_build_object('kind','organization','display_name','Org O2','abn','11111111111'),'o2-v2'); -- Alpha's abn
select count(*) from migrate.relay_batch('rA',100,'harness-t9');
select
  (select resolution from migrate.source_party where source_system='harness-t9' and source_pk='o2')             as resolution,  -- review
  (select abn from core.organization where party_id=
     (select party_id from core.source_record where source_system='harness-t9' and source_pk='o2'))             as kept_abn,    -- 33333333333 (unchanged)
  (select count(*) from core.party where golden_party_id='0a000000-0000-0000-0000-000000000001' and is_active=false) as alpha_merged, -- 0 (Alpha untouched)
  (select count(*) from core.identity_audit where action='review_pending' and reason like 'conflicting abn%')  as review_audits; -- 1

-- ── T10 edited merge-survivor stays parity-green (sticky merge marker survives a later edit). ──
select migrate.enqueue('harness-t10','m2','upsert', jsonb_build_object('kind','organization','display_name','Alpha Clone','abn','11111111111'),'m2-v1');
select count(*) from migrate.relay_batch('rA',100,'harness-t10');
select migrate.enqueue('harness-t10','m2','upsert', jsonb_build_object('kind','organization','display_name','Alpha Clone EDITED','abn','11111111111'),'m2-v2');
select count(*) from migrate.relay_batch('rA',100,'harness-t10');
select count(*) from migrate.shadow_scan('harness-t10');
select
  (select resolution from migrate.source_party where source_system='harness-t10' and source_pk='m2') as resolution, -- abn_merge (sticky)
  (select value_diff from migrate.shadow_summary('harness-t10'))                                      as value_diff, -- 0
  (select parity_ok from migrate.shadow_summary('harness-t10'))                                       as parity_ok;  -- true

-- ── Cleanup: restore the pristine 7-party seed. ──
delete from core.identity_audit;
delete from migrate.shadow_diff;
delete from migrate.outbox_receipt;
delete from migrate.outbox_dead;
delete from migrate.outbox;
delete from core.source_record;
delete from migrate.source_party;
delete from core.party where party_id not in (select party_id from migrate.seed_party_ids);
