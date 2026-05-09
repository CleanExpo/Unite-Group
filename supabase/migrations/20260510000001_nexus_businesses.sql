-- Nexus Wave 1: businesses table
-- 6 portfolio companies owned by Unite-Group
-- Board Mandate: Nexus Wave 1

CREATE TABLE IF NOT EXISTS public.businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  pi_ceo_key        TEXT,
  linear_project_id TEXT,
  website_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'building'
                    CHECK (status IN ('operational', 'building', 'degraded', 'archived')),
  arr_aud           NUMERIC(12,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug   ON public.businesses (slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses (status);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on businesses" ON public.businesses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read businesses" ON public.businesses
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.businesses IS
  'Unite-Group portfolio companies. One row per business. Source of truth for empire sector.';
