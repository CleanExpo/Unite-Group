-- 20260612110000_synthex_au_restoration_stack_strategy.sql
-- Strategy transfer: AU restoration stack (CARSI + RestoreAssist + DR-NRPG) into the Synthex agency wrapper.
-- This migration stages the strategy in the **businesses** + **nexus_clients** tables that actually exist
-- in the active 31-migration schema. Brand DNA + campaign plans are attached as JSONB on the existing rows
-- so Synthex's marketing pipeline can consume them without requiring a new table to be created.
--
-- Targets:
--   sandbox:  ref=xgqwfwqumliuguzhshwv (Unite-Group Test)
--   prod:     ref=lksfwktwtmyznckodsau (Unite-Group Prod) — promoted only after 24h Board quiet period
--
-- ROLLBACK: see the corresponding down-section at the bottom of this file.
--
-- Author: Margot (agent-drafted) / Phill (sign-off pending via 24h Board window)
-- Decision ref: docs/decisions/UNI-2062-au-restoration-stack-synthex-offerings.md

BEGIN;

-- 1. CARSI — record real product pricing + the renewal-cockpit P0 commitment as a brand_config payload.
--    Source: ~/CARSI/app/(public)/pricing/page.tsx (Foundation $44, Growth $99, org $795/yr) and
--            ~/CARSI/docs/PRODUCT_STRATEGY_CUSTOMER_FIRST_REVIEW.md (renewal cockpit P0).
UPDATE public.businesses
SET
  website_url = COALESCE(website_url, 'https://carsi.com.au'),
  arr_aud     = 0,   -- no paying subs yet, intentionally zero — first dollar pending
  brand_config = COALESCE(brand_config, '{}'::jsonb) || jsonb_build_object(
    'synthex_offering', jsonb_build_object(
      'product_key',        'carsi',
      'product_name',       'CARSI — IICRC Training Library',
      'product_type',       'b2c_subscription',
      'pricing_public',     jsonb_build_object(
        'foundation_usd_mo',  44,
        'growth_usd_mo',      99,
        'org_aud_yr',         795
      ),
      'first_dollar_path',  'renewal_cockpit_subscription',
      'p0_backlog',          'renewal_cockpit_p0',
      'p1_backlog',          'employer_proof_pack_p1',
      'industry_pages_live', 8,
      'checkout_status',     'live_stripe',
      'audit_report_ref',    'unite-group/.hermes/income-stack/AUDIT-REPORT.md',
      'offer_doc_ref',       'unite-group/.hermes/income-stack/OFFER-CARSI.md',
      'updated_at',          NOW()
    )
  )
WHERE slug = 'carsi';

-- 2. RestoreAssist — record the $79/tech/mo anchor, the 56 prod orgs, and the P0 RLS gap.
--    Source: ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md (56 orgs, 51 invites, RLS gap on 119/180 tables)
--            and Fork 7 wiki charter ($79/tech/mo recommended).
UPDATE public.businesses
SET
  website_url = COALESCE(website_url, 'https://restoreassist.app'),
  arr_aud     = 0,
  brand_config = COALESCE(brand_config, '{}'::jsonb) || jsonb_build_object(
    'synthex_offering', jsonb_build_object(
      'product_key',       'restoreassist',
      'product_name',      'RestoreAssist — AU Water-Damage Compliance',
      'product_type',      'b2b_subscription',
      'pricing_public',    jsonb_build_object(
        'per_tech_usd_mo', 79
      ),
      'first_dollar_path', 'pilot_beyond_clean_soft_pilot_RA_1723',
      'p0_blocker',        'rls_disabled_on_119_of_180_prod_tables',
      'p0_ticket',         'RA-4956_production_go_live_gate',
      'pilot_runbook',     'docs/PILOT_CUTOVER_CHECKLIST.md',
      'prod_state',        jsonb_build_object(
        'users',            72,
        'organizations',    56,
        'invites_pending',  51,
        'cron_runs_total',  12703
      ),
      'audit_report_ref',  'unite-group/.hermes/income-stack/AUDIT-REPORT.md',
      'offer_doc_ref',     'unite-group/.hermes/income-stack/OFFER-RESTOREASSIST.md',
      'xero_eofy_deadline', '2026-06-30',
      'updated_at',        NOW()
    )
  )
WHERE slug = 'restore';

-- 3. DR-NRPG — record the population-tiered pricing and the draft-and-pending recruitment email.
--    Source: ~/DR-NRPG/AGENTS.md (tier model) and
--            ~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EMAIL-BATCH.md (campaign drafted, not sent).
UPDATE public.businesses
SET
  website_url = COALESCE(website_url, 'https://disasterrecovery.com.au'),
  arr_aud     = 0,
  brand_config = COALESCE(brand_config, '{}'::jsonb) || jsonb_build_object(
    'synthex_offering', jsonb_build_object(
      'product_key',       'dr-nrpg',
      'product_name',      'DR-NRPG — Restoration Contractor Marketplace',
      'product_type',      'b2b_subscription_marketplace',
      'pricing_public',    jsonb_build_object(
        'rural_aud_mo',       395,
        'semi_rural_aud_mo',  595,
        'tier1_aud_mo',       795,
        'tier2_aud_mo',       995,
        'tier3_aud_mo',       1095
      ),
      'first_dollar_path', 'send_drafted_recruitment_email_batch_20_recipients',
      'send_script',       'scripts/send-contractor-recruitment-emails.ts',
      'send_status',       'drafted_not_sent',
      'contact_model',     'online_forms_only_no_phone',
      'support_email',     'support@disasterrecovery.com.au',
      'tests_passing',     '151/151',
      'code_completeness', '95_percent_per_readme',
      'audit_report_ref',  'unite-group/.hermes/income-stack/AUDIT-REPORT.md',
      'offer_doc_ref',     'unite-group/.hermes/income-stack/OFFER-NRPG.md',
      'updated_at',        NOW()
    )
  )
WHERE slug = 'nrpg';

-- 4. Synthex — register the AU restoration stack as one of Synthex's agency offerings.
--    The agency owns the cross-product positioning, the lead funnel, and the campaign calendar.
--    Per the constitution, Synthex is an internal approval/scheduling route — this update is therefore
--    metadata on the existing internal business row, not a new public surface.
UPDATE public.businesses
SET
  brand_config = COALESCE(brand_config, '{}'::jsonb) || jsonb_build_object(
    'agency_offerings', jsonb_build_object(
      'au_restoration_stack', jsonb_build_object(
        'wraps',  jsonb_build_array('carsi', 'restoreassist', 'dr-nrpg'),
        'positioning', 'Full-service digital marketing agency for the AU restoration vertical. Cross-product brand DNA, unified lead funnel, employer + contractor + technician go-to-market.',
        'funnel', jsonb_build_object(
          'top',    'carsi_individual_tech_subscription',
          'middle', 'restoreassist_company_compliance',
          'base',   'nrpg_contractor_marketplace'
        ),
        'campaigns_open', jsonb_build_array(
          'CARSI renewal cockpit launch',
          'RestoreAssist Beyond Clean pilot outreach',
          'NRPG recruitment send (20 recipients)'
        ),
        'experiments_queued', jsonb_build_array(
          'CARSI Foundation → Growth conversion test (target +125% ARPU)',
          'RestoreAssist RA→CARSI cross-promo (target +30 trials per 100 RA users)',
          'NRPG Tier 1 metro acceptance test (target 5 Tier 1 sign-ups in 30 days)'
        ),
        'first_dollar_target', '30_days',
        'board_decision_doc',  'docs/decisions/UNI-2062-au-restoration-stack-synthex-offerings.md',
        'updated_at',          NOW()
      )
    )
  )
WHERE slug = 'synthex';

-- 5. Append a single client_approvals row so the strategy transfer has a signed-hash audit trail
--    (mirrors the existing pattern in 20260514142500_client_approvals.sql). When Phill approves,
--    the approval row is updated to status='approved' with approver_ip and signature_hash.
INSERT INTO public.client_approvals (
  client_slug,
  deliverable_id,
  deliverable_title,
  deliverable_body,
  token,
  expires_at,
  status,
  notified_email,
  notified_at
) VALUES (
  'unite-group',
  'au-restoration-stack-strategy',
  'AU Restoration Stack → Synthex Agency Wrapping',
  'Three-product stack (CARSI Foundation $44/mo + Growth $99/mo, RestoreAssist $79/tech/mo, DR-NRPG $395-$1,095/mo) wrapped under Synthex as the agency. Includes cross-product lead funnel, three queued campaigns, three queued experiments, audit-report and offer-doc refs on each product row. 24h auto-promote window per Board decision UNI-2062.',
  encode(gen_random_bytes(32), 'hex'),
  NOW() + INTERVAL '7 days',
  'pending',
  'phill@unitenetworks.com.au',
  NOW()
);

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (down-section). Run only via the wizard promote --rollback flow.
-- ════════════════════════════════════════════════════════════════════════════
--
-- BEGIN;
--   UPDATE public.businesses SET brand_config = brand_config - 'synthex_offering' WHERE slug IN ('carsi','restore','nrpg');
--   UPDATE public.businesses SET brand_config = brand_config - 'agency_offerings'  WHERE slug = 'synthex';
--   DELETE FROM public.client_approvals WHERE deliverable_id = 'au-restoration-stack-strategy' AND status = 'pending';
-- COMMIT;
