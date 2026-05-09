-- Nexus Wave 1: agent_actions table
-- Every Margot→Board→PM→Orchestrator event is logged here
-- Board Mandate: Nexus Wave 1

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL DEFAULT 'margot'
                   CHECK (source IN ('margot', 'board', 'pm', 'orchestrator', 'hermes', 'system')),
  action_type      TEXT NOT NULL,
  payload          JSONB DEFAULT '{}',
  idea_text        TEXT,
  business_id      UUID REFERENCES public.businesses (id) ON DELETE SET NULL,
  client_id        UUID REFERENCES public.clients (id) ON DELETE SET NULL,
  linear_ticket_id TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'done', 'failed', 'cancelled')),
  parent_id        UUID REFERENCES public.agent_actions (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_status      ON public.agent_actions (status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_source      ON public.agent_actions (source);
CREATE INDEX IF NOT EXISTS idx_agent_actions_business_id ON public.agent_actions (business_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_client_id   ON public.agent_actions (client_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_parent_id   ON public.agent_actions (parent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at  ON public.agent_actions (created_at DESC);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_actions" ON public.agent_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read agent_actions" ON public.agent_actions
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.agent_actions IS
  'Audit log for every agent pipeline event: idea → research → board → PM → execution.
   parent_id links child actions (e.g. directive_issued children under an idea action).';
