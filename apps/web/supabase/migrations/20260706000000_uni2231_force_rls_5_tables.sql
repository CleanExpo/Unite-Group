-- UNI-2231 — FORCE ROW LEVEL SECURITY on the 5 tables added since the
-- 20260618020000 batch force-RLS sweep (which predates them and doesn't
-- cover them): brand_video_jobs, strategy_insight_issues, provider_accounts,
-- provider_quota_events, operator_agent_presence.
--
-- All 5 already have ENABLE ROW LEVEL SECURITY + a full policy set from their
-- own creation migrations (20260627000000, 20260627010000, 20260623000000,
-- 20260626060000) — confirmed by reading each file. FORCE does NOT affect
-- service_role (BYPASSRLS) or existing session policies; it only closes the
-- table-OWNER bypass gap, per .claude/rules/database/supabase.md and the
-- precedent comment in 20260618020000_appsweb_force_rls_and_founder_indexes.sql.
-- No new policies needed — additive, idempotent, touches only these 5 tables.
--
-- NOT applied. Sandbox-first per CLAUDE.md: validated offline against a
-- throwaway Postgres (docker) — see Linear UNI-2231 comment for the transcript.
-- Apply to prod (lksfwktwtmyznckodsau) via the SQL editor — founder-gated, never autonomous.

ALTER TABLE public.brand_video_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_insight_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quota_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.operator_agent_presence FORCE ROW LEVEL SECURITY;

-- DOWN / rollback
-- ALTER TABLE public.brand_video_jobs NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.strategy_insight_issues NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.provider_accounts NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.provider_quota_events NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.operator_agent_presence NO FORCE ROW LEVEL SECURITY;
