-- Staged prod deploy for B8 (work→task bridge) — apply to prod (lksfwktwtmyznckodsau)
-- after `supabase login`, OR via the migration rebaseline once it lands.
-- Mirrors apps/web/supabase/migrations/20260627010000_insight_to_issue_bridge.sql.
-- Idempotent: safe to run more than once. Owner-applied only (migration history is
-- diverged/non-replayable — see docs/specs/sql/2026-06-27-migration-rebaseline-runbook.md).

CREATE TABLE IF NOT EXISTS public.strategy_insight_issues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id          uuid NOT NULL REFERENCES public.strategy_insights(id) ON DELETE CASCADE,
  linear_issue_id     text NOT NULL,
  linear_issue_url    text,
  team_key            text NOT NULL,
  acceptance_criteria text NOT NULL,
  evidence_ids        text[] NOT NULL DEFAULT '{}',
  autonomous          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS strategy_insight_issues_insight_id_key
  ON public.strategy_insight_issues (insight_id);

CREATE INDEX IF NOT EXISTS strategy_insight_issues_founder_id_idx
  ON public.strategy_insight_issues (founder_id, created_at DESC);

ALTER TABLE public.strategy_insight_issues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_insight_issues' AND policyname = 'founder_select') THEN
    CREATE POLICY "founder_select" ON public.strategy_insight_issues FOR SELECT USING (founder_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_insight_issues' AND policyname = 'founder_insert') THEN
    CREATE POLICY "founder_insert" ON public.strategy_insight_issues FOR INSERT WITH CHECK (founder_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_insight_issues' AND policyname = 'founder_update') THEN
    CREATE POLICY "founder_update" ON public.strategy_insight_issues FOR UPDATE USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'strategy_insight_issues' AND policyname = 'founder_delete') THEN
    CREATE POLICY "founder_delete" ON public.strategy_insight_issues FOR DELETE USING (founder_id = auth.uid());
  END IF;
END $$;

-- Verify (read-only):
--   select to_regclass('public.strategy_insight_issues');
--   select policyname from pg_policies where tablename = 'strategy_insight_issues';
