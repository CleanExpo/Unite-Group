-- Nexus Wave 1: client_portals table
-- 1:1 portal config per client — SEO snapshot, social pipeline, report cadence
-- Board Mandate: Nexus Wave 1

CREATE TABLE IF NOT EXISTS public.client_portals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  domain_tracked          TEXT,
  keywords                TEXT[] DEFAULT '{}',
  seo_snapshot            JSONB DEFAULT '{}',
  website_score           INTEGER CHECK (website_score BETWEEN 0 AND 100),
  social_pipeline_active  BOOLEAN DEFAULT FALSE,
  last_report_at          TIMESTAMPTZ,
  report_cadence          TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (report_cadence IN ('weekly', 'monthly', 'quarterly')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portals_client_id ON public.client_portals (client_id);

ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on client_portals" ON public.client_portals;
CREATE POLICY "Service role full access on client_portals" ON public.client_portals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read client_portals" ON public.client_portals;
CREATE POLICY "Authenticated read client_portals" ON public.client_portals
  FOR SELECT TO authenticated USING (true);

-- Auto-update updated_at (reuse function if already created by earlier migration)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at'
  ) THEN
    CREATE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER client_portals_updated_at
  BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.client_portals IS
  'One portal config per client. SEO snapshot cached here — not live per page load.';
