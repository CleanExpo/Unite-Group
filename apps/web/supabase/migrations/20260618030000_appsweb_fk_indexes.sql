-- ============================================================
-- apps/web — covering indexes for unindexed foreign keys (performance)
--
-- Supabase performance advisors (18/06/2026) flagged FK columns without a covering
-- index → slow joins and slow ON DELETE cascades. This adds them for the non-
-- founder_id FKs. (founder_id FK indexes are in 20260618020000_appsweb_force_rls_
-- and_founder_indexes.sql — apply that too.)
--
-- Additive + idempotent. apps/web-owned tables only. Files-only / sandbox-first.
-- ============================================================

CREATE INDEX IF NOT EXISTS advisory_cases_approval_queue_id_idx ON public.advisory_cases(approval_queue_id);
CREATE INDEX IF NOT EXISTS approval_queue_business_id_idx ON public.approval_queue(business_id);
CREATE INDEX IF NOT EXISTS bookkeeper_email_receipts_matched_transaction_id_idx ON public.bookkeeper_email_receipts(matched_transaction_id);
CREATE INDEX IF NOT EXISTS bookkeeper_transactions_approval_queue_id_idx ON public.bookkeeper_transactions(approval_queue_id);
CREATE INDEX IF NOT EXISTS bookkeeper_transactions_approved_by_idx ON public.bookkeeper_transactions(approved_by);
CREATE INDEX IF NOT EXISTS cc_risks_project_id_idx ON public.cc_risks(project_id);
CREATE INDEX IF NOT EXISTS email_campaigns_generated_content_id_idx ON public.email_campaigns(generated_content_id);
CREATE INDEX IF NOT EXISTS experiments_approval_queue_id_idx ON public.experiments(approval_queue_id);
CREATE INDEX IF NOT EXISTS experiments_winner_variant_id_idx ON public.experiments(winner_variant_id);
CREATE INDEX IF NOT EXISTS generated_content_social_post_id_idx ON public.generated_content(social_post_id);
CREATE INDEX IF NOT EXISTS knowledge_notes_ingestion_batch_idx ON public.knowledge_notes(ingestion_batch);
CREATE INDEX IF NOT EXISTS platform_analytics_social_post_id_idx ON public.platform_analytics(social_post_id);
CREATE INDEX IF NOT EXISTS video_assets_generated_content_id_idx ON public.video_assets(generated_content_id);

-- DOWN / rollback: DROP INDEX IF EXISTS <each>;
