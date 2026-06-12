-- Nexus Wave 4 — M&A DataRoom epic (UNI-1982 / UNI-1983)
--
-- public.data_room_documents stores generated artefacts that compile into the
-- M&A data room: cohort metrics, financial summaries, vendor contracts, IP
-- audit, incident timeline, etc. Each row is a single document keyed by
-- (kind, business_id, period_end) and carries its full JSON payload so the
-- /empire/data-room admin UI can render without recomputing.
--
-- Sandbox-first per project CLAUDE.md: apply via
--   ./scripts/sandbox-wizard.sh apply supabase/migrations/20260518100000_data_room_documents.sql
-- promote to prod only after sandbox verification.

CREATE TABLE IF NOT EXISTS public.data_room_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT        NOT NULL,
  business_id   UUID        REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start  DATE,
  period_end    DATE        NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  audit_status  TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (audit_status IN ('pending', 'approved', 'rejected', 'superseded')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query path: "give me the latest doc of <kind> for <period>".
CREATE INDEX IF NOT EXISTS idx_data_room_documents_kind_period
  ON public.data_room_documents (kind, period_end DESC);

-- Secondary path for per-business drill-down.
CREATE INDEX IF NOT EXISTS idx_data_room_documents_business
  ON public.data_room_documents (business_id, kind, period_end DESC);

-- Auto-touch updated_at on every UPDATE so audit_status transitions get a
-- timestamp without callers needing to set it.
CREATE OR REPLACE FUNCTION public.data_room_documents_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS data_room_documents_touch_updated_at ON public.data_room_documents;
CREATE TRIGGER data_room_documents_touch_updated_at
  BEFORE UPDATE ON public.data_room_documents
  FOR EACH ROW EXECUTE FUNCTION public.data_room_documents_touch_updated_at();

ALTER TABLE public.data_room_documents ENABLE ROW LEVEL SECURITY;

-- Postgres does not support CREATE POLICY IF NOT EXISTS — drop first so the
-- migration is idempotent when re-applied to an already-seeded sandbox/prod.

-- Service role (server-side generators + admin API routes) has full access.
DROP POLICY IF EXISTS "Service role full access on data_room_documents" ON public.data_room_documents;
CREATE POLICY "Service role full access on data_room_documents"
  ON public.data_room_documents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Founder-only read for authenticated callers. Matches the ALLOWED_ADMINS set
-- in src/lib/security/require-admin.ts. If the founder allow-list grows, this
-- policy and require-admin.ts must change together.
DROP POLICY IF EXISTS "Founder read on data_room_documents" ON public.data_room_documents;
CREATE POLICY "Founder read on data_room_documents"
  ON public.data_room_documents
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'contact@unite-group.in',
      'phill.mcgurk@gmail.com'
    )
  );

COMMENT ON TABLE public.data_room_documents IS
  'M&A data room artefacts (UNI-1982). One row per generated document, keyed by (kind, period_end). Payload is JSON so renderers do not recompute. Founder-only read.';
COMMENT ON COLUMN public.data_room_documents.kind IS
  'Document class — e.g. cohort_metrics, pl_summary, vendor_contracts, ip_audit, incident_timeline.';
COMMENT ON COLUMN public.data_room_documents.audit_status IS
  'Founder review state. pending = needs review; approved = exportable; rejected = regenerate; superseded = replaced by a newer doc of the same (kind, period_end).';
