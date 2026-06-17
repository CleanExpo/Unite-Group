-- ============================================================
-- apps/web table-editor enhancements — FORCE RLS + founder_id indexes
--
-- Read-only audit (18/06/2026) of the 57 apps/web-owned tables on prod
-- (lksfwktwtmyznckodsau) found: RLS enabled on all, but FORCE RLS off on all,
-- and 10 founder-scoped tables without a founder_id index.
--
-- This aligns them with .claude/rules/database/supabase.md (which mandates both
-- ENABLE and FORCE row level security). FORCE RLS does NOT affect service_role
-- (it has BYPASSRLS) or the existing session policies — it only closes the
-- table-OWNER bypass gap. Additive + idempotent; touches ONLY apps/web tables,
-- never other products' tables on this shared DB.
--
-- NOT applied. Sandbox-first per CLAUDE.md: validate on a Supabase branch → prod.
-- ============================================================

-- ── Part 1: FORCE RLS on every apps/web-owned table (defence-in-depth) ──
-- service_role (BYPASSRLS) is unaffected; session users are already policy-bound.
-- This only closes the table-OWNER bypass gap, per .claude/rules/database/supabase.md.
ALTER TABLE public.advisory_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_judge_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_file_cache FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_file_transcripts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.approval_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookkeeper_email_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookkeeper_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookkeeper_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.brand_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_agents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_brand_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_evidence_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_execution_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_risks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_task_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_tools FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cc_validation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.connected_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credentials_vault FORCE ROW LEVEL SECURITY;
ALTER TABLE public.drip_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.experiments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content FORCE ROW LEVEL SECURITY;
ALTER TABLE public.hub_satellites FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_voice_packets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_databases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_pages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_rows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pi_run_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics FORCE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_dispatches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.skill_health FORCE ROW LEVEL SECURITY;
ALTER TABLE public.social_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.social_engagements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_insight_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_insights FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_provisioning_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.video_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;

-- ── Part 2: founder_id indexes where missing (query performance) ──
CREATE INDEX IF NOT EXISTS advisory_evidence_founder_id_idx ON public.advisory_evidence(founder_id);
CREATE INDEX IF NOT EXISTS advisory_judge_scores_founder_id_idx ON public.advisory_judge_scores(founder_id);
CREATE INDEX IF NOT EXISTS advisory_proposals_founder_id_idx ON public.advisory_proposals(founder_id);
CREATE INDEX IF NOT EXISTS cc_approvals_founder_id_idx ON public.cc_approvals(founder_id);
CREATE INDEX IF NOT EXISTS cc_brand_rules_founder_id_idx ON public.cc_brand_rules(founder_id);
CREATE INDEX IF NOT EXISTS cc_execution_sessions_founder_id_idx ON public.cc_execution_sessions(founder_id);
CREATE INDEX IF NOT EXISTS cc_validation_runs_founder_id_idx ON public.cc_validation_runs(founder_id);
CREATE INDEX IF NOT EXISTS coach_reports_founder_id_idx ON public.coach_reports(founder_id);
CREATE INDEX IF NOT EXISTS experiment_results_founder_id_idx ON public.experiment_results(founder_id);
CREATE INDEX IF NOT EXISTS experiment_variants_founder_id_idx ON public.experiment_variants(founder_id);

-- NOTE (reviewed, intentionally NOT changed): these founder tables have no
-- UPDATE/DELETE policy by design — they are append-only event / audit / capture
-- logs: cc_task_events, cc_evidence_records, cc_validation_runs, cc_approvals,
-- cc_decisions (audit); knowledge_batches, mobile_voice_packets, pi_run_queue
-- (no row deletion). Adding write policies would be incorrect.
--
-- NOTE: 13 apps/web tables have no founder_id column and scope via user_id /
-- parent FK / are system-global (campaigns, drip_campaigns, nexus_*, social_*,
-- stripe_*, team_members, webhook_events, connected_projects,
-- strategy_insight_comments). Left for a separate scoping review — not assumed
-- broken.

-- DOWN / rollback (FORCE RLS)
-- ALTER TABLE public.advisory_cases NO FORCE ROW LEVEL SECURITY;  -- (repeat per table)
-- DROP INDEX IF EXISTS advisory_evidence_founder_id_idx;          -- (repeat per index)
