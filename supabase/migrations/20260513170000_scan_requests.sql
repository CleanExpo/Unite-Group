-- Pi-CEO scan request queue.
--
-- Backs the /api/empire/rescan/[slug] endpoint. The operator (or a UI button)
-- inserts a row here; a separate Pi-CEO worker (out of scope for this PR)
-- consumes pending rows, runs the scan, writes a new pi_ceo_health_snapshots
-- row, and updates this row's status + snapshot_id.
--
-- Replaces the cosmetic "Trigger Pi-CEO Scan" button that used to call a
-- read-only health endpoint and silently lie to the operator.

-- Note: businesses.slug is NOT globally unique (UNIQUE is (founder_id, slug)),
-- so we cannot put a foreign key on slug. The /api/empire/rescan/[slug] handler
-- validates the slug against the businesses table before insert instead.
CREATE TABLE IF NOT EXISTS public.scan_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL,
  requested_by  TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  completed_at  TIMESTAMPTZ,
  error         TEXT,
  snapshot_id   BIGINT REFERENCES public.pi_ceo_health_snapshots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS scan_requests_pending_idx
  ON public.scan_requests (status, requested_at);

CREATE INDEX IF NOT EXISTS scan_requests_slug_idx
  ON public.scan_requests (slug, requested_at DESC);

ALTER TABLE public.scan_requests ENABLE ROW LEVEL SECURITY;

-- Service-role (server) full access. The API route uses the service key.
CREATE POLICY scan_requests_service_role_all
  ON public.scan_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
