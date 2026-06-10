-- Authority Intelligence structured records for Nexus Command Center
-- Sandbox-first: apply through scripts/sandbox-wizard.sh before any prod promotion.
-- Purpose: turn the 2nd Brain/wiki Authority Intelligence wrapper into queryable Nexus objects.

CREATE TABLE IF NOT EXISTS public.authority_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'publisher'
    CHECK (owner_type IN ('regulator', 'association', 'publisher', 'community', 'vendor', 'dataset', 'event', 'internal')),
  sector TEXT NOT NULL DEFAULT 'cross-sector',
  use_case TEXT NOT NULL DEFAULT 'signal'
    CHECK (use_case IN ('signal', 'citation', 'trend', 'community', 'compliance', 'market', 'benchmark', 'learning')),
  cadence TEXT NOT NULL DEFAULT 'weekly'
    CHECK (cadence IN ('daily', 'weekly', 'monthly', 'ad_hoc')),
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 18),
  extraction_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (url, sector)
);

CREATE TABLE IF NOT EXISTS public.authority_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.authority_sources(id) ON DELETE SET NULL,
  wiki_page_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  sector TEXT NOT NULL DEFAULT 'cross-sector',
  audience TEXT NOT NULL DEFAULT 'Australian trade SMB owners',
  signal_type TEXT NOT NULL DEFAULT 'opportunity'
    CHECK (signal_type IN ('opportunity', 'risk', 'content', 'community', 'product', 'learning', 'compliance')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'drafted', 'approved', 'published', 'archived', 'rejected')),
  materiality_score INTEGER NOT NULL DEFAULT 0 CHECK (materiality_score BETWEEN 0 AND 100),
  exit_leverage TEXT NOT NULL DEFAULT 'medium' CHECK (exit_leverage IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_gate TEXT NOT NULL DEFAULT 'human_approval_required',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authority_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.authority_signals(id) ON DELETE SET NULL,
  wiki_page_id TEXT,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('white_paper', 'blog', 'social_pack', 'reddit_draft', 'checklist', 'report', 'image_brief', 'synthex_campaign', 'owner_action_brief')),
  title TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'Australian trade SMB owners',
  sector TEXT NOT NULL DEFAULT 'cross-sector',
  status TEXT NOT NULL DEFAULT 'draft_for_review'
    CHECK (status IN ('draft_for_review', 'approved', 'scheduled', 'published', 'archived', 'rejected')),
  evidence_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  unsafe_claims_removed JSONB NOT NULL DEFAULT '[]'::jsonb,
  distribution_route TEXT NOT NULL DEFAULT 'human_review',
  approval_gate TEXT NOT NULL DEFAULT 'human_approval_required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authority_learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.authority_signals(id) ON DELETE SET NULL,
  learner TEXT NOT NULL
    CHECK (learner IN ('founder', 'senior_pm', 'senior_researcher', 'trade_owner', 'client', 'agent', 'sector_operator')),
  mission TEXT NOT NULL,
  current_level TEXT NOT NULL DEFAULT 'working' CHECK (current_level IN ('beginner', 'working', 'advanced', 'expert')),
  zpd_next_step TEXT NOT NULL,
  lesson JSONB NOT NULL DEFAULT '{}'::jsonb,
  reusable_asset JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_gate TEXT NOT NULL DEFAULT 'human_approval_required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authority_routing_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.authority_signals(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.authority_assets(id) ON DELETE SET NULL,
  board_mandate_id UUID REFERENCES public.board_mandates(id) ON DELETE SET NULL,
  route_to TEXT NOT NULL
    CHECK (route_to IN ('Senior PM', 'Senior Researcher', 'Synthex', 'Unite-Hub', 'Pi-CEO Board', 'human approval')),
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'failed', 'cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authority_sources_sector ON public.authority_sources (sector);
CREATE INDEX IF NOT EXISTS idx_authority_sources_active ON public.authority_sources (active);
CREATE INDEX IF NOT EXISTS idx_authority_signals_status ON public.authority_signals (status);
CREATE INDEX IF NOT EXISTS idx_authority_signals_detected_at ON public.authority_signals (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_signals_sector ON public.authority_signals (sector);
CREATE INDEX IF NOT EXISTS idx_authority_assets_status ON public.authority_assets (status);
CREATE INDEX IF NOT EXISTS idx_authority_assets_created_at ON public.authority_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_learning_records_created_at ON public.authority_learning_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_routing_actions_status ON public.authority_routing_actions (status);

ALTER TABLE public.authority_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_routing_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on authority_sources" ON public.authority_sources;
CREATE POLICY "Service role full access on authority_sources" ON public.authority_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated read authority_sources" ON public.authority_sources;
CREATE POLICY "Authenticated read authority_sources" ON public.authority_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access on authority_signals" ON public.authority_signals;
CREATE POLICY "Service role full access on authority_signals" ON public.authority_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated read authority_signals" ON public.authority_signals;
CREATE POLICY "Authenticated read authority_signals" ON public.authority_signals
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access on authority_assets" ON public.authority_assets;
CREATE POLICY "Service role full access on authority_assets" ON public.authority_assets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated read authority_assets" ON public.authority_assets;
CREATE POLICY "Authenticated read authority_assets" ON public.authority_assets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access on authority_learning_records" ON public.authority_learning_records;
CREATE POLICY "Service role full access on authority_learning_records" ON public.authority_learning_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated read authority_learning_records" ON public.authority_learning_records;
CREATE POLICY "Authenticated read authority_learning_records" ON public.authority_learning_records
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access on authority_routing_actions" ON public.authority_routing_actions;
CREATE POLICY "Service role full access on authority_routing_actions" ON public.authority_routing_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated read authority_routing_actions" ON public.authority_routing_actions;
CREATE POLICY "Authenticated read authority_routing_actions" ON public.authority_routing_actions
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.authority_sources IS 'Governed source registry for Nexus Authority Intelligence.';
COMMENT ON TABLE public.authority_signals IS 'Triaged opportunities, risks, content leads and learning signals generated by Authority Intelligence.';
COMMENT ON TABLE public.authority_assets IS 'Draft and approved authority assets routed to Synthex, Unite-Hub, the 2nd Brain, client portals or human review.';
COMMENT ON TABLE public.authority_learning_records IS 'Teach-skill style learning records for agents, operators, clients and trade-owner education.';
COMMENT ON TABLE public.authority_routing_actions IS 'Routing trail from signals/assets to Senior PM, Senior Researchers, Synthex, Unite-Hub, Pi-CEO Board and approval gates.';

INSERT INTO public.authority_sources (name, url, owner_type, sector, use_case, cadence, quality_score, extraction_notes)
VALUES
  ('Nexus Authority Intelligence Wrapper', 'wiki://authority-intelligence/nexus-authority-intelligence-wrapper-implementation-2026-06-09', 'internal', 'cross-sector', 'learning', 'ad_hoc', 18, 'Internal wrapper architecture; wiki remains source of truth.'),
  ('Daily Opportunity Radar Pilot', 'wiki://authority-intelligence/daily-opportunity-radar-pilot-implementation-2026-06-09', 'internal', 'cross-sector', 'signal', 'daily', 16, '7-day read-only pilot feeding Authority Intelligence signals.')
ON CONFLICT (url, sector) DO UPDATE SET
  name = EXCLUDED.name,
  owner_type = EXCLUDED.owner_type,
  use_case = EXCLUDED.use_case,
  cadence = EXCLUDED.cadence,
  quality_score = EXCLUDED.quality_score,
  extraction_notes = EXCLUDED.extraction_notes,
  updated_at = NOW();
