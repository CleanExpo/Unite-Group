-- Nexus Wave 1: businesses table — add Nexus-specific columns
-- Table already exists (multi-tenant). We add pi_ceo_key, linear_project_id, website_url, arr_aud.
-- Board Mandate: Nexus Wave 1

-- The businesses table pre-exists. Add Nexus columns.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS pi_ceo_key        TEXT,
  ADD COLUMN IF NOT EXISTS linear_project_id TEXT,
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS arr_aud           NUMERIC(12,2) DEFAULT 0;

-- Indexes already exist from prior migrations; add only if missing
CREATE INDEX IF NOT EXISTS idx_businesses_slug   ON public.businesses (slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses (status);

COMMENT ON TABLE public.businesses IS
  'Unite-Group portfolio companies. One row per business. Source of truth for empire sector.';
