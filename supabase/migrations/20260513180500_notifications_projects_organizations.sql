-- BUG-02, BUG-03, BUG-04 — create the three missing tables backing
-- /api/notifications, /api/projects, /api/organizations.
--
-- All three endpoints have live UI consumers:
--   - NotificationBadge + FirstWinBanner  → client_notifications
--   - /[locale]/projects                   → projects
--   - /organizations                       → organizations
--
-- Per the no-mock-data rule: NO seed rows. Tables ship empty; the UI already
-- handles empty arrays without falling over.

-- ── client_notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_notifications_client_unread_idx
  ON public.client_notifications (client_id, read, created_at DESC);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_notifications_select_own ON public.client_notifications;
CREATE POLICY client_notifications_select_own
  ON public.client_notifications
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS client_notifications_update_own ON public.client_notifications;
CREATE POLICY client_notifications_update_own
  ON public.client_notifications
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS client_notifications_service_role_all ON public.client_notifications;
CREATE POLICY client_notifications_service_role_all
  ON public.client_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── organizations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  industry     TEXT,
  size         TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizations_created_at_idx
  ON public.organizations (created_at DESC);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select_authenticated ON public.organizations;
CREATE POLICY organizations_select_authenticated
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS organizations_insert_authenticated ON public.organizations;
CREATE POLICY organizations_insert_authenticated
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS organizations_service_role_all ON public.organizations;
CREATE POLICY organizations_service_role_all
  ON public.organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT NOT NULL,
  description             TEXT,
  client_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'planning'
                          CHECK (status IN ('planning', 'in-progress', 'review', 'completed', 'on-hold')),
  priority                TEXT DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high')),
  start_date              TIMESTAMPTZ,
  target_completion_date  TIMESTAMPTZ,
  budget                  NUMERIC(12, 2),
  assigned_to             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_status_idx
  ON public.projects (status, created_at DESC);

CREATE INDEX IF NOT EXISTS projects_client_id_idx
  ON public.projects (client_id, created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_own_or_assigned ON public.projects;
CREATE POLICY projects_select_own_or_assigned
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    client_id   = auth.uid()
    OR assigned_to = auth.uid()
    OR created_by  = auth.uid()
  );

DROP POLICY IF EXISTS projects_service_role_all ON public.projects;
CREATE POLICY projects_service_role_all
  ON public.projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
