-- Strangler resolver test — the C5 "dangerous merge" cases. PASS-verified on the sandbox 2026-06-09.
-- Run AFTER the spine + seed + strangler/0001_resolver.sql, as a BYPASSRLS/service role.
-- Cleans up after itself (restores the pristine 7-party seed).

insert into migrate.source_party (source_system, source_pk, kind, abn, email, display_name, is_test) values
 ('restoreassist-prod','ra-1','organization','11111111111', null,                'Alpha Restoration', false),  -- ABN hard-merge → org A
 ('restoreassist-prod','ra-2','person',       null,         'ALICE@alpha.test',  'Alice Alpha',       false),  -- dirty-email merge → Alice
 ('restoreassist-prod','ra-3','person',       null,         'info@shared.test',  'Charlie Cleanup',   false),  -- role email, 1st → new
 ('restoreassist-prod','ra-4','person',       null,         'info@shared.test',  'Dana Dry',          false),  -- role email, 2nd → review (under-merge)
 ('restoreassist-prod','ra-5','organization','55555555555', null,                'Echo Restoration',  false),  -- new org
 ('restoreassist-prod','ra-6','person',       null,         null,                'Test User',         true)    -- test row → skipped
on conflict do nothing;

select * from migrate.backfill('restoreassist-prod');

-- ASSERTIONS (all must hold):
--   orgs with abn 11111111111            = 1   (ra-1 merged, no duplicate)
--   persons with email alice@alpha.test  = 1   (ra-2 merged, no duplicate)
--   ra-1 resolution = abn_merge, ra-2 = email_merge, ra-4 = review
--   distinct parties for ra-3,ra-4       = 2   (NO over-merge of two contractors sharing a role email)
--   identity_audit review_pending        = 1   (Dana queued for human adjudication; bias to under-merge)
--   source_record for ra-6 (is_test)     = 0   (test data excluded)
--   migrate.coverage(...).missing        = 0   (every non-test row → exactly one source_record)
select
  (select count(*) from core.organization where abn='11111111111')                              as orgs_abn_alpha,
  (select count(*) from core.person where lower(email)='alice@alpha.test')                       as alice_persons,
  (select resolution from migrate.source_party where source_pk='ra-1')                           as ra1_resolution,
  (select resolution from migrate.source_party where source_pk='ra-2')                           as ra2_resolution,
  (select resolution from migrate.source_party where source_pk='ra-4')                           as ra4_resolution,
  (select count(distinct party_id) from core.source_record where source_system='restoreassist-prod' and source_pk in ('ra-3','ra-4')) as charlie_dana_distinct,
  (select count(*) from core.identity_audit where action='review_pending')                       as review_pending,
  (select count(*) from core.source_record where source_system='restoreassist-prod' and source_pk='ra-6') as test_row_migrated,
  (select missing from migrate.coverage('restoreassist-prod'))                                   as coverage_missing;

-- cleanup (restore pristine seed): order matters — clear identity_audit before its parties.
delete from core.identity_audit where action='review_pending';
delete from core.party where party_id in (
  select resolved_party_id from migrate.source_party
  where source_system='restoreassist-prod' and resolution in ('new','review') and resolved_party_id is not null);
delete from core.source_record where source_system='restoreassist-prod';
delete from migrate.source_party where source_system='restoreassist-prod';
