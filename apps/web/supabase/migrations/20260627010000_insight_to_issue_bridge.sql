-- Work→task bridge (B8): link a strategy insight to the Linear issue it spawned.
-- Founder-scoped, RLS-enforced, single-tenant. One issue per insight (1:1).
-- Records the acceptance criteria + evidence the issue was created with, so the
-- bridge feeds the autonomous claim loop (an issue needs an "Acceptance Criteria"
-- section to be claim-eligible — see src/lib/command-centre/linear-claim.ts).

CREATE TABLE IF NOT EXISTS public.strategy_insight_issues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id          uuid NOT NULL REFERENCES public.strategy_insights(id) ON DELETE CASCADE,
  linear_issue_id     text NOT NULL,              -- Linear identifier, e.g. SYN-123
  linear_issue_url    text,
  team_key            text NOT NULL,              -- Linear team key the issue was filed under
  acceptance_criteria text NOT NULL,
  evidence_ids        text[] NOT NULL DEFAULT '{}',
  autonomous          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- One Linear issue per insight.
CREATE UNIQUE INDEX IF NOT EXISTS strategy_insight_issues_insight_id_key
  ON public.strategy_insight_issues (insight_id);

CREATE INDEX IF NOT EXISTS strategy_insight_issues_founder_id_idx
  ON public.strategy_insight_issues (founder_id, created_at DESC);

ALTER TABLE public.strategy_insight_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_select" ON public.strategy_insight_issues
  FOR SELECT USING (founder_id = auth.uid());

CREATE POLICY "founder_insert" ON public.strategy_insight_issues
  FOR INSERT WITH CHECK (founder_id = auth.uid());

CREATE POLICY "founder_update" ON public.strategy_insight_issues
  FOR UPDATE USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

CREATE POLICY "founder_delete" ON public.strategy_insight_issues
  FOR DELETE USING (founder_id = auth.uid());
