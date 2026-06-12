-- BUG-02, BUG-03, BUG-04 — back the three API routes that drive client UI:
--   - /api/notifications  → public.client_notifications  (NotificationBadge + FirstWinBanner)
--   - /api/projects       → public.projects              ([locale]/projects)
--   - /api/organizations  → public.organizations         (/organizations)
--
-- IMPORTANT
-- `public.organizations` and `public.projects` already exist in prod with their
-- own schemas, real data (5 rows in organizations), and RLS policies wired to
-- the existing user_organizations / workspaces auth model. This migration must
-- be purely additive on those tables and must not destroy data or break the
-- existing policies.
--
-- All operations are guarded with IF NOT EXISTS / IF EXISTS so this migration
-- is safe to re-run on any environment.

-- ── client_notifications (new) ───────────────────────────────────────────────
-- Brand new. UI shape required by NotificationBadge + FirstWinBanner +
-- saveFirstWinNotification helper:
--   { id, client_id, type, payload, read, read_at, created_at }
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

-- ── organizations (existing — do not recreate) ──────────────────────────────
-- The existing table already has its own RLS via orgs_all + orgs_select +
-- service_orgs policies (org-membership-scoped via get_my_org_ids()).
-- No structural changes. No policy changes. No data migration.
-- This block is intentionally empty.

-- ── projects (existing — do not recreate) ───────────────────────────────────
-- The existing table already has comprehensive RLS via user_organizations /
-- workspaces. No structural changes. No policy changes.
-- This block is intentionally empty.
