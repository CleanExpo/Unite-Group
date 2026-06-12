-- Magic-link client approval portal — signed-hash audit trail.
--
-- The token IS the auth (single-use, IP-logged). When the client clicks
-- Approve / Request changes / Reject, we write a signature_hash of
-- sha256(token + status + timestamp) to provide a tamper-evident audit
-- trail compliant with the Electronic Transactions Act 1999 (Cth).

CREATE TABLE IF NOT EXISTS public.client_approvals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's being approved
  client_slug        TEXT NOT NULL,                  -- e.g. 'dimitri-itr'
  deliverable_id     TEXT NOT NULL,                  -- e.g. 'milestone-1', 'sprint-3-build'
  deliverable_title  TEXT NOT NULL,
  deliverable_body   TEXT,                           -- markdown summary shown on the portal page
  preview_url        TEXT,                           -- Vercel preview link
  proof_video_url    TEXT,                           -- signed Supabase storage url for the weekly Loom

  -- Tokenisation
  token              TEXT NOT NULL UNIQUE,           -- urlsafe random, 64 chars
  expires_at         TIMESTAMPTZ NOT NULL,           -- typically +7 days

  -- Status
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','changes-requested','rejected','expired')),
  changes_requested_body TEXT,                       -- populated when status='changes-requested'

  -- Audit
  approver_ip        INET,
  approver_user_agent TEXT,
  signature_hash     TEXT,                           -- sha256(token + status + timestamp_iso)
  responded_at       TIMESTAMPTZ,

  -- Notification + metadata
  notified_email     TEXT,                           -- client email the magic link was sent to
  notified_at        TIMESTAMPTZ,
  created_by         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_approvals_client_status_idx
  ON public.client_approvals(client_slug, status);
CREATE INDEX IF NOT EXISTS client_approvals_pending_idx
  ON public.client_approvals(status, expires_at)
  WHERE status = 'pending';

-- RLS — service role only (portal hits this via an admin-context API route).
-- We intentionally do NOT enable authenticated user policies; the magic-link
-- token IS the auth, validated server-side by the API route.
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_approvals_service_role_all ON public.client_approvals;
CREATE POLICY client_approvals_service_role_all
  ON public.client_approvals
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.client_approvals_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS 'BEGIN NEW.updated_at = NOW(); RETURN NEW; END;';

DROP TRIGGER IF EXISTS client_approvals_set_updated_at ON public.client_approvals;
CREATE TRIGGER client_approvals_set_updated_at
  BEFORE UPDATE ON public.client_approvals
  FOR EACH ROW EXECUTE FUNCTION public.client_approvals_touch_updated_at();
